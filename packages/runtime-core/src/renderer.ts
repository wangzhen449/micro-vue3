import { isString, ShapeFlags } from '@vue/shared'
import { isSameVNodeType, normalizeVNode, Text, VNode } from './vnode'

// TODO 插入及删除的anchor需要记住

// 参数 RendererOptions<HostNode, HostElement>
export const createRenderer = (options) => {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling
  } = options

  /**
   * diff算法的核心(创建需要新增的节点、移除已经废弃的节点、移动或者修改需要更新的节点)
   */
  const patch = (n1, n2, container) => {
    // 没有变化
    if (n1 === n2) {
      return
    }

    // type和key 不一致
    if (n1 && !isSameVNodeType(n1, n2)) {
      // TODO 卸载的位置是新元素插入位置，应该记在n2上
      // remove掉
      unmount(n1)
      n1 = null
    }

    const { type, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      default:
        // 元素类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container)
        }
    }
  }

  /**
   * 文本流程
   */
  const processText = (n1: VNode | null, n2: VNode, container) => {
    // 初始化过程
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    } else {
      // 更新过程 直接替换文本
      const el = (n2.el = n1.el)
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  /**
   * 元素流程
   */
  const processElement = (n1: VNode | null, n2: VNode, container) => {
    // 初始化过程
    if (n1 === null) {
      mountElement(n2, container)
    } else {
      // 修改的过程
      patchElement(n1, n2)
    }
  }

  /**
   * 元素的patch过程
   */
  const patchElement = (n1, n2) => {
    const el = n2.el = n1.el
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // patch children 这里的容器要传入el
    patchChildren(n1, n2, el)

    // patch props
    patchProps(el, n2, oldProps, newProps)
  }

  /**
   * 属性patch
   */
  const patchProps = (el, vnode, oldProps, newProps) => {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prev = oldProps[key]
        const next = newProps[key]

        if (next !== prev) {
          hostPatchProp(el, key, prev, next)
        }
      }

      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }

  /**
   * mount的过程 创建元素、处理子元素、处理props、插入元素。
   */
  const mountElement = (vnode: VNode, container) => {
    let el
    const { type, props, shapeFlag } = vnode

    // 创建element
    el = vnode.el = hostCreateElement(type)

    // 处理子元素
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果children 是 string
      hostSetElementText(el, vnode.children as string)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // children 是 数组
      mountChildren(vnode.children, el)
    }

    // 处理属性props，通过patchProp处理props
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 插入
    hostInsert(el, container)
  }

  /**
   * 挂载children
   */
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      // 规范化child
      let child = normalizeVNode(children[i])
      // 递归patch
      patch(null, child, container)
    }
  }

  /**
   * patch children
   */
  const patchChildren = (n1, n2, container) => {
    const c1 = n1 && n1.children
    const preShapeFlag = n1 ? n1.shapeFlag : 0

    const { shapeFlag, children: c2 } = n2

    // n2 string
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // n1 array
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1)
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2 as string)
      }
    } else {
      // n2 array | null
      // n1 array
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // n2 array  full diff
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, container)
        } else {
          // n2 null
          unmountChildren(c1)
        }
      } else {
        // n1 string | null
        // n1 string
        if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, container)
        }
      }
    }
  }

  const unmount = (vnode) => {
    remove(vnode)
  }

  const remove = (vnode) => {
    hostRemove(vnode.el)
  }

  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }

  // 数组 diff 核心算法
  const patchKeyedChildren = (n1, n2, container) => {}

  /**
   * render 渲染函数
   * 如果没有vnode就是卸载过程
   * 否则走patch
   */
  const render = (vnode: VNode, container) => {
    if (vnode == null) {
      // 卸载
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      // 初始化或者更新的过程
      patch(container._vnode || null, vnode, container)
    }
    // 为容器绑定vnode
    container._vnode = vnode
  }
  let createApp = () => {}
  return {
    render,
    createApp
  }
}

/**
 * 初始化渲染流程
 * 1. 执行h函数，h函数中调用createVNode，返回VNode
 * 2. VNode 和 container 作为参数执行render函数
 * 3. VNode为空走卸载流程，否则进入到diff算法的核心，patch过程
 * 4. 初始化过程，patch主要进行元素创建、处理props、处理children
 * 5. 在处理children过程中，循环、根据child类型处理VNode，递归调用patch
 *
 * 巧妙的地方是通过位运算的方式，处理VNode类型
 */

/**
 * diff流程
 * 1. container中保存之前的VNode和h函数返回的VNode作为参数，进行patch
 * 2. 流程分发
 * 2.1 无变化流程
 * 2.2 type改变的流程
 * 2.3 根据VNode或者type类型进行patch
 * 2.3.1 文本节点 共用el、替换文本
 * 2.3.2 元素节点 processElement -> patchElement
 * 2.3.2.1 公用el
 * 2.3.2.2 patchChildren children有三种情况 字符串、数组、null
 * 2.3.2.2.1 n2child是字符串
 * 2.3.2.2.1.1 n1child是数组 首先 unmountChildren 解绑
 * 2.3.2.2.1.2 n1child不等于n2child hostSetElementText 直接替换文本
 * 2.3.2.2.2 n2child不是字符串
 * 2.3.2.2.2.1 n1child是数组 n2child也是数组 patchKeyedChildren ****
 * 2.3.2.2.2.2 n1child是数组 n2child是null unmountChildren 解绑
 * 2.3.2.2.2.3 n1child是字符串 先hostSetElementText设置空；n2child是数组 mountChildren
 * 2.3.2.3 patchProps 遍历新的props 修改属性；遍历老的props 删除属性
 *
 */
