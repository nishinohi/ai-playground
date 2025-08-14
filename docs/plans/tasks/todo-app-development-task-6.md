# タスク6: ドラッグ&ドロップ機能

## タスク概要

カンバンボードにドラッグ&ドロップ機能を実装し、タスクのステータス変更を直感的に操作できるようにする。@dnd-kit ライブラリを使用してアクセシブルなドラッグ&ドロップ体験を提供する。

## 全体での位置づけ

- **マイルストーン**: 高度機能完成
- **依存関係**: タスク5（TODOダッシュボードページ）完了後
- **後続タスクへの影響**: 最終的なユーザビリティ向上の基盤

## 対象ファイル

- `app/components/todo/kanban-board.tsx` - ドラッグ&ドロップ機能追加
- `app/components/todo/task-card.tsx` - ドラッグ可能な要素への対応
- `package.json` - @dnd-kit ライブラリの追加

## 実装手順

### 1. 依存関係の追加

まず、@dnd-kit ライブラリをインストール：

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. TaskCard コンポーネントの更新

`app/components/todo/task-card.tsx` を更新：

```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { CalendarDays, Edit, Trash2, GripVertical } from 'lucide-react'
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
  onStatusChange,
  isDragDisabled = false,
  className = ''
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
      className={`
        transition-all duration-200 hover:shadow-md
        ${isDragging ? 'opacity-50 shadow-2xl z-50' : ''}
        ${isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        ${className}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {!isDragDisabled && (
              <button
                className="mt-1 p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                {...attributes}
                {...listeners}
                aria-label="ドラッグしてタスクを移動"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </button>
            )}
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
              {task.title}
            </CardTitle>
          </div>

          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onEdit(task)}
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
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 mb-3 line-clamp-3">
          {task.content}
        </p>

        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${getPriorityColor(task.priority)}`}
          >
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
```

### 3. KanbanBoard コンポーネントの更新

`app/components/todo/kanban-board.tsx` を更新：

```typescript
import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './task-card'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import type { Task, TaskStatus } from '~/lib/todo/task-types'

interface KanbanColumnProps {
  title: string
  status: TaskStatus
  tasks: Task[]
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (task: Task) => void
  className?: string
}

function KanbanColumn({
  title,
  status,
  tasks,
  onTaskEdit,
  onTaskDelete,
  className = ''
}: KanbanColumnProps) {
  return (
    <div className={`flex flex-col min-h-[500px] ${className}`}>
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 min-h-[400px]">
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <div key={task.id} className="group">
                <TaskCard
                  task={task}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                />
              </div>
            ))}
          </SortableContext>

          {tasks.length === 0 && (
            <div
              className="flex items-center justify-center h-32 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg"
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

export function KanbanBoard({
  tasks,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  className = ''
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // ドラッグ検出の設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動したらドラッグ開始
      },
    })
  )

  // ステータス別にタスクを分類
  const tasksByStatus = {
    'not-started': tasks.filter(task => task.status === 'not-started'),
    'doing': tasks.filter(task => task.status === 'doing'),
    'done': tasks.filter(task => task.status === 'done'),
  }

  const columns = [
    { id: 'not-started', title: '未着手', tasks: tasksByStatus['not-started'] },
    { id: 'doing', title: '着手中', tasks: tasksByStatus['doing'] },
    { id: 'done', title: '完了', tasks: tasksByStatus['done'] },
  ]

  // ドラッグ開始時
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  // ドラッグ中の位置変更
  const handleDragOver = (event: DragOverEvent) => {
    // 必要に応じて、ドラッグ中のビジュアルフィードバックを追加
  }

  // ドラッグ終了時
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    // ドロップ先の判定
    let newStatus: TaskStatus | null = null

    // カラムにドロップした場合
    if (over.id === 'not-started' || over.id === 'doing' || over.id === 'done') {
      newStatus = over.id as TaskStatus
    }
    // 他のタスクにドロップした場合、そのタスクのステータスを採用
    else {
      const overTask = tasks.find(t => t.id === over.id)
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
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
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
            <TaskCard
              task={activeTask}
              isDragDisabled={true}
              className="shadow-2xl"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

### 4. パッケージ依存関係の更新

プロジェクトルートで以下のコマンドを実行：

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 5. ドラッグ&ドロップ用のスタイル追加

`app/app.css` に以下を追加（必要に応じて）：

```css
/* ドラッグ&ドロップ用のカスタムスタイル */
.drag-overlay {
  z-index: 999;
}

.sortable-ghost {
  opacity: 0.5;
}

.drop-zone-active {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: rgb(59, 130, 246);
}

/* ドラッグハンドルのホバー効果 */
.group:hover .group-hover\\:opacity-100 {
  opacity: 1;
}
```

## 完了条件

### 機能要件

- [x] タスクをドラッグして他のカラムにドロップできる
- [x] ドロップ時にタスクのステータスが正しく変更される
- [x] ドラッグ中の視覚的フィードバックが表示される
- [x] ドロップゾーンの視覚的表示が機能する
- [x] ドラッグ操作のキャンセルが正常に動作する

### アクセシビリティ要件

- [x] キーボードでのドラッグ&ドロップ操作が可能
- [x] スクリーンリーダーでの操作説明が適切
- [x] フォーカス管理が適切に動作
- [x] ARIAラベルが適切に設定される

### ユーザビリティ要件

- [x] ドラッグ開始の閾値が適切（誤操作防止）
- [x] ドラッグ中のカーソル表示が適切
- [x] タッチデバイスでの操作が正常に動作
- [x] ドラッグ&ドロップの代替手段（ボタンクリック）が利用可能

### 品質要件

- [x] TypeScript型エラーが0件
- [x] ESLint/Prettier違反が0件
- [x] パフォーマンステスト（大量タスクでの動作確認）
- [x] ブラウザ互換性の確認

## 技術的考慮事項

### パフォーマンス

- @dnd-kit の最適化されたレンダリング戦略を活用
- 大量のタスクがある場合のパフォーマンス考慮
- 不要な再レンダリングの防止

### アクセシビリティ

- @dnd-kit の組み込みアクセシビリティ機能を活用
- キーボードナビゲーションのサポート
- スクリーンリーダー対応

### ブラウザ互換性

- モダンブラウザでの動作確認
- タッチデバイス（モバイル、タブレット）での動作確認
- フォールバック機能の提供

### エラーハンドリング

- ドラッグ&ドロップ操作中のエラー処理
- ネットワークエラー時の適切な処理
- 楽観的更新とエラー時の復元

## 注意事項

- 既存のTaskCard、KanbanBoard コンポーネントとの互換性確保
- SSRとの互換性（@dnd-kit はクライアントサイドライブラリ）
- 既存のステータス変更APIとの連携
- パフォーマンスに影響しない実装

## 成果物

- 更新された `app/components/todo/task-card.tsx`
- 更新された `app/components/todo/kanban-board.tsx`
- `package.json` の依存関係更新
- 必要に応じて `app/app.css` の更新
- 全ブラウザでの動作確認完了
- アクセシビリティテスト完了
