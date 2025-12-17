# Claude Development Guide

## Project Overview

**Project Name**: lmthing-beta
**Purpose**: A TypeScript implementation of React-like hooks in a standalone class-based environment

This project provides a `Base` class that mimics React's hook system (`useState`, `useEffect`, `useRef`, `useReducer`) but operates independently of React. The class accepts a function via the `setFn()` method that is re-run automatically until the state stabilizes.

---

## What We're Building

### Core Component: Base Class

A TypeScript class that implements a hook-based state management system with the following capabilities:

1. **State Management** (`defState`) - Like React's `useState`
2. **Side Effects** (`defEffect`) - Like React's `useEffect`
3. **Mutable References** (`defRef`) - Like React's `useRef`
4. **Reducer Pattern** (`defReducer`) - Like React's `useReducer`

### Key Concept: Stabilization Loop

Unlike React which re-renders based on state changes, our `Base` class:
- Runs the provided function immediately when `setFn()` is called
- Re-runs the function automatically when state changes occur
- Continues re-running until no more state changes happen (stabilization)
- Executes effects only after the state has stabilized

---

## Architecture Decisions

### 1. Hook Index Tracking
**Decision**: Use index-based hook tracking (like React)
**Rationale**:
- Ensures hooks are called in the same order on every run
- Maintains state consistency across re-runs
- Prevents hook mismatches

**Implementation**:
```typescript
private currentHookIndex = 0;  // Reset to 0 on each run
```

### 2. Stabilization Loop
**Decision**: Re-run the function until state stabilizes
**Rationale**:
- Allows declarative state updates during initialization
- Simplifies complex initialization logic
- Mimics React's behavior but synchronously

**Implementation**:
```typescript
while (hasChanges && iterations < this.maxIterations) {
  // Run user function
  // Process pending updates
}
```

### 3. Effect Execution Timing
**Decision**: Run effects AFTER state stabilization
**Rationale**:
- Mirrors React's behavior (effects run after render)
- Prevents effects from running on intermediate states
- Ensures effects see the final stabilized state

**Implementation**:
```typescript
// After stabilization loop completes
this.runEffects();
```

### 4. Pending Updates Queue
**Decision**: Queue state updates during execution, apply between iterations
**Rationale**:
- Prevents state mutations during active execution
- Allows multiple updates to be batched
- Avoids inconsistent state during a single run

**Implementation**:
```typescript
private pendingUpdates: Array<() => void> = [];

// During run:
if (this.isRunning) {
  this.pendingUpdates.push(() => { hook.value = newValue; });
}
```

### 5. Infinite Loop Protection
**Decision**: Maximum iteration limit (1000)
**Rationale**:
- Prevents accidental infinite loops
- Provides clear error message for debugging
- Reasonable limit for legitimate use cases

**Implementation**:
```typescript
private maxIterations = 1000;
if (iterations >= this.maxIterations) {
  throw new Error('Maximum iterations reached. Possible infinite loop detected.');
}
```

### 6. Effect Dependency Tracking
**Decision**: Shallow comparison of dependency arrays
**Rationale**:
- Matches React's behavior
- Simple and predictable
- Efficient for most use cases

**Implementation**:
```typescript
const depsChanged = !deps || !hook.deps ||
  deps.length !== hook.deps.length ||
  deps.some((dep, i) => dep !== hook.deps![i]);
```

### 7. Ref Mutability
**Decision**: Refs don't trigger re-runs when mutated
**Rationale**:
- Matches React's `useRef` behavior
- Provides escape hatch for values that shouldn't cause updates
- Useful for tracking render counts, timers, etc.

### 8. setFn Method Pattern
**Decision**: Accept the render function via a `setFn()` method instead of the constructor
**Rationale**:
- Separates instance creation from execution
- Allows for deferred initialization when needed
- More flexible API that enables conditional setup
- Clearer control flow - instance exists before execution begins
- Enables potential future features like re-setting the function

**Implementation**:
```typescript
export class Base {
  private renderFn?: (api: {...}) => void;

  constructor() {
    // Empty constructor - use setFn to initialize
  }

  public setFn(renderFn: (api: {...}) => void): void {
    this.renderFn = renderFn;
    this.run();
  }

  private run(): void {
    if (!this.renderFn) {
      return; // No function set yet
    }
    // ... rest of execution logic
  }
}
```

**Usage**:
```typescript
const instance = new Base();
instance.setFn(({ defState, defEffect }) => {
  // Your code here
});
```

