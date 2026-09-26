/** The time on a 12-hour clock, the way a phone shows it: "3:42" and "PM". */
export const time12 = (date: Date) => {
  const h = date.getHours()
  return {
    clock: `${h % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')}`,
    meridiem: h < 12 ? 'AM' : 'PM',
  }
}
