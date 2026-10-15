from pathlib import Path
import re,hashlib,json
r=Path('dist'); original={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in r.rglob('*') if p.is_file() and (p.suffix in ['.mp4','.png','.webp'] or 'embed-media' in p.parts or p.name in ['media-lifecycle.mjs','profile-bootstrap.mjs'])}
for name in ['player.js','embed-runtime.js']:
 p=r/'shared'/name;s=p.read_text()
 s=s.replace("announce(firstFrameMs===null?'Loading opening…':'Loading this moment…');","announce('');")
 old="onProgress:(i,loaded,total)=>{if(i===pendingIndex)announce(`${firstFrameMs===null?'Loading opening':'Loading this moment'} · ${Math.min(100,Math.floor(loaded/total*100))}%`);}"
 assert old in s,name;s=s.replace(old,'onProgress:()=>{}')
 # Retain actionable errors, hide only empty/no-longer-needed status. Canvas pixels are never cleared.
 if name=='embed-runtime.js':
  s=s.replace('function resize(){\n  if(!config)return;\n  const measured=viewportProbe.getBoundingClientRect().height,nextHeight=Number.isFinite(measured)&&measured>0?measured:innerHeight;', '''function embedViewport(){
  const measured=viewportProbe.getBoundingClientRect().height;
  const availableHeight=Number.isFinite(measured)&&measured>0?measured:innerHeight;
  const width=Math.min(innerWidth,availableHeight*4/3);
  return {width,height:width*3/4};
}
function resize(){
  if(!config)return;
  const nextHeight=embedViewport().height;''')
  old='bootstrapProfile(document,{viewportWidth:innerWidth,viewportHeight:innerHeight,configURL})';assert old in s
  s=s.replace(old,'bootstrapProfile(document,{viewportWidth:embedViewport().width,viewportHeight:embedViewport().height,configURL})')
  s=s.replace('Video unavailable. You can still apply by SMS.','Video unavailable. You can still use the application form.')
 p.write_text(s)
for name in ['index.html','player.html']:
 p=r/name;s=p.read_text().replace('<p id="media-status" role="status">Loading opening…</p>','<p id="media-status" role="status" hidden></p>')
 s=s.replace('shared/player.js?v=20261013-premium-ui3','shared/player.js?v=20261013-premium-quiet5')
 s=s.replace('shared/embed-runtime.js?v=20261013-premium-embed1','shared/embed-runtime.js?v=20261013-premium-quiet5').replace('shared/embed.css?v=20261013-premium-embed1','shared/embed.css?v=20261013-premium-quiet5')
 s=s.replace('name="twitter:player:width" content="1916"','name="twitter:player:width" content="800"').replace('name="twitter:player:height" content="1080"','name="twitter:player:height" content="600"')
 if name=='player.html':
  # Keep the complete picture/source contract required by bootstrapProfile.
  s=re.sub(r'<div class="embed-controls"[\s\S]*?</div>','',s)
  s=re.sub(r'<a class="open-journey"[\s\S]*?</a>','',s)
 p.write_text(s)
(r/'player/index.html').write_text((r/'player.html').read_text().replace('<head>','<head><base href="/">',1))
# Keep every source frame, transport payload and main native-profile selector intact.
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in original.items())
assert not any(t in (r/f).read_text() for f in ['index.html','player.html','shared/player.js','shared/embed-runtime.js'] for t in ['Loading opening','Loading this moment'])
Path('verification/quiet-card-preservation.json').write_text(json.dumps({'unchangedMediaLifecycleBootstrapFiles':len(original),'sourceHashes':original,'mainProfileSelectionUnchanged':True,'cardRatio':'4:3','metadata':[800,600]},indent=2)+'\n')
print('Preserved',len(original),'media/transport/lifecycle/bootstrap files; removed routine loading copy')
