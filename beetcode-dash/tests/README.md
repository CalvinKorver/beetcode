# Testing Setup

This directory contains the testing setup for beetcode-dash using Vitest and Testing Library.

## Structure

```
tests/
├── setup/
│   ├── vitest.setup.ts        # General setup for unit tests
│   └── integration.setup.ts   # Setup for integration tests
├── unit/
│   ├── components/            # Unit tests for components
│   └── lib/                   # Unit tests for utilities/services
└── integration/
    ├── api/                   # Integration tests for API routes
    └── pages/                 # Integration tests for pages
```

## Available Scripts

- `npm run test` - Run all tests once
- `npm run test:watch` - Run all tests in watch mode
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:integration:watch` - Run integration tests in watch mode

## Test Types

### Unit Tests
- Test individual components in isolation
- Test utility functions and services
- Fast execution with mocked dependencies
- Located in `tests/unit/`

### Integration Tests
- Test API routes and database interactions
- Test complete user workflows
- Test interactions between components
- Located in `tests/integration/`

## Configuration

- `vitest.config.ts` - Main Vitest configuration
- `vitest.config.unit.ts` - Configuration for unit tests only
- `vitest.config.integration.ts` - Configuration for integration tests only

## Setup Files

- `vitest.setup.ts` - Mocks Next.js components and sets up testing environment
- `integration.setup.ts` - Sets up environment variables and mocks for integration tests

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Integration Test Example
```typescript
import { describe, it, expect } from 'vitest'

describe('API Integration', () => {
  it('should return correct response', async () => {
    const response = await fetch('/api/test')
    expect(response.status).toBe(200)
  })
})
```