### 9. Function Execution Snapshots
**Decision**: Capture a snapshot of all hook states after each iteration of the stabilization loop
**Rationale**:
- Enables debugging and introspection of state evolution
- Allows time-travel debugging capabilities
- Provides transparency into how state stabilizes over multiple iterations
- Useful for understanding complex state update patterns
- Deep copies prevent snapshots from being mutated by reference

**Implementation**:
```typescript
interface HookSnapshot {
  type: 'state' | 'reducer' | 'ref' | 'effect';
  index: number;
  value?: any; // For state and reducer hooks
  current?: any; // For ref hooks
  deps?: ReadonlyArray<any>; // For effect hooks
  hasRun?: boolean; // For effect hooks
}

export interface FunctionSnapshot {
  iteration: number;
  timestamp: number;
  hooks: HookSnapshot[];
}

private snapshots: FunctionSnapshot[] = [];

private captureSnapshot(iteration: number): void {
  const snapshot: FunctionSnapshot = {
    iteration,
    timestamp: Date.now(),
    hooks: this.hooks.map((hook, index) => this.serializeHook(hook, index)),
  };
  this.snapshots.push(snapshot);
}
```

**API**:
```typescript
// Get all snapshots
const snapshots = instance.getSnapshots();

// Get the last snapshot
const lastSnapshot = instance.getLastSnapshot();

// Clear all snapshots
instance.clearSnapshots();
```

**Use Case**:
Debugging complex state stabilization, analyzing hook value evolution, understanding why a particular state was reached.

**Example**:
```typescript
const base = new Base();
base.setFn(({ defState }) => {
  const [count, setCount] = defState(0);
  if (count < 3) {
    setCount(count + 1);
  }
});

const snapshots = base.getSnapshots();
// snapshots[0].hooks[0].value === 0
// snapshots[1].hooks[0].value === 1
// snapshots[2].hooks[0].value === 2
// snapshots[3].hooks[0].value === 3
```

---

## File Structure

```
lmthing-beta/
├── src/
│   ├── Base.ts           # Core Base class implementation
│   ├── Base.test.ts      # Comprehensive test suite
│   └── index.ts          # Public API exports
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest test configuration
├── README.md             # User-facing documentation
├── CLAUDE.md             # This file - development guide
└── .gitignore           # Git ignore rules
```

---

## Design Patterns Used

### 1. Builder Pattern (Implicit)
The `Base` class acts as a builder, constructing a stateful execution environment through the provided function.

### 2. Observer Pattern (Effects)
Effects observe dependencies and re-run when dependencies change.

### 3. Command Pattern (Reducers)
Reducers use actions to command state changes in a predictable way.

### 4. Memento Pattern (Hook State)
Hooks store and restore state across multiple executions.

---

## Testing Strategy

### Test Coverage Areas
1. **Basic Functionality**: Each hook type works independently
2. **State Updates**: Functional updates, multiple states, stabilization
3. **Effect Lifecycle**: Running, cleanup, dependency tracking
4. **Refs**: Persistence, no re-run on mutation
5. **Reducers**: State updates via actions
6. **Complex Scenarios**: Multiple hooks interacting
7. **Edge Cases**: Empty functions, infinite loops, concurrent updates

### Test Philosophy
- **Comprehensive**: Cover all code paths
- **Behavioral**: Test what the class does, not how it does it
- **Realistic**: Test real-world usage patterns
- **Edge Cases**: Test error conditions and limits

---

## Known Limitations

1. **Synchronous Only**: Unlike React, all operations are synchronous
2. **No Async Effects**: Effects cannot be async (same as React)
3. **No Conditional Hooks**: Hook order must be consistent (same as React)
4. **Memory**: All hook state persists for the lifetime of the instance

---

## Future Enhancements (Potential)

### Considered for Future Development
- [ ] `defMemo` - Memoization hook
- [ ] `defCallback` - Callback memoization hook
- [ ] Async state updates
- [ ] Hook debugging tools
- [ ] Performance optimizations for large hook counts
- [ ] Custom hook composition helpers

### Not Planned
- ❌ DOM integration (use React instead)
- ❌ Component tree/hierarchy (out of scope)
- ❌ Concurrent mode (complexity not justified)

---

## How to Update This Document

### ⚠️ IMPORTANT: Keep This Document Current

This file is the source of truth for development decisions. Update it whenever you:

### When to Update

1. **Adding New Features**
   - Document the feature in "What We're Building"
   - Add architecture decisions explaining WHY you chose this approach
   - Update file structure if new files are added
   - Add to "Future Enhancements" if this enables new possibilities

