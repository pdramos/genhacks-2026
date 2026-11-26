// Para onde vão os resultados do playtest (só com ?playtest=1): uma base de dados Supabase,
// projeto "same-night-playtest" (Europa). Ver src/render/playtestLog.js.
//
// A chave abaixo é PÚBLICA de propósito (é uma chave "publishable": foi feita para estar no
// código de uma página). Com ela só se consegue chamar a função submit_playtest, que ESCREVE
// uma sessão anónima. Ler os resultados precisa de outra chave, secreta, que não está no
// repositório (fica num ficheiro *.local.txt, ignorado pelo git).
export const PLAYTEST_API = 'https://qzdfpbbxjwxpsrxfwlem.supabase.co/rest/v1/rpc';
export const PLAYTEST_KEY = 'sb_publishable_lYZTyZQOq3yRksGeywaI1Q_81NbBzId';
// Muda quando o jogo muda de forma que conte para os resultados (para não misturar versões).
// Com &test=1 no endereço, a versão é 'test' e a página de resultados esconde essas sessões.
export const PLAYTEST_VERSION = '2026-11-26b'; // 'b': perguntas gerais (sem a lei portuguesa)
