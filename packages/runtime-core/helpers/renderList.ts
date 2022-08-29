import { isArray, isNumber, isObject, isString } from '@vue/shared'

/**
 * v-for 的 渲染
 * @param source 数据
 * @param renderItem item fn
 */
export function renderList(source, renderItem) {
  let ret
  // 判断source类型，执行renderItem
  if (isArray(source) || isString(source)) {
    ret = new Array(source.length)
    for (let i = 0; i < source.length; i++) {
      ret[i] = renderItem(source[i], i)
    }
  } else if (isNumber(source) && !isNaN(source)) {
    ret = new Array(source)
    for (let i = 0; i < source; i++) {
      ret[i] = renderItem(i + 1, i)
    }
  } else if (isObject(source)) {
    // 可被遍历
    if (source[Symbol.iterator as any]) {
      ret = Array.from(source as Iterable<any>, (v, i) => {
        renderItem(v, i)
      })
    } else {
      // 普通对象 k,v,i
      let keys = Object.keys(source)
      let ret = new Array(keys.length)
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        ret[i] = renderItem(k, source[k], i)
      }
    }
  }

  return ret
}
