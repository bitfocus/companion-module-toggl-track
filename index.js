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
	self.getCurrentTimer()
	self.actions()
}

instance.prototype.init = function () {
	var self = this

	debug = self.debug
	log = self.log

	self.currentTimer = null
	self.workspace = null
	self.workspaceName = null
	self.projects = [{ id: '0', label: 'None' }]

	self.init_presets()
	self.auth()
	self.getWorkspace()
	self.getCurrentTimer()
	self.actions()
}

instance.prototype.auth = function () {
	var self = this

	auth = Buffer.from(self.config.apiToken + ':' + 'api_token').toString('base64')
	self.header = []
	self.header['Content-Type'] = 'application/json'
	self.header['Authorization'] = 'Basic ' + auth

	console.log(self.header)
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
	]
}

instance.prototype.destroy = function () {
	var self = this
	self.currentTimer = null
	debug('destroy', self.id)
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
				action: 'getCurrentTimer',
			},
			{
				action: 'stopCurrentTimer',
				delay: 250,
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
	})
}

instance.prototype.action = function (action) {
	var self = this
	const opt = action.options

	switch (action.action) {
		case 'startNewTimer': {
			var restCmd = 'rest' // post
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
			// console.log(body)
			break
		}
		case 'stopCurrentTimer': {
			var restCmd = 'rest_put'
			console.log('current timer: ' + self.currentTimer)
			if (self.currentTimer != null && self.currentTimer != undefined) {
				var cmd = 'https://api.track.toggl.com/api/v8/time_entries/' + self.currentTimer + '/stop'
			} else {
				self.log('warn', 'No running timer to stop or running timer ID unknown')
				return
			}
			break
		}
		case 'getCurrentTimer': {
			self.getCurrentTimer()
			return
			break
		}
		default:
			return
			break
	}

	console.log(cmd)
	self.system.emit(
		restCmd,
		cmd,
		body,
		function (err, result) {
			if (err !== null) {
				// console.log(result.statusCode)
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else {
				// console.log(typeof result.data)
				// console.log(result.statusCode)
				if (!self.auth_error) {
					self.status(self.STATUS_OK)
					if (typeof result.data.data === 'object') {
						if ('id' in result.data.data) {
							self.currentTimer = result.data.data.id
							console.log('timer id: ' + self.currentTimer)
							self.log('debug', 'timer id ' + self.currentTimer)
						} else {
							self.currentTimer = null
							console.log('no id but found this: ' + result.data)
						}
					}
				}
			}
		},
		self.header
	)
}

instance.prototype.getWorkspace = function () {
	var self = this
	var cmd = 'https://api.track.toggl.com/api/v8/workspaces'
	// console.log('getWorkspace')

	// reset
	self.workspace = null

	// get workspace ID
	self.system.emit(
		'rest_get',
		cmd,
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 200) {
				// console.log('workspace request status:' + result.response.statusCode)
				self.status(self.STATUS_OK)
				if (typeof result.data === 'object' && result.data !== null) {
					console.log('Found ' + result.data.length + ' workspace')
					// only interested in first workspace
					if ('id' in result.data[0]) {
						self.workspace = result.data[0].id
						self.workspaceName = result.data[0].name
						console.log('Workspace ' + self.workspace + ' ' + self.workspaceName)
						self.log('debug', 'Workspace ' + self.workspace + ':' + self.workspaceName)
						self.getProjects()
					}
				} else {
					console.log(result.data)
					self.log('debug', 'No workspace')
				}
			} else {
				console.log('error: ' + result.response.statusCode)
				self.status(self.STATUS_ERROR, result.response.statusCode)
				self.log('warn', 'Unable to connect to toggl, check your API token is correct')
			}
		},
		self.header
	)
}

instance.prototype.getProjects = function () {
	var self = this

	if (self.workspace !== null) {

		// reset
		self.projects = []

		var cmd = 'https://api.track.toggl.com/api/v8/workspaces/' + self.workspace + '/projects'
		self.system.emit(
			'rest_get',
			cmd,
			function (err, result) {
				if (err !== null) {
					console.log('HTTP Request failed (' + result.error.code + ')')
					self.status(self.STATUS_ERROR, result.error.code)
					console.log(result.data)
				} else if (result.response.statusCode == 200) {
					// console.log('project request status:' + result.response.statusCode)
					self.status(self.STATUS_OK)
					if (typeof result.data === 'object' && result.data !== null) {
						for (p = 0; p < result.data.length; p++) {
							if ('id' in result.data[p]) {
								self.projects.push({
									id: result.data[p].id.toString(),
									label: result.data[p].name,
								})
								self.log('debug', 'Project ' + result.data[p].id + ':' + result.data[p].name)
							}
						}

						self.projects.sort((a, b) => {
							fa = a.label.toLowerCase()
							fb = b.label.toLowerCase()

							if (fa < fb) {
								return -1;
							}
							if (fa > fb) {
								return 1;
							}
							return 0;
						})

						self.projects.unshift({ id: '0', label: 'None' })
						console.log('Projects:')
						console.log(self.projects)
						self.actions()
					} else {
						console.log(result.data)
						self.log('debug', 'No projects')
					}
				} else {
					console.log('error: ' + result.response.statusCode)
					self.status(self.STATUS_ERROR, result.response.statusCode)
					self.log('warn', 'Unable to connect to toggl, check your API token is correct')
				}
			},
			self.header
		)
	}
}

instance.prototype.getCurrentTimer = function () {
	var self = this
	var cmd = 'https://api.track.toggl.com/api/v8/time_entries/current'
	console.log(cmd)
	self.system.emit(
		'rest_get',
		cmd,
		function (err, result) {
			if (err !== null) {
				console.log('HTTP Request failed (' + result.error.code + ')')
				self.status(self.STATUS_ERROR, result.error.code)
			} else if (result.response.statusCode == 200) {
				// console.log('getCurrentTimer status:' + result.response.statusCode)
				self.status(self.STATUS_OK)
				if (typeof result.data.data === 'object' && result.data.data !== null) {
					if ('id' in result.data.data) {
						self.currentTimer = result.data.data.id
						console.log('current timer: ' + self.currentTimer)
						self.log('debug', 'Current timer id ' + self.currentTimer)
					}
				} else {
					console.log('getCurrentTimer: No timer running')
					self.log('debug', 'No timer running')
					self.currentTimer = null
				}
			} else {
				console.log('error: ' + result.response.statusCode)
				self.status(self.STATUS_ERROR, result.response.statusCode)
				self.log('warn', 'Unable to connect to toggl, check your API token is correct')
				self.currentTimer = null
			}
		},
		self.header
	)
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
