# Testing Quick Start Guide

## Running Tests

```bash
# Run all tests in watch mode (recommended for development)
npm test

# Run tests once (for CI/CD)
npm run test:run

# Open visual test UI in browser
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
__tests__/
├── fixtures/           # Test data files
│   ├── sample_message.md
│   └── test_self_closing_iframe.md
└── lib/               # Library tests
    ├── htmlPreprocessing.test.ts           # Unit tests (15 tests)
    └── htmlPreprocessing.integration.test.ts  # Integration tests (10 tests)
```

## Writing New Tests

1. Create a new test file in `__tests__/` with `.test.ts` extension
2. Import test utilities:
   ```typescript
   import { describe, it, expect } from 'vitest'
   ```
3. Write your tests:
   ```typescript
   describe('MyFeature', () => {
     it('should do something', () => {
       expect(true).toBe(true)
     })
   })
   ```

## Test Examples

### Unit Test

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../src/lib/myModule'

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Integration Test with Fixtures

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('integration test', () => {
  it('should process fixture file', () => {
    const fixturePath = join(__dirname, '../fixtures/test.md')
    const content = readFileSync(fixturePath, 'utf-8')
    // Test with real data
  })
})
```

## Current Test Coverage

- **Total Tests**: 25
- **Test Files**: 2
- **All Passing**: ✅

### Coverage Areas

- HTML preprocessing
- Iframe processing
- Auto-resize injection
- Script wrapping
- Map iframe session injection
- Edge cases and error handling

## Continuous Integration

Tests are ready for CI/CD integration. Use:

```bash
npm run test:run
```

This command:

- Runs all tests once
- Exits with code 0 on success, 1 on failure
- Perfect for CI/CD pipelines

## Documentation

- `__tests__/README.md` - Detailed test documentation
- `TEST_MIGRATION_SUMMARY.md` - Migration details
- `vitest.config.ts` - Test configuration

## Tips

1. **Use Watch Mode**: `npm test` automatically reruns tests when files change
2. **Focus Tests**: Add `.only` to run specific tests: `it.only('test', () => {})`
3. **Skip Tests**: Add `.skip` to temporarily disable tests: `it.skip('test', () => {})`
4. **Debug**: Use `console.log()` in tests - output appears in terminal
5. **Coverage**: Run `npm run test:coverage` to see what code is tested

## Common Commands

```bash
# Development workflow
npm test                    # Start watch mode
# Edit code/tests
# Tests auto-run on save

# Before committing
npm run test:run           # Verify all tests pass
npm run lint               # Check code style

# Check coverage
npm run test:coverage      # Generate coverage report
open coverage/index.html   # View coverage in browser
```

## Need Help?

- Check `__tests__/README.md` for detailed documentation
- Look at existing tests for examples
- Vitest docs: https://vitest.dev/
