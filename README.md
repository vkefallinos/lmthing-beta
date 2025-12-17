# Base Class - React-like Hooks Implementation

A TypeScript class that implements React-like hooks (`defState`, `defEffect`, `defRef`, `defReducer`) in a standalone environment. The `Base` class accepts a function that is re-run until the state stabilizes.

## Features

- **defState**: State management similar to React's `useState`
- **defEffect**: Side effects with dependency tracking, similar to React's `useEffect`
- **defRef**: Mutable references that persist across re-runs, similar to React's `useRef`
- **defReducer**: Reducer-based state management, similar to React's `useReducer`
- **defInput**: Access input data within the hook system for data processing
- **defOutputObject** & **defOutputArray**: Generate structured output with namespace organization
- **Input/Output Pipeline**: Process input data and receive organized results via callback
- **Automatic stabilization**: The render function re-runs automatically until no more state changes occur
- **Effect cleanup**: Proper cleanup of effects when dependencies change or instance is destroyed

## Installation

```bash
npm install
```

## Usage

### Basic State Management

```typescript
import { Base } from './Base';

const instance = new Base();
instance.setFn(({ defState }) => {
  const [count, setCount] = defState(0);

  console.log('Count:', count);

  if (count < 5) {
    setCount(count + 1);
  }
});

// Output:
// Count: 0
// Count: 1
// Count: 2
// Count: 3
// Count: 4
// Count: 5
```

### Effects with Dependencies

```typescript
const instance = new Base();
instance.setFn(({ defState, defEffect }) => {
  const [count, setCount] = defState(0);

  defEffect(() => {
    console.log('Effect ran with count:', count);

    return () => {
      console.log('Cleanup for count:', count);
    };
  }, [count]);
});

// Effect runs once after state stabilizes
```

### Mutable References

```typescript
const instance = new Base();
instance.setFn(({ defState, defRef }) => {
  const [count, setCount] = defState(0);
  const renderCount = defRef(0);

  renderCount.current += 1;
  console.log('Render #', renderCount.current, 'Count:', count);

  if (count < 3) {
    setCount(count + 1);
  }
});

// Output:
// Render # 1 Count: 0
// Render # 2 Count: 1
// Render # 3 Count: 2
// Render # 4 Count: 3
```

### Reducer Pattern

```typescript
type Action = { type: 'increment' } | { type: 'decrement' };

const instance = new Base();
instance.setFn(({ defReducer }) => {
  const [count, dispatch] = defReducer(
    (state, action: Action) => {
      switch (action.type) {
        case 'increment':
          return state + 1;
        case 'decrement':
          return state - 1;
        default:
          return state;
      }
    },
    0
  );

  console.log('Count:', count);

  if (count < 3) {
    dispatch({ type: 'increment' });
  }
});
```

### Input/Output Pipeline

```typescript
const instance = new Base();

// Set up output callback
instance.onOutput((output) => {
  console.log('Processed output:', JSON.stringify(output, null, 2));
});

// Define processing logic
instance.setFn(({ defInput, defState, defOutputObject, defOutputArray }) => {
  const input = defInput<string[]>();
  const [processedCount, setProcessedCount] = defState(0);

  if (input && input.length > 0) {
    // Process each item
    input.forEach((item) => {
      defOutputArray('results', 'processed', item.toUpperCase());
    });

    // Update count once
    if (processedCount === 0) {
      setProcessedCount(input.length);
    }
  }

  // Add metadata to output
  defOutputObject('results', 'count', processedCount);
  defOutputObject('metadata', 'timestamp', Date.now());
});

// Process input data
instance.setInput(['apple', 'banana', 'cherry']);

// Output callback receives:
// {
//   "results": {
//     "processed": ["APPLE", "BANANA", "CHERRY"],
//     "count": 3
//   },
//   "metadata": {
//     "timestamp": 1703012345678
//   }
// }
```

### Conditional Output with Enable/Disable

```typescript
const instance = new Base();

instance.onOutput((output) => {
  console.log('Output:', output);
});

instance.setFn(({ defInput, defOutputObject }) => {
  const input = defInput<{ includeDebug: boolean; value: string }>();

  if (input) {
    defOutputObject('result', 'value', input.value);

    // Conditionally include debug info
    const debugOutput = defOutputObject('result', 'debug', 'Debug information');
    if (!input.includeDebug) {
      debugOutput.disable();
    }
  }
});

instance.setInput({ includeDebug: false, value: 'production' });
// Output: { result: { value: 'production' } }

instance.setInput({ includeDebug: true, value: 'development' });
// Output: { result: { value: 'development', debug: 'Debug information' } }
```

