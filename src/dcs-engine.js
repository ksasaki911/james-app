/**
 * DCS カット判定エンジン v4.0
 *
 * 4ルールを順次評価し、該当商品にアクションを付与する
 * Rule 1: ゼロ販売判定（最優先・即時カット）
 * Rule 2: 低PI値判定（カテゴリー内下位10%パーセンタイル）
 * Rule 3: 廃棄リスク判定（15%超）
 * Rule 4: 類似品統合判定（PI値がカテゴリー中央値の10%未満）
 */

// パラメータ
const PARAMS = {
  zero_sales_weeks: 4,
  low_pi_percentile: 0.10,
  low_pi_threshold_ds: 0.3,    // カテゴリー小規模時のフォールバック閾値
  waste_risk_threshold: 0.15,
  similar_item_pi_ratio: 0.10,
  min_category_size: 5,        // パーセンタイル計算の最小カテゴリーサイズ
};

/**
 * 全ゴンドラの全商品を評価し、DCS提案を生成
 * @param {Object} fixtures - { fixtureId: { products: [...], ... } }
 * @param {number} periodDays - 集計期間日数
 * @returns {Object} proposals - { jan: { rule, action, color, newFace, reason, ... } }
 */
export function evaluateAllProducts(fixtures, periodDays = 49) {
  // 1. 全商品を収集してカテゴリー別に分類
  const allProducts = [];
  const categoryMap = {};  // categoryName -> [product, ...]

  for (const [fixtureId, fixture] of Object.entries(fixtures)) {
    const products = fixture.products || [];
    for (const p of products) {
      const enriched = {
        ...p,
        fixtureId,
        // PI値の代用: dailyAvgQty（来客1000人あたりの販売数の代用指標）
        piValue: p.dailyAvgQty || 0,
        // 廃棄リスク推定: 日配品はフェース数に対して日販が少ないほどリスク高
        wasteRisk: estimateWasteRisk(p),
      };
      allProducts.push(enriched);

      const cat = p.categoryName || '_未分類';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(enriched);
    }
  }

  // 2. カテゴリー別統計を計算
  const categoryStats = {};
  for (const [cat, products] of Object.entries(categoryMap)) {
    const piValues = products.filter(p => p.piValue > 0).map(p => p.piValue).sort((a, b) => a - b);
    categoryStats[cat] = {
      count: products.length,
      piCount: piValues.length,
      piValues,
      median: piValues.length > 0 ? calcMedian(piValues) : 0,
      p10: piValues.length >= PARAMS.min_category_size
        ? calcPercentile(piValues, PARAMS.low_pi_percentile)
        : null,
    };
  }

  // 3. 各商品に対してルール評価
  const proposals = {};
  const faceIncCandidates = [];  // フェース増候補（高PI品）

  for (const p of allProducts) {
    const cat = p.categoryName || '_未分類';
    const stats = categoryStats[cat];
    const result = evaluateProduct(p, stats);

    if (result) {
      proposals[`${p.fixtureId}_${p.jan}`] = {
        ...result,
        jan: p.jan,
        name: p.name,
        fixtureId: p.fixtureId,
        row: p.row,
        currentFace: p.face,
        piValue: p.piValue,
        categoryName: cat,
      };
    }

    // 高PI品（カテゴリー上位）はフェース増候補
    if (p.piValue > 0 && stats.median > 0 && p.piValue > stats.median * 2) {
      faceIncCandidates.push(p);
    }
  }

  // 4. フェース増提案（カット空きスペース活用）
  const cutCount = Object.values(proposals).filter(p => p.action === 'cut').length;
  if (cutCount > 0) {
    // 高PI品の上位からフェース増提案
    faceIncCandidates
      .sort((a, b) => b.piValue - a.piValue)
      .slice(0, Math.min(cutCount, faceIncCandidates.length))
      .forEach(p => {
        const key = `${p.fixtureId}_${p.jan}`;
        if (!proposals[key]) {
          proposals[key] = {
            rule: 'faceUp',
            action: 'faceIncrease',
            color: 'blue',
            newFace: 1,  // 相対値 +1
            reason: `高PI値（${p.piValue.toFixed(2)}）：カット空きスペース活用`,
            jan: p.jan,
            name: p.name,
            fixtureId: p.fixtureId,
            row: p.row,
            currentFace: p.face,
            piValue: p.piValue,
            categoryName: p.categoryName || '_未分類',
          };
        }
      });
  }

  return {
    proposals,
    categoryStats,
    summary: buildSummary(proposals),
    params: { ...PARAMS },
  };
}

