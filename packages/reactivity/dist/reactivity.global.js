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
    computed: () => computed,
    effect: () => effect,
    isReactive: () => isReactive,
    isRef: () => isRef,
    reactive: () => reactive,
    reactiveMap: () => reactiveMap,
    ref: () => ref,
    toRaw: () => toRaw,
    toReactive: () => toReactive,
    track: () => track,
    trackEffects: () => trackEffects,
    trackRefValue: () => trackRefValue,
    trigger: () => trigger,
    triggerEffects: () => triggerEffects,
    triggerRef: () => triggerRef,
    triggerRefValue: () => triggerRefValue,
    unRef: () => unRef
  });

  // packages/shared/src/index.ts
  var isArray = Array.isArray;
  var isObject = (value) => typeof value === "object" && value !== null;
  var isFunction = (value) => typeof value === "function";
  var hasChanged = (value, oldValue) => !Object.is(value, oldValue);
  var NOOP = () => {
  };
  var extend = Object.assign;

  // packages/reactivity/src/dep.ts
  function createDep(effetcs) {
    const dep = new Set(effetcs);
    return dep;
  }

  // packages/reactivity/src/effect.ts
  var targetMap = /* @__PURE__ */ new WeakMap();
  var activeEffect;
  var ReactiveEffect = class {
    constructor(fn, scheduler = null) {
      this.fn = fn;
      this.scheduler = scheduler;
      this.active = true;
      this.deps = [];
      this.parent = void 0;
    }
    run() {
      if (!this.active) {
        this.fn();
      }
      try {
        this.parent = activeEffect;
        activeEffect = this;
        return this.fn();
      } finally {
        activeEffect = this.parent;
        this.parent = void 0;
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
  function effect(fn, options) {
    if (fn.effect) {
      fn = fn.effect.fn;
    }
    const _effect = new ReactiveEffect(fn);
    if (options) {
      extend(_effect, options);
    }
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
      if (effect2.scheduler) {
        effect2.scheduler();
      } else {
        effect2.run();
      }
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
    return function get2(target, key, receiver) {
      if (key === "__v_isReactive" /* IS_REACTIVE */) {
        return true;
      } else if (key === "__v_raw" /* RAW */ && receiver === reactiveMap.get(target)) {
        return target;
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
      const oldValue = target[key];
      const result = Reflect.set(target, key, value);
      if (hasChanged(value, oldValue)) {
        trigger(target, key, value);
      }
      return result;
    };
  }

  // packages/reactivity/src/reactive.ts
  var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
    ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags2["RAW"] = "__v_raw";
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
  function toRaw(observed) {
    return observed && observed["__v_raw" /* RAW */] || observed;
  }
  var toReactive = (value) => isObject(value) ? reactive(value) : value;

  // packages/reactivity/src/ref.ts
  function trackRefValue(ref2) {
    if (activeEffect) {
      ref2 = toRaw(ref2);
      trackEffects(ref2.dep || (ref2.dep = createDep()));
    }
  }
  function triggerRefValue(ref2) {
    ref2 = toRaw(ref2);
    if (ref2.dep) {
      triggerEffects(ref2.dep);
    }
  }
  function isRef(r) {
    return !!(r && r.__v_isRef === true);
  }
  function ref(value) {
    return createRef(value);
  }
  function createRef(rawValue) {
    if (isRef(rawValue)) {
      return rawValue;
    } else {
      return new RefImpl(rawValue);
    }
  }
  var RefImpl = class {
    constructor(value) {
      this.dep = void 0;
      this.__v_isRef = true;
      this._rawValue = toRaw(value);
      this._value = toReactive(value);
    }
    get value() {
      trackRefValue(this);
      return this._value;
    }
    set value(newVal) {
      newVal = toRaw(newVal);
      if (hasChanged(newVal, this._rawValue)) {
        this._rawValue = newVal;
        this._value = toReactive(newVal);
        triggerRefValue(this);
      }
    }
  };
  function triggerRef(ref2) {
    triggerRefValue(ref2);
  }
  function unRef(ref2) {
    return isRef(ref2) ? ref2.value : ref2;
  }

  // packages/reactivity/src/computed.ts
  var ComputedImpl = class {
    constructor(getters, _setter) {
      this._setter = _setter;
      this.dep = void 0;
      this.__v_isRef = true;
      this._dirty = true;
      this.effect = new ReactiveEffect(getters, () => {
        if (!this._dirty) {
          this._dirty = true;
          triggerRefValue(this);
        }
      });
    }
    get value() {
      trackRefValue(this);
      if (this._dirty) {
        this._dirty = false;
        this._value = this.effect.run();
      }
      return this._value;
    }
    set value(newValue) {
      this._setter(newValue);
    }
  };
  function computed(getterOrOptions) {
    let getter;
    let setter;
    const onlyGetter = isFunction(getterOrOptions);
    if (onlyGetter) {
      getter = getterOrOptions;
      setter = NOOP;
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    const cRef = new ComputedImpl(getter, setter);
    return cRef;
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=reactivity.global.js.map
