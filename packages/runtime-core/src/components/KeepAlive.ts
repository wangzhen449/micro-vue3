// keepAlive 使用缓存的方式，将虚拟dom和真实dom进行缓存，切换的时候，直接从缓存中读取

import { isArray, isString, ShapeFlags } from '@vue/shared'
import { onBeforeMount, onMounted, onUpdated } from '../apiLifecycle';
import { getCurrentInstance } from '../component'
import { isVNode } from '../vnode'

export const isKeepAlive = (vnode) => vnode.type.__isKeepAlive

// KeepAlive
const KeepAliveImpl = {
  __isKeepAlive: true,
  props: {
    // 可以缓存的组件 不可以缓存的组件; 通过组件名识别，支持逗号分隔的字符串、数组、正则
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, RegExp, Array], // 最大缓存数量 使用LRU缓存淘汰算法
  },
  // vnode的children是对象的时候，组件就会按照slots来处理，所以这里的 slots 是children。
  setup(props, { slots }) {
    const instance = getCurrentInstance()

    // 通过ctx在组件实例上添加操作方法，供这里使用。并添加拦截方法，在subTree在挂载和卸载的时候进行拦截。
    const shareContext = instance.ctx

    const cache = new Map() // 缓存组件容器
    const keys = new Set() // key 容器
    let current = null // 记录当前vnode

    const {
      renderer: {
        p: patch,
        m: move,
        um: _unmount,
        o: { createElement }
      }
    } = shareContext
    // 创建缓存dom的容器
    const storageContainer = createElement('div')

    /**
     * keepAlive就是靠下面两个方法
     * 在组件卸载 unmount时进行拦截，使用deactivate，缓存dom元素
     * 在组件再次 挂载的时候，使用activate，从缓存中取出，挂载组件
     */
    shareContext.activate = (vnode, container, anchor, optimized) => {
      const instance = vnode.component
      move(vnode, container, anchor)
      // 以防属性发生变化，走patch
      patch(
        instance.vnode, // 之前缓存的vnode
        vnode, // 当前的vnode
        container,
        anchor,
        instance, // parentComponent
        optimized
      )
    }
    shareContext.deactivate = (vnode) => {
      // 移到缓存中
      move(vnode, storageContainer)
    }

    // 卸载
    function unmount(vnode) {
      // 改变状态
      resetShapeFlag(vnode)
      // 下载
      _unmount(vnode, instance, true)
    }
    // 删除key对应的缓存
    function pruneCacheEntry(key) {
      const cached = cache.get(key)
      if (!current || cached.type !== current.type) { // 不是当前
        unmount(cached)
      } else if (current) { // 刚好是当前，不能卸载，只能改变状态
        resetShapeFlag(cached)
      }

      // 删除掉缓存
      keys.delete(key)
      cache.delete(key)
    }

    // 缓存key
    let pendingCacheKey = null
    // 缓存subTree
    const cacheSubtree = () => {
      if (pendingCacheKey != null) {
        // mount之后，缓存组件的subTree
        cache.set(pendingCacheKey, instance.subTree)
      }
    }

    // 组件挂载或者更新之后，缓存subTree
    // 更新的时候也需要。之前的组件和更新后的组件，都要缓存
    onMounted(cacheSubtree)
    onUpdated(cacheSubtree)
    // 删除掉所有缓存循环操作，并且判断是否是当前实例
    onBeforeMount(() => {
      cache.forEach(cached => {
        const { subTree } = instance
        const vnode = subTree.vnode
        if (cached.type === vnode.type) { // 是当前，不能卸载，改变状态
          resetShapeFlag(cached)
          return
        }
        unmount(cached)
      })
    })

    // 这就是keepAlive的render
    // 这里的更新走的keepalive自身组件更新
    return () => {
      pendingCacheKey = null
      // 默认会去default中去获取，获取到的是一个数组，而且数组中只能有一个元素
      const children = slots.default()
      const vnode = children[0]

      // 只有带状态的组件（stateful）才会被缓存，其他情况直接返回
      if (!isVNode(vnode) || !(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT)) {
        current = null
        return vnode
      }

      // 组件
      const comp = vnode.type
      const name = comp.name
      console.log("🚀 ~ file: KeepAlive.ts ~ line 129 ~ return ~ name", name)

      const { include, exclude, max } = props

      // 不在include 或在exclude中，不缓存
      if (
        include && (!name || !matches(include, name)) ||
        exclude && name && matches(exclude, name)
      ) {
        current = vnode
        return vnode
      }

      // 键
      const key = vnode.key == null ? comp : vnode.key
      const cacheVNode = cache.get(key)

      // 拿到key
      pendingCacheKey = key

      // 二次进入走缓存
      if (cacheVNode) {
        // 复用 el 和组件实例
        vnode.el = cacheVNode.el
        vnode.component = cacheVNode.component
        // 标记为已缓存的KeepAlive激活态
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE

        // 保持在最新的位置，避免超过限制之后先删掉
        keys.delete(key)
        keys.add(key)
      } else {
        // 首次进入
        keys.add(key)
        // 超过最大限制
        if (max && keys.size > max) {
          // 删掉最久不用的key LRU
          pruneCacheEntry(keys.values().next().value)
        }
        // 这时候还没有虚拟节点，虚拟节点要在组件mount之后才有
      }

      // 标记为是keepAlive组件，卸载时不走unmount逻辑，而是被缓存
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      current = vnode
      // 返回vnode
      return vnode
    }
  }
}

export const KeepAlive = KeepAliveImpl as any as {
  __isKeepAlive: true
}

// 匹配name
function matches(pattern, name) {
  if (isArray(pattern)) { // 数组
    return pattern.some(p => matches(p, name))
  } else if (isString(pattern)) { // 字符串
    return pattern.split(',').includes(name)
  } else if (pattern.test) { // 正则
    return pattern.test(name)
  }
}

// 去掉与keepAlive相关的标识
function resetShapeFlag(vnode) {
  let shapeFlag = vnode.shapeFlag
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  } else if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
  }
  vnode.shapeFlag = shapeFlag
}
