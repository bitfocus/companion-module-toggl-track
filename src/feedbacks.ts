import { combineRgb } from '@companion-module/base'
import type { TogglTrack } from './main.js'

export function UpdateFeedbacks(self: TogglTrack): void {
	self.setFeedbackDefinitions({
		ProjectRunningState: {
			name: 'Project Counting',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
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
			callback: (feedback) => {
				//self.log('debug', 'check project counting ' + feedback.options.project)
				return feedback.options.project == self.currentEntry?.project_id
			},
		},
		ClientRunningState: {
			name: 'Client Counting',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
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
			callback: (feedback) => {
				//self.log('debug', 'check client counting ' + feedback.options.client)
				// find the project that matches the project_id of the current entry and compare its client_id with the configured one
				return feedback.options.client == self.projects?.find((p) => p.id == self.currentEntry?.project_id)?.clientID
			},
		},
	})
}
