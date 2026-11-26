// O painel da fase de construção: as cartas das ações, a ferramenta "Undo",
// o orçamento que sobra (na barra de cima) e mensagens curtas ("toasts").
// As REGRAS (preços, onde se pode construir) vivem em src/sim/actions.js.
// Este ficheiro só passa os cliques à simulação e mostra o resultado.
// Também mostra as FAIXAS DE GESTÃO DE COMBUSTÍVEL: só se pode trabalhar perto das casas e
// das estradas (com um tom suave e um contorno); o resto é Parque Natural (com um cadeado).
// Com uma ferramenta na mão, os quadrados onde ela pode ser usada BRILHAM (a pulsar devagar).
// O desenho dos botões e mensagens está em src/render/ui/ (hud.js e hud.css).
//
// É carregado pelo index.html com a sua própria tag <script type="module">,
// depois do main.js (assim o "game" já está pronto quando este código corre).
import * as THREE from 'three';
import { game, onTileClick, onPhaseChange, onFrame, tileName, setTileChooser, tileUnderPointer } from './main.js';
import { ACTIONS, createBuildState, applyAction, undoAction, remainingBudget, checkAction, isWorkable, baseCost } from '../sim/actions.js';
import { stripMap, stripEdges, slopeNote, usableTiles } from './fuelStrips.js';
import { setLevelName, setBudget, showToast, createToolCard, formatEuros, showBriefingCard } from './ui/hud.js';
import { rakeIcon, bulldozerIcon, saplingIcon, undoIcon } from './ui/icons.js';

// O estado da construção usa a MESMA vila que o fogo vai ler.
const buildState = createBuildState(game.village, game.level.budget);
game.buildState = buildState; // o "Try again (same night)" (disasterPlayer.js) guarda este plano

// A ferramenta escolhida: o nome de uma ação ('clearBrush', ...), 'undo', ou null (nenhuma).
let selectedTool = null;

// Mensagens curtas (em inglês) para cada motivo de recusa da simulação.
const BLOCKED_MESSAGES = {
  'not-enough-money': 'Not enough money',
  'invalid-target': "Can't build there — click a glowing tile",
  'already-changed': 'Already changed — undo it first',
  'outside': 'Outside the village',
  'nothing-to-undo': 'Nothing to undo here',
  // A lei portuguesa (DL 82/2021, art. 49.º) manda limpar faixas à volta das casas e das estradas.
  // Ela NÃO proíbe trabalhar no resto: fechar o parque é uma escolha do jogo.
  'protected-area': 'Sintra-Cascais Natural Park: locked. Work in the fuel strips near houses & roads',
};
// O texto curto da caixa #info para um quadrado do parque (o toast acima é para o clique).
const PARK_LABEL = '🔒 Natural park'; // 🔒 = cadeado

// O ícone e a dica de cada ferramenta (o nome e o preço vêm da simulação).
// Os quadrados onde a ferramenta dá BRILHAM (ver "Os quadrados que brilham", mais abaixo).
const TOOL_LOOKS = {
  clearBrush: { icon: rakeIcon, hint: 'Click a glowing brush tile to clear it' },
  firebreak: { icon: bulldozerIcon, hint: 'Click a glowing tile to make a firebreak (€1,000 on trees: they must be cut down)' },
  replaceTrees: { icon: saplingIcon, hint: 'Click a glowing eucalyptus tile to plant broadleaf trees (they burn less fiercely)' },
  undo: { icon: undoIcon, hint: 'Click a changed tile to undo it (full refund)' },
};

// Quando a ferramenta não tem NENHUM quadrado que brilhe, o toast diz porquê (em vez da dica).
const NO_TILES_MESSAGES = {
  money: 'Not enough money for this tool anywhere — undo something first',
  clearBrush: 'No dry scrub left to clear in the fuel strips',
  firebreak: 'No vegetation left for a firebreak in the fuel strips',
  replaceTrees: 'No eucalyptus left to replace in the fuel strips',
};

// ---------- Construir o painel (HTML) ----------
const panel = document.createElement('div');
panel.className = 'build-panel';

