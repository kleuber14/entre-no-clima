(() => {
  'use strict';
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSemX0nyQykKrwrfwwai6owPVf_x1mg0HSlP7nuk1B47JxGbfg/viewform?usp=sharing&ouid=108156601853218969947';
  const DURATION_SECONDS = 25;
  const POSITIVE = ['Respeito', 'Escuta', 'Equipe', 'Cuidado', 'Mérito', 'Servir'];
  const NEGATIVE = ['Desrespeito', 'Indiferença', 'Desunião', 'Descaso'];
  const $ = (id) => document.getElementById(id);
  const field = $('playfield'), basket = $('basket'), piecesRoot = $('pieces');
  const startOverlay = $('startOverlay'), endOverlay = $('endOverlay');
  const scoreEl = $('score'), timerEl = $('timer'), floatEl = $('floatingScore');
  const soundButton = $('soundButton'), soundMark = $('soundMark'), narratorMessage = $('narratorMessage');
  let running = false, score = 0, elapsed = 0, lastFrame = 0, spawnAt = 0, basketX = 0.5;
  let activePieces = [], rafId = null, soundOn = false, audioContext = null, lastNarration = '';
  // Zero player names, responses, analytics, cookies, or local storage.
  // The mini-game does not write to Google Forms; it only opens the official form.
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function getDimensions() { return { width: field.clientWidth, height: field.clientHeight }; }
  function showNarration(text) { narratorMessage.textContent = text; }
  function say(text) {
    if (!soundOn || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'pt-BR'; speech.rate = 1.03; speech.pitch = 1.02;
      const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('pt-br'));
      if (voice) speech.voice = voice;
      window.speechSynthesis.speak(speech);
      lastNarration = text;
    } catch (_) { /* Speech availability varies by device. */ }
  }
  function beep(frequency, duration, type = 'sine', volume = .07) {
    if (!soundOn) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }
  function placeBasket() {
    const {width} = getDimensions();
    const half = basket.offsetWidth / 2;
    const px = clamp(basketX * width, half, Math.max(half, width - half));
    basket.style.left = `${px}px`;
  }
  function moveBasket(clientX) {
    if (!running) return;
    const bounds = field.getBoundingClientRect();
    basketX = clamp((clientX - bounds.left) / bounds.width, 0, 1);
    placeBasket();
  }
  field.addEventListener('pointerdown', ev => { if (!running) return; moveBasket(ev.clientX); field.setPointerCapture?.(ev.pointerId); });
  field.addEventListener('pointermove', ev => { if (running && (ev.pointerType === 'mouse' || ev.buttons > 0)) moveBasket(ev.clientX); });
  window.addEventListener('keydown', ev => {
    if (!running || !['ArrowLeft','ArrowRight','a','d','A','D'].includes(ev.key)) return;
    ev.preventDefault(); basketX = clamp(basketX + (['ArrowLeft','a','A'].includes(ev.key) ? -.095 : .095), 0, 1); placeBasket();
  });
  window.addEventListener('resize', placeBasket);
  function spawnPiece() {
    const good = Math.random() < .72;
    const wordList = good ? POSITIVE : NEGATIVE;
    const el = document.createElement('div');
    el.className = `piece ${good ? 'good' : 'bad'}`;
    el.textContent = wordList[Math.floor(Math.random() * wordList.length)];
    piecesRoot.append(el);
    const {width} = getDimensions();
    const w = el.offsetWidth;
    const x = Math.random() * Math.max(0, width - w - 12) + 6;
    const speed = 110 + Math.random() * 45 + Math.min(elapsed * 2.5, 40);
    activePieces.push({el, x, y:-45, width:w, height:el.offsetHeight, speed, good, hit:false});
  }
  function flashPoints(text, good) {
    floatEl.textContent = text;
    floatEl.style.color = good ? '#075839' : '#a43c36';
    floatEl.classList.remove('show'); void floatEl.offsetWidth; floatEl.classList.add('show');
  }
  function clearPieces() { activePieces.forEach(piece => piece.el.remove()); activePieces = []; }
  function endGame() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    clearPieces();
    timerEl.textContent = '0';
    showNarration('Sua voz importa!');
    beep(659,.17); setTimeout(() => beep(880,.27), 110);
    say('Missão cumprida! Sua voz importa. Participe da pesquisa!');
    endOverlay.classList.remove('hidden');
  }
  function frame(time) {
    if (!running) return;
    const delta = lastFrame ? Math.min((time-lastFrame)/1000, .06) : 0;
    lastFrame = time; elapsed += delta;
    const remaining = Math.max(0, Math.ceil(DURATION_SECONDS - elapsed));
    timerEl.textContent = String(remaining);
    if (elapsed >= DURATION_SECONDS) { endGame(); return; }
    if (elapsed >= spawnAt) { spawnPiece(); spawnAt = elapsed + .60 + Math.random() * .24; }
    const rect = getDimensions();
    const basketHalf = basket.offsetWidth / 2;
    const bx = clamp(basketX * rect.width, basketHalf, rect.width-basketHalf);
    const basketTop = rect.height - basket.offsetHeight - 15;
    activePieces = activePieces.filter(piece => {
      piece.y += piece.speed * delta;
      piece.el.style.transform = `translate3d(${piece.x}px,${piece.y}px,0)`;
      const center = piece.x + piece.width/2;
      const catches = piece.y + piece.height >= basketTop && piece.y + piece.height <= basketTop + 34 && Math.abs(center-bx) < basketHalf + piece.width*.22;
      if (catches) {
        score = Math.max(0, score + (piece.good ? 10 : -5));
        scoreEl.textContent = String(score);
        flashPoints(piece.good ? '+10' : '−5',piece.good);
        beep(piece.good ? 660 : 210, piece.good ? .085 : .17, piece.good ? 'sine':'triangle');
        piece.el.remove(); return false;
      }
      if (piece.y > rect.height + 15) { piece.el.remove(); return false; }
      return true;
    });
    rafId = requestAnimationFrame(frame);
  }
  function startGame() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    clearPieces(); score = 0; elapsed = 0; lastFrame = 0; spawnAt = .15; basketX=.5;
    scoreEl.textContent = '0'; timerEl.textContent = String(DURATION_SECONDS);
    startOverlay.classList.add('hidden'); endOverlay.classList.add('hidden');
    showNarration('Pegue as verdes!');
    running = true; placeBasket();
    beep(523,.11); say('Pegue as boas atitudes! Evite as vermelhas.');
    rafId = requestAnimationFrame(frame);
  }
  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.setAttribute('aria-pressed',String(soundOn));
    soundButton.setAttribute('aria-label',soundOn ? 'Desativar som e narração' : 'Ativar som e narração');
    soundMark.textContent = soundOn ? '✓' : '×';
    if (soundOn) beep(600,.12);
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  });
  $('startButton').addEventListener('click',startGame);
  $('againButton').addEventListener('click',startGame);
  // A single destination maintained as the official survey URL.
  document.querySelectorAll('a[href*="docs.google.com/forms/"]').forEach(a => a.href = FORM_URL);
  window.addEventListener('pagehide', () => {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  });
  placeBasket();
})();
