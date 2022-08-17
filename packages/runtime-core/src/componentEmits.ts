import { toHandlerKey } from '@vue/shared'

// 柯理化的方式，默认传入了instance。event为时间名，rawArgs为后面的参数
export function emit(instance, event, ...rawArgs) {
  if (instance.isUnmounted) return
  // 事件存储在了props中
  const props = instance.vnode.props

  // 在props中查找事件处理函数  on+首字母大写
  // 问题？？? 在props中传入的事件处理函数，如何获取到组件实例，或者this
  let handler = props[toHandlerKey(event)]
  if (handler) {
    handler(...rawArgs)
  }
}