2. **Making Architecture Changes**
   - Update the relevant section in "Architecture Decisions"
   - Explain the old approach and why it was changed
   - Document any migration steps if needed

3. **Changing Design Patterns**
   - Update "Design Patterns Used"
   - Explain the pattern and where it's applied

4. **Adding Tests**
   - Update "Testing Strategy" if you add a new category of tests
   - Update "Known Limitations" if tests reveal limitations

5. **Bug Fixes**
   - If the bug reveals a design flaw, document the fix in "Architecture Decisions"
   - Update "Known Limitations" if applicable

6. **Refactoring**
   - Update relevant sections if the refactor changes architecture
   - Update file structure if files are renamed/moved

### How to Update

#### Format for Architecture Decisions
```markdown
### N. [Decision Name]
**Decision**: [What was decided]
**Rationale**:
- [Why this approach]
- [What alternatives were considered]
- [Trade-offs]

**Implementation**:
```typescript
// Code snippet showing the decision
```
```

#### Format for New Features
```markdown
### [Feature Name]

[Brief description]

**Use Case**: [When/why to use this]
**Example**:
```typescript
// Example code
```
```

#### Commit Message Format
When updating this file:
```
docs: Update claude.md - [brief description]

- [What was added/changed]
- [Why it was changed]
```

### Review Checklist Before Committing

- [ ] All new architecture decisions are documented
- [ ] Code examples are tested and working
- [ ] File structure is up to date
- [ ] Rationale is clear and comprehensive
- [ ] No TODOs or placeholder text
- [ ] Links to code (file:line) are accurate

---

## Development Workflow

### Starting a New Feature
1. Read this document to understand existing architecture
2. Check "Architecture Decisions" for relevant patterns
3. Design your feature to align with existing patterns
4. Implement with tests
5. Update this document with new decisions
6. Update README.md with user-facing documentation

### Making Changes
1. Understand the existing decision/rationale
2. If changing an architecture decision, document WHY
3. Run tests to ensure no regressions
4. Update this document
5. Commit with clear message

### Code Review Focus
- Are architecture decisions followed?
- Is this document updated?
- Are rationales clear and complete?
- Do tests cover new functionality?

---

## Questions to Answer When Adding Features

Before implementing a new feature, answer these questions in this document:

1. **What problem does this solve?**
2. **Why this approach over alternatives?**
3. **What are the trade-offs?**
4. **How does it fit with existing architecture?**
5. **What are the performance implications?**
6. **What are the testing requirements?**
7. **What documentation is needed?**

---

## Communication with Claude (AI Assistant)

### Context Preservation
This file serves as long-term memory for the project. When working with Claude:

1. **Starting a session**: Claude should read this file first
2. **Making decisions**: Reference existing patterns in this file
3. **Ending a session**: Ensure this file is updated before pushing

### Decision Documentation
When Claude makes architecture decisions:
- Document the decision immediately
- Explain the reasoning clearly
- Provide code examples
- Update this file before completing the task

---

## Version History

### v1.2.0 - Function Execution Snapshots (2025-12-17)
- Added snapshot capture for each iteration of the stabilization loop
- Implemented deep copy mechanism to prevent mutation of snapshot data
- Added public API methods: `getSnapshots()`, `getLastSnapshot()`, `clearSnapshots()`
- Exported `FunctionSnapshot` interface for type safety
- Added 13 comprehensive snapshot tests (total: 36 tests)
- Added Architecture Decision #9 documenting the snapshot feature
- Enables debugging and time-travel inspection of hook state evolution

### v1.1.0 - setFn Method Refactoring (2025-12-17)
- Refactored Base class to use `setFn()` method instead of constructor parameter
- Separated instance creation from execution for more flexibility
- Updated all 24 tests to use new API pattern
- Updated README.md with new usage examples
- Added Architecture Decision #8 documenting the setFn pattern

### v1.0.0 - Initial Implementation (2025-12-17)
- Created Base class with defState, defEffect, defRef, defReducer
- Implemented stabilization loop architecture
- Added comprehensive test suite (24 tests)
- Established project structure and tooling

---

## Contact & Contribution

### Development Branch
All development occurs on: `claude/add-function-snapshots-RTjDG`

### Before Contributing
1. Read this entire document
2. Understand the architecture decisions
3. Follow the patterns established
4. Update this document with your changes
5. Ensure all tests pass

---

**Last Updated**: 2025-12-17
**Last Updated By**: Claude (snapshot feature)
**Next Review**: After next major feature addition
