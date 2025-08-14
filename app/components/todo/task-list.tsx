import type { Task, TaskStatus } from '~/lib/todo/task-types'
import { TaskCard } from './task-card'

interface TaskListProps {
  tasks: Task[]
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (task: Task) => void
  onTaskStatusChange?: (task: Task, newStatus: TaskStatus) => void
  className?: string
}

export function TaskList({ tasks, onTaskEdit, onTaskDelete, onTaskStatusChange, className = '' }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className={`flex h-32 items-center justify-center text-gray-500 ${className}`}>タスクが見つかりません</div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`} role="list" aria-label="タスクリスト">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onTaskEdit}
          onDelete={onTaskDelete}
          onStatusChange={onTaskStatusChange}
        />
      ))}
    </div>
  )
}
