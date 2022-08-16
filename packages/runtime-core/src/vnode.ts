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

  return createBaseVNode(type, props, children, shapeFlag, true)
}

function createBaseVNode(
  type: any,
  props: any = null,
  children: any = null,
  shapeFlag: number | ShapeFlags,
  needFullChildrenNormalization = false
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

  // children规范化
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  } else if (children) {
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
    // 如果是数组，将数组放到Fragment容器中铺平
    // slots就是数组
    return createVNode(Fragment, null, child.slice())
  } else if (isObject(child)) {
    // vnode
    // TODO 判断是否mount过
    return child
  } else {
    // 字符串
    return createVNode(Text, null, String(child))
  }
}

// 标准化children
// 更好的处理solts、非对象函数的 children
export function normalizeChildren(vnode, children) {
  let type = 0
  // 避免 children 是null时，走到下面的逻辑中
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    // 数组children
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') { // 不可以是null
    // slots
    type = ShapeFlags.SLOTS_CHILDREN
    // TODO 为children 设置 _ctx 上下文
  } else if (isFunction(children)) {
    // slots
    children = {default: children}
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    // number string等 都按照字符串处理
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }

  vnode.children = children
  vnode.shapeFlag |= type
}
