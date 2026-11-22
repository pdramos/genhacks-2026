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
- O `runDisaster` não muda de assinatura. Quem chama passa `ignition: resolveIgnition(village, level, seed)` (DEPOIS da construção): é o `pickIgnition`, mas se o candidato não arder (corta-fogo) o fogo começa no primeiro quadrado que arde à volta (8 vizinhos, depois o anel seguinte, ordem fixa). Sem isto, um corta-fogo em cada candidato dava 3★ sempre.
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
- **O cinemático** usa a ignição já resolvida (`resolveIgnition`), e o carro passa na estrada desse quadrado.
- **Câmara:** enquadra o mapa maior.
- O dono é responsável por `buildPanel.js`, `disasterPlayer.js`, `ignitionCinematic.js`, `main.js` (câmara) e `hud.css`.

## Equilíbrio (dono: agente BALANCE, depois da junção)
`tests/balance.test.js` simula sementes 1–120 por estratégia (era 1–30 até à ronda "o fogo nasce sempre", mais abaixo; `BALANCE_SEEDS=1000 BALANCE_FIRST_SEED=4001 npm test` corre outras sementes) e garante:
- **nada:** média < 0,5★ (por cumprir; desde a ronda "não fazer nada perde", mais abaixo, o teste garante < 0,75★ e 3★ em menos de 15% das sementes);
- **"limpar tudo o que é permitido, a começar no topo":** cerca de 1★ (≤ 1,3), e não melhor do que não fazer nada;
- **um bom plano escrito no teste:** ≥ 2★ na maioria das sementes;
- **3★:** < 35% mesmo para o bom plano.

Afina o orçamento, os custos, o fator de declive, as constantes do fogo (com cuidado, sem partir os testes do fogo) e os limites das estrelas.

Duas guardas da revisão de equilíbrio: **corta-fogo em cada candidato** e **só proteger o quartel** ficam pelo menos 0,3★ abaixo do bom plano; e cada passo do bom plano tem de aplicar ações (nenhum passo pode ficar só com `not-enough-money`).

**Resultado (sementes 1–30, orçamento 12 000), depois da revisão:** nada 1,07★ · ingénuo 1,10★ · ao calhas 1,07★ · corta-fogo nos candidatos 1,20★ (era 3,00) · só o quartel 1,27★ (era 1,80) · bom plano 1,70★, ≥ 2★ em 60% e 3★ em 13%.
O bom plano: corta-fogo na ravina por cima do quartel (€3 000), corta-fogo nos eucaliptos a norte da EN247 em frente ao quartel e ao leste (€7 500) e limpar o mato a norte da EN247 em frente à vila oeste (€1 300). O que mudou: corta-fogo em árvores custa €1 000 (trocar árvores, €800, passa a compensar); o quartel tem casas a leste (a ravina é só a faixa colada à EN247); o candidato da costa (5, 6) passou para (7, 7), do outro lado da estrada da Peninha, de onde o fogo desce para a vila.
A meta "nada < 0,5★" **não foi cumprida** e está como `todo` no teste: os fogos a oeste da estrada x=19 muitas vezes ficam na vila oeste e nunca chegam ao quartel, por isso não fazer nada ainda dá 1–2★ em cerca de metade das sementes. As afinações do fogo que desciam abaixo de 0,5 partiam os testes da forma do fogo (elipse). Para lá chegar é preciso mexer no mapa (por exemplo, nos `ignitionCandidates` ou no sítio do quartel).

### Ronda "salvar todas as casas" (22/11/2026)
Pedido do estudante: com o mapa maior e menos dinheiro, não perder nenhuma casa tem de ser **difícil, mas possível**. Testado primeiro com as regras de então (€12 000): o melhor plano encontrado (3 procuras por computador + um plano à mão) dava 3★ em ~50% das noites, mas ≥ 2★ só em 67–83%. Mesmo a trabalhar TODOS os quadrados permitidos (~€190 000) ardiam casas em ~20% das noites: as brasas da floresta da linha 10 (Parque Natural, não se pode trabalhar) saltavam a linha 11 e a EN247 e caíam nas casas da linha 13.

