# タスク5: TODOダッシュボードページ

## タスク概要

TODOアプリケーションのメインページとなるダッシュボードを実装する。カンバンボード形式でのタスク表示、タスク作成・編集機能、基本的なCRUD操作をUIで提供する。

## 全体での位置づけ

- **マイルストーン**: 基本機能完成
- **依存関係**: タスク3（基本UIコンポーネント）、タスク4（CRUD API）完了後
- **後続タスクへの影響**: ドラッグ&ドロップ機能の追加対象ページ

## 対象ファイル

- `app/routes/todos/_index.tsx` - TODOダッシュボードページ（新規作成）

## 実装手順

### 1. TODOダッシュボードページの実装

`app/routes/todos/_index.tsx` を作成：

```typescript
import { useState, useCallback } from 'react'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@react-router/dev/routes'
import { json, redirect } from '@react-router/node'
import { useLoaderData, useActionData, useFetcher, useNavigation } from '@react-router/react'
import { Plus, Filter, Search } from 'lucide-react'
import { auth } from '~/lib/auth.server'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { KanbanBoard } from '~/components/todo/kanban-board'
import { TaskDialog } from '~/components/todo/task-dialog'
import { TaskList } from '~/components/todo/task-list'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
  TaskListResponse
} from '~/lib/todo/task-types'
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  TaskAPIError
} from '~/lib/todo/task-service'

interface LoaderData {
  tasks: Task[]
  totalCount: number
  user: { id: string; name: string; email: string }
  filters: TaskFilters
}

interface ActionData {
  success?: boolean
  error?: string
  task?: Task
}

// Loader: 初期データの取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  // 認証チェック
  const session = await auth.api.getSession({
    headers: request.headers
  })

  if (!session?.user?.id) {
    return redirect('/login')
  }

  try {
    // クエリパラメータから フィルター条件を取得
    const url = new URL(request.url)
    const filters: TaskFilters = {
      status: url.searchParams.get('status') as TaskStatus || undefined,
      priority: url.searchParams.get('priority') as TaskPriority || undefined,
      dueDateFrom: url.searchParams.get('dueDateFrom') || undefined,
      dueDateTo: url.searchParams.get('dueDateTo') || undefined,
    }

    // タスク一覧を取得（APIを直接呼ぶ代わりにサーバーサイドで処理）
    const tasksResponse = await fetchTasks(filters, { field: 'createdAt', direction: 'desc' })

    const loaderData: LoaderData = {
      tasks: tasksResponse.tasks,
      totalCount: tasksResponse.totalCount,
      user: {
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
      },
      filters,
    }

    return json(loaderData)

  } catch (error) {
    console.error('Dashboard loader error:', error)
    throw new Response('Failed to load tasks', { status: 500 })
  }
}

// Action: フォーム送信の処理
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent') as string

  try {
    switch (intent) {
      case 'create': {
        const data: CreateTaskRequest = {
          title: formData.get('title') as string,
          content: formData.get('content') as string,
          priority: (formData.get('priority') as TaskPriority) || 'medium',
          dueDate: formData.get('dueDate') as string || undefined,
        }

        const result = await createTask(data)
        return json({ success: true, task: result.task })
      }

      case 'update': {
        const taskId = formData.get('taskId') as string
        const data: UpdateTaskRequest = {
          title: formData.get('title') as string || undefined,
          content: formData.get('content') as string || undefined,
          status: formData.get('status') as TaskStatus || undefined,
          priority: formData.get('priority') as TaskPriority || undefined,
          dueDate: formData.get('dueDate') as string || undefined,
        }

        const result = await updateTask(taskId, data)
        return json({ success: true, task: result.task })
      }

      case 'delete': {
        const taskId = formData.get('taskId') as string
        await deleteTask(taskId)
        return json({ success: true })
      }

      default:
        return json({ error: 'Invalid intent' }, { status: 400 })
    }

  } catch (error) {
    console.error('Dashboard action error:', error)

    if (error instanceof TaskAPIError) {
      return json({ error: error.message }, { status: error.status })
    }

    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

export default function TodosDashboard() {
  const { tasks, totalCount, user, filters: initialFilters } = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()
  const navigation = useNavigation()
  const fetcher = useFetcher()

  // 状態管理
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TaskFilters>(initialFilters)

  // ローディング状態
  const isLoading = navigation.state === 'loading' || fetcher.state === 'loading'
  const isSubmitting = navigation.state === 'submitting' || fetcher.state === 'submitting'

  // フィルタリングされたタスク
  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // タスク統計
  const taskStats = {
    total: filteredTasks.length,
    notStarted: filteredTasks.filter(t => t.status === 'not-started').length,
    doing: filteredTasks.filter(t => t.status === 'doing').length,
    done: filteredTasks.filter(t => t.status === 'done').length,
  }

  // イベントハンドラー
  const handleCreateTask = useCallback(() => {
    setEditingTask(undefined)
    setIsTaskDialogOpen(true)
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setIsTaskDialogOpen(true)
  }, [])

  const handleDeleteTask = useCallback((task: Task) => {
    if (window.confirm(`タスク「${task.title}」を削除しますか？`)) {
      fetcher.submit(
        { intent: 'delete', taskId: task.id },
        { method: 'POST' }
      )
    }
  }, [fetcher])

  const handleStatusChange = useCallback((task: Task, newStatus: TaskStatus) => {
    fetcher.submit(
      {
        intent: 'update',
        taskId: task.id,
        status: newStatus
      },
      { method: 'POST' }
    )
  }, [fetcher])

  const handleTaskSubmit = useCallback((data: CreateTaskRequest | UpdateTaskRequest) => {
    if (editingTask) {
      // 更新
      fetcher.submit(
        {
          intent: 'update',
          taskId: editingTask.id,
          ...data
        },
        { method: 'POST' }
      )
    } else {
      // 作成
      fetcher.submit(
        {
          intent: 'create',
          ...data
        },
        { method: 'POST' }
      )
    }
    setIsTaskDialogOpen(false)
  }, [editingTask, fetcher])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">TODO Dashboard</h1>
          <p className="text-gray-600">ようこそ、{user.name}さん</p>
        </div>

        <Button onClick={handleCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新しいタスク
        </Button>
      </div>

      {/* 統計表示 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">総タスク数</div>
          <div className="text-2xl font-bold">{taskStats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">未着手</div>
          <div className="text-2xl font-bold text-blue-600">{taskStats.notStarted}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">着手中</div>
          <div className="text-2xl font-bold text-orange-600">{taskStats.doing}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">完了</div>
          <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="タスクを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={filters.status || 'all'} onValueChange={(value) =>
            setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as TaskStatus }))
          }>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="not-started">未着手</SelectItem>
              <SelectItem value="doing">着手中</SelectItem>
              <SelectItem value="done">完了</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.priority || 'all'} onValueChange={(value) =>
            setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value as TaskPriority }))
          }>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 表示モード切り替え */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'kanban' | 'list')} className="mb-6">
        <TabsList>
          <TabsTrigger value="kanban">カンバンボード</TabsTrigger>
          <TabsTrigger value="list">リスト表示</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskEdit={handleEditTask}
            onTaskDelete={handleDeleteTask}
            onTaskStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="list">
          <TaskList
            tasks={filteredTasks}
            onTaskEdit={handleEditTask}
            onTaskDelete={handleDeleteTask}
            onTaskStatusChange={handleStatusChange}
          />
        </TabsContent>
      </Tabs>

      {/* タスク作成・編集ダイアログ */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        task={editingTask}
        onSubmit={handleTaskSubmit}
        isLoading={isSubmitting}
      />

      {/* エラー表示 */}
      {actionData?.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {actionData.error}
        </div>
      )}

      {/* 成功メッセージ */}
      {actionData?.success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          操作が完了しました
        </div>
      )}
    </div>
  )
}
```

