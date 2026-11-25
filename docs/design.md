# Desenho do jogo — GenHacks 2026

> Nome: **Same Night** ("a mesma noite"), escolhido pelo estudante a 25/11/2026, entre os nomes que os jurados simulados propuseram. O nome provisório era **Brace**.
> Data: 21/11/2026 · Autor: o estudante, com o Claude Code como assistente (declarado no Devpost)

## 1. Intenção: o porquê

Desastres naturais (incêndios, cheias, tsunamis) matam e destroem mais quando as pessoas não se preparam. Muita gente não entende **onde** e **por que** a preparação importa. Um exemplo: em Portugal a lei obriga a limpar o terreno à volta das casas, e muitos proprietários não limpam.

O jogo faz o jogador **sentir** isso. Ele tem um orçamento limitado para preparar uma vila e depois enfrenta **um desastre real**, guiado pelos dados meteorológicos verdadeiros do dia em que aconteceu.

O formato é o de "construir a base e defendê-la de um ataque", conhecido de jogos como o Clash of Clans, mas o atacante é o desastre.

**O que é o sucesso:**
- Os jurados entendem o jogo em 10 segundos de vídeo.
- Quem joga aprende algo mensurável: a nota no quiz sobe depois de jogar.
- O projeto é enviado até 20/12 a funcionar, e o estudante consegue explicar cada parte do código.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Um jogo no navegador, 2D isométrico com aspecto 3D, jogável pelo link, no PC e no celular deitado.
- Pelo menos **2 níveis de incêndio com dados reais**: 🇵🇹 Portugal e 🇨🇦 Canadá.
- O ciclo completo: briefing → construção com orçamento → desastre animado → resultado com estrelas → "o que aconteceu de verdade".
- Um quiz curto antes e depois, para medir a aprendizagem.

**Não-objetivos (fora desta versão)**
- Contas, multiplayer, loja, evolução da vila entre partidas, música própria, 3D de verdade.
- Terremotos e furacões, porque não se espalham quadrado a quadrado.
- Previsão científica real de incêndios. O jogo é **educativo, não um simulador oficial**, e diz isso.

**Anti-objetivos (fariam o projeto falhar mesmo "funcionando")**
- Copiar gráficos, personagens, nome ou visual próprio do Clash of Clans ou de outro jogo.
- Transformar tragédias reais em espetáculo. Não haver contagem de mortos como pontuação, nem nomes de vítimas.
- Um jogo bonito que não fica pronto, ou que o estudante não sabe explicar.

## 3. Restrições
- O estudante começa a programar do zero. Tem ~29 dias (21/11 → 20/12), com festas pelo meio, e **mais de 4 horas por dia**.
- **Modo de trabalho (escolhido pelo estudante):**
  - o assistente escreve quase todo o código, em passos pequenos;
  - o estudante revê, corre e testa cada passo;
  - no fim de cada marco há um **"explica de volta"**: o estudante explica em voz alta, por palavras suas, o que aquela parte faz. Isto garante que consegue defendê-la no vídeo e perante os jurados.
- Custo €0, só com ferramentas e recursos gratuitos e de licença livre.
- Regulamento do GenHacks:
  - o projeto tem de ser novo, por isso o repositório nasce agora e os commits provam as datas;
  - todas as bibliotecas, recursos e o uso de IA são declarados;
  - vídeo de até 3 min a mostrar o jogo a funcionar;
  - repositório público.
- Os jurados são canadianos, por isso **a interface e o vídeo são em inglês**. O código usa nomes em inglês e comentários em português, para o estudante aprender.

## 4. Abordagens consideradas para os gráficos

| Abordagem | Prós | Contras | Decisão |
|---|---|---|---|
| **1. 2D isométrico com imagens renderizadas de modelos 3D** (a técnica do próprio Clash of Clans) | Aspecto 3D, pouco código, sobra tempo para a lógica e os dados | A câmara não roda | Escolhida primeiro, depois trocada pela 3 |
| 2. 2D visto de cima, com quadrados simples | O mais rápido de fazer | Parece um tabuleiro, fraco no critério de apresentação | Plano B, só se o tempo apertar |
| 3. 3D de verdade (Three.js) | Câmara a rodar, efeitos bonitos | +4 a 6 dias, risco alto para um iniciante | ✅ **Escolhida em 21/11 depois de um teste (spike) que funcionou.** Os gráficos são gerados por código, com um estilo por região (decisão do estudante) |

