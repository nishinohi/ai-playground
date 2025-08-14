import { and, eq } from 'drizzle-orm'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { tasks } from '~/../../db/schema'
import { getOrCreateAuth } from '~/lib/auth.server'
import { updateTaskRequestToPartial } from '~/lib/todo/task-service'
import type { TaskResponse, UpdateTaskRequest } from '~/lib/todo/task-types'
import { TaskValidationError } from '~/lib/todo/task-validation'
import { getOrCreateDBClient } from '~/model/d1client.server'

// ヘルパー関数: タスクの存在・所有権チェック
async function getTaskByIdAndUserId(taskId: string, userId: string, db: ReturnType<typeof getOrCreateDBClient>) {
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
    const auth = getOrCreateAuth(context.cloudflare.env)
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.taskId
    if (!taskId) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // タスク取得
    const db = getOrCreateDBClient(context.cloudflare.env)
    const task = await getTaskByIdAndUserId(taskId, session.user.id, db)

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
    }

    const response: TaskResponse = {
      task,
    }

    return Response.json(response)
  } catch (error) {
    console.error('Task get error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /todos/api/tasks/:taskId - タスク更新
// DELETE /todos/api/tasks/:taskId - タスク削除
export async function action({ params, request, context }: ActionFunctionArgs) {
  try {
    // 認証チェック
    const auth = getOrCreateAuth(context.cloudflare.env)
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.taskId
    if (!taskId) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const db = getOrCreateDBClient(context.cloudflare.env)

    // タスク存在・所有権チェック
    const existingTask = await getTaskByIdAndUserId(taskId, session.user.id, db)
    if (!existingTask) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
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

      return Response.json(response)
    } else if (request.method === 'DELETE') {
      // タスク削除
      await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)))

      return Response.json({ success: true })
    } else {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  } catch (error) {
    console.error('Task action error:', error)

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
