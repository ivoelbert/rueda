# Rueda

An arcade rueda de casino game.

## Guapea (current)

`guapea/` is an isometric pixel rueda that dances the guapea in unison, tuned for feel rather than accuracy. You are one dancer: tap Space (or click) on 1 and 5 to build sabor. The root page opens it.

- Keys: Space = tap, ◄ ► = lead/follow, S = ½× speed, M = mute, T = the tune panel.
- The tune panel's sliders (tempo, bounce, hips, step size, arm swing, styling, timing, springiness, looseness, couples) are saved in the URL, so a tuned version can be shared as a link.
- URL options: `?beat=N` freezes the clock at a beat (count 1 is beat 0), `?play=1` skips the title, `?role=follow`, `?sabor=0..1`.

Everything below is the earlier work, listed at `prototypes.html`.

## Coin-op cabinets (current)

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

Run `python3 serve.py 8000` (no caching, for development) or `node serve.mjs` (what the deployment runs) and open http://localhost:8000/.

URL options:
- `?beat=18` freezes the clock at a beat. The enchufla doble runs from beat 8 to beat 32.
- `?role=follow`
- Cabinets only: `?state=attract|select|ready|play|over`, `?page=title|demo`, `?heat=0..1`.
- Earlier prototypes only: `?cam=close`, `?autoplay`.
