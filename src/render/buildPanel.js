// O painel da fase de construção: botões das ações, ferramenta "Undo",
// o orçamento que sobra e uma mensagem curta quando algo é recusado.
// As REGRAS (preços, onde se pode construir) vivem em src/sim/actions.js.
// Este ficheiro só passa os cliques à simulação e mostra o resultado.
//
// É carregado pelo index.html com a sua própria tag <script type="module">,
// depois do main.js (assim o "game" já está pronto quando este código corre).
import { game, onTileClick, onPhaseChange } from './main.js';
import { ACTIONS, createBuildState, applyAction, undoAction, remainingBudget } from '../sim/actions.js';

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

// ---------- Construir o painel (HTML) ----------
addPanelStyles();
const panel = document.createElement('div');
panel.className = 'build-panel';

const budgetText = document.createElement('div');
budgetText.className = 'build-budget';

const tools = document.createElement('div');
tools.className = 'build-tools';

const message = document.createElement('div');
message.className = 'build-message';

// Um botão por ação, com o nome e o preço (ex.: "Firebreak €500").
const buttons = {};
for (const [name, action] of Object.entries(ACTIONS)) {
  buttons[name] = makeButton(name, `${action.label} ${formatEuros(action.cost)}`);
}
buttons.undo = makeButton('undo', 'Undo');

panel.append(budgetText, tools, message);
document.getElementById('hud').append(panel);
updateBudget();

// Cria um botão; ao clicar, escolhe essa ferramenta (clicar outra vez tira a escolha).
function makeButton(toolName, text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', () => {
    selectTool(selectedTool === toolName ? null : toolName);
  });
  tools.append(button);
  return button;
}

function selectTool(toolName) {
  selectedTool = toolName;
  // Realça só o botão da ferramenta escolhida.
  for (const [name, button] of Object.entries(buttons)) {
    button.classList.toggle('selected', name === toolName);
  }
  showMessage(toolName ? 'Click a tile' : '');
}

// ---------- Clicar num quadrado ----------
onTileClick((tile) => {
  if (game.phase !== 'build' || !selectedTool) return; // sem ferramenta, o clique só mostra o quadrado
  if (!tile) return showMessage(BLOCKED_MESSAGES.outside, true);

  if (selectedTool === 'undo') {
    const result = undoAction(buildState, tile.x, tile.y);
    if (!result.ok) return showMessage(BLOCKED_MESSAGES[result.reason], true);
    game.view.setTileType(tile.x, tile.y, result.restoredType); // redesenha o quadrado
    showMessage(`Undone: +${formatEuros(result.refund)}`);
  } else {
    const result = applyAction(buildState, tile.x, tile.y, selectedTool);
    if (!result.ok) return showMessage(BLOCKED_MESSAGES[result.reason], true);
    game.view.setTileType(tile.x, tile.y, result.newType); // redesenha o quadrado
    const action = ACTIONS[selectedTool];
    showMessage(`${action.label}: −${formatEuros(action.cost)}`);
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
function updateBudget() {
  budgetText.textContent = `Budget: ${formatEuros(remainingBudget(buildState))}`;
}

// isError = true pinta a mensagem de vermelho (ação recusada).
function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

// 9300 -> "€9,300"
function formatEuros(amount) {
  return '€' + amount.toLocaleString('en-US');
}

// O estilo do painel fica aqui, para não mexer no index.html.
function addPanelStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .build-panel { display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
                   padding: 8px 10px; border-radius: 8px; background: rgba(0,0,0,.6); color: #fff; }
    .build-panel[hidden] { display: none; }
    .build-budget { font-size: 18px; font-weight: 700; }
    .build-tools { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .build-tools button { padding: 6px 10px; border: 2px solid transparent; border-radius: 6px;
                          background: #f4f1ea; color: #222; font: inherit; font-size: 14px; cursor: pointer; }
    .build-tools button:hover { background: #fff; }
    .build-tools button.selected { border-color: #ffb020; background: #ffe7b0; }
    .build-message { min-height: 1.2em; font-size: 14px; }
    .build-message.error { color: #ff8a80; font-weight: 700; }
  `;
  document.head.append(style);
}
