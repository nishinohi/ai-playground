import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import type { CreateTaskRequest, Task, TaskPriority, UpdateTaskRequest } from '~/lib/todo/task-types'

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
          <DialogTitle>{isEdit ? 'タスクを編集' : '新しいタスクを作成'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-label={isEdit ? 'タスク編集フォーム' : 'タスク作成フォーム'}
        >
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="タスクのタイトルを入力"
              className={errors.title ? 'border-red-500' : ''}
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-600">
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="タスクの詳細を入力"
              rows={4}
              className={errors.content ? 'border-red-500' : ''}
              aria-invalid={errors.content ? 'true' : 'false'}
              aria-describedby={errors.content ? 'content-error' : undefined}
            />
            {errors.content && (
              <p id="content-error" className="text-sm text-red-600">
                {errors.content}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">優先度</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => setFormData((prev) => ({ ...prev, priority: value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '保存中...' : isEdit ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
