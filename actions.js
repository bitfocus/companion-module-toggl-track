export function updateActions() {
	let actions = {}

	actions['startNewTimer'] = {
		name: 'Start New Timer',
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
				choices: this.projects,
			},
		],
		callback: ({ options }) => {
			this.startTimer(options.project, options.description)
		},
	}

	actions['getCurrentTimer'] = {
		name: 'Get Current Timer',
		options: [],
		callback: (action) => {
			this.getCurrentTimer()
		},
	}

	actions['stopCurrentTimer'] = {
		name: 'Stop Current Timer',
		options: [],
		callback: (action) => {
			this.stopTimer()
		},
	}

	actions['refreshProjects'] = {
		name: 'Refresh Project List',
		options: [],
		callback: (action) => {
			this.getWorkspace()
		},
	}

	this.setActionDefinitions(actions)
}
