# JAMES POC アーキテクチャ設計

## 概要

| 項目 | 内容 |
|------|------|
| 対象店舗 | マルエーうちや 泉店 |
| 利用者 | 本部バイヤー（PC）+ 店舗スタッフ（iPad） |
| 期間 | 1-2ヶ月 |
| データ更新 | CSVインポート（手動） |
| インフラ | クラウド（Railway） |

## 技術スタック

```
┌────────────────────────────────────┐
│  フロントエンド（React SPA）         │
│  - 棚割表示・編集                    │
│  - ゴンドラ分析                      │
│  - CSVアップロード画面               │
│  - ← 既存のApp.jsx + API接続        │
└──────────────┬─────────────────────┘
               │ REST API (fetch)
┌──────────────┴─────────────────────┐
│  バックエンド（Node.js + Express）    │
│  - /api/store         店舗情報       │
│  - /api/fixtures      ゴンドラ一覧   │
│  - /api/fixtures/:id  個別ゴンドラ   │
│  - /api/fixtures/:id/products 棚割保存│
│  - /api/import/csv    CSVインポート  │
│  - 静的ファイル配信（React build）    │
└──────────────┬─────────────────────┘
               │
┌──────────────┴─────────────────────┐
│  データベース（SQLite）              │
│  - stores        店舗マスタ          │
│  - fixtures      ゴンドラマスタ      │
│  - products      商品データ          │
│  - shelf_edits   棚割変更ログ        │
│  - import_logs   インポート履歴      │
└────────────────────────────────────┘
```

## DB設計

### stores（店舗）
- store_code, company, store_name, created_at

### fixtures（ゴンドラ）
- fixture_id (PK), store_code, department, category_label
- rows, shelf_width_mm, row_heights (JSON)
- total_sales, total_profit, period_from, period_to

### products（商品 × ゴンドラ配置）
- id (PK), fixture_id (FK), row, order_num
- jan, name, maker, price, cost_rate, rank
- face, width_mm, height_mm, depth
- sales_qty, total_sales, total_profit, daily_avg_qty
- sales_week (JSON), category_name

### shelf_edits（変更ログ）
- id, fixture_id, user_name, action, details (JSON)
- created_at

## デプロイ構成

```
GitHub (james-app)
    │
    ├── /server         ← Express サーバー
    │   ├── index.js    ← エントリポイント
    │   ├── routes/     ← APIルート
    │   ├── db/         ← SQLite + マイグレーション
    │   └── import/     ← CSVパーサー
    │
    ├── /src            ← React フロントエンド（既存）
    ├── /dist           ← ビルド済み静的ファイル
    └── package.json    ← start: "node server/index.js"
```

Railway.app にデプロイ：
- GitHubリポジトリ連携 → 自動デプロイ
- SQLiteファイルはボリュームに永続化
- HTTPS自動付与（店舗iPadからアクセス可能）
- 月額 $5〜程度

## 実装フェーズ

### Phase 1: バックエンド基盤（今回）
1. Express サーバー + SQLite DB作成
2. 既存JSONデータをDBにマイグレーション
3. REST API実装
4. CSVインポートAPI
5. フロントエンドをAPI接続に切替

### Phase 2: デプロイ
6. Railway.appにデプロイ
7. HTTPS + カスタムドメイン（任意）
8. 泉店iPadからアクセス確認

### Phase 3: 運用機能追加
9. 棚割変更の保存・履歴
10. CSVアップロード画面（UIから直接インポート）
11. 簡易ログイン（ユーザー名のみでOK）
