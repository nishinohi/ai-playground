# タスク4: Task CRUD API実装

## タスク概要

タスクの作成、読み取り、更新、削除を行うRESTful APIを実装する。認証統合、バリデーション、エラーハンドリングを含む完全なCRUD機能を提供する。

## 全体での位置づけ

- **マイルストーン**: API機能完成
- **依存関係**: タスク1（データベーススキーマ）、タスク2（型定義・バリデーション）完了後
- **後続タスクへの影響**: 全フロントエンド機能で利用されるAPI基盤

## 対象ファイル

- `app/routes/todos/api.tasks.ts` - Tasks一覧・作成API（新規作成）
- `app/routes/todos/api.tasks.$taskId.ts` - 個別Task操作API（新規作成）

## 実装手順

### 1. Tasks一覧・作成API の実装

`app/routes/todos/api.tasks.ts` を作成：

```typescript
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@react-router/dev/routes'
import { json } from '@react-router/node'
import { eq, desc } from 'drizzle-orm'
import { auth } from '~/lib/auth.server'
import { getD1Client } from '~/model/d1client.server'
import { tasks } from '~/../../db/schema'
import type {
  CreateTaskRequest,
  TaskListResponse,
  TaskResponse,
  TaskFilters,
  TaskSortOptions,
} from '~/lib/todo/task-types'
import { createTaskRequestToNewTask, buildTaskFilters, buildTaskSort } from '~/lib/todo/task-service'
import { TaskValidationError } from '~/lib/todo/task-validation'

// GET /todos/api/tasks - タスク一覧取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    // 認証チェック
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getD1Client(context.cloudflare.env.DB)
    const url = new URL(request.url)

    // クエリパラメータの解析
    const filters: TaskFilters = {
      status: (url.searchParams.get('status') as any) || undefined,
      priority: (url.searchParams.get('priority') as any) || undefined,
      dueDateFrom: url.searchParams.get('dueDateFrom') || undefined,
      dueDateTo: url.searchParams.get('dueDateTo') || undefined,
    }

    const sortOptions: TaskSortOptions = {
      field: (url.searchParams.get('sortField') as any) || 'createdAt',
      direction: (url.searchParams.get('sortDirection') as any) || 'desc',
    }

    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // クエリ構築
    const whereCondition = buildTaskFilters(filters, session.user.id)
    const orderBy = buildTaskSort(sortOptions)

    // データ取得
    const [taskList, totalCountResult] = await Promise.all([
      db.select().from(tasks).where(whereCondition).orderBy(orderBy).limit(limit).offset(offset),
      db.select({ count: 'count(*)' }).from(tasks).where(whereCondition),
    ])

    const response: TaskListResponse = {
      tasks: taskList,
      totalCount: totalCountResult[0]?.count || 0,
    }

    return json(response)
  } catch (error) {
    console.error('Tasks list error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /todos/api/tasks - タスク作成
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    // 認証チェック
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディの解析
    const body = await request.json()
    const createRequest = body as CreateTaskRequest

    // バリデーション・変換
    const newTask = createTaskRequestToNewTask(createRequest, session.user.id)

    // データベース挿入
    const db = getD1Client(context.cloudflare.env.DB)
    const [createdTask] = await db.insert(tasks).values(newTask).returning()

    const response: TaskResponse = {
      task: createdTask,
    }

    return json(response, { status: 201 })
  } catch (error) {
    console.error('Task creation error:', error)

    if (error instanceof TaskValidationError) {
      return json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      )
    }

    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON' }, { status: 400 })
    }

    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 2. 個別Task操作API の実装

`app/routes/todos/api.tasks.$taskId.ts` を作成：

```typescript
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@react-router/dev/routes'
import { json } from '@react-router/node'
import { eq, and } from 'drizzle-orm'
import { auth } from '~/lib/auth.server'
import { getD1Client } from '~/model/d1client.server'
import { tasks } from '~/../../db/schema'
import type { UpdateTaskRequest, TaskResponse } from '~/lib/todo/task-types'
import { updateTaskRequestToPartial } from '~/lib/todo/task-service'
import { TaskValidationError } from '~/lib/todo/task-validation'

// ヘルパー関数: タスクの存在・所有権チェック
async function getTaskByIdAndUserId(taskId: string, userId: string, db: any) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)

  return task || null
}

