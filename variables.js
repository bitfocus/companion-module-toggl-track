export function updateVariables() {
	let variables = []
	
	variables.push(
		{
			name: 'Current Timer Id',
			variableId: 'timerId',
		},
		{
			name: 'Current Timer Duration',
			variableId: 'timerDuration',
		},
		{
			name: 'Current Timer Description',
			variableId: 'timerDescription',
		}
	)
	
	this.setVariableDefinitions(variables)
	
}