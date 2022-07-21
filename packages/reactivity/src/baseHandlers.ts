import { hasChanged, isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, reactiveMap, Target } from "./reactive";
hasChanged;
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
  return function get(target: Target, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 是否被代理的标识。
      return true;
    } else if (
      key === ReactiveFlags.RAW &&
      receiver === reactiveMap.get(target)
    ) {
      // 如果获取原始对象，并且代理对象是以原始对象收集的，直接返回原始对象
      return target;
    }
    const res = Reflect.get(target, key);
    // 收集依赖 创建dep -> effects中插入 -> effect
    track(target, key);

    // 如果是对象，也转为代理
    if (isObject(res)) {
      return reactive(res);
    }
    return res;
  };
}
function createSetter() {
  return function set(target, key, value) {
    const oldValue = (target as any)[key];
    const result = Reflect.set(target, key, value);
    if (hasChanged(value, oldValue)) {
      // 触发依赖 找到dep -> 遍历effects -> 执行每一个effect
      trigger(target, key, value);
    }
    return result;
  };
}
