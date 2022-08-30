import { CREATE_ELEMENT_VNODE } from './runtimeHelpers'

export const enum NodeTypes {
  ROOT, // 根节点
  ELEMENT, // 元素
  TEXT, // 文本
  COMMENT, // 注释
  SIMPLE_EXPRESSION, // 简单表达式  xxx  :x="xxx"
  INTERPOLATION, // 模板表达式  {{xxx}}
  ATTRIBUTE, // 属性
  DIRECTIVE, // 指令
  // containers
  COMPOUND_EXPRESSION, // 复合表达式 {{xxx}}aaa
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL, // 文本调用
  // codegen
  VNODE_CALL, // 元素调用
  JS_CALL_EXPRESSION, // js调用表达式
  JS_OBJECT_EXPRESSION // js对象表达式
}

// 创建根节点 fragment
export function createRoot(children, loc) {
  return {
    type: NodeTypes.ROOT,
    children,
    loc
  }
}

// 创建组合表达式
export function createCompoundExpression(children, loc) {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION, // 组合表达式
    children,
    loc
  }
}

// 创建调用表达式
export function createCallExpression(callee, args) {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION, // js调用表达式
    callee, // 调用的方法名
    arguments: args
  }
}

// 创建对象表达式
export function createObjectExpression(properties) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties
  }
}

// 创建vnode调用
export function createVNodeCall(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE)
  return {
    type: NodeTypes.VNODE_CALL, // vnode调用
    tag,
    props,
    children,
  }
}
