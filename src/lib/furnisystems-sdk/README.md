# Furnisystems SDK

A TypeScript SDK for interacting with the Furnisystems GraphQL API, built with Apollo Client for optimal performance and caching.

## Architecture Overview

The Furnisystems SDK is designed with a modular architecture that makes it easy to maintain and extend. It can be easily extracted into a separate npm package when needed.

```
src/lib/furnisystems-sdk/
├── index.ts                    # Main SDK export
├── client/                     # Apollo GraphQL client
│   ├── index.ts               # Apollo client implementation
│   ├── types.ts               # Client configuration types
│   └── errors.ts              # Custom error classes
├── modules/                    # Feature modules
│   ├── customer/              # Customer management
│   │   ├── index.ts
│   │   └── types.ts
│   ├── cart/                  # Cart operations
│   │   ├── index.ts
│   │   └── types.ts
│   └── [other modules]/       # Future modules (products, orders, etc.)
├── types/                     # Shared types
│   └── common.ts              # Common interfaces
└── README.md                  # This file
```

## Key Features

- **Apollo Client Integration**: Built on Apollo Client for optimal GraphQL performance
- **TypeScript First**: Full type safety with comprehensive TypeScript definitions
- **Modular Design**: Each business domain is a separate module
- **Error Handling**: Custom error classes for different error types
- **Caching**: Built-in Apollo Client caching with Next.js support
- **Extensible**: Easy to add new modules and functionality
- **Framework Agnostic Core**: Can be used in any JavaScript/TypeScript project

## Usage

### Basic Setup

```typescript
import FurnisystemsSDK from "./furnisystems-sdk"

const sdk = new FurnisystemsSDK({
  graphqlEndpoint: "http://localhost:4000/graphql",
  publishableKey: "your-publishable-key",
  debug: true, // Enable debug logging
})
```

### Authentication

```typescript
// Set authentication headers
sdk.setAuthHeaders({
  authorization: "Bearer your-jwt-token",
  "x-publishable-api-key": "your-api-key",
})
```

### Using Modules

```typescript
// Customer operations (when implemented)
const customer = await sdk.customer.getMe()

// Cart operations (when implemented)
const cart = await sdk.cart.createCart({ region_id: "region_123" })
await sdk.cart.addItem(cart.id, { variant_id: "variant_123", quantity: 1 })
```

### Advanced Usage

```typescript
// Access the underlying Apollo Client
const apolloClient = sdk.getApolloClient()

// Clear cache
sdk.clearCache()

// Reset cache
sdk.resetCache()
```

## Current Status

The SDK architecture is complete with the following components:

### ✅ Completed

- Apollo Client integration with authentication, error handling, and debugging
- Core SDK class with module initialization
- Type definitions for common entities (Customer, Cart, Product, etc.)
- Error handling with custom error classes
- Module structure for Customer and Cart

### 🚧 In Progress

- GraphQL queries and mutations for each module
- Integration with the existing data layer

### 📋 TODO

- Implement GraphQL operations for all modules
- Add more modules (Products, Orders, Payment, etc.)
- Add comprehensive tests
- Add documentation for each module
- Performance optimizations
- Extract to separate npm package

## Migration Strategy

The SDK is designed to gradually replace the existing Medusa SDK:

1. **Phase 1**: Architecture setup (✅ Complete)
2. **Phase 2**: Implement core modules (Customer, Cart)
3. **Phase 3**: Migrate existing data layer functions
4. **Phase 4**: Add remaining modules (Products, Orders, etc.)
5. **Phase 5**: Extract to separate package

## Error Handling

The SDK includes custom error classes for different scenarios:

```typescript
import {
  FurnisystemsError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  NetworkError,
} from "./furnisystems-sdk"

try {
  await sdk.customer.getMe()
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication failure
  } else if (error instanceof ValidationError) {
    // Handle validation errors
  }
}
```

## Configuration

### Environment Variables

```bash
# GraphQL endpoint
FURNISYSTEMS_BACKEND_URL=http://localhost:4000/graphql

# API keys
NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY=your-publishable-key
```

### Client Configuration

```typescript
interface ClientConfig {
  graphqlEndpoint: string
  apiKey?: string
  publishableKey?: string
  debug?: boolean
  timeout?: number
  defaultHeaders?: Record<string, string>
}
```

## Contributing

When adding new modules:

1. Create the module directory under `modules/`
2. Define types in `types.ts`
3. Implement the module class in `index.ts`
4. Export from the main SDK class
5. Add TODO comments for GraphQL operations

## Future Enhancements

- **Code Generation**: Generate TypeScript types from GraphQL schema
- **Subscriptions**: Add support for GraphQL subscriptions
- **Offline Support**: Add offline capabilities with Apollo Client
- **React Hooks**: Create React hooks for common operations
- **Testing**: Add comprehensive test suite
- **Documentation**: Generate API documentation from TypeScript types
