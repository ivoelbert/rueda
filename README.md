# Rueda

An arcade rueda de casino game.

## Guapea and the moves library (current)

`guapea/` is an isometric pixel rueda that dances the guapea in unison, tuned for feel rather than accuracy. The root page opens it, and it's live at https://ivoelbert.github.io/rueda/guapea/.

The moves library on the left lists the calls. Pick one and press Space (or tap the game): the whole rueda dances it from the next 1, then goes back to the guapea, or for a call such as Arriba keeps doing what the call leads to until the next one. As in a real rueda, call on 5: a move prepares on the 7 and 8 before its 1, so a call made on 7 or 8 waits for the 1 after. A second call can be queued while a move is running; during a longer move it waits for the move to end. The list shows only the moves that can be called next, under "Guapea – available moves", "Arriba – available moves" or "Adentro y afuera – available moves".

From the guapea, each ending with everyone on a new partner:

- **Dame**: a dile que no with the girl on your right.
- **Enchufla**: she turns under his arm and they swap places, then a dame.
- **Enchufla doble**: she starts the enchufla, on 5 his hand on her back stops her, her free arm goes up and he sends her back; then a whole enchufla.
- **Sombrero**: both hands, crossed: an exhíbela, then an enchufla without letting go into the coronación on 7, each wearing the other's arm as a hat. A dile que no hands her on, then a dame.
- **Setenta**: both hands: an exhíbela that wraps her left arm behind her back, an enchufla without letting go that unwinds it, then his enchufla and hers, round like gears. A dile que no, then a dame.
- **Setenta corrido**: the setenta, with a bar after the first in which the couple walks once round each other, clockwise, still wrapped.
- **Uno**: hands like a handshake, he steps in behind her and they swap sides behind each other; on 5 of the second bar her arm goes over her head into the coronación. A dile que no, then a dame.
- **Pelota uno, dos, tres**: an enchufla where everyone claps on 7; on 7 and 8; or on 7, 8 and the dame's 1.
- **Festival pelota**: the pelota uno, dos and tres back to back.
- **Pelota**: an enchufla that takes the guys inside the circle and the girls outside; on 1 the golpe, the guys pointing to the center and the girls out. She turns, he turns, an enchufla back into line, the setenta's dile que no, then a dame.
- **Doble play con mambo**: an enchufla that stops facing the next girl, a bar of mambo with claps on 5 and 7, then a dame with her.
- **Pelota de 4**: an enchufla that stops facing the next girl, a whole bar of mambo, then a turn to the left in four quarters with a clap on 1, 3, 5 and 7, then a dame with her.
- **Arriba**: a dile que si into the closed hold. The rueda closes up and every couple walks round the circle in the hold, a place a bar, the joined hands pumping, until the next call.

From arriba:

- **Dile que no**: out of the closed hold, back into the guapea with the same partner.
- **Tarrito**: the joined hands go up into an arch, he walks on under her arm to the girl ahead and they walk on arriba. Everyone has a new partner.
- **Tarrito hasta la tuya**: the tarrito, but he walks on round the inside of the circle until he is back with his own girl.
- **Adentro y afuera**: they stop walking and open and close like a V in the hold, him in and her out on 1, the other way on 5, until the next call.
- **La exhibo**: they stop walking for it, then as from adentro y afuera.

From adentro y afuera, where a call must come by the 5:

- **Dile que no**, and **Arriba**, walking on from the middle.
- **Tarrito**: as from arriba, but the girls wait stepping in place, so he walks one place.
- **La exhibo**: on 1-2-3 the in and out, but she stays facing the center and walks on into it; on 5-6-7 she turns once round under his lifted arm, reaching out to the center. Then the in and out again.

The comment above each figure in `guapea/figures/` says what happens on every count.

- Keys: Space = call the selected move, ▲ ▼ or 1-9 and 0 = pick one of the moves listed (0 is the tenth; from the eleventh on, ▲ ▼ or a click), ◄ ► = lead/follow, S = ½× speed, M = mute, T = the tune panel.
- The tune panel's sliders (tempo, bounce, straight legs, hips, step size, arm swing, styling, timing, springiness, looseness, couples) are saved in the URL, so a tuned version can be shared as a link.
- URL options: `?beat=N` freezes the clock at a beat (count 1 is beat 0). `?call=enchufla` queues a move from the second measure (beat 8); a list dances one call after another, each from the measure after `@` or right after the one before, so `?call=arriba,adentro@3,exhibo@5,dilequeno@7` walks arriba, goes in and out from beat 24, has la exhibo on beats 40-47 and the dile que no on beats 56-63. The ids are the keys of `MOVES` in `guapea/moves.js`; `arriba2` and `tarrito2` are those calls out of adentro y afuera, and `exhibo2` is la exhibo out of arriba. `?play=1` skips the title, `?role=follow`, `?move=enchufla` selects a move.

