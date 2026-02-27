import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// DATA
// ============================================================
const CATEGORIES = [
  { id: "011", name: "ヘアケア", group: "家庭用品" },
  { id: "012", name: "衣料洗剤・文具", group: "家庭用品" },
  { id: "013", name: "オーラルケア", group: "家庭用品" },
  { id: "014", name: "スキンケア・虫よけ", group: "家庭用品" },
  { id: "111", name: "牛乳飲料・コーヒー飲料", group: "飲料・デザート" },
  { id: "112", name: "ビール・発泡酒", group: "飲料・デザート" },
  { id: "113", name: "洋酒・日本酒", group: "飲料・デザート" },
  { id: "114", name: "乳製品・デザート", group: "飲料・デザート" },
  { id: "211", name: "スナック菓子", group: "菓子" },
  { id: "212", name: "チョコレート", group: "菓子" },
  { id: "213", name: "ビスケット・クッキー", group: "菓子" },
];

// Product data with auto-replenishment parameters
// width_mm: 商品1個分の幅（mm）- 棚POWER等から取得想定
// 棚全体の物理幅: shelfWidthMm で定義
// costRate: 原価率(%) - 粗利率 = 100 - costRate
const SHELF_DATA_111 = {
  fixture: "A-01",
  category: "111",
  categoryName: "牛乳飲料・コーヒー飲料",
  rows: 4,
  shelfWidthMm: 900, // 1段あたりの棚幅(mm) - ゴンドラ標準 900mm
  // 各段の棚高さ(mm) - ゴンドラの段ごと有効高さ
  rowHeights: { 1: 280, 2: 300, 3: 280, 4: 320 },
  // ※ width_mm / height_mm / depth: 商品1個分の実寸（棚POWER/ストアマネジャーから取得想定）
  // CAP = face × depth × maxStack（maxStack = floor(棚高さ / 商品高さ)）
  products: [
    // row 1 (top) - 牛乳ゾーン  ※1L紙パック: 幅75mm×高さ255mm  棚高280mm→積段1
    // 75×4 + 75×3 + 75×2 + 75×2 + 75×1 = 900mm ✓
    { row: 1, jan: "4902720109116", name: "明治おいしい牛乳 900ml", maker: "明治", price: 268, costRate: 72, rank: "A", face: 4, width_mm: 75, height_mm: 230, depth: 4, cap: 16, baseStock: 20, currentStock: 8, orderPoint: 6, orderQty: 0, inventoryDays: 2.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [12,15,13,10,14,11,13], color: "#E8F5E9" },
    { row: 1, jan: "4902705011625", name: "森永おいしい牛乳 1L", maker: "森永乳業", price: 248, costRate: 73, rank: "A", face: 3, width_mm: 75, height_mm: 255, depth: 3, cap: 9, baseStock: 12, currentStock: 5, orderPoint: 4, orderQty: 0, inventoryDays: 1.5, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: "チラシ", salesWeek: [10,12,11,9,13,10,11], color: "#E3F2FD" },
    { row: 1, jan: "4902220113514", name: "よつ葉特選牛乳 1L", maker: "よつ葉乳業", price: 298, costRate: 68, rank: "B", face: 2, width_mm: 75, height_mm: 255, depth: 3, cap: 6, baseStock: 8, currentStock: 4, orderPoint: 3, orderQty: 0, inventoryDays: 2.0, leadTime: 2, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [5,6,4,5,7,5,6], color: "#FFF3E0" },
    { row: 1, jan: "4908011401136", name: "タカナシ低温殺菌牛乳", maker: "タカナシ乳業", price: 328, costRate: 65, rank: "C", face: 2, width_mm: 75, height_mm: 255, depth: 3, cap: 6, baseStock: 6, currentStock: 3, orderPoint: 2, orderQty: 0, inventoryDays: 2.5, leadTime: 2, minOrderUnit: 1, stockCorrection: 0, tag: "新商品", salesWeek: [3,4,5,4,6,5,4], color: "#F3E5F5" },
    { row: 1, jan: "4902720109123", name: "明治おいしい低脂肪乳", maker: "明治", price: 218, costRate: 74, rank: "C", face: 1, width_mm: 75, height_mm: 255, depth: 3, cap: 3, baseStock: 8, currentStock: 2, orderPoint: 3, orderQty: 0, inventoryDays: 2.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [2,3,2,1,3,2,2], color: "#E8F5E9" },
    // row 2 - コーヒー飲料ゾーン  ※1L紙パック: 高255mm(積1), カップ: 高145mm(積2)  棚高300mm
    // 75×3 + 65×4 + 75×2 + 65×2 + 65×2 = 895mm (空5mm)
    { row: 2, jan: "4901777303515", name: "グリコカフェオーレ 1L", maker: "グリコ", price: 178, costRate: 70, rank: "A", face: 3, width_mm: 75, height_mm: 255, depth: 4, cap: 12, baseStock: 15, currentStock: 7, orderPoint: 5, orderQty: 0, inventoryDays: 1.5, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: "販促", salesWeek: [14,16,13,15,17,14,15], color: "#FCE4EC" },
    { row: 2, jan: "4902705002012", name: "マウントレーニア カフェラッテ", maker: "森永乳業", price: 158, costRate: 62, rank: "A", face: 4, width_mm: 65, height_mm: 145, depth: 5, cap: 40, baseStock: 45, currentStock: 18, orderPoint: 15, orderQty: 0, inventoryDays: 1.2, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [18,20,17,19,22,18,20], color: "#E3F2FD" },
    { row: 2, jan: "4901340032118", name: "ドトール カフェ・オ・レ", maker: "ドトール", price: 148, costRate: 67, rank: "B", face: 2, width_mm: 75, height_mm: 255, depth: 3, cap: 6, baseStock: 10, currentStock: 3, orderPoint: 4, orderQty: 0, inventoryDays: 2.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [7,8,6,8,9,7,8], color: "#EFEBE9" },
    { row: 2, jan: "4902102114516", name: "キリン 午後の紅茶 ミルク", maker: "キリン", price: 168, costRate: 71, rank: "C", face: 2, width_mm: 65, height_mm: 145, depth: 3, cap: 12, baseStock: 12, currentStock: 4, orderPoint: 4, orderQty: 0, inventoryDays: 3.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [3,4,3,4,5,3,4], color: "#E0F7FA" },
    { row: 2, jan: "4902705002029", name: "マウントレーニア エスプレッソ", maker: "森永乳業", price: 158, costRate: 62, rank: "C", face: 2, width_mm: 65, height_mm: 145, depth: 4, cap: 16, baseStock: 16, currentStock: 7, orderPoint: 6, orderQty: 0, inventoryDays: 1.8, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [2,3,2,2,3,2,3], color: "#E3F2FD" },
    // row 3 - ヨーグルト・乳酸菌ゾーン  ※400g: 高95mm(積2), 小型: 高85mm(積3)  棚高280mm
    // 100×3 + 100×3 + 60×3 + 60×2 = 900mm ✓
    { row: 3, jan: "4902720100014", name: "明治ブルガリアヨーグルト", maker: "明治", price: 178, costRate: 66, rank: "A", face: 3, width_mm: 100, height_mm: 95, depth: 5, cap: 30, baseStock: 35, currentStock: 15, orderPoint: 12, orderQty: 0, inventoryDays: 1.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: "チラシ", salesWeek: [22,25,20,23,27,22,24], color: "#E8F5E9" },
    { row: 3, jan: "4902705004115", name: "ビヒダスBB536", maker: "森永乳業", price: 168, costRate: 68, rank: "A", face: 3, width_mm: 100, height_mm: 95, depth: 4, cap: 24, baseStock: 25, currentStock: 10, orderPoint: 10, orderQty: 0, inventoryDays: 1.5, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [12,14,11,13,15,12,13], color: "#E3F2FD" },
    { row: 3, jan: "4903015011116", name: "ヤクルト ソフール", maker: "ヤクルト", price: 98, costRate: 60, rank: "A", face: 3, width_mm: 60, height_mm: 85, depth: 6, cap: 54, baseStock: 55, currentStock: 25, orderPoint: 20, orderQty: 0, inventoryDays: 1.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: "販促", salesWeek: [20,22,18,21,24,20,22], color: "#FFFDE7" },
    { row: 3, jan: "4901340035113", name: "ダノン BIO", maker: "ダノン", price: 188, costRate: 58, rank: "B", face: 2, width_mm: 60, height_mm: 85, depth: 3, cap: 18, baseStock: 18, currentStock: 8, orderPoint: 6, orderQty: 0, inventoryDays: 2.5, leadTime: 2, minOrderUnit: 1, stockCorrection: 0, tag: "新商品", salesWeek: [4,5,6,5,7,5,6], color: "#FFF9C4" },
    // row 4 (bottom) - ジュース・野菜飲料ゾーン  ※1L紙パック: 高255mm(積1), 2LPET: 高310mm(積1)  棚高320mm
    // 75×3 + 75×3 + 75×2 + 75×1 + 75×1 + 105×1 = 855mm (空45mm)
    { row: 4, jan: "4909411003215", name: "カゴメ 野菜生活100", maker: "カゴメ", price: 198, costRate: 69, rank: "A", face: 3, width_mm: 75, height_mm: 255, depth: 4, cap: 12, baseStock: 15, currentStock: 7, orderPoint: 6, orderQty: 0, inventoryDays: 1.5, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: "販促", salesWeek: [13,15,12,14,16,13,14], color: "#C8E6C9" },
    { row: 4, jan: "4902102114615", name: "トロピカーナ オレンジ 1L", maker: "キリン", price: 258, costRate: 64, rank: "B", face: 3, width_mm: 75, height_mm: 255, depth: 3, cap: 9, baseStock: 10, currentStock: 5, orderPoint: 4, orderQty: 0, inventoryDays: 2.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [7,8,6,8,9,7,8], color: "#E0F7FA" },
    { row: 4, jan: "4909411003311", name: "カゴメ トマトジュース", maker: "カゴメ", price: 168, costRate: 70, rank: "B", face: 2, width_mm: 75, height_mm: 255, depth: 3, cap: 6, baseStock: 8, currentStock: 4, orderPoint: 3, orderQty: 0, inventoryDays: 2.5, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [5,6,5,6,7,5,6], color: "#C8E6C9" },
    { row: 4, jan: "4901340036115", name: "伊藤園 1日分の野菜", maker: "伊藤園", price: 178, costRate: 68, rank: "B", face: 1, width_mm: 75, height_mm: 255, depth: 3, cap: 3, baseStock: 10, currentStock: 3, orderPoint: 4, orderQty: 0, inventoryDays: 2.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [6,7,5,7,8,6,7], color: "#DCEDC8" },
    { row: 4, jan: "4514603311211", name: "ポンジュース 1L", maker: "えひめ飲料", price: 298, costRate: 60, rank: "C", face: 1, width_mm: 75, height_mm: 255, depth: 3, cap: 3, baseStock: 6, currentStock: 2, orderPoint: 2, orderQty: 0, inventoryDays: 3.0, leadTime: 2, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [3,4,3,4,5,3,4], color: "#FFF9C4" },
    { row: 4, jan: "4902102114712", name: "キリン 生茶 2L", maker: "キリン", price: 168, costRate: 72, rank: "C", face: 1, width_mm: 105, height_mm: 310, depth: 3, cap: 3, baseStock: 8, currentStock: 5, orderPoint: 3, orderQty: 0, inventoryDays: 3.0, leadTime: 1, minOrderUnit: 1, stockCorrection: 0, tag: null, salesWeek: [4,5,4,5,6,4,5], color: "#E0F7FA" },
  ],
};

