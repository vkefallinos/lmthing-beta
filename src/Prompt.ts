import { Base, BaseAPI } from './Base';

export type PromptAPI = {
  defState: BaseAPI['defState'];
  defEffect: BaseAPI['defEffect'];
  defReducer: BaseAPI['defReducer'];
  defRef: BaseAPI['defRef'];
  defVariable: (name: string, value: any) => ReturnType<BaseAPI['defOutputObject']>;
  defMessage: (role: 'user' | 'assistant', message: string) => ReturnType<BaseAPI['defOutputArray']>;
  defSystem: (name: string, value: any) => ReturnType<BaseAPI['defOutputObject']>;
};

export class Prompt extends Base {
  constructor() {
    super();

    // Extend Base with custom methods
    this.extend({
      defVariable: {
        execute: ({ defOutputObject }, name: string, value: any) => {
          return defOutputObject('variables', name, value);
        },
      },
      defMessage: {
        execute: ({ defOutputArray }, role: 'user' | 'assistant', message: string) => {
          return defOutputArray('prependedMessages', 'message', { role, message });
        },
      },
      defSystem: {
        execute: ({ defOutputObject }, name: string, value: any) => {
          return defOutputObject('systems', name, value);
        },
      },
    });
  }

  // Override setFn to provide only the specified API
  public setFn(renderFn: (api: BaseAPI & Record<string, any>) => void): void {
    super.setFn((fullApi: any) => {
      const filteredApi: PromptAPI = {
        defState: fullApi.defState,
        defEffect: fullApi.defEffect,
        defReducer: fullApi.defReducer,
        defRef: fullApi.defRef,
        defVariable: fullApi.defVariable,
        defMessage: fullApi.defMessage,
        defSystem: fullApi.defSystem,
      };
      renderFn(filteredApi as any);
    });
  }
}
