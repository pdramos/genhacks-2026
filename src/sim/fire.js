// O incêndio: regras de como o fogo passa de um quadrado para os vizinhos.
// Só regras e números, sem desenho. A interface (src/render) apenas "reproduz" o resultado.

// Facilidade com que cada tipo de quadrado pega fogo (0 = nunca, 1 = muito fácil).
export const FLAMMABILITY = {
  eucalyptus: 0.9,
  brush: 0.8,
  grass: 0.5,
  house: 0.4,
  school: 0.4,
  broadleaf: 0.3,
  cleared: 0.15,
  firebreak: 0,
  road: 0,
  water: 0,
};

// Probabilidade (0 a 1) de um quadrado a arder pegar fogo ao vizinho do tipo targetType.
// (dx, dy) = direção do quadrado a arder até ao vizinho (um dos 8 vizinhos).
// wind = { direction, speed }: de onde o vento vem (graus) e a força (km/h).
// k = quanto o vento conta (um número pequeno, por exemplo 0.05).
export function ignitionProbability(targetType, dx, dy, wind, k) {
  const flammability = FLAMMABILITY[targetType] ?? 0;

  // Para onde o vento empurra o fogo (downwind), na grelha (y cresce para sul).
  // O vento VEM de "direction", por isso vai para o lado contrário.
  const radians = (wind.direction * Math.PI) / 180;
  const downX = -Math.sin(radians);
  const downY = Math.cos(radians);

  // cos do ângulo entre a direção do vizinho e o downwind:
  //  1 = o vizinho está mesmo a favor do vento, -1 = mesmo contra o vento, 0 = de lado.
  const length = Math.hypot(dx, dy);
  const cosAngle = (dx * downX + dy * downY) / length;

  // Fator do vento: a favor do vento aumenta, contra o vento diminui (mas nunca abaixo de 0.1).
  const windFactor = Math.max(0.1, 1 + k * wind.speed * cosAngle);

  return clamp(flammability * windFactor, 0, 1);
}

// Prende um número entre min e max.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
