/**
 * patchStyle 值有两种情况，一种是字符串(cssText)，一种是对象
 */
import { isString } from '@vue/shared'

type String = string | Record<string, string> | null

export function patchStyle(el: Element, prev: String, next: String) {
  const style = (el as HTMLElement).style
  const isCssString = isString(next)
  // 对象，新增、修改、删除
  if (next && !isCssString) {
    // 新增、修改
    for (const key in next) {
      setStyle(style, key, next[key])
    }

    // 删除
    if (prev && !isString(prev)) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  } else {
    if (isCssString) {
      // 直接替换cssText
      if (prev !== next) {
        style.cssText = next
      }
    } else if (prev) {
      // 清空
      el.removeAttribute('style')
    }
  }
}

function setStyle(style: CSSStyleDeclaration, name: string, val: string) {
  // TODO 转驼峰
  if (name in style) {
    style[name] = val
  }
}
