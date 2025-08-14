import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, Edit, GripVertical, Trash2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type { Task, TaskPriority, TaskStatus } from '~/lib/todo/task-types'

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void
  isDragDisabled?: boolean
  className?: string
}

// 既存のヘルパー関数はそのまま維持...
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
  isDragDisabled = false,
  className = '',
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isDragDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dueDateText = formatDueDate(task.dueDate)
  const dueDateColor = getDueDateColor(task.dueDate)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 hover:shadow-md ${isDragging ? 'z-50 opacity-50 shadow-2xl' : ''} ${isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${className} `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {!isDragDisabled && (
              <button
                className="mt-1 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100"
                {...attributes}
                {...listeners}
                aria-label="ドラッグしてタスクを移動"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </button>
            )}
            <CardTitle className="line-clamp-2 flex-1 text-sm font-medium">{task.title}</CardTitle>
          </div>

          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(task)}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDelete(task)}
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
