// O som do jogo, todo SINTETIZADO com a Web Audio API: não há ficheiros de áudio.
// Os "ingredientes" são só dois:
//   - osciladores (ondas que dão uma nota: sine, triangle, square, sawtooth);
//   - ruído (um chiado aleatório) passado por filtros, que soa a vento, fogo ou pneus.
// Cada som é uma nota ou um chiado com um "envelope": o volume sobe depressa e desce devagar.
//
// API (ver docs/integration-contract.md):
//   initAudio()          -> liga o som; chamar no primeiro clique/tecla (regra de autoplay)
//   setAmbience(phase)   -> 'build' = vento leve + pássaros; 'disaster' = vento forte
//   setFireLevel(0..1)   -> o crepitar e o rugido do fogo seguem este valor
//   play(name)           -> 'click', 'build', 'error', 'car', 'ignite', 'siren', 'win', 'lose'
//   setMuted(bool), isMuted()
//   fireLevelFromCount(n)-> quantos quadrados a arder -> nível do fogo 0..1
//   getAudioDebug()      -> estado interno, para testar no navegador
//
// Este ficheiro não toca no "window" quando é carregado, por isso também corre nos testes do Node.

// ---------- Estado ----------
let ctx = null;          // o AudioContext (a "mesa de som")
let master = null;       // volume geral (o mute põe-no a 0)
let ambienceBus = null;  // vento, pássaros e fogo passam por aqui
let sfxBus = null;       // sons curtos (cliques, carro, sirene...)
let noiseBuffer = null;  // 2 segundos de ruído branco, reutilizados por todos os sons
let wind = null;         // a cadeia do vento (fica sempre ligada)
let fire = null;         // a cadeia do rugido do fogo (fica sempre ligada)
let ticker = null;       // relógio que agenda rajadas, pássaros e estalidos

let muted = false;
let phase = 'build';     // a fase pedida (lembrada mesmo antes do initAudio)
let fireLevel = 0;
let liveVoices = 0;      // quantos sons curtos estão a tocar agora (para ver se não há fugas)
let lastSound = null;    // o último som pedido ao play() (para testar)
let nextBirdAt = 0;      // quando cantam os próximos pássaros (segundos do AudioContext)
let nextGustAt = 0;      // quando muda a próxima rajada de vento

// ---------- API pública ----------

// Liga o som. Devolve true se há som, false se o navegador não tem Web Audio.
export function initAudio() {
  if (ctx) {
    if (!muted && ctx.state === 'suspended') ctx.resume();
    return true;
  }
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return false;

  ctx = new AudioContextClass();
  buildMixer();
  wind = createWind();
  fire = createFireRoar();
  applyAmbience();
  applyFireLevel();
  ticker = setInterval(tick, 100);
  if (muted) ctx.suspend();
  return true;
}

export function setAmbience(newPhase) {
  phase = newPhase;
  if (ctx) applyAmbience();
}

export function setFireLevel(level) {
  const clamped = Math.max(0, Math.min(1, Number(level) || 0));
  // Mudança muito pequena: não vale a pena mexer no som (o 0 exato passa sempre, para calar o fogo).
  if (clamped === fireLevel || (Math.abs(clamped - fireLevel) < 0.01 && clamped !== 0)) return;
  fireLevel = clamped;
  if (ctx) applyFireLevel();
}

export function play(name) {
  lastSound = name;
  if (!ctx || muted || ctx.state !== 'running') return;
  const sound = SOUNDS[name];
  if (sound) sound(ctx.currentTime + 0.01);
}

export function setMuted(value) {
  muted = Boolean(value);
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.05);
  // Com o som desligado, suspendemos a mesa de som: o computador deixa de fazer contas.
  if (muted) setTimeout(() => { if (muted) ctx.suspend(); }, 250);
  else ctx.resume();
}

export function isMuted() { return muted; }

// 0 quadrados -> 0; uns 40 quadrados a arder já é fogo "cheio" (1).
// A raiz quadrada faz os primeiros quadrados já se ouvirem bem.
export function fireLevelFromCount(count, fullAt = 40) {
  if (count <= 0) return 0;
  return Math.min(1, Math.sqrt(count / fullAt));
}

