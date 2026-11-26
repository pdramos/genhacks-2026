// "E SE...?" — a comparação da MESMA noite (em inglês: counterfactual).
// No fim do jogo, voltamos a jogar a noite do jogador (o mesmo nível, a mesma semente, o mesmo
// vento) mais duas vezes, às escondidas: uma sem fazer nada e outra com o plano do perito
// (level.expertPlan). Assim o jogador vê se foi o trabalho dele que salvou as casas, ou a sorte.
// Daqui também saem 0 a 2 frases curtas (as "lições"), em inglês, para o ecrã do fim.
// Só regras: sem Three.js. Testado em tests/counterfactual.test.js.
import { createVillage } from './village.js';
import { createBuildState, applyAction } from './actions.js';
import { runDisaster } from './fire.js';
import { resolveIgnition, pickIgnition } from './ignition.js';
import { windForLevel } from './weather.js';
import { countStars } from './stars.js';
import { TOO_EASY_STARS } from './balance.js';

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
// playerStart (opcional) = o quadrado onde o fogo do jogador começou MESMO ({ x, y }, de resolveIgnition).
// Devolve:
//   lucky = "noite com sorte": mesmo sem fazer nada, salvavam-se todas as casas e a escola.
//   showLuckyBanner = mostrar a faixa "Lucky night" no cartão do fim (ver luckyAndUntested).
//   movedStart = o plano do jogador mudou o sítio onde o fogo começa (ele mexeu no "?" que a
//     semente escolheu, e o cigarro rolou para o lado). Sem playerStart, fica false.
export function compareNight(level, seed, playerOutcome, playerStart = null) {
  const player = { ...playerOutcome, stars: countStars(playerOutcome) };
  const nothing = playPlan(level, seed, []);
  const expert = level.expertPlan ? playPlan(level, seed, level.expertPlan.actions) : null;
  const lucky = nothing.stars === 3;
  const picked = pickIgnition(level, seed);
  const movedStart = Boolean(playerStart) && (playerStart.x !== picked.x || playerStart.y !== picked.y);
  return { player, nothing, expert, lucky, showLuckyBanner: luckyAndUntested(lucky, player), movedStart };
}

// "Esta noite é fácil demais?" Sim quando, sem fazer nada, já se ganham TOO_EASY_STARS estrelas
// ou mais (balance.js). Demora cerca de 2 ms: joga a noite uma vez, sem nenhuma ação.
export function isTooEasyNight(level, seed) {
  return playPlan(level, seed, []).stars >= TOO_EASY_STARS;
}

// Sorteia a semente de um jogo novo, mas salta as noites fáceis demais: assim nenhum jogador
// apanha, por azar, uma primeira partida em que "não fazer nada" ganha.
//   nextSeed = a função que sorteia uma semente (no jogo: newSeed, em src/render/runState.js)
//   maxTries = quantas vezes tentar no máximo (cerca de 7 em cada 10 noites servem, por isso
//              50 tentativas falhadas seguidas são praticamente impossíveis; é só uma segurança
//              para níveis onde TODAS as noites são fáceis: aí devolve a última, sem ficar preso).
// Só serve para jogos novos: o "?seed=" do link e o "Try again (same night)" não passam por aqui.
export function pickNightSeed(level, nextSeed, maxTries = 50) {
  let seed = nextSeed();
  for (let tries = 1; tries < maxTries && isTooEasyNight(level, seed); tries++) seed = nextSeed();
  return seed;
}

// Noite com sorte E o jogador também com 3 estrelas: o plano dele não foi posto à prova.
// É a regra da faixa "Lucky night" (hud.js) e da lição de sorte: vive só aqui, para as duas
// nunca discordarem. (Se o jogador ficou abaixo das 3 estrelas, dizer "sorte" era mentira.)
export function luckyAndUntested(lucky, player) {
  return lucky && player.stars === 3;
}

// Que parte do orçamento pode sobrar sem ser lição (25%).
const UNSPENT_SHARE = 0.25;
// Quantas casas a mais o perito tem de salvar para valer uma lição.
const EXPERT_GAP = 10;
// No máximo quantas frases mostramos (mais do que isto ninguém lê).
const MAX_LESSONS = 2;

