import { isString, ShapeFlags } from '@vue/shared'
import { normalizeVNode, Text, VNode } from './vnode'

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
   * 文本的diff过程
   */
  const processText = (n1: VNode | null, n2: VNode, container) => {
    // 初始化过程
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
  }

  /**
   * 元素的diff过程
   */
  const processElement = (n1: VNode | null, n2: VNode, container) => {
    // 初始化过程
    if (n1 === null) {
      mountElement(n2, container)
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

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      // 规范化child
      let child = normalizeVNode(children[i])
      // 递归patch
      patch(null, child, container)
    }
  }

  /**
   * render 渲染函数
   * 如果没有vnode就是卸载过程
   * 否则走patch
   */
  const render = (vnode: VNode, container) => {
    if (vnode == null) {
      // 卸载
      if (container._vnode) {
        hostRemove(container)
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