## 5. Como o jogo funciona

### 5.1 Telas
1. **Título:** nome, botão "Play", créditos.
2. **Quiz inicial:** 5 perguntas de escolha múltipla (ver 5.6).
3. **Mapa-múndi:** escolher a missão (🇵🇹 Portugal, 🇨🇦 Canadá, e 🇯🇵 Japão como "em breve", se não entrar).
4. **Briefing:** 3 a 4 frases sobre o desastre real, a data, o lugar e a fonte. Botão "Prepare".
5. **Construção:** a vila isométrica (cerca de 20×20 quadrados), o orçamento, a barra de ações e o botão "Start disaster".
6. **Desastre:** o fogo avança acelerado (cerca de 60 segundos para várias horas simuladas), com relógio, seta do vento e força do vento visíveis.
7. **Resultado:** 0 a 3 estrelas, casas salvas, o que funcionou e o que falhou, "o que aconteceu de verdade" com fontes, e os botões "Try again" e "Next mission".
8. **Quiz final:** as mesmas 5 perguntas, mais o ecrã "antes → depois".

### 5.2 A vila (o tabuleiro)
- Uma grelha de **20×20** quadrados. Cada quadrado tem um tipo:
  - relva
  - mato
  - eucalipto (Portugal) ou pinheiro (Canadá)
  - carvalho/folhosa
  - casa
  - escola ou centro de saúde
  - estrada
  - água
  - terreno limpo
  - corta-fogo
- Cada nível tem o seu mapa desenhado à mão num ficheiro de dados (JSON). As vilas são **fictícias** mas inspiradas no tipo de lugar real.

### 5.3 A fase de construção (o orçamento)
| Ação | Custo | Efeito |
|---|---|---|
| Limpar mato | €200 | mato → terreno limpo (arde pouco) |
| Corta-fogo | €500 (€1000 em árvores: é preciso abatê-las) | qualquer vegetação → corta-fogo (não arde) |
| Trocar árvores | €800 | eucalipto/pinheiro → folhosa (arde menos) |

- O orçamento por nível é fixo e não chega para proteger tudo. Esse é o centro do jogo: **escolher**.
- Cada ação pode ser desfeita antes de começar o desastre (devolve o dinheiro).

### 5.4 O desastre: como o fogo se espalha
É um **autómato celular**. A cada passo do relógio, que equivale a 10 minutos simulados:
1. Cada quadrado a arder tenta acender cada um dos 8 vizinhos.
2. A probabilidade é: `p = inflamabilidade[tipo do vizinho] × fatorVento`.
   - `fatorVento` é maior quando o vizinho está **na direção para onde o vento sopra**, e cresce com a velocidade do vento.
   - Fórmula de partida: `fatorVento = max(0.1, 1 + k × velocidade × cos(ângulo))`, com `k` ajustado por tentativa até o jogo "parecer certo".
3. Um quadrado arde durante alguns passos (mais tempo nas árvores) e depois fica queimado.
4. O vento muda **a cada hora simulada**, conforme os dados reais (5.5).
5. O acaso usa uma **semente fixa**: o mesmo plano de defesa com o mesmo vento dá **sempre o mesmo resultado**. Assim o jogo é justo, dá para comparar estratégias e dá para testar.
6. O fogo começa num ponto fixo por nível, no lado de onde o vento real veio.

**Inflamabilidade de partida** (para afinar a jogar):

| Tipo | Valor |
|---|---|
| Eucalipto / pinheiro | 0.9 |
| Mato | 0.8 |
| Relva | 0.5 |
| Folhosa | 0.3 |
| Terreno limpo | 0.15 |
| Casa | 0.4 |
| Corta-fogo, estrada, água | 0 |

