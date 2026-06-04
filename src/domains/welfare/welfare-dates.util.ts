/** Monday 00:00 UTC for the week containing `d`. */
export function getWeekStartMonday(d = new Date()): Date {
  const day = d.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function isWeekendUTC(d = new Date()): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function isHolidayUTC(d: Date, holidays: string[]): boolean {
  const key = d.toISOString().slice(0, 10);
  return holidays.includes(key);
}

export function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}
