export const FRAGMENT = Symbol('Fragment')
export const TO_DISPLAY_STRING = Symbol('toDisplayString')
export const CREATE_TEXT = Symbol('createTextVNode')
export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')
export const OPEN_BLOCK = Symbol('openBlock')
export const CREATE_ELEMENT_BLOCK = Symbol('createElementBlock')

export const helperNameMap = {
  [FRAGMENT]: 'Fragment',
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_TEXT]: 'createTextVNode',
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
  [OPEN_BLOCK]: 'openBlock',
  [CREATE_ELEMENT_BLOCK]: 'createElementBlock',
}
