import { ShapeFlags } from '@vue/shared'
import { normalizeVNode } from './vnode'
/**
 * 将组件实例转化为vnode
 * 将组件实例的proxy 作为执行上下文，调用组件的render函数。这样就保证了在render中访问的this，会指向proxy
 */
export function renderComponentRoot(instance) {
  const {
    type: Component,
    vnode,
    proxy,
    render
  } = instance
  let result

  const proxyToUse = proxy

  // stateful 组件
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 使用proxy作为this调用render，返回vnode，并对vnode进行规范化。
    // 这里的proxy是 {_: instance}
    result = normalizeVNode(
      render!.call(proxyToUse, proxyToUse)
    )
  } else {}

  return result
}