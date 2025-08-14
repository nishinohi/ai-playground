# タスク1: データベーススキーマ・マイグレーション

## タスク概要

TODOアプリケーション用のtasksテーブルをD1データベースに追加し、既存のuserテーブルとのリレーションを構築する。

## 全体での位置づけ

- **マイルストーン**: 基盤構築完了
- **依存関係**: なし（並行実行可能）
- **後続タスクへの影響**: 全てのTask関連機能の基盤となる

## 対象ファイル

- `db/schema.ts` - tasksテーブル定義追加
- `migrations/` - 新規マイグレーションファイル

## 実装手順

### 1. tasksテーブルスキーマ定義

`db/schema.ts` に以下の内容を追加：

```typescript
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), // UUID v4
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('not-started'),
  priority: text('priority').notNull().default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...commonTimestamp,
})

// インデックス定義
export const tasksUserIdIndex = index('tasks_user_id_idx').on(tasks.userId)
export const tasksStatusIndex = index('tasks_status_idx').on(tasks.status)
export const tasksDueDateIndex = index('tasks_due_date_idx').on(tasks.dueDate)
```

### 2. 型定義の追加

同ファイル内に型定義を追加：

```typescript
export type TaskStatus = 'not-started' | 'doing' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
```

### 3. マイグレーション生成

```bash
pnpm run db:generate
```

### 4. マイグレーション適用（開発環境）

```bash
pnpm run db:migrate-local
pnpm run db:migrate-local-build
pnpm run db:migrate-dev
```

## 完了条件

### 機能要件

- [x] tasksテーブルが正常に作成される
- [x] userテーブルとの外部キー制約が動作する
- [x] 必要なインデックスが作成される
- [x] 型定義が正しくエクスポートされる

### 品質要件

- [x] TypeScript型エラーが0件
- [x] ESLint/Prettier違反が0件
- [x] マイグレーションが全環境で正常実行される
- [x] 外部キー制約の動作確認

### テスト項目

- [x] テーブル作成の確認
- [x] 外部キー制約テスト（存在しないuserIdでのINSERT失敗）
- [x] カスケード削除テスト（user削除時にtasks削除）
- [x] インデックスの存在確認

## 技術的考慮事項

### セキュリティ

- `userId` による適切なデータ分離
- カスケード削除による整合性保証

### パフォーマンス

- `userId`, `status`, `dueDate` にインデックス設定
- 将来的なクエリパフォーマンスを考慮した設計

### 互換性

- 既存のスキーマ構造（`commonTimestamp`）との整合性
- D1データベースの制約内での実装

## 注意事項

- 既存のテーブルに影響を与えない
- マイグレーション実行順序の確認
- 本番環境での実行前のバックアップ確認

## 成果物

- 更新された `db/schema.ts`
- 新規マイグレーションファイル
- 全開発環境でのマイグレーション適用完了
