/**
 * DCS提案APIルート
 * DCSエンジンが生成したJAMES連携データを提供する
 *
 * エンドポイント:
 *   GET  /api/dcs/proposals          — DCS提案一覧
 *   GET  /api/dcs/proposals/summary   — 提案サマリー
 *   POST /api/dcs/proposals/approve   — 提案承認
 *   POST /api/dcs/proposals/reject    — 提案却下
 *   POST /api/dcs/import              — DCSエンジン出力ファイルをインポート
 */
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB, saveDB } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// DCS提案データの保存先
const DCS_DATA_DIR = path.join(__dirname, '..', 'data', 'dcs');

// ディレクトリ確保
if (!fs.existsSync(DCS_DATA_DIR)) {
  fs.mkdirSync(DCS_DATA_DIR, { recursive: true });
}

// ===== ヘルパー =====

function loadProposals() {
  const filePath = path.join(DCS_DATA_DIR, 'dcs_proposals.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('Failed to load DCS proposals:', e.message);
    return [];
  }
}

function saveProposals(proposals) {
  const filePath = path.join(DCS_DATA_DIR, 'dcs_proposals.json');
  fs.writeFileSync(filePath, JSON.stringify(proposals, null, 2), 'utf8');
}

function loadDecisions() {
  const filePath = path.join(DCS_DATA_DIR, 'dcs_decisions.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveDecisions(decisions) {
  const filePath = path.join(DCS_DATA_DIR, 'dcs_decisions.json');
  fs.writeFileSync(filePath, JSON.stringify(decisions, null, 2), 'utf8');
}

// ===== GET /api/dcs/proposals =====
// DCS提案一覧を返す（未処理分のみ）
router.get('/proposals', (req, res) => {
  try {
    const allProposals = loadProposals();
    const decisions = loadDecisions();
    const decidedJans = new Set(decisions.map(d => d.jan));

    // 未処理の提案のみ
    const pending = allProposals.filter(p => !decidedJans.has(p.jan));

    // フィルタ
    const { action, category, minPi } = req.query;
    let filtered = pending;
    if (action) filtered = filtered.filter(p => p.action === action);
    if (minPi) filtered = filtered.filter(p => p.piValue >= parseFloat(minPi));

    res.json({
      total: allProposals.length,
      pending: pending.length,
      decided: decisions.length,
      proposals: filtered
    });
  } catch (error) {
    console.error('Error fetching DCS proposals:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/dcs/proposals/summary =====
// 提案のサマリー統計
router.get('/proposals/summary', (req, res) => {
  try {
    const proposals = loadProposals();
    const decisions = loadDecisions();
    const decidedJans = new Set(decisions.map(d => d.jan));

    const summary = {
      total: proposals.length,
      pending: proposals.filter(p => !decidedJans.has(p.jan)).length,
      approved: decisions.filter(d => d.decision === 'approved').length,
      rejected: decisions.filter(d => d.decision === 'rejected').length,
      byAction: {},
      byPriority: {},
    };

    proposals.forEach(p => {
      summary.byAction[p.action] = (summary.byAction[p.action] || 0) + 1;
      summary.byPriority[p.priority] = (summary.byPriority[p.priority] || 0) + 1;
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/dcs/proposals/approve =====
// 提案を承認（棚割に反映）
router.post('/proposals/approve', express.json(), (req, res) => {
  try {
    const { jan, userName } = req.body;
    if (!jan) return res.status(400).json({ error: 'jan is required' });

    const proposals = loadProposals();
    const proposal = proposals.find(p => p.jan === jan);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    // 承認記録
    const decisions = loadDecisions();
    decisions.push({
      jan,
      action: proposal.action,
      decision: 'approved',
      userName: userName || 'buyer',
      decidedAt: new Date().toISOString(),
    });
    saveDecisions(decisions);

    // DB上の商品データに反映
    const db = getDB();
    if (proposal.action === 'カット') {
      // 商品を棚割から削除
      db.run('DELETE FROM products WHERE jan = ?', [jan]);
      saveDB();
    } else if (proposal.action === 'フェース減' || proposal.action === 'フェース増') {
      // フェース数を更新
      const newFace = proposal.newFace || 1;
      db.run('UPDATE products SET face = ? WHERE jan = ?', [newFace, jan]);
      saveDB();
    }

    res.json({ success: true, action: proposal.action, jan });
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/dcs/proposals/reject =====
// 提案を却下
router.post('/proposals/reject', express.json(), (req, res) => {
  try {
    const { jan, userName, reason } = req.body;
    if (!jan) return res.status(400).json({ error: 'jan is required' });

    const decisions = loadDecisions();
    decisions.push({
      jan,
      decision: 'rejected',
      userName: userName || 'buyer',
      reason: reason || '',
      decidedAt: new Date().toISOString(),
    });
    saveDecisions(decisions);

    res.json({ success: true, jan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/dcs/import =====
// DCSエンジン出力ファイルをアップロード
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const filename = req.file.originalname;
    const destPath = path.join(DCS_DATA_DIR, filename);

    fs.writeFileSync(destPath, req.file.buffer);

    // proposals.jsonの場合はバリデーション
    if (filename === 'dcs_proposals.json') {
      try {
        const data = JSON.parse(req.file.buffer.toString('utf8'));
        if (!Array.isArray(data)) {
          return res.status(400).json({ error: 'Invalid format: expected JSON array' });
        }
        // 決定履歴をリセット
        saveDecisions([]);
        res.json({ success: true, message: `Imported ${data.length} proposals`, count: data.length });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON: ' + e.message });
      }
    } else {
      res.json({ success: true, message: `File saved: ${filename}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
