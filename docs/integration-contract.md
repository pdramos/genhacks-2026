# Contrato de integração (ronda "qualidade", 22/11/2026)

Várias pessoas/agentes trabalham ao mesmo tempo, cada uma no **seu ficheiro**. Este documento fixa **os nomes e as formas** que ligam as partes. Antes de mudar alguma coisa daqui, pergunta. Lê também `CLAUDE.md` e `GLOSSARY.md`.

## Decisões do estudante (fixas)
- O nível de Portugal passa a ser **Sintra/Cascais, incêndio de outubro de 2018** (região de Lisboa). O ficheiro é `data/levels/sintra.json` e o estilo é `src/render/styles/sintra.js`. Casas ao estilo de Lisboa e Sintra, numa encosta junto à serra. O `demo.json` e os estilos `portugal`/`canada` continuam a existir para desenvolvimento.
- **O fogo começa com uma cena:** um carro passa na estrada, uma ponta de cigarro voa pela janela, cai no mato seco da berma, sai fumo e o incêndio começa.
- **O chão não pode parecer um tabuleiro:** terreno contínuo com relevo e transições suaves entre tipos.
- **A interface tem de parecer de jogo**, não de site.
- **Som gerado por código** (Web Audio API), sem ficheiros de áudio.
- Tudo é gerado por código: não se descarregam modelos, imagens nem sons.

## Dados do nível (`data/levels/*.json`)
```jsonc
{
  "name": "...", "style": "sintra",
  "budget": 12000,
  "map":     [20 strings de 20 letras],  // ver GLOSSARY
  "heights": [20 strings de 20 algarismos 0-9],  // NOVO, opcional (sem ele, o terreno é plano)
  "ignition": { "x": 0, "y": 0 },  // quadrado de vegetação (mato/relva) COLADO a uma estrada: é onde cai o cigarro
  "wind": { "direction": 0, "speed": 0 },  // de onde vem o vento, em graus; km/h
  "briefing": "...", "sources": ["url", ...]  // opcional; os ecrãs de missão chegam depois
  "schoolName": "Fire station"  // opcional; nome do edifício "S" no cartão final (por omissão "School")
}
```
`createVillage(level)` devolve `{ name, width, height, tiles, heights }`. A função `heightAt(village, x, y)` existe e devolve 0–9.

## Simulação do fogo (`src/sim/fire.js`, dono: agente FIRE-SIM)
Assinatura mantida: `runDisaster(village, { ignition, wind, seed, k, maxSteps })`.
Cada passo **mantém** `{ step, burning: [[x,y]...], burned: [[x,y]...] }` e **acrescenta**:
- `intensity`: objeto `"x,y" -> número 0..1`, a força do fogo em cada quadrado a arder (eucaliptos e mato fazem fogo forte; relva, fogo fraco);
- `spots`: lista `[[fromX, fromY, toX, toY]...]` das **brasas** que saltaram neste passo (para a animação).

O `outcome` fica igual.

Regras novas, todas com testes:
- **declive:** o fogo sobe a encosta mais depressa e desce mais devagar (usa `village.heights`);
- **brasas (spotting):** com vento forte há uma chance pequena de acender um quadrado a 2–3 de distância a favor do vento, por cima de estradas estreitas; nunca em água, estrada ou corta-fogo;
- **duração variável:** cada quadrado arde durante um número de passos com um pouco de acaso, para a frente do fogo ficar irregular e natural.

Continua determinístico: a mesma semente dá sempre o mesmo resultado.

## Terreno (`src/render/terrain.js`, dono: agente TERRAIN)
`createTerrain(scene, village, palette)` devolve:
- `groundHeight(x, y)` → altura no mundo (em unidades 3D) no **centro** do quadrado; os objetos são postos a esta altura;
- `setSurface(x, y, type)` → muda a cor/aspeto do chão nesse quadrado (`'burned'` é um valor válido);
- `pickTile(raycaster)` → `{x, y}` ou `null`;
- `update(t)` → animação da água.

O dono do terreno também atualiza `src/render/village3d.js`, que passa a usar o terreno, e mantém a mesma API pública da vista: `setTileType`, `setBurned`, `tileFromPointer`, `worldPosition` (agora devolve também `y`, a altura do chão) e `update`.
- Na vista, `setBurned(x, y)` chama `terrain.setSurface(x, y, 'burned')` e `charProp(prop)` (ver abaixo).

