// Ícones do jogo, desenhados em SVG (texto), sem imagens descarregadas.
// Cada ícone usa uma "caixa" de 48 x 48 (viewBox) e é posto no HTML com innerHTML.
// As linhas de contorno usam "currentColor": a cor vem do CSS (assim um botão
// desligado pode ficar cinzento sem mudar o desenho).

// Abre e fecha a etiqueta <svg> à volta dos desenhos de cada ícone.
function svg(inner) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${inner}</svg>`;
}

// Moeda dourada com o símbolo do euro.
export const coinIcon = svg(`
  <circle cx="24" cy="24" r="20" fill="#f2a516" stroke="currentColor" stroke-width="3"/>
  <circle cx="24" cy="24" r="14" fill="#ffd34d"/>
  <path d="M30 16.5a9 9 0 1 0 0 15" fill="none" stroke="#c97a06" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M14 21.5h11M14 26.5h11" stroke="#c97a06" stroke-width="3" stroke-linecap="round"/>
  <path d="M15 13a13 13 0 0 1 9-4" stroke="#fff3c4" stroke-width="2.6" stroke-linecap="round" fill="none"/>`);

// "Clear brush": um ancinho e uma folha seca.
export const rakeIcon = svg(`
  <path d="M30 6 L20 30" stroke="#9b6a3c" stroke-width="4" stroke-linecap="round"/>
  <path d="M9 27 L30 34" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M10 28 L7 36 M15 30 L12 38 M20 31.5 L17 39.5 M25 33 L22 41" stroke="currentColor"
        stroke-width="3" stroke-linecap="round"/>
  <path d="M32 44 C29 37 34 31 44 31 C45 39 40 44 32 44 Z" fill="#e0912f" stroke="currentColor" stroke-width="2.4"
        stroke-linejoin="round"/>
  <path d="M33 43 L41 34" stroke="#a65a12" stroke-width="2" stroke-linecap="round"/>`);

// "Firebreak": um buldózer amarelo a abrir uma faixa.
export const bulldozerIcon = svg(`
  <rect x="2" y="40" width="44" height="5" rx="2.5" fill="#c98b4f"/>
  <rect x="5" y="30" width="27" height="10" rx="5" fill="#4a4038" stroke="currentColor" stroke-width="2.4"/>
  <circle cx="10.5" cy="35" r="2.4" fill="#cfc6bb"/><circle cx="18.5" cy="35" r="2.4" fill="#cfc6bb"/>
  <circle cx="26.5" cy="35" r="2.4" fill="#cfc6bb"/>
  <rect x="7" y="19" width="22" height="11" rx="2.5" fill="#ffc22e" stroke="currentColor" stroke-width="2.4"/>
  <path d="M11 19 V10 H24 L26 19" fill="#ffc22e" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M14 13 H22 L23 18 H14 Z" fill="#bfe6ff"/>
  <path d="M29 25 L37 27" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="M36 18 L42 18 L45 40 L35 40 Z" fill="#9aa3ab" stroke="currentColor" stroke-width="2.4"
        stroke-linejoin="round"/>`);

// "Replace trees": um rebento (árvore nova) a nascer da terra.
export const saplingIcon = svg(`
  <ellipse cx="24" cy="41" rx="16" ry="5" fill="#9b6a3c" stroke="currentColor" stroke-width="2.4"/>
  <path d="M24 40 C24 32 23 26 24 18" stroke="#3f7d2c" stroke-width="3.4" stroke-linecap="round" fill="none"/>
  <path d="M23.5 28 C13 29 8 21 9 13 C18 12 24 18 23.5 28 Z" fill="#6cc04a" stroke="currentColor"
        stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M24.5 21 C27 11 35 7 42 9 C42 18 34 23 24.5 21 Z" fill="#8fd65a" stroke="currentColor"
        stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M12 16 L22 26 M28 18 L39 11" stroke="#3f7d2c" stroke-width="1.8" stroke-linecap="round"/>`);

