# Projeto GenHacks 2026 — jogo de desastres reais

Jogo de navegador (3D estilizado, Three.js 0.186.1, JavaScript simples) em que o jogador prepara uma vila com um orçamento limitado e depois enfrenta um desastre real, guiado pelos dados meteorológicos verdadeiros do dia (Open-Meteo). O desenho completo está em `docs/design.md`.

## Como trabalhar neste projeto
- Responder sempre em **português**. A interface do jogo e o vídeo são em **inglês**, porque os jurados são canadianos.
- O dono do projeto é um estudante de 16 anos que está a **começar a programar do zero**. O assistente escreve quase todo o código, em passos pequenos e testáveis, e explica cada parte em linguagem simples.
- No fim de cada marco há um **"explica de volta"**: o estudante explica o que a parte faz, por palavras suas.
- Quando houver um erro, ensinar a ler a mensagem de erro antes de dar a correção.
- Escopo implacável: avisar se uma ideia nova não cabe no prazo (meta de envio a **20/12/2026**).
- Código com nomes em inglês e comentários em português.
- Sem ferramentas de build: páginas HTML com um `importmap` que carrega `three@0.186.1` por CDN, com a versão fixada.
- **Gráficos 100% gerados por código** (decisão do estudante): não usar modelos ou imagens descarregados. Cada região tem um "estilo" em `src/render/styles/<região>.js`, com arquitetura e vegetação autênticas: `portugal.js` (Pedrógão Grande e as Aldeias do Xisto) e `canada.js` (Jasper). O contrato de um estilo está no cabeçalho de `src/render/styles/basic.js`. Para ver todas as peças de um estilo: `gallery.html?style=<nome>`.
- **Estrutura:** `src/sim/` = regras (simulação: vila, ações, fogo, estrelas), sem Three.js, testada com `npm test` (o `node:test` do próprio Node). `src/render/` = desenho 3D (`main.js` arranca tudo, `village3d.js` desenha a vila, `fireFx.js` desenha o fogo, `lighting.js` e `styles/`). O desenho só lê a simulação. Vocabulário e convenções (coordenadas, direção do vento): `GLOSSARY.md`.
- Para correr o jogo localmente: `python dev/serve.py` (igual ao `http.server`, mas sem cache: o navegador corre sempre o código novo) e abrir `http://localhost:8000/` (opcional: `?style=canada`).
- Todo o uso de IA, bibliotecas e dados (Three.js MIT, Open-Meteo CC BY 4.0) fica declarado no README e no Devpost.

## Agent skills

### Issue tracker

As issues e as specs ficam nas GitHub Issues do repositório deste projeto (CLI `gh`). Ver `docs/agents/issue-tracker.md`.

### Triage labels

Usam-se os cinco rótulos canónicos por omissão (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Ver `docs/agents/triage-labels.md`.

### Domain docs

Contexto único: `GLOSSARY.md` e `docs/adr/` na raiz, criados quando forem precisos. Ver `docs/agents/domain.md`.
