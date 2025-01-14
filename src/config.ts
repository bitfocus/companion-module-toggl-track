import { type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	apiToken?: string
	workspaceName: string
	alwaysStart?: boolean
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	// console.log('config fields')
	return [
		{
			type: 'textinput',
			id: 'apiToken',
			label: 'Personal API Token from your Toggl user profile (required)',
			width: 12,
			required: true,
			default: '',
		},
		{
			type: 'textinput',
			id: 'workspaceName',
			label: 'Workspace to default to (first found if unset)',
			width: 12,
			required: false,
			default: '',
		},
		{
			type: 'checkbox',
			id: 'alwaysStart',
			label: 'Always start a new timer even if there is one already running',
			width: 12,
			default: false,
		},
	]
}
