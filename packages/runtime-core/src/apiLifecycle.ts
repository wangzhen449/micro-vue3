import { currentInstance, LifecycleHooks, setCurrentInstance, unsetCurrentInstance } from "./component"

/**
 * 生命周期函数必须与组件绑定在一起，所以需要当前正激活的组件实例
 * @param type 事件类型
 * @param hook 传入的处理函数
 * @param target 默认为当前组件实例，用户一般不会传入
 */
export function injectHook (type, hook, target = currentInstance) {
  // 必须有组件实例
  if (target) {
    const hooks = target[type] || (target[type] = [])
    const wrappeHook = (...args) => {
      // 卸载就不再执行
      if (target.isUnmounted) return

      // 利用闭包的原理，缓存组件实例，并且在调用之后清空掉
      setCurrentInstance(target)

      // 调用传入的处理函数
      const res = hook(...args)

      unsetCurrentInstance()
      return res
    }

    hooks.push(wrappeHook)

    return wrappeHook
  }
}

export const createHooks = (lifecycle) => (hook, target = currentInstance) => injectHook(lifecycle, hook, target)

export const onBeforeMount = createHooks(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHooks(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHooks(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHooks(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHooks(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHooks(LifecycleHooks.UNMOUNTED)