/**
 * 単一商品のルール評価（優先度順）
 */
function evaluateProduct(product, categoryStats) {
  // Rule 1: ゼロ販売判定（最優先）
  if (product.salesQty === 0 || product.piValue === 0) {
    return {
      rule: 'rule1',
      action: 'cut',
      color: 'red',
      newFace: null,  // 撤去
      reason: '直近ゼロ販売：即時カット対象',
    };
  }

  // Rule 2: 低PI値判定（カテゴリー内下位10%パーセンタイル）
  if (categoryStats.piCount >= PARAMS.min_category_size) {
    // パーセンタイル方式
    if (product.piValue <= categoryStats.p10) {
      return {
        rule: 'rule2',
        action: 'faceReduce',
        color: 'orange',
        newFace: -1,  // 相対値
        reason: `カテゴリー内下位10%（PI=${product.piValue.toFixed(2)}, 閾値=${categoryStats.p10.toFixed(2)}）`,
      };
    }
  } else {
    // フォールバック: 絶対値閾値
    if (product.piValue < PARAMS.low_pi_threshold_ds) {
      return {
        rule: 'rule2',
        action: 'faceReduce',
        color: 'orange',
        newFace: -1,
        reason: `低PI値（PI=${product.piValue.toFixed(2)} < 閾値${PARAMS.low_pi_threshold_ds}、小規模カテゴリー）`,
      };
    }
  }

  // Rule 3: 廃棄リスク判定
  if (product.wasteRisk > PARAMS.waste_risk_threshold) {
    return {
      rule: 'rule3',
      action: 'faceReduce',
      color: 'orange',
      newFace: -1,
      reason: `廃棄リスク${(product.wasteRisk * 100).toFixed(1)}%（閾値15%超）`,
    };
  }

  // Rule 4: 類似品統合判定（中央値ベース）
  if (categoryStats.median > 0 && product.piValue < categoryStats.median * PARAMS.similar_item_pi_ratio) {
    return {
      rule: 'rule4',
      action: 'faceReduce',
      color: 'orange',
      newFace: -1,
      reason: `統合候補（PI=${product.piValue.toFixed(2)}、中央値${categoryStats.median.toFixed(2)}の10%未満）`,
    };
  }

  return null;  // 該当なし
}

/**
 * 廃棄リスクの推定
 * 日配品のフェース数に対する日販数の余剰分をリスクとみなす
 * waste_risk ≈ max(0, (face - dailyAvgQty) / face)
 */
function estimateWasteRisk(product) {
  const face = product.face || 1;
  const daily = product.dailyAvgQty || 0;
  if (daily <= 0) return 1.0;  // 販売ゼロは最大リスク
  // フェース数よりも日販が少ない場合、余剰分がリスク
  const risk = Math.max(0, (face - daily) / face);
  return risk;
}

/**
 * 中央値の計算
 */
function calcMedian(sortedArr) {
  const mid = Math.floor(sortedArr.length / 2);
  if (sortedArr.length % 2 === 0) {
    return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
  }
  return sortedArr[mid];
}

/**
 * パーセンタイルの計算
 */
function calcPercentile(sortedArr, percentile) {
  const index = Math.ceil(sortedArr.length * percentile) - 1;
  return sortedArr[Math.max(0, index)];
}

/**
 * サマリー生成
 */
