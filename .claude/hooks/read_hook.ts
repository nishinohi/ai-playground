import type { HookInput } from './types'

async function main(): Promise<void> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const toolArgs: HookInput = JSON.parse(Buffer.concat(chunks).toString())

  // readPath is the path to the file that Claude is trying to read
  const readPath = toolArgs.tool_input?.file_path || toolArgs.tool_input?.path || ''

  if (readPath.includes('.env')) {
    console.error('You cannot read .env file')
    process.exit(2)
  }
}

main().catch((err) => {
  console.error(`Hook error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
