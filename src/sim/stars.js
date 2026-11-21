// As ESTRELAS do fim do desastre (regras do docs/design.md, secção 5.6):
//   0 estrelas = a escola (em Sintra, o quartel dos bombeiros) ardeu;
//   1 estrela  = a escola salvou-se;
//   2 estrelas = e também pelo menos 80% das casas;
//   3 estrelas = e todas as casas.

// Que parte das casas é preciso salvar para a 2.ª estrela.
export const TWO_STAR_SHARE = 0.8;

// outcome = { housesSaved, housesTotal, schoolSaved } (o resultado de runDisaster).
export function countStars({ housesSaved, housesTotal, schoolSaved }) {
  if (!schoolSaved) return 0;
  if (housesSaved >= housesTotal) return 3;
  if (housesSaved >= housesTotal * TWO_STAR_SHARE) return 2;
  return 1;
}
