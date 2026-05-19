import type TogglTrack from './main.js'

export type FeedbacksSchema = {
	ProjectRunningState: {
		type: 'boolean'
		options: {
			project: number
		}
	}
	ClientRunningState: {
		name: 'Client Counting'
		type: 'boolean'
		options: {
			client: number
		}
	}
}

export function UpdateFeedbacks(self: TogglTrack): void {
	self.setFeedbackDefinitions({
		ProjectRunningState: {
			name: 'Project Counting',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0x000000,
			},
			options: [
				{
					id: 'project',
					type: 'dropdown',
					label: 'Project',
					default: -1,
					choices: self.projects ?? [{ id: -1, label: 'None' }],
				},
			],
			callback: ({ options }) => {
				//self.log('debug', 'check project counting ' + feedback.options.project)
				return options.project == self.currentEntry?.project_id
			},
		},
		ClientRunningState: {
			name: 'Client Counting',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0x000000,
			},
			options: [
				{
					id: 'client',
					type: 'dropdown',
					label: 'Client',
					default: -1,
					choices: self.clients ?? [{ id: -1, label: 'None' }],
				},
			],
			callback: ({ options }) => {
				//self.log('debug', 'check client counting ' + options.client)
				// find the project that matches the project_id of the current entry and compare its client_id with the configured one
				return options.client == self.projects?.find((p) => p.id == self.currentEntry?.project_id)?.clientID
			},
		},
	})
}
