import { exec } from 'child_process'
import { promisify } from 'util'
import type { HookInput } from './types'

const execAsync = promisify(exec)

// Read stdin
async function readInput(): Promise<HookInput> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString())
}

async function runTypeCheck(): Promise<string | null> {
  try {
    // Run the typecheck script defined in package.json
    // This will run "react-router typegen && tsc" for React Router projects
    const { stderr } = await execAsync('pnpm run typecheck', {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: '1' }, // Disable color output for cleaner results
    })

    // If there's stderr output (type errors), return it
    if (stderr && stderr.trim()) {
      return stderr
    }

    // Success - no type errors
    return null
  } catch (error) {
    // Command failed - likely due to type errors
    // The error output contains the type check results
    if (error instanceof Error && 'stderr' in error && error.stderr) {
      return error.stderr as string
    }
    if (error instanceof Error && 'stdout' in error && error.stdout) {
      return error.stdout as string
    }
    return `Type check failed: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function main(): Promise<void> {
  const input = await readInput()
  const file = input.tool_response?.filePath || input.tool_input?.file_path

  // Only check TypeScript files
  if (!file || !/\.(ts|tsx)$/.test(file)) {
    process.exit(0)
  }

  const typeChecks = await runTypeCheck()
  if (typeChecks) {
    console.error(typeChecks)
    process.exit(2)
  }
}

main().catch((err) => {
  console.error(`Hook error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
