import { reactive } from '@vue/reactivity'
import { isObject } from '@vue/shared'

export function applyOptions(instance) {
  const options = instance.type
  const publicThis = instance.proxy

  const { data: dataOptions } = options

  // 如果有data属性
  if (dataOptions) {
    // 将data中的this指向组件实例的proxy
    const data = dataOptions.call(publicThis, publicThis)

    if (isObject(data)) {
      // 给data添加响应式
      instance.data = reactive(data)
    }
  }
}
