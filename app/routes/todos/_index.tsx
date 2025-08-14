import { Plus, Search } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { redirect, useActionData, useFetcher, useLoaderData, useNavigation } from 'react-router'
import { KanbanBoard } from '~/components/todo/kanban-board'
import { TaskDialog } from '~/components/todo/task-dialog'
import { TaskList } from '~/components/todo/task-list'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { getOrCreateAuth } from '~/lib/auth.server'
import { createTaskInDB, deleteTaskInDB, fetchTasksFromDB, TaskAPIError, updateTaskInDB } from '~/lib/todo/task-service'
import type {
  CreateTaskRequest,
  Task,
  TaskFilters,
  TaskPriority,
  TaskStatus,
  UpdateTaskRequest,
} from '~/lib/todo/task-types'
import { getOrCreateDBClient } from '~/model/d1client.server'

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
  const auth = getOrCreateAuth(context.cloudflare.env)
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user?.id) {
    return redirect('/login')
  }

  try {
    // クエリパラメータからフィルター条件を取得
    const url = new URL(request.url)
    const filters: TaskFilters = {
      status: (url.searchParams.get('status') as TaskStatus) || undefined,
      priority: (url.searchParams.get('priority') as TaskPriority) || undefined,
      dueDateFrom: url.searchParams.get('dueDateFrom') || undefined,
      dueDateTo: url.searchParams.get('dueDateTo') || undefined,
    }

    // データベースクライアントを取得
    const db = getOrCreateDBClient(context.cloudflare.env)

    // タスク一覧を取得（サーバーサイドで直接データベースアクセス）
    const tasksResponse = await fetchTasksFromDB(db, session.user.id, filters, {
      field: 'createdAt',
      direction: 'desc',
    })

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

    return Response.json(loaderData)
  } catch (error) {
    console.error('Dashboard loader error:', error)
    throw new Response('Failed to load tasks', { status: 500 })
  }
}

// Action: フォーム送信の処理
export async function action({ request, context }: ActionFunctionArgs) {
  // 認証チェック
  const auth = getOrCreateAuth(context.cloudflare.env)
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const db = getOrCreateDBClient(context.cloudflare.env)

  try {
    switch (intent) {
      case 'create': {
        const data: CreateTaskRequest = {
          title: formData.get('title') as string,
          content: formData.get('content') as string,
          priority: (formData.get('priority') as TaskPriority) || 'medium',
          dueDate: (formData.get('dueDate') as string) || undefined,
        }

        const result = await createTaskInDB(db, session.user.id, data)
        return Response.json({ success: true, task: result.task })
      }

      case 'update': {
        const taskId = formData.get('taskId') as string
        const data: UpdateTaskRequest = {
          title: (formData.get('title') as string) || undefined,
          content: (formData.get('content') as string) || undefined,
          status: (formData.get('status') as TaskStatus) || undefined,
          priority: (formData.get('priority') as TaskPriority) || undefined,
          dueDate: (formData.get('dueDate') as string) || undefined,
        }

        const result = await updateTaskInDB(db, taskId, session.user.id, data)
        return Response.json({ success: true, task: result.task })
      }

      case 'delete': {
        const taskId = formData.get('taskId') as string
        await deleteTaskInDB(db, taskId, session.user.id)
        return Response.json({ success: true })
      }

      default:
        return Response.json({ error: 'Invalid intent' }, { status: 400 })
    }
  } catch (error) {
    console.error('Dashboard action error:', error)

    if (error instanceof TaskAPIError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export default function TodosDashboard() {
  const { tasks, totalCount: _totalCount, user, filters: initialFilters } = useLoaderData<LoaderData>()
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
  const _isLoading = navigation.state === 'loading' || fetcher.state === 'loading'
  const isSubmitting = navigation.state === 'submitting' || fetcher.state === 'submitting'

  // フィルタリングされたタスク
  const filteredTasks = tasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !task.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  // タスク統計
  const taskStats = {
    total: filteredTasks.length,
    notStarted: filteredTasks.filter((t) => t.status === 'not-started').length,
    doing: filteredTasks.filter((t) => t.status === 'doing').length,
    done: filteredTasks.filter((t) => t.status === 'done').length,
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

  const handleDeleteTask = useCallback(
    (task: Task) => {
      if (window.confirm(`タスク「${task.title}」を削除しますか？`)) {
        fetcher.submit({ intent: 'delete', taskId: task.id }, { method: 'POST' })
      }
    },
    [fetcher],
  )

  const handleStatusChange = useCallback(
    (task: Task, newStatus: TaskStatus) => {
      fetcher.submit(
        {
          intent: 'update',
          taskId: task.id,
          status: newStatus,
        },
        { method: 'POST' },
      )
    },
    [fetcher],
  )

  const handleTaskSubmit = useCallback(
    (data: CreateTaskRequest | UpdateTaskRequest) => {
      if (editingTask) {
        // 更新
        fetcher.submit(
          {
            intent: 'update',
            taskId: editingTask.id,
            ...data,
          },
          { method: 'POST' },
        )
      } else {
        // 作成
        fetcher.submit(
          {
            intent: 'create',
            ...data,
          },
          { method: 'POST' },
        )
      }
      setIsTaskDialogOpen(false)
    },
    [editingTask, fetcher],
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">TODO Dashboard</h1>
          <p className="text-gray-600">ようこそ、{user.name}さん</p>
        </div>

        <Button onClick={handleCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新しいタスク
        </Button>
      </div>

      {/* 統計表示 */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">総タスク数</div>
          <div className="text-2xl font-bold">{taskStats.total}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">未着手</div>
          <div className="text-2xl font-bold text-blue-600">{taskStats.notStarted}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">着手中</div>
          <div className="text-2xl font-bold text-orange-600">{taskStats.doing}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">完了</div>
          <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="タスクを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value === 'all' ? undefined : (value as TaskStatus) }))
            }
          >
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

          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, priority: value === 'all' ? undefined : (value as TaskPriority) }))
            }
          >
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
        <div className="fixed right-4 bottom-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {actionData.error}
        </div>
      )}

      {/* 成功メッセージ */}
      {actionData?.success && (
        <div className="fixed right-4 bottom-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
          操作が完了しました
        </div>
      )}
    </div>
  )
}
