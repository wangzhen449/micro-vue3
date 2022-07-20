import { reactive } from "../src/reactive";
import { effect, activeEffect } from "../src/effect";

describe("effect", () => {
  // pass
  it("change", () => {
    const proxy = reactive({ count: 1 });
    let total = 0;
    effect(() => {
      total = proxy.count + 1;
    });
    expect(total).toBe(2);
    proxy.count += 1;
    expect(total).toBe(3);
  });

  // pass
  it("多次触发getter", () => {
    const proxy = reactive({ count: 1 });
    let total = 0;
    effect(() => {
      proxy.count;
      proxy.count;
      proxy.count;
      total = proxy.count + 1;
    });
    expect(total).toBe(2);
    proxy.count += 1;
    expect(total).toBe(3);
  });

  // pass
  it("runner 可手动触发", () => {
    const proxy = reactive({ count: 1 });
    let total = 0;
    const runner = effect(() => {
      total += proxy.count;
    });
    expect(total).toBe(1);
    runner();
    runner();
    runner();
    runner();
    expect(total).toBe(5);
  });

  // pass
  it("runner作为effect参数 监听函数触发两次", () => {
    const proxy = reactive({ count: 1 });
    const fn = jest.fn(() => {
      proxy.count;
    })

    const runner = effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    effect(runner);
    expect(fn).toHaveBeenCalledTimes(2);
    proxy.count++;
    expect(fn).toHaveBeenCalledTimes(4);
  });

  // pass
  it("onStop 延迟清理", () => {
    const proxy = reactive({ a: 1, b: 2, c: { d: 4 } });
    const fn = jest.fn(() => {
      proxy.a;
      proxy.b;
      proxy.c.d;
      if(activeEffect) activeEffect.stop()
    })

    effect(fn);
    proxy.a++;
    proxy.b++;
    proxy.c.d++;

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // pass
  it("onStop", () => {
    const proxy = reactive({ a: 1, b: 2, c: { d: 4 } });
    const fn = jest.fn(() => {
      proxy.a;
      proxy.b;
      proxy.c.d;
    })

    const runner = effect(fn);
    runner.effect.stop()
    proxy.a++;
    proxy.b++;
    proxy.c.d++;

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // pass
  it("递归引用", () => {
    const proxy = reactive({ count: 1 });
    let total = 0;
    effect(() => {
      // # Maximum call stack size exceeded.
      // 在effect内修改监听的属性值，会造成递归引用
      proxy.count++;
      total = proxy.count + 1;
    });
    expect(total).toBe(3);
    proxy.count += 1;
    expect(total).toBe(5);
  });
});