export function getAudioDebug() {
  return { state: ctx ? ctx.state : 'none', muted, phase, fireLevel, liveVoices, lastSound };
}

// ---------- A mesa de som ----------
// sons -> ambienceBus / sfxBus -> master -> compressor -> colunas
// O compressor impede que muitos sons juntos "rebentem" (distorção).
function buildMixer() {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.ratio.value = 4;
  compressor.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(compressor);

  ambienceBus = makeGain(0.9, master);
  sfxBus = makeGain(0.8, master);

  // Ruído branco: números aleatórios entre -1 e 1.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

// ---------- Vento (sempre ligado; muda com a fase) ----------
// Ruído -> filtro "bandpass" (deixa passar só uma faixa de sons) -> volume.
// Mexer na frequência do filtro e no volume aos poucos dá as rajadas.
function createWind() {
  const source = loopingNoise();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.8;
  const gain = makeGain(0, ambienceBus);
  source.connect(filter).connect(gain);
  return { filter, gain };
}

// Os valores do vento para cada fase: volume base, quanto variam as rajadas e o "tom".
const WIND_SETTINGS = {
  build: { level: 0.10, gust: 0.06, freq: 420, freqGust: 200, every: [2.5, 5] },
  disaster: { level: 0.30, gust: 0.22, freq: 750, freqGust: 650, every: [0.8, 2.2] },
  result: { level: 0.08, gust: 0.04, freq: 380, freqGust: 120, every: [3, 6] },
};

function windSettings() {
  return WIND_SETTINGS[phase] || WIND_SETTINGS.build;
}

function applyAmbience() {
  nextGustAt = 0; // muda já o vento na próxima volta do relógio
  nextBirdAt = ctx.currentTime + randomBetween(1, 3);
}

// Uma rajada: escolhe um volume e um tom novos e desliza até eles.
function gust(now) {
  const s = windSettings();
  const strength = Math.random();
  const duration = randomBetween(s.every[0], s.every[1]);
  wind.gain.gain.setTargetAtTime(s.level + s.gust * strength, now, duration / 3);
  wind.filter.frequency.setTargetAtTime(s.freq + s.freqGust * strength, now, duration / 3);
  nextGustAt = now + duration;
}

// ---------- Fogo ----------
// O rugido: ruído grave (filtro "lowpass" deixa passar só os graves), sempre ligado,
// com o volume a seguir o nível do fogo. Os estalidos são agendados no tick().
function createFireRoar() {
  const source = loopingNoise();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  filter.Q.value = 0.7;
  const gain = makeGain(0, ambienceBus);
  source.connect(filter).connect(gain);
  return { filter, gain };
}

function applyFireLevel() {
  const now = ctx.currentTime;
  fire.gain.gain.setTargetAtTime(fireLevel * 0.55, now, 0.4);
  // Fogo maior = rugido um pouco mais agudo e "aberto".
  fire.filter.frequency.setTargetAtTime(150 + fireLevel * 350, now, 0.4);
}

// Um estalido: um pedacinho de ruído, muito curto, filtrado para soar a madeira a estalar.
function crackle(when) {
  const duration = randomBetween(0.006, 0.03);
  noiseBurst({
    when, duration, bus: ambienceBus,
    filterType: 'bandpass', freq: randomBetween(1200, 5000), q: randomBetween(0.8, 3),
    volume: randomBetween(0.15, 0.6) * (0.4 + fireLevel * 0.6), attack: 0.001,
  });
}

// ---------- O relógio (10 vezes por segundo) ----------
// Agenda os sons que acontecem "de vez em quando": rajadas, pássaros e estalidos.
// Os estalidos dos próximos 100 ms são marcados já, cada um no seu instante exato.
function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;

  if (now >= nextGustAt) gust(now);

  if (phase === 'build' && now >= nextBirdAt) {
    birdSong(now + 0.05);
    nextBirdAt = now + randomBetween(3, 9);
  }

  // Quantos estalidos nesta décima de segundo? Fogo maior = mais estalidos.
  const cracklesPerTick = fireLevel * 4;
  let count = Math.floor(cracklesPerTick);
  if (Math.random() < cracklesPerTick - count) count++;
  for (let i = 0; i < count; i++) crackle(now + Math.random() * 0.1);
}

