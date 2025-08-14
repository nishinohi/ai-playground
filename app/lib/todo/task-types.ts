import type { NewTask as DBNewTask, Task as DBTask } from '~/../../db/schema'

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
