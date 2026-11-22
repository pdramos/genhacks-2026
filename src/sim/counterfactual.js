// "E SE...?" — a comparação da MESMA noite (em inglês: counterfactual).
// No fim do jogo, voltamos a jogar a noite do jogador (o mesmo nível, a mesma semente, o mesmo
// vento) mais duas vezes, às escondidas: uma sem fazer nada e outra com o plano do perito
// (level.expertPlan). Assim o jogador vê se foi o trabalho dele que salvou as casas, ou a sorte.
// Daqui também saem 0 a 2 frases curtas (as "lições"), em inglês, para o ecrã do fim.
// Só regras: sem Three.js. Testado em tests/counterfactual.test.js.
import { createVillage } from './village.js';
import { createBuildState, applyAction } from './actions.js';
import { runDisaster } from './fire.js';
import { resolveIgnition } from './ignition.js';
import { windForLevel } from './weather.js';
import { countStars } from './stars.js';

// Joga UMA noite do princípio ao fim com uma lista de ações [{ x, y, action }, ...].
// São os mesmos passos do jogo (e do tests/balance.test.js): vila nova, ações, onde cai o
// cigarro, vento verdadeiro, fogo. As ações recusadas (sem dinheiro, fora da lei...) são saltadas.
export function playPlan(level, seed, actions) {
  const village = createVillage(level);
  const state = createBuildState(village, level.budget);
  for (const { x, y, action } of actions) applyAction(state, x, y, action);
  const { outcome } = runDisaster(village, {
    ignition: resolveIgnition(village, level, seed),
    wind: windForLevel(level),
    seed,
  });
  const { housesSaved, housesTotal, schoolSaved } = outcome;
  return { housesSaved, housesTotal, schoolSaved, stars: countStars(outcome) };
}

// Compara a noite do jogador com "não fazer nada" e com o perito, na MESMA noite.
// playerOutcome = o resultado do fogo do jogador ({ housesSaved, housesTotal, schoolSaved, ... }).
// lucky = "noite com sorte": mesmo sem fazer nada, salvavam-se todas as casas e a escola.
export function compareNight(level, seed, playerOutcome) {
  const player = { ...playerOutcome, stars: countStars(playerOutcome) };
  const nothing = playPlan(level, seed, []);
  const expert = level.expertPlan ? playPlan(level, seed, level.expertPlan.actions) : null;
  return { player, nothing, expert, lucky: nothing.stars === 3 };
}

// Que parte do orçamento pode sobrar sem ser lição (25%).
const UNSPENT_SHARE = 0.25;
// Quantas casas a mais o perito tem de salvar para valer uma lição.
const EXPERT_GAP = 10;
// No máximo quantas frases mostramos (mais do que isto ninguém lê).
const MAX_LESSONS = 2;

// As frases do fim da noite, da mais útil para a menos útil. Devolve 0 a 2 frases (inglês).
// windFrom = de onde vem o vento, como na rosa dos ventos ('N', 'NE', 'SSW'...).
export function nightLessons({ player, nothing, expert, lucky, spent, budget, windFrom, schoolName }) {
  // Noite com sorte E o jogador também com 3 estrelas: o plano não foi posto à prova,
  // por isso não o julgamos.
  if (lucky && player.stars === 3) {
    return ['Lucky night: even doing nothing, the fire would have missed every house. Play again for a harder night.'];
  }

  const lessons = [];
  let gaveDownwindTip = false;

  // a) Perdeu a escola (o quartel): é o mais importante, sem ela não há estrelas.
  if (!player.schoolSaved) {
    const name = (schoolName || 'school').toLowerCase();
    lessons.push(`You lost the ${name}: without it there are no stars. Protect the strips around it first.`);
  }

  // b) Noite com sorte, mas o jogador ficou PIOR do que sem fazer nada. Acontece quando ele mexe
  //    no "?" do cigarro: o fogo não se apaga, só começa no mato seco ao lado (ver ignition.js),
  //    e esse sítio novo pode ser pior. Dizemos a verdade em vez de "noite com sorte".
  //    (Esta frase substitui a próxima, que diria quase o mesmo.)
  const worseThanLucky = lucky && player.stars < 3;
  if (worseThanLucky) {
    lessons.push('Doing nothing would have saved every house tonight: work on a ? spot only moves the start to the dry scrub beside it.');
  }

  // c) O trabalho não salvou mais casas do que ficar parado: falta pensar no vento.
  //    (Se o jogador salvou a escola e "não fazer nada" não, o trabalho valeu: não há lição.)
  const noBetterThanNothing = !worseThanLucky && nothing
    && player.housesSaved <= nothing.housesSaved
    && player.stars <= nothing.stars
    && player.housesSaved < player.housesTotal;
  if (noBetterThanNothing) {
    const from = compassWords(windFrom);
    const to = compassWords(oppositeOf(windFrom));
    const tip = from && to
      ? `The wind blows from the ${from}: work just ${to} (downwind) of the ? spots.`
      : 'Work just downwind of the ? spots.';
    lessons.push(`Your work saved no more houses than doing nothing. ${tip}`);
    gaveDownwindTip = true;
  }

  // d) O perito, nesta mesma noite, salvou muitas mais casas.
  const expertGap = expert ? expert.housesSaved - player.housesSaved : 0;
  if (expertGap >= EXPERT_GAP) {
    // Se a dica do vento já foi dada (frase c), não a repetimos.
    const tip = gaveDownwindTip ? '' : ': firebreaks just downwind of each ? spot';
    lessons.push(`On this same night the expert plan saved ${expertGap} more houses${tip}.`);
  }

  // e) Sobrou muito dinheiro (e a noite não foi perfeita).
  const unspent = budget - spent;
  if (player.stars < 3 && unspent > budget * UNSPENT_SHARE) {
    lessons.push(`You left ${euros(unspent)} unspent: every euro in the right strip counts.`);
  }

  // f) Igualou ou bateu o perito (com a escola salva, ou pelo menos tantas estrelas como ele).
  if (expert && player.stars >= expert.stars && player.housesSaved >= expert.housesSaved) {
    const verb = player.housesSaved > expert.housesSaved || player.stars > expert.stars ? 'beat' : 'matched';
    lessons.push(`You ${verb} the expert plan on this night!`);
  }

  return lessons.slice(0, MAX_LESSONS);
}

// ---------- Ajudantes ----------

// A rosa dos ventos com 16 pontas, a rodar no sentido dos ponteiros do relógio a partir do norte.
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const LETTER_WORDS = { N: 'north', E: 'east', S: 'south', W: 'west' };

// O lado oposto da rosa dos ventos ('N' -> 'S', 'NE' -> 'SW'). É para onde o vento EMPURRA o fogo.
// Um nome desconhecido dá null.
function oppositeOf(name) {
  const index = COMPASS.indexOf(String(name).toUpperCase());
  return index === -1 ? null : COMPASS[(index + COMPASS.length / 2) % COMPASS.length];
}

// 'NE' -> 'north-east', 'SSW' -> 'south-south-west'. Um nome desconhecido dá null.
function compassWords(name) {
  if (!name || !COMPASS.includes(String(name).toUpperCase())) return null;
  return [...String(name).toUpperCase()].map((letter) => LETTER_WORDS[letter]).join('-');
}

// 4300 -> '€4,300' (dinheiro escrito à maneira inglesa, como no resto do jogo).
function euros(amount) {
  return `€${Math.round(amount).toLocaleString('en-US')}`;
}
