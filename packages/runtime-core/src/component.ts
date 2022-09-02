import { isFunction, isObject, NOOP, ShapeFlags } from '@vue/shared'
import { Component, VNode, isVNode } from './vnode'
import { PublicInstanceProxyHandlers } from './componentPublicInstance'
import { applyOptions } from './componentOptions'
import { initProps } from './componentProps'
import { proxyRefs } from '@vue/reactivity'
import { emit } from './componentEmits'
import { initSlots } from './componentSlots'

export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
  SERVER_PREFETCH = 'sp'
}

let uid = 0

export let currentInstance = null

export function createComponentInstance(vnode: VNode, parent) {
  const { type } = vnode
  const instance = {
    uid: uid++,
    parent,
    type,
    vnode,
    next: null, // 记录n2
    subTree: null, // 渲染组件的内容
    accessCache: null, //代理访问缓存
    effect: null,
    ctx: {},
    render: null,
    proxy: null,

    // 通过链的方式 获取到父组件注册的属性
    provides: parent ? parent.provides : Object.create(null),

    propsOptions: [(type as Component).props],
    props: {},
    attrs: {},

    setupState: {},
    setupContext: null,

    expose: null,
    slots: null,
    emit: null,

    isMounted: false, // 是否挂载
    isUnmounted: false, // 是否已卸载
    bm: null,
    m: null,
    bu: null,
    u: null,
    bum: null,
    um: null,
  }

  instance.ctx = {
    _: instance
  }

  // 柯理化
  instance.emit = emit.bind(null, instance)

  return instance
}

// TODO scope
// TODO pauseTracking resetTracking
// 获取当前激活的组件实例
export const getCurrentInstance = () => currentInstance
// 设置当前激活的组件实例
export const setCurrentInstance = (instance) => {
  currentInstance = instance
}
// 删除当前激活的组件实例
export const unsetCurrentInstance = () => {
  currentInstance = null
}


// 基于对象 options 方式创建的，属于 stateful 组件。还有一种是函数类型的
export function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}

export function setupComponent(instance) {
  const { props, children } = instance.vnode
  // 是否是 stateful 组件
  const isStateful = isStatefulComponent(instance)

  // 处理props 和 attr
  initProps(instance, props, isStateful)
  initSlots(instance, children)

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

  /**
   * 处理 setup
   * 1. setup接收组件传入的props，和执行上下文
   * 2. setup有两种返回方式，一种返回state对象，一种返回render函数
   * 2.1 如果返回state对象，在组件的render函数中，this指向 setup返回的state对象被proxyRefs处理之后的结果。这样render中就不需使用.value
   * 2.2 如果返回的是render函数，将函数赋值给组件的render
   * 3. 问题？？props或外部引起的更新，更新的时候，没有更新setupState，是否会造成潜在的问题
   *
   * 4. 执行上下文包括（attrs、slots、emit、expose）
   * 5. 设置当前激活的组件实例，当组件有setup属性的时候才会设置。没有setup也无需设置
   */
  const { setup } = Component
  if (setup) {
    // setup的执行上下文 如果参数超过1个才设置
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)

    // 设置当前激活的组件实例
    setCurrentInstance(instance)

    // 给setup传入props
    const setupResult = setup(instance.props, setupContext)

    // setup已经执行完，重置currentInstance
    unsetCurrentInstance()

    // 处理setup的返回值是 对象 或 函数 的问题
    handleSetupResult(instance, setupResult)
  } else {
    // 设置render 及其他
    finishComponentSetup(instance)
  }
}

function handleSetupResult(instance, setupResult) {
  // 函数 返回的就是render函数
  if (isFunction(setupResult)) {
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    // 对象 进行proxyRefs处理，render/模板中无需.value
    instance.setupState = proxyRefs(setupResult)
  }

  // 会判断有无render的情况
  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const Component = instance.type
  // 处理 render
  if (!instance.render) {
    // TODO compiler部分

    // 设置组件实例的render
    instance.render = Component.render || NOOP
  }

  // 兼容 vue2
  // 当前只处理了data
  applyOptions(instance)
}

// 创建setup执行上下文
export function createSetupContext(instance) {
  const expose = (expose) => {
    instance.expose = expose || {}
  }
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose
  }
}
