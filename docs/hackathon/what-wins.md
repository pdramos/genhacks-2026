# O que vence (e porque é que os outros perdem)

Síntese de 3 análises independentes de 25 vencedores contra cerca de 330 não vencedores em 2 hackathons estudantis online de 2026 (CSC Back-to-School e EurekaDev). Os dados brutos estão em `winners-vs-losers-data.md`. Atenção aos limites: a amostra é pequena, as métricas foram contadas por regex e o que se vê é correlação, não causa.

## Padrões dos vencedores
1. **Uma coisa só, para alguém específico, num lugar concreto.** "Plataformas all-in-one com IA" perdem em série.
   - SameWay (colegas verificados no mesmo trajeto) venceu.
   - Reachr (SOS, guardiões e localização genéricos) perdeu, com o mesmo tema.
2. **Abrem com uma cena real: data, lugar e fonte.**
   - Pukaar: "On the night of 30 June 2025, cloudbursts hit Mandi district…".
   - Uma história pessoal sozinha não chega: o OcuScan tinha uma boa história, mas nenhuma medição, e perdeu.
3. **Medem e publicam o próprio erro.** 82% dos vencedores falam de validação, contra 46% dos outros (EurekaDev).
   - Exemplo: PocketLab, "gravidade com erro de 1%".
4. **Declaram limitações.** 76% contra 43%.
   - Exemplo: MyLumi "recusa-se a adivinhar".
5. **Usam dados abertos reais e uma regra ou norma oficial.**
   - HeatWise: previsão grátis + OSHA/UIL, 2.º lugar.
   - SunDodge: OpenStreetMap + posição do sol.
   - EXPIRED BY CLIMATE: ERA5 + equação de Arrhenius, 1.º em Research.
6. **Números concretos na página.** Em média, 26 números nos vencedores contra 5 nos outros (EurekaDev).
7. **GitHub público** em 94–100% dos vencedores, contra 66–71% dos outros. Na prática, é obrigatório.
8. **IA não diferencia nada**: 71% contra 67%. Vários vencedores fortes não usam IA. Os wrappers de IA perdem.
9. **Participar sozinho não prejudica**: a equipa média vencedora tem cerca de 1,1 pessoas.
10. **Hardware a solo pode ganhar.** O MySquishi ficou em 2.º geral e levou o prémio Adaption Labs, que também é patrocinador do GenHacks.
11. **Patrocinadores:** usar a tecnologia de um patrocinador dá uma oportunidade extra (Supercompress e RepoScope levaram prémios de patrocinador).

## Porque é que os não vencedores perderam
- Plataforma genérica sem utilizador concreto: ChuoHub ("o sistema operativo das escolas"), admitiy, Vastegune ("all-in-one").
- Muitas funcionalidades e nenhuma profundidade: PadhaiPlan, com RPG, coach de voz, calendário e repetição espaçada.
- Slogan em vez de mecanismo: GapWise ("Turn gaps into progress"), Learn&Share ("Learn with Ease").
- Nenhum número nem validação, mesmo com uma boa história: OcuScan, FlowDesk, Nurse Titi.
- Sem repositório ou sem demo: QSP, Nurse Titi, BellBack.
- Técnica sem utilizador nem demo: Hermes (Rust + OpenPGP).
- Promete demais, sobretudo em saúde ou segurança, sem dizer os limites: AuraCare.
- Específico, útil e mesmo assim sem prémio (há ruído no julgamento): FarSeat, ReadEasy. Hipóteses: estava pouco em jogo, ou o projeto era tecnicamente fino.

## Contra-exemplos (o que também venceu)
- Scoop, amplo e com IA no centro, venceu pelo **acabamento** ("Most Polished").
- Fly Dungeon venceu pelo **encanto** e por um conjunto de dados enorme (165 mil neurónios).
- Second Opinion venceu com uma stack simples e uma **ideia de mecanismo original**.

## Checklist de submissão vencedora (derivada dos dados)
1. Tagline de 15–25 palavras que explica o mecanismo, não um slogan.
2. Abrir com um facto real: data, lugar e fonte com link.
3. Pelo menos 15 números concretos na página.
4. Secção "How we tested it" com N, método, tabela de resultados e falhas.
5. Secção "Limitations".
6. O escopo cabe numa frase. Nada de "platform", "all-in-one" ou "hub".
7. Repositório público com README (como correr, créditos, uso de IA declarado) e testes automáticos.
8. Uma demo jogável por um link, sem criar conta.
9. Citar a regra ou fonte oficial em que o projeto assenta.
10. Vídeo:
    - 0–10 s: problema real em cena;
    - 10–40 s: o projeto a funcionar;
    - depois: validação, limites, "como funciona" e fecho.
    - Em inglês e com legendas.
11. Verificar o prémio de patrocinador (Deployxa).
