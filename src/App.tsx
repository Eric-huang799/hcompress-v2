import { useState, useCallback } from "react";
import { useTheme } from "./hooks/useTheme";
import "./styles/theme.css";

type ThemeMode = "light" | "dark" | "system";

/* ── Types ── */
interface FileEntry {
  id: number; name: string; path: string; size: number; isDir: boolean; ext: string;
}

function fmt(n: number): string {
  for (const u of ["B","KB","MB","GB"]) { if (n < 1024) return `${n.toFixed(1)} ${u}`; n /= 1024; }
  return `${n.toFixed(1)} TB`;
}

function estRatio(ext: string): number {
  const g = [".txt",".md",".log",".csv",".json",".xml",".html",".css",".js",".py",".c",".cpp",".obj",".bmp",".wav"];
  if (ext === "folder") return 0.52;
  if (g.some(e => ext.toLowerCase().endsWith(e))) return 0.48;
  return 0.98;
}
function est(ext: string): string { const r = estRatio(ext); return `~${(r*100).toFixed(0)}%`; }

/* ── Sidebar ── */
function Sidebar({ active, onNav }: { active: string; onNav: (t: string) => void }) {
  const items = [
    { id: "compress", label: "📦 压缩" },
    { id: "decompress", label: "📂 解压" },
    { id: "browser", label: "📁 归档浏览器" },
    { id: "plugins", label: "🔌 插件", badge: "3" },
  ];
  return (
    <aside className="sidebar">
      <div className="logo">hcompress <span>v2</span></div>
      {items.map(it => (
        <button key={it.id} className={`nav-item ${active === it.id ? "active" : ""}`} onClick={() => onNav(it.id)}>
          {it.label}{it.badge && <span className="badge">{it.badge}</span>}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ color: "var(--dim)", fontSize: ".82em", padding: "8px 12px" }}>🛡️ BombGuard 已启用</span>
    </aside>
  );
}

/* ── Settings Modal ── */
function SettingsModal({ mode, setMode, onClose }: {
  mode: ThemeMode; setMode: (m: ThemeMode) => void; onClose: () => void;
}) {
  const themes: { key: ThemeMode; label: string }[] = [
    { key: "light", label: "☀️ 浅色" }, { key: "system", label: "💻 跟随系统" }, { key: "dark", label: "🌙 深色" },
  ];
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: "1.1em" }}>⚙️ 设置</span>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: "1.2em" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: ".8em", color: "var(--dim)", marginBottom: 8 }}>主题外观</div>
            <div className="theme-row">
              {themes.map(t => (
                <button key={t.key} className={`theme-btn ${mode === t.key ? "active" : ""}`}
                        onClick={() => setMode(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: ".8em", color: "var(--dim)", marginBottom: 6 }}>默认压缩级别</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={0} max={9} defaultValue={6} style={{ flex: 1 }} />
              <span style={{ fontWeight: 600, width: 20, textAlign: "center" }}>6</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".88em" }}>🛡️ BombGuard</span>
            <span style={{ color: "var(--green)", fontWeight: 600 }}>已启用</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".88em" }}>📦 默认输出目录</span>
            <span style={{ color: "var(--muted)", fontSize: ".82em" }}>~/Desktop</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Drop Zone ── */
function DropZone({ onAdd }: { onAdd: () => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div className={`dropzone ${drag ? "active" : ""}`}
         onDragOver={e => { e.preventDefault(); setDrag(true); }}
         onDragLeave={() => setDrag(false)}
         onDrop={e => { e.preventDefault(); setDrag(false); onAdd(); }}
         onClick={onAdd}>
      <div className="icon">📦</div>
      <div className="hint">拖拽文件或文件夹到此处<br />
        <span style={{ fontSize: ".8em", marginTop: 4, display: "inline-block", color: "var(--dim)" }}>
          或点击 <strong>添加文件 / 文件夹</strong> 按钮
        </span>
      </div>
    </div>
  );
}

