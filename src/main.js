// Ponto de entrada do jogo: carrega o nível, cria a vila (simulação) e arranca o Phaser.
import { createVillage } from './sim/village.js';
import { VillageScene } from './scenes/VillageScene.js';

const level = await fetch('data/levels/demo.json').then((r) => r.json());
const village = createVillage(level);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b3a',
  // Desenhamos para 1280x720 e o Phaser ajusta ao tamanho do ecrã.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
});

// Arranca a cena da vila e entrega-lhe a vila criada pela simulação.
game.scene.add('village', VillageScene, true, { village });
