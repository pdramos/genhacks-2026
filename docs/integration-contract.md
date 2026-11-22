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
`tests/balance.test.js` simula sementes 1–30 por estratégia e garante:
- **nada:** média < 0,5★;
- **"limpar tudo o que é permitido, a começar no topo":** cerca de 1★ (≤ 1,3);
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
