import { currentInstance } from './component'

/**
 * inject prodive 解决跨层级传递
 * 通过建立parent链的方式，使子组件可以获取到上级组件注册的跨层级属性
 */

export function provide(key, value) {
  // 必须在setup中
  if (currentInstance) {
    let provides = currentInstance.provides
    // 父组件的provides
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides

    // provide 第一次调用 与父provides简历链接
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    // 保存属性和属性值
    provides[key] = value
  }
}

export function inject(key) {
  // 使用父级的provides是因为，自身的provides有可能已经更改了。
  const provides = currentInstance.parent && currentInstance.parent.provides
  if (provides && (key in provides)) {
    return provides[key]
  }
}
