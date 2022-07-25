/**
 * v 定义与浏览器相关的rendererOptions
 * v 通过rendererOptions生成浏览器平台相关的渲染器，实现核心功能与平台的解耦
 * v 暴露两个方法：render和createApp
 *    createRender(rendererOptions).render(h('div',1), dom)
 *    createRender(rendererOptions).createApp(component).mount(dom)
 */
import { createRenderer } from '@vue/runtime-core'
import { extend } from '@vue/shared'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

// 浏览器相关的配置
const rendererOptions = extend(nodeOps, { patchProp })

let renderer
// 创建渲染器 重复调用不会重复创建
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

// 暴露的render函数
export const render = (...args) => {
  ensureRenderer().render(...args)
}

export const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args);
  // 重写mount方法
  app.mount = () => {}
  return app
}

export * from '@vue/runtime-core'