// Um pássaro: 2 a 5 piados curtos e agudos, cada um a deslizar de tom.
function birdSong(start) {
  const notes = 2 + Math.floor(Math.random() * 4);
  const base = randomBetween(2400, 3600);
  let t = start;
  for (let i = 0; i < notes; i++) {
    const length = randomBetween(0.05, 0.12);
    tone({
      when: t, duration: length, type: 'sine', bus: ambienceBus,
      freq: base * randomBetween(0.9, 1.15), freqEnd: base * randomBetween(1.2, 1.5),
      volume: 0.05, attack: 0.01, pan: randomBetween(-0.7, 0.7),
    });
    t += length + randomBetween(0.04, 0.12);
  }
}

// ---------- Os sons curtos (play) ----------
const SOUNDS = {
  // Um "tic" curto e agudo.
  click(t) {
    tone({ when: t, duration: 0.06, type: 'sine', freq: 1100, freqEnd: 700, volume: 0.18, attack: 0.002 });
  },

  // Construir: um "pop" de duas notas a subir e um baque grave.
  build(t) {
    tone({ when: t, duration: 0.12, type: 'triangle', freq: 520, volume: 0.25, attack: 0.005 });
    tone({ when: t + 0.08, duration: 0.18, type: 'triangle', freq: 780, volume: 0.22, attack: 0.005 });
    noiseBurst({ when: t, duration: 0.12, filterType: 'lowpass', freq: 300, volume: 0.5, attack: 0.003 });
  },

  // Erro: dois "bzz" graves.
  error(t) {
    for (const offset of [0, 0.16]) {
      tone({ when: t + offset, duration: 0.12, type: 'square', freq: 170, freqEnd: 150,
        volume: 0.1, attack: 0.005, lowpass: 900 });
    }
  },

  // Carro a passar: motor (onda "sawtooth" grave) que vem da esquerda e vai para a direita.
  // Enquanto se aproxima o tom é mais alto; depois de passar desce (efeito Doppler).
  car(t) {
    const length = 6;
    const middle = t + length * 0.45; // o momento em que o carro passa à nossa frente
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.setValueAtTime(95, t);
    engine.frequency.linearRampToValueAtTime(102, middle - 0.3);
    engine.frequency.exponentialRampToValueAtTime(78, middle + 0.5);
    engine.frequency.linearRampToValueAtTime(72, t + length);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(900, middle); // mais perto = mais nítido
    filter.frequency.linearRampToValueAtTime(250, t + length);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, middle);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    const pan = makePanner(-0.9);
    if (pan.pan) {
      pan.pan.setValueAtTime(-0.9, t);
      pan.pan.linearRampToValueAtTime(0.9, t + length);
    }
    engine.connect(filter).connect(gain).connect(pan).connect(sfxBus);
    startVoice(engine, t, t + length, [filter, gain, pan]);

    // O som dos pneus no alcatrão: ruído com o mesmo envelope.
    noiseBurst({ when: t, duration: length, filterType: 'bandpass', freq: 700, q: 0.6,
      volume: 0.12, attack: length * 0.45, release: 'smooth' });
  },

  // A ignição: um "fuuush" (ruído com o filtro a subir) e um baque grave.
  ignite(t) {
    noiseBurst({ when: t, duration: 1.1, filterType: 'bandpass', freq: 250, freqEnd: 2200, q: 1.2,
      volume: 0.7, attack: 0.25, release: 'smooth' });
    tone({ when: t, duration: 0.5, type: 'sine', freq: 90, freqEnd: 45, volume: 0.35, attack: 0.02 });
  },

  // Sirene ao longe: duas notas a alternar ("ni-nó", como em Portugal),
  // abafada (lowpass) e baixinha, porque está longe; aproxima-se e afasta-se.
  siren(t) {
    const length = 7;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    for (let i = 0; i * 0.6 < length; i++) {
      osc.frequency.setValueAtTime(i % 2 === 0 ? 660 : 880, t + i * 0.6);
    }
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + length * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    const pan = makePanner(0.5);
    osc.connect(filter).connect(gain).connect(pan).connect(sfxBus);
    startVoice(osc, t, t + length, [filter, gain, pan]);
  },

  // Vitória: arpejo a subir (dó-mi-sol-dó).
  win(t) {
    [523, 659, 784, 1047].forEach((freq, i) => {
      tone({ when: t + i * 0.13, duration: i === 3 ? 0.6 : 0.18, type: 'triangle', freq, volume: 0.22, attack: 0.01 });
    });
  },

  // Derrota: notas a descer, mais lentas e tristes.
  lose(t) {
    [392, 370, 349, 262].forEach((freq, i) => {
      tone({ when: t + i * 0.3, duration: i === 3 ? 0.9 : 0.32, type: 'sine', freq, volume: 0.22, attack: 0.02 });
    });
  },
};