// As frases do fim da noite, da mais útil para a menos útil. Devolve 0 a 2 frases (inglês).
// windFrom = de onde vem o vento, como na rosa dos ventos ('N', 'NE', 'SSW'...).
// movedStart = o plano do jogador mudou o sítio onde o fogo começa (vem do compareNight).
export function nightLessons({ player, nothing, expert, lucky, movedStart = false, spent, budget, windFrom, schoolName }) {
  // Noite com sorte E o jogador também com 3 estrelas: o plano não foi posto à prova,
  // por isso não o julgamos.
  if (luckyAndUntested(lucky, player)) {
    return ['Lucky night: even doing nothing, the fire would have missed every house. Play again for a harder night.'];
  }

  const lessons = [];
  let gaveDownwindTip = false;

  // a) Perdeu a escola (o quartel): é o mais importante, sem ela não há estrelas.
  if (!player.schoolSaved) {
    const name = (schoolName || 'school').toLowerCase();
    lessons.push(`You lost the ${name}: without it there are no stars. Protect the strips around it first.`);
  }

  // b) Noite com sorte, mas o jogador ficou PIOR do que sem fazer nada. Dizemos a verdade em vez
  //    de "noite com sorte". Há duas maneiras de isto acontecer:
  //    - ele mexeu no "?" do cigarro (movedStart): o fogo não se apaga, só começa no mato seco ao
  //      lado (ver ignition.js), e esse sítio novo pode ser pior;
  //    - o fogo começou no mesmo sítio, mas as mudanças dele levaram-no por outro caminho.
  //    (Esta frase substitui a próxima, que diria quase o mesmo.)
  const worseThanLucky = lucky && player.stars < 3;
  if (worseThanLucky) {
    const why = movedStart
      ? 'work on a ? spot only moves the start to the dry scrub beside it.'
      : 'your changes sent the fire a different way.';
    lessons.push(`Doing nothing would have saved every house tonight: ${why}`);
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
    // Quem não gastou nada não fez "trabalho": dizemos-lhe isso mesmo, com a mesma dica.
    const opening = spent === 0
      ? "You didn't prepare anything, so tonight was the same as doing nothing."
      : 'Your work saved no more houses than doing nothing.';
    lessons.push(`${opening} ${tip}`);
    gaveDownwindTip = true;
  }

  // d) O perito, nesta mesma noite, salvou muitas mais casas.
  const expertGap = expert ? expert.housesSaved - player.housesSaved : 0;
  if (expertGap >= EXPERT_GAP) {
    // Se a dica do vento já foi dada (frase c), não a repetimos.
    // A dica diz o que o plano do perito (level.expertPlan) faz MESMO: trabalha nos "?" e logo
    // a favor do vento deles, e na ravina por cima do quartel.
    const tip = gaveDownwindTip ? '' : ': firebreaks and cleared scrub on and just downwind of the ? spots, and in the ravine above the fire station';
    lessons.push(`On this same night the expert plan saved ${expertGap} more houses${tip}.`);
  }

  // e) Sobrou muito dinheiro (e a noite não foi perfeita).
  const unspent = budget - spent;
  if (player.stars < 3 && unspent > budget * UNSPENT_SHARE) {
    lessons.push(`You left ${euros(unspent)} unspent: every euro in the right strip counts.`);
  }

  // f) Igualou ou bateu o perito: tantas estrelas e tantas casas como ele.
  //    Só com a escola (o quartel) salva: sem ela não há elogio.
  //    E só se o trabalho valeu alguma coisa: se a frase b) ou c) já disse que ficar parado era
  //    igual ou melhor, "bateste o perito" contradizia-as (há noites em que o perito faz pior
  //    do que não fazer nada).
  if (expert && player.schoolSaved && !worseThanLucky && !noBetterThanNothing
    && player.stars >= expert.stars && player.housesSaved >= expert.housesSaved) {
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
