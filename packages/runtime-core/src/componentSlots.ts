import { isArray, isFunction, ShapeFlags } from '@vue/shared'
import { normalizeVNode } from './vnode'

/**
 * 初始化slots
 * 1. children为对象是时，是slots
 * 2. 将children 规范化之后，赋值给instance.slots
 */
export function initSlots(instance, children) {
  // 如果是slots类型
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // 规范化 对象slots
    normalizeObjectSlots(children, (instance.slots = {}), instance)
  }
}

// 更新slots
export function updateSlots(instance, children, optimized) {
  const { vnode, slots } = instance
  // 是否需要删除
  let needDeletionCheck = true

  // 是slots
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // $stable hint
    needDeletionCheck = !(children as any).$stable
    // 规范化
    normalizeObjectSlots(children, slots, instance)
  }

  // 删除无用的slot
  if (needDeletionCheck) {
    for (const key in slots) {
      if (!(key in children)) {
        delete slots[key]
      }
    }
  }
}

// 特殊属性 _开头 或者 $stable
const isInternalKey = (key) => key[0] === '_' && key === '$stable'

function normalizeObjectSlots(rawSlots, slots, instance) {
  for (const key in rawSlots) {
    // 过滤特殊属性
    if (isInternalKey(key)) continue

    const value = rawSlots[key]

    // slot 传入的是个函数 返回vnode
    if (isFunction(value)) {
      // 规范化
      // TODO 执行上下文的注入
      slots[key] = (props) => normalizeSlotValue(value(props))
    } else {
      // 使支持，string、number 等等类型

      const nomalized = normalizeSlotValue(value)
      // 使用时是按照函数方式调用的，必须用函数包裹
      slots[key] = () => nomalized
    }
  }
}

// 规范化 slot 值。调用 normalizeVNode，规范化VNode。
// 返回的都是数组 支持多个元素
const normalizeSlotValue = (value) =>
  isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)]
