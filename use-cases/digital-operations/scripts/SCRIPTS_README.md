# Scripts Directory

This directory contains utility scripts for the AI Chatbot application.

## Available Scripts

### GraphQL Utilities

- **runGraphql.ts** - Execute GraphQL queries and mutations against the Amplify backend
  ```bash
  npm run graphql
  ```
  See [README.md](./README.md) for detailed GraphQL runner documentation.

### Data Management

- **cleanupInvalidMapLayers.ts** - Clean up invalid map layer entries from the database
- **createUser.js** - Create test users in the system

## Test Scripts Migration

**Important:** Test scripts have been migrated to a modern testing framework (Vitest).

### Old Test Scripts (Removed)

The following standalone test scripts have been removed and refactored:

- ~~testHtmlPreprocessing.ts~~
- ~~testComplexMapIframe.ts~~
- ~~testMapIframeInjection.ts~~
- ~~testSelfClosingIframe.ts~~

### New Test Location

All tests are now in the `__tests__` directory with:

- Modern test framework (Vitest)
- Better organization and structure
- Unit and integration tests
- Test fixtures for sample data

### Running Tests

```bash
npm test              # Watch mode (interactive)
npm run test:run      # Single run (CI mode)
npm run test:ui       # UI mode (visual test runner)
npm run test:coverage # With coverage report
```

See [**tests**/README.md](../__tests__/README.md) for detailed testing documentation.

## Documentation

- **GRAPHQ_RUNNER_README.md** - GraphQL runner documentation
- **FIX_SUMMARY.md** - Summary of fixes applied to the codebase
- **TEST_RESULTS.md** - Historical test results (deprecated - see `__tests__` for current tests)
- **SCRIPTS_README.md** - This file
