import { TogglTrack } from './main.js'

export default function (self: TogglTrack): void {
	self.setVariableDefinitions([
		{
			name: 'Workspace',
			variableId: 'workspace',
		},
		{
			name: 'Current Timer Id',
			variableId: 'timerId',
		},
		{
			name: 'Current Timer Duration',
			variableId: 'timerDuration',
		},
		{
			name: 'Last Timer Duration',
			variableId: 'lastTimerDuration',
		},
		{
			name: 'Current Timer Description',
			variableId: 'timerDescription',
		},
		{
			name: 'Current Timer Project ID',
			variableId: 'timerProjectID',
		},
		{
			name: 'Current Timer Project',
			variableId: 'timerProject',
		},
		{
			name: 'Current Timer Client ID',
			variableId: 'timerClientID',
		},
		{
			name: 'Current Timer Client',
			variableId: 'timerClient',
		},
	])
}
