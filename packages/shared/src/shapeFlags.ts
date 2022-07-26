/**
 * 通过位运算的方式能够更好的标识类型或者权限，避免过多的逻辑处理
 * 结合  或运算|  与运算&
 */
export const enum ShapeFlags {
  ELEMENT = 1,                                                                //              1
  FUNCTIONAL_COMPONENT = 1 << 1,                                              //             10
  STATEFUL_COMPONENT = 1 << 2,                                                //            100
  TEXT_CHILDREN = 1 << 3, // vnode children 为 string类型                                   1000
  ARRAY_CHILDREN = 1 << 4, // vnode children 为 数组的类型                                  10000
  SLOTS_CHILDREN = 1 << 5, // vnode children 为 slots类型                                 100000
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT //            110
}
