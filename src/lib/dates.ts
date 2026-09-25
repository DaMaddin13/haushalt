import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { startOfWeek, endOfWeek, isValid, parseISO } from "date-fns";

export const TZ = "Europe/Vienna";

/** Today's date in Vienna as YYYY-MM-DD */
export function todayVienna(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** Current month key YYYY-MM in Vienna */
export function monthKeyVienna(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM");
}

export function formatVienna(date: Date | string, pattern = "dd.MM.yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "";
  return formatInTimeZone(d, TZ, pattern);
}

/** Week range (Mon–Sun) containing today in Vienna, as YYYY-MM-DD */
export function weekRangeVienna(now: Date = new Date()): { start: string; end: string } {
  const zoned = toZonedTime(now, TZ);
  const start = startOfWeek(zoned, { weekStartsOn: 1 });
  const end = endOfWeek(zoned, { weekStartsOn: 1 });
  // Format the calendar date of the zoned Date via its Y/M/D components
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { start: fmt(start), end: fmt(end) };
}

/** Calendar-date arithmetic on YYYY-MM-DD (UTC-safe) */
export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonthsISO(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T00:00:00.000Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function addYearsISO(isoDate: string, years: number): string {
  const d = new Date(isoDate + "T00:00:00.000Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Weekday 0=So … 6=Sa for an ISO calendar date */
export function weekdayOfISO(isoDate: string): number {
  return new Date(isoDate + "T00:00:00.000Z").getUTCDay();
}

export function dayOfMonthOfISO(isoDate: string): number {
  return new Date(isoDate + "T00:00:00.000Z").getUTCDate();
}

export function monthDayOfISO(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00.000Z");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${m}-${day}`;
}
