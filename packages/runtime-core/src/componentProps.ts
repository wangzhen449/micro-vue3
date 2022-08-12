import { shallowReactive, toRaw } from '@vue/reactivity'
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

  // 根据用户传入的props 生成props和attrs
  setFullProps(instance, rawProps, props, attrs)

  // 用户未传但是组件接收的props，置为undefined，否则会影响依赖收集
  for (const key in instance.propsOptions[0]) {
    if (!(key in rawProps)) {
      props[key] = undefined
    }
  }

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
      // 用户传入的在options中有，放入props
      if (options && hasOwn(options, key)) {
        props[key] = value
      } else {
        // 用户传入的在options中没有，放入attrs
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value
        }
      }
    }
  }
}

/**
 * 更新props，涉及到props、attrs的新增、修改、删除
 * 传入参数都为props原始对象
 */
export function updateProps(instance, rawProps, rawPrevProps) {
  const { props, attrs } = instance
  // 原始值
  const rawCurrentProps = toRaw(props)
  const [options] = instance.propsOptions

  // 新增及修改
  setFullProps(instance, rawProps, props, attrs)

  // 删除操作
  // 1. props
  // 以前有值现新传的没有，将属性置为undefined。如果组件没有接收props就删除掉
  for (const key in rawCurrentProps) {
    if (!rawProps || !hasOwn(rawProps, key)) {
      if (options) {
        // 之前有值 置为undefined
        if (rawPrevProps && rawPrevProps[key] !== undefined) {
          props[key] = undefined
        }
      } else {
        // 组件没有接收props就删除掉
        delete props[key]
      }
    }
  }

  // 2. attrs
  // 如果没有props，attrs和props就指向了同一个原始对象，这时候已经更新了
  // 如果用户新传入的属性中，有不在attrs中的，就删除掉
  if (attrs !== rawCurrentProps) {
    for (const key in attrs) {
      if (!hasOwn(rawProps, key)) {
        delete attrs[key]
      }
    }
  }
}
