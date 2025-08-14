# タスク7: 最適化・品質向上

## タスク概要

TODOアプリケーション全体のパフォーマンス最適化、セキュリティ強化、コード品質向上、エラーハンドリングの改善を行う。本番環境での運用に向けた最終的な品質保証を実施する。

## 全体での位置づけ

- **マイルストーン**: 高度機能完成
- **依存関係**: タスク6（ドラッグ&ドロップ機能）完了後
- **後続タスクへの影響**: なし（最終タスク）

## 対象ファイル

- 全TODO関連ファイルの最適化
- エラーハンドリングの強化
- セキュリティ関連の改善
- パフォーマンス最適化

## 実装手順

### 1. パフォーマンス最適化

#### 1.1 React コンポーネントの最適化

主要コンポーネントにメモ化を適用：

```typescript
// app/components/todo/task-card.tsx の最適化
import { memo } from 'react'

export const TaskCard = memo(
  function TaskCard({ task, onEdit, onDelete, onStatusChange, isDragDisabled = false, className = '' }: TaskCardProps) {
    // 既存の実装...
  },
  (prevProps, nextProps) => {
    // カスタム比較関数で不要な再レンダリングを防ぐ
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.content === nextProps.task.content &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.priority === nextProps.task.priority &&
      prevProps.task.dueDate === nextProps.task.dueDate &&
      prevProps.isDragDisabled === nextProps.isDragDisabled &&
      prevProps.className === nextProps.className
    )
  },
)
```

#### 1.2 useMemo と useCallback の適用

`app/routes/todos/_index.tsx` の最適化：

```typescript
import { useMemo, useCallback } from 'react'

export default function TodosDashboard() {
  // 既存のコード...

  // フィルタリングされたタスクのメモ化
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      if (filters.status && task.status !== filters.status) {
        return false
      }

      if (filters.priority && task.priority !== filters.priority) {
        return false
      }

      return true
    })
  }, [tasks, searchQuery, filters])

  // タスク統計のメモ化
  const taskStats = useMemo(
    () => ({
      total: filteredTasks.length,
      notStarted: filteredTasks.filter((t) => t.status === 'not-started').length,
      doing: filteredTasks.filter((t) => t.status === 'doing').length,
      done: filteredTasks.filter((t) => t.status === 'done').length,
    }),
    [filteredTasks],
  )

  // イベントハンドラーのメモ化
  const handleCreateTask = useCallback(() => {
    setEditingTask(undefined)
    setIsTaskDialogOpen(true)
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setIsTaskDialogOpen(true)
  }, [])

  const handleDeleteTask = useCallback(
    (task: Task) => {
      if (window.confirm(`タスク「${task.title}」を削除しますか？`)) {
        fetcher.submit({ intent: 'delete', taskId: task.id }, { method: 'POST' })
      }
    },
    [fetcher],
  )

  // 既存のコード...
}
```

#### 1.3 データベースクエリの最適化

`app/lib/todo/task-service.ts` の改善：

```typescript
// 日付フィルタリングの追加実装
export function buildTaskFilters(filters: TaskFilters, userId: string) {
  const conditions = [eq(tasks.userId, userId)]

  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status))
  }

  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority))
  }

  if (filters.dueDateFrom) {
    conditions.push(gte(tasks.dueDate, new Date(filters.dueDateFrom)))
  }

  if (filters.dueDateTo) {
    conditions.push(lte(tasks.dueDate, new Date(filters.dueDateTo)))
  }

  return and(...conditions)
}

// ページネーション対応の改善
export async function fetchTasksWithPagination(
  filters?: Partial<TaskFilters>,
  sortOptions?: Partial<TaskSortOptions>,
  pagination?: { limit: number; offset: number },
): Promise<TaskListResponse> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.priority) params.set('priority', filters.priority)
  if (filters?.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom)
  if (filters?.dueDateTo) params.set('dueDateTo', filters.dueDateTo)

  if (sortOptions?.field) params.set('sortField', sortOptions.field)
  if (sortOptions?.direction) params.set('sortDirection', sortOptions.direction)

  if (pagination?.limit) params.set('limit', pagination.limit.toString())
  if (pagination?.offset) params.set('offset', pagination.offset.toString())

  const response = await fetch(`/todos/api/tasks?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new TaskAPIError(response.status, error)
  }

  return response.json()
}
```

### 2. セキュリティ強化

#### 2.1 入力値サニタイゼーションの強化

`app/lib/todo/task-validation.ts` の改善：

```typescript
// HTML エスケープ関数
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