### Complex Example

```typescript
const instance = new Base();
instance.setFn(({ defState, defEffect, defRef }) => {
  const [count, setCount] = defState(0);
  const [name, setName] = defState('John');
  const renderCount = defRef(0);

  renderCount.current += 1;

  defEffect(() => {
    console.log(`User ${name} has count ${count}`);
  }, [name, count]);

  if (count === 0) {
    setCount(10);
  }

  if (name === 'John') {
    setName('Jane');
  }
});
```

## How It Works

1. **Initialization**: Create a `Base` instance, then call `setFn()` with your function
2. **Execution**: The function runs immediately when you call `setFn()`
3. **Hook Tracking**: Each call to `defState`, `defEffect`, etc. is tracked by index (like React)
4. **Stabilization Loop**:
   - The function runs and may trigger state updates
   - If state changes occur, the function re-runs
   - This continues until no more state changes happen (stabilization)
5. **Effect Execution**: After stabilization, all effects are run
6. **Cleanup**: Effect cleanup functions run before the effect re-runs or when `cleanup()` is called

## API

### `new Base()`

Creates a new Base instance. The instance does not execute any code until you call `setFn()`.

### `setFn(renderFn: (api) => void): void`

Sets the render function and immediately executes it. The function receives an API object with the hook methods.

**Parameters:**
- **renderFn**: A function that receives an object with `defState`, `defEffect`, `defRef`, `defReducer`, `defInput`, `defOutputObject`, and `defOutputArray` methods

### `defState<T>(initialValue: T): [T, (action: SetStateAction<T>) => void]`

Creates a state value that persists across re-runs.

- **initialValue**: The initial state value
- **Returns**: A tuple of [currentValue, setState]

### `defEffect(callback: () => void | (() => void), deps?: any[]): void`

Runs side effects after state stabilizes.

- **callback**: Function to run. Can return a cleanup function
- **deps**: Optional dependency array. Effect re-runs when dependencies change

### `defRef<T>(initialValue: T): { current: T }`

Creates a mutable reference that persists across re-runs.

- **initialValue**: The initial ref value
- **Returns**: An object with a `current` property

### `defReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void]`

Creates state managed by a reducer function.

- **reducer**: Function that takes current state and action, returns new state
- **initialState**: The initial state value
- **Returns**: A tuple of [currentState, dispatch]

### `setInput(input: any): void`

Sets the input data, clears all output hooks, and re-runs the render function.

- **input**: Any data you want to process

### `onOutput(callback: (output) => void): void`

Registers a callback to receive the processed output after state stabilizes.

- **callback**: Function that receives the output object organized by namespaces

### `defInput<T>(): T`

Accesses the input data within your render function.

- **Returns**: The input value set via `setInput()`

### `defOutputObject(namespace: string, key: string, value: any): OutputControl`

Creates an object output entry. Multiple calls with the same namespace/key will overwrite the previous value.

- **namespace**: Groups related outputs together
- **key**: The property name within the namespace
- **value**: The value to output
- **Returns**: An object with:
  - `key`: The output key
  - `value`: The output value
  - `enabled`: Boolean indicating if this output is enabled
  - `enable()`: Function to enable this output
  - `disable()`: Function to disable this output

### `defOutputArray(namespace: string, key: string, value: any): OutputControl`

Creates an array output entry. Multiple calls with the same namespace/key will append to an array.

- **namespace**: Groups related outputs together
- **key**: The property name within the namespace (will be an array)
- **value**: The value to append to the array
- **Returns**: An object with the same properties as `defOutputObject`

### `cleanup(): void`

Runs all effect cleanup functions. Call this when you're done with the instance.

## Running Tests

```bash
npm test
```

## Building

```bash
npm run build
```

## Development

For developers working on this project, see [CLAUDE.md](./CLAUDE.md) for:
- Architecture decisions and rationale
- Design patterns used
- Development workflow
- How to update documentation
- Project history and context

## License

ISC
