import fs from 'node:fs/promises';
const moduleFile=new URL('../dist/shared/chapter-swipe.mjs',import.meta.url);
const classicFile=new URL('../dist/shared/mobile-embed-runtime.js',import.meta.url);
const begin='/* BEGIN shared chapter swipe */',end='/* END shared chapter swipe */';
const source=(await fs.readFile(moduleFile,'utf8')).replace('export class ChapterSwipe','class ChapterSwipe');
const classic=await fs.readFile(classicFile,'utf8');
const start=classic.indexOf(begin),finish=classic.indexOf(end,start);
if(start<0||finish<0)throw Error('Classic chapter swipe markers are missing.');
const generated=classic.slice(0,start)+begin+'\n'+source+end+classic.slice(finish+end.length);
if(process.argv.includes('--check')){if(generated!==classic)throw Error('Run sync-chapter-swipe.mjs before publishing.');}
else await fs.writeFile(classicFile,generated);