// Uma carta por ação, com ícone, nome e preço. A tecla 1, 2, 3... também a escolhe.
const buttons = {};
for (const [name, action] of Object.entries(ACTIONS)) {
  buttons[name] = makeCard(name, action.label, action.cost);
}
buttons.undo = makeCard('undo', 'Undo', null);

document.getElementById('hud').append(panel);
setLevelName(game.level.name);

// "Try again (same night)": refazemos o plano do jogo anterior, quadrado a quadrado.
// Como a página recarregou, a vila voltou ao original; estas ações voltam a pagar o mesmo.
for (const { x, y, actionName } of game.retryPlan ?? []) {
  const result = applyAction(buildState, x, y, actionName);
  if (result.ok) game.view.setTileType(x, y, result.newType);
}

// Antes de construir: o cartão do briefing conta a história verdadeira deste incêndio.
// Enquanto está aberto, a interface de construção fica escondida.
// No "Try again" o jogador já leu a história: vamos direto à construção.
if (game.retryPlan) {
  showToast('Same night, same plan — change it and try again');
} else {
  document.body.classList.add('briefing');
  showBriefingCard(game.level, () => document.body.classList.remove('briefing'));
}

// Cria uma carta; ao clicar, escolhe essa ferramenta (clicar outra vez tira a escolha).
function makeCard(toolName, label, cost) {
  const hotkey = Object.keys(buttons).length + 1;
  const card = createToolCard({ name: label, price: cost, hotkey, ...TOOL_LOOKS[toolName] });
  card.addEventListener('click', () => clickTool(toolName));
  panel.append(card);
  return card;
}

function clickTool(toolName) {
  // Uma ação que já não dá para pagar não se escolhe: a carta abana.
  if (toolName !== 'undo' && ACTIONS[toolName].cost > remainingBudget(buildState)) {
    shake(buttons[toolName]);
    return showToast(BLOCKED_MESSAGES['not-enough-money'], 'error');
  }
  selectTool(selectedTool === toolName ? null : toolName);
}

function selectTool(toolName) {
  selectedTool = toolName;
  // Realça só a carta da ferramenta escolhida.
  for (const [name, button] of Object.entries(buttons)) {
    button.classList.toggle('selected', name === toolName);
  }
  const count = updateGlow(); // faz brilhar os quadrados onde a ferramenta dá
  if (count === 0) showToast(noTilesMessage(), 'error');
  else if (toolName) showToast(TOOL_LOOKS[toolName].hint);
  updateLocks(); // com uma ferramenta na mão, os cadeados ficam mais visíveis
  updateHover(); // a cor do destaque muda com a ferramenta
}

// Teclado: 1-4 escolhem uma ferramenta, Esc larga a ferramenta.
addEventListener('keydown', (event) => {
  if (game.phase !== 'build') return;
  if (event.key === 'Escape') return selectTool(null);
  const toolName = Object.keys(buttons)[Number(event.key) - 1];
  if (toolName) clickTool(toolName);
});

// ---------- Escolher o quadrado debaixo do rato ----------
// O raio do rato pode atravessar várias coisas: uma árvore do quadrado vizinho e, atrás dela,
// o chão do quadrado que brilha (ver tilesFromPointer em village3d.js). Com uma ferramenta na
// mão, escolhemos o PRIMEIRO candidato onde ela pode ser usada (a mesma verificação que faz
// brilhar os quadrados). Se nenhum der, ou sem ferramenta, fica o primeiro (o mais perto).
setTileChooser((candidates) => {
  if (game.phase === 'build' && selectedTool) {
    const usable = candidates.find(({ x, y }) => checkAction(buildState, x, y, selectedTool).ok);
    if (usable) return usable;
  }
  return candidates[0] ?? null;
});

