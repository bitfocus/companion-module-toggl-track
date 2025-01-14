// toggltrack module
// Peter Daniel

import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import UpdateActions from './actions.js'
import UpdatePresets from './presets.js'
import UpdateVariableDefinitions from './variables.js'
import UpgradeScripts from './upgrades.js'
import { Toggl, ITimeEntry, IWorkspaceProject } from 'toggl-track'
import { togglGetWorkspaces } from './toggl-extend.js'

export class TogglTrack extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()

	toggl?: Toggl

	workspaceId?: number // current active workspace id
	workspaceName: string = '' // name of workspace
	projects?: { id: string; label: string }[]

	constructor(internal: unknown) {
		super(internal)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	async destroy(): Promise<void> {
		console.log('destroy', this.id)
	}

	async init(config: ModuleConfig): Promise<void> {
		console.log('--- init toggltrack ---')

		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.workspaceId = undefined
		this.projects = [{ id: '0', label: 'None' }]

		this.updateVariableDefinitions()
		this.updatePresets()

		this.setVariableValues({
			timerId: undefined,
			timerDuration: undefined,
			timerDescription: undefined,
			lastTimerDuration: undefined,
			workspace: undefined,
		})

		await this.initToggleConnection()

		this.updateActions()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		console.log('config updated')

		const apiTokenChanged: boolean = this.config.apiToken != config.apiToken
		const workSpaceDefaultChanged: boolean = this.config.workspaceName != config.workspaceName

		this.config = config

		if (apiTokenChanged) {
			this.log('debug', 'api token changed. init new toggle connection')
			this.toggl = undefined
			await this.initToggleConnection()
		}
		if (workSpaceDefaultChanged) {
			this.log('debug', 'workspace default changed. reload workspaces')
			await this.getWorkspace()
		}

		this.updateActions()
		this.updateVariables()
	}
	updateVariables(): void {
		throw new Error('Method not implemented.')
	}
	updateActions(): void {
		UpdateActions(this)
	}

	/*updateFeedbacks() {
		UpdateFeedbacks(this)
	}*/

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	async initToggleConnection(): Promise<void> {
		if (this.config.apiToken!.length > 0) {
			this.toggl = new Toggl({
				auth: {
					token: this.config.apiToken!,
				},
			})
			const logged: string = await this.toggl.me.logged()
			this.log('debug', logged)
			if (logged === 'OK') {
				await this.getWorkspace()
				await this.getCurrentTimer()
			}
		}
		return
	}

	async getCurrentTimer(): Promise<number | null> {
		console.log('function: getCurrentTimer')

		if (!this.toggl) {
			this.log('warn', 'Not authorized')
			return null
		}

		const entry: ITimeEntry = await this.toggl.timeEntry.current()
		this.log('debug', 'response for timer id ' + JSON.stringify(entry))

		if (entry) {
			this.log('info', 'Current timer id: ' + entry.id)
			this.setVariableValues({
				timerId: entry.id,
				timerDescription: entry.description,
				timerDuration: entry.duration,
			})

			return entry.id
		} else {
			this.log('info', 'No current timer')
			this.setVariableValues({
				timerId: undefined,
				timerDescription: undefined,
				timerDuration: undefined,
			})
			return null
		}
	}

	async getWorkspace(): Promise<void> {
		console.log('function: getWorkspace')
		if (!this.toggl) {
			this.log('warn', 'Not authorized')
			return
		}

		// reset
		this.workspaceId = undefined
		this.setVariableValues({
			workspace: undefined,
		})

		const workspaces = await togglGetWorkspaces(this.toggl)
		this.log('info', 'Found ' + workspaces.length + ' workspace')

		for (const ws of workspaces) {
			if (this.config.workspaceName == '' || this.config.workspaceName == ws.name) {
				// take the first or matching one and continue
				this.workspaceId = ws.id
				this.workspaceName = ws.name
				break
			}
			// workspaceName does not match => continue with next
			continue
		}

		if (this.workspaceId == undefined) {
			// no workspace found
			//console.log('result ' + JSON.stringify(workspaces, null, 4))
			this.log('debug', 'No workspace found')
			return
		}

		this.log('info', 'Workspace: ' + this.workspaceId + ' - ' + this.workspaceName)
		this.setVariableValues({
			workspace: this.workspaceName,
		})

		return this.getProjects()
	}

	async getProjects(): Promise<void> {
		console.log('function: getProjects ' + this.workspaceId)

		if (!this.workspaceId) {
			this.log('warn', 'workspaceId undefined')
			return
		}

		const projects: IWorkspaceProject[] = await this.toggl!.projects.list(this.workspaceId)

		//const projects: IWorkspaceProject[] = await togglGetProjects(this.toggl!, this.workspaceId!)

		if (typeof projects === 'string' || projects.length == 0) {
			this.projects = [{ id: '0', label: 'None' }]
			console.log(projects)
			this.log('debug', 'No projects')
			return
		}

		this.projects = projects
			.filter((p) => p.active)
			.map((p) => {
				return {
					id: p.id.toString(),
					label: p.name,
				}
			})
			.sort((a, b) => {
				const fa = a.label.toLowerCase()
				const fb = b.label.toLowerCase()

				if (fa < fb) {
					return -1
				}
				if (fa > fb) {
					return 1
				}
				return 0
			})

		console.log('Projects:')
		console.log(this.projects)
	}

	// getTimerDuration(id) {
	// 	let cmd = 'time_entries/' + id
	//
	// 	return new Promise((resolve, reject) => {
	// 		self.sendCommand('rest_get', cmd).then(
	// 			(result) => {
	// 				if (typeof result === 'object' && result.data !== null && result.data !== undefined) {
	// 					if ('duration' in result.data) {
	// 						self.setVariable('timerDuration', result.data.duration)
	// 						resolve(result.data.duration)
	// 					} else {
	// 						self.log('debug', 'Error getting current timer duration (no id in data)')
	// 						self.setVariable('timerDuration', null)
	// 						resolve(null)
	// 					}
	// 				} else {
	// 					self.log('debug', 'Error getting current timer duration (no object)')
	// 					self.setVariable('timerDuration', null)
	// 					resolve(null)
	// 				}
	// 			},
	// 			(error) => {
	// 				console.log('error ' + error)
	// 				self.log('debug', 'Error getting current timer duration')
	// 			}
	// 		)
	// 	})
	// }

	async startTimer(project: number, description: string): Promise<void> {
		if (!this.toggl || !this.workspaceId) {
			this.log('error', 'toggle not initialized. Do not start time')
			return
		}

		const currentId = await this.getCurrentTimer()
		let newEntry: ITimeEntry
		if (currentId === null || this.config.alwaysStart === true) {
			// there is no running time entry or alwaysStart is true
			newEntry = await this.toggl.timeEntry.create(this.workspaceId, {
				description: description,
				workspace_id: this.workspaceId,
				created_with: 'companion',
				start: new Date().toISOString(),
				duration: -1,
				project_id: project != 0 ? project : undefined,
			})
			this.log('info', 'New timer started ' + newEntry.id + ' ' + newEntry.description)
			this.setVariableValues({
				timerId: newEntry.id,
				timerDescription: newEntry.description,
				timerDuration: newEntry.duration,
			})
		} else {
			this.log('info', 'A timer is already running ' + currentId + ' not starting a new one!')
		}
	}

	async stopTimer(): Promise<void> {
		this.log('debug', 'function: stopTimer')

		if (!this.toggl || !this.workspaceId) {
			this.log('error', 'toggle not initialized. Do not start time')
			return
		}
		const currentId = await this.getCurrentTimer()
		this.log('info', 'Trying to stop current timer id: ' + currentId)
		// console.log(typeof timerId)
		if (currentId !== null) {
			const updated: ITimeEntry = await this.toggl.timeEntry.stop(currentId, this.workspaceId)
			this.log('info', 'Stopped ' + updated.id + ', duration ' + updated.duration)

			this.setVariableValues({
				timerId: undefined,
				timerDescription: undefined,
				timerDuration: undefined,
				lastTimerDuration: updated.duration,
			})
		} else {
			this.log('warn', 'No running timer to stop or running timer id unknown')
		}
	}
}

runEntrypoint(TogglTrack, UpgradeScripts)
