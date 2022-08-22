/**
 * 使用位运算的方式。需要patch标记，标记动态部分。patch优化的核心
 */
export const enum PatchFlags {
  TEXT = 1, // 动态 文本节点
  CLASS = 1 << 1, // 动态类名
  STYLE = 1 << 2, // 动态样式属性
  PROPS = 1 << 3, // 除class和style之外的 动态属性(:xxx="xxx")
  FULL_PROPS = 1 << 4, // 动态属性名（:[xxx]="xxx"），(与class、style、props互斥) 需要 full diff
  HYDRATE_EVENTS = 1 << 5, // 有事件监听
  STABLE_FRAGMENT = 1 << 6, // 稳定序列 子元素顺序不变的 Fragment
  KEYED_FRAGMENT = 1 << 7, // 有 key 或部分有 key 的fragment
  UNKEYED_FRAGMENT = 1 << 8, // 无 key fragment
  NEED_PATCH = 1 << 9, // 当使用 ref 或 onVnodeXXX(hooks)等 non-props
  DYNAMIC_SLOTS = 1 << 10, // 动态slot，会被强制更新

  // 下面两个是特殊标识，不进行位运算，只按名称检查
  HOISTED = -1, // 静态提升，静态提升的部分不会被更新
  BAIL = -2 // 差异算法应该退出优化模式（diff算法应该结束）
}