// ---------- Clicar num quadrado ----------
onTileClick((tile) => {
  if (game.phase !== 'build') return;
  // Sem ferramenta, o clique só mostra o quadrado (main.js); no parque, explica o cadeado.
  if (!selectedTool) {
    if (tile && strips[tile.y][tile.x] === 'locked') showToast(BLOCKED_MESSAGES['protected-area'], 'locked');
    return;
  }
  if (!tile) return showToast(BLOCKED_MESSAGES.outside, 'error');

  let done; // a mensagem do que correu bem (ex.: "Clear brush: −€250")
  if (selectedTool === 'undo') {
    const result = undoAction(buildState, tile.x, tile.y);
    if (!result.ok) return showToast(BLOCKED_MESSAGES[result.reason], 'error');
    game.view.setTileType(tile.x, tile.y, result.restoredType); // redesenha o quadrado
    done = `Undone: +${formatEuros(result.refund)}`;
  } else {
    const budgetBefore = remainingBudget(buildState);
    const result = applyAction(buildState, tile.x, tile.y, selectedTool);
    if (!result.ok) {
      if (result.reason === 'protected-area') return showToast(BLOCKED_MESSAGES[result.reason], 'locked');
      return showToast(BLOCKED_MESSAGES[result.reason] || "Can't build there", 'error');
    }
    game.view.setTileType(tile.x, tile.y, result.newType); // redesenha o quadrado
    // O que se pagou mesmo (numa encosta custa mais do que o preço da carta).
    const paid = budgetBefore - remainingBudget(buildState);
    done = `${ACTIONS[selectedTool].label}: −${formatEuros(paid)}`;
  }
  updateBudget();
  // O dinheiro e os quadrados mudaram: os que brilham também. Se já não sobra nenhum, avisa.
  // Como só se vê uma mensagem de cada vez, juntamos as duas numa só (senão o preço sumia logo).
  if (updateGlow() === 0) showToast(`${done} · ${noTilesMessage()}`, 'error');
  else showToast(done, 'success');
  updateHover();
});

// ---------- Destaque do quadrado debaixo do rato ----------
// Um quadrado translúcido, colado ao relevo, segue o rato: VERDE se a ferramenta escolhida
// pode ser usada ali, VERMELHO se não pode, BRANCO sem ferramenta. A caixa #info diz o nome
// do quadrado e o que a ferramenta faria (ex.: "Dry scrub — Clear brush €200").
// Os quadrados já mudados pelo jogador ficam com uma moldura amarela.
const HOVER_COLORS = { none: 0xffffff, ok: 0x4cd964, bad: 0xff4b3a };
const hover = makeTileOutline(0xffffff, 0.28);
const changedMarks = new Map(); // "x,y" -> moldura amarela de um quadrado já mudado
game.scene.add(hover);
hover.visible = false;
let hoverTile = null;
let pointerEvent = null;
const info = document.getElementById('info');
game.renderer.domElement.addEventListener('pointermove', (event) => {
  pointerEvent = event;
  requestHoverUpdate();
});
game.renderer.domElement.addEventListener('pointerleave', () => { pointerEvent = null; requestHoverUpdate(); });

// Só uma atualização por desenho, mesmo que o rato mande muitos eventos.
let hoverQueued = false;
function requestHoverUpdate() {
  if (hoverQueued) return;
  hoverQueued = true;
  requestAnimationFrame(() => { hoverQueued = false; updateHover(); });
}

function updateHover() {
  if (game.phase !== 'build' || !pointerEvent || pointerEvent.pointerType === 'touch') {
    hover.visible = false;
    return;
  }
  // O MESMO "apanhar o quadrado" que o clique usa (tileUnderPointer, em main.js, com o
  // escolhedor lá de cima): assim o quadrado destacado é sempre o que o clique muda.
  hoverTile = tileUnderPointer(pointerEvent);
  if (!hoverTile) { hover.visible = false; return; }
  const { x, y } = hoverTile;
  const check = selectedTool ? checkAction(buildState, x, y, selectedTool) : null;
  placeOutline(hover, x, y);
  hover.material.color.setHex(HOVER_COLORS[!check ? 'none' : check.ok ? 'ok' : 'bad']);
  hover.visible = true;
  info.textContent = describe(x, y, check);
}

