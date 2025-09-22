import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/server.ts'],
    testTimeout: 10000,
    include: ['tests/**/*.integration.test.*'],
  },
})