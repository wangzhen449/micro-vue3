import { isString } from '@vue/shared'
import { parse } from './parse'

export function transform(ast) {}

export function generate(ast) {}

/**
 * 1. parse 将模板转换为抽象语法树
 * 2. transform 预处理抽象语法树
 * 3. generate 将抽象语法树转换为真是代码
 */
export function compile(template) {
  // parse
  const ast = isString(template) ? parse(template) : template
  console.log('🚀 ~ file: compile.ts ~ line 19 ~ compile ~ ast', ast)
  // transform
  transform(ast)
  // generate
  return generate(ast)
}
