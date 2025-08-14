// React Router v7 uses standard Response API
import { count } from 'drizzle-orm'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { tasks } from '~/../../db/schema'
import { getOrCreateAuth } from '~/lib/auth.server'
import { buildTaskFilters, buildTaskSort, createTaskRequestToNewTask } from '~/lib/todo/task-service'
import type {
  CreateTaskRequest,
  TaskFilters,
  TaskListResponse,
  TaskResponse,
  TaskSortOptions,
} from '~/lib/todo/task-types'
import { TaskValidationError } from '~/lib/todo/task-validation'
import { getOrCreateDBClient } from '~/model/d1client.server'

// GET /todos/api/tasks - タスク一覧取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    // 認証チェック
    const auth = getOrCreateAuth(context.cloudflare.env)
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOrCreateDBClient(context.cloudflare.env)
    const url = new URL(request.url)

    // クエリパラメータの解析
    const filters: TaskFilters = {
      status: (url.searchParams.get('status') as TaskFilters['status']) || undefined,
      priority: (url.searchParams.get('priority') as TaskFilters['priority']) || undefined,
      dueDateFrom: url.searchParams.get('dueDateFrom') || undefined,
      dueDateTo: url.searchParams.get('dueDateTo') || undefined,
    }

    const sortOptions: TaskSortOptions = {
      field: (url.searchParams.get('sortField') as TaskSortOptions['field']) || 'createdAt',
      direction: (url.searchParams.get('sortDirection') as TaskSortOptions['direction']) || 'desc',
    }

    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // クエリ構築
    const whereCondition = buildTaskFilters(filters, session.user.id)
    const orderBy = buildTaskSort(sortOptions)

    // データ取得
    const [taskList, totalCountResult] = await Promise.all([
      db.select().from(tasks).where(whereCondition).orderBy(orderBy).limit(limit).offset(offset),
      db.select({ count: count() }).from(tasks).where(whereCondition),
    ])

    const response: TaskListResponse = {
      tasks: taskList,
      totalCount: totalCountResult[0]?.count || 0,
    }

    return Response.json(response)
  } catch (error) {
    console.error('Tasks list error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /todos/api/tasks - タスク作成
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    // 認証チェック
    const auth = getOrCreateAuth(context.cloudflare.env)
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディの解析
    const body = await request.json()
    const createRequest = body as CreateTaskRequest

    // バリデーション・変換
    const newTask = createTaskRequestToNewTask(createRequest, session.user.id)

    // データベース挿入
    const db = getOrCreateDBClient(context.cloudflare.env)
    const [createdTask] = await db.insert(tasks).values(newTask).returning()

    const response: TaskResponse = {
      task: createdTask,
    }

    return Response.json(response, { status: 201 })
  } catch (error) {
    console.error('Task creation error:', error)

    if (error instanceof TaskValidationError) {
      return Response.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      )
    }

    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
