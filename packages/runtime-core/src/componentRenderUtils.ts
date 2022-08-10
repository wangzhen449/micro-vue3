import { ShapeFlags } from '@vue/shared'
import { normalizeVNode } from './vnode'
/**
 * 将组件实例转化为vnode
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