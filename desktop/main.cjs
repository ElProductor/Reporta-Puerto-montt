const { app, BrowserWindow, utilityProcess, session } = require('electron');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.PORT || 3001);
const BASE_URL = `http://127.0.0.1:${PORT}`;
let backend;
let ownsBackend = false;

function backendPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'reporta-backend', 'server.js')
    : path.join(__dirname, '..', 'server.js');
}

function startBackend() {
  const serverPath = backendPath();
  const dataDir = app.isPackaged ? app.getPath('userData') : path.join(__dirname, '..', 'data');
  backend = utilityProcess.fork(serverPath, [], {
    cwd: path.dirname(serverPath),
    env: { ...process.env, PORT: String(PORT), REPORTA_DATA_DIR: dataDir },
    stdio: 'pipe',
    serviceName: 'Reporta Puerto Montt API'
  });
  ownsBackend = true;
  backend.on('exit', code => {
    if (!app.isQuitting && code !== 0) app.quit();
  });
}

function backendAvailable() {
  return new Promise(resolve => {
    const req = http.get(`${BASE_URL}/api/health`, res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(700, () => { req.destroy(); resolve(false); });
  });
}

function waitForBackend(timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const req = http.get(`${BASE_URL}/api/health`, res => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(1000, () => req.destroy());
      function retry() {
        if (Date.now() - started > timeoutMs) return reject(new Error('La API local no inició dentro del tiempo esperado.'));
        setTimeout(poll, 350);
      }
    };
    poll();
  });
}

async function createWindow() {
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(permission === 'geolocation');
  });
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 680,
    title: 'Reporta Puerto Montt · Gestión Municipal',
    backgroundColor: '#f7f9f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${BASE_URL}/`)) event.preventDefault();
  });
  await win.loadURL(`${BASE_URL}/admin`);
}

app.whenReady().then(async () => {
  if (!(await backendAvailable())) startBackend();
  await waitForBackend();
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(err => {
  console.error(err);
  app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (ownsBackend) backend?.kill();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
