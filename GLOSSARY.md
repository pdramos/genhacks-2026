# Glossário do jogo

Termos usados no código, nos testes e nas issues. Usa sempre estes nomes.

| Termo | Significado |
|---|---|
| **Level** (nível) | Os dados de uma missão: `map` (letras), `style`, `budget`, `ignition`, `wind`. Ficam em `data/levels/*.json`. |
| **Village** (vila) | A grelha de quadrados criada a partir do nível pela simulação (`createVillage`). `village.tiles[y][x]` é o tipo do quadrado. |
| **Tile** (quadrado) | Uma célula da grelha. Os tipos são `grass`, `brush`, `eucalyptus`, `broadleaf`, `house`, `school`, `road`, `water`, `cleared` e `firebreak`. |
| **Coordenadas** | `x` = coluna (cresce para **leste**) e `y` = linha (cresce para **sul**). O norte fica em `y` menor. |
| **Vegetation** (vegetação) | Os quadrados `grass`, `brush`, `eucalyptus`, `broadleaf` e `cleared`. |
| **Action** (ação) | O que o jogador faz na fase de construção: `clearBrush` (€200, brush → cleared), `firebreak` (€500, ou €1000 em eucalipto/folhosa; vegetação → firebreak) e `replaceTrees` (€800, eucalyptus → broadleaf). |
| **Budget** (orçamento) | O dinheiro disponível na fase de construção. |
| **Build phase** (fase de construção) | Antes do desastre, quando o jogador gasta o orçamento em ações. Pode **desfazer** (undo) cada ação, com reembolso total. |
| **Disaster** (desastre) | O incêndio. É simulado por passos de 10 minutos simulados. |
| **Wind direction** (direção do vento) | De onde o vento **vem**, em graus, como nos boletins meteorológicos: 0 = norte, 90 = leste, 180 = sul, 270 = oeste. O fogo é empurrado para o lado contrário (**downwind**). Vetor downwind na grelha: `dx = -sin(d)`, `dy = cos(d)`. |
| **Ignition** (ignição) | O quadrado onde o fogo começa. A semente escolhe um dos `ignitionCandidates` (`pickIgnition`); se o jogador lá pôs um corta-fogo ou limpou o mato, o cigarro rola e o fogo começa no combustível seco (erva, mato, árvores: `CIGARETTE_MIN_FLAMMABILITY`) mais perto, numa ordem fixa (`resolveIgnition`). No mapa, cada sítio possível tem um "?" na fase de construção. |
| **Burning / burned** | O quadrado está a arder ou já ardeu. |
| **Snapshot** | O estado do fogo num passo (que quadrados ardem e quais já arderam). A interface "reproduz" a lista de snapshots. |
| **Seed** (semente) | O número que fixa o acaso (`src/sim/random.js`). O mesmo plano com o mesmo vento e a mesma semente dá sempre o mesmo resultado. |
| **Style** (estilo) | O aspeto 3D de uma região (`src/render/styles/*.js`). Não tem regras do jogo. |
| **View** (vista) | A vila desenhada em 3D (`src/render/village3d.js`). Só mostra o que a simulação diz. |
| **Expert plan** (plano do perito) | Uma lista de ações `{ x, y, action }` que salva todas as casas na maioria das noites, feita só com o que o jogo mostra (os "?" e o vento). Fica no nível, em `expertPlan` (`data/levels/sintra.json`). |
| **Counterfactual / same-night comparison** ("e se...?", a comparação da mesma noite) | No fim do jogo, a mesma noite (o mesmo nível, semente e vento) é jogada outra vez sem fazer nada e com o plano do perito, para comparar com o jogador (`compareNight`, em `src/sim/counterfactual.js`). Daí saem 0 a 2 lições curtas (`nightLessons`). |
| **Lucky night** (noite com sorte) | Uma noite em que, mesmo sem fazer nada, se salvavam todas as casas e a escola (3 estrelas). Nessa noite o plano do jogador não é julgado. |
