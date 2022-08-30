import { NodeTypes } from './ast'
import { TO_DISPLAY_STRING } from './runtimeHelpers'

// 创建转换上下文
function createTransformContext(root, { nodeTransform }) {
  const context = {
    root, // 根节点
    parent: null, // 父节点
    currentNode: root, // 当前节点
    helpers: new Map(),
    helper(name) {
      // 记录调用次数
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
    nodeTransform
  }

  return context
}

/**
 * 1. 创建转换上下文
 * 2. 按照类型做转换
 * 3. 递归转换
 */
export function transform(root, options) {
  const context = createTransformContext(root, options)

  // 遍历所有节点
  traverseNode(root, context)
}
/**
 * transform 遍历节点
 * 1. 调用所有nodeTransform，对于需要后置处理的，存储到退出函数集合中
 * 2. 递归处理子元素
 * 3. 递归退出，执行退出函数
 */
function traverseNode(node, context) {
  context.currentNode = node

  const { nodeTransform } = context

  // 这里需要使用退出函数，是因为只有处理完children的每个元素后，才能对children进行二次处理。（比如多个文本拼接在一起）
  // 所以对于处理函数进行缓存，在递归退出的时候进行调用
  const exitFns = []
  for (let i = 0; i < nodeTransform.length; i++) {
    // type 是element或text 这里返回的是函数。INTERPOLATION 表达式类型直接处理，不需要存入退出函数。
    const onExit = nodeTransform[i](node, context)
    if (onExit) {
      exitFns.push(onExit)
    }

    if (!context.currentNode) {
      // 节点被删除掉了，就无需进行子节点的递归
      return
    } else {
      node = context.currentNode
    }
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 注入 toString helper
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      // 元素类型节点，需要递归遍历子节点
      traverseChildren(node, context)
      break
  }

  // 在递归过程中，currentNode会变，所以这里还使用当前函数作用域的node
  context.currentNode = node
  // 等子节点递归完成，退出的时候，遍历退出函数进行执行
  // 按照nodeTransform倒序执行，transformText -> transformElement 先处理文本，然后梳理元素
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

// 遍历子节点
function traverseChildren(parent, context) {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    // 标记父节点
    child.parent = parent
    // 遍历子节点
    traverseNode(child, context)
  }
}
