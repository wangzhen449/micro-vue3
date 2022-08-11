import { extend, hasChanged, isObject } from '@vue/shared'
import { track, trigger } from './effect'
import {
  reactive,
  ReactiveFlags,
  reactiveMap,
  shallowReactiveMap,
  Target
} from './reactive'

const get = createGetter()
const shallowGet = createGetter(true)

function createGetter(shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 是否被代理的标识。
      return true
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow
    } else if (
      key === ReactiveFlags.RAW &&
      receiver === (shallow ? shallowReactiveMap : reactiveMap).get(target)
    ) {
      // 如果获取原始对象，并且代理对象是以原始对象收集的，直接返回原始对象
      return target
    }
    const res = Reflect.get(target, key)
    // 收集依赖 创建dep -> effects中插入 -> effect
    track(target, key)

    // 只代理第一层
    if (shallow) {
      return res
    }

    // 如果是对象，也转为代理
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}

const set = createSetter()
const shallowSet = createSetter(true)

function createSetter(shallow = false) {
  return function set(target, key, value) {
    const oldValue = (target as any)[key]
    const result = Reflect.set(target, key, value)
    if (hasChanged(value, oldValue)) {
      // 触发依赖 找到dep -> 遍历effects -> 执行每一个effect
      trigger(target, key, value)
    }
    return result
  }
}

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set
  // deleteProperty,
  // has,
  // ownKeys
}

export const shallowReactiveHandlers = extend({}, mutableHandlers, {
  get: shallowGet,
  set: shallowSet
})
