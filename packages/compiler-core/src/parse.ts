import { createRoot, NodeTypes } from './ast'
import { advancePositionWithMutation } from './utils'

/**
 * 1. 创建parse上下文
 * 2. 获取当前位置
 * 3. parse 并返回ast
 */
export function parse(content) {
  const context = createParserContext(content)
  const start = getCursor(context)

  return createRoot(parseChildren(context), getSelection(context, start))
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
 * 去除空白节点
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

  // 处理空白
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.type === NodeTypes.TEXT) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        // 标记空白
        nodes[i] = null
      }
    }
  }

  return nodes.filter(Boolean)
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

/**
 * parse 元素
 * 1. 处理开始标签
 * 2. 处理标签内部内容，遇到子元素进行递归调用，从而构建抽象语法树
 * 3. 处理结束标签 更新开始到结束的位置
 * 4. 返回 元素对象
 */
function parseElement(context) {
  // 1. 处理开始标签
  const element = parseTag(context, TagType.Start)
  // 自关闭标签
  if (element.isSelfClosing) {
    return element
  }

  // 2. 处理标签内部内容。递归调用
  const children = parseChildren(context)
  // 父节点添加子节点信息
  element.children = children

  // 3. 处理结束标签
  // 如果是结束标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  }
  // element上面保存的还是开始标签的位置。到结束标签之后，需要更新位置到结束标签
  element.loc = getSelection(context, element.loc.start)

  return element
}

const enum TagType {
  Start,
  End
}

/**
 * 处理标签
 * 1. 处理标签open <div </div
 * 2. 处理元素属性
 * 3. 处理标签close > />
 * 4. 返回 元素对象。标签结束无返回 </div>
 */
function parseTag(context, type) {
  // 标签开始
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  // 标签名
  const tag = match[1]
  // 截掉标签名 <div 或 </div
  advanceBy(context, match[0].length)
  advanceSpaces(context)

  // 处理元素属性
  const props = parseAttributes(context, type)

  // 标签结束
  let isSelfClosing = false
  // 自关闭标签
  if (context.source.startsWith('/>')) {
    isSelfClosing = true
  }
  // 截掉 > 或者 />
  advanceBy(context, isSelfClosing ? 2 : 1)

  // 结束标签，直接返回
  if (type === TagType.End) {
    return
  }

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    isSelfClosing,
    children: [],
    loc: getSelection(context, start)
  }
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
 * parse 属性
 * 把所有属性push到props中
 */
function parseAttributes(context, type) {
  if (type === TagType.End) {
    return
  }
  const props = []
  // 循环到标签结束
  while (
    context.source.length > 0 &&
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {
    const attr = parseAttribute(context)

    props.push(attr)

    advanceSpaces(context)
  }

  return props
}

/**
 * parse 属性
 * 1. 属性名
 * 2. 属性值
 */
function parseAttribute(context) {
  // 开始位置
  const start = getCursor(context)
  // 属性名
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]
  // 截取掉name
  advanceBy(context, name.length)

  // 属性值
  let value
  // 有等号
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    // 删除空格
    advanceSpaces(context)
    // 删除等号
    advanceBy(context, 1)
    // 删除空格
    advanceSpaces(context)
    // 解析值
    value = parseAttributeValue(context)
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc
    },
    loc: getSelection(context, start)
  }
}

/**
 * parse 值
 * 1. 有逗号，无逗号暂不考虑
 */
function parseAttributeValue(context) {
  const start = getCursor(context)
  let content

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  if (isQuoted) {
    // 有逗号
    // 删除左逗号
    advanceBy(context, 1)

    // 右逗号位置
    const endIndex = context.source.indexOf(quote)
    // parse 文本，获取内容
    content = parseTextData(context, endIndex)

    // 删除右逗号
    advanceBy(context, 1)
  }

  return {
    content,
    loc: getSelection(context, start)
  }
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

// 删除空格
function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
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
  // 截取完毕，或者遇到结束标签就停止（为了停止递归）
  return !context.source || context.source.startsWith('</')
}

// 结束标签
function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith('</') &&
    // 前后标签名一致
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    // > 结尾
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}
