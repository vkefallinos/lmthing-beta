type SetStateAction<T> = T | ((prev: T) => T);
type Reducer<S, A> = (state: S, action: A) => S;
type EffectCallback = () => void | (() => void);
type DependencyList = ReadonlyArray<any>;

interface StateHook<T> {
  type: 'state';
  value: T;
}

interface ReducerHook<S, A> {
  type: 'reducer';
  value: S;
  reducer: Reducer<S, A>;
}

interface RefHook<T> {
  type: 'ref';
  current: T;
}

interface EffectHook {
  type: 'effect';
  callback: EffectCallback;
  deps: DependencyList | undefined;
  cleanup?: () => void;
  hasRun: boolean;
}

type Hook = StateHook<any> | ReducerHook<any, any> | RefHook<any> | EffectHook;

export class Base {
  private hooks: Hook[] = [];
  private currentHookIndex = 0;
  private isRunning = false;
  private pendingUpdates: Array<() => void> = [];
  private maxIterations = 1000; // Prevent infinite loops
  private renderFn?: (api: {
    defState: <T>(initialValue: T) => [T, (action: SetStateAction<T>) => void];
    defEffect: (callback: EffectCallback, deps?: DependencyList) => void;
    defRef: <T>(initialValue: T) => { current: T };
    defReducer: <S, A>(reducer: Reducer<S, A>, initialState: S) => [S, (action: A) => void];
  }) => void;

  constructor() {
    // Constructor is now empty - use setFn to set the render function
  }

  public setFn(renderFn: (api: {
    defState: <T>(initialValue: T) => [T, (action: SetStateAction<T>) => void];
    defEffect: (callback: EffectCallback, deps?: DependencyList) => void;
    defRef: <T>(initialValue: T) => { current: T };
    defReducer: <S, A>(reducer: Reducer<S, A>, initialState: S) => [S, (action: A) => void];
  }) => void): void {
    this.renderFn = renderFn;
    this.run();
  }

  private run(): void {
    if (!this.renderFn) {
      return; // No function set yet, nothing to run
    }

    let iterations = 0;
    let hasChanges = true;

    // Keep running until state stabilizes
    while (hasChanges && iterations < this.maxIterations) {
      hasChanges = false;
      this.currentHookIndex = 0;
      this.isRunning = true;
      this.pendingUpdates = [];

      // Run the user function
      this.renderFn({
        defState: this.defState.bind(this),
        defEffect: this.defEffect.bind(this),
        defRef: this.defRef.bind(this),
        defReducer: this.defReducer.bind(this),
      });

      this.isRunning = false;

      // Process any pending updates
      if (this.pendingUpdates.length > 0) {
        hasChanges = true;
        this.pendingUpdates.forEach(update => update());
        this.pendingUpdates = [];
      }

      iterations++;
    }

    if (iterations >= this.maxIterations) {
      throw new Error('Maximum iterations reached. Possible infinite loop detected.');
    }

    // Run effects after stabilization
    this.runEffects();
  }

  private defState<T>(initialValue: T): [T, (action: SetStateAction<T>) => void] {
    const hookIndex = this.currentHookIndex++;

    // Initialize hook if it doesn't exist
    if (hookIndex >= this.hooks.length) {
      this.hooks.push({
        type: 'state',
        value: initialValue,
      });
    }

    const hook = this.hooks[hookIndex] as StateHook<T>;

    const setState = (action: SetStateAction<T>) => {
      const newValue = typeof action === 'function'
        ? (action as (prev: T) => T)(hook.value)
        : action;

      if (newValue !== hook.value) {
        if (this.isRunning) {
          // Schedule update for next iteration
          this.pendingUpdates.push(() => {
            hook.value = newValue;
          });
        } else {
          // Update immediately and re-run
          hook.value = newValue;
          this.run();
        }
      }
    };

    return [hook.value, setState];
  }

  private defReducer<S, A>(
    reducer: Reducer<S, A>,
    initialState: S
  ): [S, (action: A) => void] {
    const hookIndex = this.currentHookIndex++;

    // Initialize hook if it doesn't exist
    if (hookIndex >= this.hooks.length) {
      this.hooks.push({
        type: 'reducer',
        value: initialState,
        reducer,
      });
    }

    const hook = this.hooks[hookIndex] as ReducerHook<S, A>;

    const dispatch = (action: A) => {
      const newValue = hook.reducer(hook.value, action);

      if (newValue !== hook.value) {
        if (this.isRunning) {
          // Schedule update for next iteration
          this.pendingUpdates.push(() => {
            hook.value = newValue;
          });
        } else {
          // Update immediately and re-run
          hook.value = newValue;
          this.run();
        }
      }
    };

    return [hook.value, dispatch];
  }

  private defRef<T>(initialValue: T): { current: T } {
    const hookIndex = this.currentHookIndex++;

    // Initialize hook if it doesn't exist
    if (hookIndex >= this.hooks.length) {
      this.hooks.push({
        type: 'ref',
        current: initialValue,
      });
    }

    return this.hooks[hookIndex] as RefHook<T>;
  }

  private defEffect(callback: EffectCallback, deps?: DependencyList): void {
    const hookIndex = this.currentHookIndex++;

    // Initialize hook if it doesn't exist
    if (hookIndex >= this.hooks.length) {
      this.hooks.push({
        type: 'effect',
        callback,
        deps,
        hasRun: false,
      });
      return;
    }

    const hook = this.hooks[hookIndex] as EffectHook;

    // Update callback and deps
    hook.callback = callback;

    // Check if deps have changed
    const depsChanged = !deps || !hook.deps ||
      deps.length !== hook.deps.length ||
      deps.some((dep, i) => dep !== hook.deps![i]);

    if (depsChanged) {
      hook.deps = deps;
      hook.hasRun = false; // Mark for re-run
    }
  }

  private runEffects(): void {
    this.hooks.forEach(hook => {
      if (hook.type === 'effect' && !hook.hasRun) {
        // Run cleanup from previous effect
        if (hook.cleanup) {
          hook.cleanup();
        }

        // Run effect and store cleanup
        const result = hook.callback();
        if (typeof result === 'function') {
          hook.cleanup = result;
        }

        hook.hasRun = true;
      }
    });
  }

  // Public method to trigger updates externally
  public update(): void {
    this.run();
  }

  // Cleanup method to run all effect cleanups
  public cleanup(): void {
    this.hooks.forEach(hook => {
      if (hook.type === 'effect' && hook.cleanup) {
        hook.cleanup();
      }
    });
  }
}
