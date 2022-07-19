import { createDep, Dep } from "./dep";

// 存储方式为  WeakMap(target -> Map(key -> dep))
// 使用Set而不是订阅的Dep类，是为了节省性能开销
type KeyToDepMap = Map<any, Dep>;
const targetMap = new WeakMap<any, KeyToDepMap>();

export let activeEffect: ReactiveEffect | undefined;
export class ReactiveEffect {
  active = true; // 用于标识是否被激活
  deps: Dep[] = []; // 用于存储当前effect收集的Dep
  constructor(public fn) {}

  run() {
    // 如果不是被激活的状态，直接执行监听函数
    if (!this.active) {
      this.fn();
    }

    try {
      // 当前effet，可被依赖收集
      activeEffect = this;
      // 先执行一次
      return this.fn();
    } finally {
      // 依赖收集完成
      activeEffect = undefined;
    }
  }

  stop() {}
}

export interface ReactiveEffectRunner<T = any> {
  (): T;
  effect: ReactiveEffect;
}

export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  // 首先执行一次，收集依赖
  _effect.run();

  // 存储监听函数并返回，返回的监听函数可以供随时调用。
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
  runner.effect = _effect;
  return runner;
}

// 收集
export function track(target: object, key: unknown) {
  // 如果有可被收集的依赖
  if (activeEffect) {
    // 存储方式 WeakMap(target -> Map(key -> dep)) dep中存储的为ReactiveEffect对象
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = createDep()));
    }

    trackEffects(dep);
  }
}
function trackEffects(dep: Dep) {
  dep.add(activeEffect!); // ! 为TS非空断言
  activeEffect!.deps.push(dep);
}

// 触发
export function trigger(target: object, key?: unknown, value?: unknown) {
  const depsMap = targetMap.get(target);
  // 如果没有被收集过，直接退出
  if (!depsMap) return;

  let deps: (Dep | undefined)[] = [];

  // 不使用undefined的原因是，有些浏览器对于undefined不是保留字或关键字，可对其进行修改。而void 0返回的是纯正的undefined
  // 如果key有值，将获取到的dep放入到deps中。
  if (key !== void 0) {
    deps.push(depsMap.get(key));
  }

  if (deps.length === 1) {
    triggerEffects(deps[0]);
  }
}
function triggerEffects(dep: Dep) {
  // 统一为数组类型
  const effects = Array.isArray(dep) ? dep : [...dep];
  for (const effect of effects) {
    triggerEffect(effect);
  }
}

function triggerEffect(effect: ReactiveEffect) {
  effect.run();
}
