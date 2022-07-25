
// 参数 RendererOptions<HostNode, HostElement>
export const createRenderer = (options) => {
  let render = (vnode, container) => {}
  let createApp = () => {}
  return {
    render,
    createApp
  }
}