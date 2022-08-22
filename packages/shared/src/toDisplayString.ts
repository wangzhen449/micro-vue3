import { isArray, isObject, isString } from './index';

export function toDisplayString(val) {
  return isString(val) ? val
    : val === null ? ''
    : (isArray(val) || isObject(val)) ? JSON.stringify(val && val.__v_isRef ? val.value : val) // 处理ref
    : String(val)
}