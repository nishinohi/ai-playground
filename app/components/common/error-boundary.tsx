import { AlertTriangle } from 'lucide-react'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { Button } from '~/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // 本番環境では外部エラー追跡サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // 例: Sentry.captureException(error)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold">申し訳ありません</h2>
          <p className="mb-4 text-gray-600">予期しないエラーが発生しました。ページを再読み込みしてお試しください。</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            ページを再読み込み
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
