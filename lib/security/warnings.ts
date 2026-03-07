const SUSPICIOUS_KEY_REGEX = /(secret|token|password|passwd|apikey|api_key)/i;

export type SecurityWarning = {
  keyPath: string;
  message: string;
};

export function detectSuspiciousKeys(keyPaths: string[]): SecurityWarning[] {
  return keyPaths
    .filter((path) => SUSPICIOUS_KEY_REGEX.test(path))
    .map((keyPath) => ({
      keyPath,
      message: "Key name resembles a credential/secret pattern.",
    }));
}
