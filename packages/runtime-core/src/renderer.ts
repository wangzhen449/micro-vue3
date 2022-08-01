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
  const patch = (n1, n2, container, anchor = null) => {
    // 没有变化
    if (n1 === n2) {
      return
    }

    // type和key 不一致
    if (n1 && !isSameVNodeType(n1, n2)) {
      // 记录卸载元素的位置，后面的就从这个位置插入
      anchor = getNextHostNode(n1)
      // remove掉
      unmount(n1)
      n1 = null
    }

    const { type, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor)
        break
      default:
        // 元素类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor)
        }
    }
  }

  /**
   * 文本流程
   */
  const processText = (n1: VNode | null, n2: VNode, container, anchor) => {
    // 初始化过程
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container, anchor)
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
  const processElement = (n1: VNode | null, n2: VNode, container, anchor) => {
    // 初始化过程
    if (n1 === null) {
      mountElement(n2, container, anchor)
    } else {
      // 修改的过程
      patchElement(n1, n2)
    }
  }

  /**
   * 元素的patch过程
   */
  const patchElement = (n1, n2) => {
    const el = (n2.el = n1.el)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // patch children 这里的容器要传入el
    patchChildren(n1, n2, el, null)

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
  const mountElement = (vnode: VNode, container, anchor) => {
    let el
    const { type, props, shapeFlag } = vnode

    // TODO vnode.el 已有

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
    hostInsert(el, container, anchor)
  }

  /**
   * 挂载children
   */
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      // 规范化child
      let child = (children[i] = normalizeVNode(children[i]))

      // 递归patch
      patch(null, child, container)
    }
  }

  /**
   * patch children
   */
  const patchChildren = (n1, n2, container, anchor) => {
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
          patchKeyedChildren(c1, c2, container, anchor)
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
  const patchKeyedChildren = (c1, c2, container, parentAnchor) => {
    let i = 0
    let l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1

    // 1. 起始位置类型相同
    // (a b) c
    // (a b) d e
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      // c2节点未被处理过
      const n2 = (c2[i] = normalizeVNode(c2[i]))
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container)
      } else {
        break
      }
      i++
    }

    // 2. 结束位置类型相同
    // a (b c)
    // d e (b c)
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      // c2节点未被处理过
      const n2 = (c2[e2] = normalizeVNode(c2[e2]))
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. 旧序列已patch完，新序列中仍有新增节点 mount
    // (a b)
    // (a b) c d
    // i = 2, e1 = 1, e2 = 3
    // (a b)
    // c d (a b)
    // i = 0, e1 = -1, e2 = 1
    // 插入节点必须依赖anchor
    if (i > e1) {
      if (i <= e2) {
        // 第一种情况 i 右移
        // 第二种情况 e2 左移
        // while (i <= e2) {
        //   if (i > 0) {
        //     patch(null, (c2[i] = normalizeVNode(c2[i])), container)
        //     i++
        //   } else { // i = 0
        //     const nextEl = c2[e2 + 1].el
        //     patch(null, (c2[e2] = normalizeVNode(c2[e2])), container, nextEl)
        //     e2--
        //   }
        // }

        // 这种方式更好
        const nextPos = e2 + 1
        const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor
        while (i <= e2) {
          patch(null, (c2[i] = normalizeVNode(c2[i])), container, anchor)
          i++
        }
      }
    }

    // 4. 新序列已patch完，旧序列中有多余节点 unmount
    // (a b) c d
    // (a b)
    // i = 2, e1 = 3, e2 = 1
    // c d (a b)
    // (a b)
    // i = 0, e1 = 1, e2 = -1
    else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    }

    // 5. 复杂部分 乱序节点
    // a b [c d e] f g
    // a b [e d c h] f g
    // i = 2, e1 = 4, e2 = 5
    /**
     * 1. 生成newChild key映射表
     * 2. 根据映射表寻找oldChild 中同key元素，进行比较。
     * 3. 移动元素位置
     * TODO 未处理部分无key的情况
     */
    else {
      let s1 = i
      let s2 = i

      // 1. 生成newChild key映射表
      const keyToNewIndexMap = new Map() // 有key序号集合  key值：在新序列中的序号
      // 无key序号集合
      // const unKeyToNewIndexMap = new Set()

      for (i = s2; i <= e2; i++) {
        const nextChild = (c2[i] = normalizeVNode(c2[i]))
        // 具备key属性
        if (nextChild.key !== null) {
          keyToNewIndexMap.set(nextChild.key, i)
        } else {
          // unKeyToNewIndexMap.add(i)
        }
      }

      // 2. 根据映射表寻找oldChild 中同key元素，进行比较。找到就patch，找不到卸载
      const toBePatched = e2 - s2 + 1 // 新的乱序部分总个数
      // 相同key元素，新index与老index映射，未找到为0。新index从0开始，老index为和0(未找到)区分，都会加1
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
      for (i = s1; i <= e1; i++) {
        const oldChild = c1[i]
        let newIndex = keyToNewIndexMap.get(oldChild.key)
        // old中有相同key的元素
        if (newIndex !== undefined) {
          // - s2就是为了从0开始；值为了和0区分，都加1处理。
          newIndexToOldIndexMap[newIndex - s2] = i + 1;

          patch(oldChild, c2[newIndex], container)
        } else {
          // 老的中多余部分，卸载掉
          unmount(oldChild)
        }
      }

      // 3.移动元素位置
      // 从后向前循环的原因在于，移动操作需要依赖后面元素的el，所以必须保证后面的元素已经移动或者已挂载后，才能操作前面的。
      for (i = toBePatched - 1; i >= 0; i--) {
        const index = i + s2 // newChild真实序号
        let current = c2[index]
        let anchor = index + 1 < l2 ? c2[index + 1].el : null // 参照物是下一个或者null
        if(newIndexToOldIndexMap[i] === 0) {
          // 未在oldChild中出现过，需要挂载
          patch(null, current, container, anchor)
        } else {
          // TODO 算法需要优化，最大上升子序
          // 移动位置
          move(current, container, anchor)
        }
      }
    }
  }

  const move = (vnode, container, anchor) => {
    const { el } = vnode
    hostInsert(el, container, anchor)
  }

  const getNextHostNode = (vnode: VNode) => {
    return hostNextSibling(vnode.anchor || vnode.el)
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
 * 2.3.2.2.2.1 n1child是数组 n2child也是数组 patchKeyedChildren
 * 2.3.2.2.2.1.1 首先patch最小公共长度，n2比n1长就新增，n1比n2长就删除
 * 2.3.2.2.2.2 n1child是数组 n2child是null unmountChildren 解绑
 * 2.3.2.2.2.3 n1child是字符串 先hostSetElementText设置空；n2child是数组 mountChildren
 * 2.3.2.3 patchProps 遍历新的props 修改属性；遍历老的props 删除属性
 *
 */

/**
 * patchKeyedChildren 核心算法
 * 3个指针，对应 新前旧前 i、新后 e1、旧后 e2
 * 依次处理以下几种情况
 * 1. 起始节点类型相同
 *   (a b) c
 *   (a b) d e
 * 1.1 i 右移，依次进行patch，直到类型不同，跳出循环
 * 2. 结束位置类型相同
 *   a (b c)
 *   d e (b c)
 * 2.1 e1、e2左移，依次进行patch，直到类型不同，跳出循环
 * 3. 旧序列已比对完，新序列中有新增节点
 *   (a b)     或者    (a b)
 *   (a b) c           c (a b)
 * 3.1 i > e1 && i <= e2
 * 3.2 i右移，将节点插入到e2前的位置。由于从左向右循环插入，顺序不会发生变化，先插入的会一直往前挤
 * 4. 新序列已比对完，旧序列中有多余节点
 *   (a b) c    或者    c (a b)
 *   (a b)             (a b)
 * 4.1 i > e2 && i <= e1
 * 4.2 i 右移，循环卸载节点
 * 5. 乱序节点
 *
 */
