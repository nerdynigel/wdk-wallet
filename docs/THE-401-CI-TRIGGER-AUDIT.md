# GitHub Actions trigger audit — opt-in only (THE-401)

Follow-through on the Board CI policy published in THE-396
(`btcx/docs/THE-396-CI-TRIGGER-AUDIT.md`, §3) for this Nigel-owned fork
`nerdynigel/wdk-wallet` (fork of `tetherto/wdk-wallet`). Upstream ownership does not
waive the policy inside Nigel's namespace; the upstream repository was **not** edited.

Board direction (2026-09-30): GitHub-hosted runners are **opt-in only**. They never run
on ordinary pushes or PR updates, and are used only to test a pull request immediately
before merge when explicitly requested. The authoritative validation is host-executed
CI plus independent verification.

Trigger policy applied to this repository's workflows:

```yaml
on:
  workflow_dispatch:
  pull_request:
    types: [labeled]
```

with a job gate:

```yaml
if: github.event_name == 'workflow_dispatch' || github.event.label.name == 'ci:run'
```

Release/publish jobs are **manual only** (`workflow_dispatch`). A GitHub run is requested
by adding the `ci:run` label to a PR or by manual dispatch; `push` triggers are never
re-added. No product or test semantics, dependency pins, secrets, shared services or
Actions spending settings were changed.

## 1. Workflows changed

All workflow files in `.github/workflows/` (only two exist).

| Workflow | Triggers before | Triggers after |
|---|---|---|
| `.github/workflows/build.yml` | `push` (main, develop), `pull_request` (main, develop) | `workflow_dispatch`, `pull_request: [labeled]`; both jobs (`lint`, `test`) gated on `ci:run` |
| `.github/workflows/publish.yml` | `push` (tags `v*`) | `workflow_dispatch` (npm publish is now manual; tag-driven publishing removed) |

## 2. Confirmation

- No `push` trigger remains in any workflow in this repository.
- No `repository_dispatch`, `schedule`, `pull_request_target` or other automatic trigger
  exists; `repository_dispatch` is not used here.
- `build.yml` runs only via manual dispatch or when the `ci:run` label is added to a PR;
  every job carries the `ci:run` gate, so ordinary PR open/synchronize/reopen events do
  not execute runner jobs.
- `publish.yml` is reachable only via manual `workflow_dispatch`.
- Job steps, action pins (`tetherto/oss-actions/node-base@v1`,
  `holepunchto/actions/node-base@v1`, `holepunchto/actions/publish@v1`), `permissions`,
  environment and `package.json`/dependency pins are unchanged.

## 3. Host-side validation

```
python3 - <<'PY'
import sys, glob, yaml
GATE = "github.event_name == 'workflow_dispatch' || github.event.label.name == 'ci:run'"
failures = []
def normalize(k):
    return True if (k is True or k == 'on') else k
def check(path):
    doc = yaml.safe_load(open(path))
    trig = normalize(doc.get('on', doc.get(True)))
    jobs = doc.get('jobs', {}) or {}
    print(f"file={path} name={doc.get('name')} triggers={sorted(trig.keys()) if isinstance(trig,dict) else trig} jobs={list(jobs)}")
    if not isinstance(trig, dict):
        failures.append(f'{path}: unexpected triggers'); return
    if 'push' in trig: failures.append(f'{path}: push trigger present')
    if 'schedule' in trig: failures.append(f'{path}: unexpected schedule')
    if 'repository_dispatch' in trig: failures.append(f'{path}: repository_dispatch present')
    label = 'pull_request' in trig
    if label:
        types = (trig['pull_request'] or {}).get('types')
        if types != ['labeled']: failures.append(f'{path}: pr types {types!r}')
    for jn, job in jobs.items():
        cond = (job or {}).get('if')
        if label and cond != GATE:
            failures.append(f'{path}: job {jn} gate={cond!r}')
files = sorted(glob.glob('.github/workflows/*.yml')+glob.glob('.github/workflows/*.yaml'))
print('workflows scanned:', len(files))
for f in files: check(f)
print('RESULT:', 'PASS' if not failures else 'FAIL')
for x in failures: print('  FAIL', x)
sys.exit(1 if failures else 0)
PY
```

Observed output (PyYAML 6.0.2, Node-free):

```
workflows scanned: 2
file=.github/workflows/build.yml name=build triggers=['pull_request', 'workflow_dispatch'] jobs=['lint', 'test']
file=.github/workflows/publish.yml name=Publish triggers=['workflow_dispatch'] jobs=['publish']
RESULT: PASS
```

`grep -rn -E "^\s*(push|repository_dispatch):" .github/` returns no matches.

## 4. Rollback

Revert this commit on the task branch (or the subsequently merged commit):

```
git revert <commit-sha>
```

This restores the previous `build.yml` (`push` on main/develop + `pull_request` on
main/develop) and `publish.yml` (`push` on `v*` tags). No data, secrets or shared
services are involved, so rollback is a pure file revert. Because the change only
removes automatic triggers, leaving it in place can never create an unrequested paid
run; reverting would merely re-enable upstream's original automatic behaviour.

## 5. Limitations / residual

- Upstream `tetherto/wdk-wallet` and its own repository retain their push/PR triggers;
  they are outside this repository and were not modified (an upstream change is owned
  upstream).
- Other Nigel forks audited under THE-396 (`rgb-lib-wasm`, `wdk-rgb-lightning`,
  `rgb-lightning-node-nodejs`) are separate fork-policy slices and are not touched here.
- Branch publication does not imply default-branch adoption or merge; a GitHub run is
  never auto-triggered by this change.
