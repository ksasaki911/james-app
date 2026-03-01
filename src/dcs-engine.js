/**
 * DCS カット判定エンジン v4.1
 *
 * ロジック:
 *   1. カット: 販売数ゼロの商品のみ（即時カット・赤）
 *   2. F数減: F≧2の販売あり商品を日販(dailyAvgQty)で昇順ソートし、
 *             全体の約20%がカット＋F数減になるよう下位から選定（オレンジ）
 *   3. F数増: カット数と同数の高PI品にフェース増提案（青）
 *
 * 制約:
 *   - F=1の商品にはF数減を提案しない（これ以上減らせない）
 *   - 販売実績のある商品はカットしない
 *   - 全体の対象率は約20%を目安とする
 */

const TARGET_RATIO = 0.20;  // 全体の20%がカット＋F数減の目安

/**
 * 全ゴンドラの全商品を評価し、DCS提案を生成
 */
export function evaluateAllProducts(fixtures, periodDays = 49) {
  // 1. 全商品を収集
  const allProducts = [];
  for (const [fixtureId, fixture] of Object.entries(fixtures)) {
    for (const p of (fixture.products || [])) {
      allProducts.push({ ...p, fixtureId, piValue: p.dailyAvgQty || 0 });
    }
  }

  const totalCount = allProducts.length;
  const targetTotal = Math.round(totalCount * TARGET_RATIO);

  // 2. カット対象: 販売数ゼロのみ
  const zeroSales = allProducts.filter(p => p.salesQty === 0);
  const nonZero = allProducts.filter(p => p.salesQty > 0);

  // 3. F数減対象: F≧2の販売あり商品を日販の低い順にソート
  const faceReduceCandidates = nonZero
    .filter(p => p.face >= 2)
    .sort((a, b) => a.piValue - b.piValue);

  // カットで使った分を引いた残りがF数減の枠
  const faceReduceCount = Math.max(0, targetTotal - zeroSales.length);
  const faceReduceTargets = faceReduceCandidates.slice(0, faceReduceCount);

  // 4. カテゴリー統計（表示用）
  const categoryMap = {};
  for (const p of allProducts) {
    const cat = p.categoryName || '_未分類';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(p);
  }
  const categoryStats = {};
  for (const [cat, prods] of Object.entries(categoryMap)) {
    const piVals = prods.filter(p => p.piValue > 0).map(p => p.piValue).sort((a, b) => a - b);
    categoryStats[cat] = {
      count: prods.length,
      median: piVals.length > 0 ? calcMedian(piVals) : 0,
    };
  }

  // 5. 提案を生成
  const proposals = {};

  // カット提案
  for (const p of zeroSales) {
    proposals[`${p.fixtureId}_${p.jan}`] = {
      rule: 'rule1',
      action: 'cut',
      color: 'red',
      newFace: null,
      reason: `販売数ゼロ（${periodDays}日間）：即時カット対象`,
      jan: p.jan,
      name: p.name,
      fixtureId: p.fixtureId,
      row: p.row,
      currentFace: p.face,
      piValue: p.piValue,
      categoryName: p.categoryName || '_未分類',
    };
  }

  // F数減提案
  for (const p of faceReduceTargets) {
    const cat = p.categoryName || '_未分類';
    const median = categoryStats[cat]?.median || 0;
    proposals[`${p.fixtureId}_${p.jan}`] = {
      rule: 'rule2',
      action: 'faceReduce',
      color: 'orange',
      newFace: -1,  // 相対値: 1フェース減
      reason: `低日販（${p.piValue.toFixed(2)}個/日, F=${p.face}）：フェース縮小候補`,
      jan: p.jan,
      name: p.name,
      fixtureId: p.fixtureId,
      row: p.row,
      currentFace: p.face,
      piValue: p.piValue,
      categoryName: cat,
    };
  }

  // 6. F数増提案（カット数と同数、高PI品から）
  const cutCount = zeroSales.length;
  if (cutCount > 0) {
    const faceIncCandidates = nonZero
      .filter(p => {
        const key = `${p.fixtureId}_${p.jan}`;
        return !proposals[key];  // F数減対象でない
      })
      .sort((a, b) => b.piValue - a.piValue)
      .slice(0, cutCount);

    for (const p of faceIncCandidates) {
      const cat = p.categoryName || '_未分類';
      proposals[`${p.fixtureId}_${p.jan}`] = {
        rule: 'faceUp',
        action: 'faceIncrease',
        color: 'blue',
        newFace: 1,  // 相対値: +1
        reason: `高日販（${p.piValue.toFixed(2)}個/日）：カット空きスペース活用`,
        jan: p.jan,
        name: p.name,
        fixtureId: p.fixtureId,
        row: p.row,
        currentFace: p.face,
        piValue: p.piValue,
        categoryName: cat,
      };
    }
  }

  return {
    proposals,
    categoryStats,
    summary: buildSummary(proposals, totalCount),
    params: { TARGET_RATIO, periodDays },
  };
}

