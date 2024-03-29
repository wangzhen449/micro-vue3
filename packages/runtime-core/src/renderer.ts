import { ReactiveEffect } from '@vue/reactivity'
import { invokeArrayFns, isString, PatchFlags, ShapeFlags } from '@vue/shared'
import { createComponentInstance, setupComponent } from './component'
import {
  renderComponentRoot,
  shouldUpdateComponent
} from './componentRenderUtils'
import { Fragment, Comment, isSameVNodeType, normalizeVNode, Text, VNode } from './vnode'
import { queueJob } from './scheduler'
import { updateProps } from './componentProps'
import { updateSlots } from './componentSlots'
import { isKeepAlive } from './components/KeepAlive'

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
    nextSibling: hostNextSibling,
    createComment: hostCreateComment
  } = options

  /**
   * diff算法的核心(创建需要新增的节点、移除已经废弃的节点、移动或者修改需要更新的节点)
   */
  const patch = (
    n1,
    n2,
    container,
    anchor = null,
    parentComponent = null,
    optimized = !!n2.dynamicChildren
  ) => {
    // 没有变化
    if (n1 === n2) {
      return
    }

    // type和key 不一致
    if (n1 && !isSameVNodeType(n1, n2)) {
      // 记录卸载元素的位置，后面的就从这个位置插入
      anchor = getNextHostNode(n1)
      // remove掉
      unmount(n1, parentComponent, true)
      n1 = null
    }

    // BAIL 不使用优化
    if (n2.patchFlag === PatchFlags.BAIL) {
      optimized = false
      n2.dynamicChildren = null
    }

    const { type, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor)
        break
      case Comment:
        processCommentNode(n1, n2, container, anchor)
        break
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent, optimized)
        break
      default:
        // 元素类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent, optimized)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 组件类型
          processComponent(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            optimized
          )
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          // 传送门
          type.process(
            n1, n2, container, anchor, parentComponent, optimized, internals
          )
        }
    }
  }

  // 注释流程
  const processCommentNode = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        (n2.el = hostCreateComment(n2.children || '')),
        container,
        anchor
      )
    } else {
      // 无需过多操作
      n2.el = n1.el
    }
  }

  /**
   * 组件流程
   * vue3 不建议使用函数式组件
   */
  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container,
    anchor,
    parentComponent,
    optimized
  ) => {
    if (n1 == null) {
      // 如果是 keepAlive激活态 不直接走挂载，使用keepalive的activate，走缓存
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        parentComponent.ctx.activate(n2, container, anchor, optimized)
      } else {
        // 挂载组件
        mountComponent(n2, container, anchor, parentComponent, optimized)
      }
    } else {
      // 当父组件重新渲染时，会触发子组件的patch
      // 当子组件依赖的props被父组件改变的时候，就会触发组件重新渲染
      updateComponent(n1, n2, optimized)
    }
  }

  /**
   * 挂载组件
   * 1. 创建组件实例
   * 2. 对组件实例赋值  包括 对数据进行响应式处理，处理 setup
   * 3. 为组件设置 effect，effect为渲染函数。 分为首次渲染和二次更新，二次更新依赖props的变化。
   * 4. initialVNode 是 组件vnode；而 subTree 是 组件render渲染返回的 子树vnode
   */
  const mountComponent = (initialVNode, container, anchor, parentComponent, optimized) => {
    // 创建组件实例
    const instance = (initialVNode.component =
      createComponentInstance(initialVNode, parentComponent))

    // 如果是 KeepAlive 给instance.ctx加入操作能力
    if (isKeepAlive(initialVNode)) {
      (instance.ctx as any).renderer = internals
    }

    // 给instance赋值 proxy、render、props、attrs....
    // proxy 及 setup
    setupComponent(instance)

    // 组件effect处理
    setupRenderEffect(instance, initialVNode, container, anchor, optimized)
  }

  /**
   * effect
   * 1. 创建effect 传入 fn 和 调度器
   * 1.1. fn 分为首次渲染和二次更新，都是走的patch逻辑，二次更新时n1使用实例之前存储的subTree
   * 1.1.1. subTree 是组件转化的vnode，通过调用组件实例的render方法获得（render方法使用组件实例的proxy作为执行上下文）
   * 1.2. 为了保证多次修改只执行一次，传入调度器
   * 1.2.1. 调度器收集所有的要执行的任务，通过微任务异步更新
   * 2. effect 赋值给 instance.update，方便后续更新使用
   */
  const setupRenderEffect = (
    instance,
    initialVNode,
    container,
    anchor,
    optimized
  ) => {
    // 首次渲染和更新都要走这个函数，通过isMounted判断
    const componentUpdateFn = () => {
      // 首次渲染
      if (!instance.isMounted) {
        const { bm, m } = instance

        // 执行beforeMount
        if (bm) {
          invokeArrayFns(bm)
        }
        // 组件的vnode 将组件实例转化为vnode
        const subTree = (instance.subTree = renderComponentRoot(instance))
        // 将subTree渲染为真是节点；instance是subTree的 parent
        patch(null, subTree, container, anchor, instance)

        // 将subTree的el 赋值给组件，否则组件没有el，在patch的时候会出问题
        initialVNode.el = subTree.el
        // 执行mounted
        if (m) {
          invokeArrayFns(m)
        }
        instance.isMounted = true
      } else {
        // 更新操作
        let { next, props, vnode, bu, u } = instance

        // 通过next在这里更改props，由于在同一个effect内部，不会触发二次更新
        if (next) {
          next.el = vnode.el

          // 更新组件实例
          updateComponentPreRender(instance, next, optimized)
        } else {
          next = vnode
        }

        // 执行beforeUpdate
        if (bu) {
          invokeArrayFns(bu)
        }

        const nextTree = renderComponentRoot(instance)
        const prevTree = instance.subTree
        instance.subTree = nextTree
        // 前后vnode进行patch比较
        patch(prevTree, nextTree, container, anchor, instance)
        next.el = nextTree.el

        // 执行Updated
        if (u) {
          invokeArrayFns(u)
        }
      }
    }

    // 这里没有使用effect是因为，源码中使用scope参数，来收集所有的effect。但目前没有用到
    // 需要使用调度器，控制组件刷新的频率
    const effect = (instance.effect = new ReactiveEffect(
      componentUpdateFn,
      () => queueJob(update)
    ))

    const update = (instance.update = effect.run.bind(effect))

    update()
  }

  const updateComponentPreRender = (instance, nextVnode, optimized) => {
    const prevProps = instance.vnode.props
    // 更换新的vnode
    instance.vnode = nextVnode
    // next置为空
    instance.next = null
    // 更新props
    updateProps(instance, nextVnode.props, prevProps, optimized)
    // 更新slots
    updateSlots(instance, nextVnode.children, optimized)
  }

  // 组件外部变化引起的更新
  const updateComponent = (n1, n2, optimized) => {
    const instance = (n2.component = n1.component)
    // 判断组件是否更新
    if (shouldUpdateComponent(n1, n2)) {
      // 这里需要更改组件实例的vnode和props，但是更改props时，又会触发组件的更新
      // 把n2存储在组件实例的next上，在组件更新函数中修改props的值，这样就不会造成二次更新
      instance.next = n2
      instance.update()
    } else {
      // 无需更新
      n2.el = n1.el
      instance.vnode = n2
    }
  }

  /**
   * 卸载组件
   * 1. 触发unmounted的生命周期函数
   * 2. 关闭effect，渲染更新不在生效
   * 3. 卸载子树
   */
  const unmountComponent = (instance, doRemove?) => {
    const { bum, um, update, subTree } = instance

    // 执行 beforeUnmount
    if (bum) {
      invokeArrayFns(bum)
    }

    if (update) {
      // 关闭effect
      update.active = false

      // 卸载 子树
      unmount(subTree, instance, doRemove)
    }

    // 执行 unmounted
    if (um) {
      invokeArrayFns(um)
    }

    instance.isUnmounted = true
  }

  /**
   * Fragment 流程
   * 碎片化节点中只有children；所以只存在新增和对比children的两个过程
   * 要标记 Fragment 的起止位置，方便后续删除 (removeFragment)
   */
  const processFragment = (
    n1: VNode | null,
    n2: VNode,
    container,
    anchor,
    parentComponent,
    optimized
  ) => {
    // 起止位置就是从 n1 到 n1的下一个
    // Fragment开始位置
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))
    // Fragment结束位置
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))

    let { patchFlag, dynamicChildren } = n2

    if (n1 == null) {
      // n1 没有，需要插入Fragment的起止位置
      hostInsert(fragmentStartAnchor, container, anchor)
      hostInsert(fragmentEndAnchor, container, anchor)

      mountChildren(
        n2.children,
        container,
        fragmentEndAnchor,
        parentComponent,
        optimized
      )
    } else {
      // 子元素顺序不变的Fragment
      // v-for="i in 10" 常数数组；或者普通fragment
      if (
        patchFlag > 0 &&
        patchFlag & PatchFlags.STABLE_FRAGMENT &&
        dynamicChildren &&
        n1.dynamicChildren
      ) {
        patchBlockChildren(
          n1.dynamicChildren,
          dynamicChildren,
          container,
          parentComponent
        )
      } else {
        // 不能使用优化方式
        patchChildren(
          n1,
          n2,
          container,
          fragmentEndAnchor,
          parentComponent,
          optimized
        )
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
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container,
    anchor,
    parentComponent,
    optimized
  ) => {
    // 初始化过程
    if (n1 === null) {
      mountElement(n2, container, anchor, parentComponent, optimized)
    } else {
      // 修改的过程
      patchElement(n1, n2, parentComponent, optimized)
    }
  }

  /**
   * 元素的patch过程
   * 1. patch children
   * 2. patch props
   */
  const patchElement = (n1, n2, parentComponent, optimized) => {
    const el = (n2.el = n1.el)
    let { patchFlag, dynamicChildren } = n2

    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // 有动态节点
    if (dynamicChildren) {
      // block的动态节点patch
      patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent)
    } else if (!optimized) {
      // 不使用优化

      // patch children 这里的容器要传入el
      patchChildren(n1, n2, el, null, parentComponent, optimized)
    }

    // 有动态内容
    if (patchFlag > 0) {
      // 动态属性
      // 动态属性名 (:[key]="xxx") 全量对比
      if (patchFlag & PatchFlags.FULL_PROPS) {
        patchProps(el, n2, oldProps, newProps)
      } else {
        // class 是动态的
        if (patchFlag & PatchFlags.CLASS) {
          if (oldProps.class !== newProps.class) {
            hostPatchProp(el, 'class', null, newProps.class)
          }
        }

        // style 是动态的
        if (patchFlag & PatchFlags.STYLE) {
          hostPatchProp(el, 'style', oldProps.style, newProps.style)
        }

        // 除class 和 style 之外的动态属性props
        if (patchFlag & PatchFlags.PROPS) {
          // dynamicProps 记录了需要映射的原始key  [key, key...]
          const propsToUpdate = n2.dynamicProps!

          // 两者如果不同就替换
          for (let i = 0; i < propsToUpdate.length; i++) {
            const key = propsToUpdate[i]
            const prev = oldProps[key]
            const next = newProps[key]

            if (prev !== next) {
              hostPatchProp(el, key, prev, next)
            }
          }
        }
      }

      // 动态文本节点，直接替换
      if (patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          hostSetElementText(el, n2.children as string)
        }
      }
    } else if (!optimized && dynamicChildren === null) {
      // 不使用优化

      // patch props
      patchProps(el, n2, oldProps, newProps)
    }
  }

  /**
   * block的动态节点patch
   * 动态节点，oldVNode和newVNode 位置是一样的。所以可以用下面的方式比较。
   * 除了一些 v-if 和 v-for等特殊情况
   */
  const patchBlockChildren = (
    oldChildren,
    newChildren,
    el,
    parentComponent
  ) => {
    for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i]
      const newVNode = newChildren[i]

      const container =
        oldVNode.el &&
        // 类型是Fragment的时候，容器应该为父元素
        (oldVNode.type === Fragment ||
          // 类型不同需要卸载，也需要父元素
          !isSameVNodeType(oldVNode, newVNode) ||
          // 组件需要父元素
          oldVNode.shapeFlag & ShapeFlags.COMPONENT)
          ? hostParentNode(oldVNode.el)
          : el

      patch(oldVNode, newVNode, container, null, parentComponent, true)
    }
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
  const mountElement = (vnode: VNode, container, anchor, parentComponent, optimized) => {
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
      mountChildren(vnode.children, el, anchor, parentComponent, optimized)
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
  const mountChildren = (
    children,
    container,
    anchor,
    parentComponent,
    optimized,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      // 规范化child

      // TODO
      let child = (children[i] = normalizeVNode(children[i]))

      // 递归patch
      patch(null, child, container, anchor, parentComponent, optimized)
    }
  }

  /**
   * patch children
   * 1. 优化模式下，可以区别 有key的fragment 和 无key的fragment
   */
  const patchChildren = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    optimized
  ) => {
    const c1 = n1 && n1.children
    const preShapeFlag = n1 ? n1.shapeFlag : 0

    const { patchFlag, shapeFlag, children: c2 } = n2

    // 使用优化模式
    if (patchFlag > 0) {
      if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // 部分有key
        patchKeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          optimized
        )
      } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // 无 key fragment
        patchUnkeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          optimized
        )
      }
    }

    // n2 string
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // n1 array
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1, parentComponent)
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
          patchKeyedChildren(
            c1,
            c2,
            container,
            anchor,
            parentComponent,
            optimized
          )
        } else {
          // n2 null
          unmountChildren(c1, parentComponent, true)
        }
      } else {
        // n1 string | null
        // n1 string
        if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, container, anchor, parentComponent, optimized)
        }
      }
    }
  }

  // 无key children，只能暴力patch
  const patchUnkeyedChildren = (
    c1,
    c2,
    container,
    anchor,
    parentComponent,
    optimized
  ) => {
    const oldLength = c1.length
    const newLength = c2.length
    const commonLength = Math.min(oldLength, newLength)

    // 相同长度的部分直接比较
    for (let i = 0; i < commonLength; i++) {
      const nextChild = (c2[i] = normalizeVNode(c2[i]))
      patch(c1[i], nextChild, container, null, parentComponent, optimized)
    }

    if (oldLength > newLength) {
      // 卸载
      unmountChildren(c1, parentComponent, true, commonLength)
    } else {
      // 挂载
      mountChildren(
        c2,
        container,
        anchor,
        parentComponent,
        optimized,
        commonLength
      )
    }
  }

  // 数组 diff 核心算法
  const patchKeyedChildren = (
    c1,
    c2,
    container,
    parentAnchor,
    parentComponent,
    optimized
  ) => {
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
        patch(n1, n2, container, null, parentComponent, optimized)
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
        patch(n1, n2, container, null, parentComponent, optimized)
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
          patch(
            null,
            (c2[i] = normalizeVNode(c2[i])),
            container,
            anchor,
            parentComponent,
            optimized
          )
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
        unmount(c1[i], parentComponent, true)
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
          newIndexToOldIndexMap[newIndex - s2] = i + 1

          patch(
            oldChild,
            c2[newIndex],
            container,
            null,
            parentComponent,
            optimized
          )
        } else {
          // 老的中多余部分，卸载掉
          unmount(oldChild, parentComponent, true)
        }
      }

      // 3.移动元素位置
      // 从后向前循环的原因在于，移动操作需要依赖后面元素的el，所以必须保证后面的元素已经移动或者已挂载后，才能操作前面的。
      const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
      let j = increasingNewIndexSequence.length - 1
      for (i = toBePatched - 1; i >= 0; i--) {
        const index = i + s2 // newChild真实序号
        let current = c2[index]
        let anchor = index + 1 < l2 ? c2[index + 1].el : null // 参照物是下一个或者null
        if (newIndexToOldIndexMap[i] === 0) {
          // 未在oldChild中出现过，需要挂载
          patch(null, current, container, anchor, parentComponent, optimized)
        } else {
          // 最大上升子序 从后向前查找，找到就略过
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 移动位置
            move(current, container, anchor)
          } else {
            console.log(110, i)
            j--
          }
        }
      }
    }
  }

  // doRemove 只是一个是否执行删除 dom 的标识，false的情况也是通过其他方式替换了。
  const unmount = (vnode, parentComponent, doRemove = false) => {
    const { type, children, shapeFlag } = vnode

    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      // keepalive的卸载，被deactivate拦截
      parentComponent.ctx.deactivate(vnode)
      return
    }

    // 组件的卸载
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 组件在内部处理逻辑中移除dom
      unmountComponent(vnode.component, doRemove)
    } else {
      // Fragment 是一个容器。遍历子元素依次卸载。不给子元素的卸载不会执行dom删除，而是在remove中卸载Fragment
      if (type === Fragment && shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(children, parentComponent)
      }

      if (doRemove) {
        remove(vnode)
      }
    }
  }

  const remove = (vnode) => {
    const { type, el, anchor } = vnode
    // 如果是fragment，调用removeFragment 特殊处理
    if (type === Fragment) {
      removeFragment(el, anchor)
      return
    }

    hostRemove(el)
  }

  // Fragment是一个容器，只能找到开始和结束位置，依次删除
  const removeFragment = (cur, end) => {
    let next
    while (cur !== end) {
      next = hostNextSibling(cur)
      hostRemove(cur)
      cur = next
    }
    hostRemove(end)
  }

  const unmountChildren = (children, parentComponent, doRemove = false, start = 0) => {
    for (let i = start; i < children.length; i++) {
      unmount(children[i], parentComponent, doRemove)
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
        unmount(container._vnode, null, true)
      }
    } else {
      // 初始化或者更新的过程
      patch(container._vnode || null, vnode, container, null, null)
    }
    // 为容器绑定vnode (下次进入时，这里就存储了上次绑定的值)
    container._vnode = vnode
  }

  // 内部构件
  const internals = {
    p: patch,
    um: unmount,
    m: move,
    r: remove,
    mt: mountComponent,
    mc: mountChildren,
    pc: patchChildren,
    pbc: patchBlockChildren,
    n: getNextHostNode,
    o: options
  }

  let createApp = () => {}
  return {
    render,
    createApp
  }
}

