import { isFunction } from '@vue/shared'

// 定义组件，对函数组件做默认操作
export function defineComponent(options) {
  return isFunction(options) ? {setup: options, name: options.name} : options
}
