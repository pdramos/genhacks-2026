# Relatório do especialista GenHacks: 22/11/2026

Este relatório junta 5 avaliações independentes, uma por critério e uma de "padrões perdedores", feitas como os jurados reais as fariam. Inclui também uma releitura do Devpost do GenHacks feita hoje e uma análise nova de mais de 1000 projetos de hackathons estudantis parecidos. Confirmei hoje por conta própria: o `npm test` dá 165/165, o `gh repo view` diz `"visibility":"PRIVATE"` com `homepageUrl` vazio, o `origin/main` tem só o commit de setup (`65c9699`) e o PR #11 continua aberto.

---

## Veredito numa frase

**Hoje, o projeto não ganharia nada.** O jogo é bom: funciona, tem dados reais, uma noite real e 165 testes. Mas um jurado não consegue ver nada disso, porque o repositório é privado, não há link para jogar, não há vídeo nem página Devpost. E ainda não há nenhuma prova de que o jogo ensina alguma coisa, nem de que o fogo simulado se parece com o fogo real. É exatamente o perfil do **TerraPulse 4D**, o projeto mais parecido com o nosso, que **perdeu** no GIBC 2026.

---

## Previsão de resultado

| Cenário | Nota média estimada (0–10) | Resultado provável |
|---|---|---|
| **Hoje, tal como está** (repo privado, sem vídeo) | cerca de 3–4 | **Nada.** Há até risco de desqualificação, porque as regras pedem código público e um vídeo. |
| **Mínimo** (repo público, link na Vercel, vídeo e página feitos à pressa) | cerca de 5,5 | Nada ou menção. Fica acima das plataformas "AI-powered" sem números, mas igual ao TerraPulse 4D. |
| **Depois das 5 melhorias abaixo** | cerca de 7,5–8,5 | **Candidato forte a vencer a trilha** Healthcare & Environmental (estimo 35–50%), com hipótese real de **top 3 geral** (estimo 15–25%). |

Como cheguei a estes números: há 638 inscritos. No GIBC, cerca de 20% dos inscritos submeteram. Se for igual aqui, serão à volta de 120 submissões, e talvez 25–40 na nossa trilha. Cerca de 40% dos projetos destes hackathons têm zero números e não têm GitHub. Atenção: as percentagens são **estimativas minhas, não factos**. O julgamento tem ruído: o mesmo projeto ganha num hackathon e perde noutro (MicroBeat, FloodSense-PK).

---

## Os 4 critérios (25% cada)

