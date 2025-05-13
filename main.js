const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

autoUpdater.autoDownload = false;
autoUpdater.allowDowngrade = false;
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'debug';

if (!isDev) {
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);
  
  autoUpdater.checkForUpdates();
}

autoUpdater.on('update-available', () => {
  console.log('Доступно обновление. Начинаю загрузку...');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Обновление загружено. Будет установлено при следующем запуске.');
});

autoUpdater.on('error', (err) => {
  console.error('Ошибка при обновлении:', err);
});

function sendStatusToWindow(win, text, type = 'info') {
  if (win && win.webContents) {
    win.webContents.send('update-message', { message: text, type });
  }
}

function checkForUpdates(win) {
  if (isDev) {
    sendStatusToWindow(win, 'Проверка обновлений недоступна в режиме разработки', 'info');
    return;
  }

  autoUpdater.checkForUpdates().catch((err) => {
    sendStatusToWindow(win, `Ошибка при проверке обновлений: ${err.message}`, 'error');
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 350,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: isDev
    }
  });

  mainWindow.webContents.setZoomFactor(0.8);

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(0.8);
    mainWindow.webContents.insertCSS(`
      .titlebar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        background:rgba(17, 24, 39, 0);
        -webkit-app-region: drag;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateY(0);
        opacity: 1;
      }
      .titlebar-title {
        color: #6B7280;
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
        user-select: none;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      main, header{
        padding-top: 25px !important;
      }
      /* Делаем кнопки и интерактивные элементы не-перетаскиваемыми */
      .titlebar button, .titlebar a, .titlebar input, 
      button, a, input, select {
        -webkit-app-region: no-drag;
      }
      .update-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1F2937;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
      .update-notification.show {
        opacity: 1;
      }
      .update-notification button {
        background: #3B82F6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
      }
      .update-notification button:hover {
        background: #2563EB;
      }
      .update-notification.error {
        background: #DC2626;
      }
      .update-notification.info {
        background: #1F2937;
      }
    `);
    
    mainWindow.webContents.executeJavaScript(`
      if (!document.querySelector('.titlebar')) {
        const titlebar = document.createElement('div');
        titlebar.className = 'titlebar';
        const titleElement = document.createElement('div');
        titleElement.className = 'titlebar-title';
        titleElement.textContent = document.title || 'Yatura';
        titlebar.appendChild(titleElement);
        document.body.insertBefore(titlebar, document.body.firstChild);

        function updateTitle() {
          const titleElement = document.querySelector('.titlebar-title');
          if (titleElement) {
            titleElement.textContent = document.title || 'Yatura';
          }
        }

        updateTitle();

        const observer = new MutationObserver((mutations) => {
          mutations.forEach(() => {
            updateTitle();
          });
        });

        observer.observe(document.head, {
          childList: true,
          subtree: true,
          characterData: true
        });

        setTimeout(updateTitle, 100);

        let ticking = false;
        
        window.addEventListener('scroll', () => {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const titlebar = document.querySelector('.titlebar');
              
              const progress = Math.min(Math.max(scrollTop / 50, 0), 1);
              
              titlebar.style.transform = \`translateY(\${-40 * progress}px)\`;
              titlebar.style.opacity = 1 - progress;
              
              ticking = false;
            });
            ticking = true;
          }
        }, { passive: true });
      }
      
      const ipc = require('electron').ipcRenderer;
      
      function showUpdateNotification(message, type = 'info') {
        let notification = document.querySelector('.update-notification');
        if (!notification) {
          notification = document.createElement('div');
          notification.className = 'update-notification';
          document.body.appendChild(notification);
        }
        
        notification.className = 'update-notification ' + type;
        notification.innerHTML = message;
        
        setTimeout(() => {
          notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
          notification.classList.remove('show');
        }, 5000);
      }
      
      ipc.on('update-message', (event, data) => {
        showUpdateNotification(data.message, data.type);
      });
      
      const menu = document.querySelector('nav') || document.createElement('div');
      const checkUpdateBtn = document.createElement('button');
      checkUpdateBtn.textContent = 'Проверить обновления';
      checkUpdateBtn.style.marginLeft = '10px';
      checkUpdateBtn.onclick = () => {
        ipc.send('check-updates');
        showUpdateNotification('Проверяем наличие обновлений...', 'info');
      };
      menu.appendChild(checkUpdateBtn);
    `);

    checkForUpdates(mainWindow);
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    
    try {
      const urlPath = new URL(url).pathname;
      
      if (urlPath === '/') {
        mainWindow.loadFile('index.html').then(() => {
          mainWindow.webContents.setZoomFactor(0.8);
        });
        return;
      }
      
      let fileName = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      
      if (!fileName.includes('.')) {
        fileName += '.html';
      }

      const filePath = path.join(__dirname, fileName);
      if (require('fs').existsSync(filePath)) {
        mainWindow.loadFile(fileName).then(() => {
          mainWindow.webContents.setZoomFactor(0.8);
        });
      } else {
        mainWindow.loadFile('404.html').then(() => {
          mainWindow.webContents.setZoomFactor(0.8);
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      mainWindow.loadFile('404.html').then(() => {
        mainWindow.webContents.setZoomFactor(0.8);
      });
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(0.8);
  });

  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if ((input.control || input.meta) && input.key.toLowerCase() === 'i') {
        event.preventDefault();
      }
    });
  }
}

app.whenReady().then(() => {
  createWindow();
});

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

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow(mainWindow, 'Проверка обновлений...', 'info');
});

autoUpdater.on('update-available', (info) => {
  sendStatusToWindow(
    mainWindow,
    `Доступна новая версия ${info.version}! <button onclick="require('electron').ipcRenderer.send('start-update')">Обновить</button>`,
    'info'
  );
});

autoUpdater.on('update-not-available', () => {
  sendStatusToWindow(mainWindow, 'У вас установлена последняя версия', 'info');
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow(mainWindow, `Ошибка при обновлении: ${err.message}`, 'error');
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Скорость: ${progressObj.bytesPerSecond} байт/сек. Загружено ${progressObj.percent}%`;
  sendStatusToWindow(mainWindow, message, 'info');
});

autoUpdater.on('update-downloaded', () => {
  sendStatusToWindow(
    mainWindow,
    'Обновление загружено и будет установлено при следующем запуске. <button onclick="require(\'electron\').ipcRenderer.send(\'restart-app\')">Перезапустить сейчас</button>',
    'info'
  );
});

ipcMain.on('check-updates', () => {
  checkForUpdates(mainWindow);
});

ipcMain.on('start-update', () => {
  autoUpdater.downloadUpdate().catch((err) => {
    sendStatusToWindow(mainWindow, `Ошибка при загрузке обновления: ${err.message}`, 'error');
  });
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
}); 