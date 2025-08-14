type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogData {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString()
    const _logData: LogData = {
      timestamp,
      level,
      message,
      data,
    }

    if (this.isDevelopment) {
      console[level === 'debug' ? 'log' : level](`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '')
    }

    // 本番環境では外部ログサービスに送信
    if (!this.isDevelopment && level === 'error') {
      // 例: 外部ログサービスAPI呼び出し
      // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(_logData) })
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }
}

export const logger = new Logger()