## Aspeto de queimado (`src/render/charring.js`, dono: agente FIRE-VFX)
`charProp(group)` transforma os objetos de um quadrado em queimados: as árvores ficam reduzidas a troncos pretos sem copa (a copa é escondida ou trocada por ramos secos), as casas ficam com paredes enegrecidas e o telhado caído ou escuro, e há cinza cinzenta. Não pode parecer lama: o queimado é **carvão preto e cinza**, com algumas brasas.

## Efeitos do fogo (`src/render/fireFx.js`, dono: agente FIRE-VFX)
- API mantida: `ignite(x,y)`, `extinguish(x,y)`, `clear()`, `update(dt,t)`.
- Novo: `setIntensity(x, y, value0to1)`, `ember(fromX, fromY, toX, toY)` (brasa a voar) e `smolder(x, y)` (brasas a brilhar e fumo fino depois de arder).
- As chamas são texturas desenhadas em canvas e animadas, com altura proporcional à intensidade. Uma grande coluna de fumo inclina-se a favor do vento. Mantém um número **fixo** de luzes, para o jogo não congelar.
- `createFireFx(scene, view)`: usa `view.worldPosition(x, y)`, que inclui `y` (a altura).

## Cena do cigarro (`src/render/ignitionCinematic.js`, dono: agente CINEMATIC)
`playIgnition(game)` devolve uma **Promise** que termina quando o fogo deve começar (cerca de 6–8 s).
1. Um carro low-poly, feito em código, percorre a estrada que passa junto a `level.ignition`.
2. A câmara acompanha-o suavemente.
3. Uma ponta de cigarro, a brilhar, sai pela janela em arco e cai no quadrado da ignição.
4. Sai um fiozinho de fumo e o carro vai-se embora.

Usa `game.view.worldPosition`. Também pode chamar `audio.play('car')` se o módulo de áudio existir (importa `src/render/audio.js`).

## Interface (`src/render/ui/`, dono: agente UI)
- Folha de estilos `src/render/ui/hud.css`, com um look de jogo: painéis com cantos arredondados, sombras e ícones desenhados em SVG inline ou CSS, e um tipo de letra do Google Fonts permitido (por exemplo "Fredoka" ou "Baloo 2").
- Barra de cima: orçamento como um contador de moedas, e o vento quando houver desastre.
- Barra de baixo: cartas das ferramentas, com ícone, nome e preço.
- Mensagens como "toast" animado.
- O botão "Start disaster" é grande, com um ícone.
- O dono atualiza `buildPanel.js` e as partes de interface do `disasterPlayer.js` (botão e indicador do vento) **sem mudar a lógica**.
- Texto da interface em inglês.

## Som (`src/render/audio.js`, dono: agente AUDIO)
API:
- `initAudio()`: chamado no primeiro clique do jogador, por causa da política de autoplay;
- `setAmbience(phase)`: `'build'` = vento leve e pássaros; `'disaster'` = vento forte;
- `setFireLevel(0..1)`: o crepitar do fogo segue a quantidade de fogo;
- `play(name)`: `'click'`, `'build'`, `'error'`, `'car'`, `'ignite'`, `'siren'`, `'win'`, `'lose'`;
- `setMuted(bool)`.

Tudo é sintetizado com Web Audio (osciladores e ruído filtrado). Há um botão de som on/off. Liga-se aos outros pelos hooks `onPhaseChange`/`onFrame` do `main.js` e entra como `<script type="module">` no `index.html`.

## Ligação final (`src/render/disasterPlayer.js`)
Fluxo do botão "Start disaster":
1. `setPhase('disaster')`
2. `await playIgnition(game)`
3. `runDisaster(...)`
4. reproduzir os passos: `fireFx.ignite` + `setIntensity` para os que ardem; para os que arderam, `fireFx.extinguish` + `smolder` + `view.setBurned`; `ember` para os spots
5. `setPhase('result')`

Quem integra no fim é o agente MERGER.

---

# Ronda "dificuldade" (22/11/2026) — tickets #12, #13, #14

