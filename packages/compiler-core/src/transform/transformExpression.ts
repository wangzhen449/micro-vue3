import { NodeTypes } from '../ast'

export const transformExpression = (node, context) => {
  // 如果是表达式，替换内容
  if (node.type === NodeTypes.INTERPOLATION) {
    const raw = node.content.content
    node.content.content = `_ctx.${raw}`
  }
}
