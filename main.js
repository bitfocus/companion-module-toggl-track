// toggltrack module
// Peter Daniel

import { InstanceBase, Regex, runEntrypoint, InstanceStatus } from '@companion-module/base'
import UpdateActions from './actions.js'
import UpdatePresets from './presets.js'
import UpdateVariableDefinitions from './variables.js'
import UpgradeScripts from './upgrades.js'

import got from 'got'

class toggltrack extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	getConfigFields() {
		// console.log('config fields')
		return [
			{
				type: 'textinput',
				id: 'apiToken',
				label: 'Personal API Token from your Toggl user profile (required)',
				width: 12,
				required: true,
				default: '',
			},
			{
				type: 'checkbox',
				id: 'alwaysStart',
				label: 'Always start a new timer even if there is one already running',
				width: 12,
				required: false,
				default: false,
			},
		]
	}

	async destroy() {
		console.log('destroy', this.id)
	}

	async init(config) {
		console.log('--- init toggltrack ---')
		this.prefixUrl = 'https://api.track.toggl.com/api/v9/'

		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.gotOptions = {
			responseType: 'json',
			throwHttpErrors: false,
		}

		this.gotOptions.prefixUrl = this.prefixUrl

		this.workspace = null
		this.workspaceName = null
		this.projects = [{ id: '0', label: 'None' }]

		this.updateVariableDefinitions()
		this.updatePresets()

		this.setVariableValues({
			timerId: null,
			timerDuration: null,
			timerDescription: null,
			lastTimerDuration: null,
			workspace: null,
		})

		this.gotOptions.headers = this.auth()

		if (this.gotOptions.headers != null) {
			this.getWorkspace().then(this.getCurrentTimer())
		}

		this.updateActions()
	}

	async configUpdated(config) {
		console.log('config updated')
		this.config = config

		this.gotOptions.headers = this.auth()

		if (this.gotOptions.headers != null) {
			this.getWorkspace().then(this.getCurrentTimer())
		}

		this.updateActions()
		this.updateVariables()
	}
	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updatePresets() {
		UpdatePresets(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	auth() {
		if (this.config.apiToken !== null && this.config.apiToken.length > 0) {
			let auth = Buffer.from(this.config.apiToken + ':' + 'api_token').toString('base64')
			let headers = {}
			headers['Content-Type'] = 'application/json'
			headers['authorization'] = 'Basic ' + auth
			return headers
		} else {
			this.log('warn', 'Please enter your toggl API token')
			return null
		}
		// console.log(this.gotOptions)
	}

	async getCurrentTimer() {
		console.log('function: getCurrentTimer')

		if (this.gotOptions.headers == null) {
			this.log('warn', 'Not authorized')
			return
		}
		let cmd = 'me/time_entries/current'

		return new Promise((resolve, reject) => {
			this.sendGetCommand(cmd).then((result) => {
				if (typeof result === 'object' && result !== null) {
					if ('id' in result) {
						this.setVariableValues({
							timerId: result.id,
							timerDescription: result.description,
							timerDuration: result.duration,
						})
						this.log('info', 'Current timer id: ' + result.id)
						resolve(result.id)
					} else {
						this.log('info', 'No current timer (no id in data)')
						this.setVariableValues({
							timerId: null,
							timerDescription: null,
							timerDuration: null,
						})
						resolve(null)
					}
				} else {
					this.log('info', 'No current timer (no object)')
					this.setVariableValues({
						timerId: null,
						timerDescription: null,
						timerDuration: null,
					})
					resolve(null)
				}
			})
		})
	}

	async getWorkspace() {
		let cmd = 'workspaces'
		console.log('function: getWorkspace')

		if (this.gotOptions.headers == null) {
			this.log('warn', 'Not authorized')
			return
		}

		// reset
		this.workspace = null
		this.setVariableValues({
			workspace: null,
		})

		// get workspace ID
		this.sendGetCommand(cmd).then((result) => {
			// console.log('result ' + JSON.stringify(result, null, 4))
			if (typeof result === 'object' && result !== null) {
				console.log('Found ' + result.length + ' workspace')
				// only interested in first workspace
				if ('id' in result[0]) {
					this.workspace = result[0].id
					this.workspaceName = result[0].name
					this.log('info', 'Workspace: ' + this.workspace + ' - ' + this.workspaceName)
					this.setVariableValues({
						workspace: this.workspaceName,
					})
					this.getProjects()
				}
			} else {
				console.log('result ' + JSON.stringify(result, null, 4))
				this.log('debug', 'No workspace')
			}
		})
	}

	getProjects() {
		console.log('function: getProjects')

		if (this.workspace !== null) {
			let cmd = 'workspaces/' + this.workspace + '/projects'
			this.sendGetCommand(cmd).then((result) => {
				// console.log('result ' + JSON.stringify(result, null, 4))
				if (typeof result === 'object' && result !== null) {
					// reset
					this.projects = []

					for (let p = 0; p < result.length; p++) {
						if ('id' in result[p]) {
							if (result[p].active === true) {
								// don't add archived projects
								this.projects.push({
									id: result[p].id.toString(),
									label: result[p].name,
								})
							}
							// this.log('debug', 'Project ' + result[p].id + ':' + result[p].name)
						}
					}

					this.projects.sort((a, b) => {
						let fa = a.label.toLowerCase()
						let fb = b.label.toLowerCase()

						if (fa < fb) {
							return -1
						}
						if (fa > fb) {
							return 1
						}
						return 0
					})

					this.projects.unshift({ id: '0', label: 'None' })
					console.log('Projects:')
					console.log(this.projects)
					this.updateActions()
				} else {
					console.log(result)
					this.log('debug', 'No projects')
				}
			})
		}
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

	async startTimer(project, description) {
		let body
		let cmd
		let timerId
		const startTime = new Date()
		this.getCurrentTimer().then((timerId) => {
			console.log('timerId: ' + timerId)
			if (timerId === null || this.config.alwaysStart === true) {
				// no timer currently running or we want to restart it
				cmd = 'workspaces/' + this.workspace + '/time_entries'
				if (project == '0') {
					body =
						'{"wid":' +
						this.workspace +
						',"description":"' +
						description +
						'","created_with":"companion",' +
						'"start":"' +
						startTime.toISOString() +
						'","duration":-1}'
				} else {
					body =
						'{"wid":' +
						this.workspace +
						',"description":"' +
						description +
						'","created_with":"companion","project_id":' +
						project +
						',"start":"' +
						startTime.toISOString() +
						'","duration":-1}'
				}
				// console.log(body)
				this.sendPostCommand(cmd, body).then((result) => {
					if (typeof result === 'object' && result !== null) {
						this.log('info', 'New timer started ' + result.id + ' ' + result.description)
						this.setVariableValues({
							timerId: result.id,
							timerDescription: result.description,
							timerDuration: result.duration,
						})
					} else {
						this.log('warn', 'Error starting timer')
					}
				})
			} else {
				this.log('info', 'A timer is already running ' + timerId + ' not starting a new one!')
			}
		})
	}

	async stopTimer() {
		console.log('function: stopTimer')

		this.getCurrentTimer().then((timerId) => {
			this.log('info', 'Trying to stop current timer id: ' + timerId)
			// console.log(typeof timerId)
			if (typeof timerId === 'number' && timerId > 0) {
				let cmd = 'workspaces/' + this.workspace + '/time_entries/' + timerId + '/stop'
				this.sendPatchCommand(cmd).then((result) => {
					if (typeof result === 'object' && result !== null && result !== undefined) {
						this.log('info', 'Stopped ' + result.id + ', duration ' + result.duration)
						this.setVariableValues({
							timerId: null,
							timerDescription: null,
							timerDuration: null,
							lastTimerDuration: result.duration,
						})
					} else {
						this.log('warn', 'Error stopping timer')
					}
				})
			} else {
				this.log('warn', 'No running timer to stop or running timer id unknown')
			}
		})
	}

	async sendGetCommand(GetURL) {
		console.log('get: ' + GetURL)
		let response

		try {
			response = await got.get(GetURL, this.gotOptions)
			if (response.statusCode == 200) {
				this.updateStatus(InstanceStatus.Ok)
				return response.body
			} else {
				this.updateStatus(
					InstanceStatus.UnknownError,
					`Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`,
				)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				return null
			}
		} catch (error) {
			console.log(error.message)
			this.processError(error)
			return null
		}
	}

	async sendPutCommand(PutURL) {
		console.log('put: ' + PutURL)
		let response

		try {
			response = await got.put(PutURL, this.gotOptions)
			console.log('status: ' + response.statusCode)
			if (response.statusCode == 200) {
				console.log(response.body)
				return response.body
			} else {
				this.updateStatus(
					InstanceStatus.UnknownError,
					`Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`,
				)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				return null
			}
		} catch (error) {
			console.log(error.message)
			this.processError(error)
			return null
		}
	}

	async sendPatchCommand(PatchURL) {
		console.log('patch: ' + PatchURL)
		let response

		try {
			response = await got.patch(PatchURL, this.gotOptions)
			// console.log('status: ' + response.statusCode)
			if (response.statusCode == 200) {
				// console.log(response.body)
				return response.body
			} else {
				this.updateStatus(
					InstanceStatus.UnknownError,
					`Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`,
				)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				return null
			}
		} catch (error) {
			console.log(error.message)
			this.processError(error)
			return null
		}
	}

	async sendPostCommand(cmd, body) {
		console.log(body)
		let response
		let postdata = {}
		postdata.prefixUrl = this.prefixUrl
		;(postdata.responseType = 'json'), (postdata.throwHttpErrors = false)
		postdata.headers = this.auth()
		postdata.json = JSON.parse(body)

		// console.log(postdata)

		try {
			response = await got.post(cmd, postdata)
			// console.log(response.request.requestUrl)
			// console.log(response.statusCode)
			if (response.statusCode == 200) {
				return response.body
			} else {
				this.updateStatus(
					InstanceStatus.UnknownError,
					`Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`,
				)
				this.log('warn', `Unexpected HTTP status code: ${response.statusCode} - ${response.body.error}`)
				return null
			}
		} catch (error) {
			console.log(error.message)
			this.processError(error)
			return null
		}
	}

	processError(error) {
		console.log('gotError: ' + error.code)
	}
}

runEntrypoint(toggltrack, UpgradeScripts)
