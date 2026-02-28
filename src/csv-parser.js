// ============================================================
// CSV Parser / Exporter — フロントエンド用（サーバー不要）
// Shift-JIS対応、基幹CSVインポート＆棚割CSVエクスポート
// ============================================================

// --- CSV parsing utilities ---

function decodeBuffer(buffer) {
  // Try Shift-JIS first, fall back to UTF-8
  try {
    const decoder = new TextDecoder('shift_jis');
    return decoder.decode(buffer);
  } catch (e) {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const record = {};
    headers.forEach((h, idx) => {
      record[h.trim()] = (values[idx] || '').trim();
    });
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function getField(record, ...names) {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== '') return record[name];
  }
  return '';
}

// --- Import: ゴンドラ商品マスター ---

export function parseGondolaMaster(buffer) {
  const text = decodeBuffer(buffer);
  return parseCSVText(text);
}

// --- Import: 棚割実績表 ---

export function parseShelfPerformance(buffer) {
  const text = decodeBuffer(buffer);
  return parseCSVText(text);
}

// --- Build store-data.json equivalent from 2 CSVs ---

export function buildStoreData(masterRecords, performanceRecords) {
  // Extract store info from performance records
  const perfFirst = performanceRecords[0] || {};
  const company = getField(perfFirst, '企業名') || '';
  const storeCode = getField(perfFirst, '店コード') || '';
  const storeName = getField(perfFirst, '店名') || '';
  const periodFrom = getField(perfFirst, '実績期間FROM') || '';
  const periodTo = getField(perfFirst, '実績期間TO') || '';

  // Calculate period days
  let periodDays = 0;
  if (periodFrom && periodTo) {
    const from = new Date(periodFrom.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const to = new Date(periodTo.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    periodDays = Math.round((to - from) / (1000 * 60 * 60 * 24));
  }

  // Build fixtures from master
  const fixtures = {};
  const departments = {};

  masterRecords.forEach(r => {
    const fixtureId = getField(r, 'ゴンドラコード', 'gondola_code');
    const rowNum = parseInt(getField(r, '棚段', 'row_num')) || 1;
    const orderNum = parseFloat(getField(r, '棚順', 'order_num')) || 0;
    const jan = getField(r, '代表スキャニングコード', 'jan');
    const name = getField(r, '商品名', 'product_name');
    const face = parseInt(getField(r, 'フェース数', 'face')) || 1;
    const departmentName = getField(r, '部門名', 'department');
    const categoryName = getField(r, '分類名', 'category');
    const cost = parseFloat(getField(r, '原価', 'cost')) || 0;
    const price = parseInt(getField(r, '売価', 'price')) || 0;
    const maker = getField(r, '発注先名', 'supplier');

    if (!fixtureId || !jan) return;

    // Initialize fixture
    if (!fixtures[fixtureId]) {
      fixtures[fixtureId] = {
        fixtureId,
        fixtureType: 'gondola',
        department: departmentName,
        categories: [],
        categoryLabel: '',
        rows: 0,
        shelfWidthMm: 900,
        rowHeights: {},
        products: []
      };
    }

    const fixture = fixtures[fixtureId];

    // Track max row
    if (rowNum > fixture.rows) fixture.rows = rowNum;

    // Track categories
    if (categoryName && !fixture.categories.includes(categoryName)) {
      fixture.categories.push(categoryName);
    }

    // Calculate cost rate
    const costRate = price > 0 ? Math.round((cost / price) * 1000) / 10 : 70;

    // Add product
    fixture.products.push({
      row: rowNum,
      order: orderNum,
      jan,
      name,
      maker,
      price,
      costRate,
      rank: 'C', // Will be calculated later
      face,
      width_mm: 90,
      height_mm: 200,
      depth: 3,
      salesQty: 0,
      totalSales: 0,
      totalProfit: 0,
      dailyAvgQty: 0,
      salesWeek: [0, 0, 0, 0, 0, 0, 0],
      categoryName,
      color: '#F1F5F9'
    });

    // Build department mapping
    if (departmentName) {
      if (!departments[departmentName]) departments[departmentName] = [];
      if (!departments[departmentName].includes(fixtureId)) {
        departments[departmentName].push(fixtureId);
      }
    }
  });

  // Merge performance data
  const perfMap = {};
  performanceRecords.forEach(r => {
    const fixtureId = getField(r, 'ゴンドラコード', 'gondola_code');
    const jan = getField(r, '代表スキャニングコード', 'jan');
    if (!fixtureId || !jan) return;
    const key = `${fixtureId}-${jan}`;
    perfMap[key] = {
      salesQty: parseInt(getField(r, '売上数量', 'sales_qty')) || 0,
      totalSales: parseInt(getField(r, '総売上金額', 'total_sales')) || 0,
      totalProfit: parseInt(getField(r, '総荒利金額', 'total_profit')) || 0,
      gondolaTotalSales: parseInt(getField(r, 'ゴンドラ総売上金額合計')) || 0,
      gondolaRegularSales: parseInt(getField(r, 'ゴンドラ定番売上金額合計')) || 0,
    };
  });

  // Apply performance data to products and calculate ranks
  const weeks = periodDays > 0 ? periodDays / 7 : 7;

  Object.values(fixtures).forEach(fixture => {
    // Sort products by row, then order
    fixture.products.sort((a, b) => a.row - b.row || a.order - b.order);

    // Merge performance data
    fixture.products.forEach(p => {
      const key = `${fixture.fixtureId}-${p.jan}`;
      const perf = perfMap[key];
      if (perf) {
        p.salesQty = perf.salesQty;
        p.totalSales = perf.totalSales;
        p.totalProfit = perf.totalProfit;
        p.dailyAvgQty = perf.salesQty > 0 ? Math.round((perf.salesQty / periodDays) * 100) / 100 : 0;
        // Distribute sales into weekly array
        const weeklyQty = Math.round(perf.salesQty / weeks);
        p.salesWeek = Array(7).fill(0).map(() => Math.max(0, weeklyQty + Math.round((Math.random() - 0.5) * weeklyQty * 0.2)));
      }
      // Recalculate costRate from actual data if available
      if (perf && perf.totalSales > 0 && perf.totalProfit > 0) {
        const actualCostRate = Math.round((1 - perf.totalProfit / perf.totalSales) * 1000) / 10;
        if (actualCostRate > 0 && actualCostRate < 100) p.costRate = actualCostRate;
      }
    });

    // Calculate ranks by totalSales
    const sorted = [...fixture.products].sort((a, b) => b.totalSales - a.totalSales);
    const total = sorted.length;
    sorted.forEach((p, i) => {
      const ratio = total > 0 ? i / total : 0;
      const prod = fixture.products.find(pp => pp.jan === p.jan);
      if (prod) {
        prod.rank = ratio < 0.2 ? 'A' : ratio < 0.5 ? 'B' : 'C';
      }
    });

    // Generate row heights (default 300mm per row)
    for (let r = 1; r <= fixture.rows; r++) {
      fixture.rowHeights[String(r)] = 300;
    }

    // Generate category label
    fixture.categoryLabel = fixture.categories.length > 0
      ? fixture.categories.join(' / ')
      : fixture.department;

    // Assign colors based on category
    const colorPalette = ['#DBEAFE', '#FEF3C7', '#D1FAE5', '#FCE7F3', '#E0E7FF', '#FED7AA', '#CCFBF1', '#F3E8FF'];
    const catColorMap = {};
    fixture.categories.forEach((cat, i) => {
      catColorMap[cat] = colorPalette[i % colorPalette.length];
    });
    fixture.products.forEach(p => {
      p.color = catColorMap[p.categoryName] || '#F1F5F9';
    });
  });

  return {
    storeCode,
    storeName,
    company,
    periodFrom,
    periodTo,
    periodDays,
    departments,
    fixtures
  };
}

// --- Export: 棚割変更結果CSV (単一ゴンドラ) ---

export function exportShelfCSV(products, deletedProducts, fixtureId, originalProducts) {
  const headers = [
    'ゴンドラコード', '棚段', '棚順', 'JAN', '商品名', 'メーカー',
    'フェース数', '売価', '原価率', 'ランク',
    '売上数量', '総売上金額', '総荒利金額', '変更区分'
  ];

  // Build original lookup for change detection
  const origMap = {};
  (originalProducts || []).forEach(p => {
    origMap[p.jan] = p;
  });

  const rows = [];

  // Current products
  products.forEach(p => {
    const orig = origMap[p.jan];
    let changeType = '変更なし';
    if (!orig) {
      changeType = '追加';
    } else if (orig.face !== p.face) {
      changeType = 'フェース変更(' + orig.face + '→' + p.face + ')';
    } else if (orig.row !== p.row) {
      changeType = '段変更(' + orig.row + '→' + p.row + ')';
    }

    rows.push([
      fixtureId, p.row, p.order || '', p.jan, p.name, p.maker || '',
      p.face, p.price, p.costRate, p.rank,
      p.salesQty || 0, p.totalSales || 0, p.totalProfit || 0, changeType
    ]);
  });

  // Deleted products
  (deletedProducts || []).forEach(p => {
    rows.push([
      fixtureId, p.row, p.order || '', p.jan, p.name, p.maker || '',
      0, p.price, p.costRate, p.rank,
      p.salesQty || 0, p.totalSales || 0, p.totalProfit || 0, '削除'
    ]);
  });

  return generateCSVString(headers, rows);
}

// --- Export: 全ゴンドラ棚割CSV ---

export function exportAllFixturesCSV(fixtures) {
  const headers = [
    'ゴンドラコード', '部門', 'カテゴリ', '棚段', '棚順', 'JAN', '商品名',
    'メーカー', 'フェース数', '売価', '原価率', 'ランク',
    '売上数量', '総売上金額', '総荒利金額'
  ];

  const rows = [];
  Object.entries(fixtures).forEach(([id, fixture]) => {
    (fixture.products || []).forEach(p => {
      rows.push([
        id, fixture.department || '', fixture.categoryLabel || '',
        p.row, p.order || '', p.jan, p.name, p.maker || '',
        p.face, p.price, p.costRate, p.rank,
        p.salesQty || 0, p.totalSales || 0, p.totalProfit || 0
      ]);
    });
  });

  return generateCSVString(headers, rows);
}

// --- CSV string generation with BOM for Excel compatibility ---

function generateCSVString(headers, rows) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const escape = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach(row => {
    lines.push(row.map(escape).join(','));
  });
  return BOM + lines.join('\r\n');
}

// --- Download helper ---

export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