/**
 * 1. 动态规划法
 * 每一个数字都记录到自身为止有多少个递增
 * arr    [4, 6, 3, 5, 2, 7, 9, 8, 1]
 * dp     [1, 2, 1, 2, 1, 3, 4, 4, 1]  记录每个数字截止自身，有多少个递增
 * result [0, 1,          6, 7      ]  记录最长递增序列的序号
 */
function getSequence1(arr: number[]): number[] {
  // 创建与参数同长度的数组，每一项初始化为1
  const len = arr.length
  const dp = Array(len).fill(1)
  // 保存序号
  let result = []
  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    // 过滤掉值为0的情况
    if (arrI === 0) {
      continue
    }

    // 记录递增序号
    let jResult = []
    // 遍历i之前的每一项 对比大小
    for (let j = 0; j < i; j++) {
      const arrJ = arr[j]
      // 过滤掉值为0的情况
      if (arrJ === 0) {
        continue
      }

      if (arrI > arrJ) {
        // 只使用最长子序
        if (dp[j] === dp[i]) {
          dp[i] = dp[j] + 1
          jResult.push(j)
        }
      }
    }
    // 最后添加上当前的序号。截止到当前肯定要添加当前，而上述操作没有添加当前。
    jResult.push(i)

    // 比之前结果长，改值
    jResult.length > result.length && (result = jResult)
  }
  return result
}

