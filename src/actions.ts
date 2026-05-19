import type TogglTrack from './main.js'

export type ActionsSchema = {
	startNewTimer: {
		options: {
			description: string
			project: number
		}
	}
	getCurrentTimer: {
		options: Record<string, never>
	}
	stopCurrentTimer: {
		options: Record<string, never>
	}
	refreshProjects: {
		options: Record<string, never>
	}
	refreshStaticData: {
		options: Record<string, never>
	}
}

export function UpdateActions(self: TogglTrack): void {
	self.setActionDefinitions({
		startNewTimer: {
			name: 'Start New Timer',
			options: [
				{
					id: 'description',
					type: 'textinput',
					label: 'Description',
					default: '',
				},
				{
					id: 'project',
					type: 'dropdown',
					label: 'Project',
					default: '0',
					choices: self.projects ?? [{ id: -1, label: 'None' }],
				},
			],
			callback: async ({ options }) => {
				return self.startTimer(options.project, options.description)
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
				await self.getProjects()
			},
		},

		refreshStaticData: {
			name: 'Refresh Workspace, Project and Client List',
			options: [],
			callback: async () => {
				await self.loadStaticData()
			},
		},
	})
}
