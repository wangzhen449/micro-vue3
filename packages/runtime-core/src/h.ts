/**
 * h函数就是vue的createElement，创建虚拟dom，返回Vnode，实际就是调用createVNode
 * 参数类型很多
 * v 一个参数，直接按照type创建
 * v 两个参数，第二个是对象（非数组）并且不是vnode就当做props，否则当做children
 * v 三个或以上参数，第二个为props，后面皆为children
 * v children 类型可以是 string、string[]、vnode、vnode[]; vnode 统一处理为 vnode[]
 *
 */
import { isArray, isObject } from '@vue/shared'
import { createVNode, isVNode } from './vnode'

export function h(type, propsOrChildren?, children?) {
  // 参数长度
  const l = arguments.length
  // 两个参数
  if (l === 2) {
    // 是对象但不是数组
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // children vnode
        return createVNode(type, null, [propsOrChildren])
      }
      // props
      return createVNode(type, propsOrChildren)
    } else {
      // 不是对象、或者是数组
      // children (string、string[]、vnode[] )
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    // 一个参数或者3及以上个参数，重新组装children就好。
    if (l > 3) {
      children = Array.from(arguments).slice(2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }

    return createVNode(type, propsOrChildren, children)
  }
}
