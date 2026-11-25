const { spawn } = require('node:child_process');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

async function main() {
const root = path.resolve(__dirname, '..');
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-perf-'));
const port = 40000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
const iso = new Date().toISOString();
const reports = Array.from({ length: 1000 }, (_, i) => ({ id:`perf-${i}`,folio:`PERF-${String(i).padStart(5,'0')}`,category:'Alumbrado público',description:'Registro sintético de rendimiento.',lat:-41.47+(i%50)*0.0001,lng:-72.94+Math.floor(i/50)*0.0001,status:'PENDIENTE',department:'Operaciones',createdAt:iso,updatedAt:iso,severity:2,closure:null,reporterId:null }));
const initial = { schemaVersion:3,tables:{reports,staff:[],citizens:[],reporters:[],verificationRequests:[],events:[],supporters:[],reportHistory:reports.map(r=>({reportId:r.id,status:'PENDIENTE',date:iso,comment:'Registro sintético',staff:null})),reportComments:[],reportMedia:[]} };
await writeFile(path.join(dataDir,'db.json'),JSON.stringify(initial));
const child = spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),REPORTA_DATA_DIR:dataDir,JWT_SECRET:'reporta-performance-secret-that-is-at-least-32-bytes'},stdio:'ignore',windowsHide:true});
try {
  let ready=false;
  for(let i=0;i<100;i++){try{const r=await fetch(`${base}/api/health`);if(r.ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw new Error('API no inició con dataset de rendimiento.');
  const concurrency=50, requests=200, times=[];let next=0;
  await Promise.all(Array.from({length:concurrency},async()=>{while(true){const index=next++;if(index>=requests)return;const start=performance.now(),response=await fetch(`${base}/api/reports`);if(!response.ok)throw new Error(`GET /api/reports devolvió ${response.status}`);const body=await response.json();if(body.length!==1000)throw new Error(`Esperaba 1000 reportes y recibí ${body.length}`);times.push(performance.now()-start);}}));
  times.sort((a,b)=>a-b);const p95=times[Math.ceil(times.length*.95)-1],mean=times.reduce((a,b)=>a+b,0)/times.length;
  console.log(JSON.stringify({dataset:1000,parallelClients:concurrency,requests:requests,p95Ms:Number(p95.toFixed(1)),meanMs:Number(mean.toFixed(1)),targetP95Ms:1500,pass:p95<1500},null,2));
  if(p95>=1500)process.exitCode=1;
} finally { child.kill(); await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,2000).unref();}}); await rm(dataDir,{recursive:true,force:true}); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