Nova meta e nova estratégia no teste: o **plano do perito** (`tests/fixtures/expert-plan-sintra.json`, aplicado ação a ação pelo `applyAction`, tem de caber no orçamento) dá **3★ em ≥ 50%** e **≥ 2★ em ≥ 85%** das sementes 1–30. A meta "3★ < 35%" passa a valer para todas as estratégias menos o perito.

Mudanças (as mais pequenas que chegaram; nenhuma constante de `balance.js` nem do fogo mudou):
- **Mapa:** em `sintra.json`, a linha 10, x 8–17, passa de floresta a pastagem (`G`), entre a serra e a EN247, por cima da vila oeste.
- **Orçamento de Sintra:** 12 000 → **20 000** (e o `briefing` diz "20,000 euros").

O que se testou e não chegou: só o orçamento (€20 000 com o mapa antigo: 3★ ~47%, ≥ 2★ ~80%; seriam precisos ~€45 000); só o mapa (€12–16 000: ≥ 2★ ~80%); `HOUSE_STRIP` = 3 (o plano custava > €40 000).

**Resultado (orçamento 20 000):**

| estratégia | sementes 1–30 | sementes 31–90 |
|---|---|---|
| nada | 1,27★ (3★ 7%) | 1,27★ (3★ 18%) |
| ingénuo | 1,17★ | 1,63★ |
| ao calhas | 1,27★ | 1,53★ |
| corta-fogo nos candidatos | 1,33★ | 1,40★ |
| só o quartel | 1,30★ | 1,65★ |
| bom plano | 1,80★, ≥ 2★ 67%, 3★ 17% | 2,07★, ≥ 2★ 87%, 3★ 23% |
| **perito (€19 930)** | **2,43★, ≥ 2★ 87%, 3★ 60%** | **2,63★, ≥ 2★ 95%, 3★ 70%** |

Antes (orçamento 12 000, mapa antigo): nada 1,07 / 1,08 · ingénuo 1,10 / 1,43 · bom plano 1,70 / 2,00 · melhor plano encontrado 2,30★ (3★ 50%, ≥ 2★ 83%) / 2,07★ (3★ 48%, ≥ 2★ 67%).
Em 2000 sementes (4001–6000): nada 1,45 · ingénuo 1,68 · perito 2,46 (3★ 64%, ≥ 2★ 88%).

Avisos: a pastagem também ajuda quem não faz nada (1,07 → 1,27 nas sementes 1–30), por isso a guarda "nada ≤ 1,2" passou a **≤ 1,3** e a meta "nada < 0,5★" continua `todo`. O ingénuo só fica ≤ 1,3 nas sementes 1–30; em muitas sementes dá ~1,6–1,7, quase o mesmo que não fazer nada (~1,45).

### Ronda "o fogo nasce sempre" (22/11/2026, depois da verificação)
A verificação da ronda anterior (com scripts próprios, em mais sementes) encontrou três problemas:
- **30 sementes enganavam.** O ingénuo dava 1,17★ nas sementes 1–30, mas ~1,7★ nas outras (3★ em ~30%); não fazer nada dava ~1,4★. O perito tinha ≥ 2★ em 26 de 30 sementes (à justa) e em 88% a longo prazo.
- **Informação escondida.** ~€5 000 do plano do perito estavam colados aos `ignitionCandidates`, que o jogador não via: os "?" estavam no meio de cada estrada da serra. Esses remendos valiam ~13 pontos de 3★. O mesmo esforço à volta dos "?" do mapa não dava nada.
- **(21, 2) e (25, 6):** as brasas da berma de eucaliptos em frente ao quartel (linha 11, x 20–25) saltavam a EN247 para as casas do leste e o quartel; abater esses eucaliptos custava ~€7 500.

