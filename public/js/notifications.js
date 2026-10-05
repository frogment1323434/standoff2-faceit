// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================

function notify(message, type = 'info') {
  const el = document.createElement('div');
  el.className = 'notification';
  el.style.borderLeftColor =
    type === 'success' ? 'var(--green)' :
    type === 'error'   ? 'var(--red)' :
    type === 'warning' ? 'var(--yellow)' : 'var(--accent)';
  el.textContent = message;
  document.getElementById('notifications').appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(400px)';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}