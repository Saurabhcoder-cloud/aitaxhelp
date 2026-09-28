import { EmailProvider } from "../types";
import { getEmailConfig } from "../config";
import { NullEmailProvider } from "./null-provider";
import { ConsoleEmailProvider } from "./console-provider";

let currentProvider: EmailProvider | null = null;

/**
 * Returns the configured EmailProvider instance.
 * Defaults safely to NullEmailProvider if unconfigured.
 */
export function getEmailProvider(): EmailProvider {
  if (currentProvider) {
    return currentProvider;
  }

  const config = getEmailConfig();

  switch (config.provider) {
    case "console":
      currentProvider = new ConsoleEmailProvider();
      break;
    case "null":
    default:
      currentProvider = new NullEmailProvider();
      break;
  }

  return currentProvider;
}

/**
 * Allows swapping the provider in test suites or custom runtime bindings.
 */
export function setEmailProvider(provider: EmailProvider | null): void {
  currentProvider = provider;
}