## 完了条件

### 機能要件

- [ ] カンバンボード表示が正常に動作
- [ ] リスト表示が正常に動作
- [ ] タスク作成ダイアログが動作
- [ ] タスク編集ダイアログが動作
- [ ] タスク削除機能が動作
- [ ] ステータス変更機能が動作
- [ ] 検索機能が動作
- [ ] フィルタリング機能が動作

### 認証要件

- [ ] 未認証ユーザーはログインページにリダイレクト
- [ ] 認証済みユーザーのみがダッシュボードにアクセス可能
- [ ] ユーザー自身のタスクのみ表示・操作可能

### UI/UX要件

- [ ] レスポンシブデザインが適用
- [ ] ローディング状態の適切な表示
- [ ] エラーメッセージの適切な表示
- [ ] 成功メッセージの適切な表示
- [ ] 統計情報の正確な表示

### 品質要件

- [ ] TypeScript型エラーが0件
- [ ] ESLint/Prettier違反が0件
- [ ] 全操作の動作確認
- [ ] エラーハンドリングの適切性

## 技術的考慮事項

### パフォーマンス

- React Router v7のSSR機能を活用した初期表示の最適化
- useFetcher を使用した楽観的更新
- 適切な状態管理による不要な再レンダリングの防止

### ユーザビリティ

- 直感的な操作フロー
- 適切なフィードバック（ローディング、成功、エラー）
- 検索・フィルタリングによる効率的なタスク管理

### セキュリティ

- サーバーサイドでの認証チェック
- CSRF保護（React Routerの標準機能）
- ユーザーデータの適切な分離

### 拡張性

- ドラッグ&ドロップ機能追加への対応
- 追加フィルター・ソート機能への対応
- カスタムビュー機能への対応

## 注意事項

- 既存の認証フローとの互換性確保
- API レスポンスの適切なエラーハンドリング
- ユーザー体験の一貫性保持
- 将来的な機能拡張への配慮

## 成果物

- `app/routes/todos/_index.tsx`
- 全機能の動作確認完了
- 認証統合の確認完了
- レスポンシブデザインの確認完了
