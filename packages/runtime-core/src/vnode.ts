import { isObject, isArray, isString, ShapeFlags } from '@vue/shared'
import { isFunction } from '../../shared/src/index'
import { isTeleport } from './components/Teleport'

export type Component = {
  props: any
  vnode: VNode
  update: any
  next: VNode
}

export type VNodeTypes = string | VNode | Component | Text | typeof Fragment | typeof Comment

export const Text = Symbol('Text')

export const Fragment = Symbol('Fragment')

export const Comment = Symbol('Comment')

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
  dynamicProps: string[] | null
  dynamicChildren: VNode[] | null
}

export function isVNode(vnode: any): boolean {
  return !!(vnode && vnode.__v_isVNode)
}

export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * block 栈。
 * 栈结构是由于会存在block嵌套block的情况。遇见block入栈，节点处理完毕出栈
 * dynamicChildren会先存储在栈中，当block最终创建的时候，做赋值，出栈
 */
export const blockStack = []
// 当前block
export let currentBlock = null

// 打开block 向栈中压入。block的第一步操作
export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}

// 关闭block，block从栈中弹出，当前block前移。block执行结束，把环境还给上一层
export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}

// 给 dynamicChildren 赋值，出栈
function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock || []

  // 弹出
  closeBlock()

  return vnode
}

/**
 * 代替h函数，创建vnode。(h函数是通用方案，因此需要对参数进行判断)
 * block作用就是收集动态节点
 */
export function createElementBlock(
  type,
  props?,
  children?,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number
) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true,
    )
  )
}

// createElementVNode 等价于 createBaseVNode
export { createBaseVNode as createElementVNode }

/**
 * v 定义VNode数据结构
 * v 根据参数处理VNode的shapeFlag类型
 * v type 有可能是 组件类型、元素类型、文本类型
 * x 规范化
 */
export function createVNode(
  type,
  props = null,
  children = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
) {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0

  // TODO class 和 style 规范化

  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  )
}

function createBaseVNode(
  type: any,
  props: any = null,
  children: any = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true, // 是否是vnode的标识
    appContext: null, // app实例
    el: null, // 虚拟dom绑定的真实dom
    type,
    props,
    key: props?.key,
    anchor: null,
    children,
    component: null,
    shapeFlag, // 类型标识
    patchFlag, // 优化标识
    dynamicProps, // 动态属性
    dynamicChildren: null // 动态子节点
  }

  // children规范化
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  } else if (children) {
    // complier编译后的会走这里
    // 如果传了子元素，只能是字符串或者数组
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }

  // 有currentBlock，并且当前有动态标记，向栈中插入当前vnode
  if (
    // 避免block收集自身
    !isBlockNode &&
    currentBlock && vnode.patchFlag > 0
  ) {
    currentBlock.push(vnode)
  }

  return vnode
}

/**
 * 规范化child
 */
export function normalizeVNode(child: VNodeChild) {
  // 使用 ==, 是因为异步组件的第一次渲染这里返回的是undefined，为了兼容undefined
  if (child == null || typeof child === 'boolean') {
    // 这是注释
    return createVNode(Comment)
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

export function createTextVNode(text: string = '', patchFlag: number = 0) {
  return createVNode(Text, null, text, patchFlag)
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
  } else if (typeof children === 'object') {
    // 不可以是null
    // slots
    type = ShapeFlags.SLOTS_CHILDREN
    // TODO 为children 设置 _ctx 上下文
  } else if (isFunction(children)) {
    // slots
    children = { default: children }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    // number string等 都按照字符串处理
    children = String(children)

    // teleport 需要将children 强制转换为 数组，方便移动
    if(vnode.shapeFlag & ShapeFlags.TELEPORT) {
      type = ShapeFlags.ARRAY_CHILDREN
      children = [createTextVNode(children)]
    } else {
      type = ShapeFlags.TEXT_CHILDREN
    }
  }

  vnode.children = children
  vnode.shapeFlag |= type
}
