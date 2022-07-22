import { hasChanged } from "@vue/shared";
import { createDep, Dep } from "./dep";
import { trackEffects, activeEffect, triggerEffects } from "./effect";
import { toReactive, toRaw } from "./reactive";

export interface Ref<T = any> {
  value: T;
}

type RefBase<T> = {
  dep?: Dep;
  value: T;
};

export function trackRefValue(ref: RefBase<any>) {
  // 如果当前有激活的effect
  if (activeEffect) {
    // 处理reactive包裹ref的情况
    ref = toRaw(ref);
    // 调用收集effect
    trackEffects(ref.dep || (ref.dep = createDep()));
  }
}
export function triggerRefValue(ref: RefBase<any>) {
  // 处理reactive包裹ref的情况
  ref = toRaw(ref);
  if (ref.dep) {
    // 调用触发effect
    triggerEffects(ref.dep);
  }
}

export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true);
}

export function ref(value?: unknown) {
  return createRef(value);
}

function createRef(rawValue: unknown) {
  // 如果已经是ref 返回自身
  if (isRef(rawValue)) {
    return rawValue;
  } else {
    // 创建ref
    return new RefImpl(rawValue);
  }
}

class RefImpl<T> {
  private _value: T;
  private _rawValue: T;

  public dep: Dep = undefined;
  public readonly __v_isRef = true;
  constructor(value: T) {
    // 如果value是proxy，使用原始值保存
    this._rawValue = toRaw(value);
    // 如果是对象，变为proxy
    this._value = toReactive(value);
  }
  get value() {
    // 收集依赖
    trackRefValue(this);
    return this._value;
  }
  set value(newVal) {
    newVal = toRaw(newVal);
    // 使用原始对象比较
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = toReactive(newVal);
      // 触发依赖
      triggerRefValue(this);
    }
  }
}

// 触发ref的effect
export function triggerRef(ref: Ref) {
  triggerRefValue(ref);
}

// 返回ref的value属性
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}
