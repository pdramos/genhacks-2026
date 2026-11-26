import { readFileSync, writeFileSync } from 'node:fs';
// A raiz do repositório, a partir do sítio deste ficheiro (video/scripts/record-clips/ -> ../../../).
const R = new URL('../../../', import.meta.url).href;
const { createVillage } = await import(R+'src/sim/village.js');
const { createBuildState, applyAction } = await import(R+'src/sim/actions.js');
const level = JSON.parse(readFileSync(new URL('data/levels/sintra.json', R), 'utf8'));
const GOOD=[['clear',17,9,20,11],['clear',13,9,16,11],['clear',6,11,12,12],['clear',0,13,5,14]];
const village = createVillage(level);
const state = createBuildState(village, level.budget);
const plan=[];
for (const [m,x0,y0,x1,y1] of GOOD) for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const a = state.village.tiles[y][x]==='brush'?'clearBrush':'firebreak';
  const r = applyAction(state,x,y,a); if(r.ok) plan.push({x,y,actionName:a});
}
console.log(plan.length, state.budget);
writeFileSync('sensible.json', JSON.stringify(plan));
writeFileSync('expert.json', JSON.stringify(level.expertPlan.actions.map(a=>({x:a.x,y:a.y,actionName:a.action}))));