// O texto da caixa #info para o quadrado (x, y).
// Com uma ferramenta, mostra o preço VERDADEIRO deste quadrado (check.cost, que a simulação
// calcula com o declive) e, se for mais caro do que a carta, quanto a encosta encarece.
function describe(x, y, check) {
  const name = tileName(game.village.tiles[y][x]);
  const locked = strips[y][x] === 'locked';
  if (!check) return locked ? `${name} — ${PARK_LABEL}` : name;
  if (check.ok && selectedTool === 'undo') return `${name} — Undo: +${formatEuros(-check.cost)}`;
  if (check.ok) {
    const action = ACTIONS[selectedTool];
    const cost = check.cost ?? action.cost;
    // O preço base DESTE tipo (ex.: corta-fogo em árvores = €1000); o resto é a encosta.
    const base = baseCost(selectedTool, game.village.tiles[y][x]);
    const notes = [base > action.cost ? 'cutting trees' : '', slopeNote(base, cost)].filter(Boolean);
    return `${name} — ${action.label} ${formatEuros(cost)}${notes.length ? ` (${notes.join(', ')})` : ''}`;
  }
  if (check.reason === 'protected-area') return `${name} — ${PARK_LABEL}`;
  return `${name} — ${BLOCKED_MESSAGES[check.reason] || "Can't build there"}`;
}

// Um quadrado translúcido de 1x1 com 4x4 bocadinhos, para poder seguir o relevo.
function makeTileOutline(color, opacity) {
  const geo = new THREE.PlaneGeometry(0.96, 0.96, 4, 4);
  geo.rotateX(-Math.PI / 2);
  geo.userData.flat = geo.attributes.position.array.slice(); // a forma plana original
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  }));
  mesh.renderOrder = 5;
  return mesh;
}

// Põe o quadrado translúcido em cima do quadrado (x, y), com cada ponto à altura do chão.
function placeOutline(mesh, x, y) {
  const center = game.view.worldPosition(x, y);
  const flat = mesh.geometry.userData.flat;
  const position = mesh.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const wx = center.x + flat[i * 3], wz = center.z + flat[i * 3 + 2];
    position.setXYZ(i, wx, game.view.terrain.heightAtWorld(wx, wz) + 0.05, wz);
  }
  position.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}

// Moldura amarela nos quadrados mudados (para se ver o que já se fez e o que se pode desfazer).
function updateChangedMarks() {
  for (const [key, mark] of changedMarks) {
    if (buildState.changes[key]) continue;
    game.scene.remove(mark);
    mark.geometry.dispose();
    changedMarks.delete(key);
  }
  for (const key of Object.keys(buildState.changes)) {
    if (changedMarks.has(key)) continue;
    const [x, y] = key.split(',').map(Number);
    const mark = makeTileOutline(0xffc531, 0.18);
    placeOutline(mark, x, y);
    game.scene.add(mark);
    changedMarks.set(key, mark);
  }
}

// ---------- As faixas de gestão de combustível ----------
// strips[y][x] = 'strip' (pode-se trabalhar), 'locked' (Parque Natural) ou null (casa, estrada, água).
// As casas e as estradas não mudam durante a construção, por isso as faixas desenham-se uma vez.
// Os cadeados são discretos; ficam mais fortes quando há uma ferramenta na mão.
const LOCK_OPACITY = { idle: 0.45, tool: 0.85 };
const strips = stripMap(game.village, isWorkable);
const stripLayer = buildStripLayer();
game.scene.add(stripLayer);

