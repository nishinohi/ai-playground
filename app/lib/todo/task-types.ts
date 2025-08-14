import type { NewTask as DBNewTask, Task as DBTask } from '~/../../db/schema'

// データベース型の再エクスポート
export type Task = DBTask
export type NewTask = DBNewTask

// フロントエンド用の型定義（厳密な型制約）
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
