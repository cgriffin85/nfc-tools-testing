# Flowback Report — design prototype

`flowback-report-test.html` (repo root) is a click-through of the Flowback Report design boards: the hand's
phone, the footpath from above, the foreman's phone, Job Setup, the engineer's desk and the engineer's setup.
It is a design prototype, not the app: nothing saves, every number is made up, names are placeholders.

## Where it comes from

The boards are drawn on Chris's claude.ai design canvas ("Flowback Report Canvas"). `boards/` holds copies of
the board files (`.dc.html`) as they stood at each build. `build.py` bundles them into the one test page with
`shell.html`, which carries the menu and a small player for the boards' template markup
(`{{ }}` lookups, `sc-for`, `sc-if`, `dc-import`, `onClick` / `onChange`, `renderVals()` / `setState()`).

Rebuild after copying newer boards in:

```
python flowback-design/build.py flowback-design/boards flowback-report-test.html
```

## Status

- Job Setup wizard: approved by Chris 2026-10-22.
- Everything else: drafts for feedback (phone round second draft; foreman's phone, engineer's desk and
  engineer's setup first drafts, approved as an initial version 2026-10-23).
- Fix in this build: the Job Setup pad picture now fills in layer by layer (its column flags were never
  returned by the logic; the canvas had been showing placeholders).