Decisões do estudante: manter a cena do cigarro e a fase de construção; o jogo está fácil demais; aprovou as 4 mudanças e pediu um mapa maior.
Medido antes desta ronda (20 fogos por estratégia): nada → 1,0 estrelas; limpar todo o mato → 2,95 (3★ em 19/20); ao calhas → 2,0.

## Simulação (dono: agente SIM-DIFF)
- **`src/sim/ignition.js` (novo):** `pickIgnition(level, seed)` → `{x, y}`. Escolhe de `level.ignitionCandidates` (lista de `{x,y}`, cada um um quadrado de vegetação colado a uma estrada) de forma determinística pela semente. Se não houver candidatos, usa `level.ignition`.
- **`src/sim/actions.js`:**
  - `isWorkable(village, x, y)` → `true` se o quadrado estiver a ≤ 2 quadrados (Chebyshev) de uma casa ou da escola, ou a ≤ 1 de uma estrada. Senão, é Parque Natural.
  - `applyAction` passa a recusar fora destas faixas com o motivo **`'protected-area'`**. A ordem das verificações é: `outside`, `already-changed`, `protected-area`, `invalid-target`, `not-enough-money`.
  - `actionCost(village, x, y, actionName)` → custo base × fator de declive. O fator é 1 no plano e cresce com a diferença de altura para os vizinhos; a constante fica documentada.
  - `applyAction`/`undoAction` usam este custo, e o reembolso devolve exatamente o que foi pago.
  - `checkAction` (já existe) devolve também o custo.
- O `runDisaster` não muda de assinatura. Quem chama passa `ignition: pickIgnition(level, seed)`.
- **Constantes de equilíbrio** ficam num só sítio, `src/sim/balance.js` (novo), importadas pelos outros: orçamento por nível se não vier no JSON, fator de declive e os limites das estrelas, se forem precisos.

## Mapa (dono: agente MAP)
- `data/levels/sintra.json` passa a ser **32×32**, com `heights`, `ignitionCandidates` (≥ 4, em pelo menos 2 estradas diferentes da serra), `ignition` (o primeiro candidato, para compatibilidade) e `budget` (provisório; o agente BALANCE afina-o).
- O mapa conta a mesma história, só que maior: serra com 2–3 estradas, a EN247, a vila com o largo e o quartel `S` 2×2, e a costa e o mar a sudoeste. O `demo.json` fica 20×20.

## Desenho e desempenho (dono: agente PERF)
- `src/render/village3d.js` + estilos: menos chamadas de desenho.
  - Juntar a geometria por material em cada quadrado, e usar instancing para coisas repetidas (tufos de erva, arbustos).
  - Objetos pequenos sem sombra.
  - A API da vista não muda; `setTileType`/`setBurned` continuam por quadrado.
- Medir e reportar draw calls e FPS no demo 20×20 e em Sintra 32×32.

## Interface (dono: agente UI-DIFF)
- **Fase de construção:**
  - faixas trabalháveis visíveis, com um contorno ou tom suave;
  - quadrados de Parque Natural com um 🔒 discreto e o toast "Protected natural park — you can only clear the legal fuel strips" ao clicar;
  - custo real ao passar o rato (já existe uma pré-visualização; mostrar o preço com o declive).
- **Semente:** cada jogo novo sorteia uma semente no browser (`Math.random` só na interface; a simulação recebe a semente). "Play again" faz um jogo novo; um "Try again (same night)" mantém o plano e a semente.
- **O cinemático** usa a ignição escolhida (`pickIgnition`), e o carro passa na estrada desse candidato.
- **Câmara:** enquadra o mapa maior.
- O dono é responsável por `buildPanel.js`, `disasterPlayer.js`, `ignitionCinematic.js`, `main.js` (câmara) e `hud.css`.

## Equilíbrio (dono: agente BALANCE, depois da junção)
`tests/balance.test.js` simula sementes 1–30 por estratégia e garante:
- **nada:** média < 0,5★;
- **"limpar tudo o que é permitido, a começar no topo":** cerca de 1★ (≤ 1,3);
- **um bom plano escrito no teste:** ≥ 2★ na maioria das sementes;
- **3★:** < 35% mesmo para o bom plano.

Afina o orçamento, os custos, o fator de declive, as constantes do fogo (com cuidado, sem partir os testes do fogo) e os limites das estrelas.
