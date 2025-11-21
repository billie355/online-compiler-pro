// Monaco worker proxy for CDN usage
const MONACO_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/';
self.MonacoEnvironment = { baseUrl: MONACO_BASE };
importScripts(MONACO_BASE + 'vs/base/worker/workerMain.js');
