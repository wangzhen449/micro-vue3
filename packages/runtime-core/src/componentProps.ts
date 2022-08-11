import { reactive, shallowReactive } from '@vue/reactivity'
import { hasOwn } from '@vue/shared'

/**
 * 初始化props
 * 1. 获取到组件的props属性(vnode.type.props)，获取到用户传入的属性（vnode.props）
 * 2. 用户传入的属性如果在组件的props中找到，就放到组件实例的props，并且调用shallowReactive，浅层代理
 * 3. 如果没有找到的话，放到组件实例的attrs上，没有响应式
 * 4. 组件属性是单向数据流，首先禁止组件更改props，修改props的子属性，由于无响应式，视图也不会更新
 */
export function initProps(instance, rawProps, isStateful) {
  const props = {}
  const attrs = {}

  setFullProps(instance, rawProps, props, attrs)

  if (isStateful) {
    // props 只有最外层是响应式
    instance.props = shallowReactive(props)
  }

  // attrs 无响应式
  instance.attrs = attrs
}

function setFullProps(instance, rawProps, props, attrs) {
  // vnode.type.props 组件的的props
  const [options] = instance.propsOptions

  // rawProps 为用户传入的props（vnode.props）
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (options && hasOwn(options, key)) {
        props[key] = value
      } else {
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value
        }
      }
    }
  }
}
