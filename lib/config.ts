const env = {
  STUB_MODE: process.env.STUB_MODE ?? "true",
  DATABASE_URL: process.env.DATABASE_URL,
  APP_BASE_URL: process.env.APP_BASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_KMS_KEY_ID: process.env.S3_KMS_KEY_ID,
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_REGISTRATION: process.env.STRIPE_PRICE_REGISTRATION,
  STRIPE_PRICE_INDIVIDUAL: process.env.STRIPE_PRICE_INDIVIDUAL,
  STRIPE_PRICE_FAMILY: process.env.STRIPE_PRICE_FAMILY,
};

export const appConfig = {
  stubMode: env.STUB_MODE !== "false",
  env,
};

export const requireEnv = (key: keyof typeof env) => {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${String(key)}`);
  }
  return value;
};

