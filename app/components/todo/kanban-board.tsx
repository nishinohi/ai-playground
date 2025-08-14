import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
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
  className?: string
}

function KanbanColumn({ title, status, tasks, onTaskEdit, onTaskDelete, className = '' }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  })

  return (
    <div className={`flex min-h-[500px] flex-col ${className}`}>
      <Card className="flex-1" ref={setNodeRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="min-h-[400px] space-y-3">
          <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <div key={task.id} className="group">
                <TaskCard task={task} onEdit={onTaskEdit} onDelete={onTaskDelete} />
              </div>
            ))}
          </SortableContext>

          {tasks.length === 0 && (
            <div
              className={`flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm ${
                isOver ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
              }`}
              data-status={status}
            >
              ここにタスクをドロップ
            </div>
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
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // ドラッグ検出の設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動したらドラッグ開始
      },
    }),
  )

  // ステータス別にタスクを分類
  const tasksByStatus = {
    'not-started': tasks.filter((task) => task.status === 'not-started'),
    doing: tasks.filter((task) => task.status === 'doing'),
    done: tasks.filter((task) => task.status === 'done'),
  }

  const columns = [
    { id: 'not-started', title: '未着手', tasks: tasksByStatus['not-started'] },
    { id: 'doing', title: '着手中', tasks: tasksByStatus['doing'] },
    { id: 'done', title: '完了', tasks: tasksByStatus['done'] },
  ]

  // ドラッグ開始時
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  // ドラッグ中の位置変更
  const handleDragOver = (_event: DragOverEvent) => {
    // 必要に応じて、ドラッグ中のビジュアルフィードバックを追加
  }

  // ドラッグ終了時
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const task = tasks.find((t) => t.id === active.id)
    if (!task) return

    // ドロップ先の判定
    let newStatus: TaskStatus | null = null

    // カラムにドロップした場合
    if (over.id === 'not-started' || over.id === 'doing' || over.id === 'done') {
      newStatus = over.id as TaskStatus
    }
    // 他のタスクにドロップした場合、そのタスクのステータスを採用
    else {
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) {
        newStatus = overTask.status
      }
    }

    // ステータスが変更される場合のみ処理
    if (newStatus && newStatus !== task.status && onTaskStatusChange) {
      onTaskStatusChange(task, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`grid grid-cols-1 gap-6 md:grid-cols-3 ${className}`}>
        {columns.map((column) => (
          <div key={column.id} data-status={column.id}>
            <KanbanColumn
              title={column.title}
              status={column.id as TaskStatus}
              tasks={column.tasks}
              onTaskEdit={onTaskEdit}
              onTaskDelete={onTaskDelete}
            />
          </div>
        ))}
      </div>

      {/* ドラッグ中のオーバーレイ */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-90">
            <TaskCard task={activeTask} isDragDisabled={true} className="shadow-2xl" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
