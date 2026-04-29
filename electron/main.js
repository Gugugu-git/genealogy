const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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

const DATA_FILE_PATH = path.join(app.getPath('userData'), '泸县大堰胡氏宗谱数据.json');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

ipcMain.handle('read-data', async () => {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    } else {
      const defaultDataPath = path.join(__dirname, '../泸县大堰胡氏宗谱数据.json');
      if (fs.existsSync(defaultDataPath)) {
        const data = fs.readFileSync(defaultDataPath, 'utf-8');
        fs.writeFileSync(DATA_FILE_PATH, data, 'utf-8');
        return JSON.parse(data);
      }
      return null;
    }
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
});

ipcMain.handle('save-data', async (event, data) => {
  try {
    ensureBackupDir();
    const date = new Date();
    const backupFileName = `备份_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    if (fs.existsSync(DATA_FILE_PATH)) {
      fs.copyFileSync(DATA_FILE_PATH, backupPath);
    }
    
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('备份_') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length > 10) {
      for (let i = 10; i < backups.length; i++) {
        fs.unlinkSync(path.join(BACKUP_DIR, backups[i]));
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
});

ipcMain.handle('get-backups', async () => {
  try {
    ensureBackupDir();
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('备份_') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          date: stats.mtime,
          path: filePath
        };
      })
      .sort((a, b) => b.date - a.date);
    return backups;
  } catch (error) {
    console.error('Error getting backups:', error);
    throw error;
  }
});

ipcMain.handle('restore-backup', async (event, backupPath) => {
  try {
    const data = fs.readFileSync(backupPath, 'utf-8');
    fs.writeFileSync(DATA_FILE_PATH, data, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', ['json'] },
      { name: 'Text Files', ['txt'] },
      { name: 'All Files', ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});
