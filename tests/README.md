# Field JSA tests

Browser tests for `jsa-walkthrough-test.html`. One command runs them all, from the repo folder:

```
python tests\run.py
```

Run some suites only: `python tests\run.py fj003-home-new-button` (file names in `tests\`, no `.js`).
It prints one line per suite, every failed check with what it got and wanted, and a total. The exit code is 0 only when
every check passed. Needs Python 3 and Microsoft Edge, nothing else: no Node, no `package.json`, no `node_modules`.

## What it does

`run.py` serves this repo folder on `http://127.0.0.1:8797/` with Python's http.server. For each suite (and each
`// @variant` line in it) it:

1. opens `jsa-walkthrough-test.html` in headless Edge at phone size (390×844), with a fresh profile, so localStorage
   starts empty. Headless Edge won't make a window narrower than about 500 px, so the app runs in a frame of exactly
   that size inside a bigger window; to the app, the frame is the phone screen;
2. puts `lib.js` and the suite into the page before `</body>`, after the app's own script (the page is read from disk
   each time, so it tests the file as it is now);
3. waits for the page to post its results back to the same server, then closes that Edge.

Scratch files (each suite's Edge profile and results) go to `%TEMP%\fieldjsa-tests\<date-time>\`. The runner keeps the
last 3 runs there and deletes older ones.

**Nothing is left running.** The runner joins a Windows job that closes every process in it when the runner ends
(finished, Ctrl+C, crashed, or its window closed); the browsers it starts belong to that job. Each suite also closes its
own browser when done. On start it closes test browsers left by earlier runs, and refuses to start while another run
is in progress. The last line reports peak memory and how many test processes were left running (should be 0).

## Rules for a suite

- **Made-up data only.** This repo is public: no company, customer, person or location names. Drive the app through
  its own screens (or "Load a filled-in example"), and type names like "Lead L" or "Crew A".
- **Check only what the suite controls.** A failure must always mean the code is wrong.
- One file per ledger change, named `fj0NN-what.js`. Wrap the checks in `suite(async()=>{ ... })` and report with
  `ck(name, got, want)`.
- The app's code is private to its own script, so suites work through the page: tap with `T.tap(act, id)` (the
  `data-act` / `data-id` on a button), type with `T.fill(key, value)` (a field's `data-bind` or `data-ui`), and read
  the wizard's Next button with `T.next()`.
- `// @variant window=360x800` runs the suite at that size instead (e.g. the narrowest phone, for side scroll).
  `// @variant flag=--force-prefers-reduced-motion` passes an Edge flag. Several `@variant` lines mean several runs.
  The runner fails a run whose page didn't get the size it asked for.
