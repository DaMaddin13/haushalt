export type Priority = "niedrig" | "mittel" | "hoch";
export type TaskStatus = "offen" | "erledigt";
export type RecurrenceKind = "taeglich" | "woechentlich" | "monatlich" | "jaehrlich";

export interface Recurrence {
  kind: RecurrenceKind;
  /** 0=So … 6=Sa for woechentlich */
  weekday?: number;
  /** 1–28 for monatlich */
  dayOfMonth?: number;
  /** MM-DD for jaehrlich, e.g. "03-15" */
  monthDay?: string;
}

export interface Area {
  id: string;
  name: string;
  sort: number;
}

export interface Task {
  id: string;
  title: string;
  note: string | null;
  area_id: string | null;
  area_name?: string | null;
  priority: Priority;
  due_date: string | null;
  status: TaskStatus;
  recurrence_json: string | null;
  series_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
}

export interface FixedCost {
  id: string;
  name: string;
  amount_cents: number;
  category_id: string | null;
  category_name?: string | null;
  booking_day: number;
}

export interface Expense {
  id: string;
  date: string;
  amount_cents: number;
  category_id: string | null;
  category_name?: string | null;
  note: string | null;
  is_fixed_override: number;
  fixed_cost_id: string | null;
  month_key: string;
}

export interface BudgetSettings {
  month_income_cents: number | null;
  updated_at: string | null;
}

export interface ShoppingList {
  id: string;
  name: string;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  section: string | null;
  checked: number;
  created_at: string;
}
