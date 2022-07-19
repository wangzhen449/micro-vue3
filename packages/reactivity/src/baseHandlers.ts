import { isObject } from '../../shared/src/index';
import { track, trigger } from './effect';
import { reactive, ReactiveFlags } from './reactive';
const get = createGetter();
const set = createSetter();

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  // deleteProperty,
  // has,
  // ownKeys
};

function createGetter() {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) { // 是否被代理的标识。
      return true;
    }
    const res = Reflect.get(target, key)
    // 收集依赖 创建dep -> effects中插入 -> effect
    track(target, key)

    // 如果是对象，也转为代理
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}
function createSetter() {
  return function set(target, key, value) {
    const result = Reflect.set(target, key, value)
    // 触发依赖 找到dep -> 遍历effects -> 执行每一个effect
    trigger(target, key, value)
    return result
  }
}
