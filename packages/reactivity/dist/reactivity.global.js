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
    EffectScope: () => EffectScope,
    ReactiveEffect: () => ReactiveEffect,
    ReactiveFlags: () => ReactiveFlags,
    activeEffect: () => activeEffect,
    activeEffectScope: () => activeEffectScope,
    computed: () => computed,
    effect: () => effect,
    effectScope: () => effectScope,
    isReactive: () => isReactive,
    isRef: () => isRef,
    isShallow: () => isShallow,
    proxyRefs: () => proxyRefs,
    reactive: () => reactive,
    reactiveMap: () => reactiveMap,
    recordEffectScope: () => recordEffectScope,
    ref: () => ref,
    shallowReactive: () => shallowReactive,
    shallowReactiveMap: () => shallowReactiveMap,
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

  // packages/reactivity/src/effectScope.ts
  var activeEffectScope;
  var EffectScope = class {
    constructor(detached = false) {
      this.active = true;
      this.effects = [];
      if (!detached && activeEffectScope) {
        this.parent = activeEffectScope;
        this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1;
      }
    }
    run(fn) {
      if (this.active) {
        const currentEffectScope = activeEffectScope;
        try {
          activeEffectScope = this;
          return fn();
        } finally {
          activeEffectScope = currentEffectScope;
        }
      }
    }
    stop() {
      if (this.active) {
        for (let i = 0; i < this.effects.length; i++) {
          this.effects[i].stop();
        }
        if (this.scopes) {
          for (let i = 0; i < this.scopes.length; i++) {
            this.scopes[i].stop();
          }
        }
        if (this.parent) {
          let last = this.parent.scopes.pop();
          if (last && last !== this) {
            this.parent.scopes[this.index] = last;
            last.index = this.index;
          }
        }
        this.active = false;
      }
    }
  };
  function effectScope(detached) {
    return new EffectScope(detached);
  }
  function recordEffectScope(effect2, scope = activeEffectScope) {
    if (scope && scope.active) {
      scope.effects.push(effect2);
    }
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
      recordEffectScope(this);
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
  var shallowGet = createGetter(true);
  function createGetter(shallow = false) {
    return function get2(target, key, receiver) {
      if (key === "__v_isReactive" /* IS_REACTIVE */) {
        return true;
      } else if (key === "__v_isShallow" /* IS_SHALLOW */) {
        return shallow;
      } else if (key === "__v_raw" /* RAW */ && receiver === (shallow ? shallowReactiveMap : reactiveMap).get(target)) {
        return target;
      }
      const res = Reflect.get(target, key);
      track(target, key);
      if (shallow) {
        return res;
      }
      if (isObject(res)) {
        return reactive(res);
      }
      return res;
    };
  }
  var set = createSetter();
  var shallowSet = createSetter(true);
  function createSetter(shallow = false) {
    return function set2(target, key, value) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value);
      if (hasChanged(value, oldValue)) {
        trigger(target, key, value);
      }
      return result;
    };
  }
  var mutableHandlers = {
    get,
    set
  };
  var shallowReactiveHandlers = extend({}, mutableHandlers, {
    get: shallowGet,
    set: shallowSet
  });

  // packages/reactivity/src/reactive.ts
  var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
    ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags2["IS_SHALLOW"] = "__v_isShallow";
    ReactiveFlags2["RAW"] = "__v_raw";
    return ReactiveFlags2;
  })(ReactiveFlags || {});
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
  function reactive(target) {
    return createReactiveObject(target, mutableHandlers, reactiveMap);
  }
  function shallowReactive(target) {
    return createReactiveObject(target, shallowReactiveHandlers, shallowReactiveMap);
  }
  function createReactiveObject(target, baseHandlers, proxyMap) {
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
  function isShallow(value) {
    return !!(value && value["__v_isShallow" /* IS_SHALLOW */]);
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
  var shallowUnwrapHandlers = {
    get: (target, key, receiver) => {
      return unRef(Reflect.get(target, key, receiver));
    },
    set: (target, key, value, receiver) => {
      const oldValue = target[key];
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  };
  function proxyRefs(objectWithRefs) {
    return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
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
