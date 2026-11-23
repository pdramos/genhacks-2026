// O VENTO VERDADEIRO do dia: transforma os dados por hora do Open-Meteo (level.wind.hourly)
// numa função "passo -> vento", que a simulação do fogo (runDisaster) aceita.
// Cada passo do fogo são 10 minutos; o passo 0 é a hora da ignição (level.date).
// Sem dados por hora, o vento é sempre o mesmo (level.wind).

// Quantos minutos simulados dura cada passo do fogo.
export const STEP_MINUTES = 10;

// Devolve uma função (step) => { direction, speed, gust, time? }.
export function windForLevel(level) {
  const { hourly, ...fixed } = level.wind;
  if (!hourly || hourly.length === 0) {
    const wind = { direction: fixed.direction, speed: fixed.speed };
    if (fixed.gust !== undefined) wind.gust = fixed.gust;
    return () => wind;
  }
  // Quantos minutos depois da primeira hora dos dados começa o fogo (ex.: 22:50 -> 50).
  const startMinutes = minutesBetween(hourly[0].time, level.date);
  return (step) => {
    const hour = Math.floor((startMinutes + step * STEP_MINUTES) / 60);
    return hourly[Math.min(hourly.length - 1, Math.max(0, hour))];
  };
}

// Minutos de "from" até "to" (textos de data como '2018-10-06T22:50'). Sem "to", dá 0.
function minutesBetween(from, to) {
  if (!from || !to) return 0;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 60000)) : 0;
}

// ---------- Palavras da bússola ----------
// As 8 direções da rosa dos ventos, por extenso, a rodar no sentido dos ponteiros do relógio
// a partir do norte (de 45 em 45 graus).
const COMPASS_WORDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

// Graus -> a palavra da direção mais perto: 0 -> 'north', 45 -> 'north-east', 180 -> 'south'.
// Cada palavra "apanha" 45 graus: 'north' vai de 337.5 até antes de 22.5.
// Os limites (22.5, 67.5, ...) vão sempre para a direção seguinte no sentido dos ponteiros
// (22.5 -> 'north-east', 337.5 -> 'north').
// Ângulos negativos ou maiores do que 360 dão a volta (-90 -> 'west', 450 -> 'east').
// Um número que não existe (NaN) dá null.
// Dica: a direção do vento diz de onde ele VEM; para onde vai o fogo é compassWord(graus + 180).
export function compassWord(degrees) {
  if (!Number.isFinite(degrees)) return null;
  // Primeiro pomos o ângulo entre 0 e 360 (ex.: -22.5 -> 337.5), para os limites ficarem iguais.
  const turned = ((degrees % 360) + 360) % 360;
  return COMPASS_WORDS[Math.round(turned / 45) % 8];
}
