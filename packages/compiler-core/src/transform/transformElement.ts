import { NodeTypes, createObjectExpression, createVNodeCall } from '../ast'

/**
 * transform 元素
 * 1. tag、props、children  使用createElementVNode
 */
export function transformElement(node, context) {
  return function postTransformElement() {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }

    const { tag, props } = node
    // 元素名称
    let vnodeTag = `"${tag}"`

    // 属性
    let properties = []
    if (props.length > 0) {
      for (let i = 0; i < props.length; i++) {
        const prop = props[i]
        if (prop.type === NodeTypes.ATTRIBUTE) {
          const { name, value } = prop
          // value是undefined时，无值属性值为true
          properties.push({
            key: name,
            value: value
              ? value.content
                ? value.content
                : ''
              : true,
          })
        }
      }
    }
    // 属性表达式
    const propsExpression =
      properties.length > 0 ? createObjectExpression(properties) : null

    // children
    let vnodeChildren = null
    if (node.children.length > 0) {
      if (node.children.length === 1) {
        // 长度一个的时候，直接用对象
        vnodeChildren = node.children[0]
      } else if (node.children.length > 1) {
        vnodeChildren = node.children
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      propsExpression,
      vnodeChildren
    )
  }
}
