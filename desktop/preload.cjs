const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('reportaDesktop', Object.freeze({
  platform: process.platform,
  appName: 'Reporta Puerto Montt · Gestión Municipal'
}));
