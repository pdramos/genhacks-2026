// Mexer a câmara com o teclado, como nos jogos de estratégia:
//   W / ↑  = ir para a frente      S / ↓  = ir para trás
//   A / ←  = ir para a esquerda    D / →  = ir para a direita
//   Q / E  = rodar à volta do ponto para onde se olha
//   Shift  = mais depressa
// "Frente" é para onde a câmara está a olhar, mas só no chão (sem subir nem descer).
import * as THREE from 'three';
import { game, onFrame } from './main.js';

// Velocidade: uma fração da distância ao alvo por segundo, para ser igual de perto e de longe.
const MOVE_SPEED = 0.35;    // "distâncias da câmara" por segundo (na vista inicial ≈ 14 quadrados/s)
const TURN_SPEED = 1.4;     // radianos por segundo (Q / E)
const FAST_FACTOR = 2.5;    // com Shift

// Tecla -> que movimento faz. Usamos event.code (a posição da tecla), para funcionar
// também em teclados que não são QWERTY.
const KEYS = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyQ: 'turnLeft', KeyE: 'turnRight',
};

const pressed = new Set(); // movimentos com a tecla carregada agora
let fast = false;

addEventListener('keydown', (event) => {
  if (isTyping(event) || event.ctrlKey || event.metaKey || event.altKey) return;
  fast = event.shiftKey;
  const move = KEYS[event.code];
  if (!move) return;
  pressed.add(move);
  event.preventDefault(); // as setas não devem fazer a página andar
});
addEventListener('keyup', (event) => {
  fast = event.shiftKey;
  const move = KEYS[event.code];
  if (move) pressed.delete(move);
});
// Se a janela perder o foco com uma tecla carregada, larga tudo (senão a câmara fugia sozinha).
addEventListener('blur', () => pressed.clear());

// Não mexer a câmara enquanto se escreve numa caixa de texto.
function isTyping(event) {
  const tag = event.target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable;
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const step = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

onFrame((dt) => {
  const { camera, controls, village } = game;
  // Durante a cena do cigarro a câmara é "do filme": o teclado não mexe.
  if (pressed.size === 0 || !controls.enabled) return;

  const distance = camera.position.distanceTo(controls.target);
  const speed = distance * MOVE_SPEED * (fast ? FAST_FACTOR : 1) * dt;

  // Direção "frente" no chão: para onde a câmara olha, sem a parte vertical.
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, UP).normalize(); // "direita" = perpendicular à frente

  step.set(0, 0, 0);
  if (pressed.has('forward')) step.add(forward);
  if (pressed.has('back')) step.sub(forward);
  if (pressed.has('right')) step.add(right);
  if (pressed.has('left')) step.sub(right);
  if (step.lengthSq() > 0) {
    step.normalize().multiplyScalar(speed);
    // Não deixar o alvo sair muito do mapa (meia vila + uma margem).
    const limit = Math.max(village.width, village.height) / 2 + 4;
    const target = controls.target.clone().add(step);
    target.x = THREE.MathUtils.clamp(target.x, -limit, limit);
    target.z = THREE.MathUtils.clamp(target.z, -limit, limit);
    step.subVectors(target, controls.target);
    // Câmara e alvo andam juntos: a vista desliza sem rodar.
    camera.position.add(step);
    controls.target.add(step);
  }

  // Q / E: rodar a câmara à volta do alvo (só no plano do chão).
  let turn = 0;
  if (pressed.has('turnLeft')) turn += 1;
  if (pressed.has('turnRight')) turn -= 1;
  if (turn !== 0) {
    const angle = turn * TURN_SPEED * (fast ? FAST_FACTOR : 1) * dt;
    step.subVectors(camera.position, controls.target).applyAxisAngle(UP, angle);
    camera.position.copy(controls.target).add(step);
  }
});
