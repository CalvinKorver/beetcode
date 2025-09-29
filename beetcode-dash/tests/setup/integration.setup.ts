import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Include base setup
import './vitest.setup'

// Setup for integration tests
// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Mock fetch if needed for API tests
global.fetch = vi.fn()

// Setup test timeout
vi.setConfig({
  testTimeout: 30000,
})