Mudanças:
- **Os "?" mostram os sítios verdadeiros do cigarro** (`ignitionSpots` em `src/render/mapHints.js`, um "?" por candidato) e o `ignitionHint` de Sintra diz isso.
- **O cigarro só acende combustível seco** (`CIGARETTE_MIN_FLAMMABILITY` = 0,3 em `balance.js`; `catchesCigarette` e `resolveIgnition` em `src/sim/ignition.js`). Terra limpa (0,15) ainda arde quando o fogo lá chega, mas o cigarro rola para a erva, o mato ou as árvores mais perto, como já fazia com um corta-fogo. Antes, limpar o mato no "?" fazia o fogo nascer em terra limpa e morrer logo: isso valia mais do que defender a vila, e era isso que fazia o ingénuo (que limpa as bermas da serra de cima para baixo) ganhar a quem não faz nada.
- **Mapa:** em `sintra.json`, a linha 11, x 20–25 (a berma norte da EN247 em frente ao quartel e às casas do leste), passa de eucalipto a mato (`B`), e a `story` di-lo. Limpar a berma custa €1 500.
- **Plano do perito novo** (`tests/fixtures/expert-plan-sintra.json`, €19 910), feito só com o que se vê no mapa: a ravina do quartel (linha 13, x 19–22), **toda** a berma norte da EN247 (linha 11, x 6–28, e (6, 10)), as orlas da vila ((8–9, 13) e (25, 13)) e alguns quadrados à volta dos "?" e da quinta. Só a ravina, a berma e as orlas (€15 000) já dão 3★ em ~49% e ≥ 2★ em ~90%.
- **Teste:** 120 sementes; nova estratégia **"markers"** (limpar o mato à volta de cada "?") com a sua guarda; o custo escrito no ficheiro do perito tem de ser o custo verdadeiro; o bom plano troca os eucaliptos em frente à vila oeste por folhosas; a guarda do quartel compara com o bom plano e com o perito (a ravina sozinha dá ~1,8★: é a melhor compra, mas não chega); a guarda "nada" passou a ≤ 1,65 (é ~1,5 em qualquer conjunto grande de sementes).
- Preços, declive, fogo, estrelas e orçamento (€20 000) ficaram iguais.

**Resultado (média de estrelas; para o bom plano e o perito também ≥ 2★ e 3★):**

| estratégia | sementes 1–120 (o teste) | 121–1120 | 4001–6000 |
|---|---|---|---|
| nada | 1,49★ | 1,50★ | 1,52★ |
| ingénuo | 1,38★ | 1,47★ | 1,49★ |
| ao calhas | 1,57★ | 1,68★ | 1,72★ |
| corta-fogo nos candidatos | 1,57★ | 1,63★ | 1,63★ |
| limpar à volta dos "?" | 1,54★ (3★ 25%) | 1,51★ (3★ 18%) | 1,49★ (3★ 20%) |
| só o quartel | 1,88★ | 1,82★ | 1,84★ |
| bom plano | 2,11★, ≥ 2★ 86%, 3★ 28% | 2,11★, 86%, 28% | 2,12★, 85%, 29% |
| **perito (€19 910)** | **2,49★, ≥ 2★ 93%, 3★ 60%** | **2,52★, 94%, 60%** | **2,51★, 94%, 60%** |

Antes desta ronda (mesmas sementes 121–1120): nada 1,43 · ingénuo 1,67 (3★ 30%) · perito 2,43 (≥ 2★ 88%, 3★ 63%).
Perito em 6000 sementes: 2,53★, ≥ 2★ 94%, 3★ 61%; em blocos de 120 sementes seguidas, o pior bloco tem 3★ 53% e ≥ 2★ 88% (nenhum falha as metas). Por sítio do cigarro (3★ / ≥ 2★): (7, 7) 85% / 98% · (8, 2) 83% / 97% · (18, 8) 89% / 98% · (25, 6) 50% / 90% · (21, 2) 31% / 89% · (27, 9) 26% / 93%. Nas noites de (21, 2) e (27, 9) salvar todas as casas é raro (a quinta na floresta, e a floresta do leste encostada às casas): fica como variedade de noite para noite.

