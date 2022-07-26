// DOM相关的 创建、修改、删除、插入等方法.

export const nodeOps = {
  // 插入方法
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },

  // 删除方法
  remove: (child) => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },

  // 创建节点
  createElement: (tag): Element => {
    const el = document.createElement(tag)
    return el
  },
  // 创建文本
  createText: (text) => document.createTextNode(text),

  // 设置文本节点内容
  setText: (node, text) => {
    node.nodeValue = text
  },

  // 设置节点中的文本内容
  setElementText: (el, text) => {
    el.textContent = text
  },

  // 父元素
  parentNode: node => node.parentNode,

  // 下一个兄弟元素
  nextSibling: node => node.nextSibling
}