function buildSummary(proposals) {
  const entries = Object.values(proposals);
  return {
    total: entries.length,
    cut: entries.filter(p => p.action === 'cut').length,
    faceReduce: entries.filter(p => p.action === 'faceReduce').length,
    faceIncrease: entries.filter(p => p.action === 'faceIncrease').length,
    byRule: {
      rule1: entries.filter(p => p.rule === 'rule1').length,
      rule2: entries.filter(p => p.rule === 'rule2').length,
      rule3: entries.filter(p => p.rule === 'rule3').length,
      rule4: entries.filter(p => p.rule === 'rule4').length,
      faceUp: entries.filter(p => p.rule === 'faceUp').length,
    },
  };
}

/**
 * 候補品CSVのパース（v4.0）
 * Shift-JIS / UTF-8 / CP932 自動検出
 */
export function parseCandidateCSV(buffer) {
  // エンコーディング自動検出
  let text;
  const bomCheck = new Uint8Array(buffer.slice(0, 3));
  if (bomCheck[0] === 0xEF && bomCheck[1] === 0xBB && bomCheck[2] === 0xBF) {
    text = new TextDecoder('utf-8').decode(buffer);
  } else {
    // UTF-8で試行、失敗したらShift-JIS
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder('shift_jis').decode(buffer);
    }
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const candidates = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 7) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || '';
    });

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
      grossMargin: 0,  // 後で計算
    });
  }

  // 荒利率計算
  candidates.forEach(c => {
    if (c.price > 0 && c.cost > 0) {
      c.grossMargin = (c.price - c.cost) / c.price;
    }
  });

  return candidates;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuote = false;
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

/**
 * 候補品マッチング＆スコアリング（v4.0）
 * @param {Array} candidates - parseCandidateCSVの結果
 * @param {Object} proposals - evaluateAllProductsの結果.proposals
 * @param {Object} fixtures - ゴンドラデータ
 * @returns {Object} enrichedProposals - candidatesが付与されたproposals
 */
export function matchCandidates(candidates, proposals, fixtures) {
  if (!candidates || candidates.length === 0) return proposals;

  // カテゴリー別に候補品をグループ化
  const candidatesByCategory = {};
  for (const c of candidates) {
    const cat = c.category;
    if (!candidatesByCategory[cat]) candidatesByCategory[cat] = [];
    candidatesByCategory[cat].push(c);
  }

  // 各カット/フェース減提案に候補品をマッチング
  for (const [key, proposal] of Object.entries(proposals)) {
    if (proposal.action !== 'cut' && proposal.action !== 'faceReduce') continue;

    const catCandidates = candidatesByCategory[proposal.categoryName] || [];
    if (catCandidates.length === 0) continue;

    // カット品のスペース幅
    const cutProduct = findProduct(fixtures, proposal.fixtureId, proposal.jan);
    const cutWidth = cutProduct ? (cutProduct.width_mm || 90) * (cutProduct.face || 1) : 90;

    // スコアリング
    const scored = catCandidates.map(c => ({
      ...c,
      score: calcMatchScore(c, cutWidth),
    }));

    // 上位3候補
    scored.sort((a, b) => b.score - a.score);
    proposal.candidates = scored.slice(0, 3);
  }

  return proposals;
}

/**
 * マッチングスコア計算
 * バイヤー優先度: max 30点
 * スペース適合性: max 30点
 * 荒利率: max 20点
 */
function calcMatchScore(candidate, cutSpaceWidth) {
  let score = 0;

  // バイヤー優先度 (max 30)
  const priorityScores = { '高': 30, '中': 20, '低': 10 };
  score += priorityScores[candidate.priority] || 10;

  // スペース適合性 (max 30)
  const candidateWidth = candidate.width_mm || 90;
  if (candidateWidth <= cutSpaceWidth) {
    // フィットするほど高得点
    const fitRatio = candidateWidth / cutSpaceWidth;
    score += Math.round(30 * fitRatio);
  } else {
    // はみ出す場合は低得点
    score += Math.max(0, 30 - (candidateWidth - cutSpaceWidth) / 10);
  }

  // 荒利率 (max 20, 33%で満点)
  score += Math.min(20, Math.round(20 * (candidate.grossMargin / 0.33)));

  return score;
}

function findProduct(fixtures, fixtureId, jan) {
  const fixture = fixtures[fixtureId];
  if (!fixture) return null;
  return fixture.products?.find(p => p.jan === jan) || null;
}