| Critério | Nota hoje | Porquê | O que falta | Nota possível |
|---|---|---|---|---|
| **Impact** | **4** | O problema é real e tem data, lugar e fontes: o incêndio de Malveira da Serra / Peninha, a 6/out/2018, com 9 fontes no ecrã final. O vento real, o mapa real e a lei real (DL 82/2021) estão dentro da mecânica. A comparação com uma base simples prova que as regras premeiam o comportamento certo: não fazer nada dá 0,59★ e o perito 2,49★, em 120 noites. Mas **não há um utilizador concreto**, nem **nenhuma prova de que alguém aprende** (não há quiz nem playtests), e o ecrã final não diz **porquê** se perderam as casas. | Uma frase sobre o utilizador. O quiz antes e depois (#8) com 10–20 pessoas. O ecrã final com "não fazer nada" e "plano do perito" na mesma noite. A lei com números e fonte. A secção "What we haven't proven yet". | 7–7,5 |
| **Technical execution** | **7** (ou cerca de **3** se o repo continuar privado) | Joguei 3 noites completas. O browser e o Node dão exatamente o mesmo resultado (é determinístico), não houve erros na consola e corre a cerca de 60 fps numa RTX 3050. Há 165 testes e um teste de equilíbrio com 120 noites, confirmado em mais 500 noites à parte: não fazer nada 0,70★, bom plano 1,80★, perito 2,57★. O vento do `sintra.json` coincide, valor a valor, com o arquivo da Open-Meteo. São 107 commits feitos durante o hackathon. **Mas:** no telemóvel deitado (812x375) não se consegue começar o jogo, em 15,6% das noites o fogo apaga-se sozinho e dá "Village saved!" por sorte, e não há nenhum script que volte a gerar os dados. | Repo público, PR #11 juntado ao `main`, LICENSE, link jogável. Corrigir o telemóvel. Validar contra a área ardida real. Pôr os números dos testes no README. | 8,5 |
| **Creativity** | **6,5** | É raro: uma noite real, com o vento real hora a hora, numa vila real do OpenStreetMap. As **faixas legais como puzzle** (a lei diz ONDE se pode trabalhar e o declive diz QUANTO custa) e a **ignição escondida** (os "?") com "Try again (same night)" são ideias próprias. **Mas** o ciclo "orçamento → preparar → desastre" já existe desde 2007 (Stop Disasters!, da ONU). O TerraPulse 4D tinha OSM, Open-Meteo, 3D e uma pontuação, e perdeu. E hoje a melhor ideia está escondida: a lei só aparece nos comentários do código e num toast que diz "you can only clear…". | Uma secção "What's new here" que diz com honestidade o que já existia. A lei explicada no jogo. "O teu fogo contra o fogo real" no ecrã final. 8–10 s do `gallery.html` no vídeo. | 8 |
| **Presentation** | **3** | **O vídeo e a página Devpost ainda não existem**, e são exatamente o que este critério avalia. O material de base é muito bom: uma vila 3D real, um fogo noturno fácil de seguir e o "Look around" com as casas perdidas marcadas a vermelho. Mas o briefing tem 262 palavras, ninguém as lê num vídeo, e 6 em 7 cliques de "Clear brush" deram "Can't build there". No README faltam a imagem, o link, os testes, as limitações e o nome final ("Brace (working title)"). | Um vídeo de 3 minutos ou menos com o guião abaixo. Uma página com mais de 1000 palavras e 25 números ou mais. Imagens e GIF. "How we tested it". "Limitations". O nome final. | 8,5–9 |

**Média hoje:** cerca de 5,1 se o repo for aberto, e cerca de 4 tal como está. **Média depois das melhorias:** cerca de 8.

---

## Riscos de desqualificação ou de perder pontos

1. **O repositório é PRIVADO e o `main` está vazio** (1 commit). As regras pedem código público. O FloodSense-PK perdeu no GIBC por não ter o link do GitHub e ganhou noutro hackathon. **Isto resolve-se na primeira semana, não na última.** Tornar o repo público é uma decisão tua (Pedro): antes de o fazeres, confirma que não há nada privado no histórico, como palavras-passe ou ficheiros `.env`.
2. **Sem vídeo não há avaliação.** O vídeo tem de ter **3 minutos ou menos** e mostrar o jogo **a funcionar**: um trailer não chega.
3. **Não há link para jogar** (a issue #9, da Vercel, está aberta). Sem ele, nenhum jurado consegue confirmar que "funciona".
4. **Não há LICENSE.** Sugestão: MIT para o código, mais uma nota no README a dizer que `data/levels/sintra.json` vem do OpenStreetMap e fica sob **ODbL 1.0**.
5. **A IA tem de estar declarada na descrição do Devpost** (já está no README, mas a regra fala da página). Os créditos já estão bem feitos: OSM ODbL, Open-Meteo CC BY 4.0, Copernicus DEM, Three.js MIT e Fredoka OFL. Podes juntar "ERA5, Copernicus Climate Change Service" ao vento.
6. **Transparência no histórico:** um teste inicial usou modelos CC0 da Kenney, que foram depois apagados. É legal, mas o README diz "no downloaded models". Basta acrescentar uma linha a dizer isso.
7. **Prazo ambíguo:** as regras dizem 26/dez às 00:00 ET e a página de datas diz 26/dez às 17:00 EST. **Usa o mais cedo: 26/dez às 05:00 em Lisboa.** A meta interna continua a ser **20/12**.
8. **És menor:** segundo o organizador, os prémios em dinheiro para menores de 18 precisam do **consentimento dos pais**. Avisa a tua família já.
9. **Números da lei:** o código diz "DL 82/2021", mas as faixas do jogo (cerca de 130 m à volta das casas e 65 m junto às estradas) não batem com os números que se conhecem da lei (50 m à volta das casas, 100 m à volta das aldeias e cerca de 10 m junto às estradas). **Confirma no texto oficial antes de publicar qualquer número.** Depois, ou ajustas o jogo, ou explicas a aproximação ("1 quadrado = 65 m"). Publicar números errados sobre uma lei tira credibilidade.
10. **Credibilidade do resultado:** sem preparação, a simulação perde em média (mediana) 54 casas e queima cerca de 117 ha. Confirma quantas casas arderam mesmo em 2018 e explica a diferença na secção de limitações. Lá deve dizer também que o quartel é inventado e que o cigarro é uma dramatização.
11. **"Quanto foi construído PELA EQUIPA":** 96 de 107 commits foram co-escritos pelo Claude. É permitido e está declarado. Mas o vídeo deve mostrar **as tuas decisões**: a escolha do incêndio real, as metas de dificuldade e o porquê de cada ação. Não basta mostrar o código.

---

## Top 5 melhorias (por pontos ganhos por dia de trabalho)

| # | O quê | Dias | Quanto sobe |
|---|---|---|---|
| **1** | **Publicar:** repo público, juntar o PR #11 ao `main`, LICENSE (MIT + nota ODbL), deploy na Vercel (#9), link no README e no "Try it out". Corrigir o telemóvel: os cartões com `max-height: 100dvh`, scroll lá dentro e o botão sempre visível. Fechar as issues que já estão feitas (#2–#7) e marcar a #10 (Japão) como `wontfix`. | **1** | Technical de 3 para 7, Presentation +1. Sem isto, as outras melhorias não contam. |
| **2** | **O ecrã final ensina, e a lei aparece no jogo:** correr "não fazer nada" e "plano do perito" com a **mesma semente** e mostrar `Your plan: 129/194 · Doing nothing: X · Expert plan: Y`, mais 1 ou 2 lições automáticas. Quando o fogo morre sozinho, avisar "The fire died out on its own: lucky night". Um cartão "The law" com os números confirmados e um link (mais uma frase sobre o FireSmart Canada, para os jurados canadianos). O cadeado passa a citar a lei. Destacar os quadrados onde se pode clicar e encurtar o briefing para cerca de 80 palavras. | **2,5** | Impact +1, Creativity +0,75, Presentation +1, Technical +0,3 |
| **3** | **Vídeo e página Devpost** (na última semana), com o guião e a checklist abaixo. Inclui o README reescrito: tagline, 25 números ou mais, "How we tested it", "Limitations", diagrama, 4 imagens ou um GIF, e o utilizador numa frase. | **4** | Presentation de 3 para 8–9 (+5), Impact +0,5, Creativity +1 (com o "What's new here") |
| **4** | **Validar contra o fogo real:** primeiro confirmar que existe um perímetro oficial da área ardida a 6–7/out/2018 (EFFIS, ICNF ou Copernicus EMS). Se existir, passá-lo para a grelha 32x32 e medir, em 1000 noites sem ações, a **% de quadrados certos** e a **% de falsos alarmes**. Comparar com uma base simples: "o fogo espalha-se igual para todos os lados, sem vento". **Publicar o resultado mesmo que seja modesto.** Se der tempo, mostrar o contorno real no ecrã final. Se o perímetro não existir, usar o contorno das notícias, marcado como "aproximado". | **2,5–3** | Technical +0,8, Impact +0,5, Creativity +1 |
| **5** | **Quiz antes e depois (#8) e playtest:** 5 perguntas (a faixa de 50 m, o vento, eucalipto ou árvores nativas, o mato, as estradas). Depois, 10 a 20 colegas ou familiares fazem o quiz, jogam 2 vezes e voltam a fazer o quiz. Anotar N, a média antes e depois, as 2 perguntas que mais subiram, o que NÃO melhorou e 2 frases deles. Tudo **anónimo, só notas, sem dados pessoais**. Se possível, pedir 1 opinião a um bombeiro voluntário ou a um professor de Geografia. | **4–4,5** | Impact +2 a +3, Presentation +0,5. **Nenhum vencedor analisado tinha um antes e depois medido**, por isso isto distingue o projeto. |

Melhorias muito baratas, para encaixar dentro destas (cerca de 0,5 dias no total):
- O **utilizador numa frase**, no README, no Devpost e no início do vídeo. Por exemplo: *"for 12–17-year-olds in Portuguese villages next to forest, and their teachers: kids take the message home to parents who own the land"*.
- Escrever os números que **já existem**: 165 testes, 120 + 500 noites, a tabela 0,59 / 1,62 / 2,49★, 3★ em 12% contra 73%, determinismo browser = Node e cerca de 60 fps. Dizer também que o plano do perito foi afinado por computador.

### Guião do vídeo (3 minutos ou menos, em inglês, com legendas, gravado com OBS Studio)
- **0–10 s:** o facto datado, em texto grande sobre imagem do jogo: *"6 October 2018, 22:50. Serra de Sintra, Portugal. A north wind gusting to 70 km/h pushes a fire downhill. 500 hectares burn in one night."* Mostrar a fonte em letra pequena. **Sem fotos de jornais**, porque não temos direitos sobre elas.
- **10–40 s:** o jogo a funcionar: "€20,000 to prepare a real village; then the real wind of that night arrives". 3 ações, Start, 2–3 s do cigarro (só a parte iluminada), o fogo acelerado com a bússola e o relógio, e o resultado.
- **40–90 s:** a lição, em ecrã dividido e na mesma noite: "do nothing" contra "expert plan", mais a tabela das 120 noites.
- **90–130 s:** "How it works": dados reais (OSM, DEM, vento da Open-Meteo) → grelha 32x32 → regras do fogo → 3D. Mais 8 s do `gallery.html`: *"every house, tree and sound is generated by code"*.
- **130–160 s:** "How we tested it" (165 testes, o equilíbrio, a validação contra o fogo real e o quiz com N pessoas) e 3 limitações ditas em voz.
- **160–180 s:** o link para jogar, o GitHub, os créditos e "Built with Claude Code".

### Checklist da página Devpost
Tagline de 15–25 palavras com o mecanismo, por exemplo *"Spend €20,000 to fire-proof a real Portuguese village, then watch the real hourly wind of 6 Oct 2018 test your plan."* Depois: abrir com o facto datado e a fonte com link · 1000 palavras ou mais · 25 números ou mais · o utilizador concreto · a lei citada · "What's new here" (com Stop Disasters! e GridFire nomeados com honestidade) · "How we tested it" com tabela · "Limitations / What we haven't proven yet" · IA declarada · créditos · trilha Healthcare & Environmental · 4 imagens (construção, fogo, resultado e "Look around").

---

## Plano com datas (22/11 → 20/12/2026)

Os dias são dias de trabalho. Como tens escola, os fins de semana contam mais. Cada marco termina com o teu "explica de volta".

**Semana 1 (dom 22/11 – dom 29/11): publicar e preparar a prova**
- Dom 22 – ter 24: melhoria **#1** (repo público, juntar o PR #11, LICENSE, Vercel, correção do telemóvel, fechar issues). **Avisar os pais** sobre o consentimento.
- Qua 25 – sex 27: construir o **quiz** (#8), as 5 perguntas, com o resultado "before → after" no fim.
- Sáb 28 – dom 29: começar a melhoria **#2**: o ecrã final com o contrafactual e o aviso de "lucky night". **Confirmar os números do DL 82/2021 no texto oficial.**

**Semana 2 (seg 30/11 – dom 6/12): playtest e validação**
- Seg 30: procurar o perímetro oficial da área ardida (EFFIS, ICNF ou Copernicus EMS) e decidir: dados oficiais ou contorno "aproximado".
- Ter 1 – qui 3: **playtest, ronda 1**, com 10 a 20 colegas ou família (quiz, 2 jogos, quiz). Anotar numa tabela.
- Sex 4 – dom 6: terminar a #2 (cartão da lei, cadeado com a lei, quadrados destacados, briefing curto). Corrigir o que o playtest mostrou.

**Semana 3 (seg 7/12 – dom 13/12): validação e números**
- Seg 7 – qua 9: melhoria **#4**: script de validação, % de quadrados certos e de falsos alarmes contra a base "sem vento", e o resultado na página. Se der tempo, o contorno real no ecrã final.
- Qui 10 – sex 11: **playtest, ronda 2**, se a ronda 1 levou a mudanças. Tabela final do quiz.
- Sáb 12: escolher o nome final. README com todos os números, "How we tested it" e "Limitations". Fazer as capturas e o GIF.
- **Dom 13: congelar o código.** Daqui para a frente só se corrigem bugs.

**Semana 4 (seg 14/12 – dom 20/12): só vídeo e Devpost**
- Seg 14: guião do vídeo e texto das legendas.
- Ter 15 – qua 16: gravar com o OBS, com a tua voz.
- Qui 17: montar, legendar e confirmar que tem 3:00 ou menos. Publicar no YouTube.
- Sex 18: escrever a página Devpost pela checklist.
- Sáb 19: alguém que não programa (por exemplo um pai, no papel do jurado contabilista) vê o vídeo e lê a página, e diz o que não percebeu. Corrigir. Opcional: deploy no **Deployxa** (a conta tem de ser criada por ti) e fazer o "opt in" no prémio.
- **Dom 20: submeter.** De 21 a 25/12 fica uma folga para emergências.

---

## O que NÃO fazer (não muda a nota)

- **Não abrir o nível do Japão** (#10): marcar como `wontfix`.
- **Não fazer o nível do Canadá (Jasper) antes de 13/12.** Para os jurados canadianos, chega uma frase sobre o FireSmart Canada.
- **Não acrescentar mais peças 3D, efeitos de fogo, sons ou estilos.** A beleza já está acima da média. O TerraPulse 4D mostra que "bonito, 3D e com dados reais" não chega.
- **Não acrescentar IA ao jogo "para parecer moderno".** Nos dados, a IA não distingue vencedores de perdedores (cerca de 92–100% dos dois grupos usam IA).
- **Não usar as palavras "platform", "all-in-one" ou "AI-powered"** na página.
- **Não deixar o repo público e o deploy para a última semana.**
- **Não gastar os primeiros 10 s do vídeo** na parte escura do cigarro nem no briefing de 262 palavras.
- **Não prometer previsões:** é educativo, "not a fire forecast". O cigarro é uma dramatização e o quartel é inventado.
- **Não usar fotos ou vídeos de notícias** sem direitos.
- **Não esconder resultados fracos:** se a validação der uma coincidência modesta, publica-a na mesma, com a base "sem vento" ao lado. Os vencedores fazem isto (78–100% têm limitações honestas, contra 24–41% dos outros).
- **Não recolher dados pessoais** dos colegas no playtest: só notas anónimas.

---

## O que mudou no GenHacks (Devpost relido a 22/11)

- **Júri:** agora são 13 jurados. Os novos são Divya Chandana (Experian), **Jhan Liufu (PhD no Caltech, CTO)** e Wasif Zulkernine (Entelligence.ai). O júri ficou mais técnico e científico, por isso a medição e o método contam ainda mais.
- **Calendário:** o julgamento vai de 26/dez a 7/jan/2027, e os vencedores são anunciados a **7/jan/2027**.
- **Prémios:** há 1050 CAD em dinheiro no total. Cada vencedor de trilha leva 50 CAD + Adaption Labs 1000 $ + brindes.
- **Deployxa:** o prémio continua sem detalhes. O plano grátis aloja sites estáticos, por isso é uma oportunidade barata.
- **Sem mudanças** nas regras, nos entregáveis, nas trilhas ou nos 4 critérios a 25%. A galeria ainda não foi publicada.

## Lições novas da análise de mais de 1000 projetos (GIBC V2, Multimodal AI, Hack The Weather)

- **Nenhum** vencedor tinha zero números ou menos de 300 palavras. Os vencedores têm uma mediana de 27–37 números e os outros têm 2.
- Medir contra uma base de comparação aparece em 89–100% dos vencedores e em 23–44% dos outros. As limitações honestas aparecem em 78–100% contra 24–41%.
- Os testes automáticos citados na página aparecem 3 a 4 vezes mais nos vencedores. O GitHub aparece em 100% dos vencedores.
- Em desastres, ganha o **"Checked against the official maps"** (Lifeline e WaterGuard, com os mapas Copernicus EMS).
- **Jogos educativos raramente ganham** (0 de 15 no GIBC). Os que ganham provam valor com uma fonte para cada número, com playtests com pessoas reais ou com métricas de uso.
- **Atenção:** tudo isto é correlação, não causa. As amostras foram contadas com regex e o julgamento tem ruído.

---

*Avaliação baseada no estado de 22/11/2026, no ramo `dev`. Não alterei nenhum ficheiro do repositório além deste relatório. Fontes: `docs/hackathon/*.md`, o Devpost relido no browser e as avaliações de Impact, Technical, Creativity, Presentation e padrões perdedores feitas hoje com jogos reais no Playwright.*