## Code

`guapea/` is plain ES modules served as static files, with no build step.

- `main.js`: the game loop, drawing the frame, the HUD, the moves list, the keys, the tune panel, and `window.rueda` for the tools.
- `moves.js`: the moves library. Each move has its name, its call, its bars, the blurb shown in the list, and where it can be called from (`from`) and what it leads to (`loop`, `to`).
- `figures/`: the bars the moves are made of, one figure per bar, by family: `guapea.js` (the guapea, dame, enchufla, doble and pelotas uno to tres), `two-hands.js` (exhíbela, sombrero, dile que no, setenta, setenta corrido, uno), `pelota.js`, `shines.js` (mambo, pelota de 4) and `arriba.js` (dile que si, arriba, the tarritos, adentro y afuera, la exhibo). A figure gives the lead and the follow a path round the circle and footsteps; the formats are explained above `GUAPEA`.
- `timeline.js`: the calls, which figure dances in which measure, and what the rueda does between moves.
- `body.js`: the dancers, where each one is (`root()`), and their bodies, legs and feet (`body()`).
- `hands.js`: where every hand goes, one function per kind of hold.
- `draw.js` and `plaza.js`: drawing the dancers and the floor.

## Tools

`tools/` has checks for working on the moves. They run the game in a headless Chromium with Playwright, so run `npm install` and `npx playwright install chromium` once first.

- `npm run check` dances every move in the library, each from the guapea, arriba or adentro y afuera as it needs, and reports per move: the biggest jump from one 0.05-beat step to the next of any pelvis, hand or heading (a snap), how far planted feet slide, how close any two dancers come, and anything the page throws. A number past the limits at the top of `tools/check.mjs` is marked with `!` and the command fails; the limits sit just above the worst the moves had when the tools were added, so they catch a move getting worse.
  - `npm run check -- --against HEAD` also dances them at that commit and says which moves now dance differently and from which beat, so a change can be seen to touch only the moves it should. Add `--pictures` to also compare the drawn frames every half beat, which takes a few minutes and shows that a change meant to change nothing on screen, such as a refactor, doesn't.
  - `--only setenta,uno` checks just those moves; `--query '&stand=1'` adds URL options.
- `npm run strip -- out.png setentacorrido 2 15 16 17 18` draws couple 2 (lead 2 and the girl nearest him) alone at those beats, side by side, labeled with the counts. The calls are what `?call=` takes (`''` for the guapea); `--all` draws everyone.

For them the game exposes `window.rueda`, with `pose(beat)` to pose everyone without drawing, `only(f)` to draw just the dancers `f` picks, and `moves`, `leads()`, `follows()`, `seek(beat)` and `proj`.

Everything below is the earlier work, listed at `prototypes.html`.

## Coin-op cabinets

- `arcade83/`: an early-80s vertical maze board (224x288). Top-down rueda, Namco-style wavetable band.
- `arcade86/`: a mid-80s sports coin-op (256x224). Wooden stage, bleachers, lamp scoreboard, NES-style band.
- `arcade92/`: an early-90s fighter (384x224). Side-on plaza, SABOR bars, 99 timer, FM band.

Each one runs the full loop: attract mode (title and demo pages), insert coin, pick lead or follow, a 99-second round, then game over. The hi-score is saved in localStorage.

Keys: Space/Enter/Z = the big ¡ENCHUFLA DOBLE! button, 5/C = coin, arrows or A/D = lead/follow, S = ½× práctica.

## Shared code

- `shared/dance.js`: the choreography (guapea, media enchufla, enchufla, dile que no) as keyframes per count, footwork, and the IK skeleton every version draws.
- `shared/game.js`: beat clock, call queue, timing judgment and score. The earlier prototypes also use its HTML HUD.
- `shared/audio.js`: synthesized casino band (clave, campana, congas, bass, piano) and sound effects.
- `shared/chip.js`: the same band on three sound chips (namco, nes, fm), plus a brass hook and coin-op sound effects.
- `shared/arcade.js`, `shared/arcade.css`: the cabinet (marquee, CRT, bezel cards, control panel) and the attract → select → play → over loop.
- `shared/sprite.js`: low-res sprite drawing snapped to a palette. `shared/font.js`: the 5x7 bitmap font.

## Earlier prototypes

`neon/`, `pixel/` and `toon/`. `toon/` uses three.js from `vendor/`.

## Running

Run `python3 serve.py 8000` and open http://localhost:8000/. The site is plain static files, deployed to GitHub Pages from `main`.

URL options:
- `?beat=18` freezes the clock at a beat. The enchufla doble runs from beat 8 to beat 32.
- `?role=follow`
- Cabinets only: `?state=attract|select|ready|play|over`, `?page=title|demo`, `?heat=0..1`.
- Earlier prototypes only: `?cam=close`, `?autoplay`.
