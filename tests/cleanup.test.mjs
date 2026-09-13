import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve("node_modules");
test("base cleanup attempts remaining signers after a signer fails", async () => {
  const { default: WalletBase } = await import(
    pathToFileURL(path.resolve("src/wallet-manager.js"))
  );
  const seed = randomBytes(32);
  const original = Buffer.from(seed);
  const manager = new WalletBase(seed);
  const retained = manager.seed;
  let cleaned = 0;
  manager.addSigner("failing", {
    dispose() {
      throw new Error("signer failed");
    },
  });
  manager.addSigner("remaining", {
    dispose() {
      cleaned++;
    },
  });
  assert.throws(() => manager.dispose(), AggregateError);
  assert.equal(cleaned, 1);
  assert.ok(retained.every((byte) => byte === 0));
  assert.deepEqual(
    seed,
    original,
    "manager must not zero caller-owned storage",
  );
  manager.dispose();
  seed.fill(0);
  original.fill(0);
});
