import { createDep, Dep } from "./dep";

/**
 * v effect 监听函数中，多次触发相同getter，只收集一次
 * v effect 避免递归执行
 * v effect返回runner函数，支持手动触发监听函数
 * v effect传入一个runner，会重新包装，触发两次
 * v effect stop功能，支持在运行中延迟触发和运行后触发
 * x 分支的处理
 * x shouldTrack
 * x trigger 中 key 为特殊属性的处理
 * x 嵌套effect 外层不会收集内层依赖，内层也不会收集外层依赖。
 * x effect 传递参数
 *
 * 如何保证多次修改只触发一次。（延迟更新）
 *
 */

// 存储方式为  WeakMap(target -> Map(key -> dep))
// 使用Set而不是订阅的Dep类，是为了节省性能开销
type KeyToDepMap = Map<any, Dep>;
const targetMap = new WeakMap<any, KeyToDepMap>();

export let activeEffect: ReactiveEffect | undefined;
export class ReactiveEffect {
  active = true; // 用于标识是否被激活，只有激活是才可以被收集和触发
  deps: Dep[] = []; // 用于存储当前effect收集的Dep，Dep中存储的是ReactiveEffect实例
  private deferStop?: boolean; // 延迟清理的标识
  constructor(public fn) {}

  run() {
    // 如果不是被激活的状态(执行过onStop之后)，直接执行监听函数
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

      // 延迟执行stop
      if(this.deferStop) {
        this.stop()
      }
    }
  }

  stop() {
    // 如果运行中执行stop，将等到run函数执行完，延迟执行。
    if (activeEffect === this) {
      this.deferStop = true;
    } else if (this.active) {
      // 是否是激活状态
      cleanupEffect(this)

      // 置为未激活状态
      this.active = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  const {deps} = effect;
  if (deps.length) {
    // 双向存储的好处，这里循环的是所有依赖了当前effect的 Dep。
    for (let i = 0; i < deps.length; i++) {
      // 在Dep集合中删除掉对于当前effect的依赖。
      deps[i].delete(effect)
    }
    // 清空deps
    deps.length = 0;
  }
}

export interface ReactiveEffectRunner<T = any> {
  (): T;
  effect: ReactiveEffect;
}

export function effect<T = any>(
  fn: () => T
): ReactiveEffectRunner {
  // 如果effect传入的是一个runner，使用runner上的ReactiveEffect实例上的fn
  // 这样会重新创建ReactiveEffect对象 这样监听函数会触发两次。（否则执行的是上次的run方法）
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn;
  }
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
export function trackEffects(dep: Dep) {
  // Set中没有才执行插入动作
  if (!dep.has(activeEffect!)) {
    dep.add(activeEffect!); // ! 为TS非空断言
    // 双向引用
    activeEffect!.deps.push(dep);
  }
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
export function triggerEffects(dep: Dep) {
  // 统一为数组类型
  const effects = Array.isArray(dep) ? dep : [...dep];
  for (const effect of effects) {
    triggerEffect(effect);
  }
}

function triggerEffect(effect: ReactiveEffect) {
  // 处理递归引用，造成栈溢出的解决方式。
  // 当effect传入的监听函数中，有修改proxy的属性值时，会造成循环调用自身run方法的问题。
  // effect() -> run() -> fn() -> 更改属性触发trigger() -> run() -> fn()  造成循环调用
  // 所以必须判断，触发的监听函数不能是当前正激活的activeEffect
  if (effect !== activeEffect) {
    effect.run();
  }
}
