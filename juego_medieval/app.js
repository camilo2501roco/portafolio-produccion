// Música de fondo (index.html)
(function () {
  const btn = document.getElementById('toggle-bgm');
  const audio = document.getElementById('bgm');
  if (!btn || !audio) return;

  // Volumen inicial (suave)
  let targetVol = 0.35;
  audio.volume = 0.0; // empezamos en silencio para poder hacer fade-in

  // Cargar preferencia previa
  const pref = localStorage.getItem('bgm_enabled') === 'true';

  // Fade helper
  let fadeTimer = null;
  function fade(to, ms = 600) {
    if (fadeTimer) clearInterval(fadeTimer);
    const steps = 24;
    const dt = ms / steps;
    const from = audio.volume;
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      const t = i / steps;
      audio.volume = from + (to - from) * t;
      if (i >= steps) {
        audio.volume = to;
        clearInterval(fadeTimer);
      }
    }, dt);
  }

  async function enableBgm() {
    try {
      // Intento de play (necesita interacción del usuario)
      await audio.play();
      btn.setAttribute('aria-pressed', 'true');
      btn.textContent = '🎵 Música: ON';
      localStorage.setItem('bgm_enabled', 'true');
      fade(targetVol, 700);
    } catch (e) {
      // Si falla por política de autoplay, pide clic
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '🎵 Habilitar música';
    }
  }

  function disableBgm() {
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = '🎵 Música: OFF';
    localStorage.setItem('bgm_enabled', 'false');
    fade(0.0, 400);
    // pausa al final del fade
    setTimeout(() => { if (audio.volume === 0) audio.pause(); }, 420);
  }

  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') === 'true';
    on ? disableBgm() : enableBgm();
  });

  // Si el usuario ya dio permiso antes, intentar auto-reanudar tras el primer gesto (click en la página)
  if (pref) {
    const tryAuto = () => {
      enableBgm();
      window.removeEventListener('pointerdown', tryAuto);
      window.removeEventListener('keydown', tryAuto);
    };
    window.addEventListener('pointerdown', tryAuto, { once: true });
    window.addEventListener('keydown', tryAuto, { once: true });
  }

  // Silenciar si la pestaña se oculta (opcional)
 /* document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!audio.paused) fade(0.0, 300);
    } else {
      if (btn.getAttribute('aria-pressed') === 'true') fade(targetVol, 500);
    }
  });*/
})();
