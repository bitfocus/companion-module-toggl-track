/**
 * returns formatted timecode from date until now
 * @param date start date
 * @returns formatted string 0:00:00 - where hours and minutes are hidden if 0
 */
export function timecodeSince(date: Date): string {
	const dateObj = new Date(Date.now() - date.getTime())
	const hours = dateObj.getUTCHours()
	const minutes = `0${dateObj.getUTCMinutes()}`.slice(-2)
	const seconds = `0${dateObj.getSeconds()}`.slice(-2)
	return (hours > 0 ? hours + ':' : '') + (hours > 0 || minutes !== '00' ? minutes + ':' : '') + seconds
}
