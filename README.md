# ⚡ Online Compiler Pro (No AI)

A responsive, animated **multi-language online compiler IDE** designed for **GitHub Pages**.
This version **excludes the AI chat**. It supports:

- **Client-side execution**: JavaScript (sandboxed iframe) and Python via **Pyodide**
- **Server-backed execution** for 60+ languages via **Judge0 CE API**
- **Monaco Editor** (VS Code-like) for a clean, productive editing experience

---

## ✨ Features
- **Monaco Editor via CDN** (AMD loader + worker proxy)
- **Light/Dark mode** with proper contrast (text remains readable when toggling)
- **Responsive design** (desktop & mobile)
- **Language dropdown**
  - Client-side: **JavaScript**, **Python (Pyodide)**
  - Server-backed (Judge0): **C**, **C++**, **Java**, **C#**, **PHP**, **Ruby**, **Go**, **Rust**, **TypeScript**, **Bash**, etc.
- **Hello World auto-insert** per language (runnable templates)
- **Import/Export files** (auto-detect syntax mode)
- **Share link** (code + STDIN encoded in URL)
- **Local Save/Load** (via `localStorage`)
- **Keyboard shortcuts**: `Ctrl+Enter` → Run, `Ctrl+S` → Export
- **Animated UI** (gradient topbar, pulse effect on Run)

---

## 🧱 Project Structure
```
index.html
assets/
  ├── styles.css           # Theme, layout, animations
  ├── app.js               # Editor logic, language templates, Runner
  └── monaco-worker.js     # Worker proxy for cross-origin CDN usage
```

---

## ⚙️ Configuration
Open `assets/app.js` and adjust:
```js
const CONFIG = {
  judge0: {
    enabled: true,
    baseUrl: 'https://ce.judge0.com', // or your own instance / RapidAPI endpoint
    apiKey: '' // optional if your instance requires a token
  },
};
```
- **`baseUrl`**: Judge0 CE endpoint
- **`apiKey`**: Set only if your Judge0 instance requires authentication

> Some public Judge0 instances enforce CORS or require tokens. If calls fail, use your own Judge0 CE deployment or a provider with proper CORS.

---

## 🚀 Deploy on GitHub Pages
1. Create a new GitHub repository.
2. Upload `index.html` and the `assets/` folder.
3. Go to **Settings → Pages** → choose branch `main` and folder `/root`.
4. Visit `https://<username>.github.io/<repo-name>/`.

> Static hosting on GitHub Pages works great with Monaco (via CDN + worker proxy) and Pyodide (WASM).

---

## ▶️ Usage
1. **Choose a language** from the dropdown.
   - Client-side (JS/Python): loads predefined examples.
   - Server-backed (Judge0): auto-inserts a runnable **Hello World** template.
2. **Write or import** code (Import accepts `.js, .py, .c, .cpp, .java, .cs, .php, .rb, .go, .swift, .kt, .ts, .rs, .sh`).
3. (Optional) Enter **STDIN** in the input box.
4. Press **Run** (or `Ctrl+Enter`).
5. View **Output**, plus **status/time/memory** for Judge0 runs.
6. **Export** to a file (or **Save/Load** locally) and **Share** a link.
7. Toggle **Light/Dark** mode with the moon/sun button.

---

## ✅ Quick Test Snippets
**JavaScript**
```js
console.log("Hello, world!");
```

**Python (Pyodide)**
```python
print("Hello, world!")
print("STDIN:", stdin)
```

**C (Judge0)**
```c
#include <stdio.h>
int main(){ printf("Hello, world!\n"); return 0; }
```

---

## 🌐 Browser Support
- Modern browsers with WebAssembly support (for Pyodide).
- Monaco Editor works across major browsers; workers are proxied for CDN usage.

---

## 🔒 Security & Notes
- No server-side secrets are stored—this is a **static site**.
- Judge0 requests run over HTTPS to public or self-hosted endpoints.
- Pyodide executes code **entirely in the browser**.

---

## 🙏 Credits
- **Monaco Editor** — Microsoft
- **Pyodide** — Python in the browser (WebAssembly)
- **Judge0 CE** — Online code execution system

---

## 📄 License
Add your license of choice (e.g., MIT) to the repository.

---

## 💡 Tips
- If a Judge0 call fails due to CORS or rate limits, switch to your own Judge0 instance.
- You can curate the language list and icons in `assets/app.js` for a custom experience.

