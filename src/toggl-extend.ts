import { Toggl } from 'toggl-track'

export interface IWorkspace {
	id: number
	name: string
}

export async function togglGetWorkspaces(toggl: Toggl): Promise<IWorkspace[]> {
	const resp: IWorkspace[] = await toggl.request<IWorkspace[]>('workspaces', {})
	return resp
}
