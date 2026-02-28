import express from 'express';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { getDB, saveDB } from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to run query and return results
function queryAll(sql, params = []) {
  const db = getDB();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function execute(sql, params = []) {
  const db = getDB();
  db.run(sql, params);
  saveDB();
}

// GET /api/store - Get store info and departments list
router.get('/store', (req, res) => {
  try {
    const db = getDB();

    // Get store info
    const store = queryOne('SELECT * FROM stores LIMIT 1');
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get departments from fixtures
    const fixtures = queryAll('SELECT DISTINCT department FROM fixtures ORDER BY department');
    const departments = {};

    fixtures.forEach(f => {
      if (f.department && !departments[f.department]) {
        departments[f.department] = [];
      }
    });

    // Get all fixture IDs grouped by department
    const allFixtures = queryAll('SELECT fixture_id, department FROM fixtures ORDER BY department, fixture_id');
    allFixtures.forEach(f => {
      if (f.department && !departments[f.department].includes(f.fixture_id)) {
        departments[f.department].push(f.fixture_id);
      }
    });

    res.json({
      storeCode: store.store_code,
      storeName: store.store_name,
      company: store.company,
      periodFrom: store.period_from,
      periodTo: store.period_to,
      periodDays: store.period_days,
      departments
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fixtures - Get all fixtures summary
router.get('/fixtures', (req, res) => {
  try {
    const fixtures = queryAll('SELECT * FROM fixtures ORDER BY department, fixture_id');

    const result = fixtures.map(f => {
      const products = queryAll('SELECT * FROM products WHERE fixture_id = ?', [f.fixture_id]);
      const productCount = products.length;

      let totalSales = 0;
      products.forEach(p => {
        totalSales += p.total_sales || 0;
      });

      return {
        id: f.fixture_id,
        department: f.department,
        categoryLabel: f.category_label,
        categories: JSON.parse(f.categories || '[]'),
        productCount,
        totalSales
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fixtures/:id - Get single fixture with full product data
router.get('/fixtures/:id', (req, res) => {
  try {
    const fixture = queryOne('SELECT * FROM fixtures WHERE fixture_id = ?', [req.params.id]);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const products = queryAll('SELECT * FROM products WHERE fixture_id = ? ORDER BY row_num, order_num', [req.params.id]);

    const productData = products.map(p => ({
      id: p.id,
      row: p.row_num,
      order: p.order_num,
      jan: p.jan,
      name: p.name,
      maker: p.maker,
      price: p.price,
      costRate: p.cost_rate,
      rank: p.rank,
      face: p.face,
      width_mm: p.width_mm,
      height_mm: p.height_mm,
      depth: p.depth,
      salesQty: p.sales_qty,
      totalSales: p.total_sales,
      totalProfit: p.total_profit,
      dailyAvgQty: p.daily_avg_qty,
      salesWeek: JSON.parse(p.sales_week || '[0,0,0,0,0,0,0]'),
      categoryName: p.category_name,
      color: p.color
    }));

    res.json({
      fixtureId: fixture.fixture_id,
      fixtureType: fixture.fixture_type,
      department: fixture.department,
      categoryLabel: fixture.category_label,
      categories: JSON.parse(fixture.categories || '[]'),
      rows: fixture.rows,
      shelfWidthMm: fixture.shelf_width_mm,
      rowHeights: JSON.parse(fixture.row_heights || '{}'),
      products: productData,
      totalSales: fixture.total_sales || 0,
      regularSales: fixture.regular_sales || 0,
      periodFrom: fixture.period_from,
      periodTo: fixture.period_to,
      promotionalSlots: []
    });
  } catch (error) {
    console.error('Error fetching fixture:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/fixtures/:id/products - Save shelf changes
router.put('/fixtures/:id/products', express.json({ limit: '10mb' }), (req, res) => {
  try {
    const fixtureId = req.params.id;
    const products = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    // Delete existing products for this fixture
    execute('DELETE FROM products WHERE fixture_id = ?', [fixtureId]);

    // Insert updated products
    products.forEach(p => {
      execute(
        `INSERT INTO products (fixture_id, row_num, order_num, jan, name, maker, price, cost_rate, rank, face, width_mm, height_mm, depth, sales_qty, total_sales, total_profit, daily_avg_qty, sales_week, category_name, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fixtureId,
          p.row || 1,
          p.order || 0,
          p.jan,
          p.name,
          p.maker,
          p.price || 0,
          p.costRate || 70,
          p.rank || 'C',
          p.face || 1,
          p.width_mm || 90,
          p.height_mm || 200,
          p.depth || 3,
          p.salesQty || 0,
          p.totalSales || 0,
          p.totalProfit || 0,
          p.dailyAvgQty || 0,
          JSON.stringify(p.salesWeek || [0, 0, 0, 0, 0, 0, 0]),
          p.categoryName || '',
          p.color || '#F1F5F9'
        ]
      );
    });

    res.json({ success: true, message: 'Products updated' });
  } catch (error) {
    console.error('Error saving products:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fixtures/:id/edit-log - Log a shelf edit action
router.post('/fixtures/:id/edit-log', express.json(), (req, res) => {
  try {
    const { userName, action, details } = req.body;

    execute(
      'INSERT INTO shelf_edits (fixture_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [req.params.id, userName || 'unknown', action, JSON.stringify(details || {})]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging edit:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fixtures/:id/edit-log - Get edit history for a fixture
router.get('/fixtures/:id/edit-log', (req, res) => {
  try {
    const logs = queryAll(
      'SELECT * FROM shelf_edits WHERE fixture_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.params.id]
    );

    const result = logs.map(log => ({
      id: log.id,
      userName: log.user_name,
      action: log.action,
      details: JSON.parse(log.details || '{}'),
      createdAt: log.created_at
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching edit log:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/csv - CSV import endpoint
router.post('/import/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const type = req.query.type || req.body.type;
    if (!type) {
      return res.status(400).json({ error: 'Type parameter required (gondola-master or shelf-performance)' });
    }

    // Try to detect and decode as Shift-JIS
    let csvText;
    try {
      csvText = iconv.decode(req.file.buffer, 'Shift_JIS');
    } catch (e) {
      // Fallback to UTF-8
      csvText = req.file.buffer.toString('utf8');
    }

    // Parse CSV
    const records = csvParse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (type === 'gondola-master') {
      processGondolaMaster(records);
    } else if (type === 'shelf-performance') {
      processShelfPerformance(records);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    res.json({ success: true, message: `Imported ${records.length} records` });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

function processGondolaMaster(records) {
  // Expected columns from gondola master CSV
  // 店コード, ゴンドラコード, 棚段, 棚順, 代表スキャニングコード, 商品名, フェース数, 商品コード, 部門コード, 部門名, 分類コード, 分類名, 発注先コード, 発注先名, 原価, 売価, ユニット入数, 作成日, 更新日, 更新時刻, ユーザーID

  records.forEach(record => {
    // Normalize column names by trying different variations
    const getField = (record, ...names) => {
      for (let name of names) {
        if (record[name] !== undefined) return record[name];
      }
      return '';
    };

    const storeCode = getField(record, '店コード', 'store_code');
    const fixtureId = getField(record, 'ゴンドラコード', 'fixture_id', 'gondola_code');
    const rowNum = parseInt(getField(record, '棚段', 'row_num')) || 1;
    const orderNum = parseFloat(getField(record, '棚順', 'order_num')) || 0;
    const jan = getField(record, '代表スキャニングコード', 'jan', 'product_code');
    const productName = getField(record, '商品名', 'product_name', 'name');
    const face = parseInt(getField(record, 'フェース数', 'face')) || 1;
    const departmentName = getField(record, '部門名', 'department', 'department_name');
    const categoryName = getField(record, '分類名', 'category', 'category_name');
    const cost = parseInt(getField(record, '原価', 'cost')) || 0;
    const price = parseInt(getField(record, '売価', 'price')) || 0;

    if (!storeCode || !fixtureId || !jan) {
      console.warn('Skipping record with missing key fields:', record);
      return;
    }

    const costRate = price > 0 ? (cost / price) * 100 : 70;

    // Upsert product
    const existingProduct = queryOne(
      'SELECT id FROM products WHERE fixture_id = ? AND jan = ? AND row_num = ?',
      [fixtureId, jan, rowNum]
    );

    if (existingProduct) {
      execute(
        `UPDATE products SET order_num = ?, name = ?, face = ?, price = ?, cost_rate = ?, category_name = ?
         WHERE id = ?`,
        [orderNum, productName, face, price, costRate, categoryName, existingProduct.id]
      );
    } else {
      execute(
        `INSERT INTO products (fixture_id, row_num, order_num, jan, name, face, price, cost_rate, category_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fixtureId, rowNum, orderNum, jan, productName, face, price, costRate, categoryName]
      );
    }
  });
}

function processShelfPerformance(records) {
  // Expected columns from shelf performance CSV
  // 企業名, 店コード, 店名, 実績期間FROM, 実績期間TO, ゴンドラコード, ゴンドラ名, 商品コード, 代表スキャニングコード, 商品名, 棚段, フェース数, ゴンドラ総売上金額合計, ゴンドラ定番売上金額合計, 売上数量, 定番売上数量, 総売上金額, 定番売上金額, 売上原価金額, 総荒利金額, 定番荒利金額

  records.forEach(record => {
    const getField = (record, ...names) => {
      for (let name of names) {
        if (record[name] !== undefined) return record[name];
      }
      return '';
    };

    const storeCode = getField(record, '店コード', 'store_code');
    const fixtureId = getField(record, 'ゴンドラコード', 'fixture_id', 'gondola_code');
    const jan = getField(record, '代表スキャニングコード', 'jan', 'product_code');
    const rowNum = parseInt(getField(record, '棚段', 'row_num')) || 1;
    const face = parseInt(getField(record, 'フェース数', 'face')) || 1;
    const salesQty = parseInt(getField(record, '売上数量', 'sales_qty')) || 0;
    const totalSales = parseInt(getField(record, '総売上金額', 'total_sales')) || 0;
    const totalProfit = parseInt(getField(record, '総荒利金額', 'total_profit')) || 0;

    if (!storeCode || !fixtureId || !jan) {
      console.warn('Skipping shelf performance record with missing key fields');
      return;
    }

    const dailyAvgQty = salesQty > 0 ? salesQty / 7 : 0;

    // Update product with sales data
    const product = queryOne(
      'SELECT id FROM products WHERE fixture_id = ? AND jan = ?',
      [fixtureId, jan]
    );

    if (product) {
      execute(
        `UPDATE products SET sales_qty = ?, total_sales = ?, total_profit = ?, daily_avg_qty = ?
         WHERE id = ?`,
        [salesQty, totalSales, totalProfit, dailyAvgQty, product.id]
      );
    }
  });
}

export default router;
