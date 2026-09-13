# Experimental compatibility branch

This public fork carries minimal, upstream-oriented changes for self-custodial
RGB-Lightning atomic trading tests for BTCX on regtest. It is not a BTCX wallet,
not production-ready, and is intended to converge back to upstream. Other wallets
can integrate BTCX by capability; this fork is not required.

No funded use is supported. No permissive signer policy, hosted user keys,
custom cryptography or sequential-payment workaround is introduced.

Keep `main` aligned with upstream. Compatibility work stays on `btcx-phase2`.
Review source/dependency changes before syncing:

```sh
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git checkout btcx-phase2
git merge main
```

Rerun regressions after merging. Do not publish packages, releases or binaries.
Preserve the upstream licence.