O que se testou e não chegou: só a berma de mato (sem a regra do cigarro): perito ≥ 2★ ~94%, mas o ingénuo subia para ~1,75 e, com os "?" nos sítios verdadeiros, limpar à volta deles dava 3★ em 35–48%; um jardim à volta da quinta: não fazer nada subia para ~1,6; mais mato ou mais casas na vila oeste: não fazer nada quase não mudava; trocar candidatos de sítio: ganhos pequenos, por isso ficaram os mesmos 6.

**Metas que continuam por cumprir (`todo` no teste):** não fazer nada < 0,5★ (é ~1,5★) e o ingénuo ≤ 1,3★ (é ~1,5★, o mesmo que não fazer nada). Os fogos das estradas da serra a oeste quase nunca chegam ao quartel, por isso não fazer nada dá 1–2★ em cerca de metade das noites. Para descer seria preciso mudar o sítio do quartel ou das estradas da serra.

### Ronda "mapa real de Malveira da Serra" (22/11/2026, agente REBALANCE)
O mapa de Sintra (`data/levels/sintra.json`) foi refeito com dados reais (OpenStreetMap + relevo Copernicus): Malveira da Serra no sopé da serra, 194 casas, o quartel em (19, 15) e 6 "?" em (2, 8), (17, 3), (20, 7), (24, 7), (28, 9) e (3, 10). Os planos do teste eram do mapa antigo e as metas que dependiam do mapa ficaram `todo` até esta ronda.

**Mudanças:** nenhuma constante de `balance.js` mudou (preços, declive, faixas, cigarro, estrelas), nem o fogo, nem o mapa, nem o orçamento (€20 000; o `briefing` continua certo). Só os planos:
- **Plano do perito novo** (`tests/fixtures/expert-plan-sintra.json`, €19 610, 37 ações), afinado por computador (guloso + subida de encosta nas sementes 3001–3480, 5001–5600 e 7001–7600; 4 ações sem efeito foram tiradas a olhar para as sementes 1–1500). Só usa o que o jogo mostra: os "?" e o vento de norte. A ideia é **travar o fogo logo a sul (a favor do vento) de cada "?"**: (17, 3) €3 130, (20, 7) €2 750, (24, 7) e (28, 9) €5 000, (2, 8) e (3, 10) €4 520; mais a pastagem por cima das casas do quartel (€2 960) e quatro quadrados soltos a sul (€1 250).
- **Bom plano novo** (defender a vila, sem usar os "?"): limpar a pastagem e o mato por cima do quartel (x 17–20, linhas 9–11, €5 650; é também a estratégia "só o quartel"), o resto da orla norte de Malveira (x 13–16, €6 160), a orla norte de Almoinhas Velhas e do Arneiro (x 6–12, linhas 11–12, €4 500) e as primeiras casas do oeste (x 0–5, linhas 13–14, €3 280).
- **Teste:** o teste do mapa verifica o quartel em (19, 15) e os 6 "?"; todas as metas que dependem do mapa voltaram a contar (sem `todo`).

**Resultado (média de estrelas; para o bom plano e o perito também ≥ 2★ e 3★):**

