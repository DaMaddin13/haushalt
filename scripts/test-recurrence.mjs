/**
 * Quick recurrence logic smoke test (no vitest needed).
 * Run: node scripts/test-recurrence.mjs
 */

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOfISO(isoDate) {
  return new Date(isoDate + "T00:00:00.000Z").getUTCDay();
}

function nextDueDate(recurrence, fromDate) {
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
      const targetDay = Math.min(Math.max(recurrence.dayOfMonth ?? 1, 1), 28);
      let year = parseInt(fromDate.slice(0, 4), 10);
      let month = parseInt(fromDate.slice(5, 7), 10);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return `${year}-${String(month).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
    }
    case "jaehrlich": {
      const md = recurrence.monthDay ?? fromDate.slice(5);
      const nextYear = parseInt(fromDate.slice(0, 4), 10) + 1;
      return `${nextYear}-${md}`;
    }
    default:
      return addDaysISO(fromDate, 1);
  }
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

assert(nextDueDate({ kind: "taeglich" }, "2026-03-15") === "2026-03-16", "daily +1");
assert(nextDueDate({ kind: "woechentlich", weekday: 1 }, "2026-03-16") === "2026-03-23", "weekly Mon->Mon"); // 16=Mon
assert(weekdayOfISO("2026-03-16") === 1, "2026-03-16 is Monday");
assert(nextDueDate({ kind: "woechentlich", weekday: 5 }, "2026-03-16") === "2026-03-20", "weekly Mon->Fri");
assert(nextDueDate({ kind: "monatlich", dayOfMonth: 15 }, "2026-03-15") === "2026-04-15", "monthly");
assert(nextDueDate({ kind: "monatlich", dayOfMonth: 28 }, "2026-01-28") === "2026-02-28", "monthly day 28");
assert(nextDueDate({ kind: "jaehrlich", monthDay: "03-15" }, "2026-03-15") === "2027-03-15", "yearly");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll recurrence tests passed.");
