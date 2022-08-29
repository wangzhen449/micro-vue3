// 更新context位置信息
export function advancePositionWithMutation(pos, source, numberOfCharacters) {
  // 所占行数
  let linesCount = 0
  // 最后一个换行的结尾位置
  let lastNewLinePos = -1
  for (let i = 0; i < numberOfCharacters; i++) {
    // 如果遇到换行符（\n 的 Unicode 码为10）
    // 源码中使用charCodeAt，codePointAt新增了对于4个字节字符的支持。在这里只判断换行符，都一样
    if (source.codePointAt(i) === 10) {
      // 增加行数
      linesCount++
      // 最后一个换行的结尾位置
      lastNewLinePos = i
    }
  }

  pos.offset += numberOfCharacters // 偏移量
  pos.line += linesCount // 行数
  pos.column = lastNewLinePos === -1
    ? pos.column + numberOfCharacters
    : numberOfCharacters - lastNewLinePos // 所有位数 减去 最后一个换行结尾位置，就是column
}