// GET /todos/api/tasks/:taskId - 個別タスク取得
export async function loader({ params, context, request }: LoaderFunctionArgs) {
  try {
    // 認証チェック
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.taskId
    if (!taskId) {
      return json({ error: 'Task ID is required' }, { status: 400 })
    }

    // タスク取得
    const db = getD1Client(context.cloudflare.env.DB)
    const task = await getTaskByIdAndUserId(taskId, session.user.id, db)

    if (!task) {
      return json({ error: 'Task not found' }, { status: 404 })
    }

    const response: TaskResponse = {
      task,
    }

    return json(response)
  } catch (error) {
    console.error('Task get error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /todos/api/tasks/:taskId - タスク更新
// DELETE /todos/api/tasks/:taskId - タスク削除
export async function action({ params, request, context }: ActionFunctionArgs) {
  try {
    // 認証チェック
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.taskId
    if (!taskId) {
      return json({ error: 'Task ID is required' }, { status: 400 })
    }

    const db = getD1Client(context.cloudflare.env.DB)

    // タスク存在・所有権チェック
    const existingTask = await getTaskByIdAndUserId(taskId, session.user.id, db)
    if (!existingTask) {
      return json({ error: 'Task not found' }, { status: 404 })
    }

    // メソッド別処理
    if (request.method === 'PUT') {
      // タスク更新
      const body = await request.json()
      const updateRequest = body as UpdateTaskRequest

      // バリデーション・変換
      const updateData = updateTaskRequestToPartial(updateRequest)

      // データベース更新
      const [updatedTask] = await db
        .update(tasks)
        .set(updateData)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)))
        .returning()

      const response: TaskResponse = {
        task: updatedTask,
      }

      return json(response)
    } else if (request.method === 'DELETE') {
      // タスク削除
      await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)))

      return json({ success: true })
    } else {
      return json({ error: 'Method not allowed' }, { status: 405 })
    }
  } catch (error) {
    console.error('Task action error:', error)

    if (error instanceof TaskValidationError) {
      return json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      )
    }

    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON' }, { status: 400 })
    }

    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 3. APIクライアント用ヘルパー関数の追加

`app/lib/todo/task-service.ts` に追加：

```typescript
// 既存のファイルに以下を追加

// API クライアント用のヘルパー関数
export class TaskAPIError extends Error {
  constructor(
    public status: number,
    public response: any,
    message?: string,
  ) {
    super(message || `API Error: ${status}`)
    this.name = 'TaskAPIError'
  }
}

// API クライアント関数（フロントエンドから使用）
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

  const response = await fetch(`/todos/api/tasks?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new TaskAPIError(response.status, error)
  }

  return response.json()
}

export async function createTask(data: CreateTaskRequest): Promise<TaskResponse> {
  const response = await fetch('/todos/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new TaskAPIError(response.status, error)
  }

  return response.json()
}

export async function updateTask(taskId: string, data: UpdateTaskRequest): Promise<TaskResponse> {
  const response = await fetch(`/todos/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new TaskAPIError(response.status, error)
  }

  return response.json()
}

export async function deleteTask(taskId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/todos/api/tasks/${taskId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new TaskAPIError(response.status, error)
  }

  return response.json()
}

export async function getTask(taskId: string): Promise<TaskResponse> {
  const response = await fetch(`/todos/api/tasks/${taskId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new TaskAPIError(response.status, error)
  }

  return response.json()
}
```

## 完了条件

### 機能要件

- [x] GET /todos/api/tasks でタスク一覧取得が動作
- [x] POST /todos/api/tasks でタスク作成が動作
- [x] GET /todos/api/tasks/:id で個別タスク取得が動作
- [x] PUT /todos/api/tasks/:id でタスク更新が動作
- [x] DELETE /todos/api/tasks/:id でタスク削除が動作

### 認証・認可要件

- [x] 全エンドポイントで認証チェックが動作
- [x] ユーザーは自分のタスクのみアクセス可能
- [x] 認証エラー時に適切なレスポンス

### バリデーション要件

- [x] 作成・更新時のバリデーションが動作
- [x] バリデーションエラー時の適切なレスポンス
- [x] 不正なパラメータの適切な処理

### エラーハンドリング要件

- [x] 400, 401, 404, 405, 500 エラーの適切な処理
- [x] エラーレスポンスの一貫性
- [x] ログ出力の適切性

### 品質要件

- [x] TypeScript型エラーが0件
- [x] ESLint/Prettier違反が0件
- [x] 全エンドポイントの動作確認
- [x] セキュリティチェック（SQLインジェクション対策等）

## 技術的考慮事項

### セキュリティ

- Better-Auth認証システムとの適切な統合
- ユーザーデータの適切な分離
- SQLインジェクション対策の確実な実装
- 入力データの適切なサニタイゼーション

### パフォーマンス

- 適切なインデックス利用
- N+1クエリの回避
- ページネーションの効率的実装
- キャッシュ戦略の検討

### エラーハンドリング

- 一貫したエラーレスポンス形式
- 適切なHTTPステータスコード
- デバッグ用のログ出力
- ユーザー向けのエラーメッセージ

### 拡張性

- フィルタリング・ソート機能の拡張可能性
- ページネーション機能
- 将来的なAPI機能追加への対応

## 注意事項

- 既存認証システムとの互換性確保
- データベース接続の適切な管理
- トランザクション処理の検討
- API レスポンス形式の一貫性

## 成果物

- `app/routes/todos/api.tasks.ts`
- `app/routes/todos/api.tasks.$taskId.ts`
- `app/lib/todo/task-service.ts` への追加
- 全APIエンドポイントの動作確認完了
