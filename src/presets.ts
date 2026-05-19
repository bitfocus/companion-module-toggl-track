import type { ModuleSchema } from './main.js'
import type TogglTrack from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

export function UpdatePresets(self: TogglTrack): void {
	const structure: CompanionPresetSection[] = []
	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		Start: {
			name: 'Start',
			type: 'simple',
			style: {
				text: 'Start Timer',
				size: '18',
				color: 0xffffff,
				bgcolor: 0x000000,
			},
			steps: [
				{
					down: [
						{
							actionId: 'startNewTimer',
							options: {
								description: '',
								project: 0,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		},
		Stop: {
			name: 'Stop',
			type: 'simple',
			style: {
				text: 'Stop Timer',
				size: '18',
				color: 0xffffff,
				bgcolor: 0x000000,
			},
			steps: [
				{
					down: [
						{
							actionId: 'stopCurrentTimer',
							options: {},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		},
	}

	self.setPresetDefinitions(structure, presets)
}
