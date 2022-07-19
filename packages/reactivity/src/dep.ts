export type Dep = Set<any>;
// 使用Set存储唯一的effect
export function createDep(effetcs?) {
  const dep = new Set(effetcs);
  return dep;
}