// "Undo": uma seta que volta para trás.
export const undoIcon = svg(`
  <path d="M10 21 H29 C36 21 41 26 41 32 C41 38 36 42 29 42 H20" fill="none" stroke="#4c8fd6"
        stroke-width="6" stroke-linecap="round"/>
  <path d="M19 9 L7 21 L19 33" fill="none" stroke="#4c8fd6" stroke-width="6" stroke-linecap="round"
        stroke-linejoin="round"/>
  <path d="M10 21 H29 C36 21 41 26 41 32 C41 38 36 42 29 42 H20 M19 9 L7 21 L19 33" fill="none"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>`);

// Chama, para o botão "Start disaster".
export const flameIcon = svg(`
  <path d="M24 3 C26 13 38 18 38 30 C38 38.5 31.7 45 24 45 C16.3 45 10 38.5 10 30 C10 22 16 18 17 11
           C20 15 21 18 21 22 C24 17 25.5 11 24 3 Z" fill="#ff8a1e" stroke="#7a1d05" stroke-width="2.6"
        stroke-linejoin="round"/>
  <path d="M24 22 C26 28 32 30 32 36 C32 40.5 28.5 44 24 44 C19.5 44 16 40.5 16 36 C16 31 21 29 24 22 Z"
        fill="#ffd84a"/>
  <path d="M24 32 C25 35 28 36 28 39 C28 41.2 26.2 43 24 43 C21.8 43 20 41.2 20 39 C20 36.5 23 35 24 32 Z"
        fill="#fff6c9"/>`);

// Seta do vento: atravessa o mostrador todo e aponta para a direita (o código roda-a).
// À esquerda (a "cauda") ficam as linhas de rajada: é de LÁ que o vento vem.
// À direita fica a ponta da seta: é para LÁ que o vento empurra o fogo.
// Primeiro desenhamos tudo um pouco mais grosso a castanho (o contorno, como nos outros
// desenhos do jogo) e depois por cima: as rajadas a branco e a seta a azul.
export const windArrowIcon = svg(`
  <g stroke="#3b2a1e" stroke-linecap="round" stroke-linejoin="round" fill="#3b2a1e">
    <path d="M3 15 H13 M3 33 H13 M1.5 24 H5.5" stroke-width="6.2" fill="none"/>
    <path d="M10 24 H32" stroke-width="8.6" fill="none"/>
    <path d="M30 13 L46 24 L30 35 Z" stroke-width="3"/>
  </g>
  <path d="M3 15 H13 M3 33 H13 M1.5 24 H5.5" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M10 24 H33" stroke="#2b6fb8" stroke-width="5.4" stroke-linecap="round"/>
  <path d="M31.5 16.5 L42.5 24 L31.5 31.5 Z" fill="#2b6fb8" stroke="#2b6fb8" stroke-width="1.6" stroke-linejoin="round"/>`);

// Casa e escola, para o cartão do resultado.
export const houseIcon = svg(`
  <path d="M8 23 L24 9 L40 23" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"
        stroke-linejoin="round"/>
  <path d="M12 21 V40 H36 V21 L24 11 Z" fill="#fff6e5" stroke="currentColor" stroke-width="2.6"
        stroke-linejoin="round"/>
  <path d="M7 24 L24 9 L41 24 L37 24 L24 13 L11 24 Z" fill="#d9583b" stroke="currentColor" stroke-width="2.4"
        stroke-linejoin="round"/>
  <rect x="20" y="28" width="8" height="12" rx="1" fill="#9b6a3c"/>`);

export const schoolIcon = svg(`
  <rect x="6" y="20" width="36" height="21" rx="2" fill="#fff6e5" stroke="currentColor" stroke-width="2.6"/>
  <path d="M4 21 L24 10 L44 21 Z" fill="#4c8fd6" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M24 10 V3 L31 5 L24 7" fill="#e8452c" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  <rect x="20" y="30" width="8" height="11" fill="#9b6a3c"/>
  <rect x="10" y="25" width="6" height="5" fill="#bfe6ff"/><rect x="32" y="25" width="6" height="5" fill="#bfe6ff"/>`);
