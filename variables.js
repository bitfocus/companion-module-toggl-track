export default function (self) {
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
	])
}