// 改良されたバリデーション関数
export function validateTaskTitle(title: string): string[] {
  const errors: string[] = []
  const sanitized = sanitizeText(title)

  if (!sanitized || sanitized.length === 0) {
    errors.push('Title is required')
  }

  if (sanitized.length > 200) {
    errors.push('Title must be 200 characters or less')
  }

  // 危険なスクリプト検出
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(title)) {
    errors.push('Title contains invalid content')
  }

  return errors
}

export function validateTaskContent(content: string): string[] {
  const errors: string[] = []
  const sanitized = sanitizeText(content)

  if (!sanitized || sanitized.length === 0) {
    errors.push('Content is required')
  }

  if (sanitized.length > 2000) {
    errors.push('Content must be 2000 characters or less')
  }

  // 危険なスクリプト検出
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
    errors.push('Content contains invalid content')
  }

  return errors
}
```

#### 2.2 API レート制限の実装

`app/routes/todos/api.tasks.ts` にレート制限を追加：

```typescript
// レート制限用のシンプルなメモリキャッシュ
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    // レート制限チェック
    if (!checkRateLimit(session.user.id)) {
      return json({ error: 'Too many requests' }, { status: 429 })
    }

    // 既存のロジック...
  } catch (error) {
    // エラーハンドリング...
  }
}
```

### 3. エラーハンドリングの改善

#### 3.1 共通エラーコンポーネントの作成

`app/components/common/error-boundary.tsx` を作成：

```typescript
import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '~/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // 本番環境では外部エラー追跡サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // 例: Sentry.captureException(error)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">申し訳ありません</h2>
          <p className="text-gray-600 mb-4">
            予期しないエラーが発生しました。ページを再読み込みしてお試しください。
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            ページを再読み込み
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

#### 3.2 ネットワークエラーの改善処理

`app/lib/todo/task-service.ts` の改善：

```typescript
// 再試行機能付きのFetch関数
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3, delay = 1000): Promise<Response> {
  let lastError: Error

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, options)

      // 5xx エラーの場合は再試行
      if (response.status >= 500 && i < maxRetries) {
        throw new Error(`Server error: ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error as Error

      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError!
}

// 改良されたAPI関数
export async function fetchTasks(
  filters?: Partial<TaskFilters>,
  sortOptions?: Partial<TaskSortOptions>,
): Promise<TaskListResponse> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.priority) params.set('priority', filters.priority)
  if (filters?.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom)
  if (filters?.dueDateTo) params.set('dueDateTo', filters.dueDateTo)

  if (sortOptions?.field) params.set('sortField', sortOptions.field)
  if (sortOptions?.direction) params.set('sortDirection', sortOptions.direction)

  try {
    const response = await fetchWithRetry(`/todos/api/tasks?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new TaskAPIError(response.status, error, `API Error: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof TaskAPIError) {
      throw error
    }

    // ネットワークエラーの場合
    throw new TaskAPIError(0, { message: 'Network error' }, 'ネットワークエラーが発生しました')
  }
}
```

### 4. コード品質の向上

#### 4.1 型安全性の強化

各ファイルで厳密な型チェックを追加：

```typescript
// app/lib/todo/task-types.ts に厳密な型を追加
export const TASK_STATUSES = ['not-started', 'doing', 'done'] as const
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

// 型ガード関数
export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus)
}

export function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority)
}

// API レスポンスの型安全性
export interface APIResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export function createSuccessResponse<T>(data: T): APIResponse<T> {
  return { data, success: true }
}

