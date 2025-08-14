# タスク2: 型定義・バリデーション

## タスク概要

Task関連の型定義、バリデーションスキーマ、およびサービス層の基盤を構築する。API・フロントエンドで共通利用される型安全性とデータ整合性を確保する。

## 全体での位置づけ

- **マイルストーン**: 基盤構築完了
- **依存関係**: タスク1（データベーススキーマ）完了後
- **後続タスクへの影響**: 全API・UIコンポーネントで利用される共通基盤

## 対象ファイル

- `app/lib/todo/task-types.ts` - 型定義（新規作成）
- `app/lib/todo/task-validation.ts` - バリデーション（新規作成）
- `app/lib/todo/task-service.ts` - サービス層（新規作成）

## 実装手順

### 1. 基本型定義の作成

`app/lib/todo/task-types.ts` を作成：

```typescript
import type { Task as DBTask, NewTask as DBNewTask } from '~/../../db/schema'

// データベース型の再エクスポート
export type Task = DBTask
export type NewTask = DBNewTask

// フロントエンド用の型定義
export type TaskStatus = 'not-started' | 'doing' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

// API リクエスト・レスポンス型
export interface CreateTaskRequest {
  title: string
  content: string
  priority?: TaskPriority
  dueDate?: string // ISO 8601 format
}

export interface UpdateTaskRequest {
  title?: string
  content?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
}

export interface TaskListResponse {
  tasks: Task[]
  totalCount: number
}

export interface TaskResponse {
  task: Task
}

// フィルタリング・ソート用の型
export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  dueDateFrom?: string
  dueDateTo?: string
}

export type TaskSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title'
export type SortDirection = 'asc' | 'desc'

export interface TaskSortOptions {
  field: TaskSortField
  direction: SortDirection
}

// エラー型
export interface TaskError {
  field?: string
  message: string
  code: string
}

export interface TaskValidationError {
  errors: TaskError[]
}
```

### 2. バリデーションスキーマの作成

`app/lib/todo/task-validation.ts` を作成：

```typescript
import type { CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority } from './task-types'

// バリデーションエラークラス
export class TaskValidationError extends Error {
  constructor(public errors: Array<{ field?: string; message: string; code: string }>) {
    super('Task validation failed')
    this.name = 'TaskValidationError'
  }
}

// 基本バリデーション関数
export function validateTaskTitle(title: string): string[] {
  const errors: string[] = []

  if (!title || title.trim().length === 0) {
    errors.push('Title is required')
  }

  if (title.length > 200) {
    errors.push('Title must be 200 characters or less')
  }

  return errors
}

export function validateTaskContent(content: string): string[] {
  const errors: string[] = []

  if (!content || content.trim().length === 0) {
    errors.push('Content is required')
  }

  if (content.length > 2000) {
    errors.push('Content must be 2000 characters or less')
  }

  return errors
}

export function validateTaskPriority(priority: string): string[] {
  const errors: string[] = []
  const validPriorities: TaskPriority[] = ['high', 'medium', 'low']

  if (priority && !validPriorities.includes(priority as TaskPriority)) {
    errors.push('Priority must be high, medium, or low')
  }

  return errors
}

export function validateTaskStatus(status: string): string[] {
  const errors: string[] = []
  const validStatuses: TaskStatus[] = ['not-started', 'doing', 'done']

  if (status && !validStatuses.includes(status as TaskStatus)) {
    errors.push('Status must be not-started, doing, or done')
  }

  return errors
}

export function validateDueDate(dueDate: string): string[] {
  const errors: string[] = []

  if (dueDate) {
    const date = new Date(dueDate)
    if (isNaN(date.getTime())) {
      errors.push('Due date must be a valid ISO 8601 date')
    }
  }

  return errors
}

// 複合バリデーション関数
export function validateCreateTaskRequest(request: CreateTaskRequest): TaskValidationError | null {
  const errors: Array<{ field: string; message: string; code: string }> = []

  validateTaskTitle(request.title).forEach((message) => {
    errors.push({ field: 'title', message, code: 'INVALID_TITLE' })
  })

  validateTaskContent(request.content).forEach((message) => {
    errors.push({ field: 'content', message, code: 'INVALID_CONTENT' })
  })

  if (request.priority) {
    validateTaskPriority(request.priority).forEach((message) => {
      errors.push({ field: 'priority', message, code: 'INVALID_PRIORITY' })
    })
  }

  if (request.dueDate) {
    validateDueDate(request.dueDate).forEach((message) => {
      errors.push({ field: 'dueDate', message, code: 'INVALID_DUE_DATE' })
    })
  }

  return errors.length > 0 ? new TaskValidationError(errors) : null
}

export function validateUpdateTaskRequest(request: UpdateTaskRequest): TaskValidationError | null {
  const errors: Array<{ field: string; message: string; code: string }> = []

  if (request.title !== undefined) {
    validateTaskTitle(request.title).forEach((message) => {
      errors.push({ field: 'title', message, code: 'INVALID_TITLE' })
    })
  }

  if (request.content !== undefined) {
    validateTaskContent(request.content).forEach((message) => {
      errors.push({ field: 'content', message, code: 'INVALID_CONTENT' })
    })
  }

  if (request.status !== undefined) {
    validateTaskStatus(request.status).forEach((message) => {
      errors.push({ field: 'status', message, code: 'INVALID_STATUS' })
    })
  }

  if (request.priority !== undefined) {
    validateTaskPriority(request.priority).forEach((message) => {
      errors.push({ field: 'priority', message, code: 'INVALID_PRIORITY' })
    })
  }

  if (request.dueDate !== undefined && request.dueDate !== null) {
    validateDueDate(request.dueDate).forEach((message) => {
      errors.push({ field: 'dueDate', message, code: 'INVALID_DUE_DATE' })
    })
  }

  return errors.length > 0 ? new TaskValidationError(errors) : null
}
```

