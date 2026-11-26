import { ADENTRO, ADENTRO_IN, ARRIBA, ARRIBA_DILE, DILE_QUE_SI, EXHIBO, EXHIBO_IN, TARRITO, TARRITO_AD } from './figures/arriba.js';
import { DAME, DAME_AFTER_ENCHUFLA, DAME_CLAP, DOBLE, ENCHUFLA, ENCHUFLA_AFTER_DOBLE, PELOTA_1, PELOTA_2 } from './figures/guapea.js';
import { PELOTA_GOLPE, PELOTA_IN, PELOTA_OUT } from './figures/pelota.js';
import { MAMBO, MAMBO_ALL, PELOTA4_TURN } from './figures/shines.js';
import { DILE_QUE_NO, EXHIBELA, SETENTA_CORRIDO, SETENTA_DILE, SETENTA_ENCHUFLA, SETENTA_LOCK, SETENTA_TURNS, SOMBRERO, UNO, UNO_CORONACION } from './figures/two-hands.js';

// The moves library, in the order the list shows them. A move is called on
// 5, starts on the next 1 and dances its bars, one figure (figures/) per 8
// counts, then goes back to the guapea, or on into its loop.

export const MOVES = {
  dame: {
    id: 'dame', name: 'DAME', say: '¡Dame!', bars: [DAME],
    blurb: 'Dile que no with the girl on your right. The girls move on one place, so everyone has a new partner.',
  },
  enchufla: {
    id: 'enchufla', name: 'ENCHUFLA', say: '¡Enchufla!', bars: [ENCHUFLA, DAME_AFTER_ENCHUFLA],
    blurb: 'She turns under his arm and they swap places, then he walks on to the girl on his right for a dame. Everyone has a new partner.',
  },
  doble: {
    id: 'doble', name: 'ENCHUFLA DOBLE', say: '¡Enchufla doble!', bars: [DOBLE, ENCHUFLA_AFTER_DOBLE, DAME_AFTER_ENCHUFLA],
    blurb: 'She starts the enchufla; on 5 his hand on her back stops her, her free arm goes up, and he sends her back. Then a whole enchufla. Everyone has a new partner.',
  },
  sombrero: {
    id: 'sombrero', name: 'SOMBRERO', say: '¡Sombrero!', bars: [EXHIBELA, SOMBRERO, DILE_QUE_NO, DAME],
    blurb: 'Both hands crossed: an exhíbela, then an enchufla without letting go, and on 7 the coronación, each wearing the other\'s arm as a hat. A dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  setenta: {
    id: 'setenta', name: 'SETENTA', say: '¡Setenta!', bars: [SETENTA_LOCK, SETENTA_ENCHUFLA, SETENTA_TURNS, SETENTA_DILE, DAME],
    blurb: 'Both hands: an exhíbela that wraps her left arm behind her back, an enchufla without letting go that unwinds it, then his enchufla and hers, round like gears. A dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  setentacorrido: {
    id: 'setentacorrido', name: 'SETENTA CORRIDO', say: '¡Setenta corrido!', bars: [SETENTA_LOCK, SETENTA_CORRIDO, SETENTA_ENCHUFLA, SETENTA_TURNS, SETENTA_DILE, DAME],
    blurb: 'A setenta, but once her arm is wrapped behind her back the couple walks once round each other, clockwise, still wrapped. Then the rest of the setenta. Everyone has a new partner.',
  },
  uno: {
    id: 'uno', name: 'UNO', say: '¡Uno!', bars: [UNO, UNO_CORONACION, DILE_QUE_NO, DAME],
    blurb: 'Hands like a handshake, he steps in behind her and they swap sides behind each other; on 5 her arm goes over her head into the coronación. A dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  pelota1: {
    id: 'pelota1', name: 'PELOTA UNO', say: '¡Pelota uno!', bars: [PELOTA_1, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla, and everyone claps on 7 on the way to the new partner. Then the dame. Everyone has a new partner.',
  },
  pelota2: {
    id: 'pelota2', name: 'PELOTA DOS', say: '¡Pelota dos!', bars: [PELOTA_2, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla with two claps, on 7 and 8, then the dame. Everyone has a new partner.',
  },
  pelota3: {
    id: 'pelota3', name: 'PELOTA TRES', say: '¡Pelota tres!', bars: [PELOTA_2, DAME_CLAP],
    blurb: 'An enchufla with three claps, on 7, 8 and the dame\'s 1, then the rest of the dame. Everyone has a new partner.',
  },
  festival: {
    id: 'festival', name: 'FESTIVAL PELOTA', say: '¡Festival pelota!', bars: [PELOTA_1, DAME_AFTER_ENCHUFLA, PELOTA_2, DAME_AFTER_ENCHUFLA, PELOTA_2, DAME_CLAP],
    blurb: 'Pelota uno, dos and tres back to back: one clap, then two, then three, with a new partner each time.',
  },
  pelota: {
    id: 'pelota', name: 'PELOTA', say: '¡Pelota!', bars: [PELOTA_IN, PELOTA_GOLPE, PELOTA_OUT, SETENTA_DILE, DAME],
    blurb: 'An enchufla that takes the guys inside the circle and the girls outside. On 1 the golpe: guys point to the center, girls out. She turns, he turns, an enchufla back into line, a dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  dobleplay: {
    id: 'dobleplay', name: 'DOBLE PLAY CON MAMBO', say: '¡Doble play con mambo!', bars: [ENCHUFLA, MAMBO, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla that stops facing the next girl for the mambo: everyone taps the left foot, then the right, the other hand reaching forward, and claps on 5 and 7 as the feet keep going. Then a dame with her. Everyone has a new partner.',
  },
  pelota4: {
    id: 'pelota4', name: 'PELOTA DE 4', say: '¡Pelota de cuatro!', bars: [ENCHUFLA, MAMBO_ALL, PELOTA4_TURN, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla that stops facing the next girl, a whole bar of mambo, then everyone turns once round to the left in four quarters, clapping on each: 1, 3, 5 and 7. Then a dame with her. Everyone has a new partner.',
  },
  // from: what the rueda must be doing for the move to be called (arriba,
  // adentro y afuera, or a list); the rest are called from the guapea.
  // loop: after its bars the move goes on with this figure until the next
  // call, and to: what the rueda is doing then.
  arriba: {
    id: 'arriba', name: 'ARRIBA', say: '¡Arriba!', bars: [DILE_QUE_SI], loop: ARRIBA, to: 'arriba',
    blurb: 'A dile que si: a short extension, then a half turn together into the closed hold. The rueda closes up and every couple walks round the circle, a place a bar, the joined hands pumping, until the next call.',
  },
  dilequeno: {
    id: 'dilequeno', name: 'DILE QUE NO', say: '¡Dile que no!', bars: [ARRIBA_DILE], from: ['arriba', 'adentro'],
    blurb: 'Out of the closed hold: she crosses in front of him and they are back in the guapea, with the same partner, where they walked to.',
  },
  tarrito: {
    id: 'tarrito', name: 'TARRITO', say: '¡Tarrito!', bars: [TARRITO], from: 'arriba', loop: ARRIBA, to: 'arriba',
    blurb: 'The joined hands go up into an arch and he walks on under her arm while she keeps walking. By the 8 he has the girl ahead in the closed hold and they walk on arriba. Everyone has a new partner.',
  },
  tuya: {
    id: 'tuya', name: 'TARRITO HASTA LA TUYA', say: '¡Tarrito hasta la tuya!', bars: [], from: 'arriba', loop: ARRIBA, to: 'arriba',
    blurb: 'A tarrito, but he walks on round the inside of the circle, past every girl, until he is back with his own. Then they walk on arriba.',
  },
  adentro: {
    id: 'adentro', name: 'ADENTRO Y AFUERA', say: '¡Adentro y afuera!', bars: [ADENTRO_IN], from: 'arriba', loop: ADENTRO, to: 'adentro',
    blurb: 'They stop walking and, in the closed hold, he steps in on 1 as she turns to face the center and steps out, and on 5 the other way round, meeting in the middle on 3 and 7. Again and again until the next call.',
  },
  // Arriba again out of adentro y afuera: they walk on from the middle.
  arriba2: {
    id: 'arriba2', name: 'ARRIBA', say: '¡Arriba!', bars: [ARRIBA], from: 'adentro', loop: ARRIBA, to: 'arriba',
    blurb: 'Out of adentro y afuera they walk on round the circle in the closed hold, a place a bar, the joined hands pumping, until the next call.',
  },
  // loopIn: the loop's first bar after the move's own.
  tarrito2: {
    id: 'tarrito2', name: 'TARRITO', say: '¡Tarrito!', bars: [TARRITO_AD], from: 'adentro', loop: ADENTRO, loopIn: ADENTRO_IN, to: 'adentro',
    blurb: 'The joined hands go up into an arch and he walks under her arm to the next girl, who waits stepping in place. By the 8 he has her in the closed hold, and they go on in and out. Everyone has a new partner.',
  },
  // La exhibo out of adentro y afuera, and out of arriba (exhibo2).
  exhibo: {
    id: 'exhibo', name: 'LA EXHIBO', say: '¡La exhibo!', bars: [EXHIBO], from: 'adentro', loop: ADENTRO, to: 'adentro',
    blurb: 'On 1-2-3 the in and out, but she stays facing the center and walks on into it. On 5 he lifts the joined hands, she reaches out to the center with her free arm and turns once round under them. Then they go on in and out.',
  },
  exhibo2: {
    id: 'exhibo2', name: 'LA EXHIBO', say: '¡La exhibo!', bars: [EXHIBO_IN], from: 'arriba', loop: ADENTRO, to: 'adentro',
    blurb: 'They stop walking and go in and out, but on 2-3 she stays facing the center and walks on into it. On 5 he lifts the joined hands, she reaches out to the center with her free arm and turns once round under them. Then they go on in and out.',
  },
};