### 5.5 Dados reais
- **Vento:** a direção e a velocidade hora a hora do dia do desastre, tiradas da **Open-Meteo Historical Weather API**. É gratuita e não pede chave. A licença dos dados é CC BY 4.0, por isso **é obrigatório dar crédito** no jogo e no Devpost.
- **Vento real é fraco na reanálise (verificado):**
  - Pedrógão, 17/06/2017: 4–14 km/h à tarde.
  - Jasper, 24/07/2024: média até 11,5 km/h, com rajadas de 44 km/h.

  A reanálise de malha larga não capta os ventos extremos locais (por exemplo, as correntes descendentes de trovoada em Pedrógão). *Decisão (proposta do assistente, o estudante pode mudar):*
  - o jogo usa a **direção real hora a hora** e as **rajadas reais** (`wind_gusts_10m`) como força;
  - há **um único multiplicador de jogo**, fixo e declarado nas limitações ("a direção e a variação são reais; a intensidade é ampliada para o jogo").
- Pedidos à API sempre com `timezone` (fuso local do lugar), porque por omissão a API devolve GMT.
- Os dados são **descarregados uma vez e guardados no repositório** como ficheiros JSON. O jogo não depende da internet nem de uma API a funcionar no dia do vídeo, e o ficheiro mostra aos jurados de onde veio cada número.
- **Níveis e datas:**
  - **🇨🇦 Canadá, Jasper, 24/07/2024:** o incêndio que entrou na cidade de Jasper.
  - **🇵🇹 Portugal:** o vento de um grande dia de incêndio na região Centro. Recomendação: 17/06/2017 (Pedrógão Grande), com o tratamento respeitoso descrito em 2 (vila fictícia, sem pontuação ligada a vítimas, e um briefing sóbrio com fontes). **O estudante confirma a data.**
- O briefing e o ecrã "o que aconteceu de verdade" citam fontes jornalísticas e oficiais.

### 5.6 Estrelas e quiz
- **Estrelas:**
  - ⭐ salvar a escola ou o centro de saúde;
  - ⭐⭐ salvar também ≥ 80% das casas;
  - ⭐⭐⭐ salvar todas as casas.
- **Quiz:** 5 perguntas sobre preparação para incêndios. Exemplos: onde colocar um corta-fogo em relação ao vento; que árvores ardem mais; para que serve a faixa limpa à volta das casas.
  - Fica tudo **dentro do jogo**, sem servidor. A pontuação de antes e depois aparece no fim.
  - Para o Devpost, o estudante pede a **8 a 10 pessoas** (amigos, família, colegas) que joguem e anota as duas pontuações numa tabela. O número a mostrar é a média antes contra depois.

### 5.7 Gráficos e som
- Imagens isométricas **gratuitas e de licença livre (CC0) da Kenney.nl**: terreno, árvores, casas, efeitos de fogo e fumo. **Na primeira semana confirma-se qual pacote tem tudo o que é preciso.** Se faltar o fogo, usa-se uma animação simples de partículas do próprio Phaser.
- Câmara: arrastar e dar zoom, sem rodar.
- Som: só efeitos simples gratuitos, e apenas se sobrar tempo.
- Resolução base de 1280×720, que se ajusta ao ecrã.

## 6. Tecnologia (decidida)

> **Atualização de 21/11:** os pontos sobre o Phaser e a Kenney abaixo foram **substituídos**.
> - **Motor gráfico:** Three.js 0.186.1, carregado com `importmap`.
> - **Gráficos:** 100% gerados por código, sem descarregar modelos. Há um estilo por região:
>   - `portugal.js`: casas de xisto, casas caiadas com barra colorida, escola do Plano dos Centenários, eucalipto, pinheiro-bravo, sobreiro, tojo, giesta e urze;
>   - `canada.js`: casas de madeira de montanha, cabana de troncos, o Information Centre de Jasper, pinheiro-de-casca-fina, abeto e álamo.
> - **Câmara:** roda, dá zoom e arrasta.
> - A simulação continua igual e independente do desenho.
>
> O código do teste está em `spike-3d/` e passa a ser a base do ticket 1.
- **Phaser 3.90.0** (motor de jogos 2D gratuito, para o navegador), carregado por CDN com a versão fixada: `phaser@3.90.0`. *Atenção:* a tag `latest` já aponta para o Phaser 4.
- Gráficos (verificado):
  - **Kenney Isometric Tiles Landscape** e **Isometric Tiles Buildings** (CC0, mesma série);
  - opcionais: **Isometric Roads** e **City**.

  A confirmar na semana 1: fogo/fumo (plano B: partículas do Phaser), uma árvore para o eucalipto (pode ser um pinheiro ou recolorida) e um edifício que sirva de escola.
