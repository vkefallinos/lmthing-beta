import { Base } from './Base';

describe('Base class', () => {
  describe('defState', () => {
    it('should initialize state with the provided value', () => {
      let stateValue: number | undefined;

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count] = defState(0);
        stateValue = count;
      });

      expect(stateValue).toBe(0);
    });

    it('should update state and re-run until stable', () => {
      const runLog: number[] = [];

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);
        runLog.push(count);

        if (count < 3) {
          setCount(count + 1);
        }
      });

      // Should run 4 times: 0, 1, 2, 3
      expect(runLog).toEqual([0, 1, 2, 3]);
    });

    it('should handle multiple states independently', () => {
      let finalCount: number | undefined;
      let finalName: string | undefined;

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);
        const [name, setName] = defState('initial');

        finalCount = count;
        finalName = name;

        if (count === 0) {
          setCount(1);
        }
        if (name === 'initial') {
          setName('updated');
        }
      });

      expect(finalCount).toBe(1);
      expect(finalName).toBe('updated');
    });

    it('should support functional updates', () => {
      let finalValue: number | undefined;

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(5);
        finalValue = count;

        if (count === 5) {
          setCount(prev => prev * 2);
        }
      });

      expect(finalValue).toBe(10);
    });

    it('should not re-run if state is set to the same value', () => {
      const runLog: number[] = [];

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);
        runLog.push(count);

        // Always set to 0, should only run once
        setCount(0);
      });

      expect(runLog).toEqual([0]);
    });
  });

  describe('defEffect', () => {
    it('should run effect after state stabilizes', () => {
      const effectLog: string[] = [];

      const base = new Base();
      base.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);

        defEffect(() => {
          effectLog.push(`effect-${count}`);
        });

        if (count < 2) {
          setCount(count + 1);
        }
      });

      // Effect should only run once after stabilization (count = 2)
      expect(effectLog).toEqual(['effect-2']);
    });

    it('should re-run effect when dependencies change', () => {
      const effectLog: number[] = [];
      let triggerUpdate: (() => void) | undefined;

      const instance = new Base();
      instance.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);
        triggerUpdate = () => setCount(count + 1);

        defEffect(() => {
          effectLog.push(count);
        }, [count]);
      });

      expect(effectLog).toEqual([0]);

      // Trigger an update
      triggerUpdate!();
      expect(effectLog).toEqual([0, 1]);

      triggerUpdate!();
      expect(effectLog).toEqual([0, 1, 2]);
    });

    it('should not re-run effect when dependencies do not change', () => {
      const effectLog: number[] = [];
      let triggerUpdate: (() => void) | undefined;

      const base = new Base();
      base.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);
        const [other, setOther] = defState(0);
        triggerUpdate = () => setOther(other + 1);

        defEffect(() => {
          effectLog.push(count);
        }, [count]);
      });

      expect(effectLog).toEqual([0]);

      // Trigger update to 'other', should not re-run effect
      triggerUpdate!();
      expect(effectLog).toEqual([0]);
    });

    it('should run cleanup function before re-running effect', () => {
      const log: string[] = [];
      let triggerUpdate: (() => void) | undefined;

      const base = new Base();
      base.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);
        triggerUpdate = () => setCount(count + 1);

        defEffect(() => {
          log.push(`setup-${count}`);
          return () => {
            log.push(`cleanup-${count}`);
          };
        }, [count]);
      });

      expect(log).toEqual(['setup-0']);

      triggerUpdate!();
      expect(log).toEqual(['setup-0', 'cleanup-0', 'setup-1']);

      triggerUpdate!();
      expect(log).toEqual(['setup-0', 'cleanup-0', 'setup-1', 'cleanup-1', 'setup-2']);
    });

    it('should run cleanup on instance cleanup', () => {
      const log: string[] = [];

      const instance = new Base();
      instance.setFn(({ defEffect }) => {
        defEffect(() => {
          log.push('setup');
          return () => {
            log.push('cleanup');
          };
        });
      });

      expect(log).toEqual(['setup']);

      instance.cleanup();
      expect(log).toEqual(['setup', 'cleanup']);
    });

    it('should run effect without dependencies on every update', () => {
      const effectLog: number[] = [];
      let triggerUpdate: (() => void) | undefined;

      const base = new Base();
      base.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);
        triggerUpdate = () => setCount(count + 1);

        defEffect(() => {
          effectLog.push(count);
        });
      });

      expect(effectLog).toEqual([0]);

      triggerUpdate!();
      expect(effectLog).toEqual([0, 1]);
    });
  });

  describe('defRef', () => {
    it('should create a mutable ref with initial value', () => {
      let ref: { current: number } | undefined;

      const base = new Base();
      base.setFn(({ defRef }) => {
        ref = defRef(42);
      });

      expect(ref?.current).toBe(42);
    });

    it('should maintain ref value across re-runs', () => {
      const log: number[] = [];

      const base = new Base();
      base.setFn(({ defState, defRef }) => {
        const [count, setCount] = defState(0);
        const ref = defRef(0);

        ref.current += 1;
        log.push(ref.current);

        if (count < 2) {
          setCount(count + 1);
        }
      });

      // Ref should increment on each run: 1, 2, 3
      expect(log).toEqual([1, 2, 3]);
    });

    it('should not trigger re-runs when ref value changes', () => {
      const runLog: number[] = [];
      let refValue: { current: number } | undefined;

      const base = new Base();
      base.setFn(({ defState, defRef }) => {
        const [count] = defState(0);
        const ref = defRef(0);
        refValue = ref;

        runLog.push(count);

        // Changing ref should not trigger re-run
        ref.current = 100;
      });

      expect(runLog).toEqual([0]);
      expect(refValue?.current).toBe(100);
    });
  });

  describe('defReducer', () => {
    it('should initialize reducer with initial state', () => {
      let state: number | undefined;

      const base = new Base();
      base.setFn(({ defReducer }) => {
        const [count] = defReducer((state, action: number) => state + action, 0);
        state = count;
      });

      expect(state).toBe(0);
    });

    it('should update state using reducer and re-run', () => {
      const runLog: number[] = [];

      const base = new Base();
      base.setFn(({ defReducer }) => {
        const [count, dispatch] = defReducer(
          (state, action: { type: 'increment' | 'decrement' }) => {
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

        runLog.push(count);

        if (count === 0) {
          dispatch({ type: 'increment' });
        } else if (count === 1) {
          dispatch({ type: 'increment' });
        }
      });

      expect(runLog).toEqual([0, 1, 2]);
    });

    it('should not re-run if reducer returns same state', () => {
      const runLog: number[] = [];

      const base = new Base();
      base.setFn(({ defReducer }) => {
        const [count, dispatch] = defReducer((state, action: number) => state, 0);

        runLog.push(count);
        dispatch(999); // Reducer always returns same state
      });

      expect(runLog).toEqual([0]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle combination of state, effect, and ref', () => {
      const effectLog: string[] = [];
      let finalRefValue: number | undefined;

      const base = new Base();
      base.setFn(({ defState, defEffect, defRef }) => {
        const [count, setCount] = defState(0);
        const renderCount = defRef(0);

        renderCount.current += 1;
        finalRefValue = renderCount.current;

        defEffect(() => {
          effectLog.push(`effect-count:${count}-renders:${renderCount.current}`);
        }, [count]);

        if (count < 2) {
          setCount(count + 1);
        }
      });

      // Should render 3 times (count: 0, 1, 2)
      expect(finalRefValue).toBe(3);
      // Effect runs once after stabilization
      expect(effectLog).toEqual(['effect-count:2-renders:3']);
    });

    it('should handle state updates from effects triggering re-stabilization', () => {
      let finalCount: number | undefined;
      let externalTrigger: (() => void) | undefined;

      const instance = new Base();
      instance.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);
        const [triggered, setTriggered] = defState(false);

        finalCount = count;
        externalTrigger = () => setTriggered(true);

        defEffect(() => {
          if (triggered && count < 5) {
            setCount(count + 1);
          }
        }, [triggered, count]);
      });

      expect(finalCount).toBe(0);

      // Trigger the effect to start incrementing
      externalTrigger!();

      // Count should have incremented to 5
      expect(finalCount).toBe(5);
    });

    it('should prevent infinite loops by limiting iterations', () => {
      expect(() => {
        const base = new Base();
        base.setFn(({ defState }) => {
          const [count, setCount] = defState(0);
          // Always increment, creating infinite loop
          setCount(count + 1);
        });
      }).toThrow('Maximum iterations reached');
    });

    it('should maintain hook order consistency', () => {
      const log: Array<[number, string]> = [];

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);
        const [name, setName] = defState('test');

        log.push([count, name]);

        if (count === 0) {
          setCount(1);
        }
      });

      // Both hooks should maintain their values
      expect(log).toEqual([
        [0, 'test'],
        [1, 'test'],
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty render function', () => {
      expect(() => {
        const base = new Base();
        base.setFn(() => {
          // Do nothing
        });
      }).not.toThrow();
    });

    it('should handle multiple effects with different dependencies', () => {
      const effect1Log: number[] = [];
      const effect2Log: number[] = [];
      let triggerUpdate: (() => void) | undefined;

      const base = new Base();
      base.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);
        const [other, setOther] = defState(10);

        triggerUpdate = () => setCount(count + 1);

        defEffect(() => {
          effect1Log.push(count);
        }, [count]);

        defEffect(() => {
          effect2Log.push(other);
        }, [other]);
      });

      expect(effect1Log).toEqual([0]);
      expect(effect2Log).toEqual([10]);

      triggerUpdate!();

      expect(effect1Log).toEqual([0, 1]);
      expect(effect2Log).toEqual([10]); // Should not re-run
    });

    it('should handle state updates during stabilization', () => {
      const log: number[] = [];

      const base = new Base();
      base.setFn(({ defState }) => {
        const [a, setA] = defState(0);
        const [b, setB] = defState(0);

        log.push(a + b);

        if (a < 2) {
          setA(a + 1);
        }
        if (a === 2 && b < 2) {
          setB(b + 1);
        }
      });

      // Should stabilize at a=2, b=2, sum=4
      expect(log[log.length - 1]).toBe(4);
    });
  });

  describe('snapshots', () => {
    it('should capture snapshots for each iteration', () => {
      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);

        if (count < 3) {
          setCount(count + 1);
        }
      });

      const snapshots = base.getSnapshots();

      // Should have 4 snapshots (iterations 0, 1, 2, 3)
      expect(snapshots.length).toBe(4);
      expect(snapshots[0].iteration).toBe(0);
      expect(snapshots[1].iteration).toBe(1);
      expect(snapshots[2].iteration).toBe(2);
      expect(snapshots[3].iteration).toBe(3);
    });

    it('should capture state hook values in snapshots', () => {
      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);

        if (count < 2) {
          setCount(count + 1);
        }
      });

      const snapshots = base.getSnapshots();

      // Check state values in each snapshot
      expect(snapshots[0].hooks[0].value).toBe(0);
      expect(snapshots[1].hooks[0].value).toBe(1);
      expect(snapshots[2].hooks[0].value).toBe(2);
    });

    it('should capture ref hook values in snapshots', () => {
      const base = new Base();
      base.setFn(({ defState, defRef }) => {
        const [count, setCount] = defState(0);
        const ref = defRef(0);

        ref.current = count * 10;

        if (count < 2) {
          setCount(count + 1);
        }
      });

      const snapshots = base.getSnapshots();

      // Check ref values in each snapshot
      expect(snapshots[0].hooks[1].current).toBe(0);
      expect(snapshots[1].hooks[1].current).toBe(10);
      expect(snapshots[2].hooks[1].current).toBe(20);
    });

    it('should capture reducer hook values in snapshots', () => {
      const base = new Base();
      base.setFn(({ defReducer }) => {
        const [count, dispatch] = defReducer(
          (state, action: 'increment') => state + 1,
          0
        );

        if (count < 2) {
          dispatch('increment');
        }
      });

      const snapshots = base.getSnapshots();

      // Check reducer values
      expect(snapshots[0].hooks[0].value).toBe(0);
      expect(snapshots[1].hooks[0].value).toBe(1);
      expect(snapshots[2].hooks[0].value).toBe(2);
    });

    it('should capture effect hook metadata in snapshots', () => {
      const base = new Base();
      base.setFn(({ defState, defEffect }) => {
        const [count, setCount] = defState(0);

        defEffect(() => {
          // Effect body
        }, [count]);

        if (count < 1) {
          setCount(count + 1);
        }
      });

      const snapshots = base.getSnapshots();

      // Check effect metadata
      const effectHook0 = snapshots[0].hooks.find(h => h.type === 'effect');
      const effectHook1 = snapshots[1].hooks.find(h => h.type === 'effect');

      expect(effectHook0?.deps).toEqual([0]);
      expect(effectHook0?.hasRun).toBe(false);

      expect(effectHook1?.deps).toEqual([1]);
      expect(effectHook1?.hasRun).toBe(false);
    });

    it('should deep copy hook values to prevent mutation', () => {
      let objState: { value: number } | undefined;

      const base = new Base();
      base.setFn(({ defState }) => {
        const [obj, setObj] = defState({ value: 0 });
        objState = obj;

        if (obj.value < 1) {
          setObj({ value: obj.value + 1 });
        }
      });

      const snapshots = base.getSnapshots();

      // Mutate the current state
      objState!.value = 999;

      // Snapshots should not be affected
      expect(snapshots[0].hooks[0].value).toEqual({ value: 0 });
      expect(snapshots[1].hooks[0].value).toEqual({ value: 1 });
    });

    it('should provide getLastSnapshot() method', () => {
      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);

        if (count < 2) {
          setCount(count + 1);
        }
      });

      const lastSnapshot = base.getLastSnapshot();

      expect(lastSnapshot).toBeDefined();
      expect(lastSnapshot!.iteration).toBe(2);
      expect(lastSnapshot!.hooks[0].value).toBe(2);
    });

    it('should return undefined from getLastSnapshot() when no snapshots exist', () => {
      const base = new Base();

      const lastSnapshot = base.getLastSnapshot();
      expect(lastSnapshot).toBeUndefined();
    });

    it('should clear snapshots with clearSnapshots()', () => {
      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);

        if (count < 2) {
          setCount(count + 1);
        }
      });

      expect(base.getSnapshots().length).toBe(3);

      base.clearSnapshots();

      expect(base.getSnapshots().length).toBe(0);
      expect(base.getLastSnapshot()).toBeUndefined();
    });

    it('should capture snapshots across multiple update() calls', () => {
      let triggerUpdate: (() => void) | undefined;

      const base = new Base();
      base.setFn(({ defState }) => {
        const [count, setCount] = defState(0);
        triggerUpdate = () => setCount(count + 1);
      });

      // Initial run creates 1 snapshot
      expect(base.getSnapshots().length).toBe(1);

      // First update
      triggerUpdate!();
      expect(base.getSnapshots().length).toBe(2);

      // Second update
      triggerUpdate!();
      expect(base.getSnapshots().length).toBe(3);

      // Verify iteration numbers
      const snapshots = base.getSnapshots();
      expect(snapshots[0].iteration).toBe(0);
      expect(snapshots[1].iteration).toBe(0); // New run starts at 0
      expect(snapshots[2].iteration).toBe(0); // Each run starts at 0
    });

    it('should include timestamp in snapshots', () => {
      const base = new Base();
      const beforeTime = Date.now();

      base.setFn(({ defState }) => {
        const [count] = defState(0);
      });

      const afterTime = Date.now();
      const snapshots = base.getSnapshots();

      expect(snapshots[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(snapshots[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should capture complex hook combinations in snapshots', () => {
      const base = new Base();
      base.setFn(({ defState, defRef, defReducer, defEffect }) => {
        const [count, setCount] = defState(0);
        const ref = defRef(0);
        const [sum, dispatch] = defReducer(
          (state, action: number) => state + action,
          0
        );

        ref.current = count;

        defEffect(() => {
          // Effect
        }, [count]);

        if (count === 0) {
          setCount(1);
          dispatch(10);
        }
      });

      const snapshots = base.getSnapshots();

      // Verify last snapshot has all hooks
      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot.hooks.length).toBe(4);

      const stateHook = lastSnapshot.hooks.find(h => h.type === 'state');
      const refHook = lastSnapshot.hooks.find(h => h.type === 'ref');
      const reducerHook = lastSnapshot.hooks.find(h => h.type === 'reducer');
      const effectHook = lastSnapshot.hooks.find(h => h.type === 'effect');

      expect(stateHook?.value).toBe(1);
      expect(refHook?.current).toBe(1);
      expect(reducerHook?.value).toBe(10);
      expect(effectHook?.deps).toEqual([1]);
    });
  });

  describe('input/output system', () => {
    describe('defInput', () => {
      it('should access input value set with setInput', () => {
        let inputValue: any;

        const base = new Base();
        base.setFn(({ defInput }) => {
          inputValue = defInput();
        });

        expect(inputValue).toBeUndefined();

        base.setInput('test-input');
        expect(inputValue).toBe('test-input');
      });

      it('should update input value on multiple setInput calls', () => {
        let inputValue: any;

        const base = new Base();
        base.setFn(({ defInput }) => {
          inputValue = defInput();
        });

        base.setInput('first');
        expect(inputValue).toBe('first');

        base.setInput('second');
        expect(inputValue).toBe('second');

        base.setInput({ complex: 'object' });
        expect(inputValue).toEqual({ complex: 'object' });
      });
    });

    describe('defOutputObject', () => {
      it('should create output object with namespace and key', () => {
        let outputItem: any;

        const base = new Base();
        base.setFn(({ defOutputObject }) => {
          outputItem = defOutputObject('ns1', 'key1', 'value1');
        });

        expect(outputItem.key).toBe('key1');
        expect(outputItem.value).toBe('value1');
        expect(outputItem.enabled).toBe(true);
        expect(typeof outputItem.enable).toBe('function');
        expect(typeof outputItem.disable).toBe('function');
      });

      it('should support enable and disable functions', () => {
        let outputItem: any;

        const base = new Base();
        base.setFn(({ defOutputObject }) => {
          outputItem = defOutputObject('ns1', 'key1', 'value1');
        });

        expect(outputItem.enabled).toBe(true);

        outputItem.disable();
        expect(outputItem.enabled).toBe(false);

        outputItem.enable();
        expect(outputItem.enabled).toBe(true);
      });

      it('should update values on re-run', () => {
        let outputItem: any;

        const base = new Base();
        base.setFn(({ defState, defOutputObject }) => {
          const [count, setCount] = defState(0);
          outputItem = defOutputObject('ns1', 'counter', count);

          if (count < 2) {
            setCount(count + 1);
          }
        });

        expect(outputItem.value).toBe(2);
      });
    });

    describe('defOutputArray', () => {
      it('should create output array item with namespace and key', () => {
        let outputItem: any;

        const base = new Base();
        base.setFn(({ defOutputArray }) => {
          outputItem = defOutputArray('ns1', 'items', 'item1');
        });

        expect(outputItem.key).toBe('items');
        expect(outputItem.value).toBe('item1');
        expect(outputItem.enabled).toBe(true);
      });

      it('should support enable and disable functions', () => {
        let outputItem: any;

        const base = new Base();
        base.setFn(({ defOutputArray }) => {
          outputItem = defOutputArray('ns1', 'items', 'item1');
        });

        expect(outputItem.enabled).toBe(true);

        outputItem.disable();
        expect(outputItem.enabled).toBe(false);

        outputItem.enable();
        expect(outputItem.enabled).toBe(true);
      });
    });

    describe('onOutput callback', () => {
      it('should call onOutput callback after stabilization', () => {
        let capturedOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
        });

        base.setFn(({ defOutputObject }) => {
          defOutputObject('ns1', 'key1', 'value1');
        });

        expect(capturedOutput).toEqual({
          ns1: { key1: 'value1' },
        });
      });

      it('should build output with multiple namespaces', () => {
        let capturedOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
        });

        base.setFn(({ defOutputObject }) => {
          defOutputObject('ns1', 'key1', 'value1');
          defOutputObject('ns2', 'key2', 'value2');
          defOutputObject('ns1', 'key3', 'value3');
        });

        expect(capturedOutput).toEqual({
          ns1: { key1: 'value1', key3: 'value3' },
          ns2: { key2: 'value2' },
        });
      });

      it('should build output with array values', () => {
        let capturedOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
        });

        base.setFn(({ defOutputArray }) => {
          defOutputArray('ns1', 'items', 'item1');
          defOutputArray('ns1', 'items', 'item2');
          defOutputArray('ns1', 'items', 'item3');
        });

        expect(capturedOutput).toEqual({
          ns1: { items: ['item1', 'item2', 'item3'] },
        });
      });

      it('should exclude disabled outputs', () => {
        let capturedOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
        });

        base.setFn(({ defOutputObject }) => {
          defOutputObject('ns1', 'key1', 'value1');
          const item2 = defOutputObject('ns1', 'key2', 'value2');
          item2.disable();
          defOutputObject('ns1', 'key3', 'value3');
        });

        expect(capturedOutput).toEqual({
          ns1: { key1: 'value1', key3: 'value3' },
        });
      });

      it('should mix object and array outputs in same namespace', () => {
        let capturedOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
        });

        base.setFn(({ defOutputObject, defOutputArray }) => {
          defOutputObject('ns1', 'name', 'test');
          defOutputArray('ns1', 'tags', 'tag1');
          defOutputArray('ns1', 'tags', 'tag2');
          defOutputObject('ns1', 'count', 5);
        });

        expect(capturedOutput).toEqual({
          ns1: {
            name: 'test',
            tags: ['tag1', 'tag2'],
            count: 5,
          },
        });
      });
    });

    describe('setInput clearing outputs', () => {
      it('should clear output hooks when setInput is called', () => {
        let capturedOutput: any;
        const outputs: any[] = [];

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
          outputs.push(output);
        });

        base.setFn(({ defInput, defOutputObject }) => {
          const input = defInput<string>();
          defOutputObject('ns1', 'input', input);
        });

        expect(capturedOutput).toEqual({
          ns1: { input: undefined },
        });

        base.setInput('first');
        expect(capturedOutput).toEqual({
          ns1: { input: 'first' },
        });

        base.setInput('second');
        expect(capturedOutput).toEqual({
          ns1: { input: 'second' },
        });

        // Should have 3 outputs (initial, first, second)
        expect(outputs.length).toBe(3);
      });

      it('should maintain non-output hooks when clearing outputs', () => {
        let stateValue: number | undefined;
        let capturedOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          capturedOutput = output;
        });

        base.setFn(({ defState, defInput, defOutputObject }) => {
          const [count, setCount] = defState(0);
          const input = defInput<string>();

          stateValue = count;
          defOutputObject('ns1', 'count', count);
          defOutputObject('ns1', 'input', input);

          // Increment count once on first input
          if (input === 'first' && count === 0) {
            setCount(1);
          }
        });

        base.setInput('first');
        expect(stateValue).toBe(1);
        expect(capturedOutput).toEqual({
          ns1: { count: 1, input: 'first' },
        });

        // State should persist across setInput
        base.setInput('second');
        expect(stateValue).toBe(1); // State persists
        expect(capturedOutput).toEqual({
          ns1: { count: 1, input: 'second' },
        });
      });
    });

    describe('integration tests', () => {
      it('should combine input, state, and output in real scenario', () => {
        const outputs: any[] = [];

        const base = new Base();
        base.onOutput((output) => {
          outputs.push(output);
        });

        base.setFn(({ defInput, defState, defOutputObject, defOutputArray }) => {
          const input = defInput<{ items: string[] }>();
          const [processedCount, setProcessedCount] = defState(0);

          if (input && input.items) {
            input.items.forEach((item) => {
              defOutputArray('results', 'processed', item.toUpperCase());
            });

            if (processedCount === 0) {
              setProcessedCount(input.items.length);
            }
          }

          defOutputObject('results', 'count', processedCount);
        });

        base.setInput({ items: ['apple', 'banana', 'cherry'] });

        expect(outputs[outputs.length - 1]).toEqual({
          results: {
            processed: ['APPLE', 'BANANA', 'CHERRY'],
            count: 3,
          },
        });
      });

      it('should handle complex processing pipeline', () => {
        let finalOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          finalOutput = output;
        });

        base.setFn(({ defInput, defState, defOutputObject, defOutputArray }) => {
          const input = defInput<number>();
          const [multiplier, setMultiplier] = defState(1);

          if (input !== undefined) {
            const result = input * multiplier;

            defOutputObject('calculation', 'input', input);
            defOutputObject('calculation', 'multiplier', multiplier);
            defOutputObject('calculation', 'result', result);

            // Build a sequence
            for (let i = 1; i <= input; i++) {
              defOutputArray('sequence', 'values', i * multiplier);
            }

            // Update multiplier once
            if (multiplier === 1) {
              setMultiplier(2);
            }
          }
        });

        base.setInput(3);

        expect(finalOutput).toEqual({
          calculation: {
            input: 3,
            multiplier: 2,
            result: 6,
          },
          sequence: {
            values: [2, 4, 6],
          },
        });
      });

      it('should support conditional output generation', () => {
        let finalOutput: any;

        const base = new Base();
        base.onOutput((output) => {
          finalOutput = output;
        });

        base.setFn(({ defInput, defOutputObject }) => {
          const input = defInput<{ type: string; value: any }>();

          if (input) {
            if (input.type === 'success') {
              defOutputObject('result', 'status', 'success');
              defOutputObject('result', 'data', input.value);
            } else if (input.type === 'error') {
              defOutputObject('result', 'status', 'error');
              defOutputObject('result', 'message', input.value);
            }
          }
        });

        base.setInput({ type: 'success', value: { id: 1, name: 'Test' } });
        expect(finalOutput).toEqual({
          result: {
            status: 'success',
            data: { id: 1, name: 'Test' },
          },
        });

        base.setInput({ type: 'error', value: 'Something went wrong' });
        expect(finalOutput).toEqual({
          result: {
            status: 'error',
            message: 'Something went wrong',
          },
        });
      });
    });

    describe('snapshots with input/output hooks', () => {
      it('should capture input hooks in snapshots', () => {
        const base = new Base();
        base.setFn(({ defInput, defOutputObject }) => {
          const input = defInput<string>();
          defOutputObject('ns1', 'data', input);
        });

        base.setInput('test');

        const snapshots = base.getSnapshots();
        const lastSnapshot = snapshots[snapshots.length - 1];

        const inputHook = lastSnapshot.hooks.find(h => h.type === 'input');
        expect(inputHook).toBeDefined();
        expect(inputHook?.value).toBe('test');
      });

      it('should capture output hooks in snapshots', () => {
        const base = new Base();
        base.setFn(({ defOutputObject, defOutputArray }) => {
          defOutputObject('ns1', 'key1', 'value1');
          defOutputArray('ns1', 'items', 'item1');
        });

        const snapshots = base.getSnapshots();
        const lastSnapshot = snapshots[snapshots.length - 1];

        const outputObjectHook = lastSnapshot.hooks.find(
          h => h.type === 'outputObject'
        );
        const outputArrayHook = lastSnapshot.hooks.find(
          h => h.type === 'outputArray'
        );

        expect(outputObjectHook).toBeDefined();
        expect(outputObjectHook?.namespace).toBe('ns1');
        expect(outputObjectHook?.key).toBe('key1');
        expect(outputObjectHook?.value).toBe('value1');
        expect(outputObjectHook?.enabled).toBe(true);

        expect(outputArrayHook).toBeDefined();
        expect(outputArrayHook?.namespace).toBe('ns1');
        expect(outputArrayHook?.key).toBe('items');
        expect(outputArrayHook?.value).toBe('item1');
        expect(outputArrayHook?.enabled).toBe(true);
      });
    });
  });

  describe('extend method', () => {
    it('should allow extending with custom def methods', () => {
      const base = new Base();
      let outputValue: any;

      base.extend({
        defVariable: {
          execute: ({ defOutputObject }, name, value) => {
            return defOutputObject('variables', name, value);
          },
        },
      });

      base.onOutput((output) => {
        outputValue = output;
      });

      base.setFn(({ defVariable }: any) => {
        defVariable('x', 10);
        defVariable('y', 20);
      });

      expect(outputValue).toEqual({
        variables: { x: 10, y: 20 },
      });
    });

    it('should call init function once on first usage', () => {
      const initLog: string[] = [];
      const base = new Base();

      base.extend({
        defCounter: {
          init: (base) => {
            initLog.push('init-called');
          },
          execute: ({ defState }, label) => {
            const [count, setCount] = defState(0);
            if (count < 2) {
              setCount(count + 1);
            }
            return { label, count };
          },
        },
      });

      base.setFn(({ defCounter }: any) => {
        defCounter('counter1');
      });

      // Init should be called exactly once
      expect(initLog).toEqual(['init-called']);
    });

    it('should not call init if not provided', () => {
      const base = new Base();
      let result: any;

      base.extend({
        defSimple: {
          execute: (api, value) => {
            return value * 2;
          },
        },
      });

      base.setFn(({ defSimple }: any) => {
        result = defSimple(5);
      });

      expect(result).toBe(10);
    });

    it('should provide access to all base API methods in execute', () => {
      const base = new Base();
      let finalState: any;

      base.extend({
        defComplex: {
          execute: ({ defState, defRef, defEffect }, initialValue) => {
            const [value, setValue] = defState(initialValue);
            const ref = defRef(0);

            ref.current += 1;

            defEffect(() => {
              // Effect can run
            }, [value]);

            return { value, refCount: ref.current, setValue };
          },
        },
      });

      base.setFn(({ defComplex }: any) => {
        const result = defComplex(100);
        finalState = result;
      });

      expect(finalState.value).toBe(100);
      expect(finalState.refCount).toBeGreaterThan(0);
    });

    it('should allow multiple extensions', () => {
      const base = new Base();
      let output: any;

      base.extend({
        defVariable: {
          execute: ({ defOutputObject }, name, value) => {
            return defOutputObject('variables', name, value);
          },
        },
        defConstant: {
          execute: ({ defOutputObject }, name, value) => {
            return defOutputObject('constants', name, value);
          },
        },
      });

      base.onOutput((out) => {
        output = out;
      });

      base.setFn(({ defVariable, defConstant }: any) => {
        defVariable('x', 10);
        defConstant('PI', 3.14);
      });

      expect(output).toEqual({
        variables: { x: 10 },
        constants: { PI: 3.14 },
      });
    });

    it('should support chaining extend calls', () => {
      const base = new Base();
      let output: any;

      base.extend({
        defVar1: {
          execute: ({ defOutputObject }, value) => {
            return defOutputObject('ns1', 'key1', value);
          },
        },
      });

      base.extend({
        defVar2: {
          execute: ({ defOutputObject }, value) => {
            return defOutputObject('ns1', 'key2', value);
          },
        },
      });

      base.onOutput((out) => {
        output = out;
      });

      base.setFn(({ defVar1, defVar2 }: any) => {
        defVar1('value1');
        defVar2('value2');
      });

      expect(output).toEqual({
        ns1: { key1: 'value1', key2: 'value2' },
      });
    });

    it('should work with state updates in extended methods', () => {
      const base = new Base();
      const runLog: number[] = [];

      base.extend({
        defIncrement: {
          execute: ({ defState }) => {
            const [count, setCount] = defState(0);
            runLog.push(count);

            if (count < 3) {
              setCount(count + 1);
            }

            return count;
          },
        },
      });

      base.setFn(({ defIncrement }: any) => {
        defIncrement();
      });

      expect(runLog).toEqual([0, 1, 2, 3]);
    });

    it('should allow extended methods to use other extended methods', () => {
      const base = new Base();
      let output: any;

      base.extend({
        defHelper: {
          execute: ({ defOutputArray }, namespace, value) => {
            defOutputArray(namespace, 'items', value);
          },
        },
        defProcessor: {
          execute: (api, items) => {
            items.forEach((item: string) => {
              (api as any).defHelper('processed', item.toUpperCase());
            });
          },
        },
      });

      base.onOutput((out) => {
        output = out;
      });

      base.setFn(({ defProcessor }: any) => {
        defProcessor(['apple', 'banana']);
      });

      expect(output).toEqual({
        processed: { items: ['APPLE', 'BANANA'] },
      });
    });

    it('should initialize extension only once across multiple runs', () => {
      const initLog: string[] = [];
      const base = new Base();
      let triggerUpdate: (() => void) | undefined;

      base.extend({
        defTracked: {
          init: () => {
            initLog.push('init');
          },
          execute: ({ defState }) => {
            const [count, setCount] = defState(0);
            triggerUpdate = () => setCount(count + 1);
            return count;
          },
        },
      });

      base.setFn(({ defTracked }: any) => {
        defTracked();
      });

      expect(initLog).toEqual(['init']);

      // Trigger multiple updates
      triggerUpdate!();
      triggerUpdate!();

      // Init should still only be called once
      expect(initLog).toEqual(['init']);
    });

    it('should pass Base instance to init function', () => {
      let capturedBase: any;
      const base = new Base();

      base.extend({
        defCapture: {
          init: (baseInstance) => {
            capturedBase = baseInstance;
          },
          execute: () => {},
        },
      });

      base.setFn(({ defCapture }: any) => {
        defCapture();
      });

      expect(capturedBase).toBe(base);
    });

    it('should support complex real-world use case', () => {
      const base = new Base();
      let output: any;

      // Create a defVariable extension that uses defOutputObject
      base.extend({
        defVariable: {
          init: (base) => {
            // Could initialize a variable registry here
          },
          execute: ({ defOutputObject }, name, value) => {
            return defOutputObject('variables', name, value);
          },
        },
      });

      base.onOutput((out) => {
        output = out;
      });

      base.setFn(({ defInput, defState, defVariable }: any) => {
        const input: { x: number; y: number } = defInput();
        const [multiplier, setMultiplier] = defState(1);

        if (input) {
          defVariable('x', input.x * multiplier);
          defVariable('y', input.y * multiplier);
          defVariable('sum', (input.x + input.y) * multiplier);

          if (multiplier === 1) {
            setMultiplier(2);
          }
        }
      });

      base.setInput({ x: 3, y: 4 });

      expect(output).toEqual({
        variables: {
          x: 6,
          y: 8,
          sum: 14,
        },
      });
    });

    it('should return values from extended methods', () => {
      const base = new Base();
      let returnedValue: any;

      base.extend({
        defCalculate: {
          execute: (api, a, b) => {
            return a + b;
          },
        },
      });

      base.setFn(({ defCalculate }: any) => {
        returnedValue = defCalculate(5, 10);
      });

      expect(returnedValue).toBe(15);
    });

    it('should work with effects in extended methods', () => {
      const effectLog: string[] = [];
      const base = new Base();
      let triggerUpdate: (() => void) | undefined;

      base.extend({
        defWatcher: {
          execute: ({ defState, defEffect }, label) => {
            const [count, setCount] = defState(0);
            triggerUpdate = () => setCount(count + 1);

            defEffect(() => {
              effectLog.push(`${label}:${count}`);
            }, [count]);

            return count;
          },
        },
      });

      base.setFn(({ defWatcher }: any) => {
        defWatcher('counter');
      });

      expect(effectLog).toEqual(['counter:0']);

      triggerUpdate!();
      expect(effectLog).toEqual(['counter:0', 'counter:1']);
    });
  });
});
