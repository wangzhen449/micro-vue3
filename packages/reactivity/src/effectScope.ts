import { ReactiveEffect, effect } from './effect'

export let activeEffectScope
export class EffectScope {
  active = true // 激活标识
  effects = [] // effect集合
  scopes // 子scope集合
  parent // 父scope
  index // 当前所在scopes的下标
  constructor(detached = false) {
    // 分离标识 如果为true的话，就不会记录到parent中，也就不会被父scope stop掉
    // 如果不分离，并且当前有 activeEffectScope，说明当前是子EffectScope
    if (!detached && activeEffectScope) {
      // 当前parent
      this.parent = activeEffectScope
      // push返回数组的新长度，所以这里返回的是scopes的最后一位下标 length - 1。巧妙
      this.index =
        // parent中收集 当前scope
        (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
          this
        ) - 1
    }
  }
  run(fn) {
    if (this.active) {
      const currentEffectScope = activeEffectScope
      try {
        activeEffectScope = this
        return fn()
      } finally {
        activeEffectScope = currentEffectScope
      }
    }
  }

  stop() {
    if (this.active) {
      for (let i = 0; i < this.effects.length; i++) {
        this.effects[i].stop()
      }
      // 如果有子scope， 子scope也stop掉，实际调用的就是当前的stop方法
      if (this.scopes) {
        for (let i = 0; i < this.scopes.length; i++) {
          this.scopes[i].stop()
        }
      }
      // 解除父子绑定，避免内存溢出
      if (this.parent) {
        // 将按照scopes的下标，从前向后执行

        // 1. 传统做法 O(n)，需要从头到尾移动位置
        // this.scopes.splice(this.index, 1)

        /**
         * 2. 取出最后一个替换当前位置，也就是当数组执行到中位数是，数组后面已经对折到了数组前面。因此复杂度O(1)。
         * 0 1 2 3 4
         * 4 1 2 3
         * 4 3 2
         * 4 3
         * 4
         * 删除顺序还是从第一个到最后一个，巧妙
         */
        let last = this.parent.scopes.pop()
        if (last && last !== this) {
          this.parent.scopes[this.index] = last
          last.index = this.index
        }
      }
      this.active = false
    }
  }
}

export function effectScope(detached?) {
  return new EffectScope(detached)
}

// scope 收集 effect
export function recordEffectScope(effect, scope = activeEffectScope) {
  if (scope && scope.active) {
    scope.effects.push(effect)
  }
}
