import { isObject, isArray, isString, ShapeFlags } from '@vue/shared'
import { isFunction } from '../../shared/src/index';

export type Component = {
  props: any,
  vnode: VNode,
  update: any,
  next: VNode
}

export type VNodeTypes = string | VNode | Component | Text | typeof Fragment

export const Text = Symbol(undefined)

export const Fragment = Symbol()

type VNodeChildAtom = VNode | string | number | boolean | null | undefined

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren

export type VNodeNormalizedChildren = string | VNodeArrayChildren | null

export interface VNode {
  __v_isVNode: true
  el: Element | null
  type: VNodeTypes
  props: any
  key: number | string | null
  anchor: Element | null
  children: VNodeNormalizedChildren
  component: Component
  shapeFlag: number
  patchFlag: number
}

export function isVNode(vnode: any): boolean {
  return !!(vnode && vnode.__v_isVNode)
}

export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * v 定义VNode数据结构
 * v 根据参数处理VNode的shapeFlag类型
 * v type 有可能是 组件类型、元素类型、文本类型
 * x 规范化
 */
export function createVNode(type, props = null, children = null) {

  const shapeFlag =
    isString(type) ? ShapeFlags.ELEMENT :
    isObject(type) ? ShapeFlags.STATEFUL_COMPONENT :
    isFunction(type) ? ShapeFlags.FUNCTIONAL_COMPONENT :
    0

  // TODO class 和 style 规范化

  return createBaseVNode(type, props, children, shapeFlag)
}

function createBaseVNode(
  type: any,
  props: any = null,
  children: any = null,
  shapeFlag: number | ShapeFlags
) {
  const vnode = {
    __v_isVNode: true, // 是否是vnode的标识
    el: null, // 虚拟dom绑定的真实dom
    type,
    props,
    key: props?.key,
    anchor: null,
    children,
    component: null,
    shapeFlag,
    patchFlag: 0
  }

  // TODO children需要规范化

  if (children) {
    // 如果传了子元素，只能是字符串或者数组
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }

  return vnode
}

/**
 * 规范化child
 */
export function normalizeVNode(child: VNodeChild) {
  if (child === null || typeof child === 'boolean') {
    // 这是注释
  } else if (isArray(child)) {
  } else if (isObject(child)) {
    // vnode
    // TODO 判断是否mount过
    return child
  } else {
    // 字符串
    return createVNode(Text, null, String(child))
  }
}
