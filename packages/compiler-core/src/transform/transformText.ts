import { PatchFlags } from '@vue/shared'
import {
  createCallExpression,
  createCompoundExpression,
  NodeTypes
} from '../ast'
import { CREATE_TEXT } from '../runtimeHelpers'
import { isText } from '../utils'

/**
 * transform 文本
 * 1. 合并子节点中相邻的文本节点 <div>abc {{ d }} {{ e }}</div> 变为复合表达式
 * 2. 添加 createTextVNode helper，对于动态文本添加patchFlag
 */
export function transformText(node, context) {
  // 根节点或者元素节点
  if (node.type === NodeTypes.ROOT || node.type === NodeTypes.ELEMENT) {
    return () => {
      const children = node.children
      let currentContainer
      let hasText = false
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              // 第一个相邻 初始化
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression(
                  [child],
                  child.loc
                )
              }

              // 连续
              // 合并
              currentContainer.children.push('+', next)
              // 删掉当前节点
              children.splice(j, 1)
              j--
            } else {
              // 不连续的时候清空
              currentContainer = null
              break
            }
          }
        }
      }

      // 没有文本 或者 只有一个文本，不需要添加patchFlag
      if (!hasText || children.length === 1) {
        return
      }
      // patchFlag 当合并完之后，children还有多个元素时。添加动态节点的 patchFlag
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        // 如果是文本或者是复合表达式
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs = []
          callArgs.push(child)
          // 动态节点
          if (child.type !== NodeTypes.TEXT) {
            // 转为字符串
            callArgs.push(PatchFlags.TEXT + '')
          }

          // 改变节点属性
          children[i] = {
            type: NodeTypes.TEXT_CALL, // 这个标记表示，使用createTextVNode实现
            content: child,
            loc: child.loc,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }
  }
}
