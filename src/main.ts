// toggltrack module
// Peter Daniel, Matthias Kesler

import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import UpdateActions from './actions.js'
import UpdatePresets from './presets.js'
import UpdateVariableDefinitions from './variables.js'
import UpgradeScripts from './upgrades.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { Toggl, ITimeEntry, IWorkspaceProject } from 'toggl-track'
import { togglGetWorkspaces } from './toggl-extend.js'
import { timecodeSince } from './utils.js'

export class TogglTrack extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()

	toggl?: Toggl

	workspaceId?: number // current active workspace id
	workspaceName: string = '' // name of workspace
	projects?: { id: number; label: string }[]
	intervalId?: NodeJS.Timeout
	currentTimerUpdaterIntervalId?: NodeJS.Timeout

	constructor(internal: unknown) {
		super(internal)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	async destroy(): Promise<void> {
		this.log('info', 'destroy ' + this.id)
		if (this.config.startTimerPoller) {
			this.stopTimeEntryPoller()
		}

		clearInterval(this.currentTimerUpdaterIntervalId)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.log('info', '--- init toggltrack ' + this.id + ' ---')

		this.config = config

		this.projects = [{ id: 0, label: 'None' }]

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
		this.updateFeedbacks()

		if (this.toggl && this.workspaceId) {
			this.updateStatus(InstanceStatus.Ok)
		}

		if (this.config.startTimerPoller) {
			this.startTimeEntryPoller()
		}
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.log('debug', 'config updated')

		const apiTokenChanged: boolean = this.config.apiToken != config.apiToken
		const workSpaceDefaultChanged: boolean = this.config.workspaceName != config.workspaceName
		const timeEntryPollerChanged: boolean = this.config.startTimerPoller != config.startTimerPoller

		this.config = config

		if (apiTokenChanged) {
			this.log('debug', 'api token changed. init new toggle connection')
			this.toggl = undefined
			await this.initToggleConnection()
		} else if (workSpaceDefaultChanged) {
			this.log('debug', 'workspace default changed. reload workspaces')
			await this.getWorkspace()
		}

		if (timeEntryPollerChanged) {
			if (this.config.startTimerPoller) {
				this.startTimeEntryPoller()
			} else {
				this.stopTimeEntryPoller()
			}
		}

		this.updateActions()
		//this.updateVariables()
		if (this.toggl && this.workspaceId) {
			this.updateStatus(InstanceStatus.Ok)
		}
	}
	updateVariables(): void {
		this.log('error', 'updateVariables not implemented')
		//throw new Error('Method not implemented.')
	}
	updateActions(): void {
		UpdateActions(this)
	}
	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	async initToggleConnection(): Promise<void> {
		if (this.config.apiToken && this.config.apiToken.length > 0) {
			this.toggl = new Toggl({
				auth: {
					token: this.config.apiToken,
				},
			})

			const resp = await this.toggl.me.logged()
			if (resp !== '') {
				this.log('warn', 'error during token check: ' + resp)
				this.toggl = undefined
				this.updateStatus(InstanceStatus.AuthenticationFailure, resp)
				return
			}
			await this.getWorkspace()
			await this.getCurrentTimer()
		}
	}

	private startTimeEntryPoller(): void {
		this.log('info', 'Starting TimeEntry-Poller')
		// fetch current timer every 30 seconds
		this.intervalId = setInterval(() => {
			// this harms the linter (handle unawaited promise in an non-async context)
			void (async () => {
				await this.getCurrentTimer()
			})()
		}, 30 * 1000)
	}
	private stopTimeEntryPoller(): void {
		this.log('info', 'Stopping TimeEntry-Poller')
		clearInterval(this.intervalId)
	}

	/**
	 * Set variables to this time entry
	 * @param entry running entry or undefined
	 */
	private setCurrentlyRunningTimeEntry(entry: ITimeEntry | undefined): void {
		if (entry) {
			this.setVariableValues({
				timerId: entry.id,
				timerDescription: entry.description,
				timerDuration: timecodeSince(new Date(entry.start)),
				timerProject: this.projects!.find((v) => v.id == entry?.project_id)?.label,
				timerProjectID: entry.project_id,
			})

			// in case there is on update thread running clear it
			clearInterval(this.currentTimerUpdaterIntervalId)

			// Update timerDuration once per second
			this.currentTimerUpdaterIntervalId = setInterval(() => {
				// this harms the linter (handle unawaited promise in an non-async context)
				void (async () => {
					this.setVariableValues({
						timerDuration: timecodeSince(new Date(entry.start)),
					})
				})()
			}, 1000) // update every second
		} else {
			clearInterval(this.currentTimerUpdaterIntervalId)
			this.setVariableValues({
				timerId: undefined,
				timerDescription: undefined,
				timerDuration: undefined,
				timerProject: undefined,
				timerProjectID: undefined,
			})
		}
		this.checkFeedbacks('ProjectRunningState')
	}

	async getCurrentTimer(): Promise<number | null> {
		this.log('debug', 'function: getCurrentTimer')

		if (!this.toggl) {
			this.log('warn', 'Not authorized')
			return null
		}

		const entry: ITimeEntry = await this.toggl.timeEntry.current()
		this.log('debug', 'response for timer id ' + JSON.stringify(entry))

		if (entry) {
			this.log('info', 'Current timer id: ' + entry.id)
			this.setCurrentlyRunningTimeEntry(entry)

			return entry.id
		} else {
			this.log('info', 'No current timer')
			this.setCurrentlyRunningTimeEntry(undefined)
			return null
		}
	}

	async getWorkspace(): Promise<void> {
		this.log('debug', 'function: getWorkspace')
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
			this.log('debug', 'workspace not found. Response: ' + JSON.stringify(workspaces))
			this.updateStatus(InstanceStatus.BadConfig, 'Available Workspaces: ' + workspaces.map((ws) => ws.name).join(','))
			return
		}

		this.log('info', 'Workspace: ' + this.workspaceId + ' - ' + this.workspaceName)
		this.setVariableValues({
			workspace: this.workspaceName,
		})

		await this.getProjects()
	}

	async getProjects(): Promise<void> {
		this.log('debug', 'function: getProjects ' + this.workspaceId)

		if (!this.workspaceId) {
			this.log('warn', 'workspaceId undefined')
			return
		}

		const projects: IWorkspaceProject[] = await this.toggl!.projects.list(this.workspaceId)

		//const projects: IWorkspaceProject[] = await togglGetProjects(this.toggl!, this.workspaceId!)

		if (typeof projects === 'string' || projects.length == 0) {
			this.log('debug', 'No projects found')
			this.projects = [{ id: 0, label: 'None' }]
			this.log('debug', 'projects response' + JSON.stringify(projects))
			return
		}

		this.projects = projects
			.filter((p) => p.active)
			.map((p) => {
				return {
					id: p.id,
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

		this.log('debug', 'Projects: ' + JSON.stringify(this.projects))
	}

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
			this.setCurrentlyRunningTimeEntry(newEntry)
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

		if (currentId !== null) {
			const updated: ITimeEntry = await this.toggl.timeEntry.stop(currentId, this.workspaceId)
			this.log('info', 'Stopped ' + updated.id + ', duration ' + updated.duration)

			this.setCurrentlyRunningTimeEntry(undefined)
			this.setVariableValues({
				lastTimerDuration: updated.duration,
			})
		} else {
			this.log('warn', 'No running timer to stop or running timer id unknown')
		}
	}
}

runEntrypoint(TogglTrack, UpgradeScripts)
