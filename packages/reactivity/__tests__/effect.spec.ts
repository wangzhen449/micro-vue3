import { reactive } from "../src/reactive";
import { effect } from '../src/effect';

describe('effect', () => {
  it('change', () => {
    const proxy = reactive({ count: 1});
    let total = 0
    effect(() => {
      total = proxy.count + 1;
    })
    expect(total).toBe(2);
    proxy.count += 1;
    expect(total).toBe(3);
  });
});