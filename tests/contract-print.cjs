// Browser-level PDF regression. Requires Playwright/Chromium and Poppler.
// CHROMIUM_EXECUTABLE_PATH may select an existing browser; QA_DOCX_INPUT may
// point at a locally generated private contract (never commit that document).
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'contract-print-'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:816,height:1056}});
  await page.setContent('<!doctype html><html><head></head><body></body></html>');
  for(const file of ['vendor/jszip-3.10.1.min.js','vendor/docx-preview-0.3.6.min.js'])await page.addScriptTag({path:path.resolve(file)});
  const bytes=process.env.QA_DOCX_INPUT?fs.readFileSync(process.env.QA_DOCX_INPUT):await require('./contract-fixture.cjs')();
  await page.evaluate(async b=>docx.renderAsync(Uint8Array.from(atob(b),c=>c.charCodeAt(0)),document.body,document.head,{className:'docx',inWrapper:true,breakPages:true,useBase64URL:true,renderHeaders:true,renderFooters:true,ignoreLastRenderedPageBreak:true}),bytes.toString('base64'));
  const source=fs.readFileSync('app-contract-word.js','utf8');
  await page.addScriptTag({content:source.slice(source.indexOf('function prepararEstilosImpresionContrato'),source.indexOf('imprimirContrato=async function'))});
  await page.evaluate(async()=>{prepararEstilosImpresionContrato(document);await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  if(!process.env.QA_DOCX_INPUT)await page.evaluate(()=>{
   // Reproduce a section whose bottom padding overflows Letter by 32pt.
   document.querySelectorAll('section.docx')[1].style.minHeight='824pt';
  });
  const expected=await page.locator('section.docx').count();
  const before=path.join(tmp,'before.pdf'),after=path.join(tmp,'after.pdf');
  await page.pdf({path:before,preferCSSPageSize:true});
  await page.evaluate(()=>ajustarPaginasImpresionContrato(document));
  await page.pdf({path:after,preferCSSPageSize:true});
  const text=file=>execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
  const beforeText=text(before),afterText=text(after);
  const pages=afterText.split('\f');if(!pages.at(-1).trim())pages.pop();
  assert.equal(pages.length,expected,'one physical PDF page per DOCX section');
  assert(pages.every(p=>p.trim().length),'no blank page');
  assert.equal(afterText.replace(/\s/g,''),beforeText.replace(/\s/g,''),'all contract text and signatures preserved');
  if(!process.env.QA_DOCX_INPUT)assert(beforeText.split('\f').length>afterText.split('\f').length,'fixture reproduces the extra page');
  console.log(`PASS: ${expected} PDF pages, no blank page, complete text preserved.`);
 }finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
