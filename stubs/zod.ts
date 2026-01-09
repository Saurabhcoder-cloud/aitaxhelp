const chainable = () => {
  const self: any = {
    refine: () => self,
    optional: () => self,
    gte: () => self,
    min: () => self,
  };
  return self;
};

export const z: any = {
  object: () => ({ safeParse: (value: any) => ({ success: true, data: value, error: null }) }),
  string: () => chainable(),
  literal: () => chainable(),
  nativeEnum: () => chainable(),
  number: () => chainable(),
  boolean: () => chainable(),
  any: () => chainable(),
  instanceOf: () => chainable(),
};

export default z;
