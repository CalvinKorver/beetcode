import { spawn, ChildProcess } from 'child_process'
import waitPort from 'wait-port'
import { beforeAll, afterAll } from 'vitest'

let serverProcess: ChildProcess | null = null
const PORT = 3002

export async function startTestServer(): Promise<void> {
  // Start the Next.js server
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: 'landing',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: PORT.toString() }
  })

  // Wait for the server to be ready
  await waitPort({
    host: 'localhost',
    port: PORT,
    timeout: 30000,
    output: 'silent'
  })

  console.log(`Test server started on port ${PORT}`)
}

export async function stopTestServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
    console.log('Test server stopped')
  }
}

// Global setup for integration tests
beforeAll(async () => {
  await startTestServer()
}, 30000)

afterAll(async () => {
  await stopTestServer()
})