// 异步组件 在注册的时候渲染一个空组件，等到组件加载完成之后再填充组件，重新渲染

import { ref } from '@vue/reactivity'
import { isFunction } from '@vue/shared'
import { defineComponent } from './apiDefineComponent'
import { currentInstance } from './component'
import { createVNode } from './vnode'

export function defineAsyncComponent(source) {
  if (isFunction(source)) {
    source = { loader: source }
  }

  const {
    loader,
    loadingComponent, // loading 组件
    delay = 200, // 延迟时间
    timeout, // 超时
    errorComponent, // 错误组件
    onError: userOnError // 失败处理，发起重试
  } = source

  // request pending的标识
  let pendingRequest = null
  // Comp
  let resolveComp

  // 重试次数
  let retries = 0
  const retry = () => {
    retries++
    // 清空
    pendingRequest = null
    // 重试
    return load()
  }

  const load = () => {
    let thisRequest
    return (
      pendingRequest ||
      (thisRequest = pendingRequest =
        loader()
          .then((comp) => {
            // 不是当前的request
            if (pendingRequest && pendingRequest !== thisRequest) {
              return pendingRequest
            }

            // 获取到异步组件
            resolveComp = comp
            return comp
          }))
          .catch(err => {
            // 如果传入错误处理函数
            if (userOnError) {
              err = err instanceof Error ? err : new Error(String(err))
              // 返回promise 调用错误处理函数，为其提供重试方法
              return new Promise((resolve, reject) => {
                const userRetry = () => resolve(retry())
                const userFail = () => reject(err)
                userOnError(err, userRetry, userFail, retries + 1)
              })
            }
          })
    )
  }

  return defineComponent({
    name: 'AsyncComponentWrapper',
    setup() {
      // 当前组件
      const instance = currentInstance

      // 已经加载过Comp
      if (resolveComp) {
        return () => createInnerComp(resolveComp, instance)
      }

      // 组件load标识
      const loaded = ref(false)
      // error 标识
      const error = ref()
      // 延迟标识
      const delayed = ref(!!delay)

      // 存在延迟
      if (delayed) {
        setTimeout(() => {
          // 延迟到了
          delayed.value = false
        }, delay)
      }

      // 存在timeout
      if (timeout != null) {
        setTimeout(() => {
          // 异步组件未加载到，并且已经超时了
          if (!loaded.value && !error.value) {
            pendingRequest = null
            // error
            error.value = new Error(
              `Async component timed out after ${timeout}ms.`
            )
          }
        }, timeout)
      }

      load()
        .then(() => {
          loaded.value = true
        })
        .catch(err => {
          error.value = err
        })

      return () => {
        if (loaded.value && resolveComp) { // 加载异步组件，展示异步组件
          return createInnerComp(resolveComp, instance)
        } else if (error.value && errorComponent) { // 超时，加载错误组件
          return createInnerComp(errorComponent, instance)
        } else if (!delayed.value && loadingComponent) { // 延迟到期，加载loading组件
          return createInnerComp(loadingComponent, instance)
        }
      }
    }
  })
}

// 创建异步组件获取到的真实组件
function createInnerComp(comp, { vnode: { props, children } }) {
  // 创建VNode
  const vnode = createVNode(comp, props, children)
  return vnode
}
