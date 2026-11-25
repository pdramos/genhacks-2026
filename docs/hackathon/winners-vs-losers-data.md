# Dados reais: vencedores vs não vencedores em hackathons estudantis online (Devpost, 2026)

> **Atualizado a 25/11/2026:** a pesquisa nova, `research-2026-11-25.md` (10 hackathons, 278 projetos, verificada por céticos), substitui este documento sempre que discordarem. A secção 7 dela diz que afirmações daqui se aguentam e quais caíram.

O GenHacks 2026 ainda não tem vencedores (galeria não publicada; termina 26/12/2026) e não há edições anteriores do mesmo organizador. Por isso, estes dados vêm de hackathons estudantis online parecidos, já encerrados em 2026, coletados por um navegador diretamente das galerias do Devpost.

Legenda das métricas automáticas (extraídas da página de cada projeto):
- palavras = tamanho da descrição; nums = quantidade de números/percentagens no texto (sinal de dados concretos)
- validação = menciona testes, medições, precisão, feedback de usuários, entrevistas
- limites = menciona limitações / o que o app NÃO faz / "não substitui médico"
- personal = menciona história pessoal específica (frase tipo "my sister", "at my school")
- IA = usa IA/LLM; github = tem repo; demoOnline = tem link de app funcionando

## 1. CSC Back-to-School Hackathon (set–out/2026, online, estudantes, tema: resolver um problema real da vida escolar)
193 projetos, 8 vencedores.

### Médias: Vencedores (W) vs Não vencedores (N)
| métrica | W | N |
|---|---|---|
| palavras na descrição | 868 | 678 |
| nº de números no texto | 7.4 | 2.5 |
| menciona validação/testes | 63% | 38% |
| menciona limitações | 75% | 43% |
| tem GitHub | 100% | 66% |
| demo online | 63% | 62% |
| usa IA | 88% | 82% |
| tamanho da equipe | 1.5 | 1.2 |
| nº de tecnologias | 11.6 | 9.5 |
| palavras no tagline | 24 | 18 |

### Vencedores e amostra de não vencedores
[WIN: Gold] Second Opinion — mostra a você e a um amigo só ONDE as respostas do dever de casa diferem, para corrigir sem copiar. (solo; claude, html, python). "Everyone does the same thing after finishing homework: text a friend 'What'd you get for 7?'. The useful part is finding where you disagree. The harmful part is you see their answer, and then it's just copying."
[WIN: Silver + Most Polished] Scoop — transforma emails, WhatsApp e cartas da escola num plano familiar com eventos, prazos e RSVPs. (solo; groq, react, postgres, vercel)
[WIN: Bronze] SpinSight — mostra em tempo real quais máquinas de lavar estão livres na escola (The Webb Schools), usando o feed de status da empresa das máquinas. (solo; svelte, cloudflare). História pessoal: "I was tired of making the trip to the laundry room, only to find it at maximum capacity."
[WIN: Honorable] Aula — voz do professor vira legendas ao vivo na língua de cada aluno imigrante; aluno perdido sinaliza em silêncio. (equipe 4; 16 números; validação; limites). Abre com cena: "Now imagine it's your third week in an American school..."
[WIN: Honorable] Drillmap — planejar evacuação da escola e cronometrar cada simulação por turma. Cita a norma NDMA (Índia) 2016. (solo; dijkstra, react, postgres)
[WIN: Honorable] SameWay — conecta colegas verificados que vão pelo mesmo caminho para ninguém voltar sozinho à noite. Abre com personagem: "Cecilia closes the NYU library door at 1 AM. Her phone is at 12%..."
[WIN: Honorable + Top 100] MyLumi — diário de recuperação de concussão que aprende o padrão do próprio usuário "e se recusa a adivinhar quando não tem dados". (solo; SEM IA; fastapi, numpy, pytest; 20 números; cita estudo com 417 adolescentes)
[WIN: Honorable] Trash Forecast / LabReport Translator — traduz símbolos de exames de laboratório para frases simples para familiares idosos; termina com "leve o original ao médico". (solo; html/js offline-first)
--- AMOSTRA DE NÃO VENCEDORES ---
[NÃO] FOUND@SCHOOL — achados e perdidos com IA e OCR. (0 números)
[NÃO] BellBack — planejador semanal para voltar à escola depois de faltar. (validação, limites, mas sem github)
[NÃO] PadhaiPlan 2.0 — "motor autônomo de estudo" com repetição espaçada, batalhas RPG, coach de voz com IA e sync com Google Calendar (muitas features).
[NÃO] Raddad — "assistente de IA automatizado de comunicação e tarefas para alunos e professores" (236 palavras, 0 números, Gemini).
[NÃO] Reachr — app de segurança pessoal com SOS, guardiões, localização ao vivo (genérico, 0 números).
[NÃO] ChuoHub — "o sistema operacional digital das escolas" conectando tudo numa plataforma (feito com Lovable).
[NÃO] Earth 911 — "plataforma global de emergências ambientais" para detectar, reportar e responder a ameaças.
[NÃO] ReadEasy — transforma a página de admissão da UT Dallas em checklists acessíveis (bom, mas não venceu).
Outros não vencedores na página 1: Vastegune Huiyaan ("all-in-one academic workspace: AI tutoring, exam prep, resume review, 400+ internships"), Snappy (scanner de folhas com IA), Unis-Match, GapWise ("Turn gaps into progress."), FarSeat (mostra que texto de slide é pequeno demais de cada lugar da sala), TaskLens (IA explica tarefas), Plan Your School (planner), Teachback (apresentar slides para 4 colegas de IA que fazem perguntas), Band 9 (IELTS/SAT gamificado), Learn&Share ("Learn with Ease."), Meltingpot (notas da turma viram flashcards), VidyaSathi (plataforma com mentoria e IA de bem-estar), Handover, Findly.

