// Cena que DESENHA a vila em vista isométrica. Não tem regras do jogo:
// só lê a vila da simulação e mostra-a.
import { tileAt } from '../sim/village.js';

// Tamanho de um losango (quadrado visto na diagonal) em píxeis.
const TILE_W = 64;
const TILE_H = 32;

// Cores provisórias até termos os gráficos da Kenney.
const COLORS = {
  grass: 0x7cc35a, brush: 0x9a8a3c, eucalyptus: 0x2f6b3a, broadleaf: 0x4f9a46,
  house: 0xd9d2c3, school: 0xe8b04a, road: 0x8a8a8a, water: 0x3d8fd6,
  cleared: 0xc9b38a, firebreak: 0x7a5a3a,
};

// Converte a posição na grelha (coluna x, linha y) para píxeis no ecrã.
// É a "matemática isométrica": andar uma coluna vai para baixo-direita,
// andar uma linha vai para baixo-esquerda.
export function gridToScreen(x, y) {
  return { sx: (x - y) * (TILE_W / 2), sy: (x + y) * (TILE_H / 2) };
}

// O contrário: de píxeis para a posição na grelha (para saber onde se clicou).
export function screenToGrid(sx, sy) {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: Math.floor((a + b) / 2 + 0.5), y: Math.floor((b - a) / 2 + 0.5) };
}

export class VillageScene extends Phaser.Scene {
  init(data) {
    this.village = data.village;
  }

  create() {
    const g = this.add.graphics();
    // Desenha de trás para a frente (linha + coluna crescentes),
    // para as coisas da frente taparem as de trás.
    for (let y = 0; y < this.village.height; y++) {
      for (let x = 0; x < this.village.width; x++) {
        this.drawTile(g, x, y, tileAt(this.village, x, y));
      }
    }

    // Centra a câmara no meio da vila.
    const mid = gridToScreen(this.village.width / 2, this.village.height / 2);
    this.cameras.main.centerOn(mid.sx, mid.sy);

    this.setupCameraControls();
  }

  // Desenha um quadrado: um losango no chão e, para casas e árvores, um "volume" por cima.
  drawTile(g, x, y, type) {
    const { sx, sy } = gridToScreen(x, y);
    const color = COLORS[type];
    const ground = ['house', 'school', 'eucalyptus', 'broadleaf'].includes(type) ? COLORS.grass : color;
    this.diamond(g, sx, sy, ground);

    if (type === 'house' || type === 'school') {
      const h = type === 'school' ? 26 : 18; // altura da "caixa"
      this.box(g, sx, sy, h, color);
    } else if (type === 'eucalyptus' || type === 'broadleaf') {
      g.fillStyle(0x5a3b22).fillRect(sx - 2, sy - 14, 4, 10); // tronco
      g.fillStyle(color).fillCircle(sx, sy - 20, type === 'eucalyptus' ? 9 : 12); // copa
    }
  }

  diamond(g, sx, sy, color) {
    g.fillStyle(color).lineStyle(1, 0x000000, 0.15);
    g.beginPath();
    g.moveTo(sx, sy - TILE_H / 2);
    g.lineTo(sx + TILE_W / 2, sy);
    g.lineTo(sx, sy + TILE_H / 2);
    g.lineTo(sx - TILE_W / 2, sy);
    g.closePath().fillPath().strokePath();
  }

  // Uma caixa isométrica simples (topo + dois lados mais escuros) para parecer 3D.
  box(g, sx, sy, h, color) {
    const w = TILE_W / 2 - 8, d = TILE_H / 2 - 4;
    const darker = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
    const darkest = Phaser.Display.Color.IntegerToColor(color).darken(40).color;
    g.fillStyle(darker).fillPoints([{ x: sx - w, y: sy }, { x: sx, y: sy + d }, { x: sx, y: sy + d - h }, { x: sx - w, y: sy - h }], true);
    g.fillStyle(darkest).fillPoints([{ x: sx, y: sy + d }, { x: sx + w, y: sy }, { x: sx + w, y: sy - h }, { x: sx, y: sy + d - h }], true);
    g.fillStyle(color).fillPoints([{ x: sx, y: sy - d - h }, { x: sx + w, y: sy - h }, { x: sx, y: sy + d - h }, { x: sx - w, y: sy - h }], true);
  }

  // Arrastar para mover, roda do rato para zoom, clique para ver o tipo do quadrado.
  setupCameraControls() {
    const cam = this.cameras.main;
    let dragStart = null;

    this.input.on('pointerdown', (p) => { dragStart = { x: p.x, y: p.y, moved: false }; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || !dragStart) return;
      if (Math.abs(p.x - dragStart.x) + Math.abs(p.y - dragStart.y) > 5) dragStart.moved = true;
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    this.input.on('pointerup', (p) => {
      if (dragStart && !dragStart.moved) this.onTileClick(p.worldX, p.worldY);
      dragStart = null;
    });
    this.input.on('wheel', (p, objs, dx, dy) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.5, 2.5));
    });
  }

  onTileClick(worldX, worldY) {
    const { x, y } = screenToGrid(worldX, worldY);
    const info = document.getElementById('info');
    if (x < 0 || y < 0 || x >= this.village.width || y >= this.village.height) {
      info.textContent = 'Outside the village';
      return;
    }
    info.textContent = `Tile (${x}, ${y}): ${tileAt(this.village, x, y)}`;
  }
}
