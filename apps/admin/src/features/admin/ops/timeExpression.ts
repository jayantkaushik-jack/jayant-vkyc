/**
 * Resolves the "when" in an operations question — "at 2pm yesterday", "last
 * Monday 11:30", "an hour ago", "at 13:45 on 28 Jul". Deliberately small and
 * explicit rather than a date library: every pattern it accepts is one an ops
 * user actually types, and anything it does not recognise falls back to now,
 * with `explicit` telling the caller whether a time was really given.
 */

export interface ResolvedTime {
  at: Date;
  /** True when the question named a time rather than defaulting to now. */
  explicit: boolean;
  /** Human phrasing for the resolved instant, e.g. "yesterday at 14:00". */
  label: string;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** "2pm", "2 pm", "14:00", "1430 hrs", "11.30am" → minutes since midnight. */
function parseClock(q: string): number | null {
  const meridiem = q.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/);
  if (meridiem) {
    let hour = Number(meridiem[1]) % 12;
    if (meridiem[3] === 'pm') hour += 12;
    return hour * 60 + Number(meridiem[2] ?? 0);
  }
  const hhmm = q.match(/\b(\d{1,2}):(\d{2})\b/);
  if (hhmm) {
    const hour = Number(hhmm[1]);
    const minute = Number(hhmm[2]);
    if (hour <= 23 && minute <= 59) return hour * 60 + minute;
  }
  // "at 14" / "at 9" — only with an explicit "at", to avoid eating stray numbers.
  const bare = q.match(/\bat\s+(\d{1,2})\b(?!\s*(?:min|sec|hour|customers|calls|agents))/);
  if (bare) {
    const hour = Number(bare[1]);
    if (hour <= 23) return hour * 60;
  }
  return null;
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDay(d: Date, now: Date): string {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000,
  );
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days > 1 && days < 7) return `last ${WEEKDAYS[d.getDay()]}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "yesterday at 14:00", "last friday at 09:30", "12 Jul at 16:00". */
export function describeInstant(at: Date, now: Date = new Date()): string {
  return `${formatDay(at, now)} at ${formatClock(at.getHours() * 60 + at.getMinutes())}`;
}

export function resolveTimeExpression(question: string, now: Date = new Date()): ResolvedTime {
  const q = question.toLowerCase();

  // Relative offsets: "30 minutes ago", "an hour ago", "2 hours back".
  const ago = q.match(/\b(?:(\d{1,3})|an?)\s*(minute|min|hour|hr)s?\s*(?:ago|back|earlier)\b/);
  if (ago) {
    const amount = ago[1] ? Number(ago[1]) : 1;
    const unitMs = /hour|hr/.test(ago[2]) ? 3_600_000 : 60_000;
    const at = new Date(now.getTime() - amount * unitMs);
    return {
      at,
      explicit: true,
      label: `${amount} ${/hour|hr/.test(ago[2]) ? 'hour' : 'minute'}${amount === 1 ? '' : 's'} ago`,
    };
  }

  let day: Date | null = null;

  // "28 Jul" / "Jul 28" / "28/07"
  const dayMonth = q.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s+([a-z]{3,9})\b/);
  const monthDay = q.match(/\b([a-z]{3,9})\s+(\d{1,2})\b/);
  const numeric = q.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

  const monthIndex = (name: string) => MONTHS.indexOf(name.slice(0, 3));

  if (dayMonth && monthIndex(dayMonth[2]) >= 0) {
    day = new Date(now.getFullYear(), monthIndex(dayMonth[2]), Number(dayMonth[1]));
  } else if (monthDay && monthIndex(monthDay[1]) >= 0) {
    day = new Date(now.getFullYear(), monthIndex(monthDay[1]), Number(monthDay[2]));
  } else if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : now.getFullYear();
    day = new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  } else if (/\bday before yesterday\b/.test(q)) {
    day = startOfDay(new Date(now.getTime() - 2 * 86_400_000));
  } else if (/\byesterday\b/.test(q)) {
    day = startOfDay(new Date(now.getTime() - 86_400_000));
  } else if (/\btoday\b/.test(q)) {
    day = startOfDay(now);
  } else {
    // "last monday", "on friday"
    for (let i = 0; i < WEEKDAYS.length; i++) {
      if (!new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(q)) continue;
      const candidate = startOfDay(now);
      let back = (now.getDay() - i + 7) % 7;
      if (back === 0) back = 7; // "monday" on a Monday means the previous one
      candidate.setDate(candidate.getDate() - back);
      day = candidate;
      break;
    }
  }

  if (day !== null && day.getTime() > now.getTime()) {
    // A bare month/day that has not happened yet must mean last year.
    day.setFullYear(day.getFullYear() - 1);
  }

  const clock = parseClock(q);

  if (day === null && clock === null) {
    return { at: now, explicit: false, label: 'right now' };
  }

  const base = day !== null ? startOfDay(day) : startOfDay(now);
  const at = new Date(base);
  if (clock !== null) at.setMinutes(clock);
  else if (day !== null) at.setHours(23, 59, 0, 0); // "yesterday" with no time → end of day

  // A time-only question about a moment still ahead of us today means yesterday.
  if (day === null && clock !== null && at.getTime() > now.getTime()) {
    at.setDate(at.getDate() - 1);
  }

  const dayLabel = formatDay(at, now);
  const label = clock !== null
    ? `${dayLabel} at ${formatClock(clock)}`
    : `${dayLabel} (end of day)`;

  return { at, explicit: true, label };
}
