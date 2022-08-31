import { isArray, isString, isSymbol } from '@vue/shared'
import { NodeTypes } from './ast'
import { CREATE_ELEMENT_BLOCK, helperNameMap, OPEN_BLOCK, TO_DISPLAY_STRING, CREATE_ELEMENT_VNODE } from './runtimeHelpers';

const aliasHelper = (s: symbol) => `${helperNameMap[s]} as _${helperNameMap[s]}`

// 创建生成代码上下文 加入方法
function createCodegenContext(ast) {
  const context = {
    code: ``, // 代码
    indentLevel: 0, // 缩进层级
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code) {
      context.code += code
    },
    indent() {
      // 向后缩进
      newline(++context.indentLevel)
    },
    deindent(withoutNewLine = false) {
      // 向前缩进
      if (withoutNewLine) {
        --context.indentLevel
      } else {
        newline(--context.indentLevel)
      }
    },
    newline() {
      // 新行
      newline(context.indentLevel)
    }
  }

  function newline(n: number) {
    context.push('\n' + `  `.repeat(n))
  }

  return context
}

export function generate(ast) {
  // 创建上下文
  const context = createCodegenContext(ast)
  const { push, indent, deindent, newline } = context

  const hasHelpers = ast.helpers.length > 0

  // 导入方法
  genFunctionPreamble(ast, context)

  const functionName = 'render' // 函数名
  const args = ['_ctx', '_cache'] // 函数参数
  const signature = args.join(', ') // 拼接参数

  push(`function ${functionName}(${signature}) {`)
  indent()

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  }

  deindent()
  push('}')

  console.log(context.code)
}

function genFunctionPreamble(ast, context) {
  const { push, newline } = context

  if (ast.helpers.length > 0) {
    push(`import { ${ast.helpers.map(aliasHelper).join(', ')} } from "vue"\n`)
    newline()
    push(`export `)
  }
}

// children
function genNodeListAsArray(nodes, context) {
  context.push(`[`)
  genNodeList(nodes, context)
  context.push(`]`)
}

// vnode
function genNodeList(nodes, context) {
  const { push, newline } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] === null ? 'null' : nodes[i]
    if (isString(node)) { // tag、text_children
      push(node)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }

    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

function genNode(node, context) {
  // 文本
  if (isString(node)) {
    context.push(node)
    return
  }
  // helper
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.TEXT_CALL:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.INTERPOLATION: // 表达式
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION: // 简单表达式
      genExpression(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION: // 复合表达式
      genCompoundExpression(node, context)
      break
    case NodeTypes.ELEMENT: // 元素
      genNode(node.codegenNode, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    default:
      break;
  }
}

// 文本
function genText(node, context) {
  context.push(JSON.stringify(node.content))
}

// 表达式
function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}

// 简单表达式
function genExpression(node, context) {
  context.push(node.content)
}

// 复合表达式
function genCompoundExpression(node, context) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (isString(child)) { // +
      context.push(child)
    } else {
      genNode(child, context)
    }
  }
}

// VNode
function genVNodeCall(node, context) {
  const { push, helper } = context
  const {
    tag,
    props,
    children,
    isBlock,
  } = node
  // 是block
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}, `)
  }
  const callHelper = isBlock ? CREATE_ELEMENT_BLOCK : CREATE_ELEMENT_VNODE
  push(helper(callHelper) + `(`)
  genNodeList([tag, props, children], context)
  push(`)`)
  if (isBlock) {
    push(`)`)
  }
}

// 调用表达式
function genCallExpression(node, context) {
  const { push, helper } = context
  const callee = isString(node.callee) ? node.callee : helper(node.callee)
  // 函数名
  push(callee + `(`)
  // 参数
  genNodeList(node.arguments, context)
  push(')')
}

// 对象表达式 比如属性
function genObjectExpression(node, context) {
  const { push, indent, deindent, newline } = context
  const { properties } = node
  if (!properties.length) {
    push(`{}`, node)
    return
  }
  // 超过一个就换行
  const multilines = properties.length > 1
  push(multilines ? `{` : `{ `)
  multilines && indent()
  for (let i = 0; i < properties.length; i++) {
    const { key, value } = properties[i]
    // key
    push(key)
    push(`: `)
    // value
    genNode(value, context)
    // 超过一个的时候
    if (i < properties.length - 1) {
      push(`,`)
      newline()
    }
  }
  multilines && deindent()
  push(multilines ? `}` : ` }`)
}