// 段ごとの使用幅と空き幅を計算するユーティリティ
const calcRowWidth = (products, rowNum) => {
  const rowProds = products.filter(p => p.row === rowNum);
  return rowProds.reduce((s, p) => s + (p.width_mm || 90) * p.face, 0);
};
const calcRowFreeSpace = (products, rowNum, shelfWidthMm) => {
  return shelfWidthMm - calcRowWidth(products, rowNum);
};
// CAP = フェース × 奥行 × 積段数  （積段数 = floor(棚高さ / 商品高さ)）
const calcMaxStack = (heightMm, shelfRowHeightMm) => {
  if (!heightMm || !shelfRowHeightMm) return 1;
  return Math.max(1, Math.floor(shelfRowHeightMm / heightMm));
};
const calcCap = (face, depth, heightMm, shelfRowHeightMm) => {
  return face * depth * calcMaxStack(heightMm, shelfRowHeightMm);
};

// DCS カット/フェース変更 提案サンプル（AI推薦 → バイヤー承認フロー）
const DCS_PROPOSALS = [
  { jan: "4902720109123", action: "カット", reason: "4週連続 PI値 カテゴリ平均×0.3以下", piValue: 0.8, categoryAvgPi: 5.2, lifecycle: "衰退期", priority: "高" },
  { jan: "4902102114516", action: "カット", reason: "直近13週 売上下降トレンド。ランクC、在庫日数3.0日超過", piValue: 1.2, categoryAvgPi: 5.2, lifecycle: "衰退期", priority: "高" },
  { jan: "4902705002029", action: "フェース減", reason: "売上低下傾向、フェース2→1に縮小推奨", piValue: 1.5, categoryAvgPi: 5.2, lifecycle: "成熟後期", newFace: 1, priority: "中" },
  { jan: "4514603311211", action: "カット", reason: "4週連続販売低迷。同サブカテゴリ上位品に統合推奨", piValue: 1.0, categoryAvgPi: 5.2, lifecycle: "衰退期", priority: "中" },
  { jan: "4902102114712", action: "フェース減", reason: "PI値低迷、棚位置を上段に移動しスペース確保", piValue: 1.3, categoryAvgPi: 5.2, lifecycle: "成熟後期", newFace: 1, priority: "低" },
  // フェース増提案（カットで空いたスペースの活用）
  { jan: "4902720109116", action: "フェース増", reason: "ランクA 売上好調。カットで空く150mmを活用しF4→5に拡大推奨", piValue: 12.5, categoryAvgPi: 5.2, lifecycle: "成長期", newFace: 5, priority: "高" },
  { jan: "4902705002012", action: "フェース増", reason: "カテゴリ内PI値トップ。カット商品のスペースを吸収しF4→5推奨", piValue: 15.8, categoryAvgPi: 5.2, lifecycle: "成長期", newFace: 5, priority: "中" },
];

// Candidate products for product swap (棚替え)
const CANDIDATE_PRODUCTS = [
  { jan: "4902705090118", name: "ピルクル400 65ml×8", maker: "日清ヨーク", price: 198, rank: "B", color: "#FFF3E0" },
  { jan: "4902705090211", name: "十勝のむヨーグルト", maker: "よつ葉乳業", price: 168, rank: "B", color: "#FFF3E0" },
  { jan: "4902705090312", name: "雪印メグミルク牛乳 1L", maker: "雪印メグミルク", price: 228, rank: "A", color: "#E3F2FD" },
  { jan: "4902705090514", name: "恵 megumi ガセリ菌SP", maker: "雪印メグミルク", price: 138, rank: "A", color: "#E8F5E9" },
  { jan: "4902705090615", name: "R-1 ドリンクタイプ", maker: "明治", price: 138, rank: "A", color: "#E8F5E9" },
  { jan: "4902705090716", name: "LG21 プロビオ", maker: "明治", price: 148, rank: "A", color: "#E8F5E9" },
  { jan: "4902705090817", name: "パルテノ 濃密ギリシャ", maker: "森永乳業", price: 178, rank: "B", color: "#E3F2FD" },
];

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const SHELF_WIDTH_MM = SHELF_DATA_111.shelfWidthMm || 900; // デフォルト棚幅

// ============================================================
// COMPONENTS
// ============================================================

const TagBadge = ({ tag }) => {
  if (!tag) return null;
  const colors = {
    "チラシ": { bg: "#EF4444", text: "#FFF" },
    "販促": { bg: "#F59E0B", text: "#FFF" },
    "新商品": { bg: "#8B5CF6", text: "#FFF" },
    "カット": { bg: "#1B2A4A", text: "#FFF" },
  };
  const c = colors[tag] || { bg: "#6B7280", text: "#FFF" };
  return (
    <span style={{
      position: "absolute", top: 2, right: 2, fontSize: 9, fontWeight: 700,
      background: c.bg, color: c.text, padding: "1px 5px", borderRadius: 3,
      lineHeight: "14px", letterSpacing: 0.5
    }}>{tag}</span>
  );
};

const RankBadge = ({ rank }) => {
  const colors = { A: "#0891B2", B: "#F59E0B", C: "#94A3B8" };
  return (
    <span style={{
      position: "absolute", top: 2, left: 2, fontSize: 10, fontWeight: 800,
      background: colors[rank] || "#94A3B8", color: "#FFF",
      width: 18, height: 18, borderRadius: 9, display: "inline-flex",
      alignItems: "center", justifyContent: "center", lineHeight: 1
    }}>{rank}</span>
  );
};

const StockBar = ({ current, base, orderPoint }) => {
  const pct = Math.min(100, (current / base) * 100);
  const opPct = (orderPoint / base) * 100;
  const isLow = current <= orderPoint;
  return (
    <div style={{ position: "relative", height: 4, background: "#E2E8F0", borderRadius: 2, marginTop: 3 }}>
      <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: isLow ? "#EF4444" : "#10B981", transition: "width 0.3s" }} />
      <div style={{ position: "absolute", top: -2, left: `${opPct}%`, width: 1, height: 8, background: "#F59E0B" }} />
    </div>
  );
};

const SalesChart = ({ data, labels }) => {
  if (!data) return null;
  const max = Math.max(...data) * 1.2;
  const barW = 28;
  const h = 120;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, padding: "8px 0" }}>
      {data.map((v, i) => (
        <div key={i} style={{ textAlign: "center", width: barW }}>
          <div style={{ fontSize: 9, color: "#64748B", marginBottom: 2 }}>{v}</div>
          <div style={{ height: (v / max) * h, background: i === data.length - 1 ? "#0891B2" : "#BAE6FD", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
          <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2 }}>{labels?.[i] || ""}</div>
        </div>
      ))}
    </div>
  );
};

const EditableNum = ({ value, onChange, min = 0, max = 999, step = 1, width = 50, label, unit = "", highlight = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    {label && <span style={{ fontSize: 10, color: "#64748B", minWidth: 60 }}>{label}</span>}
    <input type="number" value={value} min={min} max={max} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width, textAlign: "center", border: highlight ? "2px solid #F59E0B" : "1px solid #CBD5E1",
        borderRadius: 4, padding: "3px 2px", fontSize: 12, fontWeight: 600,
        background: highlight ? "#FFFBEB" : "#FFF", color: "#1B2A4A"
      }} />
    {unit && <span style={{ fontSize: 10, color: "#94A3B8" }}>{unit}</span>}
  </div>
);

// ============================================================
// DCS PROPOSAL PANEL（AI推薦→バイヤー承認）
// ============================================================
const DcsProposalPanel = ({ proposals, products, onApprove, onReject }) => {
  const getProduct = (jan) => products.find(p => p.jan === jan);
  const actionColors = { "カット": "#D63031", "フェース減": "#E17055", "フェース増": "#2563EB" };

  return (
    <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ background: "#0B1D3A", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>DCS カット/変更提案</span>
        <span style={{ fontSize: 10, color: "#94A3B8" }}>AI推薦 → バイヤー承認</span>
      </div>
      {proposals.map((prop, i) => {
        const p = getProduct(prop.jan);
        if (!p) return null;
        return (
          <div key={i} style={{ padding: "10px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 6, height: 40, borderRadius: 3, flexShrink: 0,
              background: prop.priority === "高" ? "#D63031" : prop.priority === "中" ? "#E17055" : "#94A3B8"
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 4,
                  background: actionColors[prop.action] || "#94A3B8", color: "#FFF"
                }}>{prop.action}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </div>
              <div style={{ fontSize: 9, color: "#64748B" }}>{prop.reason}</div>
              <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 1 }}>
                PI値: {prop.piValue} (カテゴリ平均: {prop.categoryAvgPi}) | LC: {prop.lifecycle} | {p.row}段 F:{p.face} ({(p.width_mm||90)*p.face}mm)
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => onApprove(prop)} style={{
                padding: "5px 10px", fontSize: 10, fontWeight: 700, border: "none", borderRadius: 4,
                background: "#00B894", color: "#FFF", cursor: "pointer"
              }}>承認</button>
              <button onClick={() => onReject(prop)} style={{
                padding: "5px 10px", fontSize: 10, fontWeight: 700, border: "1px solid #CBD5E1", borderRadius: 4,
                background: "#FFF", color: "#64748B", cursor: "pointer"
              }}>却下</button>
            </div>
          </div>
        );
      })}
      {proposals.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>保留中の提案はありません</div>
      )}
    </div>
  );
};

