const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function linear(c){c=parseInt(c,16)/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}
function contrastWithWhite(hex){const h=hex.slice(1),l=0.2126*linear(h.slice(0,2))+0.7152*linear(h.slice(2,4))+0.0722*linear(h.slice(4,6));return 1.05/(l+0.05);}

test('CSS text palette meets 4.5:1 contrast against white surfaces and exposes keyboard focus',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','public','styles.css'),'utf8');
  const colors=[...css.matchAll(/\bcolor:\s*(#[0-9a-f]{6})/gi)].map(m=>m[1]);
  const failures=[...new Set(colors.filter(color=>contrastWithWhite(color)<4.5))];
  assert.deepEqual(failures,[]);
  assert.match(css,/:focus-visible\s*\{[^}]*outline:3px/s);
});

test('citizen PWA exposes 48px touch targets, visible focus and reduced-motion support',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','public','citizen-react.css'),'utf8');
  assert.match(css,/\.citizen-react-app :focus-visible\{[^}]*outline:3px/s);
  assert.match(css,/\.citizen-react-app button,\.citizen-react-app input,\.citizen-react-app select,\.citizen-react-app textarea\{min-height:48px\}/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
