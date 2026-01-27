# Test Suite

This directory contains the test suite for the AI Chatbot application using Vitest.

## Structure

```
__tests__/
├── fixtures/           # Test data files
│   ├── sample_message.md
│   └── test_self_closing_iframe.md
└── lib/               # Library tests
    ├── htmlPreprocessing.test.ts           # Unit tests
    └── htmlPreprocessing.integration.test.ts  # Integration tests
```

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Categories

### Unit Tests (`htmlPreprocessing.test.ts`)

Tests individual functions and features:

- Iframe srcdoc processing
- Auto-resize script injection
- IIFE wrapping for inline scripts
- Height attribute removal
- Sandbox attribute addition
- Map iframe chat session ID injection
- Incomplete iframe handling

### Integration Tests (`htmlPreprocessing.integration.test.ts`)

Tests complete workflows using real fixture files:

- Processing complex messages with multiple iframes
- Self-closing iframe handling
- End-to-end content transformation

## Fixtures

Test fixtures are stored in `__tests__/fixtures/`:

- `sample_message.md` - Complex message with multiple Plotly charts and iframes
- `test_self_closing_iframe.md` - Tests for self-closing iframe syntax

## Writing New Tests

1. Create test files with `.test.ts` extension in appropriate subdirectory
2. Import test utilities from vitest:
   ```typescript
   import { describe, it, expect } from 'vitest'
   ```
3. Follow the existing test structure and naming conventions
4. Add fixtures to `__tests__/fixtures/` if needed

## Coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.
