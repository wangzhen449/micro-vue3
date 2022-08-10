export * from './shapeFlags'

const onRE = /^on[^a-z]/
export const isOn = (key) => onRE.test(key)

export const isArray = Array.isArray

export const isString = (val: unknown): val is string => typeof val === 'string'

export const isObject = (value: unknown): value is Record<any, any> =>
  typeof value === 'object' && value !== null

export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function'

export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

export const NOOP = () => {}

export const extend = Object.assign

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (obj, key) => hasOwnProperty.call(obj, key)
