export const isObject = (value: unknown): value is Record<any, any> =>
  typeof value === "object" && value !== null;

export const isFunction = (value: unknown): value is Function =>
  typeof value === "function";

export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue);

export const NOOP = () => {};

export const extend = Object.assign
