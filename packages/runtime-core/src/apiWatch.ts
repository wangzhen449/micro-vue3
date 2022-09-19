import { isReactive, isRef, isShallow, ReactiveEffect } from '@vue/reactivity'
import { hasChanged, isArray, isFunction, isObject } from '@vue/shared'
import { currentInstance } from './component'
import { queueJob } from './scheduler'
export function watchEffect(effect, options?) {
  return doWatch(effect, null, options)
}

export function watch(source, cb, options?) {
  return doWatch(source, cb, options)
}

const EMPTY_OBJ: { readonly [key: string]: any } = {}
/**
 * watch 和 watchEffect 都走了doWatch，只是一个有回调一个没有
 * 1. 处理source，形成getter，返回的是数据的值。getter作为effect的第一个参数
 * 2. scheduler逻辑，有回调如果值变化触发回调，没有回调直接触发effect.run
 * 3. 返回effect.stop，使用户可以自行停止。
 */
function doWatch(
  source,
  cb,
  { immediate, deep } = EMPTY_OBJ
) {

  const instance = currentInstance
  // 获取到监听的数据
  let getter
  // 强制触发监听
  let forceTrigger = false
  // 是否为多数据源
  let isMultiSource = false

  // 处理source类型，支持ref、reactive、array<ref | reactive | function>、function
  if (isRef(source)) {
    getter = () => source.value
    // 是否为浅响应式
    forceTrigger = isShallow(source)
  } else if (isReactive(source)) {
    getter = () => source
    deep = true
  } else if (isArray(source)) {
    isMultiSource = true
    // 只要有reacitve或者潜响应式就标记强制更新
    forceTrigger = source.some(s => isReactive(s) || isShallow(s))
    getter = () => {
      source.map(s => {
        if (isRef(s)) {
          return s.value
        } else if (isReactive(s)) {
          // 需要递归，deep
          return traverse(s)
        } else if (isFunction(s)) {
          return s(instance)
        }
      })
    }
  } else if (isFunction(source)) {
    // 有 cb, watch
    if (cb) {
      getter = () => source()
    } else {
      // watchEffect，source是effect
      getter = () => {
        // 卸载不再收集
        if (instance && instance.isUnmounted) {
          return
        }

        if (cleanup) {
          cleanup()
        }

        // 获取值 为watchEffect 的参数中提供 onCleanup方法
        return source(onCleanup)
      }
    }
  } else {
    getter = () => {}
  }

  // 处理deep (watch，并且是deep)
  if (cb && deep) {
    const baseGetter = getter
    // getter重新赋值，递归调用，监听所有属性
    getter = () => traverse(baseGetter())
  }

  let cleanup
  let onCleanup = (fn) => {
    // 在effect stop的时候执行
    cleanup = effect.onStop = () => {
      fn()
    }
  }

  let oldValue = isMultiSource ? [] : {}
  const job = () => {
    // effect 未激活状态
    if (!effect.active) {
      return
    }

    // watch
    if (cb) {
      // 获取新值
      const newValue = effect.run()

      // 新值和老值对比
      if (deep || forceTrigger ||
        (isMultiSource
          ? newValue.some((v, i) =>
            hasChanged(v, oldValue[i])
          )
          : hasChanged(newValue, oldValue))
      ) {
        // cb再次执行之前，清理
        if (cleanup) {
          cleanup()
        }

        // 值发生变化，执行回调
        cb(newValue, oldValue, onCleanup)

        // 变更为老值
        oldValue = newValue
      }
    } else {
      // watchEffect 直接执行副作用函数
      effect.run()
    }
  }

  // 放入队列
  let scheduler = () => queueJob(job)

  // 创建 ReactiveEffect
  const effect = new ReactiveEffect(getter, scheduler)

  // 有回调 watch
  if (cb) {
    // 立即执行
    if (immediate) {
      job()
    } else {
      // 收集依赖，并且取回值，此时不执行回调，下次更新时才会执行回调
      oldValue = effect.run()
    }
  } else {
    // watchEffect 先执行一次
    effect.run()
  }

  // 需要返回 停止effect的方法
  return () => {
    effect.stop()
  }
}

// 递归取值 seen防止循环引用
export function traverse(value, seen?) {
  if (!isObject(value)) {
    return value
  }
  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  if (isRef(value)) {
    traverse(value.value, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else if (isObject(value)) {
    for (const key in value) {
      traverse(value[key], seen)
    }
  }
  return value
}
