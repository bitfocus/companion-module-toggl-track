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
					choices: [{ id: -1, label: 'None' }].concat(self.projects!),
				},
			],
			callback: (feedback) => {
				const projID = self.getVariableValue('timerProjectID')
				self.log('debug', 'check if ' + feedback.options.project + '=' + projID)
				return feedback.options.project == projID
			},
		},
	})
}