function calcMedian(sortedArr) {
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 === 0
    ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
    : sortedArr[mid];
}

function buildSummary(proposals, totalCount) {
  const entries = Object.values(proposals);
  const cut = entries.filter(p => p.action === 'cut').length;
  const faceReduce = entries.filter(p => p.action === 'faceReduce').length;
  const faceIncrease = entries.filter(p => p.action === 'faceIncrease').length;
  return {
    total: entries.length,
    cut,
    faceReduce,
    faceIncrease,
    targetRatio: ((cut + faceReduce) / totalCount * 100).toFixed(1) + '%',
    totalProducts: totalCount,
  };
}

// ============================================================
// 候補品CSV・マッチング（v4.0 - 変更なし）
// ============================================================

export function parseCandidateCSV(buffer) {
  let text;
  const bomCheck = new Uint8Array(buffer.slice(0, 3));
  if (bomCheck[0] === 0xEF && bomCheck[1] === 0xBB && bomCheck[2] === 0xBF) {
    text = new TextDecoder('utf-8').decode(buffer);
  } else {
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { text = new TextDecoder('shift_jis').decode(buffer); }
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const candidates = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 7) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = values[idx]?.trim() || ''; });
    candidates.push({
      jan: row['候補品JAN'] || row['JAN'] || '',
      name: row['候補品名'] || row['商品名'] || '',
      maker: row['メーカー名'] || row['メーカー'] || '',
      price: parseFloat(row['売価']) || 0,
      cost: parseFloat(row['原価']) || 0,
      category: row['対象カテゴリー'] || row['カテゴリー'] || '',
      reason: row['推奨理由'] || '',
      priority: row['優先度'] || '中',
      width_mm: parseFloat(row['幅mm'] || row['幅']) || 90,
      height_mm: parseFloat(row['高さmm'] || row['高さ']) || 200,
      depth_mm: parseFloat(row['奥行mm'] || row['奥行']) || 100,
      grossMargin: 0,
    });
  }
  candidates.forEach(c => { if (c.price > 0 && c.cost > 0) c.grossMargin = (c.price - c.cost) / c.price; });
  return candidates;
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export function matchCandidates(candidates, proposals, fixtures) {
  if (!candidates || candidates.length === 0) return proposals;
  const candidatesByCategory = {};
  for (const c of candidates) {
    if (!candidatesByCategory[c.category]) candidatesByCategory[c.category] = [];
    candidatesByCategory[c.category].push(c);
  }
  for (const [key, proposal] of Object.entries(proposals)) {
    if (proposal.action !== 'cut' && proposal.action !== 'faceReduce') continue;
    const catCandidates = candidatesByCategory[proposal.categoryName] || [];
    if (catCandidates.length === 0) continue;
    const cutProduct = fixtures[proposal.fixtureId]?.products?.find(p => p.jan === proposal.jan);
    const cutWidth = cutProduct ? (cutProduct.width_mm || 90) * (cutProduct.face || 1) : 90;
    const scored = catCandidates.map(c => {
      let score = ({ '高': 30, '中': 20, '低': 10 })[c.priority] || 10;
      const cw = c.width_mm || 90;
      score += cw <= cutWidth ? Math.round(30 * cw / cutWidth) : Math.max(0, 30 - (cw - cutWidth) / 10);
      score += Math.min(20, Math.round(20 * (c.grossMargin / 0.33)));
      return { ...c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    proposal.candidates = scored.slice(0, 3);
  }
  return proposals;
}
