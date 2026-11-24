# CLAUDE.md

Parametric 3D-printable fridge frames. README.md explains the code layout and the style contract; read it
before changing code.

## Commands

```
npm ci          # install exactly what package-lock.json pins
npm test        # 20 tests, ~90 s. Must pass before any PR.
npm run site    # rebuild docs/ (the published site) from src/ and web/
```

## Rules

- **Never push to main.** Work on a branch named `task/<id>-<short-name>`, open a pull request, and stop.
  CI must be green before the owner merges.
- **One task per pull request.** Tasks live in TASKS.md. Change only the files the task lists under
  "Files". If the task needs another file or a decision the card doesn't make, stop and say so in the
  PR or chat. Don't widen the scope and don't decide.
- **Reference values are sacred.** `test/fixtures.json` holds volumes from the printed and measured
  model. Never edit fixtures or loosen a tolerance to make a test pass. If a change alters geometry,
  stop: it is a design change and needs the owner.
- **docs/ is generated.** Never edit it by hand. After changing src/ or web/, run `npm run site` and
  commit docs/ in the same PR. CI fails if they don't match.
- **No new dependencies** unless the task card says so.
- **Say what you could not verify.** Tests run in Node; nothing here runs a browser. Anything the
  page does (UI, preview, downloads, responsiveness) goes in the PR under "Not verified" as a checklist
  for the owner.

## Doing a task ("do T4")

1. Read the card in TASKS.md. If its status is not `ready`, or "Open decisions" is not empty, stop
   and list what must be decided.
2. Before coding, restate the card's "Done when" as the exact results you expect (test names,
   outputs, behavior). If the code disagrees with the card, the card wins. Report the mismatch;
   don't change the expectation to match the code.
3. Implement within the listed files. Add or update tests the card asks for.
4. `npm test`, then `npm run site` if src/ or web/ changed.
5. In TASKS.md, set the card's status to `done (PR #n)`.
6. Open the PR. The description has these sections: What changed, Test result (pass count), Not verified
   (checklist), Anything the card got wrong.

## Planning sessions

Planning writes and revises cards in TASKS.md; coding sessions only execute them. A card is `ready`
only when its "Open decisions" list is empty and every file it writes is named.
