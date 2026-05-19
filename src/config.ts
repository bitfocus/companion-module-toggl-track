import { type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	apiToken?: string
	workspaceName: string
	alwaysStart: boolean
	startTimerPoller: boolean
	timerPollerInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'apiToken',
			label: 'Personal API Token from your Toggl user profile (required)',
			width: 12,
			minLength: 10,
			default: '',
		},
		{
			type: 'textinput',
			id: 'workspaceName',
			label: 'Workspace to default to (first found if unset)',
			width: 12,
			default: '',
		},
		{
			type: 'checkbox',
			id: 'alwaysStart',
			label: 'Always start a new timer even if there is one already running',
			width: 12,
			default: false,
		},
		{
			type: 'checkbox',
			id: 'startTimerPoller',
			label: 'Poll for current time entry every n seconds',
			width: 12,
			default: false,
		},
		{
			type: 'number',
			id: 'timerPollerInterval',
			label: 'Poll interval in seconds',
			width: 12,
			default: 60,
			min: 30,
			max: 3600,
		},
	]
}