| estratégia | sementes 1–120 (o teste) | 121–1120 | 4001–6000 |
|---|---|---|---|
| nada | 1,35★ | 1,56★ | 1,48★ |
| ingénuo | 1,35★ | 1,57★ | 1,48★ |
| ao calhas | 1,47★ | 1,69★ | 1,59★ |
| corta-fogo nos "?" | 1,43★ | 1,51★ | 1,44★ |
| limpar à volta dos "?" | 1,56★ (3★ 30%) | 1,60★ (3★ 32%) | 1,58★ (3★ 30%) |
| só o quartel | 1,67★ | 1,86★ | 1,83★ |
| bom plano (€19 590) | 2,02★, ≥ 2★ 85%, 3★ 22% | 2,13★, 82%, 35% | 2,11★, 84%, 31% |
| **perito (€19 610)** | **2,52★, ≥ 2★ 91%, 3★ 64%** | **2,59★, 92%, 70%** | **2,55★, 91%, 67%** |

Perito por "?" (sementes 121–1120, 3★ / ≥ 2★): (3, 10) 88% / 99% · (20, 7) 80% / 93% · (2, 8) 70% / 83% · (24, 7) 65% / 98% · (17, 3) 58% / 88% · (28, 9) 55% / 87%. A noite mais difícil é (17, 3): sem nada feito, o quartel arde em ~90% dessas noites (o fogo desce a serra protegida, x 5–18, direto a Malveira).

**Avisos honestos:**
- Um plano simples "corta-fogo logo a sul de cada '?' + a pastagem do quartel" (€14 100) já dá 3★ em ~56% (1–120) e ~59% (121–1120), mas ≥ 2★ só em 77–80%. Neste mapa, salvar todas as casas é mais fácil do que no mapa antigo para quem pensa no vento; o difícil é **não perder o quartel nem 20% das casas em quase todas as noites** (≥ 2★ em ≥ 85%). Não está no teste: é o próprio perito em versão simples.
- A guarda "3★ < 35%" passa no bom plano nas sementes do teste (22%), mas fica à justa noutras sementes (31–35%).
- O guloso sozinho (sem subida de encosta) dava 57% / 80% nas sementes 1–120: o ≥ 2★ é o que custa.
- Trabalhar TODOS os quadrados permitidos (~€340 000, menos à volta dos "?") dá 3★ em ~76% e ≥ 2★ em ~100%: o teto do mapa.

**Metas que continuam por cumprir (`todo` no teste):** não fazer nada < 0,5★ (é ~1,35–1,56★) e o ingénuo ≤ 1,3★ (dá o mesmo que não fazer nada: gasta tudo na floresta das linhas 0–2, longe de todos os fogos). Só os fogos dos dois "?" a norte de Malveira, (17, 3) e (20, 7), costumam chegar ao quartel; os de oeste e de leste queimam Almoinhas, o Arneiro ou a floresta de Janes e param aí.

### Ronda "não fazer nada perde" (22/11/2026)
A revisão da ronda anterior: não fazer nada ainda dava **1,45★** (sementes 1–200: 57% com ≥ 2★ e 20% com 3★) e 1,49★ em 200 sementes "de jogo" (números grandes, como o `newSeed` do browser). Um jurado que só carrega em "Start" ganhava 2 ou 3 estrelas em mais de metade das noites. A causa: com o vento forte de norte o fogo corre numa faixa **estreita** para sul (os flancos andam ~1/6 da cabeça), por isso os fogos dos "?" de oeste e de leste — (2, 8), (3, 10), (24, 7), (28, 9) — só queimavam a vila do oeste ou Janes (20–30 casas, menos de 20% das 194) e nunca o quartel. Além disso (2, 8) ficava mesmo por cima da EN247: com a estrada a sul (a favor do vento) o fogo morria logo no primeiro quadrado em ~1 de cada 3 noites.

**O que se testou e não chegou:** mais mato nos campos da vila oeste (G → B nas linhas 12–16): quase nada (±0,05★); o cigarro a arder mais tempo no primeiro quadrado: nada (a regra do fogo reparte a mesma probabilidade pelos passos); qualquer "?" a leste da estrada x = 25 dá ~1,6★ (o fogo queima a coluna de Janes, x 27–31, ~35 casas, e para na estrada x = 26). Um mapa de perigo (cada berma de estrada da serra como "?", 100 sementes) mostrou que só as bermas a norte da Malveira (x 15–22) e a curva da EN247 em (4–5, 8–9) põem o quartel em perigo.

