import { NOOP, ShapeFlags } from '@vue/shared';
import { Component, VNode } from './vnode';
import { PublicInstanceProxyHandlers } from './componentPublicInstance'
import { applyOptions } from './componentOptions';
import { initProps } from './componentProps';

let uid = 0

export function createComponentInstance(vnode: VNode) {
  const { type } = vnode
  const instance = {
    uid: uid++,
    type,
    vnode,
    next: null, // 记录n2
    subTree: null, // 渲染组件的内容
    accessCache: null, //代理访问缓存
    isMounted: false, // 是否挂载
    effect: null,
    ctx: {},
    render: null,
    proxy: null,

    propsOptions: [(type as Component).props],
    props: {},
    attrs: {}
  }

  instance.ctx = {
    _: instance
  }

  return instance
}

// 基于对象 options 方式创建的，属于 stateful 组件。还有一种是函数类型的
export function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}

export function setupComponent(instance) {
  const { props } = instance.vnode
  // 是否是 stateful 组件
  const isStateful = isStatefulComponent(instance)

  // 处理props 和 attr
  initProps(instance, props, isStateful)

  // stateful 组件 调用setupStatefulComponent
  const setupResult = isStateful ? setupStatefulComponent(instance) : undefined
  return setupResult
}

function setupStatefulComponent(instance) {
  // type中就是组件的参数
  const Component = instance.type
  // 代理属性访问缓存
  instance.accessCache = Object.create(null)
  // 代理 实际代理的是 {_: instance}
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)

  const { setup } = Component
  if (setup) {

  } else {
    finishComponentSetup(instance)
  }
}

function finishComponentSetup(instance) {
  const Component = instance.type
  // 处理 render
  if (!instance.render) {
    // TODO compiler部分

    // 设置组件实例的render
    instance.render = (Component.render || NOOP)
  }

  // 兼容 vue2
  // 当前只处理了data
  applyOptions(instance)
}