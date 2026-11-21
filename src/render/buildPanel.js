// O painel da fase de construção: as cartas das ações, a ferramenta "Undo",
// o orçamento que sobra (na barra de cima) e mensagens curtas ("toasts").
// As REGRAS (preços, onde se pode construir) vivem em src/sim/actions.js.
// Este ficheiro só passa os cliques à simulação e mostra o resultado.
// O desenho dos botões e mensagens está em src/render/ui/ (hud.js e hud.css).
//
// É carregado pelo index.html com a sua própria tag <script type="module">,
// depois do main.js (assim o "game" já está pronto quando este código corre).
import { game, onTileClick, onPhaseChange } from './main.js';
import { ACTIONS, createBuildState, applyAction, undoAction, remainingBudget } from '../sim/actions.js';
import { setLevelName, setBudget, showToast, createToolCard, formatEuros } from './ui/hud.js';
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
updateBudget();

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
});

// ---------- Fases do jogo ----------
// O painel só aparece na fase de construção.
function showForPhase(phase) {
  panel.hidden = phase !== 'build';
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
}

// Faz a carta abanar (a animação "shake" do hud.css).
function shake(card) {
  card.classList.remove('shake');
  void card.offsetWidth; // obriga o navegador a recomeçar a animação
  card.classList.add('shake');
}
