import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, isEncrypted } from "./crypto";

beforeAll(() => {
  // Use a fixed test key so the suite is deterministic. Real secret is in
  // process env; tests force their own to avoid depending on .env load order.
  process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("crypto AES-256-GCM", () => {
  it("round-trips a short string", () => {
    const plain = "hello world";
    const cipher = encrypt(plain);
    expect(cipher).not.toBe(plain);
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(decrypt(cipher)).toBe(plain);
  });

  it("round-trips an OAuth token-like payload", () => {
    const token =
      "ya29.a0ARrdaM-mockExampleAccessToken_with_special_chars!@#$%^&*()_+-=[]{}|;:,.<>?";
    expect(decrypt(encrypt(token))).toBe(token);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same");
    expect(decrypt(b)).toBe("same");
  });

  it("rejects tampered ciphertext via auth tag", () => {
    const cipher = encrypt("important");
    // Flip a byte deep inside (after the version prefix + IV + tag)
    const corrupted = cipher.slice(0, -4) + "AAAA";
    expect(() => decrypt(corrupted)).toThrow();
  });

  it("isEncrypted detects v1 format", () => {
    expect(isEncrypted(encrypt("x"))).toBe(true);
    expect(isEncrypted("plain text")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });

  it("decrypt accepts legacy plaintext (backwards compat during rollout)", () => {
    expect(decrypt("legacy-plaintext-token")).toBe("legacy-plaintext-token");
  });
});
