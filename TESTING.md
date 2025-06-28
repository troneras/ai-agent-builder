# Testing Guide for SquareService

This project provides multiple approaches for testing the SquareService without requiring Edge Functions. Each approach serves different purposes and development workflows.

## 🧪 Testing Approaches Available

### 1. **Unit Tests with Vitest** (Recommended for Development)

Modern TypeScript unit testing with mocking capabilities.

```bash
# Install testing dependencies
npm install

# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Watch mode (runs tests automatically on file changes)
npm run test -- --watch
```

**Location**: `src/tests/square-service-unit.test.ts`

**What it tests**:

- ✅ Constructor behavior (sandbox vs production)
- ✅ Complete business information retrieval
- ✅ Error handling and graceful degradation
- ✅ Static utility methods (`formatBusinessHours`, `extractServices`)
- ✅ Edge cases and data validation
- ✅ Integration scenarios

**Benefits**:

- Fast execution (no API calls)
- Comprehensive coverage
- Great for TDD workflow
- Integrated with IDE

### 2. **Node.js Standalone Testing** (Existing)

Direct testing with the Square SDK using both mock and live data.

```bash
# Test with mock data (no API calls needed)
npm run test:square

# Test with live Square API (requires access token)
npm run test:square:live
```

**Location**: `test-square-api.js`

**What it tests**:

- ✅ Actual Square API integration
- ✅ Real business data validation
- ✅ API response handling
- ✅ Network error scenarios

### 3. **TypeScript/Deno Standalone Testing** (Existing)

Tests data processing logic independently.

```bash
cd supabase/functions
deno run --allow-env --allow-net test-standalone.ts
```

**Location**: `supabase/functions/test-standalone.ts`

## 🚀 Quick Start Guide

### For New Development

Use the **Vitest unit tests** for rapid development:

```bash
# 1. Install dependencies (one time)
npm install

# 2. Run tests in watch mode while developing
npm run test -- --watch

# 3. Run specific test file
npm run test src/tests/square-service-unit.test.ts

# 4. Check coverage
npm run test:coverage
```

### For Integration Testing

Use the **Node.js standalone tests**:

```bash
# Test with mock data first
npm run test:square

# Then test with real API (get token from Square Developer Portal)
npm run test:square:live -- --token YOUR_SANDBOX_TOKEN
```

## 📁 Test Structure

```
├── src/tests/
│   ├── square-service-unit.test.ts    # Comprehensive unit tests
│   └── square-service.test.ts         # Alternative unit tests (if needed)
├── test-square-api.js                 # Node.js integration tests
├── supabase/functions/
│   ├── test-standalone.ts             # Deno data processing tests
│   ├── test-square-service.ts         # Service endpoint tests
│   └── test-square-api-deno.ts        # Deno integration tests
└── vitest.config.ts                   # Vitest configuration
```

## 🔧 Configuration

### Vitest Configuration

The `vitest.config.ts` file is configured for:

- TypeScript support
- Node.js environment for server-side testing
- Coverage reporting
- Proper module resolution

### Mock Strategy

Unit tests use comprehensive mocking:

- **Square SDK**: Completely mocked to avoid API calls
- **Predictable responses**: Controlled test data
- **Error simulation**: Ability to test error scenarios

## 📊 Test Coverage

The unit tests cover:

### Core Functionality

- ✅ Business information retrieval
- ✅ Merchant data processing
- ✅ Location data handling
- ✅ Catalog processing (items vs services)

### Error Handling

- ✅ API errors with context
- ✅ Graceful degradation
- ✅ Individual API failure handling
- ✅ Empty response handling

### Utility Functions

- ✅ Business hours formatting
- ✅ Service extraction
- ✅ Edge cases and validation

### Integration Scenarios

- ✅ Multi-location businesses
- ✅ Mixed catalog (products + services)
- ✅ Real-world data structures

## 🛠️ Development Workflow

### Test-Driven Development (TDD)

1. Write a failing test for new functionality
2. Run `npm run test -- --watch`
3. Implement the feature
4. Watch test pass
5. Refactor and ensure tests still pass

### Adding New Tests

1. **Unit tests**: Add to `src/tests/square-service-unit.test.ts`
2. **Integration tests**: Add to `test-square-api.js`
3. **Data processing**: Add to `supabase/functions/test-standalone.ts`

### Example: Adding a New Test

```typescript
// In src/tests/square-service-unit.test.ts
describe("New feature", () => {
  it("should handle new scenario", async () => {
    // Arrange
    mockSquareClient.newApi.someMethod.mockResolvedValue({
      data: {
        /* mock response */
      },
    });

    // Act
    const result = await squareService.newMethod();

    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

## 🔍 Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npm run test square-service-unit.test.ts

# Run specific test suite
npm run test -- --grep "getBusinessInformation"

# Run with verbose output
npm run test -- --reporter=verbose
```

### Common Issues

#### Import Errors

If you see module import errors:

```bash
# Make sure dependencies are installed
npm install

# Check TypeScript configuration
npx tsc --noEmit
```

#### Mock Issues

If mocks aren't working:

```bash
# Clear Vitest cache
npx vitest --run --reporter=verbose --clearCache
```

## 🎯 Best Practices

### 1. **Isolated Tests**

Each test should be independent and not rely on other tests.

### 2. **Descriptive Names**

Use clear, descriptive test names that explain the scenario.

### 3. **Arrange-Act-Assert**

Structure tests with clear setup, execution, and verification phases.

### 4. **Mock Realistic Data**

Use realistic mock data that represents actual Square API responses.

### 5. **Test Edge Cases**

Include tests for empty responses, errors, and boundary conditions.

## 📈 Continuous Integration

For CI/CD pipelines:

```bash
# Run all tests (no watch mode)
npm run test -- --run

# Generate coverage for reporting
npm run test:coverage

# Fail CI on coverage threshold
npm run test -- --run --coverage --coverage.thresholds.statements=80
```

## 🤝 Contributing Tests

When adding new features to SquareService:

1. **Add unit tests first** in `src/tests/square-service-unit.test.ts`
2. **Update integration tests** in `test-square-api.js` if needed
3. **Run all test suites** to ensure no regressions
4. **Update this documentation** if adding new testing patterns

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Square API Documentation](https://developer.squareup.com/docs)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles/)

## ❓ Need Help?

- Check existing test files for examples
- Run `npm run test:ui` for interactive testing
- Review the Square Testing Guide in `SQUARE_TESTING_GUIDE.md`
