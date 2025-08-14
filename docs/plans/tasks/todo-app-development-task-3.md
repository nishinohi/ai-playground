# タスク3: 基本UIコンポーネント

## タスク概要

shadcn/ui をベースとしたTODO専用のUIコンポーネントを作成する。カンバンボード、タスクカード、タスクダイアログの基本構造を実装し、後続のページ統合に備える。

## 全体での位置づけ

- **マイルストーン**: 基盤構築完了
- **依存関係**: タスク2（型定義・バリデーション）完了後
- **後続タスクへの影響**: 全フロントエンド機能で利用される基盤コンポーネント

## 対象ファイル

- `app/components/todo/task-card.tsx` - タスクカード（新規作成）
- `app/components/todo/task-dialog.tsx` - タスク作成・編集ダイアログ（新規作成）
- `app/components/todo/kanban-board.tsx` - カンバンボード（新規作成）
- `app/components/todo/task-list.tsx` - タスクリスト（新規作成）

## 実装手順

### 1. TaskCard コンポーネントの作成

`app/components/todo/task-card.tsx` を作成：

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { CalendarDays, Edit, Trash2 } from 'lucide-react'
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
  onStatusChange,
  isDragging = false,
  className = ''
}: TaskCardProps) {
  const dueDateText = formatDueDate(task.dueDate)
  const dueDateColor = getDueDateColor(task.dueDate)

  return (
    <Card
      className={`
        transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
        ${className}
      `}
      draggable
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {task.title}
          </CardTitle>
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

### 2. TaskDialog コンポーネントの作成

`app/components/todo/task-dialog.tsx` を作成：

```typescript
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { Task, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '~/lib/todo/task-types'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task // undefined for create, Task for edit
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => void
  isLoading?: boolean
}

interface FormData {
  title: string
  content: string
  priority: TaskPriority
  dueDate: string
}

export function TaskDialog({ open, onOpenChange, task, onSubmit, isLoading = false }: TaskDialogProps) {
  const isEdit = !!task
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    priority: 'medium',
    dueDate: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // フォームの初期化
  useEffect(() => {
    if (open) {
      if (task) {
        // Edit mode
        setFormData({
          title: task.title,
          content: task.content,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        })
      } else {
        // Create mode
        setFormData({
          title: '',
          content: '',
          priority: 'medium',
          dueDate: '',
        })
      }
      setErrors({})
    }
  }, [open, task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 基本バリデーション
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です'
    }

    if (!formData.content.trim()) {
      newErrors.content = '内容は必須です'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // データ送信
    if (isEdit) {
      const updateData: UpdateTaskRequest = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        dueDate: formData.dueDate || null,
      }
      onSubmit(updateData)
    } else {
      const createData: CreateTaskRequest = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
      }
      onSubmit(createData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'タスクを編集' : '新しいタスクを作成'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="タスクのタイトルを入力"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="タスクの詳細を入力"
              rows={4}
              className={errors.content ? 'border-red-500' : ''}
            />
            {errors.content && (
              <p className="text-sm text-red-600">{errors.content}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">優先度</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) =>
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="優先度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">期限</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '保存中...' : (isEdit ? '更新' : '作成')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### 3. KanbanBoard コンポーネントの作成

`app/components/todo/kanban-board.tsx` を作成：

```typescript
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
  onTaskStatusChange?: (task: Task, newStatus: TaskStatus) => void
  className?: string
}

function KanbanColumn({
  title,
  status,
  tasks,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
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
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              タスクがありません
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
  // ステータス別にタスクを分類
  const tasksByStatus = {
    'not-started': tasks.filter(task => task.status === 'not-started'),
    'doing': tasks.filter(task => task.status === 'doing'),
    'done': tasks.filter(task => task.status === 'done'),
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
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
```

### 4. TaskList コンポーネントの作成

`app/components/todo/task-list.tsx` を作成：

```typescript
import { TaskCard } from './task-card'
import type { Task, TaskStatus } from '~/lib/todo/task-types'

interface TaskListProps {
  tasks: Task[]
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (task: Task) => void
  onTaskStatusChange?: (task: Task, newStatus: TaskStatus) => void
  className?: string
}

export function TaskList({
  tasks,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  className = ''
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-gray-500 ${className}`}>
        タスクが見つかりません
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
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
```

## 完了条件

### 機能要件

- [ ] 全UIコンポーネントが正常にレンダリングされる
- [ ] TaskCard でタスク情報が適切に表示される
- [ ] TaskDialog でフォーム入力・バリデーションが動作する
- [ ] KanbanBoard でステータス別表示が動作する
- [ ] TaskList でリスト表示が動作する

### 品質要件

- [ ] TypeScript型エラーが0件
- [ ] ESLint/Prettier違反が0件
- [ ] レスポンシブデザインが適用される
- [ ] アクセシビリティ基準に準拠

### デザイン要件

- [ ] shadcn/ui デザインシステムとの統一
- [ ] 適切なスペーシング・タイポグラフィ
- [ ] 優先度・期限の視覚的表現
- [ ] インタラクティブ要素のフィードバック

### テスト項目

- [ ] 各コンポーネントの独立動作確認
- [ ] プロパティ渡しの正常動作
- [ ] フォームバリデーションの動作
- [ ] レスポンシブ表示の確認

## 技術的考慮事項

### デザインシステム

- shadcn/ui コンポーネントの一貫した利用
- カラーパレット・タイポグラフィの統一
- アクセシビリティガイドラインの遵守

### パフォーマンス

- 適切なコンポーネント分割
- 不要な再レンダリングの防止
- メモ化の検討（将来的な最適化で実装）

### 拡張性

- プロパティインターフェースの柔軟性
- カスタマイゼーション可能な設計
- 将来的な機能追加への対応

## 注意事項

- shadcn/ui コンポーネントの正しいインポート
- 型定義との整合性確保
- 後続タスクでの利用しやすい設計

## 成果物

- `app/components/todo/task-card.tsx`
- `app/components/todo/task-dialog.tsx`
- `app/components/todo/kanban-board.tsx`
- `app/components/todo/task-list.tsx`
- 全コンポーネントの正常動作確認
