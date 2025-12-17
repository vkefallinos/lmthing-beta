# Base Class - React-like Hooks Implementation

A TypeScript class that implements React-like hooks (`defState`, `defEffect`, `defRef`, `defReducer`) in a standalone environment. The `Base` class accepts a function that is re-run until the state stabilizes.

## Features

- **defState**: State management similar to React's `useState`
- **defEffect**: Side effects with dependency tracking, similar to React's `useEffect`
- **defRef**: Mutable references that persist across re-runs, similar to React's `useRef`
- **defReducer**: Reducer-based state management, similar to React's `useReducer`
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

const instance = new Base(({ defState }) => {
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
const instance = new Base(({ defState, defEffect }) => {
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
const instance = new Base(({ defState, defRef }) => {
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

const instance = new Base(({ defReducer }) => {
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

### Complex Example

```typescript
const instance = new Base(({ defState, defEffect, defRef }) => {
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

1. **Initialization**: When you create a new `Base` instance, it immediately runs the provided function
2. **Hook Tracking**: Each call to `defState`, `defEffect`, etc. is tracked by index (like React)
3. **Stabilization Loop**:
   - The function runs and may trigger state updates
   - If state changes occur, the function re-runs
   - This continues until no more state changes happen (stabilization)
4. **Effect Execution**: After stabilization, all effects are run
5. **Cleanup**: Effect cleanup functions run before the effect re-runs or when `cleanup()` is called

## API

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

## License

ISC
