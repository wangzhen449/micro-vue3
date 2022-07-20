var VueReactivity = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/reactivity/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    ReactiveEffect: () => ReactiveEffect,
    ReactiveFlags: () => ReactiveFlags,
    activeEffect: () => activeEffect,
    effect: () => effect,
    isReactive: () => isReactive,
    reactive: () => reactive,
    track: () => track,
    trigger: () => trigger
  });

  // packages/shared/src/index.ts
  var isObject = (value) => {
    return typeof value === "object" && value !== null;
  };

  // packages/reactivity/src/dep.ts
  function createDep(effetcs) {
    const dep = new Set(effetcs);
    return dep;
  }

  // packages/reactivity/src/effect.ts
  var targetMap = /* @__PURE__ */ new WeakMap();
  var activeEffect;
  var ReactiveEffect = class {
    constructor(fn) {
      this.fn = fn;
      this.active = true;
      this.deps = [];
    }
    run() {
      if (!this.active) {
        this.fn();
      }
      try {
        activeEffect = this;
        return this.fn();
      } finally {
        activeEffect = void 0;
        if (this.deferStop) {
          this.stop();
        }
      }
    }
    stop() {
      if (activeEffect === this) {
        this.deferStop = true;
      } else if (this.active) {
        cleanupEffect(this);
        this.active = false;
      }
    }
  };
  function cleanupEffect(effect2) {
    const { deps } = effect2;
    if (deps.length) {
      for (let i = 0; i < deps.length; i++) {
        deps[i].delete(effect2);
      }
      deps.length = 0;
    }
  }
  function effect(fn) {
    if (fn.effect) {
      fn = fn.effect.fn;
    }
    const _effect = new ReactiveEffect(fn);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
  }
  function track(target, key) {
    if (activeEffect) {
      let depsMap = targetMap.get(target);
      if (!depsMap) {
        targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
      }
      let dep = depsMap.get(key);
      if (!dep) {
        depsMap.set(key, dep = createDep());
      }
      trackEffects(dep);
    }
  }
  function trackEffects(dep) {
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.push(dep);
    }
  }
  function trigger(target, key, value) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
      return;
    let deps = [];
    if (key !== void 0) {
      deps.push(depsMap.get(key));
    }
    if (deps.length === 1) {
      triggerEffects(deps[0]);
    }
  }
  function triggerEffects(dep) {
    const effects = Array.isArray(dep) ? dep : [...dep];
    for (const effect2 of effects) {
      triggerEffect(effect2);
    }
  }
  function triggerEffect(effect2) {
    if (effect2 !== activeEffect) {
      effect2.run();
    }
  }

  // packages/reactivity/src/baseHandlers.ts
  var get = createGetter();
  var set = createSetter();
  var mutableHandlers = {
    get,
    set
  };
  function createGetter() {
    return function get2(target, key) {
      if (key === "__v_isReactive" /* IS_REACTIVE */) {
        return true;
      }
      const res = Reflect.get(target, key);
      track(target, key);
      if (isObject(res)) {
        return reactive(res);
      }
      return res;
    };
  }
  function createSetter() {
    return function set2(target, key, value) {
      const result = Reflect.set(target, key, value);
      trigger(target, key, value);
      return result;
    };
  }

  // packages/reactivity/src/reactive.ts
  var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
    ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
    return ReactiveFlags2;
  })(ReactiveFlags || {});
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  function reactive(target) {
    return createReactive(target, mutableHandlers, reactiveMap);
  }
  function createReactive(target, baseHandlers, proxyMap) {
    if (!isObject(target)) {
      return target;
    }
    if (target["__v_isReactive" /* IS_REACTIVE */]) {
      return target;
    }
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
      return existingProxy;
    }
    const proxy = new Proxy(target, baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
  }
  function isReactive(value) {
    return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=reactivity.global.js.map
