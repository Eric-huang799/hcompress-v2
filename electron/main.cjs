const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const os = require("os");

let mainWindow = null;
let pythonPath = null;

// ── Find Python ──
function findPython() {
  if (pythonPath) return pythonPath;
  const candidates = [
    "python", "python3",
    "C:\\ProgramData\\anaconda3\\python.exe",
    "C:\\Users\\" + os.userInfo().username + "\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
    "C:\\Users\\" + os.userInfo().username + "\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
    "C:\\Python312\\python.exe", "C:\\Python311\\python.exe",
  ];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ["--version"], { timeout: 3000 });
      if (r.status === 0) { pythonPath = c; return c; }
    } catch {}
  }
  return null;
}

function runPython(args) {
  const py = findPython();
  if (!py) return Promise.resolve({ success: false, stderr: "未找到 Python。请安装 Python 后再试。" });

  // Search for hcompress v1 — try multiple locations
  const cwdCandidates = [
    path.resolve(__dirname, "../../../hcompress"),  // release/../hcompress (sibling to hcompress-v2)
    path.resolve(__dirname, "../../../../hcompress"), // release/resources/app/../../hcompress
    path.join(os.homedir(), "hcompress"),
  ];
  let cwd = process.cwd();
  for (const d of cwdCandidates) {
    if (require("fs").existsSync(d)) { cwd = d; break; }
  }

  return new Promise((resolve) => {
    const env = { ...process.env, PYTHONPATH: cwd, PYTHONIOENCODING: "utf-8" };
    const proc = spawn(py, args, { cwd, env });
    let out = "", err = "";
    proc.stdout.on("data", d => out += d);
    proc.stderr.on("data", d => err += d);
    proc.on("error", e => resolve({ success: false, stderr: "Python 启动失败: " + e.message }));
    proc.on("close", code => resolve({ success: code === 0, stdout: out, stderr: err }));
  });
}

// ── Window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 750, minWidth: 700, minHeight: 500,
    title: "hcompress v2", backgroundColor: "#06060a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  findPython(); // pre-warm
  createWindow();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ── IPC ──
ipcMain.handle("hcompress:compress", async (_e, { input, output, level }) =>
  runPython(["-m", "hcompress", "c", input, "-o", output, "--level", String(level || 6), "-f"])
);

ipcMain.handle("hcompress:decompress", async (_e, { input, output }) => {
  const r = await runPython(["-m", "hcompress", "d", input, "-o", output, "-f"]);
  // Rich writes errors to stdout, not stderr — check both
  const combined = (r.stdout || "") + (r.stderr || "");
  r.bombDetected = combined.includes("检测到疑似压缩炸弹") || combined.includes("BombDetectedError");
  return r;
});

ipcMain.handle("hcompress:hcfInfo", async (_e, filePath) =>
  runPython(["-m", "hcompress", "info", filePath])
);

ipcMain.handle("dialog:openFile", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openFile", "multiSelections"] });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle("dialog:openDirectory", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
  return r.canceled ? [] : r.filePaths;
});
