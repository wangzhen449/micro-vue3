import { ReactiveEffect } from './effect';
export type Dep = Set<ReactiveEffect>;

// 使用Set存储唯一的effect
export function createDep(effetcs?: ReactiveEffect[]): Dep {
  const dep = new Set<ReactiveEffect>(effetcs) as Dep;
  return dep;
}