**Mudanças** (nenhuma constante de `balance.js`, nem o fogo, nem as estrelas, nem o orçamento):
- **Os "?"** (`ignitionCandidates`): (5, 9) na curva da EN247 do lado da Peninha (onde o fogo verdadeiro atravessou a estrada; é a nova ignição fixa), (17, 3), (20, 5), (20, 7) e (20, 10) na serra e na Estrada da Serra por cima da Malveira, e (22, 1) na estrada dos Capuchos. Cada um tem a estrada a norte, oeste ou leste e mato a sul (o fogo não morre logo contra a estrada). As bermas novas (20, 5), (20, 10) e (22, 1) passam a mato seco (`B`, escolha de jogo, como antes); as antigas da floresta, (24, 7) e (28, 9), voltam a eucalipto (`E`, como no OpenStreetMap).
- **Plano do perito novo** (`tests/fixtures/expert-plan-sintra.json`, €20 000, 45 ações; guloso + subida de encosta nas sementes 3001–3400 e 5001–5300): corta-fogo e mato limpo a sul de cada "?", e um corta-fogo na ravina por cima do quartel (x 19, linhas 3–11), por onde descem os fogos da Estrada da Serra.
- **Teste:** os dois `todo` passam a testes a sério. "Não fazer nada" tem agora a meta **< 0,75★ e 3★ em menos de 15% das sementes** (a meta antiga, < 0,5★, continua por cumprir: ver abaixo); "o ingénuo ≤ 1,3★" já se cumpre e deixou de ser `todo`.

**Resultado:**

| estratégia | sementes 1–120 (o teste) | 121–1120 | 200 sementes de jogo |
|---|---|---|---|
| nada | 0,59★ (≥ 2★ 21%, 3★ 12%) | 0,73★ (27%, 13%) | 0,63★ (23%, 9%) |
| ingénuo | 0,79★ | 0,94★ | |
| ao calhas | 0,82★ | 0,88★ | |
| corta-fogo nos "?" | 0,72★ | 0,77★ | |
| limpar à volta dos "?" | 1,08★ (3★ 26%) | 0,94★ (3★ 20%) | |
| só o quartel | 1,14★ | 1,38★ | |
| bom plano (€18 590) | 1,62★, ≥ 2★ 64%, 3★ 20% | 1,81★, 76%, 19% | |
| **perito (€20 000)** | **2,49★, ≥ 2★ 88%, 3★ 73%** | **2,53★, 89%, 72%** | **2,51★, 91%, 68%** |

Sem fazer nada, por "?" (sementes 1–200): (17, 3) 0,34★ · (20, 5) 0,28★ · (20, 10) 0,53★ · (20, 7) 0,86★ · (5, 9) 0,88★ · (22, 1) 1,24★. O quartel arde em ~3 de cada 4 noites.

**Avisos honestos:**
- A meta "< 0,5★" do contrato **não se cumpre** (~0,6–0,7★). O que falta: o fogo de (5, 9) morre sozinho em ~1 de cada 4 noites (o vento empurra-o um pouco para oeste, contra a EN247) e o de (22, 1) pára muitas vezes nas casas do alto, sem chegar à Malveira. Descer mais pediria mexer no fogo (flancos mais largos), o que mudaria os testes da forma do fogo.
- O lado leste (Janes) deixou de ter "?": nenhum sítio de lá punha a vila em perigo a sério com vento de norte.
- O perito ficou um pouco mais fácil (3★ ~70%, era ~65%): os "?" estão mais juntos, por isso a mesma defesa (a ravina por cima do quartel) serve a vários.
