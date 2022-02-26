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
	self.getCurrentTimer()
	self.actions()
}

instance.prototype.init = function () {
	var self = this

	debug = self.debug
	log = self.log

	self.currentTimer = null
	
	self.init_presets()
	self.auth()
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
				}
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
			var body = '{"time_entry":{"description":"' + opt.description + '","created_with":"companion"}}'
			console.log(body)
			break
		}
		case 'stopCurrentTimer': {
			var restCmd = 'rest_put'
			console.log(self.currentTimer)
			
			if (self.currentTimer != null && self.currentTimer != undefined) {
				var cmd = 'https://api.track.toggl.com/api/v8/time_entries/' + self.currentTimer + '/stop'
				console.log(cmd)
			} else {
				self.log('warn','No running timer to stop or running timer ID unknown')
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

	self.system.emit(restCmd, cmd, body, function (err, result) {
		
		if (err !== null) {
			console.log(result.statusCode)
			console.log('HTTP Request failed (' + result.error.code + ')')
			self.status(self.STATUS_ERROR, result.error.code);
		} else {
			console.log(typeof(result.data))
			console.log(result.statusCode)
			if (!self.auth_error) {
				self.status(self.STATUS_OK)
				if (typeof result.data === 'object') {
					if (typeof result.data.data === 'object') {
						self.interpretData(result.data.data)
					}
				} else {
					self.currentTimer = null
					console.log(result.data)
					self.log('debug',result.data)
				}
			}
		}
	}, self.header)
	
}

instance.prototype.getCurrentTimer = function () {
	var self = this
	var cmd = 'https://api.track.toggl.com/api/v8/time_entries/current'
	
	self.system.emit('rest_get', cmd, function (err, result) {
		if (err !== null) {
			console.log('HTTP Request failed (' + result.error.code + ')')
			self.status(self.STATUS_ERROR, result.error.code)
		} else if (result.response.statusCode == 200) {
			console.log('status:' + result.response.statusCode)
			self.status(self.STATUS_OK)
			if (typeof result.data.data === 'object' && result.data.data != null) {
				if ('id' in result.data.data) {
					self.currentTimer = result.data.data.id
					console.log(self.currentTimer)
					self.log('debug','Current timer id ' + self.currentTimer)
				}
			} else {
				console.log(result.data)
				self.log('debug','No timer running')
				self.currentTimer = null
			}
		} else {
			console.log('error: ' + result.response.statusCode)
			self.status(self.STATUS_ERROR, result.response.statusCode)
			self.log('warn','Unable to connect to toggl, check your API token is correct')
			self.currentTimer = null
		}
	}, self.header)
}

instance.prototype.interpretData = function (data) {
	var self = this;

	console.log(data)
	
	if ('id' in data) {
		console.log(data.id)
		self.currentTimer = data.id
		self.log('debug','timer id ' + data.id)
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
