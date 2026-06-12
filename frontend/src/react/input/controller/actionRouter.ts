import type { ControllerAction } from "../../../shared/types/controller";

export type ControllerActionHandler = () => boolean | void | Promise<boolean | void>;

export interface ControllerActionRouter {
  invoke(action: ControllerAction): Promise<boolean>;
  register(action: ControllerAction, handler: ControllerActionHandler): () => void;
}

export function createActionRouter(): ControllerActionRouter {
  const handlers = new Map<ControllerAction, ControllerActionHandler[]>();

  return {
    async invoke(action) {
      const stack = handlers.get(action);
      if (!stack || stack.length === 0) return false;

      for (const handler of [...stack].reverse()) {
        const handled = await handler();
        if (handled !== false) {
          return true;
        }
      }

      return false;
    },
    register(action, handler) {
      const list = handlers.get(action) ?? [];
      list.push(handler);
      handlers.set(action, list);
      return () => {
        const current = handlers.get(action) ?? [];
        handlers.set(
          action,
          current.filter((item) => item !== handler),
        );
      };
    },
  };
}
