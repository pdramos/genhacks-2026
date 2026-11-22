// Ferramenta de desenvolvimento: mede quanto custa desenhar a vila.
// Como usar: abrir o jogo (ex.: http://localhost:8000/?level=demo), abrir a consola do browser (F12) e escrever:
//   const { measure } = await import('/dev/perfProbe.js'); await measure();
// Devolve:
//   meshes       -> quantas peças (Mesh) há na cena
//   calls        -> "pedidos de desenho" à placa gráfica num frame normal (sem refazer as sombras)
//   callsShadows -> num frame em que o mapa das sombras é refeito (cada peça com sombra conta 2 vezes)
//   msPerFrame   -> milissegundos para desenhar um frame (menos = melhor; 16.7 ms = 60 FPS)
//   fps          -> frames por segundo medidos com requestAnimationFrame (só se o separador estiver visível)
export async function measure({ frames = 40 } = {}) {
  const { game } = await import('../src/render/main.js');
  const r = game.renderer, gl = r.getContext();
  let meshes = 0;
  game.scene.traverse((o) => { if (o.isMesh) meshes++; });

  r.shadowMap.needsUpdate = true;
  r.render(game.scene, game.camera);
  const callsShadows = r.info.render.calls;
  r.render(game.scene, game.camera);
  const calls = r.info.render.calls, triangles = r.info.render.triangles;

  // Tempo de desenho: desenhamos muitas vezes seguidas e lemos um píxel no fim
  // (ler um píxel obriga a placa gráfica a acabar o trabalho todo).
  const pixel = new Uint8Array(4);
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    game.view.update(i / 30);
    r.render(game.scene, game.camera);
  }
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  const msPerFrame = +((performance.now() - t0) / frames).toFixed(2);

  // FPS a sério (só funciona com o separador à vista; escondido, o browser pára os frames)
  let fps = null;
  if (document.visibilityState === 'visible') {
    fps = await new Promise((done) => {
      let count = 0; const start = performance.now();
      const tick = () => {
        count++;
        if (performance.now() - start < 3000) requestAnimationFrame(tick);
        else done(+(count / ((performance.now() - start) / 1000)).toFixed(1));
      };
      requestAnimationFrame(tick);
      setTimeout(() => done(null), 5000); // se os frames estiverem parados, desistimos
    });
  }
  return { meshes, calls, callsShadows, triangles, msPerFrame, fps };
}

// Põe a câmara numa posição fixa e desenha (para comparar imagens antes/depois).
//   await (await import('/dev/perfProbe.js')).pose([px, py, pz], [tx, ty, tz])
export async function pose(position, target = [0, 0, 0], time = 0) {
  const { game } = await import('../src/render/main.js');
  for (const el of document.querySelectorAll('body > *:not(#game)')) el.style.display = 'none'; // esconde a interface
  game.camera.position.set(...position);
  game.controls.target.set(...target);
  game.controls.update();
  game.view.update(time);
  game.renderer.shadowMap.needsUpdate = true;
  game.renderer.render(game.scene, game.camera);
}

// Queima uma lista de quadrados [[x, y], ...] e mede quanto tempo isso custa (incluindo refazer os blocos).
export async function burn(list) {
  const { game } = await import('../src/render/main.js');
  const t0 = performance.now();
  for (const [x, y] of list) game.view.setBurned(x, y);
  game.view.update(0);
  return +(performance.now() - t0).toFixed(1);
}