### 3. サービス層基盤の作成

`app/lib/todo/task-service.ts` を作成：

```typescript
import { eq, and, desc, asc } from 'drizzle-orm'
import { tasks } from '~/../../db/schema'
import type { Task, NewTask, TaskFilters, TaskSortOptions, CreateTaskRequest, UpdateTaskRequest } from './task-types'
import { validateCreateTaskRequest, validateUpdateTaskRequest } from './task-validation'

// UUID生成用のヘルパー関数
function generateTaskId(): string {
  return crypto.randomUUID()
}

// 日付変換ヘルパー
function parseISODate(dateString: string): Date {
  return new Date(dateString)
}

// リクエストからNewTaskへの変換
export function createTaskRequestToNewTask(request: CreateTaskRequest, userId: string): NewTask {
  const validation = validateCreateTaskRequest(request)
  if (validation) {
    throw validation
  }

  return {
    id: generateTaskId(),
    title: request.title.trim(),
    content: request.content.trim(),
    priority: request.priority || 'medium',
    status: 'not-started',
    dueDate: request.dueDate ? parseISODate(request.dueDate) : null,
    userId,
  }
}

// 更新リクエストからの変換
export function updateTaskRequestToPartial(request: UpdateTaskRequest): Partial<Task> {
  const validation = validateUpdateTaskRequest(request)
  if (validation) {
    throw validation
  }

  const update: Partial<Task> = {}

  if (request.title !== undefined) update.title = request.title.trim()
  if (request.content !== undefined) update.content = request.content.trim()
  if (request.status !== undefined) update.status = request.status
  if (request.priority !== undefined) update.priority = request.priority
  if (request.dueDate !== undefined) {
    update.dueDate = request.dueDate ? parseISODate(request.dueDate) : null
  }

  return update
}

// クエリビルダーヘルパー（将来のサービス関数で使用）
export function buildTaskFilters(filters: TaskFilters, userId: string) {
  const conditions = [eq(tasks.userId, userId)]

  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status))
  }

  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority))
  }

  // 日付フィルタリングは後続タスクで実装

  return and(...conditions)
}

export function buildTaskSort(sortOptions: TaskSortOptions) {
  const sortField = tasks[sortOptions.field]
  return sortOptions.direction === 'desc' ? desc(sortField) : asc(sortField)
}
```

## 完了条件

### 機能要件

- [ ] 全型定義が正しくエクスポートされる
- [ ] バリデーション関数が期待通りに動作する
- [ ] サービス層ヘルパー関数が型安全に動作する
- [ ] エラーハンドリングが適切に実装される

### 品質要件

- [ ] TypeScript型エラーが0件
- [ ] ESLint/Prettier違反が0件
- [ ] 全バリデーション関数のテストケース確認
- [ ] 型の循環依存がない

### テスト項目

- [ ] バリデーション成功ケース
- [ ] バリデーション失敗ケース
- [ ] 型変換関数の動作確認
- [ ] エラーメッセージの適切性

## 技術的考慮事項

### 型安全性

- データベース型とAPI型の明確な分離
- 型推論を活用した保守性の向上
- null/undefinedの適切な処理

### パフォーマンス

- バリデーション処理の効率化
- 不要な型変換の回避
- メモリ効率の考慮

### 保守性

- 一箇所での型定義管理
- バリデーションルールの集約
- 拡張性を考慮した設計

## 注意事項

- データベーススキーマとの整合性確保
- フロントエンド・バックエンド間の型共有
- 将来的な機能拡張への対応

## 成果物

- `app/lib/todo/task-types.ts`
- `app/lib/todo/task-validation.ts`
- `app/lib/todo/task-service.ts`
- 全ファイルでのTypeScript型エラー0件確認
