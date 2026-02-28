import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'james.db');

let db = null;
let SQL = null;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function initDB() {
  // Find sql-wasm.wasm in node_modules
  const modulePath = import.meta.url.slice(7); // Remove 'file://'
  const moduleDir = path.dirname(modulePath);
  const projectRoot = path.join(moduleDir, '..');
  const wasmPath = path.join(projectRoot, 'node_modules/sql.js/dist/sql-wasm.wasm');

  // Initialize sql.js with wasm file
  SQL = await initSqlJs({
    locateFile: (file) => {
      if (file.endsWith('.wasm')) {
        return wasmPath;
      }
      return file;
    }
  });

  // Try to load existing database from file
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    console.log('Loaded existing database from file');
  } else {
    // Create new database
    db = new SQL.Database();
    console.log('Created new database');
  }

  // Create tables
  createTables();
  return db;
}

function createTables() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS stores (
      store_code TEXT PRIMARY KEY,
      company TEXT,
      store_name TEXT,
      period_from TEXT,
      period_to TEXT,
      period_days INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fixtures (
      fixture_id TEXT PRIMARY KEY,
      store_code TEXT,
      fixture_type TEXT DEFAULT 'gondola',
      department TEXT,
      category_label TEXT,
      categories TEXT,
      rows INTEGER,
      shelf_width_mm INTEGER DEFAULT 900,
      row_heights TEXT,
      total_sales INTEGER DEFAULT 0,
      regular_sales INTEGER DEFAULT 0,
      period_from TEXT,
      period_to TEXT,
      FOREIGN KEY (store_code) REFERENCES stores(store_code)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixture_id TEXT,
      row_num INTEGER,
      order_num REAL,
      jan TEXT,
      name TEXT,
      maker TEXT,
      price INTEGER,
      cost_rate REAL,
      rank TEXT,
      face INTEGER,
      width_mm INTEGER DEFAULT 90,
      height_mm INTEGER DEFAULT 200,
      depth INTEGER DEFAULT 3,
      sales_qty INTEGER DEFAULT 0,
      total_sales INTEGER DEFAULT 0,
      total_profit INTEGER DEFAULT 0,
      daily_avg_qty REAL DEFAULT 0,
      sales_week TEXT,
      category_name TEXT,
      color TEXT DEFAULT '#F1F5F9',
      FOREIGN KEY (fixture_id) REFERENCES fixtures(fixture_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shelf_edits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixture_id TEXT,
      user_name TEXT,
      action TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (fixture_id) REFERENCES fixtures(fixture_id)
    )
  `);
}

export function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
  console.log('Database saved to file');
}

export function getDB() {
  return db;
}

export async function seedFromJSON(jsonPath) {
  if (!db) return;

  // Check if stores table already has data
  try {
    const result = db.exec('SELECT COUNT(*) as count FROM stores');
    if (result.length > 0 && result[0].values[0][0] > 0) {
      console.log('Database already seeded, skipping');
      return;
    }
  } catch (e) {
    // Table might not exist, continue
  }

  // Read and parse JSON
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Insert store
  const store = {
    store_code: jsonData.storeCode,
    company: jsonData.company,
    store_name: jsonData.storeName,
    period_from: jsonData.periodFrom,
    period_to: jsonData.periodTo,
    period_days: jsonData.periodDays
  };

  db.run(
    `INSERT INTO stores (store_code, company, store_name, period_from, period_to, period_days)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [store.store_code, store.company, store.store_name, store.period_from, store.period_to, store.period_days]
  );

  // Insert fixtures and products
  Object.values(jsonData.fixtures).forEach(fixture => {
    const rowHeights = fixture.rowHeights || {};
    const categories = fixture.categories || [];

    db.run(
      `INSERT INTO fixtures (fixture_id, store_code, fixture_type, department, category_label, categories, rows, shelf_width_mm, row_heights, period_from, period_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fixture.fixtureId,
        store.store_code,
        fixture.fixtureType || 'gondola',
        fixture.department,
        fixture.categoryLabel,
        JSON.stringify(categories),
        fixture.rows,
        fixture.shelfWidthMm || 900,
        JSON.stringify(rowHeights),
        store.period_from,
        store.period_to
      ]
    );

    // Insert products
    (fixture.products || []).forEach(product => {
      db.run(
        `INSERT INTO products (fixture_id, row_num, order_num, jan, name, maker, price, cost_rate, rank, face, width_mm, height_mm, depth, sales_qty, total_sales, total_profit, daily_avg_qty, sales_week, category_name, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fixture.fixtureId,
          product.row,
          product.order || 0,
          product.jan,
          product.name,
          product.maker,
          product.price || 0,
          product.costRate || 70,
          product.rank || 'C',
          product.face || 1,
          product.width_mm || 90,
          product.height_mm || 200,
          product.depth || 3,
          product.salesQty || 0,
          product.totalSales || 0,
          product.totalProfit || 0,
          product.dailyAvgQty || 0,
          JSON.stringify(product.salesWeek || [0, 0, 0, 0, 0, 0, 0]),
          product.categoryName,
          product.color || '#F1F5F9'
        ]
      );
    });
  });

  saveDB();
  console.log('Database seeded from JSON');
}
