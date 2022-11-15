import { isFunction, isObject } from "@vue/shared"
import { createVNode } from "./vnode"

export function createAppContext() {
  return {
    app: null,
    mixins: [],
    components: {},
    directives: {}
  }
}

export function createAppAPI(render) {
  return function createApp(rootComponent, rootProps = null) {
    // 组件不是函数
    if (!isFunction(rootComponent)) {
      rootComponent = {...rootComponent}
    }

    // 只能是对象 或者 null
    if (rootProps != null && !isObject(rootProps)) {
      rootProps = null
    }

    // 上下文
    const context = createAppContext()
    // 已安装的插件
    const installedPliguns = new Set()

    let isMounted = false

    const app = (context.app = {
      _component: rootComponent, // 根组件
      _container: null, // 容器

      use(plugin, ...options) {
        if (installedPliguns.has(plugin)) {
          console.warn('plugin has')
        } else if (plugin && isFunction(plugin.install)) {
          // 函数 plugin.install
          installedPliguns.add(plugin)
          plugin.install(app, ...options)
        } else if (isFunction(plugin)) {
          // 函数 plugin
          installedPliguns.add(plugin)
          plugin(app, ...options)
        }

        // 所有方法都返回app 链式调用的关键
        return app
      },

      mixin(mixin) {
        if (!context.mixins.includes(mixin)) {
          context.mixins.push(mixin)
        }

        return app
      },

      component(name, component?) {
        // 获取组件
        if (!component) {
          return context.components[name]
        }
        // 设置组件
        context.components[name] = component

        return app
      },

      directive(name, directive) {
        if (!directive) {
          return context.directives[name]
        }

        context.directives[name] = directive

        return app
      },

      // 挂载
      mount(rootContainer) {
        // 未挂载
        if (!isMounted) {
          const vnode = createVNode(rootComponent, rootProps)

          // 根vnode绑定app实例
          vnode.appContext = context

          // 挂载
          render(vnode, rootContainer)
          app._container = rootContainer

          isMounted = true
        }
      },

      unmount() {
        // 卸载
        if (isMounted) {
          render(null, app._container)
        }
      }
    })

    return app
  }
}
