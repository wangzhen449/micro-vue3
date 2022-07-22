import { ReactiveEffect } from './effect'
import { isFunction, NOOP } from '@vue/shared'
import { Dep } from './dep'
import { trackRefValue, triggerRefValue } from './ref';

type ComputedGetter<T> = () => T
type ComputedSetter<T> = (v: T) => void
type WritableComputedOptions<T> = {
  get: ComputedGetter<T>
  set?: ComputedSetter<T>
}
/**
 * v 支持get函数，或者对象get、set的参数
 * v 计算属性是 effect 套 effect
 * v 计算属性是类ref
 * v scheduler 每次值变化都会执行。但何时取值，取决于何时读取computed的value值，读取value值有两种方式：
 *    一种是，直接获取computed的value值（这就是缓存的原因）；另一种通过触发computed包裹的effect，读取computed的value。
 *
 */
class ComputedImpl<T> {
  public dep: Dep = undefined
  private _value: T
  private readonly effect: ReactiveEffect

  public readonly __v_isRef = true
  public _dirty: boolean = true // 默认取值的时候进行计算
  constructor(
    getters: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>
  ) {
    this.effect = new ReactiveEffect(getters, () => {
      // 每次getter中的响应式属性修改都会进入，通过_dirty来控制是否触发依赖
      if (!this._dirty) {
        this._dirty = true
        // 触发computed的effect依赖，由于触发依赖会再次执行computed的get函数，值会再次更新。
        triggerRefValue(this)
      }
    })
  }
  get value() {
    // 收集依赖
    trackRefValue(this)
    if (this._dirty) {
      this._dirty = false
      // 计算属性的返回值
      this._value = this.effect.run()
    }
    return this._value
  }
  set value(newValue: T) {
    this._setter(newValue)
  }
}

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  // 只传入函数当getter处理。
  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    // 补充setter为空函数
    setter = NOOP
  } else {
    // 对象形式
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedImpl(getter, setter)
  return cRef
}
