export default function (self) {
	self.setActionDefinitions({
		startNewTimer: {
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
					choices: self.projects,
				},
			],
			callback: ({ options }) => {
				self.startTimer(options.project, options.description)
			},
		},

		getCurrentTimer: {
			name: 'Get Current Timer',
			options: [],
			callback: (action) => {
				self.getCurrentTimer()
			},
		},

		stopCurrentTimer: {
			name: 'Stop Current Timer',
			options: [],
			callback: (action) => {
				self.stopTimer()
			},
		},

		refreshProjects: {
			name: 'Refresh Project List',
			options: [],
			callback: (action) => {
				self.getWorkspace()
			},
		},
	})
}
