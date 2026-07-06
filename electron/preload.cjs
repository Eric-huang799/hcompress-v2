const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hcompress", {
  compress: (input, output, level) =>
    ipcRenderer.invoke("hcompress:compress", { input, output, level }),
  decompress: (input, output) =>
    ipcRenderer.invoke("hcompress:decompress", { input, output }),
  hcfInfo: (filePath) =>
    ipcRenderer.invoke("hcompress:hcfInfo", filePath),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
});
