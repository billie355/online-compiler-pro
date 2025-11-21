// ---------- Config ----------
const CONFIG = {
  judge0: {
    enabled: true,
    baseUrl: 'https://ce.judge0.com', // Change to your own instance or RapidAPI endpoint if needed
    apiKey: '' // Optional; if your instance requires a token
  },
};

// ---------- State ----------
let editor, pyodideReady = null;
const els = {
  languageSelect: document.getElementById('languageSelect'),
  exampleSelect: document.getElementById('exampleSelect'),
  runBtn: document.getElementById('runBtn'),
  themeToggle: document.getElementById('themeToggle'),
  shareBtn: document.getElementById('shareBtn'),
  formatBtn: document.getElementById('formatBtn'),
  clearBtn: document.getElementById('clearBtn'),
  saveLocalBtn: document.getElementById('saveLocalBtn'),
  loadLocalBtn: document.getElementById('loadLocalBtn'),
  fileInput: document.getElementById('fileInput'),
  exportBtn: document.getElementById('exportBtn'),
  stdinEl: document.getElementById('stdinInput'),
  outputEl: document.getElementById('output'),
  copyOutputBtn: document.getElementById('copyOutputBtn'),
  clearOutputBtn: document.getElementById('clearOutputBtn'),
  runMeta: document.getElementById('runMeta'),
};

// ---------- Client-side examples ----------
const EXAMPLES = {
  javascript: {
    'Hello world': `console.log('Hello, world!')`,
    'Factorial': `function fact(n){ return n<=1?1:n*fact(n-1);}\nconsole.log('fact(10)=', fact(10));`,
  },
  python: {
    'Hello world': `print('Hello, world!')`,
    'Sum from stdin': `# Read from provided variable 'stdin'\nprint('STDIN=', stdin)\nnums = [int(x) for x in stdin.split() if x.isdigit()]\nprint('sum=', sum(nums))`,
  }
};

// ---------- Helpers ----------
function clearOutput(){ els.outputEl.textContent = ''; els.runMeta.textContent = ''; }
function appendOutput(line){ els.outputEl.textContent += String(line) + '\n'; els.outputEl.scrollTop = els.outputEl.scrollHeight; }
function hasCode(){ return (editor.getValue() || '').trim().length > 0; }
function setRunEnabled(){ els.runBtn.disabled = !hasCode(); }
function applyTheme(dark){
  const root = document.documentElement;
  if(dark){ root.classList.add('dark'); root.classList.remove('light'); monaco.editor.setTheme('vs-dark'); els.themeToggle.textContent = '☀️'; localStorage.setItem('theme','dark'); }
  else { root.classList.remove('dark'); root.classList.add('light'); monaco.editor.setTheme('vs'); els.themeToggle.textContent = '🌙'; localStorage.setItem('theme','light'); }
}

// ---------- Monaco Init ----------
function initMonaco(){
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Select a language then pick an example…\n',
    language: 'javascript',
    theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
    fontSize: 14,
    automaticLayout: true,
    minimap: { enabled: false }
  });
  editor.onDidChangeModelContent(setRunEnabled);
  setRunEnabled();
}

// ---------- Pyodide ----------
async function initPyodide(){
  try {
    pyodideReady = await loadPyodide();
    appendOutput('[Pyodide] Ready');
  } catch(err){ appendOutput('[Pyodide] Failed: ' + err.message); }
}

