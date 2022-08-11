import { hasOwn } from '@vue/shared'

const enum AccessTypes {
  DATA,
  PROPS
}

export const publicPropertiesMap = {
  $attrs: i => i.attrs
}

/**
 * 组件的proxy拦截操作
 * 对于组件 渲染上下文的所有属性操作都会走这里
 * 这只是个分发器
 */
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { data, props, attrs, ctx, accessCache } = instance

    // 不是$开头的
    if (key[0] !== '$') {
      // 从缓存中获取类型。缓存类型是为了减少 hasOwnProperty 的调用
      const n = accessCache![key]
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.DATA:
            return data[key]
          case AccessTypes.PROPS:
            return props[key]
        }
      }
      // 这里的查找是有先后顺序的，也就是同时出现的情况，优先级从上到下
      else if (data && hasOwn(data, key)) { // 在data中找到
        accessCache[key] = AccessTypes.DATA
        // 数据已经是响应式了
        return data[key]
      } else if (props && hasOwn(props, key)) { // 在props中找到
        accessCache[key] = AccessTypes.PROPS
        return props[key]
      }
    }

    // $开头的属性获取
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
  set({ _: instance }, key, value) {
    const { data, props } = instance
    // 数据已经被proxy代理，set操作会走proxy中的代理
    if (data && hasOwn(data, key)) {
      data[key] = value
      return true
    } else if (props && hasOwn(props, key)) {
      // 不允许修改
      console.warn('props 不允许修改')
      return false
    }
  }
}
