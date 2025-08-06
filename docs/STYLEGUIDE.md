# TypeScript SDK Style Guide

## JSDoc Documentation Standards

**🚨 ALWAYS use JSDoc format (`/** ... */`) for:**

- **ALL exported functions** - Every function with `export` keyword must have JSDoc docstring describing its purpose,
  parameters, and return value
- **ALL exported variables/constants** - Any constant or variable with `export` keyword used outside the current file
- **ALL exported types and interfaces** - Including their properties and purpose
- **ALL interface/type properties** - Individual property descriptions

**⚠️ When you see `export function`, `export const`, `export type`, or `export interface`, automatically add JSDoc
format.**

### When NOT to Use JSDoc Format

- **Implementation comments** - Comments inside function bodies explaining logic flow
- **Inline comments** - Comments on the same line as code
- **Temporary/debugging comments** - Comments meant for development purposes only
- **Non-exported private utilities** - Internal helper functions not used elsewhere

### JSDoc Formatting Requirements

#### Basic Structure

```typescript
/**
 * Brief description of the function/variable/type
 * @param {type} paramName - Description of parameter
 * @returns {type} Description of return value
 * @type {type} - For variable type annotations
 */
```

#### Quality Guidelines

- **Be Concise** - Keep descriptions clear and to the point
- **Be Specific** - Explain what the function/variable does, not how it works
- **Use Proper Grammar** - Start with capital letters, end with periods
- **Avoid Redundancy** - Don't repeat information already clear from the code
- **Include Edge Cases** - Document important limitations or special behaviors

### Code Enforcement Rules

**When generating or reviewing code, LLM should:**

1. **Detect export keywords** - Scan for `export function`, `export const`, `export type`, `export interface`
2. **Check for JSDoc** - Verify each export has proper `/** ... */` documentation
3. **Suggest JSDoc format** - Auto-complete JSDoc blocks for any missing documentation
4. **Flag regular comments** - Convert `//` comments above exports to JSDoc format
5. **Apply to all files** - Enforce in `apps/`, `packages/`, and all TypeScript files

### Detection Patterns for Regular Comments Above Exports

**🚨 CRITICAL: Always detect and flag these patterns for JSDoc conversion:**

- `// comment\nexport function` → Convert to JSDoc
- `/* comment */\nexport function` → Convert to JSDoc
- `// comment\nexport const` → Convert to JSDoc
- `// comment\nexport interface` → Convert to JSDoc
- `// comment\nexport type` → Convert to JSDoc
- `// comment\nexport class` → Convert to JSDoc

**Example:**

❌ **Avoid - Regular comment above export:**

```typescript
// calculates position notional value
export function calculateNotional(size: BigDecimal, price: BigDecimal) {
  // Should be converted to JSDoc format
}
```

✅ **Good - Proper JSDoc:**

```typescript
/**
 * Calculates the notional value of a position
 * @param size - Position size in base units (BigDecimal)
 * @param price - Current price per unit (BigDecimal, precision 18)
 * @returns Notional value in quote currency (USDC), rounded to 6 decimal places
 * @throws {InvalidPositionError} When size is zero or negative
 */
export function calculateNotional(
  size: BigDecimal,
  price: BigDecimal,
): BigDecimal {
  // Implementation
}
```

## TypeScript Conventions

- Use `interface` for object shapes that might be extended or implemented
- Use `type` for unions, primitives, computed types, and utility types
- **Never use `any` type** - Prefer `unknown` for truly unknown types, or create proper type definitions
- Use descriptive generic constraints: `<T extends Record<string, unknown>>`

## Error Handling Patterns

- Create custom error classes extending base `Error`
- Use `@throws` JSDoc tags to document all possible errors
- Provide detailed error context and recovery suggestions

✅ **Good error class patterns:**

```typescript
/**
 * Error thrown when wallet client is not provided for operations requiring it
 */
export class WalletNotProvidedError extends Error {
  constructor() {
    // Set descriptive message and proper error name
    super('Wallet client not provided');
    this.name = 'WalletNotProvidedError';
  }
}

/**
 * Error thrown when engine server returns a failure response
 */
export class EngineServerFailureError extends Error {
  // Store server response data as readonly property for debugging
  constructor(readonly responseData: ServerFailureResponse) {
    // Call super() with optional message
    super();
  }
}
```

## Naming Conventions

- **Use camelCase** for variables, functions, and methods
- **Use PascalCase** for classes, interfaces, types, and enums
- **Use CAPITAL_SNAKE_CASE** for constants and environment variables
- **Client classes** should end with `Client` (e.g., `MarketClient`, `NadoClient`)
- **Error classes** should end with `Error` (e.g., `ValidationError`, `NetworkError`)
- **Type guards** should start with `is` (e.g., `isMarketOrder`, `isValidAddress`)

## Constants and Configuration

✅ **Good constants patterns:**

```typescript
/**
 * Common BigDecimal constants used throughout the SDK
 */
export const BigDecimals = Object.freeze({
  // Freeze object to prevent mutation
  // Use semantic names for commonly used values
  ZERO: toBigDecimal(0),
  ONE: toBigDecimal(1),
  INF: toBigDecimal(Infinity),
  MAX_I128: toBigDecimal('170141183460469231731687303715884105727'),
});

/**
 * Quote product ID for USDC
 */
export const QUOTE_PRODUCT_ID = 0;
```

## Utility Function Patterns

- Write pure functions where possible
- Include comprehensive JSDoc with examples
- Use proper type guards and validators
- Handle edge cases gracefully

✅ **Good utility function patterns:**

```typescript
/**
 * BigDecimal is a renamed `BigNumber` type from `bignumber.js`.
 * Includes valid values & instances for BigDecimal.
 * @see https://mikemcl.github.io/bignumber.js/
 */
export type BigDecimalish = BigDecimal | BigDecimal.Value | bigint;

/**
 * Converts a value to an instance of BigDecimal
 * @param val - The value to convert to BigDecimal  
 * @returns A new BigDecimal instance
 */
export function toBigDecimal(val: BigDecimalish): BigDecimal {
  // Handle different input types with type guards
  const bnConstructorVal = (() => {
    if (val instanceof BigDecimal) {
      return val; // Already BigDecimal, return as-is
    } else if (typeof val === 'string' || typeof val === 'number') {
      return val; // Native types supported by BigNumber constructor
    } else if (typeof val === 'bigint') {
      return val.toString(); // Convert bigint to string
    }
    // Fallback for unexpected types (edge case handling)
    return JSON.stringify(val);
  })();
  return new BigDecimal(bnConstructorVal);
}
```

## Code Quality Checklist

When reviewing SDK code, ensure:

- [ ] JSDoc format is used for all exported functions, classes, and types
- [ ] Proper error handling with custom error classes
- [ ] Type safety with no `any` types
- [ ] Async operations use proper Promise handling
- [ ] Constants are properly frozen and exported
- [ ] Tests cover both success and error scenarios
- [ ] Naming conventions are followed consistently