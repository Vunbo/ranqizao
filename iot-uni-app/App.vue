<script>
export default {
  onLaunch() {},
  onShow() {},
  onHide() {},
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');

page {
  --app-safe-top: calc(var(--status-bar-height, 0px) + 14px);
  background: #f8fafc;
  color: #0f172a;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

view,
text,
button,
input,
image,
scroll-view {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  line-height: inherit;
}

button::after {
  border: 0;
}

.page-shell {
  min-height: 100vh;
  background: #f8fafc;
}

.app-shell {
  position: relative;
  min-height: 100vh;
  width: 100%;
  margin: 0 auto;
  padding-top: var(--app-safe-top, 0px);
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.content-shell {
  padding: 30px 20px 132px;
}

.card-box {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
}

.section-kicker {
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #94a3b8;
}

.font-display {
  font-family: 'Outfit', sans-serif;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.6);
}

.safe-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
}

.line-clamp-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.loading-spin {
  animation: loading-spin 0.9s linear infinite;
}

@keyframes loading-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse-dot {
  0% {
    opacity: 0.45;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0.45;
    transform: scale(0.9);
  }
}

@keyframes shimmer-up {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(180px);
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes wave-bar {
  0%,
  100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

@media screen and (min-width: 768px) {
  .app-shell {
    max-width: 672px;
  }
}

@media screen and (min-width: 1024px) {
  .app-shell {
    max-width: 896px;
  }
}

@media screen and (min-width: 1280px) {
  .app-shell {
    max-width: 1152px;
  }
}
</style>
