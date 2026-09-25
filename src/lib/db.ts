import { createClient, type Client } from "@libsql/client";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";

let client: Client | null = null;
let migrated = false;

function getClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    client = createClient({ url, authToken });
  } else {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "haushalt.db");
    client = createClient({ url: `file:${dbPath}` });
  }
  return client;
}

async function migrate(db: Client) {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS areas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        note TEXT,
        area_id TEXT REFERENCES areas(id),
        priority TEXT NOT NULL DEFAULT 'mittel',
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'offen',
        recurrence_json TEXT,
        series_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS budget_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        month_income_cents INTEGER,
        updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS budget_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS fixed_costs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        category_id TEXT REFERENCES budget_categories(id),
        booking_day INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        category_id TEXT REFERENCES budget_categories(id),
        note TEXT,
        is_fixed_override INTEGER NOT NULL DEFAULT 0,
        fixed_cost_id TEXT REFERENCES fixed_costs(id),
        month_key TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS shopping_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS shopping_items (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        qty REAL,
        unit TEXT,
        section TEXT,
        checked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_series ON tasks(series_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month_key)`,
      `CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id)`,
    ],
    "write"
  );

  // Seed areas
  const areas = await db.execute("SELECT COUNT(*) AS c FROM areas");
  const areaCount = Number(areas.rows[0]?.c ?? 0);
  if (areaCount === 0) {
    const defaults = ["Küche", "Bad", "Büro", "Garten", "Admin", "Sonstiges"];
    for (let i = 0; i < defaults.length; i++) {
      await db.execute({
        sql: "INSERT INTO areas (id, name, sort) VALUES (?, ?, ?)",
        args: [nanoid(), defaults[i], i],
      });
    }
  }

  // Seed budget categories
  const cats = await db.execute("SELECT COUNT(*) AS c FROM budget_categories");
  if (Number(cats.rows[0]?.c ?? 0) === 0) {
    const defaults = [
      "Miete",
      "Strom",
      "Internet",
      "Versicherung",
      "Lebensmittel",
      "Mobilität",
      "Freizeit",
      "Gesundheit",
      "Sonstiges",
    ];
    for (const name of defaults) {
      await db.execute({
        sql: "INSERT INTO budget_categories (id, name) VALUES (?, ?)",
        args: [nanoid(), name],
      });
    }
  }

  // Seed budget settings row
  const settings = await db.execute("SELECT COUNT(*) AS c FROM budget_settings");
  if (Number(settings.rows[0]?.c ?? 0) === 0) {
    await db.execute({
      sql: "INSERT INTO budget_settings (id, month_income_cents, updated_at) VALUES (1, NULL, NULL)",
      args: [],
    });
  }

  // Seed default shopping list
  const lists = await db.execute("SELECT COUNT(*) AS c FROM shopping_lists");
  if (Number(lists.rows[0]?.c ?? 0) === 0) {
    await db.execute({
      sql: "INSERT INTO shopping_lists (id, name, created_at) VALUES (?, ?, ?)",
      args: [nanoid(), "Einkauf", new Date().toISOString()],
    });
  }
}

export async function getDb(): Promise<Client> {
  const db = getClient();
  if (!migrated) {
    await migrate(db);
    migrated = true;
  }
  return db;
}

export function newId(): string {
  return nanoid();
}

export function nowIso(): string {
  return new Date().toISOString();
}
