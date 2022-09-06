import { ShapeFlags } from '@vue/shared'
import { normalizeVNode, VNode } from './vnode'
/**
 * 将组件实例转化为vnode
 * 将组件实例的proxy 作为执行上下文，调用组件的render函数。这样就保证了在render中访问的this，会指向proxy
 */
export function renderComponentRoot(instance) {
  const { type: Component, vnode, props, proxy, render } = instance
  let result

  const proxyToUse = proxy

  // stateful 组件
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 使用proxy作为this调用render，返回vnode，并对vnode进行规范化。
    // 这里的proxy是 {_: instance}
    result = normalizeVNode(render!.call(proxyToUse, proxyToUse))
  } else {
    // 函数式组件
    // 函数式组件没有render 直接执行vnode.type
    const render = Component
    // 传入props
    result = normalizeVNode(render(props))
  }

  return result
}

// 是否需要更新组件
export function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode
): boolean {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode

  // 组件的children就是slots。这部分是针对手动渲染做处理的
  // next slots没传 或者 后传入的slots没有 $stable hint 就进行更新
  // $stable hint 是专门为了标识 slots 不更新的
  if (prevChildren || nextChildren) {
    if (!nextChildren || !(nextChildren as any).$stable) {
      return true
    }
  }

  // n1 n2 的 props 一致不更新
  if (prevProps === nextProps) {
    return false
  }
  // n1 没有props，就看n2有没有props
  if (!prevProps) {
    return !!nextProps
  }
  // n1 有props，n2没有，一定更新
  if (!nextProps) {
    return true
  }

  // full diff
  return hasPropsChanged(prevProps, nextProps)
}

// 对比两个对象的所有值，必须完全相等
function hasPropsChanged(prevProps, nextProps): boolean {
  const nextKeys = Object.keys(nextProps)
  const prevKeys = Object.keys(prevProps)

  // 属性个数不同，直接返回true
  if (nextKeys.length !== prevKeys.length) {
    return true
  }

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  return false
}
