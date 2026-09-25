import type { Recurrence } from "./types";
import {
  addDaysISO,
  weekdayOfISO,
  dayOfMonthOfISO,
} from "./dates";

export function parseRecurrence(json: string | null | undefined): Recurrence | null {
  if (!json) return null;
  try {
    const r = JSON.parse(json) as Recurrence;
    if (!r?.kind) return null;
    return r;
  } catch {
    return null;
  }
}

export function serializeRecurrence(r: Recurrence | null): string | null {
  if (!r) return null;
  return JSON.stringify(r);
}

/**
 * Compute the next due date after `fromDate` (exclusive) for a recurrence rule.
 * `fromDate` is YYYY-MM-DD — typically the completed instance's due date.
 */
export function nextDueDate(recurrence: Recurrence, fromDate: string): string {
  switch (recurrence.kind) {
    case "taeglich":
      return addDaysISO(fromDate, 1);

    case "woechentlich": {
      const target = recurrence.weekday ?? weekdayOfISO(fromDate);
      let candidate = addDaysISO(fromDate, 1);
      for (let i = 0; i < 8; i++) {
        if (weekdayOfISO(candidate) === target) return candidate;
        candidate = addDaysISO(candidate, 1);
      }
      return addDaysISO(fromDate, 7);
    }

    case "monatlich": {
      const targetDay = Math.min(Math.max(recurrence.dayOfMonth ?? dayOfMonthOfISO(fromDate), 1), 28);
      // Start from next month
      let year = parseInt(fromDate.slice(0, 4), 10);
      let month = parseInt(fromDate.slice(5, 7), 10); // 1-12
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return `${year}-${month.toString().padStart(2, "0")}-${targetDay.toString().padStart(2, "0")}`;
    }

    case "jaehrlich": {
      const md = recurrence.monthDay ?? fromDate.slice(5); // MM-DD
      const nextYear = parseInt(fromDate.slice(0, 4), 10) + 1;
      return `${nextYear}-${md}`;
    }

    default:
      return addDaysISO(fromDate, 1);
  }
}

/**
 * True if a recurring series should produce an open instance on `today`
 * given the last known due date of the series (open or completed).
 * Simpler approach used by ensureInstances: create if no open task exists
 * for the series and today >= next due after last completed / anchor.
 */
export function dueDatesFromAnchor(
  recurrence: Recurrence,
  anchorDate: string,
  untilInclusive: string,
  max = 400
): string[] {
  const dates: string[] = [];
  // If anchor itself is on/before until, include walking forward from anchor
  let current = anchorDate;
  // Walk until we pass untilInclusive
  // If first date is after until, return empty
  if (current > untilInclusive) return dates;

  // Include anchor if <= until
  if (current <= untilInclusive) dates.push(current);

  for (let i = 0; i < max; i++) {
    current = nextDueDate(recurrence, current);
    if (current > untilInclusive) break;
    dates.push(current);
  }
  return dates;
}

/** Human label for recurrence in German */
export function recurrenceLabel(r: Recurrence): string {
  switch (r.kind) {
    case "taeglich":
      return "Täglich";
    case "woechentlich": {
      const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
      const w = r.weekday ?? 1;
      return `Wöchentlich (${days[w] ?? "?"})`;
    }
    case "monatlich":
      return `Monatlich (Tag ${r.dayOfMonth ?? "?"})`;
    case "jaehrlich":
      return `Jährlich (${r.monthDay ?? "?"})`;
    default:
      return "Wiederkehrend";
  }
}