// Três desenhos, cada um numa só "chamada de desenho" (para não pesar no mapa grande):
//   1) um tom dourado muito suave nos quadrados das faixas;
//   2) uma linha clara no limite entre a faixa e o parque;
//   3) cadeados pequenos (pontos com um desenho de cadeado) nos quadrados do parque.
function buildStripLayer() {
  const layer = new THREE.Group();
  const origin = game.view.worldPosition(0, 0); // o centro do quadrado (0, 0) no mundo
  const ground = game.view.terrain.heightAtWorld;

  // 1) O tom das faixas: um retângulo por quadrado, dobrado para seguir o relevo.
  const tint = createDrapedShapes(origin, ground);
  const locks = [];
  for (let y = 0; y < strips.length; y++) {
    for (let x = 0; x < strips[y].length; x++) {
      if (strips[y][x] === 'strip') tint.rect(x - 0.5, y - 0.5, x + 0.5, y + 0.5, 3, 3, 0.04);
      if (strips[y][x] === 'locked') locks.push({ x, y });
    }
  }
  layer.add(tint.mesh(0xffe08a, 0.28));

  // 2) O contorno: cada lado entre faixa e parque vira uma fita fina colada ao chão.
  const outline = createDrapedShapes(origin, ground);
  const half = 0.035; // metade da largura da fita
  for (const { from, to } of stripEdges(strips)) {
    const vertical = from.x === to.x;
    outline.rect(from.x - half, from.y - half, to.x + half, to.y + half, vertical ? 1 : 4, vertical ? 4 : 1, 0.07);
  }
  layer.add(outline.mesh(0xfff4c8, 0.75));

  // 3) Os cadeados: um ponto por quadrado do parque, um pouco acima do chão.
  const positions = [];
  for (const { x, y } of locks) {
    const p = game.view.worldPosition(x, y);
    positions.push(p.x, p.y + 0.35, p.z);
  }
  const lockGeometry = new THREE.BufferGeometry();
  lockGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lockPoints = new THREE.Points(lockGeometry, new THREE.PointsMaterial({
    map: makePadlockTexture(), size: 0.8, sizeAttenuation: true,
    transparent: true, opacity: LOCK_OPACITY.idle, alphaTest: 0.2, depthWrite: false,
  }));
  lockPoints.renderOrder = 6;
  layer.add(lockPoints);
  layer.userData.locks = lockPoints;
  return layer;
}

function updateLocks() {
  const material = stripLayer.userData.locks.material;
  material.opacity = selectedTool && selectedTool !== 'undo' ? LOCK_OPACITY.tool : LOCK_OPACITY.idle;
}

// ---------- Os quadrados que brilham ----------
// Com uma ferramenta na mão, TODOS os quadrados onde ela pode ser usada agora (a mesma
// verificação do clique, checkAction, com o dinheiro que sobra) ganham um brilho suave que pulsa.
// Assim vê-se onde clicar sem passar o rato (no telemóvel nem há rato).
// É uma só malha com um quadradinho por quadrado: refaz-se quando a ferramenta muda e depois de
// cada ação ou undo (o dinheiro e os quadrados mudam). Com o Undo não brilha nada: os quadrados
// mudados já têm a moldura amarela.
const GLOW = { color: 0xb6ffcf, low: 0.22, high: 0.5, pulseSeconds: 1.6 };
const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; // sem pulsar, se o sistema pedir
const glow = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
  color: GLOW.color, transparent: true, opacity: GLOW.high, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
}));
glow.renderOrder = 4.5; // por cima do tom das faixas, por baixo do quadrado do rato
glow.visible = false;
game.scene.add(glow);
let lastGlow = { tiles: [], noMoney: 0 }; // o último cálculo (para explicar quando não há nenhum)

// Refaz o brilho. Devolve quantos quadrados brilham, ou null se não há nada para brilhar
// (sem ferramenta, com o Undo ou fora da fase de construção).
function updateGlow() {
  if (game.phase !== 'build' || !selectedTool || selectedTool === 'undo') {
    glow.visible = false;
    return null;
  }
  const { width, height } = game.village;
  lastGlow = usableTiles(width, height, (x, y) => checkAction(buildState, x, y, selectedTool));
  // Um quadradinho por quadrado, um pouco mais pequeno (para se ver cada quadrado à parte).
  const shapes = createDrapedShapes(game.view.worldPosition(0, 0), game.view.terrain.heightAtWorld);
  const inset = 0.08;
  for (const { x, y } of lastGlow.tiles) {
    shapes.rect(x - 0.5 + inset, y - 0.5 + inset, x + 0.5 - inset, y + 0.5 - inset, 2, 2, 0.06);
  }
  glow.geometry.dispose(); // a forma antiga já não serve: liberta a memória
  glow.geometry = shapes.geometry();
  glow.visible = lastGlow.tiles.length > 0;
  return lastGlow.tiles.length;
}

// A frase do toast quando a ferramenta não tem nenhum quadrado onde dê.
function noTilesMessage() {
  return lastGlow.noMoney > 0 ? NO_TILES_MESSAGES.money : NO_TILES_MESSAGES[selectedTool];
}