// ---------- Judge0 ----------
async function fetchJudge0Languages(){
  if(!CONFIG.judge0.enabled) return [];
  try {
    const resp = await fetch(CONFIG.judge0.baseUrl + '/languages');
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch(err){ appendOutput('[Judge0] languages failed: ' + err.message); return []; }
}

async function runJudge0(languageId, source, stdin){
  const url = CONFIG.judge0.baseUrl + '/submissions?base64_encoded=true&wait=true';
  const payload = {
    language_id: Number(languageId),
    source_code: btoa(source),
    stdin: stdin ? btoa(stdin) : undefined
  };
  const headers = { 'Content-Type': 'application/json' };
  if(CONFIG.judge0.apiKey){ headers['X-Auth-Token'] = CONFIG.judge0.apiKey; }
  const t0 = performance.now();
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const t1 = performance.now();
  if(!resp.ok) throw new Error('Judge0 HTTP ' + resp.status);
  const data = await resp.json();
  const out = atob(data.stdout || '') || '';
  const err = atob(data.stderr || '') || '';
  const cmp = atob(data.compile_output || '') || '';
  const status = (data.status && data.status.description) ? data.status.description : '';
  const meta = `status: ${status} • time: ${data.time ?? '—'}s • memory: ${data.memory ?? '—'} KB • roundtrip: ${((t1-t0)/1000).toFixed(2)}s`;
  return { out, err, cmp, status, meta };
}

// ---------- Execution ----------
async function runCode(){
  clearOutput();
  const selected = els.languageSelect.value;
  const code = editor.getValue();
  const stdin = els.stdinEl.value || '';
  if(!hasCode()) { appendOutput('⚠️ No code to run.'); return; }

  try {
    if(selected === 'javascript'){
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none'; iframe.setAttribute('sandbox','allow-scripts');
      document.body.appendChild(iframe);
      const script = `\n        const send = (msg)=> parent.postMessage({type:'js-out', msg}, '*');\n        console.log = ( ...args ) => send(args.join(' '));\n        try { ${code} } catch(e){ send('[error] ' + e.message); }\n      `;
      iframe.srcdoc = `<script>${script}<\/script>`;
      const listener = (ev)=>{ if(ev.data && ev.data.type==='js-out'){ appendOutput(ev.data.msg); } };
      window.addEventListener('message', listener, { once: true });
      setTimeout(()=> { window.removeEventListener('message', listener); iframe.remove(); }, 1500);
      els.runMeta.textContent = 'Executed in browser';
    }
    else if(selected === 'python'){
      if(!pyodideReady){ appendOutput('Loading Python runtime…'); await initPyodide(); }
      pyodideReady.globals.set('stdin', stdin);
      const t0 = performance.now();
      const result = await pyodideReady.runPythonAsync(code);
      const t1 = performance.now();
      if(result !== undefined) appendOutput(String(result));
      els.runMeta.textContent = `Executed in Pyodide • time: ${((t1-t0)/1000).toFixed(2)}s`;
    }
    else {
      appendOutput('[Judge0] Running…');
      const res = await runJudge0(selected, code, stdin);
      if(res.cmp) appendOutput('[Compile]\n' + res.cmp);
      if(res.out) appendOutput('[Output]\n' + res.out);
      if(res.err) appendOutput('[Error]\n' + res.err);
      els.runMeta.textContent = res.meta;
    }
  } catch(err){ appendOutput('❌ ' + err.message); }
}

// ---------- Language & Examples ----------
async function populateLanguages(){
  // Client-side first
  const clients = [ {id:'javascript', name:'JavaScript (Browser)'}, {id:'python', name:'Python (Pyodide)'} ];
  clients.forEach(l => { const o=document.createElement('option'); o.value=l.id; o.textContent=l.name; els.languageSelect.appendChild(o); });

  const divider = document.createElement('optgroup'); divider.label = 'Server‑backed (Judge0)'; els.languageSelect.appendChild(divider);
  const langs = await fetchJudge0Languages();
  if(langs.length){ langs.forEach(l => { const o=document.createElement('option'); o.value=String(l.id); o.textContent=l.name; divider.appendChild(o); }); }
  else { const o=document.createElement('option'); o.disabled=true; o.textContent='(Unable to load languages)'; divider.appendChild(o); }

  els.languageSelect.value = 'javascript';
  populateExamples('javascript');
}

function populateExamples(lang){
  els.exampleSelect.innerHTML = '';
  const group = EXAMPLES[lang];
  if(group){ Object.keys(group).forEach(name => { const o=document.createElement('option'); o.value=name; o.textContent=name; els.exampleSelect.appendChild(o); });
    const first = Object.keys(group)[0]; editor.setValue(group[first]); setRunEnabled(); setMonacoMode(lang);
  } else {
    const o=document.createElement('option'); o.disabled=true; o.textContent='(No examples)'; els.exampleSelect.appendChild(o);
  }
}

function setMonacoMode(langOrId){
  let mode = 'plaintext';
  if(langOrId === 'javascript') mode = 'javascript';
  else if(langOrId === 'python') mode = 'python';
  else {
    const opt = els.languageSelect.options[els.languageSelect.selectedIndex];
    const name = opt ? opt.textContent.toLowerCase() : '';
    if(name.includes('c++')) mode = 'cpp';
    else if(name.includes('c ')) mode = 'c';
    else if(name.includes('java')) mode = 'java';
    else if(name.includes('c#')) mode = 'csharp';
    else if(name.includes('php')) mode = 'php';
    else if(name.includes('ruby')) mode = 'ruby';
    else if(name.includes('go')) mode = 'go';
    else if(name.includes('rust')) mode = 'rust';
    else if(name.includes('typescript')) mode = 'typescript';
    else if(name.includes('bash')) mode = 'shell';
  }
  monaco.editor.setModelLanguage(editor.getModel(), mode);
}

// ---------- File I/O ----------
function detectExt(){
  const val = els.languageSelect.value;
  if(val==='javascript') return 'js'; if(val==='python') return 'py';
  const opt = els.languageSelect.options[els.languageSelect.selectedIndex];
  const name = opt ? opt.textContent.toLowerCase() : '';
  if(name.includes('python')) return 'py'; if(name.includes('c++')) return 'cpp'; if(name.includes('c ')) return 'c';
  if(name.includes('java')) return 'java'; if(name.includes('javascript')) return 'js'; if(name.includes('typescript')) return 'ts';
  if(name.includes('ruby')) return 'rb'; if(name.includes('php')) return 'php'; if(name.includes('go')) return 'go'; if(name.includes('rust')) return 'rs'; return 'txt';
}

function setupFileIO(){
  els.fileInput.addEventListener('change', async (ev)=>{
    const file = ev.target.files && ev.target.files[0]; if(!file) return;
    const text = await file.text(); editor.setValue(text); setRunEnabled();
    const ext = (file.name.split('.').pop()||'').toLowerCase();
    const map = { js:'javascript', py:'python', c:'c', cpp:'cpp', java:'java', cs:'csharp', php:'php', rb:'ruby', go:'go', swift:'swift', kt:'kotlin', ts:'typescript', rs:'rust', sh:'bash' };
    const lang = map[ext]; if(lang) setMonacoMode(lang);
  });
  els.exportBtn.addEventListener('click', ()=>{
    const ext = detectExt(); const blob = new Blob([editor.getValue()], { type:'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`program.${ext}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  });
}

// ---------- Share & Local Save ----------
function updateShareUrl(){
  const codeB64 = btoa(unescape(encodeURIComponent(editor.getValue())));
  const stdinB64 = btoa(unescape(encodeURIComponent(els.stdinEl.value)));
  const lang = els.languageSelect.value;
  const url = `${location.origin}${location.pathname}?lang=${encodeURIComponent(lang)}#code=${codeB64}&stdin=${stdinB64}`;
  navigator.clipboard.writeText(url).then(()=> appendOutput('[Share] Link copied to clipboard')).catch(()=> appendOutput('[Share] Copy failed'));
}

function loadFromUrl(){
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  const lang = params.get('lang'); const codeB64 = hash.get('code'); const stdinB64 = hash.get('stdin');
  if(lang){ els.languageSelect.value = lang; setMonacoMode(lang); }
  if(codeB64){ try{ const code = decodeURIComponent(escape(atob(codeB64))); editor.setValue(code); }catch{} }
  if(stdinB64){ try{ els.stdinEl.value = decodeURIComponent(escape(atob(stdinB64))); }catch{} }
  setRunEnabled();
}

function saveLocal(){ localStorage.setItem('ocp_code', editor.getValue()); localStorage.setItem('ocp_stdin', els.stdinEl.value); appendOutput('[Save] Stored in browser'); }
function loadLocal(){ const c=localStorage.getItem('ocp_code'); const s=localStorage.getItem('ocp_stdin'); if(c!==null) editor.setValue(c); if(s!==null) els.stdinEl.value=s; setRunEnabled(); }

// ---------- Formatting ----------
async function formatCode(){
  try { await editor.getAction('editor.action.formatDocument').run(); }
  catch { /* fallback: no built-in formatter available */ }
}

// ---------- Events ----------
els.runBtn.addEventListener('click', runCode);
els.themeToggle.addEventListener('click', ()=>{ const dark = !document.documentElement.classList.contains('dark'); applyTheme(dark); });
els.shareBtn.addEventListener('click', updateShareUrl);
els.formatBtn.addEventListener('click', formatCode);
els.clearBtn.addEventListener('click', ()=>{ editor.setValue(''); setRunEnabled(); });
els.saveLocalBtn.addEventListener('click', saveLocal);
els.loadLocalBtn.addEventListener('click', loadLocal);
els.copyOutputBtn.addEventListener('click', ()=>{ navigator.clipboard.writeText(els.outputEl.textContent||''); });
els.clearOutputBtn.addEventListener('click', clearOutput);
els.stdinEl.addEventListener('input', ()=>{});
els.languageSelect.addEventListener('change', ()=>{ const v=els.languageSelect.value; setMonacoMode(v); if(EXAMPLES[v]) populateExamples(v); });
els.exampleSelect.addEventListener('change', ()=>{ const lang=els.languageSelect.value; const name=els.exampleSelect.value; const src=EXAMPLES[lang]?.[name]; if(src){ editor.setValue(src); setRunEnabled(); }});

// Keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='enter'){ e.preventDefault(); runCode(); }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); els.exportBtn.click(); }
});

// ---------- Bootstrap ----------
(async function main(){
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme ? savedTheme==='dark' : prefersDark);
  initMonaco(); setupFileIO(); await populateLanguages(); loadFromUrl();
})();
