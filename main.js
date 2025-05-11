const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

function createWindow() {
  const win = new BrowserWindow({
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

  win.webContents.setZoomFactor(0.8);

  win.loadFile('index.html');

  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(0.8);
    win.webContents.insertCSS(`
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
    `);
    
    win.webContents.executeJavaScript(`
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
    `);
  });

  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    
    try {
      const urlPath = new URL(url).pathname;
      
      if (urlPath === '/') {
        win.loadFile('index.html').then(() => {
          win.webContents.setZoomFactor(0.8);
        });
        return;
      }
      
      let fileName = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      
      if (!fileName.includes('.')) {
        fileName += '.html';
      }

      const filePath = path.join(__dirname, fileName);
      if (require('fs').existsSync(filePath)) {
        win.loadFile(fileName).then(() => {
          win.webContents.setZoomFactor(0.8);
        });
      } else {
        win.loadFile('404.html').then(() => {
          win.webContents.setZoomFactor(0.8);
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      win.loadFile('404.html').then(() => {
        win.webContents.setZoomFactor(0.8);
      });
    }
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(0.8);
  });

  if (!isDev) {
    win.webContents.on('before-input-event', (event, input) => {
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