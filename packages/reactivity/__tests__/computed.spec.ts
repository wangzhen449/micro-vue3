import { computed } from "../src/computed";
import { effect } from "../src/effect";
import { reactive } from "../src/reactive";

describe('computed', () => {
  it('cache', () => {
    const proxy = reactive({count: 1})
    const fn = jest.fn(() => proxy.count + 1)
    const comp = computed(fn)
    proxy.count++
    proxy.count++
    proxy.count++
    proxy.count++
    expect(fn).toBeCalledTimes(0)
    expect(comp.value).toBe(6)
    expect(fn).toBeCalledTimes(1)
  });

  it('effect', () => {
    const proxy = reactive({count: 1})
    const fn = jest.fn(() => proxy.count + 1)
    const comp = computed(fn)
    let total = 0;
    const effectFn = jest.fn(() => {
      total += comp.value
    })
    effect(effectFn)
    proxy.count++
    proxy.count++

    expect(fn).toBeCalledTimes(3)
    expect(comp.value).toBe(4)
    expect(total).toBe(9)
    expect(effectFn).toBeCalledTimes(3)
  });
});