// ---------- Peças para construir sons ----------

// Uma nota: oscilador -> (filtro) -> volume com envelope -> (panorâmica) -> bus.
function tone({ when, duration, type, freq, freqEnd, volume, attack = 0.01, lowpass, pan, bus = sfxBus }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, when + duration);

  const gain = envelope(when, duration, volume, attack);
  const extra = [gain];
  let last = osc;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    last = last.connect(filter);
    extra.push(filter);
  }
  last = last.connect(gain);
  if (pan !== undefined) {
    const panner = makePanner(pan);
    last = last.connect(panner);
    extra.push(panner);
  }
  last.connect(bus);
  startVoice(osc, when, when + duration + 0.05, extra);
}

// Um chiado: ruído -> filtro -> volume com envelope -> bus.
// release 'smooth' = o volume desce devagar até ao fim (para sons longos como o vento do carro).
function noiseBurst({ when, duration, filterType, freq, freqEnd, q = 1, volume, attack = 0.005, release, bus = sfxBus }) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const offset = Math.random() * (noiseBuffer.duration - Math.min(duration, 1.5) - 0.01);
  if (duration > noiseBuffer.duration - 0.1) source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, when);
  if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, when + duration);

  const gain = release === 'smooth'
    ? smoothEnvelope(when, duration, volume, attack)
    : envelope(when, duration, volume, attack);
  source.connect(filter).connect(gain).connect(bus);
  startVoice(source, when, when + duration + 0.05, [filter, gain], Math.max(0, offset));
}

// Envelope: o volume sobe em "attack" segundos e depois desce depressa até quase 0.
function envelope(when, duration, volume, attack) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  return gain;
}

// Envelope suave: sobe até ao meio e desce devagar até ao fim.
function smoothEnvelope(when, duration, volume, peakAt) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + peakAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  return gain;
}

// Põe um som a tocar e, quando acabar, desliga todas as suas peças.
// Assim não ficam "nós" esquecidos a gastar memória (fugas).
function startVoice(source, when, stopAt, otherNodes, offset = 0) {
  liveVoices++;
  source.onended = () => {
    liveVoices--;
    source.disconnect();
    for (const node of otherNodes) node.disconnect();
  };
  source.start(when, offset);
  source.stop(stopAt);
}

// Ruído em loop, para sons que nunca param (vento, rugido do fogo).
function loopingNoise() {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  source.start(ctx.currentTime, Math.random() * 1.5);
  return source;
}

function makeGain(value, destination) {
  const gain = ctx.createGain();
  gain.gain.value = value;
  if (destination) gain.connect(destination);
  return gain;
}

// Panorâmica: -1 = esquerda, 1 = direita. Os navegadores antigos não a têm:
// nesse caso usamos um volume neutro, que deixa o som passar igual.
function makePanner(value) {
  if (!ctx.createStereoPanner) return makeGain(1);
  const panner = ctx.createStereoPanner();
  panner.pan.value = value;
  return panner;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
