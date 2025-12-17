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
});
