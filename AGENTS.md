# Rueda

An arcade rueda de casino game by Ivo Elbert. The current work is the moves library in `guapea/`: the whole rueda dancing each call. The game mechanics (a rhythm and memory game) come later. Don't start on them, and don't encode which calls usually follow which, until Ivo asks.

## Working with Ivo

- Ivo describes each move count by count: who goes where on 1-2-3 and 5-6-7, which hands, which way each one faces. His description is the source of truth, over videos and web sources. Ask focused questions before building anything his description leaves open, such as which way a turn goes, how long it takes, or what the hands do. He likes answering them.
- Fluid beats literal. Moves flow through the 4 and the 8 without pausing unless he says so, and his timings are a guide. "It should feel like dancing" is the usual note.
- Directions: at the start of a move he faces North and she faces him (South). In arriba he faces South. A turn to someone's left is counterclockwise seen from above.
- He tests on the live site, https://ivoelbert.github.io/rueda/guapea/, on his computer, and does no setup. He doesn't need screenshots or videos.
- Deliver every change by committing to `main` and pushing; GitHub Pages deploys it in about a minute. Then check the deployed `guapea/` files match the local ones, and tell him where to find the move: its key in the list and a `?call=` URL that jumps to it.
- Keep replies short: what changed, how to try it, and at most one question.

## Code

Plain ES modules served as static files, with no build step. The README's "Code" section says what each file in `guapea/` holds.

Adding a move:

1. Its figures (one per bar) go in the family's file in `guapea/figures/`, reusing existing bars where the move shares them. The comment above each figure says what happens on each count, in plain words, and what its flags mean. The track formats are explained above `GUAPEA` in `figures/guapea.js`.
2. Its entry goes in `MOVES` in `guapea/moves.js`. The order there is the list's order, so the number keys of the moves after it shift.
3. If it needs a hold no figure has yet, it gets a flag on the figure and a function in `guapea/hands.js`, which `hands()` picks by the flag.
4. It gets a line in the README's list of moves, and its `?call=` id where the URL options mention one.

## Checking

Run `npm install` and `npx playwright install chromium` once. Then:

- `npm run check -- --against HEAD` before every commit. A new move shows as `new`, and every move you didn't mean to change must say `same`. A `!` means a number got worse than any move had; look at it before shipping.
- Add `--pictures` for a refactor or anything meant to change nothing on screen: it also compares the drawn frames.
- `npm run strip -- out.png <calls> <couple> <beats...>` draws one couple at those beats. Look at new motion this way before shipping, at several couples round the circle, since the camera sees each from a different side.
- The README's "Tools" section has the details.
