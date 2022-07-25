/**
 * 事件patch
 * v 传入是数组或者函数的情况
 * v 由于接触绑定时需要传入原函数，所以这里必须存储。
 * v 通过换绑的方式，修改绑定事件时，无需解绑、绑定。
 */
import { isArray } from '@vue/shared'

interface Invoker extends EventListener {
  value: EventValue
}
type EventValue = Function | Function[]

export function patchEvent(
  el: Element & { _vei: Record<string, Invoker | undefined> },
  rawName: string,
  nextValue: EventValue | null
) {
  // 在el上添加_evi 属性，存储所有的 事件调用器
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]
  if (nextValue && existingInvoker) {
    // 修改的逻辑，换绑
    existingInvoker.value = nextValue
  } else {
    // 去掉on开头 转小写，转为真实事件名称
    const name = rawName.slice(2).toLowerCase()
    if (nextValue) {
      // 新增
      const invoker = (invokers[rawName] = createInvoker(nextValue))
      el.addEventListener(name, invoker)
    } else if (existingInvoker) {
      // 接触注册
      el.removeEventListener(name, existingInvoker)
      // 删除掉存储
      invokers[rawName] = undefined
    }
  }
}

// 把数组或者函数放到value中，在event函数中判断
function createInvoker(initialValue: EventValue) {
  const invoker: Invoker = (e: Event) => {
    const value = invoker.value
    if (isArray(value)) {
      value.map((fn) => fn && fn(e))
    } else {
      value(e)
    }
  }
  invoker.value = initialValue
  return invoker
}
