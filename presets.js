import { combineRgb } from '@companion-module/base'

export function updatePresets() {
	let presets = {}

	presets['Start'] = {
		type: 'button',
		category: 'Timer',
		name: 'Start',
		style: {
			text: 'Start Timer',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [{
				down: [{
						actionId: 'startNewTimer',
						options: {
							description: '',
							project: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['Stop'] = {
		type: 'button',
		category: 'Timer',
		name: 'Stop',
		style: {
			text: 'Stop Timer',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [{
				down: [
					{
						actionId: 'stopCurrentTimer',
						options: {
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	this.setPresetDefinitions(presets)
}