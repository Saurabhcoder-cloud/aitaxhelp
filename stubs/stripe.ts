class FakeSession {
  constructor(public url: string | null = null) {}
}

class FakeStripe {
  constructor(_key: string, _opts?: any) {}
  checkout = {
    sessions: {
      create: async (_args: any) => new FakeSession("https://example.com/checkout"),
    },
  };
  webhooks = {
    constructEvent: (_buf: any, _sig: any, _secret: any) => ({ type: "unknown", data: {} }),
  };
};

export default function Stripe(key: string, opts?: any) {
  return new FakeStripe(key, opts);
}

export type StripeType = ReturnType<typeof Stripe>;
