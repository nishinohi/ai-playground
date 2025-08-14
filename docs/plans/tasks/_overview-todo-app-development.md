# TODOアプリケーション開発 - 全体設計書

## アーキテクチャ概要

### 既存システムとの統合ポイント

- **認証**: 既存のBetter-Auth認証システムを活用
- **データベース**: 既存のD1 + Drizzle ORMスタックを拡張
- **UI**: shadcn/ui コンポーネントライブラリとの統一
- **ルーティング**: React Router v7のファイルベースルーティングを活用

### 新規追加コンポーネント

```
/app/routes/todos/                    # TODOアプリケーション専用ルート
├── _index.tsx                        # TODOダッシュボード (メインページ)
├── api.tasks.ts                      # Task CRUD API
└── api.tasks.$taskId.ts             # 個別タスク操作API

/app/components/todo/                 # TODO専用コンポーネント
├── kanban-board.tsx                  # カンバンボード
├── task-card.tsx                     # タスクカード
├── task-dialog.tsx                   # タスク作成・編集ダイアログ
└── task-list.tsx                     # タスクリスト

/app/lib/todo/                        # TODO関連ビジネスロジック
├── task-service.ts                   # タスクサービス層
├── task-validation.ts                # バリデーション
└── task-types.ts                     # 型定義

/db/schema.ts                         # tasksテーブル追加
```

## データ設計

### tasksテーブル設計

```typescript
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), // UUID
  title: text('title').notNull(), // タイトル（必須）
  content: text('content').notNull(), // 内容（必須）
  status: text('status').notNull().default('not-started'), // ステータス
  priority: text('priority').notNull().default('medium'), // 優先度
  dueDate: integer('due_date', { mode: 'timestamp' }), // 期限（オプション）
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...commonTimestamp,
})
```

### ステータス・優先度の型定義

```typescript
export type TaskStatus = 'not-started' | 'doing' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'
```

## タスク分解戦略

### 依存関係の整理

1. **基盤タスク（並行実行可能）**
   - データベーススキーマ追加
   - 型定義・バリデーション
   - 基本UIコンポーネント

2. **API実装タスク（基盤後）**
   - CRUD API実装
   - 認証統合

3. **フロントエンド統合タスク（API後）**
   - ページ実装
   - コンポーネント統合

4. **高度機能タスク（最終段階）**
   - ドラッグ&ドロップ
   - 最適化・品質向上

### 共通処理の識別

#### 1. 認証・セッション管理

- **再利用**: 既存の `app/lib/auth.server.ts` を活用
- **拡張点**: ユーザーセッション取得ヘルパー関数
- **影響**: 全APIルートで共通利用

#### 2. データベースアクセス

- **再利用**: 既存の `app/model/d1client.server.ts` パターン
- **拡張点**: Task専用のサービス層作成
- **影響**: CRUD操作で共通利用

#### 3. バリデーション

- **新規作成**: Task専用バリデーション
- **共通化**: エラーハンドリングパターン
- **影響**: API・フォームで共通利用

#### 4. UIコンポーネント

- **再利用**: shadcn/ui の既存コンポーネント
- **拡張**: TODO専用のカスタムコンポーネント
- **影響**: 全ページで共通利用

## タスク実行順序とマイルストーン

### マイルストーン1: 基盤構築完了

- タスク1: データベーススキーマ・マイグレーション
- タスク2: 型定義・バリデーション
- タスク3: 基本UIコンポーネント

**完了条件**: データベース・型・基本UIが利用可能

### マイルストーン2: API機能完成

- タスク4: Task CRUD API実装
- タスク5: 認証統合・エラーハンドリング

**完了条件**: すべてのAPI操作が認証付きで動作

### マイルストーン3: 基本機能完成

- タスク6: TODOダッシュボードページ
- タスク7: タスク作成・編集機能

**完了条件**: 基本的なCRUD操作がUI経由で実行可能

### マイルストーン4: 高度機能完成

- タスク8: ドラッグ&ドロップ機能
- タスク9: 最適化・品質向上

**完了条件**: 全機能が期待通りに動作

## 品質保証戦略

### 各タスクでの品質チェックポイント

1. **TypeScript型安全性**: 全タスクで型エラー0を維持
2. **ESLint/Prettier**: 全タスクでコード品質ルール準拠
3. **認証セキュリティ**: API関連タスクで認証チェック必須
4. **レスポンシブ対応**: UI関連タスクでモバイル対応確認

### 統合品質チェック

- 全APIの認証・認可動作確認
- 全UIコンポーネントのアクセシビリティ確認
- ブラウザ互換性確認
- パフォーマンス測定

## リスク軽減策

### 技術リスク対策

- **ドラッグ&ドロップ**: 段階的実装（マウス→タッチ対応）
- **SSR統合**: クライアント機能の段階的追加
- **D1制限**: クエリ最適化の事前検討

### 統合リスク対策

- **認証統合**: 既存パターンの厳密な踏襲
- **デザイン統一**: shadcn/ui標準コンポーネントの優先利用
- **マイグレーション**: バックアップ・ロールバック手順の準備

## 注意事項・制約

### 実装上の制約

- 既存の認証フローを変更しない
- 既存のデータベーススキーマに影響を与えない
- shadcn/ui のデザインシステムから逸脱しない

### パフォーマンス制約

- Cloudflare Workers の実行時間制限を考慮
- D1のクエリ数制限を意識した設計
- SSRとクライアントサイド処理のバランス

### セキュリティ制約

- 全API操作で認証チェック必須
- XSS・CSRF対策の継続実装
- SQLインジェクション対策の確実な実装
