// Gravador por CDP Page.startScreencast: guarda cada frame (jpeg) com o seu tempo e monta a 30 fps com ffmpeg.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
// Os frames temporários vão para a pasta temporária do sistema; os clips para video/public/clips/.
const WF = (process.env.VIDEO_WF_DIR || path.join(require('os').tmpdir(), 'same-night-video')) + '/';
const CLIPS = path.join(__dirname, '..', '..', 'public', 'clips') + '/';
async function startRec(page, name) {
  const dir = WF + 'frames/' + name + '/'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = []; const pend = [];
  cdp.on('Page.screencastFrame', (f) => {
    const i = frames.length; const file = dir + String(i).padStart(6, '0') + '.jpg';
    frames.push({ file, ts: f.metadata.timestamp });
    pend.push(fs.promises.writeFile(file, Buffer.from(f.data, 'base64')));
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const startEpoch = Date.now() / 1000;
  const events = [];
  return {
    name, events,
    mark(label) { const t = Date.now() / 1000; events.push({ label, epoch: t }); console.log(name, label, (t - startEpoch).toFixed(2)); },
    async stop() {
      const stopEpoch = Date.now() / 1000;
      await cdp.send('Page.stopScreencast'); await Promise.all(pend); await cdp.detach().catch(() => {});
      frames.sort((a, b) => a.ts - b.ts); fs.writeFileSync(dir + 'frames.json', JSON.stringify(frames));
      const t0 = frames[0].ts;
      let list = 'ffconcat version 1.0\n';
      frames.forEach((fr, i) => { const next = i + 1 < frames.length ? frames[i + 1].ts : stopEpoch; list += `file '${fr.file}'\nduration ${Math.max(0.001, next - fr.ts).toFixed(4)}\n`; });
      list += `file '${frames[frames.length - 1].file}'\n`;
      fs.writeFileSync(dir + 'list.txt', list);
      const out = CLIPS + name + '.mp4';
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', dir + 'list.txt', '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-r', '30', '-movflags', '+faststart', out]);
      const dur = stopEpoch - t0; const span = frames[frames.length-1].ts - t0;
      const ev = events.map(e => ({ label: e.label, t: +(e.epoch - t0).toFixed(2) }));
      const meta = { name, file: out, frames: frames.length, avgFps: +(frames.length / dur).toFixed(1), durationSec: +dur.toFixed(2), tsSpan: +span.toFixed(2), events: ev };
      fs.writeFileSync(WF + 'meta-' + name + '.json', JSON.stringify(meta, null, 1));
      console.log('DONE', JSON.stringify(meta));
      return meta;
    },
  };
}
module.exports = { startRec, WF, CLIPS };