- **JavaScript simples**, sem TypeScript e **sem ferramentas de build** no início: um `index.html` com os ficheiros JS. O objetivo é que o estudante entenda tudo o que corre.
- **GitHub** público desde o dia 1, com commits pequenos e frequentes.
- **Vercel** para publicar o link. Se as regras do prémio Deployxa forem publicadas e for fácil, avalia-se publicar lá também.
- **Testes:** um punhado de testes automáticos simples só para as regras do fogo. Exemplos: sem vento o fogo espalha-se por igual; o corta-fogo nunca arde; a mesma semente dá o mesmo resultado. Agradam ao jurado de QA e ensinam o estudante.

## 7. Trilha e entrega
- **Trilha:** Saúde & Meio Ambiente.
- **Devpost:**
  - abre com uma cena real e números (área ardida, casas perdidas, fontes);
  - "how we built it";
  - a tabela do quiz antes/depois;
  - secção de **limitações** ("não é um simulador científico", "vento real, mapas fictícios");
  - créditos: Phaser, Kenney, Open-Meteo e Claude Code.
- **Vídeo (≤ 3 min, em inglês, com legendas):**
  - gancho com um desastre real;
  - jogar um nível do início ao fim;
  - "o mesmo plano falha com o vento de outro dia" (*decisão:* feito **só como montagem no vídeo**, trocando o ficheiro de vento à mão; não é uma função do jogo nesta versão);
  - o quiz antes/depois;
  - como funciona, num diagrama simples.

## 8. Calendário e regras de corte
| Até | Marco |
|---|---|
| 24/11 | Ambiente pronto (VS Code, Git, GitHub). Primeira página com Phaser a mostrar um quadrado isométrico. Pacote Kenney escolhido. |
| 28/11 | Vila de 20×20 desenhada a partir de um JSON. Clicar num quadrado mostra o tipo. Nome final escolhido. |
| 05/12 | **Jogo jogável:** construção com orçamento → fogo com vento fixo → estrelas. |
| 12/12 | Vento real do Open-Meteo nos níveis Portugal e Canadá, briefing, "o que aconteceu de verdade", quiz, testes, publicado na Vercel. |
| 16/12 | Testes com 8 a 10 pessoas. Afinar a dificuldade. README e Devpost em rascunho. |
| 20/12 | Vídeo gravado e **submissão feita**. |

**Regras de corte:**
- Se a 05/12 o jogo não for jogável de ponta a ponta, troca-se para a abordagem 2 (quadrados simples). A lógica aproveita-se toda.
- O 🇯🇵 Japão (tsunami/cheia, com a altitude do terreno a guiar a água) **só começa se tudo o que está previsto até 12/12 estiver feito**. Com mais de 4 h por dia isto é provável, mas não garantido. Se não começar, aparece como "coming soon" no mapa.
- Nada de novas funcionalidades depois de 16/12.

## 9. O que fica para quem constrói decidir
- A estrutura exata dos ficheiros e das funções.
- O valor de `k` do vento, as inflamabilidades finais e o orçamento de cada nível, afinados a jogar.
- O desenho exato de cada mapa.
- O texto das perguntas do quiz e dos briefings (com fontes).

## 10. Decisões em aberto para o estudante
1. O nome final do jogo (até 28/11).
2. A data do nível de Portugal (recomendação: 17/06/2017, com o tratamento respeitoso descrito).
3. Uma pasta permanente para guardar o projeto no computador.
