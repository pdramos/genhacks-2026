// O painel da fase de construção: as cartas das ações, a ferramenta "Undo",
// o orçamento que sobra (na barra de cima) e mensagens curtas ("toasts").
// As REGRAS (preços, onde se pode construir) vivem em src/sim/actions.js.
// Este ficheiro só passa os cliques à simulação e mostra o resultado.
// O desenho dos botões e mensagens está em src/render/ui/ (hud.js e hud.css).
//
// É carregado pelo index.html com a sua própria tag <script type="module">,
// depois do main.js (assim o "game" já está pronto quando este código corre).
import * as THREE from 'three';
import { game, onTileClick, onPhaseChange, tileName } from './main.js';
import { ACTIONS, createBuildState, applyAction, undoAction, remainingBudget, checkAction } from '../sim/actions.js';
import { setLevelName, setBudget, showToast, createToolCard, formatEuros, showBriefingCard } from './ui/hud.js';
import { rakeIcon, bulldozerIcon, saplingIcon, undoIcon } from './ui/icons.js';

// O estado da construção usa a MESMA vila que o fogo vai ler.
const buildState = createBuildState(game.village, game.level.budget);

// A ferramenta escolhida: o nome de uma ação ('clearBrush', ...), 'undo', ou null (nenhuma).
let selectedTool = null;

// Mensagens curtas (em inglês) para cada motivo de recusa da simulação.
const BLOCKED_MESSAGES = {
  'not-enough-money': 'Not enough money',
  'invalid-target': "Can't build there",
  'already-changed': 'Already changed — undo it first',
  'outside': 'Outside the village',
  'nothing-to-undo': 'Nothing to undo here',
};

// O ícone e a dica de cada ferramenta (o nome e o preço vêm da simulação).
const TOOL_LOOKS = {
  clearBrush: { icon: rakeIcon, hint: 'Click a brush tile to clear it' },
  firebreak: { icon: bulldozerIcon, hint: 'Click any vegetation tile to make a firebreak' },
  replaceTrees: { icon: saplingIcon, hint: 'Click a eucalyptus tile to plant broadleaf trees' },
  undo: { icon: undoIcon, hint: 'Click a changed tile to undo it (full refund)' },
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

// Antes de construir: o cartão do briefing conta a história verdadeira deste incêndio.
// Enquanto está aberto, a interface de construção fica escondida.
document.body.classList.add('briefing');
showBriefingCard(game.level, () => document.body.classList.remove('briefing'));

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
  if (toolName) showToast(TOOL_LOOKS[toolName].hint);
  updateHover(); // a cor do destaque muda com a ferramenta
}

// Teclado: 1-4 escolhem uma ferramenta, Esc larga a ferramenta.
addEventListener('keydown', (event) => {
  if (game.phase !== 'build') return;
  if (event.key === 'Escape') return selectTool(null);
  const toolName = Object.keys(buttons)[Number(event.key) - 1];
  if (toolName) clickTool(toolName);
});

// ---------- Clicar num quadrado ----------
onTileClick((tile) => {
  if (game.phase !== 'build' || !selectedTool) return; // sem ferramenta, o clique só mostra o quadrado
  if (!tile) return showToast(BLOCKED_MESSAGES.outside, 'error');

  if (selectedTool === 'undo') {
    const result = undoAction(buildState, tile.x, tile.y);
    if (!result.ok) return showToast(BLOCKED_MESSAGES[result.reason], 'error');
    game.view.setTileType(tile.x, tile.y, result.restoredType); // redesenha o quadrado
    showToast(`Undone: +${formatEuros(result.refund)}`, 'success');
  } else {
    const result = applyAction(buildState, tile.x, tile.y, selectedTool);
    if (!result.ok) return showToast(BLOCKED_MESSAGES[result.reason], 'error');
    game.view.setTileType(tile.x, tile.y, result.newType); // redesenha o quadrado
    const action = ACTIONS[selectedTool];
    showToast(`${action.label}: −${formatEuros(action.cost)}`, 'success');
  }
  updateBudget();
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
const raycaster = new THREE.Raycaster();
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
  const canvas = game.renderer.domElement;
  const r = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(((pointerEvent.clientX - r.left) / r.width) * 2 - 1, -((pointerEvent.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, game.camera);
  hoverTile = game.view.terrain.pickTile(raycaster);
  if (!hoverTile) { hover.visible = false; return; }
  const { x, y } = hoverTile;
  const check = selectedTool ? checkAction(buildState, x, y, selectedTool) : null;
  placeOutline(hover, x, y);
  hover.material.color.setHex(HOVER_COLORS[!check ? 'none' : check.ok ? 'ok' : 'bad']);
  hover.visible = true;
  info.textContent = describe(x, y, check);
}

// O texto da caixa #info para o quadrado (x, y).
function describe(x, y, check) {
  const name = tileName(game.village.tiles[y][x]);
  if (!check) return name;
  if (check.ok && selectedTool === 'undo') return `${name} — Undo: +${formatEuros(-check.cost)}`;
  if (check.ok) return `${name} — ${ACTIONS[selectedTool].label} ${formatEuros(check.cost)}`;
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

// ---------- Fases do jogo ----------
// O painel só aparece na fase de construção.
function showForPhase(phase) {
  panel.hidden = phase !== 'build';
  if (phase !== 'build') {
    hover.visible = false;
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
