import { and, asc, desc, eq } from 'drizzle-orm'
import { tasks } from '~/../../db/schema'
import type {
  CreateTaskRequest,
  NewTask,
  Task,
  TaskFilters,
  TaskListResponse,
  TaskResponse,
  TaskSortOptions,
  UpdateTaskRequest,
} from './task-types'
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

// API クライアント用のヘルパー関数
export class TaskAPIError extends Error {
  constructor(
    public status: number,
    public response: unknown,
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
