export interface HookInput {
  tool_input?: {
    file_path?: string
    [key: string]: unknown
  }
  tool_response?: {
    filePath?: string
    [key: string]: unknown
  }
}