// O pulsar: a opacidade sobe e desce devagar, a cada desenho.
onFrame((dt, t) => {
  if (!glow.visible || calmMotion) return;
  const wave = (1 + Math.sin((t * 2 * Math.PI) / GLOW.pulseSeconds)) / 2; // de 0 a 1
  glow.material.opacity = GLOW.low + (GLOW.high - GLOW.low) * wave;
});

// Junta muitos retângulos "colados ao chão" numa só malha 3D.
// Cada retângulo vai de (x0, y0) a (x1, y1) em coordenadas da grelha e é partido em
// segX x segY bocadinhos, cada ponto à altura do chão + lift (para seguir o relevo).
// Devolve { rect, mesh }: chama-se rect(...) várias vezes e, no fim, mesh(cor, opacidade).
function createDrapedShapes(origin, ground) {
  const positions = []; // x, y, z de cada ponto, seguidos
  const indices = [];   // 3 números por triângulo (que pontos o formam)

  function rect(x0, y0, x1, y1, segX, segY, lift) {
    const first = positions.length / 3; // o número do primeiro ponto deste retângulo
    for (let j = 0; j <= segY; j++) {
      for (let i = 0; i <= segX; i++) {
        const wx = origin.x + x0 + ((x1 - x0) * i) / segX;
        const wz = origin.z + y0 + ((y1 - y0) * j) / segY;
        positions.push(wx, ground(wx, wz) + lift, wz);
      }
    }
    // Dois triângulos por bocadinho.
    for (let j = 0; j < segY; j++) {
      for (let i = 0; i < segX; i++) {
        const a = first + j * (segX + 1) + i, b = a + 1, c = a + segX + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  // A forma 3D (pontos + triângulos) de todos os retângulos juntos.
  function geometry() {
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    result.setIndex(indices);
    return result;
  }

  function mesh(color, opacity) {
    const result = new THREE.Mesh(geometry(), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    result.renderOrder = 4;
    return result;
  }

  return { rect, geometry, mesh };
}

// O desenho do cadeado (64x64 píxeis), feito em código num canvas: arco + corpo + buraco.
function makePadlockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  // O arco de metal: um contorno escuro grosso e, por cima, um cinzento claro mais fino.
  for (const [width, color] of [[13, '#2b2118'], [7, '#d9d4c8']]) {
    ctx.beginPath();
    ctx.moveTo(20, 34);
    ctx.lineTo(20, 27);
    ctx.arc(32, 27, 12, Math.PI, 0);
    ctx.lineTo(44, 34);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  // O corpo: dourado com contorno escuro.
  ctx.beginPath();
  ctx.roundRect(13, 31, 38, 28, 7);
  ctx.fillStyle = '#ffc531';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2b2118';
  ctx.stroke();
  // O buraco da chave.
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(32, 42, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(30.5, 43, 3, 9);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- Fases do jogo ----------
// O painel e as faixas só aparecem na fase de construção.
function showForPhase(phase) {
  panel.hidden = phase !== 'build';
  stripLayer.visible = phase === 'build';
  if (phase !== 'build') {
    hover.visible = false;
    glow.visible = false;
    for (const mark of changedMarks.values()) mark.visible = false;
  }
}
onPhaseChange(showForPhase);
showForPhase(game.phase);

// ---------- Pequenas ajudas ----------
// Atualiza as moedas lá em cima e acinzenta as cartas que já não dá para pagar.
function updateBudget() {
  const budget = remainingBudget(buildState);
  setBudget(budget);
  for (const [name, action] of Object.entries(ACTIONS)) {
    const tooExpensive = action.cost > budget;
    buttons[name].classList.toggle('unaffordable', tooExpensive);
    buttons[name].setAttribute('aria-disabled', String(tooExpensive));
  }
  // A ferramenta escolhida ficou cara demais? Larga-a.
  if (selectedTool && selectedTool !== 'undo' && ACTIONS[selectedTool].cost > budget) selectTool(null);
  updateChangedMarks();
}

// Faz a carta abanar (a animação "shake" do hud.css).
function shake(card) {
  card.classList.remove('shake');
  void card.offsetWidth; // obriga o navegador a recomeçar a animação
  card.classList.add('shake');
}

// Por último (já com tudo criado): mostra o orçamento e as molduras dos quadrados mudados.
updateBudget();
