# Rueda

An arcade rueda de casino game.

## Guapea and the moves library (current)

`guapea/` is an isometric pixel rueda that dances the guapea in unison, tuned for feel rather than accuracy. The root page opens it.

The moves library on the left lists the calls. Pick one and press Space (or tap the game): the whole rueda dances it from the next 1, then goes back to the guapea. As in a real rueda, call on 5: a move prepares on the 7 and 8 before its 1, so a call made on 7 or 8 waits for the 1 after. A second call can be queued while a move is running. So far there is one move:

- **Dame**: a dile que no with the girl on your right. On the 7 and 8 before it, the leads and the girls on their right turn about a quarter round toward each other and drift away from their partners, still holding hands. On 1 every lead lets go, turns to face the center and steps in, and the girl on his right turns half round to her left into his arms: his right hand on her back, her left arm up and then over onto his back by the 3. On 5 his left hand takes her right and she crosses in front of him, turning on 6 to face him, so everyone is home by 7. The leads keep their places and the girls move on one place, so everyone has a new partner.

Moves live in `MOVES` in `guapea/main.js`. Each one gives the lead and the follow a root path around the circle (places traveled, distance from the center, turn; it can start at -2, on the 7 before the move), pelvis and footstep keys per count, and how many places the girls move on (`shift`). The hands for a move are scripted in `hands()`.

- Keys: Space = call the selected move, ▲ ▼ or 1-9 = pick a move, ◄ ► = lead/follow, S = ½× speed, M = mute, T = the tune panel.
- The tune panel's sliders (tempo, bounce, hips, step size, arm swing, styling, timing, springiness, looseness, couples) are saved in the URL, so a tuned version can be shared as a link.
- URL options: `?beat=N` freezes the clock at a beat (count 1 is beat 0), `?call=dame` queues that move for the second measure (beats 8 to 16), `?play=1` skips the title, `?role=follow`, `?move=dame` selects a move.

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
