import type { CreateTaskRequest, TaskPriority, TaskStatus, UpdateTaskRequest } from './task-types'

// バリデーションエラークラス
export class TaskValidationError extends Error {
  constructor(public errors: Array<{ field?: string; message: string; code: string }>) {
    super('Task validation failed')
    this.name = 'TaskValidationError'
  }
}

// セキュリティ: HTMLエスケープ関数
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

// セキュリティ: 危険なスクリプト検出
function containsMaliciousScript(text: string): boolean {
  // スクリプトタグの検出
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(text)) {
    return true
  }

  // インラインイベントハンドラーの検出
  if (/on\w+\s*=/i.test(text)) {
    return true
  }

  // javascript: プロトコルの検出
  if (/javascript\s*:/i.test(text)) {
    return true
  }

  return false
}

// セキュリティ強化されたバリデーション関数
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
  if (containsMaliciousScript(title)) {
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
  if (containsMaliciousScript(content)) {
    errors.push('Content contains invalid content')
  }

  return errors
}

export function validateTaskPriority(priority: string): string[] {
  const errors: string[] = []
  const validPriorities: TaskPriority[] = ['high', 'medium', 'low']

  if (priority && !validPriorities.includes(priority as TaskPriority)) {
    errors.push('Priority must be high, medium, or low')
  }

  return errors
}

export function validateTaskStatus(status: string): string[] {
  const errors: string[] = []
  const validStatuses: TaskStatus[] = ['not-started', 'doing', 'done']

  if (status && !validStatuses.includes(status as TaskStatus)) {
    errors.push('Status must be not-started, doing, or done')
  }

  return errors
}

export function validateDueDate(dueDate: string): string[] {
  const errors: string[] = []

  if (dueDate) {
    const date = new Date(dueDate)
    if (isNaN(date.getTime())) {
      errors.push('Due date must be a valid ISO 8601 date')
    }
  }

  return errors
}

// 複合バリデーション関数
export function validateCreateTaskRequest(request: CreateTaskRequest): TaskValidationError | null {
  const errors: Array<{ field: string; message: string; code: string }> = []

  validateTaskTitle(request.title).forEach((message) => {
    errors.push({ field: 'title', message, code: 'INVALID_TITLE' })
  })

  validateTaskContent(request.content).forEach((message) => {
    errors.push({ field: 'content', message, code: 'INVALID_CONTENT' })
  })

  if (request.priority) {
    validateTaskPriority(request.priority).forEach((message) => {
      errors.push({ field: 'priority', message, code: 'INVALID_PRIORITY' })
    })
  }

  if (request.dueDate) {
    validateDueDate(request.dueDate).forEach((message) => {
      errors.push({ field: 'dueDate', message, code: 'INVALID_DUE_DATE' })
    })
  }

  return errors.length > 0 ? new TaskValidationError(errors) : null
}

export function validateUpdateTaskRequest(request: UpdateTaskRequest): TaskValidationError | null {
  const errors: Array<{ field: string; message: string; code: string }> = []

  if (request.title !== undefined) {
    validateTaskTitle(request.title).forEach((message) => {
      errors.push({ field: 'title', message, code: 'INVALID_TITLE' })
    })
  }

  if (request.content !== undefined) {
    validateTaskContent(request.content).forEach((message) => {
      errors.push({ field: 'content', message, code: 'INVALID_CONTENT' })
    })
  }

  if (request.status !== undefined) {
    validateTaskStatus(request.status).forEach((message) => {
      errors.push({ field: 'status', message, code: 'INVALID_STATUS' })
    })
  }

  if (request.priority !== undefined) {
    validateTaskPriority(request.priority).forEach((message) => {
      errors.push({ field: 'priority', message, code: 'INVALID_PRIORITY' })
    })
  }

  if (request.dueDate !== undefined && request.dueDate !== null) {
    validateDueDate(request.dueDate).forEach((message) => {
      errors.push({ field: 'dueDate', message, code: 'INVALID_DUE_DATE' })
    })
  }

  return errors.length > 0 ? new TaskValidationError(errors) : null
}
