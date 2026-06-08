const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const DATA_DIR = path.join(app.getPath('userData'), 'db');
const PROJ_DIR = __dirname;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function getProjectFilePath(name) {
  return path.join(PROJ_DIR, `db_${name}.json`);
}

function writeToBoth(name, data) {
  const str = JSON.stringify(data, null, 2);
  // Electron userData
  ensureDataDir();
  fs.writeFileSync(getFilePath(name), str, 'utf-8');
  // Project root (compatibilidade com Vite/browser)
  try {
    fs.writeFileSync(getProjectFilePath(name), str, 'utf-8');
  } catch (e) {
    console.error('Erro ao escrever no diretório do projeto:', e.message);
  }
}

ipcMain.handle('db:read', (_event, name) => {
  // Tenta ler do projeto primeiro (dados mais recentes)
  const projPath = getProjectFilePath(name);
  try {
    if (fs.existsSync(projPath)) {
      return JSON.parse(fs.readFileSync(projPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro ao ler do projeto', name, e.message);
  }
  // Fallback para userData
  ensureDataDir();
  const fp = getFilePath(name);
  try {
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro ao ler do userData', name, e.message);
  }
  return null;
});

ipcMain.handle('db:write', (_event, name, data) => {
  try {
    writeToBoth(name, data);
    return true;
  } catch (e) {
    console.error('Erro ao escrever', name, e.message);
    return false;
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Carrega o servidor de desenvolvimento do Vite ou build de producao
  const isDev = process.argv.includes('--dev');
  if (isDev || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
