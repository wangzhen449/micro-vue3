import { isString } from '@vue/shared'
import { generate } from './codegen'
import { parse } from './parse'
import { transform } from './transform'
import { transformElement } from './transform/transformElement'
import { transformExpression } from './transform/transformExpression'
import { transformText } from './transform/transformText'

/**
 * 1. parse 将模板转换为抽象语法树
 * 2. transform 预处理抽象语法树
 * 3. generate 将抽象语法树转换为真是代码
 */
export function compile(template) {
  // parse
  const ast = isString(template) ? parse(template) : template

  // transform
  const nodeTransform = [transformExpression, transformElement, transformText]
  transform(ast, { nodeTransform: nodeTransform })
  console.log('🚀 ~ file: compile.ts ~ line 19 ~ compile ~ ast', ast)

  // generate
  return generate(ast)
}
