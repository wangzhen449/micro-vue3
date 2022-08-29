import { NodeTypes } from "./ast"
import { advancePositionWithMutation } from "./utils"

/**
 * 1. 创建parse上下文
 * 2. 获取当前位置
 * 3. parse 并返回ast
 */
export function parse(content) {
  const context = createParserContext(content)
  const start = getCursor(context)

  return parseChildren(context)
}

// 创建parse上下文
function createParserContext(content) {
  return {
    column: 1, // 列
    line: 1, // 行
    offset: 0, // 偏移量
    originalSource: content, // 源内容，不会改变
    source: content // 剩余内容，通过不断的字符截取(slice)完成解析
  }
}

/**
 * 按照类型判断，使用不同解析方案
 * {{ 表达式
 * < 标签
 * xxx 文本
 */
function parseChildren(context) {
  const nodes = []
  // 如果还没结束
  while (!isEnd(context)) {
    let node
    // 当前剩余
    const s = context.source
    // {{xxx}}
    if (s.startsWith('{{')) {
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      // 标签
      node = parseElement(context)
    }

    // 文本
    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }

  return nodes
}

/**
 * parse {{}} 的插入值
 * 1. 去掉 {{
 * 2. 处理中间文本部分
 * 2.1 处理中间文本存在前后空格的问题。文本部分的位置信息是没有前后空格部分的
 * 3. 去掉 }}
 * 4. 返回 表达式对象
 */
function parseInterpolation(context) {
  const [open, close] = ['{{', '}}']
  // 找到结束位置
  const closeIndex = context.source.indexOf(close, open.length)
  if (closeIndex === -1) {
    console.warn('没有结束}}')
    return
  }

  // 1. 去掉 {{
  // 开始位置
  const start = getCursor(context)
  // 去掉 {{
  advanceBy(context, open.length)

  // 2. 处理中间文本
  // 开始位置（最终文本的开始位置）
  const innerStart = getCursor(context)
  // 结束位置（最终文本的结束位置）
  const innerEnd = getCursor(context)
  // 插入值长度
  const rawContentLength = closeIndex - open.length
  // 插入值内容
  const rawContent = context.source.slice(0, rawContentLength)
  // 插入值是文本，所以使用parseTextData处理。但是这部分内容前后可能存在空格。真实文本需要处理掉前后的空格
  const preTrimContent = parseTextData(context, rawContentLength)

  // 2.1 处理文本前后空格造成的位置问题
  // trim
  const content = preTrimContent.trim()
  // ------ 处理前面
  // 前面的偏移量
  const startOffset = preTrimContent.indexOf(content)
  // 前面有空格
  if (startOffset > 0) {
    // 更新innderStart的位置信息
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }
  // ------ 处理后面
  // 如果后面有空格
  const endOffset = startOffset + content.length
  if (endOffset < rawContentLength) {
    // 更新innerEnd的位置信息
    advancePositionWithMutation(innerEnd, rawContent, endOffset)
  }

  // 3. 去掉 }}
  advanceBy(context, close.length)

  // 4. 返回 表达式对象
  return {
    type: NodeTypes.INTERPOLATION, // 模板表达式
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION, // 简单表达式
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    col: getSelection(context, start)
  }
}

function parseElement(context) {

}

/**
 * parse 文本
 * 1. 找到text的结束位置
 * 2. 返回text部分的位置信息
 * 3. 返回文本对象
 */
function parseText(context) {
  // 1. 找到text的结束位置
  // 遇到这两个停止
  const endTokens = ['<', '{{']
  // 结束索引
  let endIndex = context.source.length
  for (let i = 0; i < endTokens.length; i++) {
    // 第一次出现的位置
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && index < endIndex) {
      endIndex = index
    }
  }

  // 2. 返回text部分的位置信息
  // 开始信息
  const start = getCursor(context)
  // 删除掉text的内容，并返回。更新context位置信息
  const content = parseTextData(context, endIndex)

  // 3. 返回文本对象 (类型、内容、位置信息)
  return {
    type: NodeTypes.TEXT, // 文本
    content,
    // 文本的位置信息 开始和结束（开始的已记录，source已经截取完，结束位置就是当前位置）
    loc: getSelection(context, start)
  }
}

// parse 文本部分
function parseTextData(context, length) {
  const rawText = context.source.slice(0, length)
  // 更新上下文
  advanceBy(context, length)
  return rawText
}

/**
 * 更新context操作
 * 截取source，更新context位置信息
 */
function advanceBy(context, numberOfCharacters) {
  let { source } = context
  // 更新context位置
  advancePositionWithMutation(context, source, numberOfCharacters)
  context.source = source.slice(numberOfCharacters)
}

// 获取截取的位置信息
function getSelection(context, start, end?) {
  // 已经做过截取操作，现在的开始就是之前的结束
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}

// 获取位置
function getCursor(context) {
  const { line, column, offset } = context
  return { line, column, offset }
}

// 是否解析完毕
function isEnd(context) {
  return !context.source
}
