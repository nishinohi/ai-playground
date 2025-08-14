import { and, asc, desc, eq } from 'drizzle-orm'
import { tasks } from '~/../../db/schema'
import type { CreateTaskRequest, NewTask, Task, TaskFilters, TaskSortOptions, UpdateTaskRequest } from './task-types'
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
