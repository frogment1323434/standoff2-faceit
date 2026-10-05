// ============================================================
// PWA — установка приложения + обновления
// ============================================================

let deferredPrompt = null;
let swRegistration = null;

// ============================================================
// РЕГИСТРАЦИЯ SERVICE WORKER
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker зарегистрирован');

      // Проверяем обновления
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        console.log('🔄 Доступно обновление приложения');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    } catch (e) {
      console.warn('⚠️ Service Worker не зарегистрирован:', e.message);
    }
  });
}

// ============================================================
// INSTALL PROMPT — кнопка «Установить приложение»
// ============================================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log('📱 Приложение можно установить');
  showInstallBanner();
});

// ============================================================
// БАННЕР УСТАНОВКИ
// ============================================================
function showInstallBanner() {
  // Не показываем, если уже закрывали
  if (localStorage.getItem('so2_install_dismissed') === '1') return;

  // Не показываем, если уже установлено
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  let banner = document.getElementById('installBanner');
  if (banner) return;

  banner = document.createElement('div');
  banner.id = 'installBanner';
  banner.className = 'install-banner';
  banner.innerHTML =
    '<div class="install-banner-icon">📱</div>' +
    '<div class="install-banner-content">' +
      '<div class="install-banner-title">Установи Standoff 2 Faceit</div>' +
      '<div class="install-banner-sub">Играй как в настоящем приложении</div>' +
    '</div>' +
    '<button class="install-banner-btn" onclick="installPWA()">УСТАНОВИТЬ</button>' +
    '<button class="install-banner-close" onclick="dismissInstallBanner()">✕</button>';

  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('show'), 100);
}

// ============================================================
// УСТАНОВКА
// ============================================================
async function installPWA() {
  if (!deferredPrompt) {
    notify('Установка недоступна', 'warning');
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    console.log('✅ Пользователь установил приложение');
    notify('Приложение установлено!', 'success');
  } else {
    console.log('❌ Пользователь отменил установку');
  }

  deferredPrompt = null;

  const banner = document.getElementById('installBanner');
  if (banner) banner.remove();
}

// ============================================================
// ЗАКРЫТЬ БАННЕР
// ============================================================
function dismissInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
  }

  // Запоминаем, что закрыли (больше не показывать 7 дней)
  localStorage.setItem('so2_install_dismissed', '1');
}

// ============================================================
// БАННЕР ОБНОВЛЕНИЯ
// ============================================================
function showUpdateBanner() {
  let banner = document.getElementById('updateBanner');
  if (banner) return;

  banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.className = 'update-banner';
  banner.innerHTML =
    '<div class="update-banner-icon">🔄</div>' +
    '<div class="update-banner-content">' +
      '<div class="update-banner-title">Доступно обновление</div>' +
      '<div class="update-banner-sub">Нажми чтобы обновить</div>' +
    '</div>' +
    '<button class="update-banner-btn" onclick="applyUpdate()">ОБНОВИТЬ</button>';

  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('show'), 100);
}

function applyUpdate() {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage('SKIP_WAITING');
    setTimeout(() => window.location.reload(), 500);
  }
}

// ============================================================
// APP INSTALLED — после установки
// ============================================================
window.addEventListener('appinstalled', () => {
  console.log('✅ Приложение установлено');
  notify('Спасибо за установку! 🎮', 'success');
  localStorage.setItem('so2_install_dismissed', '1');

  const banner = document.getElementById('installBanner');
  if (banner) banner.remove();
});

// ============================================================
// ПРОВЕРКА: ОТКРЫТО ЛИ КАК ПРИЛОЖЕНИЕ
// ============================================================
function isRunningAsApp() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

if (isRunningAsApp()) {
  document.body.classList.add('running-as-app');
  console.log('📱 Приложение запущено в standalone-режиме');
}