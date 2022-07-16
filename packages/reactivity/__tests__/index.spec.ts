import { isObject} from "../src/index";

describe('reactivity', () => {
  it('aaa', () => {
    expect(isObject(12)).toBe(true)
  });
});