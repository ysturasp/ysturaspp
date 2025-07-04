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
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
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
      @font-face {
        font-family: 'Segoe MDL2 Assets';
        src: local('Segoe MDL2 Assets');
      }

      /* Hide scrollbar for Chrome, Safari and Opera */
      ::-webkit-scrollbar {
        display: none;
      }

      /* Hide scrollbar for IE, Edge and Firefox */
      * {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
      }

      /* Window resize regions */
      .resize-region {
        position: fixed;
        z-index: 9999;
        -webkit-app-region: no-drag;
      }
      .resize-bottom {
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        cursor: ns-resize;
      }
      .resize-left {
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        cursor: ew-resize;
      }
      .resize-right {
        right: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        cursor: ew-resize;
      }
      .resize-corner {
        width: 10px;
        height: 10px;
      }
      .resize-corner-nw {
        top: 0;
        left: 0;
        cursor: nw-resize;
      }
      .resize-corner-ne {
        top: 0;
        right: 0;
        cursor: ne-resize;
      }
      .resize-corner-sw {
        bottom: 0;
        left: 0;
        cursor: sw-resize;
      }
      .resize-corner-se {
        bottom: 0;
        right: 0;
        cursor: se-resize;
      }

      .titlebar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: rgba(17, 24, 39, 0);
        -webkit-app-region: drag;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateY(0);
        opacity: 1;
        padding: 0 10px;
      }
      .titlebar-title {
        color: #6B7280;
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
        user-select: none;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .window-controls {
        display: ${process.platform === 'win32' ? 'flex' : 'none'};
        gap: 1px;
        position: fixed;
        top: 0;
        right: 0;
        z-index: 10000;
      }
      .window-control-button {
        -webkit-app-region: no-drag;
        height: 40px;
        width: 46px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: transparent;
        border: none;
        color: #6B7280;
        cursor: pointer;
        transition: background-color 0.2s;
        font-family: 'Segoe MDL2 Assets';
        font-size: 10px;
      }
      .window-control-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .window-control-button.close:hover {
        background-color: #dc2626;
        color: white;
      }
      main, header {
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

        if (process.platform === 'win32') {
          const controls = document.createElement('div');
          controls.className = 'window-controls';
          
          const minimize = document.createElement('button');
          minimize.className = 'window-control-button minimize';
          minimize.innerHTML = '&#xE921;';
          minimize.addEventListener('click', () => {
            require('electron').ipcRenderer.send('minimize-window');
          });
          
          const maximize = document.createElement('button');
          maximize.className = 'window-control-button maximize';
          maximize.innerHTML = '&#xE922;';
          maximize.addEventListener('click', () => {
            require('electron').ipcRenderer.send('maximize-window');
          });
          
          const close = document.createElement('button');
          close.className = 'window-control-button close';
          close.innerHTML = '&#xE8BB;';
          close.addEventListener('click', () => {
            require('electron').ipcRenderer.send('close-window');
          });
          
          controls.appendChild(minimize);
          controls.appendChild(maximize);
          controls.appendChild(close);
          document.body.appendChild(controls);

          // Add resize regions
          const resizeBottom = document.createElement('div');
          resizeBottom.className = 'resize-region resize-bottom';
          document.body.appendChild(resizeBottom);

          const resizeLeft = document.createElement('div');
          resizeLeft.className = 'resize-region resize-left';
          document.body.appendChild(resizeLeft);

          const resizeRight = document.createElement('div');
          resizeRight.className = 'resize-region resize-right';
          document.body.appendChild(resizeRight);

          // Add corner resize regions
          const resizeCornerNW = document.createElement('div');
          resizeCornerNW.className = 'resize-region resize-corner resize-corner-nw';
          document.body.appendChild(resizeCornerNW);

          const resizeCornerNE = document.createElement('div');
          resizeCornerNE.className = 'resize-region resize-corner resize-corner-ne';
          document.body.appendChild(resizeCornerNE);

          const resizeCornerSW = document.createElement('div');
          resizeCornerSW.className = 'resize-region resize-corner resize-corner-sw';
          document.body.appendChild(resizeCornerSW);

          const resizeCornerSE = document.createElement('div');
          resizeCornerSE.className = 'resize-region resize-corner resize-corner-se';
          document.body.appendChild(resizeCornerSE);

          // Add event listeners for resize regions
          const resizeRegions = document.querySelectorAll('.resize-region');
          resizeRegions.forEach(region => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight;

            region.addEventListener('mousedown', (e) => {
              isResizing = true;
              startX = e.clientX;
              startY = e.clientY;
              startWidth = window.outerWidth;
              startHeight = window.outerHeight;
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', () => {
                isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
              }, { once: true });
            });

            function handleMouseMove(e) {
              if (!isResizing) return;
              
              const deltaX = e.clientX - startX;
              const deltaY = e.clientY - startY;
              
              if (region.classList.contains('resize-right') || 
                  region.classList.contains('resize-corner-ne') || 
                  region.classList.contains('resize-corner-se')) {
                require('electron').ipcRenderer.send('resize-window', { width: startWidth + deltaX });
              }
              
              if (region.classList.contains('resize-bottom') || 
                  region.classList.contains('resize-corner-sw') || 
                  region.classList.contains('resize-corner-se')) {
                require('electron').ipcRenderer.send('resize-window', { height: startHeight + deltaY });
              }
              
              if (region.classList.contains('resize-left') || 
                  region.classList.contains('resize-corner-nw') || 
                  region.classList.contains('resize-corner-sw')) {
                require('electron').ipcRenderer.send('resize-window', { width: startWidth - deltaX, x: e.screenX });
              }
            }
          });
        }

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
      // Handle file:// URLs properly
      let urlPath;
      if (url.startsWith('file://')) {
        urlPath = new URL(url).pathname;
        // Remove the leading slash and drive letter on Windows
        if (process.platform === 'win32') {
          urlPath = urlPath.slice(1); // Remove leading slash
          if (/^[A-Za-z]:/.test(urlPath)) {
            urlPath = urlPath.slice(2); // Remove drive letter
          }
        }
      } else {
        // Handle relative URLs
        urlPath = url.startsWith('/') ? url : '/' + url;
      }

      console.log('URL Path:', urlPath);
      
      // Handle root path
      if (urlPath === '/' || urlPath === '/index.html') {
        mainWindow.loadFile('index.html').then(() => {
          mainWindow.webContents.setZoomFactor(0.8);
        });
        return;
      }
      
      // Remove leading slash and convert to filename
      let fileName = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      
      // Add .html extension if needed
      if (!fileName.includes('.')) {
        fileName += '.html';
      }

      // Normalize slashes for cross-platform compatibility
      fileName = fileName.replace(/\\/g, '/');
      
      console.log('Looking for file:', fileName);
      
      // Use path.join with __dirname to get correct absolute path
      const filePath = path.join(__dirname, fileName);
      
      console.log('Full file path:', filePath);
      
      // Check if file exists
      if (require('fs').existsSync(filePath)) {
        console.log('File found, loading:', fileName);
        mainWindow.loadFile(fileName).then(() => {
          mainWindow.webContents.setZoomFactor(0.8);
        });
      } else {
        console.error('File not found:', filePath);
        mainWindow.loadFile('404.html').then(() => {
          mainWindow.webContents.setZoomFactor(0.8);
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      console.error('Error details:', error.message);
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

// Add IPC handlers for window controls
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Add IPC handler for window resizing
ipcMain.on('resize-window', (event, { width, height, x }) => {
  if (mainWindow) {
    const [currentWidth, currentHeight] = mainWindow.getSize();
    const [currentX, currentY] = mainWindow.getPosition();
    
    const newBounds = {
      width: width || currentWidth,
      height: height || currentHeight,
      x: x !== undefined ? x : currentX,
      y: currentY
    };
    
    mainWindow.setBounds(newBounds);
  }
}); 