// ============================================================
// PRODUCT SWAP DIALOG
// ============================================================
const ProductSwapDialog = ({ currentProduct, candidates, onSwap, onClose }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = candidates.filter(c =>
    c.name.includes(search) || c.jan.includes(search) || c.maker.includes(search)
  );
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#FFF", borderRadius: 12, width: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1B2A4A" }}>商品入替（棚替え）</div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8" }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
            現在: <strong>{currentProduct.name}</strong>（{currentProduct.row}段 F:{currentProduct.face} {(currentProduct.width_mm||90)*currentProduct.face}mm）
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="商品名・JAN・メーカーで検索..."
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13 }} />
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 20px" }}>
          {filtered.map(c => (
            <button key={c.jan} onClick={() => setSelected(c)} style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
              padding: "10px 12px", background: selected?.jan === c.jan ? "#DBEAFE" : "#FFF",
              border: selected?.jan === c.jan ? "2px solid #0891B2" : "1px solid #E2E8F0",
              borderRadius: 8, marginBottom: 6, cursor: "pointer"
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: c.color || "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: c.rank === "A" ? "#0891B2" : c.rank === "B" ? "#F59E0B" : "#94A3B8" }}>{c.rank}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>{c.maker}　¥{c.price}　JAN: {c.jan}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#64748B" }}>キャンセル</button>
          <button onClick={() => selected && onSwap(selected)} disabled={!selected} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: selected ? "#0891B2" : "#CBD5E1", color: "#FFF", fontSize: 13, cursor: selected ? "pointer" : "default", fontWeight: 700 }}>入替実行</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SCREENS
// ============================================================

const PortalScreen = ({ onNavigate, userName, dcsProcessed, dcsTaskDone }) => {
  const cutCount = DCS_PROPOSALS.filter(d => d.action === "カット").length;
  const faceChangeCount = DCS_PROPOSALS.filter(d => d.action === "フェース減" || d.action === "フェース増").length;
  const totalDcs = DCS_PROPOSALS.length;
  const proc = dcsProcessed || { cut: 0, face: 0, total: 0 };
  const done = dcsTaskDone || {};
  const cutRemaining = cutCount - proc.cut;
  const faceRemaining = faceChangeCount - proc.face;
  const allProcessed = cutRemaining <= 0 && faceRemaining <= 0;
  const allDone = done["カット指示"] && done["フェーシング変更"];

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", minHeight: "100vh", background: "#0F172A" }}>
      {/* トップバー - JAMES ブランド */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", borderRadius: 16, padding: "18px 22px", marginBottom: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
              {"JAMES".split("").map((c, i) => (
                <span key={i} style={{
                  fontSize: 28, fontWeight: 900, lineHeight: 1,
                  color: ["#0891B2", "#06B6D4", "#22D3EE", "#67E8F9", "#A5F3FC"][i]
                }}>{c}</span>
              ))}
            </div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.5 }}>J-MARUEI AI MERCHANDISING ENHANCEMENT SYSTEM</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#FFF", fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>
              {new Date().toLocaleDateString("ja-JP")} {new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>

      {/* DCS指示サマリーバー */}
      {totalDcs > 0 && (
        <div style={{ background: allDone ? "rgba(5,150,105,0.08)" : "rgba(30,41,59,0.7)", border: `1px solid ${allDone ? "rgba(52,211,153,0.3)" : "#334155"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>
              {allDone ? "DCS指示（全作業完了）" : allProcessed ? "DCS指示（処理済・確認待ち）" : "DCS指示（未処理あり）"}
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>
              合計 {totalDcs}件
              {proc.total > 0 && <span style={{ color: "#34D399", fontWeight: 600 }}> / 処理済{proc.total}件</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {cutCount > 0 && (
              <div onClick={() => onNavigate("category-select-dcs")} style={{ flex: 1, background: cutRemaining <= 0 ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)", border: `1px solid ${cutRemaining <= 0 ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: "10px 10px", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: cutRemaining <= 0 ? "#34D399" : "#F87171" }}>{cutCount}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: cutRemaining <= 0 ? "#34D399" : "#F87171" }}>カット指示</div>
                {cutRemaining > 0
                  ? <div style={{ fontSize: 9, color: "#F87171", marginTop: 2 }}>残{cutRemaining}件 要対応</div>
                  : done["カット指示"]
                    ? <div style={{ fontSize: 9, color: "#34D399", marginTop: 2, fontWeight: 700 }}>作業完了</div>
                    : <div style={{ fontSize: 9, color: "#34D399", marginTop: 2 }}>処理済</div>
                }
              </div>
            )}
            {faceChangeCount > 0 && (
              <div onClick={() => onNavigate("category-select-dcs")} style={{ flex: 1, background: faceRemaining <= 0 ? "rgba(8,145,178,0.1)" : "rgba(251,191,36,0.08)", border: `1px solid ${faceRemaining <= 0 ? "rgba(8,145,178,0.3)" : "rgba(251,191,36,0.25)"}`, borderRadius: 10, padding: "10px 10px", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: faceRemaining <= 0 ? "#0891B2" : "#FBBF24" }}>{faceChangeCount}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: faceRemaining <= 0 ? "#06B6D4" : "#FBBF24" }}>フェーシング変更</div>
                {faceRemaining > 0
                  ? <div style={{ fontSize: 9, color: "#FBBF24", marginTop: 2 }}>残{faceRemaining}件 要対応</div>
                  : done["フェーシング変更"]
                    ? <div style={{ fontSize: 9, color: "#0891B2", marginTop: 2, fontWeight: 700 }}>作業完了</div>
                    : <div style={{ fontSize: 9, color: "#0891B2", marginTop: 2 }}>処理済</div>
                }
              </div>
            )}
            <div onClick={() => onNavigate("category-select-dcs")} style={{ flex: 1, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: "10px 10px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#A78BFA" }}>0</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#A78BFA" }}>商品入替</div>
              <div style={{ fontSize: 9, color: "#64748B", marginTop: 2 }}>なし</div>
            </div>
          </div>
          {allDone ? (
            <div style={{ marginTop: 10, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34D399", borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
              全作業完了
            </div>
          ) : (
            <button onClick={() => onNavigate("category-select-dcs")} style={{ width: "100%", marginTop: 10, background: "linear-gradient(135deg, #0891B2, #06B6D4)", color: "#FFF", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 12px rgba(8,145,178,0.3)" }}>
              {allProcessed ? "確認済にする →" : "DCS提案を確認・処理する →"}
            </button>
          )}
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 12, paddingLeft: 4, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 18, background: "#0891B2", borderRadius: 2 }} />
        MDメニュー
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "通常発注", icon: "📦", desc: "棚割ベースの通常発注", action: () => onNavigate("category-select"), color: "#0284C7" },
          { label: "特売発注", icon: "🏷️", desc: "特売・チラシ商品の発注", action: null, color: "#7C3AED" },
          { label: "棚割管理", icon: "📐", desc: "棚割の確認・修正", action: () => onNavigate("category-select"), color: "#059669" },
          { label: "DCS提案", icon: "🤖", desc: `AI提案の承認${allDone ? "（完了）" : proc.total > 0 ? ` (残${totalDcs - proc.total}件)` : ` (${totalDcs}件)`}`, action: () => onNavigate("category-select-dcs"), badge: allDone ? 0 : totalDcs - proc.total, color: "#DC2626" },
          { label: "商品台帳", icon: "📋", desc: "商品マスタ参照", action: null, color: "#64748B" },
          { label: "企画販促", icon: "📢", desc: "販促企画の確認", action: null, color: "#D97706" },
          { label: "販売支援", icon: "💬", desc: "接客・販売サポート", action: null, color: "#64748B" },
          { label: "終了", icon: "🚪", desc: "", action: null, color: "#64748B" },
        ].map((item, i) => (
          <button key={i} onClick={item.action} disabled={!item.action} style={{
            background: item.action ? "rgba(30,41,59,0.7)" : "rgba(30,41,59,0.3)",
            border: item.action ? `1px solid #334155` : "1px solid rgba(51,65,85,0.3)",
            borderRadius: 14, padding: "16px 14px", cursor: item.action ? "pointer" : "default",
            textAlign: "left", opacity: item.action ? 1 : 0.35, position: "relative",
            transition: "all 0.2s", borderLeft: item.action ? `4px solid ${item.color}` : "4px solid transparent"
          }}>
            {item.badge > 0 && (
              <div style={{ position: "absolute", top: 8, right: 8, background: "#DC2626", color: "#FFF", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 800, minWidth: 20, textAlign: "center", boxShadow: "0 2px 8px rgba(220,38,38,0.4)" }}>{item.badge}</div>
            )}
            <div style={{ fontSize: 26, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{item.label}</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 2, lineHeight: "14px" }}>{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// DCS提案をカテゴリ別に集計するユーティリティ
const getDcsSummaryByCategory = () => {
  const summary = {};
  // DCS_PROPOSALSの各提案のJANコードからカテゴリを特定
  // 現在はSHELF_DATA_111のみなのでカテゴリ111に紐づけ
  const allProducts = SHELF_DATA_111.products;
  DCS_PROPOSALS.forEach(prop => {
    const product = allProducts.find(p => p.jan === prop.jan);
    if (product) {
      const catId = SHELF_DATA_111.category;
      if (!summary[catId]) summary[catId] = { cut: 0, faceChange: 0, swap: 0, total: 0, items: [] };
      if (prop.action === "カット") summary[catId].cut++;
      else if (prop.action === "フェース減" || prop.action === "フェース増") summary[catId].faceChange++;
      summary[catId].total++;
      summary[catId].items.push({ ...prop, productName: product.name });
    }
  });
  return summary;
};

const CategorySelectScreen = ({ onSelect, onBack, showDcs }) => {
  const grouped = {};
  CATEGORIES.forEach(c => { if (!grouped[c.group]) grouped[c.group] = []; grouped[c.group].push(c); });
  const dcsSummary = showDcs ? getDcsSummaryByCategory() : {};

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={backBtnStyle}>← TOP</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1B2A4A" }}>
          {showDcs ? "DCS指示 — 売場を選択" : "売場を選択"}
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#0891B2", letterSpacing: 1, marginLeft: "auto" }}>JAMES</span>
      </div>

      {/* DCS モード時：指示サマリー */}
      {showDcs && Object.keys(dcsSummary).length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>未処理のDCS指示があるカテゴリ</div>
          <div style={{ fontSize: 11, color: "#B45309" }}>
            対象カテゴリにバッジが表示されています。タップして確認・処理してください。
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([group, cats]) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0891B2", marginBottom: 6, paddingLeft: 4 }}>{group}</div>
          {cats.map(c => {
            const dcs = dcsSummary[c.id];
            const hasDcs = showDcs && dcs && dcs.total > 0;
            return (
              <button key={c.id} onClick={() => onSelect(c.id)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "12px 14px",
                background: hasDcs ? "#FFF7ED" : "#FFF",
                border: hasDcs ? "2px solid #FB923C" : "1px solid #E2E8F0",
                borderRadius: 8, marginBottom: 6, cursor: "pointer", fontSize: 14, color: "#1B2A4A",
                boxShadow: hasDcs ? "0 2px 8px rgba(251,146,60,0.15)" : "0 1px 2px rgba(0,0,0,0.04)",
                transition: "all 0.15s"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ color: "#94A3B8", marginRight: 8 }}>{c.id}:</span>{c.name}
                  </div>
                  {hasDcs && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                      {dcs.cut > 0 && (
                        <span style={{ background: "#DC2626", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
                          カット {dcs.cut}件
                        </span>
                      )}
                      {dcs.faceChange > 0 && (
                        <span style={{ background: "#D97706", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
                          F変更 {dcs.faceChange}件
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {hasDcs && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {dcs.items.slice(0, 4).map((item, i) => (
                      <span key={i} style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: item.action === "カット" ? "#FEE2E2" : item.action === "フェース増" ? "#DBEAFE" : "#FEF3C7",
                        color: item.action === "カット" ? "#991B1B" : item.action === "フェース増" ? "#1E40AF" : "#92400E"
                      }}>
                        {item.action}: {item.productName.length > 10 ? item.productName.slice(0, 10) + "…" : item.productName}
                      </span>
                    ))}
                    {dcs.items.length > 4 && (
                      <span style={{ fontSize: 9, color: "#94A3B8", padding: "2px 4px" }}>他{dcs.items.length - 4}件</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ============================================================
// SHELF VIEW SCREEN (main)
// ============================================================
const ShelfViewScreen = ({ data, onBack, onHome, showDcs, onDcsProcessedChange, onDcsTaskDoneChange, dcsTaskDone: parentDcsTaskDone }) => {
  const [viewMode, setViewMode] = useState("shelf");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState(data.products);
  const [deletedProducts, setDeletedProducts] = useState([]); // カット済み商品
  const [detailTab, setDetailTab] = useState("order");
  const [orderMemo, setOrderMemo] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showDcsPanel, setShowDcsPanel] = useState(showDcs || false);
  const [dcsProposals, setDcsProposals] = useState(DCS_PROPOSALS);
  const [dragItem, setDragItem] = useState(null);
  const [changeLog, setChangeLog] = useState([]);
  const [taskCompleted, setTaskCompleted] = useState(parentDcsTaskDone || {});

  const addLog = (msg) => setChangeLog(prev => [{ time: new Date().toLocaleTimeString("ja-JP"), msg }, ...prev].slice(0, 50));

  // DCS指示サマリー集計
  const dcsCutCount = DCS_PROPOSALS.filter(d => d.action === "カット").length;
  const dcsFaceChangeCount = DCS_PROPOSALS.filter(d => d.action === "フェース減" || d.action === "フェース増").length;
  const dcsSwapCount = 0; // 商品入替は将来の拡張用
  const dcsCutRemaining = dcsProposals.filter(d => d.action === "カット").length;
  const dcsFaceRemaining = dcsProposals.filter(d => d.action === "フェース減" || d.action === "フェース増").length;

  const markTaskDone = (key) => {
    setTaskCompleted(prev => {
      const next = { ...prev, [key]: true };
      if (onDcsTaskDoneChange) onDcsTaskDoneChange(next);
      return next;
    });
  };

  // --- Order & param handlers ---
  const handleOrderChange = (jan, qty) => {
    setProducts(prev => prev.map(p => p.jan === jan ? { ...p, orderQty: Math.max(0, qty) } : p));
    if (selectedProduct?.jan === jan) setSelectedProduct(prev => ({ ...prev, orderQty: Math.max(0, qty) }));
  };

  // 複数フィールドを一括更新（連続呼び出しでの上書き防止）
  const handleParamChange = (jan, field, value) => {
    setProducts(prev => {
      const updated = prev.map(p => p.jan === jan ? { ...p, [field]: value } : p);
      const prod = updated.find(p => p.jan === jan);
      if (selectedProduct?.jan === jan) setSelectedProduct({ ...prod });
      return updated;
    });
    addLog(`${field}=${value}`);
  };

  const handleParamChangeBatch = (jan, changes) => {
    setProducts(prev => {
      const updated = prev.map(p => p.jan === jan ? { ...p, ...changes } : p);
      const prod = updated.find(p => p.jan === jan);
      if (selectedProduct?.jan === jan) setSelectedProduct({ ...prod });
      return updated;
    });
    addLog(Object.entries(changes).map(([k,v]) => `${k}=${v}`).join(", "));
  };

  // --- Facing change with shelf width constraint ---
  const handleFaceChange = (jan, newFace) => {
    if (newFace <= 0) {
      handleDeleteProduct(jan);
      return;
    }
    const val = Math.min(6, newFace);
    const prod = products.find(p => p.jan === jan);
    if (!prod) return;
    // 棚幅オーバーチェック
    const widthMm = prod.width_mm || 90;
    const currentRowWidth = calcRowWidth(products, prod.row);
    const delta = (val - prod.face) * widthMm;
    const newRowWidth = currentRowWidth + delta;
    const shelfMm = data.shelfWidthMm || 900;
    if (newRowWidth > shelfMm) {
      const overMm = newRowWidth - shelfMm;
      if (!window.confirm(`棚幅を${overMm}mm超過します（${newRowWidth}mm / ${shelfMm}mm）。\nこのまま増やしますか？`)) return;
    }
    const rowH = (data.rowHeights || {})[prod.row] || 300;
    const newCap = calcCap(val, prod.depth || 3, prod.height_mm || 200, rowH);
    handleParamChangeBatch(jan, { face: val, cap: newCap });
  };

  // --- Delete product (カット) ---
  const handleDeleteProduct = (jan) => {
    const prod = products.find(p => p.jan === jan);
    if (!prod) return;
    if (!window.confirm(`「${prod.name}」を棚から削除（カット）しますか？`)) return;
    setProducts(prev => prev.filter(p => p.jan !== jan));
    setDeletedProducts(prev => [...prev, { ...prod, deletedAt: new Date().toLocaleString("ja-JP") }]);
    if (selectedProduct?.jan === jan) setSelectedProduct(null);
    addLog(`${prod.name} を棚からカット`);
  };

  // --- Restore deleted product ---
  const handleRestoreProduct = (jan) => {
    const prod = deletedProducts.find(p => p.jan === jan);
    if (!prod) return;
    const { deletedAt, ...restored } = prod;
    setProducts(prev => [...prev, restored]);
    setDeletedProducts(prev => prev.filter(p => p.jan !== jan));
    addLog(`${prod.name} を棚に復元`);
  };

  // --- DCS proposal approve/reject ---
  const handleDcsApprove = (proposal) => {
    if (proposal.action === "カット") {
      handleDeleteProduct(proposal.jan);
    } else if (proposal.action === "フェース減") {
      const prod = products.find(p => p.jan === proposal.jan);
      if (prod) { const nf = proposal.newFace || 1; const rowH = (data.rowHeights || {})[prod.row] || 300; handleParamChangeBatch(proposal.jan, { face: nf, cap: calcCap(nf, prod.depth || 3, prod.height_mm || 200, rowH) }); }
    } else if (proposal.action === "フェース増") {
      const prod = products.find(p => p.jan === proposal.jan);
      if (prod) { const nf = proposal.newFace || prod.face + 1; const rowH = (data.rowHeights || {})[prod.row] || 300; handleParamChangeBatch(proposal.jan, { face: nf, cap: calcCap(nf, prod.depth || 3, prod.height_mm || 200, rowH) }); }
    }
    setDcsProposals(prev => {
      const next = prev.filter(p => p.jan !== proposal.jan);
      if (onDcsProcessedChange) {
        const cutDone = DCS_PROPOSALS.filter(d => d.action === "カット").length - next.filter(d => d.action === "カット").length;
        const faceDone = DCS_PROPOSALS.filter(d => d.action === "フェース減" || d.action === "フェース増").length - next.filter(d => d.action === "フェース減" || d.action === "フェース増").length;
        onDcsProcessedChange({ cut: cutDone, face: faceDone, total: cutDone + faceDone });
      }
      return next;
    });
    addLog(`DCS提案承認: ${proposal.action} ${proposal.jan}`);
  };

  const handleDcsReject = (proposal) => {
    setDcsProposals(prev => {
      const next = prev.filter(p => p.jan !== proposal.jan);
      if (onDcsProcessedChange) {
        const cutDone = DCS_PROPOSALS.filter(d => d.action === "カット").length - next.filter(d => d.action === "カット").length;
        const faceDone = DCS_PROPOSALS.filter(d => d.action === "フェース減" || d.action === "フェース増").length - next.filter(d => d.action === "フェース減" || d.action === "フェース増").length;
        onDcsProcessedChange({ cut: cutDone, face: faceDone, total: cutDone + faceDone });
      }
      return next;
    });
    addLog(`DCS提案却下: ${proposal.action} ${proposal.jan}`);
  };

  // --- Drag & Drop (配列順序を実際に並び替え) ---
  const handleDragStart = (product) => { if (editMode) setDragItem(product); };
  const handleDrop = (targetRow, targetIdx) => {
    if (!dragItem || !editMode) return;
    setProducts(prev => {
      const arr = [...prev];
      // ドラッグ元を配列から除去
      const dragIdx = arr.findIndex(p => p.jan === dragItem.jan);
      if (dragIdx < 0) return prev;
      const [moved] = arr.splice(dragIdx, 1);
      moved.row = targetRow;
      // ターゲット行の商品一覧を再取得（元を除去後の配列から）
      const rowItems = arr.filter(p => p.row === targetRow);
      if (targetIdx >= rowItems.length) {
        // 行末に追加: 行の最後の商品の後ろに挿入
        const lastInRow = rowItems[rowItems.length - 1];
        const insertAt = lastInRow ? arr.indexOf(lastInRow) + 1 : arr.length;
        arr.splice(insertAt, 0, moved);
      } else {
        // 指定位置に挿入: ターゲット商品の前に挿入
        const targetProduct = rowItems[targetIdx];
        const insertAt = arr.indexOf(targetProduct);
        arr.splice(insertAt, 0, moved);
      }
      return arr;
    });
    addLog(`${dragItem.name} → ${targetRow}段に移動`);
    setDragItem(null);
  };

  // --- Product swap ---
  const handleProductSwap = (newProduct) => {
    if (!selectedProduct) return;
    const oldName = selectedProduct.name;
    setProducts(prev => prev.map(p => {
      if (p.jan === selectedProduct.jan) {
        return { ...p, jan: newProduct.jan, name: newProduct.name, maker: newProduct.maker, price: newProduct.price, rank: newProduct.rank, color: newProduct.color || "#F1F5F9", currentStock: 0, orderQty: 0, salesWeek: [0,0,0,0,0,0,0], stockCorrection: 0 };
      }
      return p;
    }));
    addLog(`${oldName} → ${newProduct.name} に入替え`);
    setSelectedProduct(null);
    setShowSwapDialog(false);
  };

  const totalOrders = products.filter(p => p.orderQty > 0).length;
  const totalQty = products.reduce((s, p) => s + p.orderQty, 0);

  const goNext = () => {
    if (!selectedProduct) return;
    const sorted = [...products].sort((a, b) => a.row - b.row);
    const idx = sorted.findIndex(p => p.jan === selectedProduct.jan);
    if (idx < sorted.length - 1) setSelectedProduct(sorted[idx + 1]);
  };
  const goPrev = () => {
    if (!selectedProduct) return;
    const sorted = [...products].sort((a, b) => a.row - b.row);
    const idx = sorted.findIndex(p => p.jan === selectedProduct.jan);
    if (idx > 0) setSelectedProduct(sorted[idx - 1]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F0F4F8" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap", borderBottom: "2px solid #0284C7" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onHome} style={{ ...pillBtnStyle, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "6px 12px" }}>TOP</button>
          <button onClick={onBack} style={{ ...pillBtnStyle, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "6px 12px" }}>← 売場</button>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#0891B2", letterSpacing: 1 }}>JAMES</span>
            <span style={{ color: "#334155", fontSize: 12 }}>|</span>
            <span style={{ color: "#94A3B8", fontSize: 10, fontWeight: 500 }}>什器</span>
            <span style={{ color: "#FFF", fontWeight: 800, fontSize: 15 }}>
              {data.fixture}：{data.categoryName}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => setEditMode(!editMode)} style={{
            border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: 700, transition: "all 0.2s",
            background: editMode ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(255,255,255,0.1)",
            color: editMode ? "#FFF" : "#CBD5E1"
          }}>{editMode ? "編集中" : "棚割編集"}</button>
          <button onClick={() => setShowDcsPanel(!showDcsPanel)} style={{
            border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: 700, transition: "all 0.2s",
            background: showDcsPanel ? "linear-gradient(135deg, #0284C7, #0369A1)" : "rgba(255,255,255,0.1)",
            color: "#FFF", position: "relative"
          }}>
            DCS
            {dcsProposals.length > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "#DC2626", color: "#FFF", borderRadius: 8, padding: "1px 5px", fontSize: 9, fontWeight: 800, minWidth: 16, textAlign: "center" }}>{dcsProposals.length}</span>
            )}
          </button>
          {totalOrders > 0 && (
            <div style={{ background: "linear-gradient(135deg, #0284C7, #0891B2)", color: "#FFF", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(8,145,178,0.3)" }}>
              発注 {totalOrders}品/{totalQty}個
            </div>
          )}
        </div>
      </div>

      {/* DCS指示サマリーバー */}
      {(dcsCutCount > 0 || dcsFaceChangeCount > 0 || dcsSwapCount > 0) && (
        <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: "#1B2A4A", fontSize: 11 }}>DCS指示:</span>
          {dcsCutCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ background: dcsCutRemaining === 0 ? "#D1FAE5" : "#FEE2E2", color: dcsCutRemaining === 0 ? "#065F46" : "#991B1B", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                カット指示 {dcsCutCount}件
              </span>
              {dcsCutRemaining === 0
                ? <span style={{ color: "#059669", fontWeight: 700, fontSize: 11 }}>✓ 完了</span>
                : <span style={{ color: "#DC2626", fontSize: 10 }}>残{dcsCutRemaining}件</span>
              }
              {dcsCutRemaining === 0 && !taskCompleted["カット指示"] && (
                <button onClick={() => markTaskDone("カット指示")} style={{ background: "#059669", color: "#FFF", border: "none", borderRadius: 4, padding: "1px 6px", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>確認済</button>
              )}
              {taskCompleted["カット指示"] && <span style={{ color: "#059669", fontSize: 9, fontWeight: 700, background: "#D1FAE5", padding: "1px 6px", borderRadius: 4 }}>作業完了</span>}
            </div>
          )}
          {dcsFaceChangeCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ background: dcsFaceRemaining === 0 ? "#DBEAFE" : "#FEF3C7", color: dcsFaceRemaining === 0 ? "#1E40AF" : "#92400E", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                フェーシング変更 {dcsFaceChangeCount}件
              </span>
              {dcsFaceRemaining === 0
                ? <span style={{ color: "#2563EB", fontWeight: 700, fontSize: 11 }}>✓ 完了</span>
                : <span style={{ color: "#D97706", fontSize: 10 }}>残{dcsFaceRemaining}件</span>
              }
              {dcsFaceRemaining === 0 && !taskCompleted["フェーシング変更"] && (
                <button onClick={() => markTaskDone("フェーシング変更")} style={{ background: "#2563EB", color: "#FFF", border: "none", borderRadius: 4, padding: "1px 6px", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>確認済</button>
              )}
              {taskCompleted["フェーシング変更"] && <span style={{ color: "#2563EB", fontSize: 9, fontWeight: 700, background: "#DBEAFE", padding: "1px 6px", borderRadius: 4 }}>作業完了</span>}
            </div>
          )}
          {dcsSwapCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ background: "#E0E7FF", color: "#3730A3", padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                商品入替 {dcsSwapCount}件
              </span>
              {!taskCompleted["商品入替"] && (
                <button onClick={() => markTaskDone("商品入替")} style={{ background: "#4F46E5", color: "#FFF", border: "none", borderRadius: 4, padding: "1px 6px", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>確認済</button>
              )}
              {taskCompleted["商品入替"] && <span style={{ color: "#4F46E5", fontSize: 9, fontWeight: 700, background: "#E0E7FF", padding: "1px 6px", borderRadius: 4 }}>作業完了</span>}
            </div>
          )}
          {/* 全作業完了チェック */}
          {dcsCutRemaining === 0 && dcsFaceRemaining === 0 && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              {taskCompleted["カット指示"] && taskCompleted["フェーシング変更"]
                ? <span style={{ background: "#059669", color: "#FFF", padding: "3px 10px", borderRadius: 12, fontWeight: 700, fontSize: 11 }}>全作業完了</span>
                : <span style={{ color: "#64748B", fontSize: 10 }}>全指示の承認/却下を完了後「確認済」で作業完了</span>
              }
            </div>
          )}
        </div>
      )}

      {/* Edit mode banner */}
      {editMode && (
        <div style={{ background: "#FFFBEB", borderBottom: "2px solid #F59E0B", padding: "6px 16px", fontSize: 11, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
          <strong>棚割編集</strong>
          <span>ドラッグ＝位置変更 / F±＝フェーシング（0にするとカット）/ 右パネルで入替・削除</span>
        </div>
      )}

      {/* View tabs */}
      <div style={{ display: "flex", background: "#FFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        {[
          { key: "shelf", label: "棚割" },
          { key: "list", label: "一覧" },
          { key: "priority", label: "重点" },
        ].map(t => (
          <button key={t.key} onClick={() => setViewMode(t.key)} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: viewMode === t.key ? "#0891B2" : "#FFF",
            color: viewMode === t.key ? "#FFF" : "#64748B",
            borderBottom: viewMode === t.key ? "3px solid #0891B2" : "3px solid transparent"
          }}>{t.label}</button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left side */}
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {/* DCS panel at top if open */}
          {showDcsPanel && (
            <div style={{ marginBottom: 10 }}>
              <DcsProposalPanel proposals={dcsProposals} products={products} onApprove={handleDcsApprove} onReject={handleDcsReject} />
            </div>
          )}

          {viewMode === "shelf" && (
            <ShelfGrid products={products} selected={selectedProduct} onSelect={setSelectedProduct}
              editMode={editMode} onFaceChange={handleFaceChange} onDragStart={handleDragStart} onDrop={handleDrop} dragItem={dragItem}
              onDelete={handleDeleteProduct} deletedProducts={deletedProducts} onRestore={handleRestoreProduct}
              shelfWidthMm={data.shelfWidthMm} rowHeights={data.rowHeights} />
          )}
          {viewMode === "list" && (
            <ListView products={products} selected={selectedProduct} onSelect={setSelectedProduct} onOrderChange={handleOrderChange} onDelete={handleDeleteProduct} editMode={editMode} />
          )}
          {viewMode === "priority" && (
            <PriorityView products={products} selected={selectedProduct} onSelect={setSelectedProduct} />
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedProduct && (
          <div style={{ width: 340, borderLeft: "1px solid #E2E8F0", background: "#FFF", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A" }}>{selectedProduct.name}</div>
                <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94A3B8" }}>×</button>
              </div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                {selectedProduct.maker}　|　¥{selectedProduct.price}　|　ランク {selectedProduct.rank}
              </div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                JAN: {selectedProduct.jan}　|　{selectedProduct.row}段　F:{selectedProduct.face}　幅{(selectedProduct.width_mm||90)*selectedProduct.face}mm
              </div>
              {editMode && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => setShowSwapDialog(true)} style={{ background: "#F59E0B", color: "#FFF", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>商品入替</button>
                  <button onClick={() => handleDeleteProduct(selectedProduct.jan)} style={{ background: "#D63031", color: "#FFF", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>カット（削除）</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
              {[
                { key: "order", label: "発注" },
                { key: "params", label: "パラメータ" },
                { key: "chart", label: "実績" },
                { key: "profit", label: "収益" },
                { key: "info", label: "情報" },
              ].map(t => (
                <button key={t.key} onClick={() => setDetailTab(t.key)} style={{
                  flex: 1, padding: "8px 0", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
                  background: detailTab === t.key ? "#0891B2" : "#FFF",
                  color: detailTab === t.key ? "#FFF" : "#64748B",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
              {detailTab === "order" && <OrderPanel product={selectedProduct} onOrderChange={handleOrderChange} onNext={goNext} onPrev={goPrev} />}
              {detailTab === "params" && <ParamsPanel product={selectedProduct} onParamChange={handleParamChange} onParamChangeBatch={handleParamChangeBatch} rowHeights={data.rowHeights} />}
              {detailTab === "chart" && <ChartPanel product={selectedProduct} />}
              {detailTab === "profit" && <ProfitPanel product={selectedProduct} allProducts={products} />}
              {detailTab === "info" && <InfoPanel product={selectedProduct} />}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderTop: "1px solid #334155" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#64748B" }}>SKU</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFF" }}>{products.length}</span>
          </div>
          <div style={{ width: 1, height: 16, background: "#334155" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#64748B" }}>不足</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: products.filter(p => p.currentStock <= p.orderPoint).length > 0 ? "#F87171" : "#10B981" }}>
              {products.filter(p => p.currentStock <= p.orderPoint).length}
            </span>
          </div>
          {deletedProducts.length > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: "#334155" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: "#64748B" }}>カット</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F87171" }}>{deletedProducts.length}</span>
              </div>
            </>
          )}
          {changeLog.length > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: "#334155" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: "#64748B" }}>変更</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FBBF24" }}>{changeLog.length}</span>
              </div>
            </>
          )}
        </div>
        <button style={{
          background: totalOrders > 0 ? "linear-gradient(135deg, #0284C7, #0891B2)" : "#334155",
          color: "#FFF", border: "none", borderRadius: 10,
          padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: totalOrders > 0 ? "pointer" : "default",
          boxShadow: totalOrders > 0 ? "0 4px 12px rgba(8,145,178,0.3)" : "none",
          transition: "all 0.2s"
        }}>
          発注確定（{totalOrders}品/{totalQty}個）
        </button>
      </div>

      {/* Dialogs */}
      {showSwapDialog && selectedProduct && (
        <ProductSwapDialog currentProduct={selectedProduct} candidates={CANDIDATE_PRODUCTS} onSwap={handleProductSwap} onClose={() => setShowSwapDialog(false)} />
      )}
    </div>
  );
};

// ============================================================
// SHELF GRID - ゴンドラ什器風 リアルレイアウト
// ============================================================
const ShelfGrid = ({ products, selected, onSelect, editMode, onFaceChange, onDragStart, onDrop, dragItem, onDelete, deletedProducts, onRestore, shelfWidthMm, rowHeights }) => {
  const rows = [1, 2, 3, 4];
  const totalShelfMm = shelfWidthMm || 900;
  const rh = rowHeights || { 1: 280, 2: 300, 3: 280, 4: 320 };
  const mmToPx = (mm) => Math.round((mm / 320) * 140);

  // 段ラベルの名前
  const rowLabels = { 1: "上段", 2: "中上段", 3: "中下段", 4: "下段" };

  return (
    <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      {/* ゴンドラヘッダー */}
      <div style={{ background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#10B981" }} />
          <span style={{ color: "#FFF", fontSize: 12, fontWeight: 700 }}>ゴンドラ什器</span>
          <span style={{ color: "#94A3B8", fontSize: 11 }}>{totalShelfMm}mm幅 × {rows.length}段</span>
        </div>
        <div style={{ color: "#64748B", fontSize: 10 }}>
          {products.length} SKU
        </div>
      </div>

      {/* 棚本体 */}
      <div style={{ padding: "0 2px", background: "linear-gradient(180deg, #F8FAFC 0%, #EFF3F8 100%)" }}>
        {rows.map(row => {
          const rowProducts = products.filter(p => p.row === row);
          const usedMm = calcRowWidth(products, row);
          const freeMm = totalShelfMm - usedMm;
          const overflowing = freeMm < 0;
          const freePercent = Math.max(0, (freeMm / totalShelfMm) * 100);
          const fillPct = Math.min(100, (usedMm / totalShelfMm) * 100);

          return (
            <div key={row}>
              {/* 段ヘッダー */}
              <div style={{ display: "flex", alignItems: "center", padding: "6px 10px 2px", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 70 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#1E293B" }}>{row}</span>
                  <span style={{ fontSize: 10, color: "#64748B", fontWeight: 500 }}>{rowLabels[row]}</span>
                  <span style={{ fontSize: 9, color: "#94A3B8" }}>{rh[row]}mm</span>
                </div>
                {/* 使用率バー */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 4, background: "#E2E8F0", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: 4, borderRadius: 2, transition: "width 0.3s",
                      width: `${fillPct}%`,
                      background: overflowing ? "#EF4444" : freeMm < 50 ? "#F59E0B" : "#10B981"
                    }} />
                  </div>
                  <span style={{
                    fontSize: 9, whiteSpace: "nowrap", fontWeight: 600,
                    color: overflowing ? "#EF4444" : freeMm < 50 ? "#D97706" : "#64748B"
                  }}>
                    {overflowing ? `${Math.abs(freeMm)}mm超過` : `空${freeMm}mm`}
                  </span>
                </div>
              </div>

              {/* 商品セル */}
              <div style={{ display: "flex", padding: "0 6px 0 6px", alignItems: "flex-end" }}>
                <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "flex-end" }}>
                  {rowProducts.map((p, idx) => {
                    const cellWidthMm = (p.width_mm || 90) * p.face;
                    const widthPercent = (cellWidthMm / totalShelfMm) * 100;
                    const rowH = rh[row] || 300;
                    const prodH = p.height_mm || 200;
                    const maxStack = calcMaxStack(prodH, rowH);
                    const cellHeightPx = mmToPx(rowH);
                    const prodHeightPct = Math.min(100, (prodH / rowH) * 100);
                    const isSelected = selected?.jan === p.jan;
                    const isLow = p.currentStock <= p.orderPoint;
                    const isDragging = dragItem?.jan === p.jan;
                    const dcsProposal = DCS_PROPOSALS.find(d => d.jan === p.jan);
                    const isCutOrReduce = dcsProposal && (dcsProposal.action === "カット" || dcsProposal.action === "フェース減");
                    const isIncrease = dcsProposal && dcsProposal.action === "フェース増";

                    return (
                      <div key={p.jan}
                        draggable={editMode}
                        onDragStart={editMode ? () => onDragStart(p) : undefined}
                        onDragOver={editMode ? e => e.preventDefault() : undefined}
                        onDrop={editMode ? () => onDrop(row, idx) : undefined}
                        onClick={() => onSelect(p)}
                        style={{
                          position: "relative", height: cellHeightPx,
                          width: `${widthPercent}%`, minWidth: 54, flexShrink: 0,
                          background: isDragging ? "#FEF3C7" : isSelected ? "linear-gradient(180deg, #DBEAFE 0%, #EFF6FF 100%)" : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
                          border: isSelected ? "2px solid #0284C7" : isCutOrReduce ? "2px solid #DC2626" : isIncrease ? "2px solid #2563EB" : isLow ? "2px solid #F87171" : "1px solid #E2E8F0",
                          borderRadius: 8, cursor: editMode ? "grab" : "pointer", padding: "4px 5px", textAlign: "left",
                          boxShadow: isSelected ? "0 0 0 3px rgba(2,132,199,0.15), 0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.06)",
                          transition: "all 0.2s ease", overflow: "hidden", opacity: isDragging ? 0.4 : 1
                        }}>
                        {/* 商品高さバー */}
                        <div style={{
                          position: "absolute", left: 1, bottom: 1, width: 3, borderRadius: 2,
                          height: `${prodHeightPct}%`,
                          background: maxStack >= 3 ? "#10B981" : maxStack >= 2 ? "#0891B2" : "#CBD5E1",
                          opacity: 0.5
                        }} />
                        {maxStack > 1 && (
                          <span style={{ position: "absolute", left: 6, bottom: 2, fontSize: 7, color: "#0891B2", fontWeight: 700, opacity: 0.8 }}>×{maxStack}</span>
                        )}
                        {/* DCS カット/フェース減 */}
                        {isCutOrReduce && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 7, zIndex: 2, pointerEvents: "none",
                            background: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(220,38,38,0.2) 4px, rgba(220,38,38,0.2) 6px)"
                          }}>
                            <div style={{
                              position: "absolute", bottom: 3, left: 3, right: 3, background: "#DC2626",
                              color: "#FFF", fontSize: 8, fontWeight: 800, textAlign: "center", borderRadius: 4, padding: "2px 0", letterSpacing: 0.5
                            }}>{dcsProposal.action === "カット" ? "カット" : "F減"}</div>
                          </div>
                        )}
                        {/* DCS フェース増 */}
                        {isIncrease && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 7, zIndex: 2, pointerEvents: "none",
                            background: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(37,99,235,0.15) 4px, rgba(37,99,235,0.15) 6px)"
                          }}>
                            <div style={{
                              position: "absolute", bottom: 3, left: 3, right: 3, background: "#2563EB",
                              color: "#FFF", fontSize: 8, fontWeight: 800, textAlign: "center", borderRadius: 4, padding: "2px 0", letterSpacing: 0.5
                            }}>F増→{dcsProposal.newFace}</div>
                          </div>
                        )}
                        <RankBadge rank={p.rank} />
                        <TagBadge tag={p.tag} />
                        <div style={{ marginTop: 20, fontSize: 10, color: "#1E293B", fontWeight: 600, lineHeight: "13px", overflow: "hidden", height: 26 }}>
                          {p.name.length > (p.face > 1 ? 20 : 10) ? p.name.slice(0, p.face > 1 ? 20 : 10) + "…" : p.name}
                        </div>
                        <div style={{ fontSize: 8, color: "#94A3B8", letterSpacing: 0.3, marginTop: -1 }}>{p.jan.slice(-4)}</div>
                        <StockBar current={p.currentStock} base={p.baseStock} orderPoint={p.orderPoint} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, alignItems: "center" }}>
                          <span style={{ fontSize: 8, color: isLow ? "#DC2626" : "#64748B", fontWeight: isLow ? 700 : 400 }}>在庫{p.currentStock}</span>
                          {p.orderQty > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: "#FFF", background: "#0284C7", borderRadius: 3, padding: "0 4px" }}>
                              {p.orderQty}
                            </span>
                          )}
                        </div>
                        {/* Facing bar & edit */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 1 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#0284C7" }}>
                            F:{p.face}
                            <span style={{ fontSize: 8, color: "#94A3B8", fontWeight: 400, marginLeft: 2 }}>{cellWidthMm}mm</span>
                          </span>
                          {editMode && (
                            <div style={{ display: "flex", gap: 1 }} onClick={e => e.stopPropagation()}>
                              <button onClick={e => { e.stopPropagation(); onFaceChange(p.jan, p.face - 1); }}
                                style={{ width: 18, height: 18, fontSize: 11, border: "1px solid #CBD5E1", borderRadius: 4, background: p.face <= 1 ? "#FEF2F2" : "#FFF", cursor: "pointer", padding: 0, lineHeight: "16px", color: p.face <= 1 ? "#DC2626" : "#1E293B", fontWeight: 600 }}>−</button>
                              <button onClick={e => { e.stopPropagation(); onFaceChange(p.jan, p.face + 1); }}
                                style={{ width: 18, height: 18, fontSize: 11, border: "1px solid #CBD5E1", borderRadius: 4, background: "#FFF", cursor: "pointer", padding: 0, lineHeight: "16px", fontWeight: 600 }}>+</button>
                              <button onClick={e => { e.stopPropagation(); onDelete(p.jan); }}
                                style={{ width: 18, height: 18, fontSize: 11, border: "1px solid #DC2626", borderRadius: 4, background: "#FEF2F2", cursor: "pointer", padding: 0, lineHeight: "16px", color: "#DC2626", fontWeight: 600 }}>×</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Free space */}
                  {freeMm > 0 && (
                    <div style={{
                      width: `${freePercent}%`, minWidth: 30, height: mmToPx(rh[row] || 300),
                      background: editMode && dragItem ? "linear-gradient(180deg, #DBEAFE 0%, #EFF6FF 100%)" : "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
                      borderRadius: 8,
                      border: editMode && dragItem ? "2px dashed #0284C7" : "1px dashed #D1D5DB",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: editMode && dragItem ? "#0284C7" : "#CBD5E1", flexShrink: 0, fontWeight: 500
                    }}
                      onDragOver={editMode ? e => e.preventDefault() : undefined}
                      onDrop={editMode ? () => onDrop(row, rowProducts.length) : undefined}
                    >
                      {editMode && dragItem ? "ドロップ" : `${freeMm}mm`}
                    </div>
                  )}
                </div>
              </div>
              {/* 棚板（ゴンドラ什器の棚線） */}
              <div style={{ margin: "0 6px", height: 4, background: "linear-gradient(180deg, #94A3B8 0%, #CBD5E1 100%)", borderRadius: "0 0 2px 2px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            </div>
          );
        })}
      </div>

      {/* カット済み商品 */}
      {deletedProducts.length > 0 && (
        <div style={{ margin: "0 12px 12px", padding: "10px 14px", background: "linear-gradient(135deg, #FFF5F5 0%, #FEF2F2 100%)", borderRadius: 8, border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span>カット済み商品</span>
            <span style={{ background: "#DC2626", color: "#FFF", borderRadius: 10, padding: "1px 8px", fontSize: 10 }}>{deletedProducts.length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {deletedProducts.map(p => (
              <div key={p.jan} style={{
                display: "flex", alignItems: "center", gap: 6, background: "#FFF", border: "1px solid #FECACA",
                borderRadius: 6, padding: "5px 10px", fontSize: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
              }}>
                <span style={{ color: "#64748B", fontWeight: 500 }}>{p.name}</span>
                {editMode && (
                  <button onClick={() => onRestore(p.jan)} style={{
                    background: "linear-gradient(135deg, #10B981, #059669)", color: "#FFF", border: "none",
                    borderRadius: 4, padding: "2px 8px", fontSize: 9, cursor: "pointer", fontWeight: 700
                  }}>復元</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// List View
const ListView = ({ products, selected, onSelect, onOrderChange, onDelete, editMode }) => {
  const sorted = [...products].sort((a, b) => a.row - b.row);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#1B2A4A", color: "#FFF" }}>
            <th style={thStyle}>棚</th>
            <th style={{ ...thStyle, textAlign: "left", minWidth: 140 }}>商品名</th>
            <th style={thStyle}>R</th>
            <th style={thStyle}>F</th>
            <th style={thStyle}>在庫</th>
            <th style={thStyle}>OP</th>
            <th style={thStyle}>CAP</th>
            {DAYS.map((d, i) => <th key={i} style={thStyle}>{d}</th>)}
            <th style={{ ...thStyle, background: "#0891B2" }}>発注</th>
            {editMode && <th style={{ ...thStyle, background: "#D63031" }}>操作</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => {
            const isSelected = selected?.jan === p.jan;
            const isLow = p.currentStock <= p.orderPoint;
            return (
              <tr key={p.jan} onClick={() => onSelect(p)} style={{
                background: isSelected ? "#DBEAFE" : isLow ? "#FEF2F2" : "#FFF",
                cursor: "pointer", borderBottom: "1px solid #E2E8F0"
              }}>
                <td style={tdStyle}>{p.row}段</td>
                <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 150 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {p.tag && <span style={{ fontSize: 8, background: p.tag === "チラシ" ? "#EF4444" : p.tag === "販促" ? "#F59E0B" : "#8B5CF6", color: "#FFF", padding: "0 3px", borderRadius: 2 }}>{p.tag}</span>}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <span style={{ background: p.rank === "A" ? "#0891B2" : p.rank === "B" ? "#F59E0B" : "#94A3B8", color: "#FFF", padding: "1px 5px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{p.rank}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: "#0891B2" }}>{p.face}</td>
                <td style={{ ...tdStyle, textAlign: "center", color: isLow ? "#EF4444" : "#1B2A4A", fontWeight: isLow ? 700 : 400 }}>{p.currentStock}/{p.baseStock}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{p.orderPoint}</td>
                <td style={{ ...tdStyle, textAlign: "center", fontSize: 10, color: "#64748B" }}>{p.cap || "-"}</td>
                {(p.salesWeek || [0,0,0,0,0,0,0]).map((v, i) => <td key={i} style={{ ...tdStyle, textAlign: "center", color: "#64748B" }}>{v}</td>)}
                <td style={{ ...tdStyle, textAlign: "center", padding: "2px 4px" }}>
                  <input type="number" min="0" value={p.orderQty}
                    onChange={e => onOrderChange(p.jan, parseInt(e.target.value) || 0)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 44, textAlign: "center", border: "1px solid #CBD5E1", borderRadius: 4, padding: "3px 2px", fontSize: 12, fontWeight: 700, color: p.orderQty > 0 ? "#0891B2" : "#1B2A4A", background: p.orderQty > 0 ? "#ECFEFF" : "#FFF" }} />
                </td>
                {editMode && (
                  <td style={{ ...tdStyle, textAlign: "center", padding: "2px 4px" }}>
                    <button onClick={e => { e.stopPropagation(); onDelete(p.jan); }}
                      style={{ background: "#D63031", color: "#FFF", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>カット</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Priority View
const PriorityView = ({ products, selected, onSelect }) => {
  const tagged = products.filter(p => p.tag);
  const lowStock = products.filter(p => p.currentStock <= p.orderPoint && !p.tag);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4A", padding: "8px 4px" }}>重点商品</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {tagged.map(p => (
          <button key={p.jan} onClick={() => onSelect(p)} style={{
            background: selected?.jan === p.jan ? "#DBEAFE" : "#FFF",
            border: selected?.jan === p.jan ? "2px solid #0891B2" : "1px solid #E2E8F0",
            borderRadius: 8, padding: 10, cursor: "pointer", textAlign: "left", position: "relative"
          }}>
            <TagBadge tag={p.tag} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A" }}>{p.name}</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{p.maker}　¥{p.price}　F:{p.face}</div>
            <StockBar current={p.currentStock} base={p.baseStock} orderPoint={p.orderPoint} />
          </button>
        ))}
      </div>
      {lowStock.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", padding: "8px 4px" }}>在庫不足</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {lowStock.map(p => (
              <button key={p.jan} onClick={() => onSelect(p)} style={{
                background: selected?.jan === p.jan ? "#DBEAFE" : "#FEF2F2",
                border: selected?.jan === p.jan ? "2px solid #0891B2" : "1px solid #FCA5A5",
                borderRadius: 8, padding: 10, cursor: "pointer", textAlign: "left"
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A" }}>{p.name}</div>
                <StockBar current={p.currentStock} base={p.baseStock} orderPoint={p.orderPoint} />
                <div style={{ fontSize: 9, color: "#EF4444", marginTop: 4, fontWeight: 700 }}>在庫 {p.currentStock} ≤ OP {p.orderPoint}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================
// DETAIL PANELS
// ============================================================
const OrderPanel = ({ product, onOrderChange, onNext, onPrev }) => {
  const p = product;
  const isLow = p.currentStock <= p.orderPoint;
  const suggested = Math.max(0, p.baseStock - p.currentStock);
  const avgSales = p.salesWeek ? (p.salesWeek.reduce((a, b) => a + b, 0) / 7) : 0;
  const daysOfStock = avgSales > 0 ? (p.currentStock / avgSales).toFixed(1) : "∞";

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 10, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>現在庫</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: isLow ? "#EF4444" : "#1B2A4A" }}>{p.currentStock}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>基準{p.baseStock} CAP{p.cap||"-"}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 10, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>発注点(OP)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#F59E0B" }}>{p.orderPoint}</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>F:{p.face} 在庫{daysOfStock}日</div>
        </div>
      </div>

      {isLow && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 8, marginBottom: 12, fontSize: 11, color: "#EF4444", fontWeight: 600 }}>
          在庫不足。推奨発注数: {suggested}
        </div>
      )}

      <div style={{ background: "#ECFEFF", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#0891B2", fontWeight: 600, marginBottom: 6 }}>発注数量</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <button onClick={() => onOrderChange(p.jan, p.orderQty - 1)} style={{ width: 36, height: 36, borderRadius: 18, border: "1px solid #CBD5E1", background: "#FFF", fontSize: 18, cursor: "pointer" }}>−</button>
          <input type="number" value={p.orderQty} onChange={e => onOrderChange(p.jan, parseInt(e.target.value) || 0)}
            style={{ width: 60, textAlign: "center", fontSize: 28, fontWeight: 800, border: "2px solid #0891B2", borderRadius: 8, padding: "4px 0", color: "#0891B2" }} />
          <button onClick={() => onOrderChange(p.jan, p.orderQty + 1)} style={{ width: 36, height: 36, borderRadius: 18, border: "1px solid #CBD5E1", background: "#FFF", fontSize: 18, cursor: "pointer" }}>+</button>
        </div>
        {suggested > 0 && (
          <button onClick={() => onOrderChange(p.jan, suggested)} style={{ marginTop: 8, background: "#0891B2", color: "#FFF", border: "none", borderRadius: 6, padding: "5px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            推奨{suggested}をセット
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onPrev} style={{ flex: 1, padding: "10px 0", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← 前</button>
        <button onClick={onNext} style={{ flex: 1, padding: "10px 0", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFF", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>次 →</button>
      </div>
    </div>
  );
};

const ParamsPanel = ({ product, onParamChange, onParamChangeBatch, rowHeights }) => {
  const p = product;
  const shelfH = (rowHeights || {})[p.row] || 300;
  const avgSales = p.salesWeek ? (p.salesWeek.reduce((a, b) => a + b, 0) / 7) : 0;
  const suggestedOP = Math.ceil(avgSales * ((p.inventoryDays || 2) + (p.leadTime || 1)));

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A", marginBottom: 10 }}>自動補充パラメーター</div>

      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>在庫管理</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <EditableNum label="在庫日数" value={p.inventoryDays || 2} step={0.5} min={0.5} max={14} width={55} onChange={v => onParamChange(p.jan, "inventoryDays", v)} unit="日" />
          <EditableNum label="リードタイム" value={p.leadTime || 1} min={0} max={7} width={55} onChange={v => onParamChange(p.jan, "leadTime", v)} unit="日" />
          <EditableNum label="発注点(OP)" value={p.orderPoint} min={0} max={999} width={55} onChange={v => onParamChange(p.jan, "orderPoint", v)} unit="個" highlight={p.orderPoint !== suggestedOP} />
          <EditableNum label="基準在庫" value={p.baseStock} min={0} max={999} width={55} onChange={v => onParamChange(p.jan, "baseStock", v)} unit="個" />
          <EditableNum label="最低単位" value={p.minOrderUnit || 1} min={1} max={100} width={55} onChange={v => onParamChange(p.jan, "minOrderUnit", v)} unit="個" />
        </div>
        {p.orderPoint !== suggestedOP && (
          <div style={{ marginTop: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "6px 8px" }}>
            <div style={{ fontSize: 9, color: "#92400E" }}>推奨OP: {suggestedOP}（日販{avgSales.toFixed(1)}×(在庫日数+LT)）</div>
            <button onClick={() => onParamChange(p.jan, "orderPoint", suggestedOP)} style={{ marginTop: 4, background: "#F59E0B", color: "#FFF", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>推奨値適用</button>
          </div>
        )}
      </div>

      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>棚割・CAP（幅×積段×奥行）</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <EditableNum label="フェイス(幅)" value={p.face} min={1} max={6} width={55} onChange={v => { const ms = calcMaxStack(p.height_mm || 200, shelfH); onParamChangeBatch(p.jan, { face: v, cap: v * (p.depth || 3) * ms }); }} unit="列" />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#64748B", minWidth: 60 }}>積段数</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#1B2A4A" }}>{calcMaxStack(p.height_mm || 200, shelfH)}段</span>
            <span style={{ fontSize: 9, color: "#94A3B8" }}>（H{p.height_mm||200}mm / 棚高{shelfH}mm）</span>
          </div>
          <EditableNum label="奥行" value={p.depth || 3} min={1} max={10} width={55} onChange={v => { const ms = calcMaxStack(p.height_mm || 200, shelfH); onParamChangeBatch(p.jan, { depth: v, cap: (p.face || 1) * v * ms }); }} unit="列" />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#64748B", minWidth: 60 }}>商品寸法</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>W{p.width_mm || 90} × H{p.height_mm || 200} × D{p.depth || 3}列</span>
          </div>
          <EditableNum label="CAP" value={p.cap} min={1} max={999} width={55} onChange={v => onParamChange(p.jan, "cap", v)} unit="個" highlight={(() => { const ms = calcMaxStack(p.height_mm || 200, shelfH); return p.cap !== p.face * (p.depth || 3) * ms; })()} />
        </div>
        {(() => {
          const ms = calcMaxStack(p.height_mm || 200, shelfH);
          const calcedCap = p.face * (p.depth || 3) * ms;
          return (
            <div style={{ marginTop: 6, fontSize: 9, color: "#64748B" }}>
              計算CAP = F{p.face} × 奥行{p.depth || 3} × 積段{ms} = <strong>{calcedCap}</strong>
              <span style={{ color: "#94A3B8" }}>（商品H{p.height_mm||200}mm / 棚高{shelfH}mm → {ms}段積）</span>
              {p.cap !== calcedCap && <span style={{ color: "#F59E0B", fontWeight: 700 }}>（手動:{p.cap}）</span>}
            </div>
          );
        })()}
      </div>

      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>在庫修正</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#94A3B8" }}>理論在庫</div><div style={{ fontSize: 18, fontWeight: 800 }}>{p.currentStock}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#94A3B8" }}>修正</div><div style={{ fontSize: 18, fontWeight: 800, color: p.stockCorrection !== 0 ? "#F59E0B" : "#94A3B8" }}>{p.stockCorrection > 0 ? "+" : ""}{p.stockCorrection}</div></div>
        </div>
        <EditableNum label="修正数" value={p.stockCorrection} min={-99} max={99} width={55} onChange={v => onParamChange(p.jan, "stockCorrection", v)} unit="個" highlight={p.stockCorrection !== 0} />
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {[-3, -1, +1, +3].map(v => (
            <button key={v} onClick={() => onParamChange(p.jan, "stockCorrection", p.stockCorrection + v)}
              style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 600, border: "1px solid #CBD5E1", borderRadius: 4, cursor: "pointer", background: v > 0 ? "#ECFEFF" : "#FEF2F2", color: v > 0 ? "#0891B2" : "#EF4444" }}>{v > 0 ? "+" : ""}{v}</button>
          ))}
          <button onClick={() => onParamChange(p.jan, "stockCorrection", 0)}
            style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 600, border: "1px solid #CBD5E1", borderRadius: 4, cursor: "pointer", background: "#F1F5F9", color: "#64748B" }}>0</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 9, color: "#64748B" }}>実在庫 = {p.currentStock} + ({p.stockCorrection > 0 ? "+" : ""}{p.stockCorrection}) = <strong>{p.currentStock + p.stockCorrection}</strong></div>
      </div>
    </div>
  );
};

const ChartPanel = ({ product }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A", marginBottom: 8 }}>直近7日間 販売実績</div>
    <SalesChart data={product.salesWeek} labels={DAYS} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
      {[
        { label: "日販平均", value: product.salesWeek ? (product.salesWeek.reduce((a, b) => a + b, 0) / 7).toFixed(1) : "-" },
        { label: "週販合計", value: product.salesWeek ? product.salesWeek.reduce((a, b) => a + b, 0) : "-" },
        { label: "最大/日", value: product.salesWeek ? Math.max(...product.salesWeek) : "-" },
      ].map((s, i) => (
        <div key={i} style={{ background: "#F8FAFC", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#94A3B8" }}>{s.label}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1B2A4A" }}>{s.value}</div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// PROFIT PANEL - 商品別 粗利・売上高・収益分析
// ============================================================
const ProfitPanel = ({ product, allProducts }) => {
  const p = product;
  const costRate = p.costRate || 70; // 原価率（%）
  const grossMarginRate = 100 - costRate;
  const costPrice = Math.round(p.price * costRate / 100);
  const grossProfit = p.price - costPrice; // 1個あたり粗利(円)
  const weekSales = p.salesWeek ? p.salesWeek.reduce((a, b) => a + b, 0) : 0;
  const dailyAvg = weekSales / 7;
  const weekRevenue = weekSales * p.price; // 週売上高
  const weekGrossProfit = weekSales * grossProfit; // 週粗利高
  const monthRevenue = Math.round(weekRevenue * 4.3); // 月推定売上
  const monthGrossProfit = Math.round(weekGrossProfit * 4.3); // 月推定粗利
  // 棚効率 = 売上高 / 占有面積mm（フェース幅）
  const shelfWidthUsed = (p.width_mm || 90) * p.face;
  const revenuePerMm = shelfWidthUsed > 0 ? (weekRevenue / shelfWidthUsed).toFixed(1) : 0;
  const profitPerMm = shelfWidthUsed > 0 ? (weekGrossProfit / shelfWidthUsed).toFixed(1) : 0;
  // PI値 = 売上個数 / レジ通過客数 × 1000 （ここでは簡易的にdailyAvg×1000/500想定）
  const piValue = (dailyAvg * 1000 / 500).toFixed(1);

  // カテゴリ内ランキング用
  const ranked = [...allProducts].map(pr => {
    const ws = pr.salesWeek ? pr.salesWeek.reduce((a, b) => a + b, 0) : 0;
    const gm = ws * (pr.price - Math.round(pr.price * (pr.costRate || 70) / 100));
    return { jan: pr.jan, weekGP: gm, weekRev: ws * pr.price };
  }).sort((a, b) => b.weekGP - a.weekGP);
  const gpRank = ranked.findIndex(r => r.jan === p.jan) + 1;
  const revRanked = [...ranked].sort((a, b) => b.weekRev - a.weekRev);
  const revRank = revRanked.findIndex(r => r.jan === p.jan) + 1;

  const StatBox = ({ label, value, sub, color }) => (
    <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 8, textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#94A3B8" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || "#1B2A4A" }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#94A3B8" }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A", marginBottom: 10 }}>収益分析</div>

      {/* 原価・粗利 */}
      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>単品収益</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <StatBox label="売価" value={`¥${p.price}`} />
          <StatBox label="原価" value={`¥${costPrice}`} sub={`原価率${costRate}%`} />
          <StatBox label="粗利/個" value={`¥${grossProfit}`} sub={`粗利率${grossMarginRate}%`} color={grossMarginRate >= 30 ? "#10B981" : "#F59E0B"} />
        </div>
      </div>

      {/* 週次・月次 */}
      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>売上・粗利高</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <StatBox label="週売上高" value={`¥${weekRevenue.toLocaleString()}`} sub={`日販平均 ${dailyAvg.toFixed(1)}個`} />
          <StatBox label="週粗利高" value={`¥${weekGrossProfit.toLocaleString()}`} color="#10B981" sub={`粗利率${grossMarginRate}%`} />
          <StatBox label="月推定売上" value={`¥${monthRevenue.toLocaleString()}`} sub="×4.3週" />
          <StatBox label="月推定粗利" value={`¥${monthGrossProfit.toLocaleString()}`} color="#10B981" sub="×4.3週" />
        </div>
      </div>

      {/* 棚効率 */}
      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>棚効率</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <StatBox label="占有幅" value={`${shelfWidthUsed}mm`} sub={`${p.width_mm||90}mm×F${p.face}`} />
          <StatBox label="週売上/mm" value={`¥${revenuePerMm}`} />
          <StatBox label="週粗利/mm" value={`¥${profitPerMm}`} color="#10B981" />
        </div>
        <div style={{ marginTop: 6, fontSize: 9, color: "#64748B" }}>
          PI値: {piValue} | カテゴリ内 売上{revRank}位 / 粗利{gpRank}位（全{allProducts.length}SKU）
        </div>
      </div>

      {/* 日別粗利チャート */}
      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", marginBottom: 8 }}>日別粗利（直近7日）</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
          {(p.salesWeek || [0,0,0,0,0,0,0]).map((v, i) => {
            const dayGP = v * grossProfit;
            const maxGP = Math.max(...(p.salesWeek || [1]).map(s => s * grossProfit)) * 1.2;
            return (
              <div key={i} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 8, color: "#64748B", marginBottom: 1 }}>¥{dayGP}</div>
                <div style={{ height: Math.max(4, (dayGP / maxGP) * 80), background: "#10B981", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
                <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2 }}>{DAYS[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const InfoPanel = ({ product }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A4A", marginBottom: 8 }}>商品情報</div>
    {[
      { label: "商品名", value: product.name },
      { label: "JAN", value: product.jan },
      { label: "メーカー", value: product.maker },
      { label: "売価", value: `¥${product.price}` },
      { label: "ランク", value: product.rank },
      { label: "棚位置", value: `${product.row}段` },
      { label: "商品幅", value: `${product.width_mm || 90}mm × F${product.face} = ${(product.width_mm || 90) * product.face}mm` },
      { label: "フェイス", value: product.face },
      { label: "奥行", value: product.depth || "-" },
      { label: "CAP", value: product.cap || "-" },
      { label: "在庫日数", value: product.inventoryDays ? `${product.inventoryDays}日` : "-" },
      { label: "LT", value: product.leadTime ? `${product.leadTime}日` : "-" },
      { label: "現在庫", value: product.currentStock },
    ].map((item, i) => (
      <div key={i} style={{ display: "flex", borderBottom: "1px solid #F1F5F9", padding: "6px 0" }}>
        <div style={{ width: 80, fontSize: 11, color: "#94A3B8" }}>{item.label}</div>
        <div style={{ flex: 1, fontSize: 11, color: "#1B2A4A", fontWeight: 600 }}>{item.value}</div>
      </div>
    ))}
  </div>
);

// ============================================================
// STYLES
// ============================================================
const backBtnStyle = { background: "none", border: "1px solid #64748B", color: "#CBD5E1", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" };
const pillBtnStyle = { border: "none", color: "#CBD5E1", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" };
const thStyle = { padding: "6px 4px", fontSize: 10, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap" };
const tdStyle = { padding: "6px 4px", fontSize: 11, whiteSpace: "nowrap" };

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [screen, setScreen] = useState("portal");
  const [showDcs, setShowDcs] = useState(false);
  const [dcsProcessed, setDcsProcessed] = useState({ cut: 0, face: 0, total: 0 }); // ShelfViewScreenで処理した件数
  const [dcsTaskDone, setDcsTaskDone] = useState({}); // 作業完了フラグ { "カット指示": true, ... }

  if (screen === "portal") {
    return <PortalScreen userName="店長 佐々木" dcsProcessed={dcsProcessed} dcsTaskDone={dcsTaskDone} onNavigate={(s) => {
      if (s === "category-select-dcs") { setShowDcs(true); setScreen("category-select"); }
      else { setShowDcs(false); setScreen(s); }
    }} />;
  }
  if (screen === "category-select") {
    return <CategorySelectScreen onBack={() => setScreen("portal")} onSelect={() => setScreen("shelf-view")} showDcs={showDcs} />;
  }
  if (screen === "shelf-view") {
    return <ShelfViewScreen data={SHELF_DATA_111} onBack={() => setScreen("category-select")} onHome={() => setScreen("portal")} showDcs={showDcs}
      onDcsProcessedChange={setDcsProcessed} onDcsTaskDoneChange={setDcsTaskDone} dcsTaskDone={dcsTaskDone} />;
  }
  return <PortalScreen userName="店長 佐々木" dcsProcessed={dcsProcessed} dcsTaskDone={dcsTaskDone} onNavigate={() => {}} />;
}
