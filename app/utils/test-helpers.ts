import type { CreateTaskRequest, Task } from '~/lib/todo/task-types'

// テスト用のダミーデータ生成
export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    title: 'テストタスク',
    content: 'テスト用のタスク内容',
    status: 'not-started',
    priority: 'medium',
    dueDate: null,
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockTaskRequest(overrides?: Partial<CreateTaskRequest>): CreateTaskRequest {
  return {
    title: 'テストタスク',
    content: 'テスト用のタスク内容',
    priority: 'medium',
    ...overrides,
  }
}

// ローカル環境での動作確認用
export async function seedTestData() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const testTasks: CreateTaskRequest[] = [
    {
      title: 'サンプルタスク 1',
      content: 'これは未着手のサンプルタスクです。',
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'サンプルタスク 2',
      content: 'これは着手中のサンプルタスクです。',
      priority: 'medium',
    },
    {
      title: '完了済みタスク',
      content: 'これは完了済みのサンプルタスクです。',
      priority: 'low',
    },
  ]

  // 実際のシード処理はここに実装
  console.log('Test data seeded:', testTasks)
}
