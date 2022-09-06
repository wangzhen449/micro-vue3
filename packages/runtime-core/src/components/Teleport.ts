// 传送门

import { isString, ShapeFlags } from '@vue/shared'
// 是否是传送门
export const isTeleport = (type) => type.__isTeleport

// 是否禁用传送门
const isTeleportDisabled = (props) =>
  props && (props.disabled || props.disabled === '')

// target 从属性to中获取
const resolveTarget = (props, select) => {
  const targetSelector = props && props.to
  // 通过标签符获取
  if (isString(targetSelector)) {
    return select(targetSelector)
  } else {
    // 元素
    return targetSelector
  }
}

/**
 * teleport
 * 1. 流程分为创建和patch
 * 1.1 创建流程 区分是否禁用，插入到主容器还是传送门
 * 1.2 patch流程
 * 1.2.1 patch children
 * 1.2.2 移动 (三种情况)
 * 1.2.2.1 现在禁用，之前不禁用，需要从传送门移到主容器
 * 1.2.2.2 现在不禁用，传送地址变化（不管之前是否禁用）都移入新的传送地址
 * 1.2.2.3 现在不禁用，传送地址未变，之前禁用，需要从主容器移到新的传送门
 */
const TeleportImpl = {
  __isTeleport: true,
  process(n1, n2, container, anchor, parentComponent, optimized, internals) {
    const {
      mc: mountChildren,
      pc: patchChildren,
      pbc: patchBlockChildren,
      o: { insert, createText, querySelector }
    } = internals

    // 是否禁用传送门
    const disabled = isTeleportDisabled(n2.props)
    let { shapeFlag, children, dynamicChildren } = n2

    // 新增
    if (n1 === null) {
      // 在 porps 中，获取to属性，作为target
      const target = (n2.target = resolveTarget(n2.props, querySelector))
      const targetAnchor = (n2.targetAnchor = createText(''))
      if (target) {
        // 插入anchor
        insert(targetAnchor, target)
      }

      const mount = (container, anchor) => {
        // 传送门的children强制为数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(children, container, anchor, parentComponent, optimized)
        }
      }
      // 如果禁用，正常挂载
      if (disabled) {
        mount(container, anchor)
      } else if (target) {
        // 传送门
        mount(target, targetAnchor)
      }
    } else {
      // update content
      n2.el = n1.el
      // 正常anchor
      const mainAnchor = (n2.anchor = n1.anchor)!
      // 传送地址
      const target = (n2.target = n1.target)!
      // 传送anchor
      const targetAnchor = (n2.targetAnchor = n1.targetAnchor)!
      // 是否被禁用
      const wasDisabled = isTeleportDisabled(n1.props)
      // 当前容器
      const currentContainer = wasDisabled ? container : target
      // 当前anchor
      const currentAnchor = wasDisabled ? mainAnchor : targetAnchor

      // 动态节点 优化
      if (dynamicChildren) {
        patchBlockChildren(
          n1.dynamicChildren!,
          dynamicChildren,
          currentContainer,
          parentComponent
        )
      } else if (!optimized) {
        // 没有优化 patchChildren
        patchChildren(
          n1,
          n2,
          currentContainer,
          currentAnchor,
          parentComponent,
          false
        )
      }

      // 传送位置放生变化 moveTeleport
      if (disabled) {
        if (!wasDisabled) {
          // 现在禁用，之前不禁用，需要把元素移到主容器
          moveTeleport(
            n2,
            container,
            mainAnchor, // parentVNode
            internals,
            TeleportMoveTypes.TOGGLE // 启用禁用切换
          )
        }
      } else {
        // 现在不禁用

        // 传送地址发生变化
        if (n2.props && n2.props.to !== n1.props && n1.props.to) {
          const nextTarget = resolveTarget(n2.props, querySelector)
          if (nextTarget) {
            moveTeleport(
              n2,
              nextTarget,
              null,
              internals,
              TeleportMoveTypes.TARGET_CHANGE
            )
          }
        } else if (wasDisabled) {
          // 之前禁用 需要从主容器移动到传送门
          moveTeleport(
            n2,
            target,
            targetAnchor,
            internals,
            TeleportMoveTypes.TOGGLE
          )
        }
      }
    }
  }
}

// 三种类型
export const enum TeleportMoveTypes {
  TARGET_CHANGE, // target改变
  TOGGLE, // 禁用启用切换
  // REORDER // 移动到或者移出主容器
}

// 移动
function moveTeleport(
  vnode,
  container,
  parentAnchor,
  { o: { insert }, m: move },
  moveType
) {
  // target改变
  if (moveType === TeleportMoveTypes.TARGET_CHANGE) {
    // 操作anchor
    insert(vnode.targetAnchor!, container, parentAnchor)
  }
  const { shapeFlag, children } = vnode

  // 移动
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    for (let i = 0; i < children.length; i++) {
      move(children[i], container, parentAnchor)
    }
  }
}

export const Teleport = TeleportImpl as any as {
  __isTeleport: true
}
