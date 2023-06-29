export function updateVariables() {
	let variables = []

	variables.push(
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
		}
	)

	this.setVariableDefinitions(variables)
}
