import { execSync } from 'child_process'

// Read stdin
async function readInput() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString())
}

function runTypeCheck() {
  try {
    // Run React Router typegen and TypeScript type checking
    execSync('npx react-router typegen && npx tsc --noEmit', {
      stdio: 'pipe',
      encoding: 'utf8',
    })
    return null // Type check passed
  } catch (error) {
    // Return the error output
    return error.stdout || error.stderr || error.message
  }
}

function runESLintCheck(file) {
  try {
    // Run ESLint check on specific file
    execSync(`npx eslint --cache --cache-location ./node_modules/.cache/eslint "${file}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
    })
    return null // ESLint check passed
  } catch (error) {
    // Return the error output
    return error.stdout || error.stderr || error.message
  }
}

async function main() {
  try {
    const input = await readInput()
    const file = input.tool_response?.filePath || input.tool_input?.file_path

    // Only check JavaScript/TypeScript files
    if (!file || !/\.(ts|tsx|js|jsx)$/.test(file)) {
      process.exit(0)
    }

    const isTypeScriptFile = /\.(ts|tsx)$/.test(file)
    const errors = []

    // Run type check for TypeScript files
    if (isTypeScriptFile) {
      const typeChecks = runTypeCheck()
      if (typeChecks) {
        errors.push(typeChecks)
      }
    }

    // Run ESLint check for all JS/TS files
    const lintChecks = runESLintCheck(file)
    if (lintChecks) {
      errors.push(lintChecks)
    }

    // Report all errors
    if (errors.length > 0) {
      console.error(errors.join('\n\n'))
      process.exit(2)
    }
  } catch (error) {
    console.error(`Hook error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`Hook error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
