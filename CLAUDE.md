# Projeto GenHacks 2026 — jogo de desastres reais

Jogo de navegador (2D isométrico, Phaser 3.90.0, JavaScript simples) em que o jogador prepara uma vila com um orçamento limitado e depois enfrenta um desastre real, guiado pelos dados meteorológicos verdadeiros do dia (Open-Meteo). O desenho completo está em `docs/design.md`.

## Como trabalhar neste projeto
- Responder sempre em **português**. A interface do jogo e o vídeo são em **inglês**, porque os jurados são canadianos.
- O dono do projeto é um estudante de 16 anos que está a **começar a programar do zero**. O assistente escreve quase todo o código, em passos pequenos e testáveis, e explica cada parte em linguagem simples.
- No fim de cada marco há um **"explica de volta"**: o estudante explica o que a parte faz, por palavras suas.
- Quando houver um erro, ensinar a ler a mensagem de erro antes de dar a correção.
- Escopo implacável: avisar se uma ideia nova não cabe no prazo (meta de envio a **20/12/2026**).
- Código com nomes em inglês e comentários em português.
- Sem ferramentas de build no início: um `index.html` que carrega `phaser@3.90.0` por CDN, com a versão fixada (`latest` já é o Phaser 4).
- Todo o uso de IA, bibliotecas e recursos (Kenney CC0, Phaser, Open-Meteo CC BY 4.0) fica declarado no README e no Devpost.

## Agent skills

### Issue tracker

As issues e as specs ficam nas GitHub Issues do repositório deste projeto (CLI `gh`). Ver `docs/agents/issue-tracker.md`.

### Triage labels

Usam-se os cinco rótulos canónicos por omissão (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Ver `docs/agents/triage-labels.md`.

### Domain docs

Contexto único: `GLOSSARY.md` e `docs/adr/` na raiz, criados quando forem precisos. Ver `docs/agents/domain.md`.