## 2. EurekaDev 2026 (set–out/2026, online, global, estudantes, 5 semanas, "mistura feira de ciências + hackathon", trilhas Coding e Research)
Observação: patrocinadores em comum com o GenHacks (Adaption Labs, domínios .xyz) — público e possivelmente estilo de júri parecidos.
162 projetos, 17 vencedores (inclui menções honrosas e prêmios de patrocinador).

### Médias: Vencedores (W) vs Não vencedores (N)
| métrica | W | N |
|---|---|---|
| palavras na descrição | 1136 | 721 |
| nº de números no texto | 26.1 | 4.7 |
| menciona validação/testes | 82% | 46% |
| menciona limitações | 76% | 43% |
| tem GitHub | 94% | 71% |
| demo online | 71% | 59% |
| usa IA | 71% | 67% |
| tamanho da equipe | 1.1 | 1.1 |
| nº de tecnologias | 12.5 | 10.2 |

### Vencedores
[1º Coding] Pukaar — alerta precoce de cheias para aldeias do Himalaia: previsão vira alerta FALADO em hindi em cada telemóvel, um funcionário aprova com 1 toque, cada pessoa confirma que ouviu. (solo; 56 números; AWS Polly/Transcribe/Bedrock). Abre com: "On the night of 30 June 2025, cloudbursts hit Mandi district... A family's dog woke them around midnight, and more than 60 people got out (The Tribune)... We live in Him[achal]".
[1º Research] EXPIRED BY CLIMATE — auditoria climática de 45 anos mostrando que as condições de teste de validade de medicamentos (25 °C/30 °C da OMS) estão desatualizadas. (69 números; dados ERA5 Copernicus; equação de Arrhenius; sem IA)
[2º Coding] HeatWise — previsão gratuita vira plano de calor hora a hora para treino de futebol/banda/trabalho ao ar livre (regras UIL do Texas, OSHA/NIOSH), em inglês e espanhol. (solo; 64 números; JS puro, sem IA; cita JAMA 2024: mortes por calor 1.069→2.325)
[2º Research] Retrain or Repay — estudo sobre trabalhadores deslocados por IA no condado de Alameda (667 profissões).
[3º Coding + 2º geral + Top 10 + prêmio Adaption Labs/XYZ] MySquishi — reabilitação de força de preensão: sensores musculares (MyoWare + Arduino) transformam cada aperto em feedback ao vivo. (solo; hardware; mediapipe; 1989 palavras). "Three hundred squeezes a week, and nobody knows if any of them helped."
[3º Research] AETHER — janela que gera eletricidade (concentrador solar luminescente).
[Honorable] CRISIS SIM — simulador de evacuação em cheias (anuga, networkx).
[Honorable] SunDodge — rota a pé com menos sol direto, calculando sombras reais de prédios e árvores no navegador a partir do OpenStreetMap e da posição do sol. (55 números; cita Lancet Countdown 2025)
[Honorable] PocketLab — "pendure o telemóvel num fio e meça a gravidade com erro de 1%": 12 experiências com os sensores do telemóvel (DeviceMotion, FFT) + tutor de IA que conhece os seus números.
[Honorable] NewtonLab — cola uma questão de física do livro e vira simulação que você pausa, ajusta e confere com a resposta do livro.
[Honorable] Cham — backend em ~10 linhas legíveis, com mensagens de erro na língua do iniciante (Rust). Cita experimento com ~1000 alunos (GPT-4 +48% no treino, pior no teste).
[Honorable] RelayPlan — simulador de alocação de ajuda humanitária (cheias do Paquistão 2022, 33 milhões afetados).
[Honorable + Top 10] Fly Dungeon — explorar o conectoma da mosca-da-fruta (165.000 neurônios) como jogo.
[Honorable + Sponsor] Supercompress — comprime contexto antes do LLM ler.
[Honorable] FloodSense — plataforma explicável de risco de cheias em Assam.
[Honorable + Sponsor] RepoScope — mapa interativo de repositório e análise de impacto para agentes de código.
[Best Presentation / Pitch Video] First 72 — "para onde vou" + alguns fatos da mudança viram um plano ordenado por dependências (antes de partir, primeiras 24–72 h, primeira semana). "The rare problem where the information exists and the order does not."

### Amostra de não vencedores
[NÃO] QSP — pagamento por QR "simples, rápido e seguro para todos" (0 números, sem github).
[NÃO] OcuScan Pro — triagem ocular com IA no navegador; história pessoal forte (irmã com -3D sem diagnóstico por 2 anos), mas 2 números, sem github, sem validação de precisão.
[NÃO] Nurse Titi — IA guia primeiros socorros em emergências na Nigéria (435 palavras, 0 números, sem github, sem demo).
[NÃO] AuraCare — "web app edge-native com IA multimodal para pré-triagem neurológica por voz e motora" (0 números, sem validação).
[NÃO] Curio Labs — laboratórios virtuais e AR para todos (0 números).
[NÃO] Hermes — mensageiro privado em Rust com OpenPGP (técnico, mas 1 número, sem demo).
[NÃO] admitiy — "plataforma de sucesso estudantil com IA": universidades, bolsas, SAT, candidaturas, roadmaps (feito com bolt.new; 0 números).
[NÃO] FlowDesk — "funcionários de IA para pequenas empresas" (história pessoal da tia, 0 números).
