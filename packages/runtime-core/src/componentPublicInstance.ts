import { hasOwn } from '@vue/shared'

const enum AccessTypes {
  DATA,
  PROPS
}

/**
 * 组件的proxy拦截操作
 * 对于组件 渲染上下文的所有属性操作都会走这里
 * 这只是个分发器
 */
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { data, props, ctx, accessCache } = instance

    // 开头不是以$开始的
    if (key[0] !== '$') {
      // 从缓存中获取类型。缓存类型是为了减少 hasOwnProperty 的调用
      const n = accessCache![key]
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.DATA:
            return data[key]
        }
      } else if (hasOwn(data, key)) {
        accessCache[key] = AccessTypes.DATA
        // 数据已经是响应式了
        return data[key]
      }
    }
  },
  set({ _: instance }, key, value) {
    const { data } = instance
    // 数据已经被proxy代理，set操作会走proxy中的代理
    if (hasOwn(data, key)) {
      data[key] = value
      return true
    }
  }
}
