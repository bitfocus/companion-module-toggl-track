import { TogglTrack } from './main.js'

export default function (self: TogglTrack): void {
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
					choices: self.projects!,
				},
			],
			callback: async ({ options }) => {
				return self.startTimer(Number(options.project), options.description as string)
			},
		},

		getCurrentTimer: {
			name: 'Get Current Timer',
			options: [],
			callback: async () => {
				await self.getCurrentTimer()
			},
		},

		stopCurrentTimer: {
			name: 'Stop Current Timer',
			options: [],
			callback: async () => {
				return self.stopTimer()
			},
		},

		refreshProjects: {
			name: 'Refresh Project List',
			options: [],
			callback: async () => {
				await self.getWorkspace()
			},
		},
	})
}
