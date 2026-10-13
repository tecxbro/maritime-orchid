import fs from 'node:fs/promises';

// Native modules and the opaque-sandbox classic script use the same buffer.
const moduleFile=new URL('../dist/shared/chunk-buffer.mjs',import.meta.url);
const classicFile=new URL('../dist/shared/embed-runtime.js',import.meta.url);
const begin='/* BEGIN shared chunk buffer */',end='/* END shared chunk buffer */';
const source=(await fs.readFile(moduleFile,'utf8')).replace('export class ChunkBuffer','class ChunkBuffer');
const classic=await fs.readFile(classicFile,'utf8');
const start=classic.indexOf(begin),finish=classic.indexOf(end,start);
if(start<0||finish<0)throw new Error('Classic buffer source markers are missing.');
const generated=classic.slice(0,start)+begin+'\n'+source+end+classic.slice(finish+end.length);
if(process.argv.includes('--check')){
  if(generated!==classic)throw new Error('Run node scripts/sync-chunk-buffer.mjs before publishing.');
}else await fs.writeFile(classicFile,generated);
