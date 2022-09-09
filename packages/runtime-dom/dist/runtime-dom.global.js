var VueRuntimeDom = (() => {
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

  // packages/runtime-dom/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    Fragment: () => Fragment,
    KeepAlive: () => KeepAlive,
    ReactiveEffect: () => ReactiveEffect,
    ReactiveFlags: () => ReactiveFlags,
    Teleport: () => Teleport,
    TeleportMoveTypes: () => TeleportMoveTypes,
    Text: () => Text,
    activeEffect: () => activeEffect,
    computed: () => computed,
    createApp: () => createApp,
    createElementBlock: () => createElementBlock,
    createElementVNode: () => createBaseVNode,
    createHooks: () => createHooks,
    createRenderer: () => createRenderer,
    defineAsyncComponent: () => defineAsyncComponent,
    effect: () => effect,
    getCurrentInstance: () => getCurrentInstance,
    h: () => h,
    inject: () => inject,
    injectHook: () => injectHook,
    isKeepAlive: () => isKeepAlive,
    isReactive: () => isReactive,
    isRef: () => isRef,
    isShallow: () => isShallow,
    isTeleport: () => isTeleport,
    onBeforeMount: () => onBeforeMount,
    onBeforeUnmount: () => onBeforeUnmount,
    onBeforeUpdate: () => onBeforeUpdate,
    onMounted: () => onMounted,
    onUnmounted: () => onUnmounted,
    onUpdated: () => onUpdated,
    openBlock: () => openBlock,
    provide: () => provide,
    proxyRefs: () => proxyRefs,
    reactive: () => reactive,
    reactiveMap: () => reactiveMap,
    ref: () => ref,
    render: () => render,
    shallowReactive: () => shallowReactive,
    shallowReactiveMap: () => shallowReactiveMap,
    toDisplayString: () => toDisplayString,
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

  // packages/shared/src/toDisplayString.ts
  function toDisplayString(val) {
    return isString(val) ? val : val === null ? "" : isArray(val) || isObject(val) ? JSON.stringify(val && val.__v_isRef ? val.value : val) : String(val);
  }

  // packages/shared/src/index.ts
  var onRE = /^on[^a-z]/;
  var isOn = (key) => onRE.test(key);
  var isArray = Array.isArray;
  var isString = (val) => typeof val === "string";
  var isObject = (value) => typeof value === "object" && value !== null;
  var isFunction = (value) => typeof value === "function";
  var hasChanged = (value, oldValue) => !Object.is(value, oldValue);
  var invokeArrayFns = (fns, arg) => {
    for (let i = 0; i < fns.length; i++) {
      fns[i](arg);
    }
  };
  var NOOP = () => {
  };
  var extend = Object.assign;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = (obj, key) => hasOwnProperty.call(obj, key);
  var capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  var toHandlerKey = (str) => str ? `on${capitalize(str)}` : "";

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

  // packages/runtime-core/src/componentPublicInstance.ts
  var publicPropertiesMap = {
    $attrs: (i) => i.attrs,
    $slots: (i) => i.slots
  };
  var PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
      const { data, props, setupState, attrs, ctx, accessCache } = instance;
      if (key[0] !== "$") {
        const n = accessCache[key];
        if (n !== void 0) {
          switch (n) {
            case 2 /* SETUP */:
              return setupState[key];
            case 0 /* DATA */:
              return data[key];
            case 1 /* PROPS */:
              return props[key];
          }
        } else if (setupState && hasOwn(setupState, key)) {
          accessCache[key] = 2 /* SETUP */;
          return setupState[key];
        } else if (data && hasOwn(data, key)) {
          accessCache[key] = 0 /* DATA */;
          return data[key];
        } else if (props && hasOwn(props, key)) {
          accessCache[key] = 1 /* PROPS */;
          return props[key];
        }
      }
      const publicGetter = publicPropertiesMap[key];
      if (publicGetter) {
        return publicGetter(instance);
      }
    },
    set({ _: instance }, key, value) {
      const { setupState, data, props } = instance;
      if (setupState && hasOwn(setupState, key)) {
        setupState[key] = value;
        return true;
      } else if (data && hasOwn(data, key)) {
        data[key] = value;
        return true;
      } else if (props && hasOwn(props, key)) {
        console.warn("props \u4E0D\u5141\u8BB8\u4FEE\u6539");
        return false;
      }
    }
  };

  // packages/runtime-core/src/componentOptions.ts
  function applyOptions(instance) {
    const options = instance.type;
    const publicThis = instance.proxy;
    const { data: dataOptions } = options;
    if (dataOptions) {
      const data = dataOptions.call(publicThis, publicThis);
      if (isObject(data)) {
        instance.data = reactive(data);
      }
    }
  }

  // packages/runtime-core/src/componentProps.ts
  function initProps(instance, rawProps, isStateful) {
    const props = {};
    const attrs = {};
    setFullProps(instance, rawProps, props, attrs);
    for (const key in instance.propsOptions[0]) {
      if (!(key in props)) {
        props[key] = void 0;
      }
    }
    if (isStateful) {
      instance.props = shallowReactive(props);
    } else {
      instance.props = attrs;
    }
    instance.attrs = attrs;
  }
  function setFullProps(instance, rawProps, props, attrs) {
    const [options] = instance.propsOptions;
    if (rawProps) {
      for (const key in rawProps) {
        const value = rawProps[key];
        if (options && hasOwn(options, key)) {
          props[key] = value;
        } else {
          if (!(key in attrs) || value !== attrs[key]) {
            attrs[key] = value;
          }
        }
      }
    }
  }
  function updateProps(instance, rawProps, rawPrevProps, optimized) {
    const {
      props,
      attrs,
      vnode: { patchFlag }
    } = instance;
    const rawCurrentProps = toRaw(props);
    const [options] = instance.propsOptions;
    if ((optimized || patchFlag > 0) && !(patchFlag & 16 /* FULL_PROPS */)) {
    } else {
      setFullProps(instance, rawProps, props, attrs);
      for (const key in rawCurrentProps) {
        if (!rawProps || !hasOwn(rawProps, key)) {
          if (options) {
            if (rawPrevProps && rawPrevProps[key] !== void 0) {
              props[key] = void 0;
            }
          } else {
            delete props[key];
          }
        }
      }
      if (attrs !== rawCurrentProps) {
        for (const key in attrs) {
          if (!hasOwn(rawProps, key)) {
            delete attrs[key];
          }
        }
      }
    }
  }

  // packages/runtime-core/src/componentEmits.ts
  function emit(instance, event, ...rawArgs) {
    if (instance.isUnmounted)
      return;
    const props = instance.vnode.props;
    let handler = props[toHandlerKey(event)];
    if (handler) {
      handler(...rawArgs);
    }
  }

  // packages/runtime-core/src/components/Teleport.ts
  var isTeleport = (type) => type.__isTeleport;
  var isTeleportDisabled = (props) => props && (props.disabled || props.disabled === "");
  var resolveTarget = (props, select) => {
    const targetSelector = props && props.to;
    if (isString(targetSelector)) {
      return select(targetSelector);
    } else {
      return targetSelector;
    }
  };
  var TeleportImpl = {
    __isTeleport: true,
    process(n1, n2, container, anchor, parentComponent, optimized, internals) {
      const {
        mc: mountChildren,
        pc: patchChildren,
        pbc: patchBlockChildren,
        o: { insert, createText, querySelector }
      } = internals;
      const disabled = isTeleportDisabled(n2.props);
      let { shapeFlag, children, dynamicChildren } = n2;
      if (n1 === null) {
        const target = n2.target = resolveTarget(n2.props, querySelector);
        const targetAnchor = n2.targetAnchor = createText("");
        if (target) {
          insert(targetAnchor, target);
        }
        const mount = (container2, anchor2) => {
          if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
            mountChildren(children, container2, anchor2, parentComponent, optimized);
          }
        };
        if (disabled) {
          mount(container, anchor);
        } else if (target) {
          mount(target, targetAnchor);
        }
      } else {
        n2.el = n1.el;
        const mainAnchor = n2.anchor = n1.anchor;
        const target = n2.target = n1.target;
        const targetAnchor = n2.targetAnchor = n1.targetAnchor;
        const wasDisabled = isTeleportDisabled(n1.props);
        const currentContainer = wasDisabled ? container : target;
        const currentAnchor = wasDisabled ? mainAnchor : targetAnchor;
        if (dynamicChildren) {
          patchBlockChildren(n1.dynamicChildren, dynamicChildren, currentContainer, parentComponent);
        } else if (!optimized) {
          patchChildren(n1, n2, currentContainer, currentAnchor, parentComponent, false);
        }
        if (disabled) {
          if (!wasDisabled) {
            moveTeleport(n2, container, mainAnchor, internals, TeleportMoveTypes.TOGGLE);
          }
        } else {
          if (n2.props && n2.props.to !== n1.props && n1.props.to) {
            const nextTarget = resolveTarget(n2.props, querySelector);
            if (nextTarget) {
              moveTeleport(n2, nextTarget, null, internals, TeleportMoveTypes.TARGET_CHANGE);
            }
          } else if (wasDisabled) {
            moveTeleport(n2, target, targetAnchor, internals, TeleportMoveTypes.TOGGLE);
          }
        }
      }
    }
  };
  var TeleportMoveTypes = /* @__PURE__ */ ((TeleportMoveTypes2) => {
    TeleportMoveTypes2[TeleportMoveTypes2["TARGET_CHANGE"] = 0] = "TARGET_CHANGE";
    TeleportMoveTypes2[TeleportMoveTypes2["TOGGLE"] = 1] = "TOGGLE";
    return TeleportMoveTypes2;
  })(TeleportMoveTypes || {});
  function moveTeleport(vnode, container, parentAnchor, { o: { insert }, m: move }, moveType) {
    if (moveType === 0 /* TARGET_CHANGE */) {
      insert(vnode.targetAnchor, container, parentAnchor);
    }
    const { shapeFlag, children } = vnode;
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      for (let i = 0; i < children.length; i++) {
        move(children[i], container, parentAnchor);
      }
    }
  }
  var Teleport = TeleportImpl;

  // packages/runtime-core/src/vnode.ts
  var Text = Symbol("Text");
  var Fragment = Symbol("Fragment");
  var Comment = Symbol("Comment");
  function isVNode(vnode) {
    return !!(vnode && vnode.__v_isVNode);
  }
  function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
  }
  var blockStack = [];
  var currentBlock = null;
  function openBlock(disableTracking = false) {
    blockStack.push(currentBlock = disableTracking ? null : []);
  }
  function closeBlock() {
    blockStack.pop();
    currentBlock = blockStack[blockStack.length - 1] || null;
  }
  function setupBlock(vnode) {
    vnode.dynamicChildren = currentBlock || [];
    closeBlock();
    return vnode;
  }
  function createElementBlock(type, props, children, patchFlag, dynamicProps, shapeFlag) {
    return setupBlock(createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, true));
  }
  function createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
    const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isTeleport(type) ? 64 /* TELEPORT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
    return createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, isBlockNode, true);
  }
  function createBaseVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, shapeFlag = type === Fragment ? 0 : 1 /* ELEMENT */, isBlockNode = false, needFullChildrenNormalization = false) {
    const vnode = {
      __v_isVNode: true,
      el: null,
      type,
      props,
      key: props == null ? void 0 : props.key,
      anchor: null,
      children,
      component: null,
      shapeFlag,
      patchFlag,
      dynamicProps,
      dynamicChildren: null
    };
    if (needFullChildrenNormalization) {
      normalizeChildren(vnode, children);
    } else if (children) {
      vnode.shapeFlag |= isString(children) ? 8 /* TEXT_CHILDREN */ : 16 /* ARRAY_CHILDREN */;
    }
    if (!isBlockNode && currentBlock && vnode.patchFlag > 0) {
      currentBlock.push(vnode);
    }
    return vnode;
  }
  function normalizeVNode(child) {
    if (child == null || typeof child === "boolean") {
      return createVNode(Comment);
    } else if (isArray(child)) {
      return createVNode(Fragment, null, child.slice());
    } else if (isObject(child)) {
      return child;
    } else {
      return createVNode(Text, null, String(child));
    }
  }
  function createTextVNode(text = "", patchFlag = 0) {
    return createVNode(Text, null, text, patchFlag);
  }
  function normalizeChildren(vnode, children) {
    let type = 0;
    if (children == null) {
      children = null;
    } else if (isArray(children)) {
      type = 16 /* ARRAY_CHILDREN */;
    } else if (typeof children === "object") {
      type = 32 /* SLOTS_CHILDREN */;
    } else if (isFunction(children)) {
      children = { default: children };
      type = 32 /* SLOTS_CHILDREN */;
    } else {
      children = String(children);
      if (vnode.shapeFlag & 64 /* TELEPORT */) {
        type = 16 /* ARRAY_CHILDREN */;
        children = [createTextVNode(children)];
      } else {
        type = 8 /* TEXT_CHILDREN */;
      }
    }
    vnode.children = children;
    vnode.shapeFlag |= type;
  }

  // packages/runtime-core/src/componentSlots.ts
  function initSlots(instance, children) {
    if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
      normalizeObjectSlots(children, instance.slots = {}, instance);
    }
  }
  function updateSlots(instance, children, optimized) {
    const { vnode, slots } = instance;
    let needDeletionCheck = true;
    if (vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
      needDeletionCheck = !children.$stable;
      normalizeObjectSlots(children, slots, instance);
    }
    if (needDeletionCheck) {
      for (const key in slots) {
        if (!(key in children)) {
          delete slots[key];
        }
      }
    }
  }
  var isInternalKey = (key) => key[0] === "_" && key === "$stable";
  function normalizeObjectSlots(rawSlots, slots, instance) {
    for (const key in rawSlots) {
      if (isInternalKey(key))
        continue;
      const value = rawSlots[key];
      if (isFunction(value)) {
        slots[key] = (props) => normalizeSlotValue(value(props));
      } else {
        const nomalized = normalizeSlotValue(value);
        slots[key] = () => nomalized;
      }
    }
  }
  var normalizeSlotValue = (value) => isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)];

  // packages/runtime-core/src/component.ts
  var uid = 0;
  var currentInstance = null;
  function createComponentInstance(vnode, parent) {
    const { type } = vnode;
    const instance = {
      uid: uid++,
      parent,
      type,
      vnode,
      next: null,
      subTree: null,
      accessCache: null,
      effect: null,
      ctx: {},
      render: null,
      proxy: null,
      provides: parent ? parent.provides : /* @__PURE__ */ Object.create(null),
      propsOptions: [type.props],
      props: {},
      attrs: {},
      setupState: {},
      setupContext: null,
      expose: null,
      slots: null,
      emit: null,
      isMounted: false,
      isUnmounted: false,
      bm: null,
      m: null,
      bu: null,
      u: null,
      bum: null,
      um: null
    };
    instance.ctx = {
      _: instance
    };
    instance.emit = emit.bind(null, instance);
    return instance;
  }
  var getCurrentInstance = () => currentInstance;
  var setCurrentInstance = (instance) => {
    currentInstance = instance;
  };
  var unsetCurrentInstance = () => {
    currentInstance = null;
  };
  function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
  }
  function setupComponent(instance) {
    const { props, children } = instance.vnode;
    const isStateful = isStatefulComponent(instance);
    initProps(instance, props, isStateful);
    initSlots(instance, children);
    const setupResult = isStateful ? setupStatefulComponent(instance) : void 0;
    return setupResult;
  }
  function setupStatefulComponent(instance) {
    const Component = instance.type;
    instance.accessCache = /* @__PURE__ */ Object.create(null);
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
      const setupContext = instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null;
      setCurrentInstance(instance);
      const setupResult = setup(instance.props, setupContext);
      unsetCurrentInstance();
      handleSetupResult(instance, setupResult);
    } else {
      finishComponentSetup(instance);
    }
  }
  function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else if (isObject(setupResult)) {
      instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
  }
  function finishComponentSetup(instance) {
    const Component = instance.type;
    if (!instance.render) {
      instance.render = Component.render || NOOP;
    }
    applyOptions(instance);
  }
  function createSetupContext(instance) {
    const expose = (expose2) => {
      instance.expose = expose2 || {};
    };
    return {
      attrs: instance.attrs,
      slots: instance.slots,
      emit: instance.emit,
      expose
    };
  }

  // packages/runtime-core/src/componentRenderUtils.ts
  function renderComponentRoot(instance) {
    const { type: Component, vnode, props, proxy, render: render2 } = instance;
    let result;
    const proxyToUse = proxy;
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      result = normalizeVNode(render2.call(proxyToUse, proxyToUse));
    } else {
      const render3 = Component;
      result = normalizeVNode(render3(props));
    }
    return result;
  }
  function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps, children: prevChildren } = prevVNode;
    const { props: nextProps, children: nextChildren } = nextVNode;
    if (prevChildren || nextChildren) {
      if (!nextChildren || !nextChildren.$stable) {
        return true;
      }
    }
    if (prevProps === nextProps) {
      return false;
    }
    if (!prevProps) {
      return !!nextProps;
    }
    if (!nextProps) {
      return true;
    }
    return hasPropsChanged(prevProps, nextProps);
  }
  function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    const prevKeys = Object.keys(prevProps);
    if (nextKeys.length !== prevKeys.length) {
      return true;
    }
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  }

  // packages/runtime-core/src/scheduler.ts
  var queue = [];
  var isFlushing = false;
  var resolvedPromise = Promise.resolve();
  function queueJob(job) {
    if (!queue.length || !queue.includes(job)) {
      queue.push(job);
      queueFlush();
    }
  }
  function queueFlush() {
    if (!isFlushing) {
      isFlushing = true;
      resolvedPromise.then(flushJobs);
    }
  }
  function flushJobs() {
    try {
      for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        if (job && job.avtive !== false) {
          job();
        }
      }
    } finally {
      queue.length = 0;
      isFlushing = false;
    }
  }

  // packages/runtime-core/src/apiLifecycle.ts
  function injectHook(type, hook, target = currentInstance) {
    if (target) {
      const hooks = target[type] || (target[type] = []);
      const wrappeHook = (...args) => {
        if (target.isUnmounted)
          return;
        setCurrentInstance(target);
        const res = hook(...args);
        unsetCurrentInstance();
        return res;
      };
      hooks.push(wrappeHook);
      return wrappeHook;
    }
  }
  var createHooks = (lifecycle) => (hook, target = currentInstance) => injectHook(lifecycle, hook, target);
  var onBeforeMount = createHooks("bm" /* BEFORE_MOUNT */);
  var onMounted = createHooks("m" /* MOUNTED */);
  var onBeforeUpdate = createHooks("bu" /* BEFORE_UPDATE */);
  var onUpdated = createHooks("u" /* UPDATED */);
  var onBeforeUnmount = createHooks("bum" /* BEFORE_UNMOUNT */);
  var onUnmounted = createHooks("um" /* UNMOUNTED */);

  // packages/runtime-core/src/components/KeepAlive.ts
  var isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
  var KeepAliveImpl = {
    __isKeepAlive: true,
    props: {
      include: [String, RegExp, Array],
      exclude: [String, RegExp, Array],
      max: [String, RegExp, Array]
    },
    setup(props, { slots }) {
      const instance = getCurrentInstance();
      const shareContext = instance.ctx;
      const cache = /* @__PURE__ */ new Map();
      const keys = /* @__PURE__ */ new Set();
      let current = null;
      const {
        renderer: {
          p: patch,
          m: move,
          um: _unmount,
          o: { createElement }
        }
      } = shareContext;
      const storageContainer = createElement("div");
      shareContext.activate = (vnode, container, anchor, optimized) => {
        const instance2 = vnode.component;
        move(vnode, container, anchor);
        patch(instance2.vnode, vnode, container, anchor, instance2, optimized);
      };
      shareContext.deactivate = (vnode) => {
        move(vnode, storageContainer);
      };
      function unmount(vnode) {
        resetShapeFlag(vnode);
        _unmount(vnode, instance, true);
      }
      function pruneCacheEntry(key) {
        const cached = cache.get(key);
        if (!current || cached.type !== current.type) {
          unmount(cached);
        } else if (current) {
          resetShapeFlag(cached);
        }
        keys.delete(key);
        cache.delete(key);
      }
      let pendingCacheKey = null;
      const cacheSubtree = () => {
        if (pendingCacheKey != null) {
          cache.set(pendingCacheKey, instance.subTree);
        }
      };
      onMounted(cacheSubtree);
      onUpdated(cacheSubtree);
      onBeforeMount(() => {
        cache.forEach((cached) => {
          const { subTree } = instance;
          const vnode = subTree.vnode;
          if (cached.type === vnode.type) {
            resetShapeFlag(cached);
            return;
          }
          unmount(cached);
        });
      });
      return () => {
        pendingCacheKey = null;
        const children = slots.default();
        const vnode = children[0];
        if (!isVNode(vnode) || !(vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */)) {
          current = null;
          return vnode;
        }
        const comp = vnode.type;
        const name = comp.name;
        console.log("\u{1F680} ~ file: KeepAlive.ts ~ line 129 ~ return ~ name", name);
        const { include, exclude, max } = props;
        if (include && (!name || !matches(include, name)) || exclude && name && matches(exclude, name)) {
          current = vnode;
          return vnode;
        }
        const key = vnode.key == null ? comp : vnode.key;
        const cacheVNode = cache.get(key);
        pendingCacheKey = key;
        if (cacheVNode) {
          vnode.el = cacheVNode.el;
          vnode.component = cacheVNode.component;
          vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
          keys.delete(key);
          keys.add(key);
        } else {
          keys.add(key);
          if (max && keys.size > max) {
            pruneCacheEntry(keys.values().next().value);
          }
        }
        vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
        current = vnode;
        return vnode;
      };
    }
  };
  var KeepAlive = KeepAliveImpl;
  function matches(pattern, name) {
    if (isArray(pattern)) {
      return pattern.some((p) => matches(p, name));
    } else if (isString(pattern)) {
      return pattern.split(",").includes(name);
    } else if (pattern.test) {
      return pattern.test(name);
    }
  }
  function resetShapeFlag(vnode) {
    let shapeFlag = vnode.shapeFlag;
    if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
      shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
    } else if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
      shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
    }
    vnode.shapeFlag = shapeFlag;
  }

  // packages/runtime-core/src/renderer.ts
  var createRenderer = (options) => {
    const {
      insert: hostInsert,
      remove: hostRemove,
      patchProp: hostPatchProp,
      createElement: hostCreateElement,
      createText: hostCreateText,
      setText: hostSetText,
      setElementText: hostSetElementText,
      parentNode: hostParentNode,
      nextSibling: hostNextSibling,
      createComment: hostCreateComment
    } = options;
    const patch = (n1, n2, container, anchor = null, parentComponent = null, optimized = !!n2.dynamicChildren) => {
      if (n1 === n2) {
        return;
      }
      if (n1 && !isSameVNodeType(n1, n2)) {
        anchor = getNextHostNode(n1);
        unmount(n1, parentComponent, true);
        n1 = null;
      }
      if (n2.patchFlag === -2 /* BAIL */) {
        optimized = false;
        n2.dynamicChildren = null;
      }
      const { type, shapeFlag } = n2;
      switch (type) {
        case Text:
          processText(n1, n2, container, anchor);
          break;
        case Comment:
          processCommentNode(n1, n2, container, anchor);
          break;
        case Fragment:
          processFragment(n1, n2, container, anchor, parentComponent, optimized);
          break;
        default:
          if (shapeFlag & 1 /* ELEMENT */) {
            processElement(n1, n2, container, anchor, parentComponent, optimized);
          } else if (shapeFlag & 6 /* COMPONENT */) {
            processComponent(n1, n2, container, anchor, parentComponent, optimized);
          } else if (shapeFlag & 64 /* TELEPORT */) {
            type.process(n1, n2, container, anchor, parentComponent, optimized, internals);
          }
      }
    };
    const processCommentNode = (n1, n2, container, anchor) => {
      if (n1 == null) {
        hostInsert(n2.el = hostCreateComment(n2.children || ""), container, anchor);
      } else {
        n2.el = n1.el;
      }
    };
    const processComponent = (n1, n2, container, anchor, parentComponent, optimized) => {
      if (n1 == null) {
        if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
          parentComponent.ctx.activate(n2, container, anchor, optimized);
        } else {
          mountComponent(n2, container, anchor, parentComponent, optimized);
        }
      } else {
        updateComponent(n1, n2, optimized);
      }
    };
    const mountComponent = (initialVNode, container, anchor, parentComponent, optimized) => {
      const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
      if (isKeepAlive(initialVNode)) {
        instance.ctx.renderer = internals;
      }
      setupComponent(instance);
      setupRenderEffect(instance, initialVNode, container, anchor, optimized);
    };
    const setupRenderEffect = (instance, initialVNode, container, anchor, optimized) => {
      const componentUpdateFn = () => {
        if (!instance.isMounted) {
          const { bm, m } = instance;
          if (bm) {
            invokeArrayFns(bm);
          }
          const subTree = instance.subTree = renderComponentRoot(instance);
          patch(null, subTree, container, anchor, instance);
          initialVNode.el = subTree.el;
          if (m) {
            invokeArrayFns(m);
          }
          instance.isMounted = true;
        } else {
          let { next, props, vnode, bu, u } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next, optimized);
          } else {
            next = vnode;
          }
          if (bu) {
            invokeArrayFns(bu);
          }
          const nextTree = renderComponentRoot(instance);
          const prevTree = instance.subTree;
          instance.subTree = nextTree;
          patch(prevTree, nextTree, container, anchor, instance);
          next.el = nextTree.el;
          if (u) {
            invokeArrayFns(u);
          }
        }
      };
      const effect2 = instance.effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update));
      const update = instance.update = effect2.run.bind(effect2);
      update();
    };
    const updateComponentPreRender = (instance, nextVnode, optimized) => {
      const prevProps = instance.vnode.props;
      instance.vnode = nextVnode;
      instance.next = null;
      updateProps(instance, nextVnode.props, prevProps, optimized);
      updateSlots(instance, nextVnode.children, optimized);
    };
    const updateComponent = (n1, n2, optimized) => {
      const instance = n2.component = n1.component;
      if (shouldUpdateComponent(n1, n2)) {
        instance.next = n2;
        instance.update();
      } else {
        n2.el = n1.el;
        instance.vnode = n2;
      }
    };
    const unmountComponent = (instance, doRemove) => {
      const { bum, um, update, subTree } = instance;
      if (bum) {
        invokeArrayFns(bum);
      }
      if (update) {
        update.active = false;
        unmount(subTree, instance, doRemove);
      }
      if (um) {
        invokeArrayFns(um);
      }
      instance.isUnmounted = true;
    };
    const processFragment = (n1, n2, container, anchor, parentComponent, optimized) => {
      const fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText("");
      const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText("");
      let { patchFlag, dynamicChildren } = n2;
      if (n1 == null) {
        hostInsert(fragmentStartAnchor, container, anchor);
        hostInsert(fragmentEndAnchor, container, anchor);
        mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, optimized);
      } else {
        if (patchFlag > 0 && patchFlag & 64 /* STABLE_FRAGMENT */ && dynamicChildren && n1.dynamicChildren) {
          patchBlockChildren(n1.dynamicChildren, dynamicChildren, container, parentComponent);
        } else {
          patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, optimized);
        }
      }
    };
    const processText = (n1, n2, container, anchor) => {
      if (n1 === null) {
        hostInsert(n2.el = hostCreateText(n2.children), container, anchor);
      } else {
        const el = n2.el = n1.el;
        if (n2.children !== n1.children) {
          hostSetText(el, n2.children);
        }
      }
    };
    const processElement = (n1, n2, container, anchor, parentComponent, optimized) => {
      if (n1 === null) {
        mountElement(n2, container, anchor, parentComponent, optimized);
      } else {
        patchElement(n1, n2, parentComponent, optimized);
      }
    };
    const patchElement = (n1, n2, parentComponent, optimized) => {
      const el = n2.el = n1.el;
      let { patchFlag, dynamicChildren } = n2;
      const oldProps = n1.props || {};
      const newProps = n2.props || {};
      if (dynamicChildren) {
        patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent);
      } else if (!optimized) {
        patchChildren(n1, n2, el, null, parentComponent, optimized);
      }
      if (patchFlag > 0) {
        if (patchFlag & 16 /* FULL_PROPS */) {
          patchProps(el, n2, oldProps, newProps);
        } else {
          if (patchFlag & 2 /* CLASS */) {
            if (oldProps.class !== newProps.class) {
              hostPatchProp(el, "class", null, newProps.class);
            }
          }
          if (patchFlag & 4 /* STYLE */) {
            hostPatchProp(el, "style", oldProps.style, newProps.style);
          }
          if (patchFlag & 8 /* PROPS */) {
            const propsToUpdate = n2.dynamicProps;
            for (let i = 0; i < propsToUpdate.length; i++) {
              const key = propsToUpdate[i];
              const prev = oldProps[key];
              const next = newProps[key];
              if (prev !== next) {
                hostPatchProp(el, key, prev, next);
              }
            }
          }
        }
        if (patchFlag & 1 /* TEXT */) {
          if (n1.children !== n2.children) {
            hostSetElementText(el, n2.children);
          }
        }
      } else if (!optimized && dynamicChildren === null) {
        patchProps(el, n2, oldProps, newProps);
      }
    };
    const patchBlockChildren = (oldChildren, newChildren, el, parentComponent) => {
      for (let i = 0; i < newChildren.length; i++) {
        const oldVNode = oldChildren[i];
        const newVNode = newChildren[i];
        const container = oldVNode.el && (oldVNode.type === Fragment || !isSameVNodeType(oldVNode, newVNode) || oldVNode.shapeFlag & 6 /* COMPONENT */) ? hostParentNode(oldVNode.el) : el;
        patch(oldVNode, newVNode, container, null, parentComponent, true);
      }
    };
    const patchProps = (el, vnode, oldProps, newProps) => {
      if (oldProps !== newProps) {
        for (const key in newProps) {
          const prev = oldProps[key];
          const next = newProps[key];
          if (next !== prev) {
            hostPatchProp(el, key, prev, next);
          }
        }
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    };
    const mountElement = (vnode, container, anchor, parentComponent, optimized) => {
      let el;
      const { type, props, shapeFlag } = vnode;
      el = vnode.el = hostCreateElement(type);
      if (shapeFlag & 8 /* TEXT_CHILDREN */) {
        hostSetElementText(el, vnode.children);
      } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
        mountChildren(vnode.children, el, anchor, parentComponent, optimized);
      }
      if (props) {
        for (const key in props) {
          hostPatchProp(el, key, null, props[key]);
        }
      }
      hostInsert(el, container, anchor);
    };
    const mountChildren = (children, container, anchor, parentComponent, optimized, start = 0) => {
      for (let i = start; i < children.length; i++) {
        let child = children[i] = normalizeVNode(children[i]);
        patch(null, child, container, anchor, parentComponent, optimized);
      }
    };
    const patchChildren = (n1, n2, container, anchor, parentComponent, optimized) => {
      const c1 = n1 && n1.children;
      const preShapeFlag = n1 ? n1.shapeFlag : 0;
      const { patchFlag, shapeFlag, children: c2 } = n2;
      if (patchFlag > 0) {
        if (patchFlag & 128 /* KEYED_FRAGMENT */) {
          patchKeyedChildren(c1, c2, container, anchor, parentComponent, optimized);
        } else if (patchFlag & 256 /* UNKEYED_FRAGMENT */) {
          patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, optimized);
        }
      }
      if (shapeFlag & 8 /* TEXT_CHILDREN */) {
        if (preShapeFlag & 16 /* ARRAY_CHILDREN */) {
          unmountChildren(c1, parentComponent);
        }
        if (c1 !== c2) {
          hostSetElementText(container, c2);
        }
      } else {
        if (preShapeFlag & 16 /* ARRAY_CHILDREN */) {
          if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
            patchKeyedChildren(c1, c2, container, anchor, parentComponent, optimized);
          } else {
            unmountChildren(c1, parentComponent, true);
          }
        } else {
          if (preShapeFlag & 8 /* TEXT_CHILDREN */) {
            hostSetElementText(container, "");
          }
          if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
            mountChildren(c2, container, anchor, parentComponent, optimized);
          }
        }
      }
    };
    const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, optimized) => {
      const oldLength = c1.length;
      const newLength = c2.length;
      const commonLength = Math.min(oldLength, newLength);
      for (let i = 0; i < commonLength; i++) {
        const nextChild = c2[i] = normalizeVNode(c2[i]);
        patch(c1[i], nextChild, container, null, parentComponent, optimized);
      }
      if (oldLength > newLength) {
        unmountChildren(c1, parentComponent, true, commonLength);
      } else {
        mountChildren(c2, container, anchor, parentComponent, optimized, commonLength);
      }
    };
    const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, optimized) => {
      let i = 0;
      let l2 = c2.length;
      let e1 = c1.length - 1;
      let e2 = l2 - 1;
      while (i <= e1 && i <= e2) {
        const n1 = c1[i];
        const n2 = c2[i] = normalizeVNode(c2[i]);
        if (isSameVNodeType(n1, n2)) {
          patch(n1, n2, container, null, parentComponent, optimized);
        } else {
          break;
        }
        i++;
      }
      while (i <= e1 && i <= e2) {
        const n1 = c1[e1];
        const n2 = c2[e2] = normalizeVNode(c2[e2]);
        if (isSameVNodeType(n1, n2)) {
          patch(n1, n2, container, null, parentComponent, optimized);
        } else {
          break;
        }
        e1--;
        e2--;
      }
      if (i > e1) {
        if (i <= e2) {
          const nextPos = e2 + 1;
          const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
          while (i <= e2) {
            patch(null, c2[i] = normalizeVNode(c2[i]), container, anchor, parentComponent, optimized);
            i++;
          }
        }
      } else if (i > e2) {
        while (i <= e1) {
          unmount(c1[i], parentComponent, true);
          i++;
        }
      } else {
        let s1 = i;
        let s2 = i;
        const keyToNewIndexMap = /* @__PURE__ */ new Map();
        for (i = s2; i <= e2; i++) {
          const nextChild = c2[i] = normalizeVNode(c2[i]);
          if (nextChild.key !== null) {
            keyToNewIndexMap.set(nextChild.key, i);
          } else {
          }
        }
        const toBePatched = e2 - s2 + 1;
        const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
        for (i = s1; i <= e1; i++) {
          const oldChild = c1[i];
          let newIndex = keyToNewIndexMap.get(oldChild.key);
          if (newIndex !== void 0) {
            newIndexToOldIndexMap[newIndex - s2] = i + 1;
            patch(oldChild, c2[newIndex], container, null, parentComponent, optimized);
          } else {
            unmount(oldChild, parentComponent, true);
          }
        }
        const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
        let j = increasingNewIndexSequence.length - 1;
        for (i = toBePatched - 1; i >= 0; i--) {
          const index = i + s2;
          let current = c2[index];
          let anchor = index + 1 < l2 ? c2[index + 1].el : null;
          if (newIndexToOldIndexMap[i] === 0) {
            patch(null, current, container, anchor, parentComponent, optimized);
          } else {
            if (j < 0 || i !== increasingNewIndexSequence[j]) {
              move(current, container, anchor);
            } else {
              console.log(110, i);
              j--;
            }
          }
        }
      }
    };
    const unmount = (vnode, parentComponent, doRemove = false) => {
      const { type, children, shapeFlag } = vnode;
      if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
        parentComponent.ctx.deactivate(vnode);
        return;
      }
      if (shapeFlag & 6 /* COMPONENT */) {
        unmountComponent(vnode.component, doRemove);
      } else {
        if (type === Fragment && shapeFlag & 16 /* ARRAY_CHILDREN */) {
          unmountChildren(children, parentComponent);
        }
        if (doRemove) {
          remove(vnode);
        }
      }
    };
    const remove = (vnode) => {
      const { type, el, anchor } = vnode;
      if (type === Fragment) {
        removeFragment(el, anchor);
        return;
      }
      hostRemove(el);
    };
    const removeFragment = (cur, end) => {
      let next;
      while (cur !== end) {
        next = hostNextSibling(cur);
        hostRemove(cur);
        cur = next;
      }
      hostRemove(end);
    };
    const unmountChildren = (children, parentComponent, doRemove = false, start = 0) => {
      for (let i = start; i < children.length; i++) {
        unmount(children[i], parentComponent, doRemove);
      }
    };
    const move = (vnode, container, anchor) => {
      const { el } = vnode;
      hostInsert(el, container, anchor);
    };
    const getNextHostNode = (vnode) => {
      return hostNextSibling(vnode.anchor || vnode.el);
    };
    const render2 = (vnode, container) => {
      if (vnode == null) {
        if (container._vnode) {
          unmount(container._vnode, null, true);
        }
      } else {
        patch(container._vnode || null, vnode, container, null, null);
      }
      container._vnode = vnode;
    };
    const internals = {
      p: patch,
      um: unmount,
      m: move,
      r: remove,
      mt: mountComponent,
      mc: mountChildren,
      pc: patchChildren,
      pbc: patchBlockChildren,
      n: getNextHostNode,
      o: options
    };
    let createApp2 = () => {
    };
    return {
      render: render2,
      createApp: createApp2
    };
  };
  function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    const len = arr.length;
    let i, j, start, end, middle;
    for (i = 0; i < len; i++) {
      const arrI = arr[i];
      if (arrI !== 0) {
        j = result[result.length - 1];
        if (arr[j] < arrI) {
          p[i] = j;
          result.push(i);
          continue;
        }
        start = 0;
        end = result.length - 1;
        while (start < end) {
          middle = start + end >> 1;
          if (arr[result[middle]] < arrI) {
            start = middle + 1;
          } else {
            end = middle;
          }
        }
        if (arrI < arr[result[start]]) {
          if (start > 0) {
            p[i] = result[start - 1];
          }
          result[start] = i;
        }
      }
    }
    let u = result.length;
    end = result[u - 1];
    while (u-- > 0) {
      result[u] = end;
      end = p[end];
    }
    return result;
  }

  // packages/runtime-core/src/h.ts
  function h(type, propsOrChildren, children) {
    const l = arguments.length;
    if (l === 2) {
      if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
        if (isVNode(propsOrChildren)) {
          return createVNode(type, null, [propsOrChildren]);
        }
        return createVNode(type, propsOrChildren);
      } else {
        return createVNode(type, null, propsOrChildren);
      }
    } else {
      if (l > 3) {
        children = Array.from(arguments).slice(2);
      } else if (l === 3 && isVNode(children)) {
        children = [children];
      }
      return createVNode(type, propsOrChildren, children);
    }
  }

  // packages/runtime-core/src/apiInject.ts
  function provide(key, value) {
    if (currentInstance) {
      let provides = currentInstance.provides;
      const parentProvides = currentInstance.parent && currentInstance.parent.provides;
      if (provides === parentProvides) {
        provides = currentInstance.provides = Object.create(parentProvides);
      }
      provides[key] = value;
    }
  }
  function inject(key) {
    const provides = currentInstance.parent && currentInstance.parent.provides;
    if (provides && key in provides) {
      return provides[key];
    }
  }

  // packages/runtime-core/src/apiDefineComponent.ts
  function defineComponent(options) {
    return isFunction(options) ? { setup: options, name: options.name } : options;
  }

  // packages/runtime-core/src/apiAsyncComponent.ts
  function defineAsyncComponent(source) {
    if (isFunction(source)) {
      source = { loader: source };
    }
    const {
      loader,
      loadingComponent,
      delay = 200,
      timeout,
      errorComponent,
      onError: userOnError
    } = source;
    let pendingRequest = null;
    let resolveComp;
    let retries = 0;
    const retry = () => {
      retries++;
      pendingRequest = null;
      return load();
    };
    const load = () => {
      let thisRequest;
      return pendingRequest || (thisRequest = pendingRequest = loader().then((comp) => {
        if (pendingRequest && pendingRequest !== thisRequest) {
          return pendingRequest;
        }
        resolveComp = comp;
        return comp;
      })).catch((err) => {
        if (userOnError) {
          err = err instanceof Error ? err : new Error(String(err));
          return new Promise((resolve, reject) => {
            const userRetry = () => resolve(retry());
            const userFail = () => reject(err);
            userOnError(err, userRetry, userFail, retries + 1);
          });
        }
      });
    };
    return defineComponent({
      name: "AsyncComponentWrapper",
      setup() {
        const instance = currentInstance;
        if (resolveComp) {
          return () => createInnerComp(resolveComp, instance);
        }
        const loaded = ref(false);
        const error = ref();
        const delayed = ref(!!delay);
        if (delayed) {
          setTimeout(() => {
            delayed.value = false;
          }, delay);
        }
        if (timeout != null) {
          setTimeout(() => {
            if (!loaded.value && !error.value) {
              pendingRequest = null;
              error.value = new Error(`Async component timed out after ${timeout}ms.`);
            }
          }, timeout);
        }
        load().then(() => {
          loaded.value = true;
        }).catch((err) => {
          error.value = err;
        });
        return () => {
          if (loaded.value && resolveComp) {
            return createInnerComp(resolveComp, instance);
          } else if (error.value && errorComponent) {
            return createInnerComp(errorComponent, instance);
          } else if (!delayed.value && loadingComponent) {
            return createInnerComp(loadingComponent, instance);
          }
        };
      }
    });
  }
  function createInnerComp(comp, { vnode: { props, children } }) {
    const vnode = createVNode(comp, props, children);
    return vnode;
  }

  // packages/runtime-dom/src/nodeOps.ts
  var nodeOps = {
    insert: (child, parent, anchor) => {
      parent.insertBefore(child, anchor || null);
    },
    remove: (child) => {
      const parent = child.parentNode;
      if (parent) {
        parent.removeChild(child);
      }
    },
    createElement: (tag) => {
      const el = document.createElement(tag);
      return el;
    },
    createText: (text) => document.createTextNode(text),
    createComment: (text) => document.createComment(text),
    setText: (node, text) => {
      node.nodeValue = text;
    },
    setElementText: (el, text) => {
      el.textContent = text;
    },
    parentNode: (node) => node.parentNode,
    nextSibling: (node) => node.nextSibling,
    querySelector: (selector) => document.querySelector(selector)
  };

  // packages/runtime-dom/src/modules/class.ts
  function patchClass(el, value) {
    if (value === null) {
      el.removeAttribute("class");
    } else {
      el.className = value;
    }
  }

  // packages/runtime-dom/src/modules/style.ts
  function patchStyle(el, prev, next) {
    const style = el.style;
    const isCssString = isString(next);
    if (next && !isCssString) {
      for (const key in next) {
        setStyle(style, key, next[key]);
      }
      if (prev && !isString(prev)) {
        for (const key in prev) {
          if (next[key] == null) {
            setStyle(style, key, "");
          }
        }
      }
    } else {
      if (isCssString) {
        if (prev !== next) {
          style.cssText = next;
        }
      } else if (prev) {
        el.removeAttribute("style");
      }
    }
  }
  function setStyle(style, name, val) {
    if (name in style) {
      style[name] = val;
    }
  }

  // packages/runtime-dom/src/modules/events.ts
  function patchEvent(el, rawName, nextValue) {
    const invokers = el._vei || (el._vei = {});
    const existingInvoker = invokers[rawName];
    if (nextValue && existingInvoker) {
      existingInvoker.value = nextValue;
    } else {
      const name = rawName.slice(2).toLowerCase();
      if (nextValue) {
        const invoker = invokers[rawName] = createInvoker(nextValue);
        el.addEventListener(name, invoker);
      } else if (existingInvoker) {
        el.removeEventListener(name, existingInvoker);
        invokers[rawName] = void 0;
      }
    }
  }
  function createInvoker(initialValue) {
    const invoker = (e) => {
      const value = invoker.value;
      if (isArray(value)) {
        value.map((fn) => fn && fn(e));
      } else {
        value(e);
      }
    };
    invoker.value = initialValue;
    return invoker;
  }

  // packages/runtime-dom/src/modules/attrs.ts
  function patchAttr(el, key, value) {
    if (value !== null) {
      el.setAttribute(key, value);
    } else {
      el.removeAttribute(key);
    }
  }

  // packages/runtime-dom/src/patchProp.ts
  var patchProp = (el, key, prevValue, nextValue) => {
    if (key === "class") {
      patchClass(el, nextValue);
    } else if (key === "style") {
      patchStyle(el, prevValue, nextValue);
    } else if (isOn(key)) {
      patchEvent(el, key, nextValue);
    } else {
      patchAttr(el, key, nextValue);
    }
  };

  // packages/runtime-dom/src/index.ts
  var rendererOptions = extend(nodeOps, { patchProp });
  var renderer;
  function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions));
  }
  var render = (...args) => {
    ensureRenderer().render(...args);
  };
  var createApp = (...args) => {
    const app = ensureRenderer().createApp(...args);
    app.mount = () => {
    };
    return app;
  };
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=runtime-dom.global.js.map
