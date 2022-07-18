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
    ReactiveFlags: () => ReactiveFlags,
    isReactive: () => isReactive,
    reactive: () => reactive
  });

  // packages/shared/src/index.ts
  var isObject = (value) => {
    return typeof value === "object" && value !== null;
  };

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
      if (isObject(res)) {
        return reactive(res);
      }
      return res;
    };
  }
  function createSetter() {
    return function set2(target, key, value) {
      const result = Reflect.set(target, key, value);
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