export function createErrorResponse(error: string): APIResponse<never> {
  return { error, success: false }
}
```

#### 4.2 ログ機能の追加

`app/lib/logger.ts` を作成：

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    }

    if (this.isDevelopment) {
      console[level === 'debug' ? 'log' : level](`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '')
    }

    // 本番環境では外部ログサービスに送信
    if (!this.isDevelopment && level === 'error') {
      // 例: 外部ログサービスAPI呼び出し
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }
}

export const logger = new Logger()
```

### 5. 最終テストと品質チェック

#### 5.1 E2Eテスト用のヘルパー追加

`app/utils/test-helpers.ts` を作成：

```typescript
import type { Task, CreateTaskRequest, TaskStatus } from '~/lib/todo/task-types'

// テスト用のダミーデータ生成
export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    title: 'テストタスク',
    content: 'テスト用のタスク内容',
    status: 'not-started',
    priority: 'medium',
    dueDate: null,
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockTaskRequest(overrides?: Partial<CreateTaskRequest>): CreateTaskRequest {
  return {
    title: 'テストタスク',
    content: 'テスト用のタスク内容',
    priority: 'medium',
    ...overrides,
  }
}

// ローカル環境での動作確認用
export async function seedTestData() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const testTasks: CreateTaskRequest[] = [
    {
      title: 'サンプルタスク 1',
      content: 'これは未着手のサンプルタスクです。',
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'サンプルタスク 2',
      content: 'これは着手中のサンプルタスクです。',
      priority: 'medium',
    },
    {
      title: '完了済みタスク',
      content: 'これは完了済みのサンプルタスクです。',
      priority: 'low',
    },
  ]

  // 実際のシード処理はここに実装
  console.log('Test data seeded:', testTasks)
}
```

## 完了条件

### パフォーマンス要件

- [x] React コンポーネントの適切なメモ化
- [x] データベースクエリの最適化
- [x] 100タスク以上でのスムーズな動作
- [x] 初期ロード時間2秒以内
- [x] ドラッグ&ドロップ操作のレスポンス向上

### セキュリティ要件

- [x] XSS攻撃対策の実装
- [x] SQLインジェクション対策の確認
- [x] CSRF保護の動作確認
- [x] レート制限の実装
- [x] 入力値サニタイゼーションの実装

### エラーハンドリング要件

- [x] 適切なエラーバウンダリの設置
- [x] ネットワークエラーの適切な処理
- [x] ユーザーフレンドリーなエラーメッセージ
- [x] ログ機能の実装
- [x] 再試行機能の実装

### コード品質要件

- [x] TypeScript型エラーが0件
- [x] ESLint/Prettier違反が0件
- [x] 適切なコメント・ドキュメント
- [x] コードカバレッジの確認
- [x] デッドコードの削除

### 動作確認要件

- [x] 全ブラウザでの動作確認
- [x] モバイルデバイスでの動作確認
- [x] 高負荷時の動作確認
- [x] セキュリティスキャンの実行
- [x] アクセシビリティテストの実行

## 技術的考慮事項

### パフォーマンス

- React の最適化パターンの適用
- データベースインデックスの活用
- 適切なキャッシュ戦略
- バンドルサイズの最適化

### セキュリティ

- OWASP Top 10 の対策確認
- 認証・認可の適切な実装
- データの適切な暗号化
- ログ・監査機能の実装

### 保守性

- 適切なコード構造
- 十分なテストカバレッジ
- ドキュメントの整備
- CI/CD パイプラインの準備

## 注意事項

- 既存機能を壊さない慎重な最適化
- 本番環境での動作を考慮した実装
- ユーザー体験を損なわない改善
- 将来的な拡張性の確保

## 成果物

- 最適化されたすべてのTODO関連ファイル
- エラーハンドリングの強化
- セキュリティ機能の実装
- パフォーマンステストレポート
- セキュリティスキャンレポート
- 本番リリース準備完了の確認
