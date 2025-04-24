document.addEventListener('DOMContentLoaded', () => {
  const keyboardShortcutsModal = document.createElement('div');
  keyboardShortcutsModal.id = 'keyboard-shortcuts-modal';
  keyboardShortcutsModal.className = 'fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 hidden';
  keyboardShortcutsModal.innerHTML = `
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <div class="bg-white bg-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl transform transition-all border-2 border-yellow-400">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Горячие клавиши</h2>
          <button class="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white transition-colors" onclick="toggleKeyboardShortcuts()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Навигация</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-300">Следующая неделя</span>
                <div class="flex gap-1">
                  <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">Alt</kbd>
                  <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">→</kbd>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-300">Предыдущая неделя</span>
                <div class="flex gap-1">
                  <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">Alt</kbd>
                  <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">←</kbd>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-300">Текущая неделя</span>
                <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">T</kbd>
              </div>
            </div>
          </div>
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Интерфейс</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-300">Помощь</span>
                <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">?</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-300">Сменить тему</span>
                <div class="flex gap-1">
                  <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                  <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">D</kbd>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 dark:text-slate-300">Закрыть окно</span>
                <kbd class="px-3 py-1.5 text-sm font-medium bg-black bg-yellow-400 text-black dark:text-slate-100 rounded-lg shadow-sm">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(keyboardShortcutsModal);

  document.addEventListener('keydown', (e) => {
    const modalVisible = !document.getElementById('keyboard-shortcuts-modal').classList.contains('hidden');
    
    if (modalVisible && e.key !== 'Escape') {
      e.preventDefault();
      return;
    }

    if (e.key === '?' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggleKeyboardShortcuts();
      return;
    }
    
    if (e.key === 'Escape' && modalVisible) {
      e.preventDefault();
      toggleKeyboardShortcuts();
      return;
    }

    if (e.key === 'ArrowRight' && e.altKey) {
      e.preventDefault();
      const nextWeekButton = document.querySelector('[onclick*="nextWeek"]');
      if (nextWeekButton) nextWeekButton.click();
    }
    
    if (e.key === 'ArrowLeft' && e.altKey) {
      e.preventDefault();
      const prevWeekButton = document.querySelector('[onclick*="previousWeek"]');
      if (prevWeekButton) prevWeekButton.click();
    }

    if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      let settings = JSON.parse(localStorage.getItem('siteSettings')) || {
        darkMode: true,
        showAllTasks: true,
        showFeatures: true,
        showHeatmap: true,
        showOnlineCounter: true,
        showSubgroups: true,
        showSubjectStats: true,
        vibrationEnabled: false
      };
      
      settings.darkMode = !settings.darkMode;
      
      localStorage.setItem('siteSettings', JSON.stringify(settings));

      const existingLightStyles = document.getElementById('lightThemeStyles');
      if (existingLightStyles) {
        existingLightStyles.remove();
      }

      if (!settings.darkMode) {
        const lightStyles = document.createElement('style');
        lightStyles.id = 'lightThemeStyles';
        lightStyles.textContent = `
          body {
              background-color: #f8fafc !important;
          }

          .dark .bg-slate-800, 
          .bg-slate-800,
          .bg-slate-700,
          .bg-gray-900,
          .bg-gray-700,
          .bg-gray-600 {
              background-color: #f0f1f3 !important;
          }

          .bg-gray-800 {
              background-color: #e2e8f5 !important;
          }

          .text-yellow-400 {
              color: #00a571 !important;
          }

          .bg-slate-900 {
              background-color: #f8fafc !important;
          }

          .dark .text-white,
          .text-white {
              color: #1a1a1a !important;
          }

          .dark .text-slate-400,
          .text-slate-400,
          .text-slate-300,
          .text-gray-400,
          .text-gray-300 {
              color: #555e6b !important;
          }

          span, p, h1, h2, h3, h4, h5, h6, label {
              color: #1a1a1a !important;
          }

          div.rounded-lg.px-3.py-2.md\\:px-6.md\\:py-4.ring-1 {
              background-color: #ffffff !important;
              border: 1px solid #e5e7eb !important;
          }

          .text-gray-200 {
              color: #374151 !important;
          }

          .online-users-counter {
              background: rgba(255, 255, 255, 0.9) !important;
              color: #1a1a1a !important;
              border: 1px solid #6086ee !important;
          }
          
          .online-users-counter:hover::after {
              background: rgba(255, 255, 255, 0.95) !important;
              color: #1a1a1a !important;
              border: 1px solid #e5e7eb !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          }
          
          .online-users-counter:hover::before {
              border-bottom: 5px solid #e5e7eb !important;
          }
          
          .online-indicator {
              background: #22c55e !important;
          }

          #mobile-menu,
          nav.hidden.lg\\:flex {
              background-color: #ffffff !important;
          }

          #mobile-menu a:not([href="/"]),
          nav.hidden.lg\\:flex a:not([href="/"]) {
              color: #1a1a1a !important;
          }

          .border-slate-600,
          .border-slate-700,
          .border-gray-700 {
              border-color: #e5e7eb !important;
          }

          .hover\\:bg-slate-700:hover,
          .hover\\:bg-gray-700:hover {
              background-color: #f3f4f6 !important;
          }

          .bg-blue-900,
          .bg-blue-800,
          .bg-blue-700 {
              background-color: #3b82f6 !important;
              color: #ffffff !important;
          }

          .modal-content,
          .popup-menu,
          .dropdown-menu {
              background-color: #ffffff !important;
              border: 1px solid #e5e7eb !important;
          }

          .activity-cell {
              border: 1px solid #e5e7eb !important;
          }

          .fixed.bottom-0 {
              background-color: #ffffff !important;
              border-top: 1px solid #e5e7eb !important;
          }

          .notification,
          .toast {
              background-color: #ffffff !important;
              border: 1px solid #e5e7eb !important;
              color: #1a1a1a !important;
          }

          input, select, textarea {
              background-color: #f8fafc !important;
              border: 1px solid #e5e7eb !important;
              color: #1a1a1a !important;
          }

          .flex.justify-center.gap-4.mb-2 button {
              background-color: #e5e7eb !important;
              color: #1a1a1a !important;
          }
          
          .flex.justify-center.gap-4.mb-2 button.bg-blue-600 {
              background-color: #3b82f6 !important;
              color: #ffffff !important;
          }
          
          .flex.justify-center.gap-4.mb-2 button.border-blue-300 {
              border: 2px solid #3b82f6 !important;
              border-color: #8bb2f3 !important;
          }

          .military-card {
              background: radial-gradient(at 10% 10%, rgb(146 185 123 / 90%) 10%, transparent 50%), radial-gradient(at 30% 40%, rgb(97 114 86 / 90%) 20%, transparent 55%), radial-gradient(at 70% 60%, rgb(152 170 140 / 90%) 15%, transparent 45%), radial-gradient(at 85% 85%, rgb(36 60 21 / 90%) 15%, transparent 40%), radial-gradient(at 50% 50%, rgb(105 151 78 / 90%) 25%, transparent 60%), radial-gradient(at 15% 60%, rgb(87 130 60 / 90%) 15%, #e64d4d00 45%), radial-gradient(at 60% 25%, rgb(86 133 58 / 90%) 20%, transparent 50%), #485c3e !important;
              border: 2px solid #c8d6c8 !important;
              box-shadow: none !important;
              background-blend-mode: normal !important;
          }

          .military-card::before {
              opacity: 0.7 !important;
          }

          .military-card .text-white {
              color: #2d3748 !important;
          }

          .military-card .text-slate-400 {
              color: #4a5568 !important;
          }

          .military-card .text-blue-400 {
              color: #4299e1 !important;
          }

          .military-card .text-blue-400:hover {
              color: #2b6cb0 !important;
          }
          #lessonDetailsModal .flex-wrap {
              background: #ffffff !important;
          }

          #lessonDetailsModal .border-b-2 {
              background: #f0f1f3 !important;
          }

          @media (max-width: 768px) {
              #lessonDetailsModal .border-b {
                  background: #ffffff !important;
              }
          }
          
          .border-blue-700 {
              border: 2px solid rgb(60 130 246) !important;
          }
          
          #favorite-button {
              border: 2px solid rgb(250 204 21) !important;
          }
          
          .fixed.bottom-0 a {
              background: none !important;
          }

          .fixed.bottom-0 a[href="/rasp"] {
              background: radial-gradient(circle, rgb(0 96 255 / 30%) 5%, rgba(248, 250, 252, 0) 70%) !important;
          }

          .fixed.bottom-0 a:hover {
              background: radial-gradient(circle, rgb(0 96 255 / 40%) 5%, rgba(248, 250, 252, 0) 70%) !important;
          }

          .bg-blue-500 {
              background-color: rgb(90 147 242) !important;
          }

          .bg-red-500 {
              background-color: rgb(242 90 90) !important;
          }
              
          .bg-yellow-500 {
              background-color: rgb(255 213 31 / 87%) !important;
          }

          .bg-gray-700 {
              background-color: #f3f4f6 !important;
          }

          .bg-green-900 {
              background-color: #dcfce7 !important;
          }

          .bg-green-700 {
              background-color: #079669 !important;
          }

          .bg-green-700:hover {
              background-color: #03ae78 !important;
          }

          .bg-green-500 {
              background-color: #86efac !important;
          }

          .bg-green-300 {
              background-color: #4ade80 !important;
          }

          .bg-gray-700:hover {
              background-color: #e5e7eb !important;
          }

          .bg-green-900:hover {
              background-color: #d1fae5 !important;
          }

          .bg-green-700:hover {
              background-color: #a7f3d0 !important;
          }

          .bg-green-500:hover {
              background-color: #6ee7b7 !important;
          }

          .bg-green-300:hover {
              background-color: #34d399 !important;
          }

          .text-yellow-500 {
              color: rgb(236 148 0) !important;
          }
        `;
        document.head.appendChild(lightStyles);

        const notification = document.createElement('div');
        notification.className = 'fixed bottom-5 right-5 left-5 sm:right-10 sm:left-auto bg-yellow-500 text-white py-2 px-4 rounded-lg z-50 notification';
        notification.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚠️</span>
              <span>Светлая тема находится в разработке и может отображаться некорректно</span>
            </div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.classList.add('show');
        }, 10);

        setTimeout(() => {
          notification.classList.remove('show');
          notification.classList.add('hide');
          setTimeout(() => {
            notification.remove();
          }, 500);
        }, 5000);
      }

      document.documentElement.classList.toggle('dark', settings.darkMode);
      
      if (typeof applySettings === 'function') {
        applySettings();
      }
    }
  });

  document.getElementById('keyboard-shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'keyboard-shortcuts-modal') {
      toggleKeyboardShortcuts();
    }
  });
});

function toggleKeyboardShortcuts() {
  const modal = document.getElementById('keyboard-shortcuts-modal');
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}