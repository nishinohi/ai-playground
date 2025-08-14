import { CalendarDays, Edit, Trash2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type { Task, TaskPriority, TaskStatus } from '~/lib/todo/task-types'

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void
  isDragging?: boolean
  className?: string
}

// 優先度表示のヘルパー
function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return '不明'
  }
}

// 期限表示のヘルパー
function formatDueDate(dueDate: Date | null): string | null {
  if (!dueDate) return null

  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}日遅れ`
  } else if (diffDays === 0) {
    return '今日まで'
  } else if (diffDays === 1) {
    return '明日まで'
  } else {
    return `あと${diffDays}日`
  }
}

function getDueDateColor(dueDate: Date | null): string {
  if (!dueDate) return ''

  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return 'text-red-600'
  } else if (diffDays <= 1) {
    return 'text-orange-600'
  } else {
    return 'text-gray-600'
  }
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange: _onStatusChange,
  isDragging = false,
  className = '',
}: TaskCardProps) {
  const dueDateText = formatDueDate(task.dueDate)
  const dueDateColor = getDueDateColor(task.dueDate)

  return (
    <Card
      className={`cursor-grab transition-all duration-200 hover:shadow-md active:cursor-grabbing ${isDragging ? 'rotate-3 opacity-50 shadow-lg' : ''} ${className} `}
      draggable
      role="article"
      aria-label={`タスク: ${task.title}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-medium">{task.title}</CardTitle>
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onEdit(task)}
                aria-label={`${task.title}を編集`}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDelete(task)}
                aria-label={`${task.title}を削除`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="mb-3 line-clamp-3 text-xs text-gray-600">{task.content}</p>

        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </Badge>

          {dueDateText && (
            <div className={`flex items-center gap-1 text-xs ${dueDateColor}`}>
              <CalendarDays className="h-3 w-3" />
              <span>{dueDateText}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
