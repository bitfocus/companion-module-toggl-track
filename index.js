var instance_skel = require('../../instance_skel')

var debug
var log

function instance(system, id, config) {
	var self = this

	// super-constructor
	instance_skel.apply(this, arguments)

	return self
}

instance.prototype.updateConfig = function (config) {
	var self = this
	self.config = config

	self.auth()
	self.getWorkspace()
	self.actions()
}

instance.prototype.init = function () {
	var self = this

	debug = self.debug
	log = self.log

	self.workspace = null
	self.workspaceName = null
	self.projects = [{ id: '0', label: 'None' }]

	self.init_presets()
	self.update_variables()
	self.auth()
	self.getWorkspace()
	self.getCurrentTimer().then((timerId) => {
		self.setVariable('timerId', timerId.id)
		self.setVariable('timerDescription', timerId.description)
	})
	self.actions()
}

instance.prototype.auth = function () {
	var self = this
	self.header = []

	if (self.config.apiToken !== null && self.config.apiToken.length > 0) {
		auth = Buffer.from(self.config.apiToken + ':' + 'api_token').toString('base64')
		self.header['Content-Type'] = 'application/json'
		self.header['Authorization'] = 'Basic ' + auth
	} else {
		self.log('warn', 'Please enter your toggl API token')
	}

	// console.log(self.header)
}

instance.prototype.config_fields = function () {
	var self = this
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module is for the toggl track service',
		},
		{
			type: 'textinput',
			id: 'apiToken',
			label: 'Personal API Token from your Toggl user profile (required)',
			width: 12,
			default: '',
		},
		{
			type: 'checkbox',
			id: 'alwaysStart',
			label: 'Enable',
			width: 1,
			default: false,
		},
		{
			type: 'text',
			id: 'alwaysStartTxt',
			label: 'Always start a new timer even if there is one already running',
			width: 11,
		},
		{
			type: 'text',
			id: 'break',
			label: '',
			width: 12,
		},
	]
}

instance.prototype.destroy = function () {
	var self = this
	debug('destroy', self.id)
}

instance.prototype.update_variables = function (system) {
	var self = this
	var variables = []

	variables.push(
		{
			label: 'Current Timer Id',
			name: 'timerId',
		},
		{
			label: 'Current Timer Description',
			name: 'timerDescription',
		}
	)

	self.setVariableDefinitions(variables)
	self.setVariable('timerId', null)
	self.setVariable('timerDescription', null)
}

instance.prototype.init_presets = function () {
	var self = this
	var presets = []

	presets.push({
		category: 'Timer',
		label: 'Start',
		bank: {
			style: 'text',
			text: 'Start Timer',
			size: '18',
			color: 16777215,
			bgcolor: 0,
		},
		actions: [
			{
				action: 'startNewTimer',
				options: {
					description: '',
					project: '0',
				},
			},
		],
	})

	presets.push({
		category: 'Timer',
		label: 'Stop',
		bank: {
			style: 'text',
			text: 'Stop Timer',
			size: '18',
			color: 16777215,
			bgcolor: 0,
		},
		actions: [
			{
				action: 'stopCurrentTimer',
			},
		],
	})

	self.setPresetDefinitions(presets)
}

instance.prototype.actions = function (system) {
	var self = this

	self.setActions({
		startNewTimer: {
			label: 'Start New Timer',
			options: [
				{
					type: 'textinput',
					label: 'Description',
					id: 'description',
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Project',
					id: 'project',
					default: '0',
					choices: self.projects,
				},
			],
		},
		getCurrentTimer: {
			label: 'Get Current Timer',
		},
		stopCurrentTimer: {
			label: 'Stop Current Timer',
		},
		refreshProjects: {
			label: 'Refresh Project List',
		},
	})
}

instance.prototype.action = function (action) {
	var self = this
	const opt = action.options

	switch (action.action) {
		case 'startNewTimer': {
			self.getCurrentTimer().then((timerId) => {
				if (timerId === undefined || timerId === null || self.config.alwaysStart === true) {
					// no timer currently running or we want to restart it
					var cmd = 'https://api.track.toggl.com/api/v8/time_entries/start'
					if (opt.project == '0') {
						var body = '{"time_entry":{"description":"' + opt.description + '","created_with":"companion"}}'
					} else {
						var body =
							'{"time_entry":{"description":"' +
							opt.description +
							'","created_with":"companion","pid":"' +
							opt.project +
							'"}}'
					}
					self.sendCommand('rest', cmd, body).then((result) => {
						if (typeof result === 'object' && result.data !== null && result.data !== undefined) {
							self.log('debug', 'New timer started ' + result.data.id)
							self.setVariable('timerId', result.data.id)
							self.setVariable('timerDescription', result.data.description)
						} else {
							self.log('warn', 'Error starting timer')
						}
					})
				} else {
					self.log('debug', 'A timer is already running ' + timerId.id)
				}
			})
			break
		}
		case 'stopCurrentTimer': {
			self.getCurrentTimer().then((timerId) => {
				self.log('debug', 'Current timer id ' + timerId.id)
				if (timerId.id !== null && timerId.id !== undefined) {
					var cmd = 'https://api.track.toggl.com/api/v8/time_entries/' + timerId.id + '/stop'
					self.sendCommand('rest_put', cmd).then((result) => {
						if (typeof result === 'object' && result.data !== null && result.data !== undefined) {
							self.log('debug', 'Stopped ' + result.data.id + ', duration ' + result.data.duration)
							self.setVariable('timerId', null)
							self.setVariable('timerDescription', null)
						} else {
							self.log('warn', 'Error stopping timer')
						}
					})
				} else {
					self.log('warn', 'No running timer to stop or running timer id unknown')
				}
			})
			break
		}
		case 'getCurrentTimer': {
			self.getCurrentTimer().then((result) => {
				self.log('debug', 'Current timer id ' + timerId.id + ' ' + timerId.description)
				self.setVariable('timerId', result.id)
				self.setVariable('timerDescription', result.description)
			})
			break
		}
		case 'refreshProjects': {
			self.getWorkspace()
			break
		}
		default:
			break
	}
}

