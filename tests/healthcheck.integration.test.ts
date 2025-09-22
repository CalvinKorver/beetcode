import { describe, it, expect } from 'vitest'

describe('Healthcheck API Integration Test', () => {
  it('should return 200 status from healthcheck endpoint', async () => {
    const response = await fetch('http://localhost:3002/api/healthcheck')

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('service', 'beetcode-landing')
    expect(typeof data.timestamp).toBe('string')

    // Validate timestamp is a valid ISO string
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    expect(isNaN(new Date(data.timestamp).getTime())).toBe(false)
  })
})