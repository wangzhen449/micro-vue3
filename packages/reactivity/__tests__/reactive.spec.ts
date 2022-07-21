import { reactive, isReactive, toRaw } from '../src/reactive';

describe("reactivity", () => {
  it("isReactive", () => {
    const original = {
      b: {
        c: { e: { f: 1 } },
        d: [{ g: 6, h: { i: 8 } }],
      },
    };
    const observed = reactive(original);
    expect(observed).not.toBe(original);

    expect(isReactive(observed.b.c.e)).toBe(true);
    expect(isReactive(observed.b.c.e.f)).toBe(false);
    expect(isReactive(observed.b.d[0].h)).toBe(true);
    expect(isReactive(observed.b.d[0].h.i)).toBe(false);
  });

  it("toRaw", () => {
    const original = {
      b: {
        c: { e: { f: 1 } },
        d: [{ g: 6, h: { i: 8 } }],
      },
    };
    const observed = reactive(original);
    expect(toRaw(observed)).toBe(original);
  });
});
