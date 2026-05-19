import type TogglTrack from './main.js'

export type VariablesSchema = {
	workspace: string
	timerId: number
	timerDuration: string
	lastTimerDuration: number
	timerDescription: string
	timerProjectID: number
	timerProject: string
	timerClientID: number
	timerClient: string
}
export function UpdateVariableDefinitions(self: TogglTrack): void {
	self.setVariableDefinitions({
		workspace: {
			name: 'Workspace',
		},
		timerId: {
			name: 'Current Timer Id',
		},
		timerDuration: {
			name: 'Current Timer Duration',
		},
		lastTimerDuration: {
			name: 'Last Timer Duration',
		},
		timerDescription: {
			name: 'Current Timer Description',
		},
		timerProjectID: {
			name: 'Current Timer Project ID',
		},
		timerProject: {
			name: 'Current Timer Project',
		},
		timerClientID: {
			name: 'Current Timer Client ID',
		},
		timerClient: {
			name: 'Current Timer Client',
		},
	})
}
