(() => {
  'use strict';
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSemX0nyQykKrwrfwwai6owPVf_x1mg0HSlP7nuk1B47JxGbfg/viewform?usp=sharing&ouid=108156601853218969947';
  const DURATION_SECONDS = 25;
  const POSITIVE = ['Respeito', 'Colaborar', 'Equipe', 'Cuidado', 'Mérito', 'Servir'];
  const NEGATIVE = ['Desrespeito', 'Indiferença', 'Desunião', 'Descaso'];
  const $ = (id) => document.getElementById(id);
  const field = $('playfield'), basket = $('basket'), piecesRoot = $('pieces');
  const startOverlay = $('startOverlay'), endOverlay = $('endOverlay');
  const scoreEl = $('score'), timerEl = $('timer'), floatEl = $('floatingScore');
  const soundButton = $('soundButton'), soundMark = $('soundMark'), narratorMessage = $('narratorMessage');
  let running = false, score = 0, elapsed = 0, lastFrame = 0, spawnAt = 0, basketX = 0.5;
  let activePieces = [], rafId = null, soundOn = true, audioContext = null;
  // Zero player names, responses, analytics, cookies, or local storage.
  // The mini-game does not write to Google Forms; it only opens the official form.
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function getDimensions() { return { width: field.clientWidth, height: field.clientHeight }; }
  function showNarration(text) { narratorMessage.textContent = text; }
  const AUDIO_FILES = {inicio:'assets/audio/inicio.mp3', final:'assets/audio/final.mp3', music:'assets/audio/musica.mp3'};
  const MUSIC_VOLUME = .15, DUCKED_VOLUME = .04;
  const audioFiles = new Map(), audioBuffers = new Map();
  let masterGain = null, musicGain = null, musicSource = null, voiceSource = null;
  let voiceToken = 0, musicToken = 0;
  // Fetch only local assets. A missing audio file must never prevent playing.
  for (const [key, url] of Object.entries(AUDIO_FILES)) {
    audioFiles.set(key, fetch(url).then(response => {
      if (!response.ok) throw new Error('Audio unavailable');
      return response.arrayBuffer();
    }).catch(() => null));
  }
  function initAudio() {
    if (!soundOn) return false;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
        musicGain = audioContext.createGain();
        musicGain.gain.value = MUSIC_VOLUME;
        musicGain.connect(masterGain);
      }
      masterGain.gain.value = 1;
      // Called directly from Começar/the sound button to unlock audio on mobile.
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      return true;
    } catch (_) { return false; }
  }
  async function loadAudio(key) {
    if (!audioBuffers.has(key)) {
      audioBuffers.set(key, audioFiles.get(key).then(data => data ? audioContext.decodeAudioData(data.slice(0)) : null).catch(() => null));
    }
    return audioBuffers.get(key);
  }
  function setMusicVolume(value) {
    if (!musicGain) return;
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setTargetAtTime(value, audioContext.currentTime, .08);
  }
  function stopVoice() {
    voiceToken++;
    if (voiceSource) { voiceSource.onended = null; voiceSource.stop(); voiceSource = null; }
    setMusicVolume(MUSIC_VOLUME);
  }
  function stopMusic() {
    musicToken++;
    if (musicSource) { musicSource.stop(); musicSource = null; }
  }
  async function startMusic() {
    stopMusic();
    if (!initAudio() || !running) return;
    const token = musicToken;
    const buffer = await loadAudio('music');
    if (!buffer || token !== musicToken || !soundOn || !running) return;
    musicSource = audioContext.createBufferSource();
    musicSource.buffer = buffer; musicSource.loop = true;
    musicSource.connect(musicGain); musicSource.start();
  }
  async function say(key) {
    stopVoice();
    if (!initAudio()) return;
    const token = voiceToken;
    const buffer = await loadAudio(key);
    if (!buffer || token !== voiceToken || !soundOn) return;
    voiceSource = audioContext.createBufferSource();
    voiceSource.buffer = buffer; voiceSource.connect(masterGain);
    setMusicVolume(DUCKED_VOLUME);
    voiceSource.onended = () => { voiceSource = null; setMusicVolume(MUSIC_VOLUME); };
    voiceSource.start();
  }
  function pauseAudio() {
    if (audioContext?.state === 'running') audioContext.suspend().catch(() => {});
  }
  function resumeAudio() {
    if (soundOn && audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
  }
  function beep(frequency, duration, type = 'sine', volume = .07) {
    if (!initAudio()) return;
    try {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain); gain.connect(masterGain);
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
  window.addEventListener('resize', () => {
    placeBasket();
    const {width} = getDimensions();
    activePieces.forEach(piece => {
      piece.x = clamp(piece.x, 6, Math.max(6, width - piece.width - 6));
    });
  });
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
    stopMusic(); say('final');
    endOverlay.classList.remove('hidden');
    endOverlay.querySelector('a').focus({preventScroll:true});
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
    field.focus({preventScroll:true});
    startMusic(); say('inicio');
    rafId = requestAnimationFrame(frame);
  }
  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.setAttribute('aria-pressed',String(soundOn));
    soundButton.setAttribute('aria-label',soundOn ? 'Desativar som e narração' : 'Ativar som e narração');
    soundButton.title = soundButton.getAttribute('aria-label');
    soundMark.textContent = soundOn ? '✓' : '×';
    if (soundOn) {
      initAudio();
      if (running) { startMusic(); say('inicio'); }
      else if (!endOverlay.classList.contains('hidden')) say('final');
    } else {
      stopVoice(); stopMusic();
      if (masterGain) masterGain.gain.value = 0;
    }
  });
  $('startButton').addEventListener('click',startGame);
  // A single destination maintained as the official survey URL.
  document.querySelectorAll('a[href*="docs.google.com/forms/"]').forEach(a => a.href = FORM_URL);
  window.addEventListener('pagehide', () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    pauseAudio();
  });
  // A back/forward-cache restore must resume the interrupted game, not freeze it.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAudio(); else resumeAudio();
  });
  window.addEventListener('pageshow', ev => {
    resumeAudio();
    if (ev.persisted && running) {
      lastFrame = 0;
      rafId = requestAnimationFrame(frame);
    }
  });
  placeBasket();
})();
