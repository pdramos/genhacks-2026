// O cartão "The law": explica a lei verdadeira por trás das zonas onde se pode trabalhar.
// Em Portugal, o Decreto-Lei 82/2021 (artigo 49.º) manda limpar "faixas de gestão de combustível"
// à volta das aldeias, das casas e das estradas. O jogo usa essas faixas (arredondadas a quadrados).
// O texto vem do nível (level.law, em data/levels/*.json) e entra sempre com textContent:
// o texto de um ficheiro nunca vira HTML.
// O aspeto está em hud.css (procura "Cartão da lei").

let openCard = null; // o cartão que está aberto agora (só pode haver um)

// Abre o cartão da lei por cima de tudo (até por cima de outro cartão).
// Fecha com o botão "Close", com a tecla Escape ou com um clique no fundo escuro.
// returnFocusTo = o botão que o abriu: quando o cartão fecha, o foco volta para lá
//   (assim quem usa o teclado não se perde). Devolve o cartão.
export function showLawCard(level, returnFocusTo = document.activeElement) {
  const law = level?.law;
  if (!law) return null;
  if (openCard) return openCard; // já está aberto: não abre outro

  // O fundo escuro tapa o resto do jogo (e os botões do cartão de baixo).
  const backdrop = document.createElement('div');
  backdrop.className = 'law-backdrop';

  const card = document.createElement('div');
  card.className = 'result-card law-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'law-heading');
  card.innerHTML = `
    <div class="result-title">The law</div>
    <div class="law-body">
      <div class="law-heading" id="law-heading"></div>
      <p class="law-intro"></p>
      <ul class="law-strips"></ul>
      <p class="law-source"></p>
      <div class="law-game">
        <div class="story-heading">In the game</div>
        <p class="law-game-text"></p>
      </div>
      <p class="law-canada"></p>
      <ul class="law-links"></ul>
      <div class="credit law-note"></div>
    </div>
    <div class="result-buttons">
      <button type="button" class="result-button" data-do="close">Close</button>
    </div>`;

  // Os textos simples: se o nível não tiver um deles, tira-se o elemento vazio.
  fillText(card, '.law-heading', law.title);
  fillText(card, '.law-intro', law.intro);
  fillText(card, '.law-source', law.source);
  fillText(card, '.law-game-text', law.inGame);
  if (!law.inGame) card.querySelector('.law-game').remove();
  fillText(card, '.law-canada', law.canada);
  fillText(card, '.law-note', law.note);

  // As três larguras: uma linha cada, com a largura numa "pastilha" e o artigo da lei.
  const strips = card.querySelector('.law-strips');
  for (const strip of law.strips || []) {
    const item = document.createElement('li');
    const width = document.createElement('span');
    width.className = 'law-width';
    width.textContent = strip.width;
    const where = document.createElement('span');
    where.textContent = ' ' + strip.where + ' ';
    const article = document.createElement('span');
    article.className = 'law-article';
    article.textContent = `(${strip.article})`;
    item.append(width, where, article);
    strips.append(item);
  }

  // As ligações oficiais abrem num separador novo. "noopener noreferrer" impede
  // a página de fora de mexer no jogo e de saber de onde veio o clique.
  const links = card.querySelector('.law-links');
  for (const { label, url } of law.links || []) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    item.append(link);
    links.append(item);
  }

  // Fechar: tira o cartão e o fundo, deixa de ouvir o teclado e devolve o foco.
  function close() {
    card.remove();
    backdrop.remove();
    removeEventListener('keydown', onKey, true);
    openCard = null;
    returnFocusTo?.focus?.();
  }
  // "true" = ouvimos a tecla ANTES dos outros módulos (ex.: o Esc das ferramentas),
  // e stopPropagation() faz com que o Esc só feche este cartão.
  function onKey(event) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close();
  }
  addEventListener('keydown', onKey, true);
  backdrop.addEventListener('click', close);
  card.querySelector('[data-do="close"]').addEventListener('click', close);

  document.body.append(backdrop, card);
  card.querySelector('[data-do="close"]').focus();
  openCard = card;
  return card;
}

// O botão "The law" para pôr ao lado de outros botões de um cartão.
// Devolve null se o nível não tiver lei (ex.: a vila de demonstração).
export function lawButton(level) {
  if (!level?.law) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'result-button secondary';
  button.dataset.do = 'law';
  button.textContent = 'The law';
  button.addEventListener('click', () => showLawCard(level, button));
  return button;
}

// Escreve um texto do nível num elemento do cartão; sem texto, tira o elemento.
function fillText(card, selector, text) {
  const element = card.querySelector(selector);
  if (text) element.textContent = text;
  else element.remove();
}