instance.prototype.getWorkspace = function () {
	var self = this
	var cmd = 'https://api.track.toggl.com/api/v8/workspaces'
	// console.log('getWorkspace')

	// reset
	self.workspace = null

	// get workspace ID
	self.sendCommand('rest_get', cmd).then(
		(result) => {
			// console.log('result ' + JSON.stringify(result, null, 4))
			if (typeof result === 'object' && result !== null) {
				console.log('Found ' + result.length + ' workspace')
				// only interested in first workspace
				if ('id' in result[0]) {
					self.workspace = result[0].id
					self.workspaceName = result[0].name
					console.log('Workspace ' + self.workspace + ' ' + self.workspaceName)
					self.log('debug', 'Workspace ' + self.workspace + ':' + self.workspaceName)
					self.getProjects()
				}
			} else {
				console.log('result ' + JSON.stringify(result, null, 4))
				self.log('debug', 'No workspace')
			}
		},
		(error) => {
			console.log('error ' + error)
			self.log('debug', 'Error getting workspace')
		}
	)
}

instance.prototype.getProjects = function () {
	var self = this

	if (self.workspace !== null) {
		var cmd = 'https://api.track.toggl.com/api/v8/workspaces/' + self.workspace + '/projects'
		self.sendCommand('rest_get', cmd).then(
			(result) => {
				// console.log('result ' + JSON.stringify(result, null, 4))
				if (typeof result === 'object' && result !== null) {
					// reset
					self.projects = []

					for (p = 0; p < result.length; p++) {
						if ('id' in result[p]) {
							self.projects.push({
								id: result[p].id.toString(),
								label: result[p].name,
							})
							self.log('debug', 'Project ' + result[p].id + ':' + result[p].name)
						}
					}

					self.projects.sort((a, b) => {
						fa = a.label.toLowerCase()
						fb = b.label.toLowerCase()

						if (fa < fb) {
							return -1
						}
						if (fa > fb) {
							return 1
						}
						return 0
					})

					self.projects.unshift({ id: '0', label: 'None' })
					console.log('Projects:')
					console.log(self.projects)
					self.actions()
				} else {
					console.log(result)
					self.log('debug', 'No projects')
				}
			},
			(error) => {
				console.log('error ' + error)
				self.log('debug', 'Error getting projects')
			}
		)
	}
}

instance.prototype.getCurrentTimer = function () {
	var self = this
	var cmd = 'https://api.track.toggl.com/api/v8/time_entries/current'

	return new Promise((resolve, reject) => {
		self.sendCommand('rest_get', cmd).then(
			(result) => {
				if (typeof result === 'object' && result.data !== null && result.data !== undefined) {
					if ('id' in result.data) {
						resolve(result.data)
					} else {
						self.log('debug', 'Error getting current timer (no id in data)')
						self.setVariable('timerId', null)
						self.setVariable('timerDescription', null)
						resolve(null)
					}
				} else {
					self.log('debug', 'Error getting current timer (no object)')
					self.setVariable('timerId', null)
					self.setVariable('timerDescription', null)
					resolve(null)
				}
			},
			(error) => {
				console.log('error ' + error)
				self.log('debug', 'Error getting current timer')
			}
		)
	})
}

instance.prototype.sendCommand = function (mode, command, body = '') {
	var self = this
	console.log(mode + ' : ' + command)

	switch (mode) {
		case 'rest_get': {
			return new Promise((resolve, reject) => {
				self.system.emit(
					mode,
					command,
					(err, { data, error, response }) => {
						if (err) {
							self.status(self.STATUS_ERROR)
							console.log(error)
							reject(error)
							return
						}
						self.status(self.STATUS_OK)
						resolve(data)
					},
					self.header
				)
			})
			break
		}
		case 'rest':
		case 'rest_put': {
			return new Promise((resolve, reject) => {
				self.system.emit(
					mode,
					command,
					body,
					(err, { data, error, response }) => {
						if (err) {
							self.status(self.STATUS_ERROR)
							console.log(error)
							reject(error)
							return
						}
						self.status(self.STATUS_OK)
						resolve(data)
					},
					self.header
				)
			})
			break
		}
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