/**
 * 2. 贪心算法 + 二分查找（算法找到最长递增子序列的个数）；再通过回溯法，找到正确的序号
 * 贪心+二分
 * 从贪心角度考虑，尽可能增加递增子序列的长度
 * 所以希望在上升子序列末尾加上的树尽可能的小
 * 10, 9, 2, 5, 3, 7, 101, 4, 1
 * 10
 * 9
 * 2
 * 2 5
 * 2 3
 * 2 3 7
 * 2 3 7 101
 * 2 3 4 101
 * 1 3 4 101
 * 设当前已求出的最长上升子序列的长度为 len（初始时为 1），从前往后遍历数组 nums，在遍历到 nums[i] 时：
 * 如果 nums[i] > d[len] ，则直接加入到 d 数组末尾，并更新 len=len+1；
 * 否则，在 d 数组中二分查找，找到第一个比 nums[i] 小的数 d[k] ，并更新 d[k + 1] = nums[i]
 *
 * 回溯法
 * 操作result时，记住他的前置节点。用最后一个节点，去追溯他的前置节点，即为正确序号。
 */
function getSequence(arr: number[]): number[] {
  // 前置节点记录
  const p = arr.slice()

  const result = [0]
  const len = arr.length
  let i, j, start, end, middle
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      // 当前值比result中最后一个数还大，直接放入result中，跳出本次循环
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }

      // 二分查找 在结果集中找到比当前值大的，用当前索引替换
      start = 0
      end = result.length - 1

      // 当 start 和 end相等的时候停止循环
      while (start < end) {
        // 都是除2向下取整的方式
        middle = (start + end) >> 1
        // middle = ((start + end) / 2) | 0
        // middle = Math.floor((start + end) / 2)

        // 继续二分
        if (arr[result[middle]] < arrI) {
          start = middle + 1
        } else {
          end = middle
        }
      }

      // 替换 这里start 和 end 值是一样的
      if (arrI < arr[result[start]]) {
        // 第一个不需要记录
        if (start > 0) {
          // 替换之后，记录替换位置前面的那个。两种都可以
          p[i] = result[start - 1]
          // p[i] = p[end]
        }
        result[start] = i
      }
    }
  }

  let u = result.length
  end = result[u - 1]
  // 追溯在p中保存的前置序号
  while (u-- > 0) {
    result[u] = end
    end = p[end]
  }

  return result
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
 * 5.1 生成keyToNewIndex映射表
 * 5.2 循环oldChild，如果其key在映射表中可以找到就patch，找不到就卸载
 * 5.3 移动元素，newChild新增的走挂载，其他移动位置
 */

/**
 * 关于最长递增子序
 * 上述在5.3移动元素中不管位置是否变化都会被移动。而最长递增子序无需移动。
 * 为什么最长递增子序列无需要移动？
 *    1. 入参是newIndexToOldIndexMap，也就是说以oldChild的下标为上升参照。
 *    2. newChild中相对老的序号被打乱，处于序号上升的元素其实是不需要更换位置的。
 *        [1,2,3,4] -> [1,4,2,3] 1,2,3无需移动，只需移动4
 *    3. 找到最长递增子序，就能找到最多无需移动移动元素。
 * 最长递增子序 getSequence
 * 1. 动态规划法
 * 2. 贪心+二分查找法（目前的最优解）
 */
