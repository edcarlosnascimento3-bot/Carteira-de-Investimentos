const { contextBridge, ipcRenderer } = require('electron');

// Ponte seguro entre o processo main e o renderer (React)
contextBridge.exposeInMainWorld('electronAPI', {
  // Funcoes para comunicacao futura com APIs externas
  fetchData: (url) => ipcRenderer.invoke('fetch-data', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, data) => callback(data)),
});
