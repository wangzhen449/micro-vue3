/**
 * 针对不同属性，提供不同的patch的方法
 * class
 * style
 * on开头 event
 * 其他属性
 */

import { isOn } from '@vue/shared'
import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'
import { patchEvent } from './modules/events'
import { patchAttr } from './modules/attrs'

export const patchProp = (el, key, prevValue, nextValue) => {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, nextValue)
  } else {
    patchAttr(el, key, nextValue)
  }
}
