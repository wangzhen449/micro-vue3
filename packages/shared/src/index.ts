export const isObject = (value) => {
  return typeof value === "object" && value !== null;
};

export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue);

