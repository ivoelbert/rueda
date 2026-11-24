# Rueda

An arcade rueda de casino game.

## Guapea and the moves library (current)

`guapea/` is an isometric pixel rueda that dances the guapea in unison, tuned for feel rather than accuracy. The root page opens it.

The moves library on the left lists the calls. Pick one and press Space (or tap the game): the whole rueda dances it from the next 1, then goes back to the guapea. As in a real rueda, call on 5: a move prepares on the 7 and 8 before its 1, so a call made on 7 or 8 waits for the 1 after. A second call can be queued while a move is running; during a longer move it waits for the move to end. So far there are six moves:

- **Dame**: a dile que no with the girl on your right. On the 7 and 8 before it, the leads and the girls on their right turn about a quarter round toward each other and drift away from their partners, still holding hands. On 1 every lead lets go, turns to face the center and steps in, and the girl on his right turns half round to her left into his arms: his right hand on her back, her left arm up and then over onto his back by the 3. On 5 his left hand takes her right and she crosses in front of him, turning on 6 to face him, so everyone is home by 7. The leads keep their places and the girls move on one place, so everyone has a new partner.
- **Enchufla**: two bars, the enchufla and then a dame. On the 7 and 8 before it, the joined hands come up between each couple. On 1 the lead breaks back and lifts her right hand over her head; on 2-3 she walks across in front of him, turning half round to her left under his arm, while he passes behind her turning half round to his right, so by 4 they have swapped places and are already starting back. On 5 they let go and walk back past each other, him on the inside, each turning to face the new partner (the girl on his right) as they come together. They keep looking at each other and keep moving through 8, flowing straight into the dame's 1. The second bar is that dame, so everyone has a new partner. Since the leads keep their places, he walks back to his spot instead of on around the circle.
- **Enchufla doble**: three bars, a half enchufla and then a whole enchufla. It starts like the enchufla: on 2-3-4 she walks forward turning to her left under his arm, without a pause on 4. They pass each other as in the enchufla, and on 5, once they have crossed and he is beyond her at her left side, his right hand on her back stops her partway round. They turn their heads to look at each other while she throws her left arm up, out in front of her so it clears his head. On 5-6-7 he sends her back under his arm, spinning her to her right a little past facing him, and they keep moving through 8 to be home on the next 1, hands up, for the enchufla (with its dame).
- **Sombrero**: four bars with both hands held and crossed: his right holds her right, and his left holds her left. On the 7 and 8 before it he takes both her hands, his right on top. First bar, an exhíbela: on 1 they open out a little and on 2-3 they come back in lifting both hands up over her head, so on 5-6-7 she turns once round to her right under them, which crosses them the other way, his left on top. Second bar, an enchufla without letting go: on 1 the hands go up over her head, and on 2-3 they pass right shoulder to right shoulder, she on the inside turning to her left under the hands. They finish it on 4-5 a step apart, swapped, her on his right, turned toward each other halfway between facing the center and facing each other, the joined hands down low between them. On 5-6 they step back in lifting the hands over their heads, and on 7 comes the coronación: his left hand takes her left over his head and his right takes her right over hers, so each wears the other's arm as a hat. On 8 they let go of both hands: his right arm round her and her left round him slide down onto each other's backs, which is the dile que no's hold, and the outside hands come down free. Third bar, the dile que no from that hold, so nobody's arm goes up as she turns to face him on 1-2-3. On 5-6-7 she crosses in front of him back to her side, his left hand holding her right, handing her on to the next guy. Fourth bar, the dame: everyone has a new partner.
- **Setenta**: five bars. On the 7 and 8 before it he takes both her hands, straight: his left holds her right, and his right her left. First bar, an exhíbela that locks her arm: on 1-2-3 his left hand takes her right up over her head while his right keeps hers low at the waist, and on 5-6-7 she turns once round to her right under the high hands. The low hands go round her as she turns, so her left arm ends wrapped behind her back, his right hand holding it there round her right side; he faces the same way throughout. Then three swaps of places in a row, one per half bar, so the couple goes round each other like gears, with no stop on 4 or 8. Second bar, an enchufla without letting go: on 1-2-3 they ease a little apart, and on 5-6-7 his left hand takes her right over her head and she turns half round to her left on the inside while he walks round her on the outside, which unwinds her arm, so they finish swapped holding both hands in front. Third bar: on 1-2-3 it is his enchufla, letting go with his left, taking her left hand up over his own head with his right and turning half round to his left under it on the inside while she walks round him; on 4 his left takes her right again. On 5-6-7 she does the last enchufla: he lets go with his right and she turns half round to her left under his left hand, so they finish swapped. Fourth bar, a dile que no from there, his left hand keeping hers, handing her on to the next guy. Fifth bar, the dame: everyone has a new partner.
- **Uno**: four bars with both hands held like a handshake, his right in her right and his left in her left, while he dances behind her and they swap sides like a windshield wiper. On whichever side he is, her arm on that side is wrapped behind her back, held there by his hand. First bar: on 1 his right hand takes her right and she walks past him on the inside, right shoulder to right shoulder; on 2-3 she turns a quarter to her left to face the center and he steps in behind her on her left, turning a quarter to his right, so her right arm wraps behind her back, and his left takes her left. On 5-6-7 they swap sides: she slides to her left in front of him and he to his right behind her, so her right arm comes out and her left wraps behind her back. Second bar: on 1-2-3 they swap back. On 5 his right hand brings her right arm out by her side and up over her head, and on 5-6-7 he steps up beside her on her left, both turning toward each other, while her left hand goes up over his head: the coronación on 7, as in the sombrero. On 8 they let go into the dile que no's hold. Third bar, the sombrero's dile que no, handing her on to the next guy; fourth bar, the dame: everyone has a new partner.

Moves live in `MOVES` in `guapea/main.js`. A move is one or more bars of 8 counts, and each bar is a figure that gives the lead and the follow a root path around the circle (places traveled, distance from the center, turn; the first bar can start at -2, on the 7 before the move), pelvis and footstep keys per count, and how many places the girls move on (`shift`). The hands for each figure are scripted in `hands()`.

- Keys: Space = call the selected move, ▲ ▼ or 1-9 = pick a move, ◄ ► = lead/follow, S = ½× speed, M = mute, T = the tune panel.
- The tune panel's sliders (tempo, bounce, hips, step size, arm swing, styling, timing, springiness, looseness, couples) are saved in the URL, so a tuned version can be shared as a link.
- URL options: `?beat=N` freezes the clock at a beat (count 1 is beat 0), `?call=dame` queues that move from the second measure (beat 8 on; the enchufla runs to beat 24, `?call=doble` to beat 32, `?call=sombrero` and `?call=uno` to beat 40, and `?call=setenta` to beat 48), `?play=1` skips the title, `?role=follow`, `?move=enchufla` selects a move.

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