/* ── File Table ── */
function FileTable({ files, onRemove }: { files: FileEntry[]; onRemove: (id: number) => void }) {
  if (files.length === 0) return null;
  const total = files.reduce((s, f) => s + f.size, 0);
  const totalEst = files.reduce((s, f) => s + f.size * estRatio(f.ext), 0);
  return (
    <>
      <table className="file-table">
        <thead><tr><th>文件</th><th style={{ width: 90 }}>大小</th><th style={{ width: 100 }}>预计压缩率</th><th style={{ width: 50 }}></th></tr></thead>
        <tbody>
          {files.map(f => {
            const cls = estRatio(f.ext) < 0.6 ? "ratio-good" : estRatio(f.ext) < 0.95 ? "ratio-ok" : "ratio-bad";
            return (
              <tr key={f.id}>
                <td><span className="name">{f.isDir ? "📁" : "📄"} {f.name} <span className="ext">{f.ext}</span></span></td>
                <td className="size">{fmt(f.size)}</td>
                <td className={cls}>{est(f.ext)}</td>
                <td><button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: ".8em" }} onClick={() => onRemove(f.id)}>✕</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="cards">
        <div className="card"><div className="label">总原始大小</div><div className="value">{fmt(total)}</div></div>
        <div className="card"><div className="label">预计压缩后</div><div className="value" style={{ color: "var(--accent2)" }}>{fmt(totalEst)}</div></div>
        <div className="card" style={{ borderColor: "rgba(30,157,91,.2)" }}>
          <div className="label">🛡️ BombGuard</div><div className="value" style={{ color: "var(--green)", fontSize: "1.1em" }}>✓ 已启用 · 阈值 100:1</div>
        </div>
      </div>
    </>
  );
}

/* ── Progress Bar ── */
function Prog({ pct, isDecomp }: { pct: number; isDecomp?: boolean }) {
  return (
    <div className="card" style={{ animation: "scaleIn .3s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600 }}>{isDecomp ? "🧊 解压中…" : "⚡ 压缩中…"}</span><span style={{ color: "var(--muted)", fontSize: ".85em" }}>{pct}%</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="progress-meta"><span>13.7 MB / 20.4 MB</span><span>5.2 MB/s · 剩余 ~1.3s</span></div>
    </div>
  );
}

/* ── Toast ── */
function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="toast success"><span>✅</span> {msg}</div>;
}

/* ── Archive Browser ── */
function ArchiveBrowser() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", paddingTop: 40 }}>
      <div style={{ fontSize: "3em", opacity: .4 }}>📁</div>
      <div style={{ color: "var(--muted)", textAlign: "center", lineHeight: 1.8 }}>
        打开一个 <strong>.hcf</strong> 文件即可浏览归档内容<br />
        <span style={{ fontSize: ".85em", color: "var(--dim)" }}>
          支持查看目录结构和文件列表
        </span>
      </div>
      <button className="btn btn-outline" onClick={async () => {
        const api = (window as any).hcompress;
        if (api) {
          const paths = await api.openFile();
          if (paths.length) {
            // Show file info via backend
            const r = await api.hcfInfo(paths[0]);
            alert("HCF 文件信息:\n" + (r?.stdout || "无法读取"));
          }
        }
      }}>📂 打开 HCF 文件</button>
    </div>
  );
}

/* ── Plugin Manager ── */
interface PluginState {
  id: string; name: string; type: string; status: "enabled" | "disabled" | "error";
  errorMsg?: string;
}

function PluginManager() {
  const [plugins, setPlugins] = useState<PluginState[]>([
    { id: "bomb_guard", name: "BombGuard", type: "decompress-hook", status: "enabled" },
    { id: "hello_logger", name: "HelloLogger", type: "decompress-hook", status: "disabled" },
    { id: "broken_demo", name: "BrokenPlugin (示例)", type: "extension", status: "error", errorMsg: "SyntaxError: invalid syntax at line 3" },
  ]);
  const [toast, setToast] = useState("");

  // Listen for plugin changes from file watcher
  useState(() => {
    const api = (window as any).hcompress;
    if (api?.onPluginsChanged) {
      api.onPluginsChanged((info: any) => {
        setToast(`🔄 检测到插件变更: ${info.file} — 请重启以生效`);
        setTimeout(() => setToast(""), 4000);
      });
    }
  });

  const toggle = (id: string) => {
    setPlugins(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (p.status === "enabled") return { ...p, status: "disabled" as const };
      return { ...p, status: "enabled" as const, errorMsg: undefined };
    }));
  };

  const statusIcon = (s: string) => {
    if (s === "enabled") return <span style={{ color: "var(--green)" }}>● 已启用</span>;
    if (s === "error") return <span style={{ color: "var(--red)" }}>● 启用失败</span>;
    return <span style={{ color: "var(--dim)" }}>○ 已关闭</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>已加载 {plugins.length} 个插件</span>
        <button className="btn btn-outline" style={{ fontSize: ".8em" }} onClick={() => {
          if (api) api.openPluginDir();
        }}>
          📂 打开插件目录
        </button>
      </div>
      {plugins.map(p => (
        <div key={p.id} className="card" style={{
          opacity: p.status === "disabled" ? .55 : 1,
          borderColor: p.status === "error" ? "rgba(229,83,91,.25)" : undefined,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: ".78em", color: "var(--dim)" }}>{p.type}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {statusIcon(p.status)}
              <button
                className="btn btn-outline"
                style={{ fontSize: ".75em", padding: "4px 12px" }}
                onClick={() => toggle(p.id)}
              >
                {p.status === "enabled" ? "关闭" : "启用"}
              </button>
            </div>
          </div>
          {p.errorMsg && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(229,83,91,.08)", borderRadius: 8, fontSize: ".8em", color: "var(--red)", fontFamily: "monospace" }}>
              ⚠ {p.errorMsg}
            </div>
          )}
        </div>
      ))}
      <div className="card" style={{ borderStyle: "dashed", textAlign: "center", padding: 24 }}>
        <div style={{ color: "var(--muted)", fontSize: ".9em" }}>
          将插件 <code style={{ color: "var(--accent)" }}>.py</code> 文件放入插件目录即可自动加载<br />
          <span style={{ fontSize: ".8em" }}>
            插件错误会被自动隔离，不影响主程序运行
          </span>
        </div>
      </div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          background: "var(--card)", border: "1px solid var(--accent)",
          borderRadius: 10, padding: "14px 20px", boxShadow: "var(--shadow)",
          fontSize: ".88em", animation: "slideUp .3s ease-out",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Backend bridge ── */
