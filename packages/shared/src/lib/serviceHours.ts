import type { ServiceHoursConfig, ServiceHoursWindow } from '../data/types';

export const DEFAULT_SERVICE_HOURS: ServiceHoursConfig = {
  weekday: { start: '08:00', end: '23:00' },
  weekend_holiday: { start: '10:00', end: '19:00' },
  excludeNationalHolidays: true,
};

/** Demo national holidays (MM-DD) when excludeNationalHolidays is on. */
const NATIONAL_HOLIDAY_MMDD = new Set([
  '01-26', // Republic Day
  '08-15', // Independence Day
  '10-02', // Gandhi Jayanti
  '01-01', // New Year (demo)
]);

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatHm12(hm: string): string {
  const [hRaw, mRaw] = hm.split(':').map(Number);
  const h = hRaw || 0;
  const m = mRaw || 0;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${h12} ${ampm}`;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatServiceHoursLine(config: ServiceHoursConfig): string {
  const wd = config.weekday;
  const we = config.weekend_holiday;
  const holidayNote = config.excludeNationalHolidays
    ? ', excluding national holidays'
    : '';
  return (
    `Video KYC Service operates from ${formatHm12(wd.start)} to ${formatHm12(wd.end)} Monday to Friday` +
    ` & ${formatHm12(we.start)} to ${formatHm12(we.end)} on Saturdays, Sundays & bank holidays` +
    holidayNote
  );
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isNationalHoliday(d: Date): boolean {
  const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return NATIONAL_HOLIDAY_MMDD.has(mmdd);
}

export function windowForDate(d: Date, config: ServiceHoursConfig): ServiceHoursWindow {
  if (isWeekend(d) || (config.excludeNationalHolidays && isNationalHoliday(d))) {
    return config.weekend_holiday;
  }
  return config.weekday;
}

export function isWithinServiceHours(
  now: Date,
  config: ServiceHoursConfig,
  opts?: { forceOutside?: boolean },
): boolean {
  if (opts?.forceOutside) return false;
  const win = windowForDate(now, config);
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseHm(win.start);
  const end = parseHm(win.end);
  return mins >= start && mins < end;
}

/** Next opening Date after `now` (demo: scan up to 14 days). */
export function nextOpeningTime(now: Date, config: ServiceHoursConfig): Date {
  for (let day = 0; day < 14; day++) {
    const d = new Date(now);
    d.setDate(now.getDate() + day);
    const win = windowForDate(d, config);
    const startMins = parseHm(win.start);
    const candidate = new Date(d);
    candidate.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

export function formatNextOpening(next: Date): string {
  return next.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface SlotOption {
  id: string;
  label: string;
  at: Date;
}

/** Slot options in the next working window (demo). */
export function generateBookingSlots(now: Date, config: ServiceHoursConfig): SlotOption[] {
  const open = nextOpeningTime(now, config);
  const win = windowForDate(open, config);
  const endMins = parseHm(win.end);
  const slots: SlotOption[] = [];
  for (let i = 0; i < 4; i++) {
    const at = new Date(open);
    at.setMinutes(at.getMinutes() + i * 30);
    const mins = at.getHours() * 60 + at.getMinutes();
    if (mins >= endMins) break;
    slots.push({
      id: `slot-${at.toISOString()}`,
      label: at.toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }),
      at,
    });
  }
  return slots;
}
