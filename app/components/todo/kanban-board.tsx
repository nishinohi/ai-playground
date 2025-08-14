import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type { Task, TaskStatus } from '~/lib/todo/task-types'
import { TaskCard } from './task-card'

interface KanbanColumnProps {
  title: string
  status: TaskStatus
  tasks: Task[]
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (task: Task) => void
  onTaskStatusChange?: (task: Task, newStatus: TaskStatus) => void
  className?: string
}

function KanbanColumn({
  title,
  status: _status,
  tasks,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  className = '',
}: KanbanColumnProps) {
  return (
    <div className={`flex min-h-[500px] flex-col ${className}`}>
      <Card className="flex-1" role="region" aria-label={`${title}のタスク一覧`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="min-h-[400px] space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              onStatusChange={onTaskStatusChange}
            />
          ))}

          {tasks.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-gray-500">タスクがありません</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (task: Task) => void
  onTaskStatusChange?: (task: Task, newStatus: TaskStatus) => void
  className?: string
}

export function KanbanBoard({ tasks, onTaskEdit, onTaskDelete, onTaskStatusChange, className = '' }: KanbanBoardProps) {
  // ステータス別にタスクを分類
  const tasksByStatus = {
    'not-started': tasks.filter((task) => task.status === 'not-started'),
    doing: tasks.filter((task) => task.status === 'doing'),
    done: tasks.filter((task) => task.status === 'done'),
  }

  return (
    <div
      className={`grid grid-cols-1 gap-6 md:grid-cols-3 ${className}`}
      role="group"
      aria-label="タスクカンバンボード"
    >
      <KanbanColumn
        title="未着手"
        status="not-started"
        tasks={tasksByStatus['not-started']}
        onTaskEdit={onTaskEdit}
        onTaskDelete={onTaskDelete}
        onTaskStatusChange={onTaskStatusChange}
      />

      <KanbanColumn
        title="着手中"
        status="doing"
        tasks={tasksByStatus['doing']}
        onTaskEdit={onTaskEdit}
        onTaskDelete={onTaskDelete}
        onTaskStatusChange={onTaskStatusChange}
      />

      <KanbanColumn
        title="完了"
        status="done"
        tasks={tasksByStatus['done']}
        onTaskEdit={onTaskEdit}
        onTaskDelete={onTaskDelete}
        onTaskStatusChange={onTaskStatusChange}
      />
    </div>
  )
}
