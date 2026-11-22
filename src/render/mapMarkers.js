// MARCADORES POR CIMA DO MAPA (etiquetas HTML que seguem a câmara):
//   - o quartel dos bombeiros (o edifício "escola" do nível) tem sempre um ícone por cima,
//     para o jogador saber logo o que TEM de salvar;
//   - na construção, um "?" no meio de cada estrada da serra: o cigarro vai cair perto de uma
//     delas, mas não se sabe qual (só aparece se o nível tiver vários sítios possíveis);
//   - no fim, um círculo vermelho em cada casa que ardeu (markLostHouses), para o "Look around".
// As contas (que quadrados marcar) estão em mapHints.js; aqui só se desenha.
import * as THREE from 'three';
import { game, onFrame, onPhaseChange } from './main.js';
import { serraRoadSpots } from './mapHints.js';
import { schoolIcon } from './ui/icons.js';

const layer = document.createElement('div');
layer.className = 'map-markers';
document.body.append(layer);

const markers = []; // { element, world: THREE.Vector3, phases: null (sempre) ou ['build', ...] }

// Uma etiqueta presa ao quadrado (x, y), um pouco acima das casas ou árvores.
function addMarker(x, y, className, html, phases = null) {
  const element = document.createElement('div');
  element.className = `map-marker ${className}`;
  element.innerHTML = html;
  layer.append(element);
  const ground = game.view.worldPosition(x, y);
  const top = game.view.propTop?.(x, y) ?? ground.y;
  const marker = { element, world: new THREE.Vector3(ground.x, Math.max(top, ground.y) + 0.35, ground.z), phases };
  markers.push(marker);
  return marker;
}

// O quartel: o meio dos 4 quadrados "school".
const schoolTiles = [];
game.village.tiles.forEach((row, y) => row.forEach((type, x) => { if (type === 'school') schoolTiles.push([x, y]); }));
if (schoolTiles.length > 0) {
  const [x0, y0] = schoolTiles[0];
  const marker = addMarker(x0, y0, 'station', `<span class="marker-icon">${schoolIcon}</span>`);
  // Centrado no bloco 2x2: meio quadrado para a direita e para baixo.
  marker.world.x += 0.5;
  marker.world.z += 0.5;
  marker.element.title = game.level.schoolName || 'School';
  marker.element.querySelector('.marker-icon').setAttribute('aria-label', marker.element.title);
}

// Os "?" das estradas da serra (só com a ignição escondida: vários candidatos).
if ((game.level.ignitionCandidates?.length ?? 0) > 1) {
  for (const { x, y } of serraRoadSpots(game.village)) addMarker(x, y, 'mystery', '?', ['build']);
}

// Marca as casas que arderam (lista de [x, y]) com um círculo vermelho.
export function markLostHouses(tiles) {
  for (const [x, y] of tiles) addMarker(x, y, 'lost', '', ['result']);
  showForPhase(game.phase);
}

function showForPhase(phase) {
  for (const marker of markers) marker.element.hidden = marker.phases !== null && !marker.phases.includes(phase);
}
onPhaseChange(showForPhase);
showForPhase(game.phase);

// A cada desenho, passa cada posição 3D para píxeis no ecrã.
const projected = new THREE.Vector3();
onFrame(() => {
  for (const marker of markers) {
    if (marker.element.hidden) continue;
    projected.copy(marker.world).project(game.camera);
    const behind = projected.z > 1; // atrás da câmara
    marker.element.style.visibility = behind ? 'hidden' : '';
    const px = (projected.x + 1) / 2 * innerWidth;
    const py = (1 - projected.y) / 2 * innerHeight;
    marker.element.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
  }
});