const api = (window as any).hcompress || null;

/* ── App ── */
export default function App() {
  const { mode, setMode } = useTheme();
  const [nav, setNav] = useState("compress");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [toast, setToast] = useState("");
  const [nextId, setNextId] = useState(1);
  const [outputDir, setOutputDir] = useState("");

  const onAddFiles = useCallback(async () => {
    if (!api) { alert("未连接到后端。请通过 Electron 运行此应用。"); return; }
    const paths: string[] = await api.openFile();
    for (const p of paths) {
      const id = nextId; setNextId(n => n + 1); setNextId(prev => { const nid = prev; return nid; });
      setFiles(prev => [...prev, { id, name: p.split(/[\\/]/).pop()!, path: p, size: 0, isDir: false, ext: p.slice(p.lastIndexOf(".")) || "" }]);
    }
  }, []);

  const onAddFolder = useCallback(async () => {
    if (!api) return;
    const paths: string[] = await api.openDirectory();
    for (const p of paths) {
      const id = nextId; setNextId(id + 1);
      setFiles(prev => [...prev, { id, name: p.split(/[\\/]/).pop()! + "/", path: p, size: 0, isDir: true, ext: "folder" }]);
    }
  }, [nextId]);

  const onRemove = useCallback((id: number) => setFiles(p => p.filter(f => f.id !== id)), []);

  const onCompress = useCallback(async () => {
    if (!api || files.length === 0) return;
    setCompressing(true); setToast("");
    const dir = outputDir || files[0].path.replace(/[\\/][^\\/]+$/, "");
    for (const f of files) {
      const out = dir + "\\" + (f.isDir ? f.name.replace(/\/$/, "") : f.name) + ".hcf";
      try {
        const r = await api.compress(f.path, out, 6);
        if (!r.success) { setToast("压缩失败: " + (r.stderr || r.stdout)); break; }
      } catch (e: any) { setToast("压缩出错: " + e.message); break; }
    }
    setCompressing(false); setToast("压缩完成！ → " + dir);
    setFiles([]);
  }, [files, outputDir]);

  const [bombAlert, setBombAlert] = useState<{ file: string; msg: string } | null>(null);

  const onDecompress = useCallback(async () => {
    if (!api || files.length === 0) return;
    setCompressing(true); setToast(""); setBombAlert(null);
    const dir = outputDir || files[0].path.replace(/[\\/][^\\/]+$/, "");
    let gotBomb = false;
    for (const f of files) {
      const out = dir + "\\" + f.name.replace(/\.hcf$/, "");
      try {
        const r = await api.decompress(f.path, out);
        if (!r.success) {
          if (r.bombDetected) {
            setBombAlert({ file: f.name, msg: r.stderr }); gotBomb = true;
          } else {
            setToast("解压失败: " + (r.stderr || r.stdout));
          }
          break;
        }
      } catch (e: any) { setToast("解压出错: " + e.message); break; }
    }
    setCompressing(false);
    if (!gotBomb) { setToast("解压完成！ → " + dir); setFiles([]); }
  }, [files, outputDir]);

  const isDecomp = nav === "decompress";
  const actionLabel = isDecomp ? "⚡ 开始解压" : "⚡ 开始压缩";
  const actionFn = isDecomp ? onDecompress : onCompress;

  const showToolbar = nav === "compress" || nav === "decompress";

  return (
    <>
      <Sidebar active={nav} onNav={setNav} />
      <main className="main">
        {showToolbar && (
          <div className="toolbar">
            <div className="path" style={{ cursor: "pointer" }} onClick={async () => {
              if (api) { const dirs = await api.openDirectory(); if (dirs.length) setOutputDir(dirs[0]); }
            }} title="点击选择输出目录">
              {outputDir ? `📂 输出到: ${outputDir}` : "📂 点击选择输出目录（默认同源文件目录）"}
            </div>
            <button className="btn btn-outline" onClick={onAddFiles}>📄 添加文件</button>
            <button className="btn btn-outline" onClick={onAddFolder}>📁 添加文件夹</button>
            <button className="btn btn-primary" onClick={actionFn} disabled={files.length === 0}>
              {actionLabel}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowSettings(true)} title="设置">⚙️</button>
          </div>
        )}
        <div className="content">
          {nav === "compress" || nav === "decompress" ? (
            <>
              <DropZone onAdd={onAddFiles} />
              <FileTable files={files} onRemove={onRemove} />
              {compressing && <Prog pct={50} isDecomp={isDecomp} />}
            </>
          ) : nav === "browser" ? (
            <ArchiveBrowser />
          ) : nav === "plugins" ? (
            <PluginManager />
          ) : null}
        </div>
      </main>
      {showSettings && <SettingsModal mode={mode} setMode={setMode} onClose={() => setShowSettings(false)} />}
      {bombAlert && (
        <div className="modal-overlay" onClick={() => setBombAlert(null)}>
          <div className="modal" style={{ maxWidth: 500, borderColor: "rgba(229,83,91,.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: "2em" }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1em", color: "var(--red)" }}>插件拦截 — 操作被阻止</div>
                <div style={{ fontSize: ".85em", color: "var(--muted)" }}>
                  文件: {bombAlert.file} &nbsp;·&nbsp;
                  在「🔌 插件」面板中可管理拦截规则
                </div>
              </div>
            </div>
            <div style={{ fontSize: ".82em", color: "var(--muted)", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", background: "var(--bg)", padding: 10, borderRadius: 8 }}>
              {bombAlert.msg}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setBombAlert(null)}>知道了</button>
              <button className="btn btn-outline" onClick={() => { setBombAlert(null); setNav("plugins"); }}>🔌 管理插件</button>
            </div>
          </div>
        </div>
      )}
      <Toast msg={toast} />
    </>
  );
}
