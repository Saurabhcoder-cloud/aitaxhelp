const redact = (value?: string | null) => {
  if (!value) return "";
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return value.slice(0, 3) + "***";
};

export const logger = {
  info: (msg: string, meta?: Record<string, any>) =>
    console.log(msg, meta ? JSON.stringify(meta) : ""),
  warn: (msg: string, meta?: Record<string, any>) =>
    console.warn(msg, meta ? JSON.stringify(meta) : ""),
  error: (msg: string, meta?: Record<string, any>) =>
    console.error(msg, meta ? JSON.stringify(meta) : ""),
  redact,
};

