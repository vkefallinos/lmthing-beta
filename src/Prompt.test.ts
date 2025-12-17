import { Prompt } from './Prompt';

describe('Prompt class', () => {
  describe('defVariable', () => {
    it('should output variables to the variables namespace', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defVariable }) => {
        defVariable('x', 10);
        defVariable('y', 20);
        defVariable('name', 'test');
      });

      expect(output.variables).toEqual({
        x: 10,
        y: 20,
        name: 'test',
      });
    });

    it('should allow variables to use state hooks', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defState, defVariable }) => {
        const [count, setCount] = defState(0);

        if (count === 0) {
          setCount(5);
        }

        defVariable('count', count);
      });

      expect(output.variables.count).toBe(5);
    });
  });

  describe('defMessage', () => {
    it('should output messages to the prependedMessages namespace as array', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defMessage }) => {
        defMessage('user', 'Hello');
        defMessage('assistant', 'Hi there!');
        defMessage('user', 'How are you?');
      });

      expect(output.prependedMessages.message).toEqual([
        { role: 'user', message: 'Hello' },
        { role: 'assistant', message: 'Hi there!' },
        { role: 'user', message: 'How are you?' },
      ]);
    });

    it('should support conditional messages with state', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defState, defMessage }) => {
        const [includeGreeting, setIncludeGreeting] = defState(true);

        if (includeGreeting) {
          defMessage('user', 'Hello');
        }
        defMessage('assistant', 'Response');
      });

      expect(output.prependedMessages.message).toHaveLength(2);
      expect(output.prependedMessages.message[0].message).toBe('Hello');
    });
  });

  describe('defSystem', () => {
    it('should output systems to the systems namespace', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defSystem }) => {
        defSystem('temperature', 0.7);
        defSystem('maxTokens', 1000);
        defSystem('model', 'gpt-4');
      });

      expect(output.systems).toEqual({
        temperature: 0.7,
        maxTokens: 1000,
        model: 'gpt-4',
      });
    });
  });

  describe('combined usage', () => {
    it('should support all three methods together', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defVariable, defMessage, defSystem }) => {
        defVariable('context', 'conversation');
        defSystem('temperature', 0.8);
        defMessage('user', 'Hello');
        defMessage('assistant', 'Hi!');
      });

      expect(output.variables.context).toBe('conversation');
      expect(output.systems.temperature).toBe(0.8);
      expect(output.prependedMessages.message).toHaveLength(2);
    });

    it('should work with complex state interactions', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defState, defVariable, defMessage, defSystem }) => {
        const [messageCount, setMessageCount] = defState(0);
        const [initialized, setInitialized] = defState(false);

        // Always call hooks in the same order
        defSystem('model', 'gpt-4');
        defVariable('sessionId', '12345');

        if (!initialized) {
          setInitialized(true);
        }

        // Use refs to track which messages have been added
        const msg1 = defMessage('user', 'First message');
        const msg2 = defMessage('assistant', 'Response');

        // Conditionally enable messages based on state
        if (messageCount >= 0) {
          msg1.enable();
        }
        if (messageCount >= 1) {
          msg2.enable();
        } else {
          msg2.disable();
        }

        // Update message count
        if (messageCount === 0) {
          setMessageCount(1);
        } else if (messageCount === 1) {
          setMessageCount(2);
        }

        defVariable('messageCount', messageCount);
      });

      expect(output.systems.model).toBe('gpt-4');
      expect(output.variables.sessionId).toBe('12345');
      expect(output.variables.messageCount).toBe(2);
      expect(output.prependedMessages.message).toHaveLength(2);
    });
  });

  describe('API restrictions', () => {
    it('should only expose specified methods in setFn', () => {
      const prompt = new Prompt();

      prompt.setFn((api) => {
        // TypeScript should ensure these are the only available methods
        expect(typeof api.defState).toBe('function');
        expect(typeof api.defEffect).toBe('function');
        expect(typeof api.defReducer).toBe('function');
        expect(typeof api.defRef).toBe('function');
        expect(typeof api.defVariable).toBe('function');
        expect(typeof api.defMessage).toBe('function');
        expect(typeof api.defSystem).toBe('function');

        // These should NOT be available
        expect((api as any).defInput).toBeUndefined();
        expect((api as any).defOutputObject).toBeUndefined();
        expect((api as any).defOutputArray).toBeUndefined();
      });
    });
  });

  describe('enable/disable functionality', () => {
    it('should support disabling variables', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defVariable }) => {
        const var1 = defVariable('x', 10);
        const var2 = defVariable('y', 20);
        var2.disable();
      });

      expect(output.variables.x).toBe(10);
      expect(output.variables.y).toBeUndefined();
    });

    it('should support disabling messages', () => {
      const prompt = new Prompt();
      let output: any = {};

      prompt.onOutput((result) => {
        output = result;
      });

      prompt.setFn(({ defMessage }) => {
        defMessage('user', 'Message 1');
        const msg2 = defMessage('user', 'Message 2');
        defMessage('user', 'Message 3');
        msg2.disable();
      });

      expect(output.prependedMessages.message).toHaveLength(2);
      expect(output.prependedMessages.message[0].message).toBe('Message 1');
      expect(output.prependedMessages.message[1].message).toBe('Message 3');
    });
  });
});
