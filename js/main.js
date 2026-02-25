/* ── Socket & State ───────────────────────────────────────────────────────────── */
const RENDER_SOCKET_URL = 'https://hanafuda-kz9x.onrender.com';
const isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const socket = isLocalHost
  ? io()
  : io(RENDER_SOCKET_URL, { transports: ['websocket', 'polling'] });
let gameState   = null;
let myIndex     = null;   // 0 or 1
let playerNames = { 0: 'Player 1', 1: 'Player 2' };
let selectedRounds     = 3;
let selectedRoundsSolo = 3;
let selectedDifficulty = 'medium';
let isSoloMode         = false;
let draggedCardId      = null;
let pendingAction      = null;  // 'capture-choice'
let lastFieldIds       = new Set();
let lastCaptureIds     = new Set();
let deckRevealTimer    = null;
let pendingLocalPlayCardId = null;
let pendingLocalPlayFromRect = null;
let pendingLocalPlayImageSrc = null;
let pendingChoiceCardId = null;
let pendingChoiceImageSrc = null;
let queuedFlyAnimations = [];
let pendingDeckDrawCard = null;
let pendingFieldRevealAt = new Map();
let pendingFieldRevealTimer = null;
let pendingFieldCarryAt = new Map();
let pendingFieldCarryTimer = null;
let pendingCaptureRevealAt = new Map();
let pendingCaptureRevealTimer = null;
let fieldCardLastRects = new Map();
let fieldSlots        = [];   // ordered slot array: card id or null (captured placeholder)
let lastHandIds       = new Set();
let visibleCapturedIds = new Set();
let animationBusyUntil = 0;
let phaseOverlayTimer = null;
let koikoiPanelTimer = null;
let statusLockUntil = 0;
let statusUnlockTimer = null;
let gameEndRevealArmedAt = 0;
let eventToastTimer = null;

/* ── DOM helpers ─────────────────────────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const show  = id => { const el = $(id); if (el) { el.classList.remove('hidden'); } };
const hide  = id => { const el = $(id); if (el) { el.classList.add('hidden'); } };
const showScreen = id => {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';   // hide all screens first
  });
  const s = $(id);
  if (s) {
    s.classList.remove('hidden'); // remove hidden class (has display:none !important)
    s.classList.add('active');
    s.style.display = 'flex';
  }
  // Language switch: only visible on lobby
  const ls = $('lang-switch');
  if (ls) ls.style.display = (id === 'screen-lobby') ? '' : 'none';
  // Hide deck reveal when leaving game screen
  if (id !== 'screen-game') hide('drawn-card-reveal');
};

/* ── Lobby bindings ──────────────────────────────────────────────────────────── */
$('btn-solo').onclick = () => {
  show('modal-solo');
  $('solo-name').value = '';
};
$('btn-solo-cancel').onclick = () => hide('modal-solo');
$('btn-solo-confirm').onclick = () => {
  const name = $('solo-name').value.trim() || 'Player';
  isSoloMode = true;
  hide('modal-solo');
  socket.emit('start-solo', { name, rounds: selectedRoundsSolo, difficulty: selectedDifficulty });
};

// Solo rounds likert
document.querySelectorAll('#rounds-likert-solo .likert-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#rounds-likert-solo .likert-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRoundsSolo = parseInt(btn.dataset.value);
  };
});

// Difficulty likert
document.querySelectorAll('#difficulty-likert .likert-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#difficulty-likert .likert-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.value;
  };
});

$('btn-create').onclick = () => {
  show('modal-create');
  hide('create-code-area');
  $('create-name').value = '';
};
$('btn-join').onclick = () => {
  show('modal-join');
  hide('join-error');
  $('join-name').value = '';
  $('join-code').value = '';
};
$('btn-rules').onclick = () => {
  updateRulesContent();
  show('modal-rules');
};

$('btn-create-cancel').onclick = () => hide('modal-create');
$('btn-join-cancel').onclick   = () => hide('modal-join');
$('btn-rules-close').onclick   = () => hide('modal-rules');

// Rounds likert
document.querySelectorAll('.likert-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.likert-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRounds = parseInt(btn.dataset.value);
  };
});

$('btn-create-confirm').onclick = () => {
  const name = $('create-name').value.trim() || 'Player';
  socket.emit('create-room', { name, rounds: selectedRounds });
  show('create-code-area');
  $('btn-create-confirm').disabled = true;
};

$('btn-join-confirm').onclick = () => {
  const name = $('join-name').value.trim() || 'Player';
  const code = $('join-code').value.trim();
  if (code.length !== 4) {
    show('join-error');
    $('join-error').textContent = 'Please enter a 4-digit code';
    return;
  }
  hide('join-error');
  socket.emit('join-room', { name, code });
};

$('btn-next-round').onclick = () => {
  hide('overlay-round');
  socket.emit('next-round');
};

$('btn-play-again').onclick = () => {
  hide('overlay-game');
  isSoloMode = false;
  showScreen('screen-lobby');
};

$('btn-shobu').onclick  = () => socket.emit('koi-koi-choice', { choice: 'shobu' });
$('btn-koikoi').onclick = () => socket.emit('koi-koi-choice', { choice: 'koi-koi' });
$('deck-pile').onclick = () => onDeckPileClick();

/* ── Socket events ───────────────────────────────────────────────────────────── */
socket.on('room-created', ({ code }) => {
  $('create-code').textContent = code;
});

socket.on('join-error', ({ msg }) => {
  const msgMap = {
    'Room not found':      t('errorNotFound'),
    'Game already started':t('errorStarted'),
    'Room full':           t('errorRoomFull'),
  };
  show('join-error');
  $('join-error').textContent = msgMap[msg] || msg;
});

socket.on('players-ready', ({ p0Name, p1Name }) => {
  playerNames[0] = p0Name;
  // Use localised AI name if solo
  playerNames[1] = (p1Name === 'Computer') ? t('aiName') : p1Name;
  hide('modal-create');
  hide('modal-join');
  hide('modal-solo');
});

socket.on('game-state', (state) => {
  queueStateAnimations(gameState, state);
  gameState = state;
  myIndex   = state.myIndex;
  pendingAction = state.phase === 'capture-choice' ? 'capture-choice' : null;
  renderAll();
  playQueuedAnimations();
  handlePhase(state);
});

socket.on('deck-draw', ({ card }) => {
  pendingDeckDrawCard = card;
});

socket.on('ai-koi-koi-decision', ({ choice }) => {
  if (choice === 'koi-koi') {
    setStatus(t('aiKoiKoiDeclared'), { force: true, lockMs: 2200 });
  } else {
    setStatus(t('aiShobuDeclared'), { force: true, lockMs: 2600 });
  }
});

socket.on('yaku-achieved', ({ playerIndex, yaku, score }) => {
  if (playerIndex === null || playerIndex === undefined) return;
  const actorName = playerNames[playerIndex] || (playerIndex === myIndex ? 'You' : 'Opponent');
  const yakuNames = (yaku || [])
    .slice(0, 3)
    .map(y => {
      const byKey = y && y.key ? t(y.key) : '';
      if (byKey && byKey !== y.key) return byKey;
      return currentLang === 'jp' ? (y.nameJp || y.nameEn || '') : (y.nameEn || y.nameJp || '');
    })
    .filter(Boolean)
    .join(', ');
  const scoreText = (score !== null && score !== undefined) ? ` (${score} ${t('pts_label')})` : '';
  const detailText = yakuNames ? `: ${yakuNames}` : '';
  showEventToast(`${actorName} ${t('yakuFormed')}${scoreText}${detailText}`);
});

socket.on('koi-koi-declared', ({ playerIndex, choice, score }) => {
  if (playerIndex === null || playerIndex === undefined || !choice) return;
  const actorName = playerNames[playerIndex] || (playerIndex === myIndex ? 'You' : 'Opponent');
  if (choice === 'koi-koi') {
    showEventToast(`${actorName} ${t('declaredKoiKoi')}`);
    return;
  }
  const scoreText = (score !== null && score !== undefined) ? ` (+${score} ${t('pts_label')})` : '';
  showEventToast(`${actorName} ${t('declaredShobu')}${scoreText}`);
});

socket.on('opponent-left', () => {
  alert(t('oppLeft'));
  showScreen('screen-lobby');
  gameState = null;
});

/* ── Phase Handler ───────────────────────────────────────────────────────────── */
function handlePhase(state) {
  const isMyTurn = state.currentPlayer === myIndex;
  const isAiTurn = isSoloMode && !isMyTurn;

  hide('koikoi-panel');
  hide('overlay-round');
  hide('overlay-game');
  hide('drawn-card-reveal');

  // AI thinking indicator (keep status visible during AI Koi-Koi declaration phase)
  if (
    isAiTurn &&
    state.phase !== 'round-end' &&
    state.phase !== 'game-end' &&
    state.phase !== 'koi-koi-decision'
  ) {
    show('ai-thinking');
    hide('status-msg');
  } else {
    hide('ai-thinking');
    show('status-msg');
  }

  if (state.phase === 'game-end') {
    if (koikoiPanelTimer) {
      clearTimeout(koikoiPanelTimer);
      koikoiPanelTimer = null;
    }
    hide('ai-thinking');
    show('status-msg');
    showEndOverlayWhenReady(() => showGameEnd(state));
    return;
  }
  if (state.phase === 'round-end') {
    if (koikoiPanelTimer) {
      clearTimeout(koikoiPanelTimer);
      koikoiPanelTimer = null;
    }
    hide('ai-thinking');
    show('status-msg');
    showEndOverlayWhenReady(() => showRoundEnd(state));
    return;
  }
  if (state.phase !== 'koi-koi-decision' && koikoiPanelTimer) {
    clearTimeout(koikoiPanelTimer);
    koikoiPanelTimer = null;
  }
  if (phaseOverlayTimer) {
    clearTimeout(phaseOverlayTimer);
    phaseOverlayTimer = null;
  }
  if (state.phase === 'koi-koi-decision' && isMyTurn) {
    showKoiKoiPanelWhenReady(state);
    return;
  }
  if (state.phase === 'koi-koi-decision' && !isMyTurn) {
    setStatus(isSoloMode ? t('aiThinking') : t('oppTurn') + ' (Koi-Koi…)');
    return;
  }
  if (state.phase === 'await-deck-flip' && isMyTurn) {
    setStatus(t('clickFlipDeck'));
    return;
  }
  if (state.phase === 'await-deck-flip' && !isMyTurn) {
    setStatus(isSoloMode ? t('aiThinking') : t('oppTurn'));
    return;
  }
  if (state.phase === 'capture-choice' && isMyTurn) {
    setStatus(t('chooseCapture'));
    highlightCaptureTargets(state.pendingMatches);
    return;
  }
  if (state.phase === 'capture-choice' && !isMyTurn) {
    return; // AI thinking indicator already shown
  }

  if (!isMyTurn) {
    setStatus(isSoloMode ? t('aiThinking') : t('oppTurn'));
  } else {
    setStatus(t('yourTurn'));
  }
}

/* ── Render All ──────────────────────────────────────────────────────────────── */
function renderAll() {
  if (!gameState) return;
  const s = gameState;
  const capturedIds = new Set([
    ...s.myCapture.map(c => c.id),
    ...s.oppCapture.map(c => c.id),
  ]);

  showScreen('screen-game');

  // Top bar
  const myName  = playerNames[myIndex]  || 'You';
  const oppName = playerNames[1-myIndex] || 'Opp';
  $('tb-my-name').textContent   = myName;
  $('tb-opp-name').textContent  = oppName;
  $('tb-my-score').textContent  = s.myScore;
  $('tb-opp-score').textContent = s.oppScore;
  $('tb-round-val').textContent = `${s.roundNumber}/${s.totalRounds}`;

  renderDeckPile(s);
  renderField(s, capturedIds);
  renderMyHand(s, capturedIds);
  renderOppHand(s);
  renderCaptures(s);
}

/* ── Field ───────────────────────────────────────────────────────────────────── */
function renderField(s, capturedIds = new Set()) {
  const el = $('field');
  const newFieldIds = new Set(s.field.filter(c => !capturedIds.has(c.id)).map(c => c.id));
  const now = Date.now();
  for (const [id, ts] of pendingFieldRevealAt.entries()) {
    if (ts <= now || !newFieldIds.has(id)) pendingFieldRevealAt.delete(id);
  }
  for (const [id, carry] of pendingFieldCarryAt.entries()) {
    if (!carry || carry.hideAt <= now) pendingFieldCarryAt.delete(id);
  }
  el.innerHTML = '';
  fieldCardLastRects = new Map();

  // Initialize slots on first render of a round (queueStateAnimations returned early for first state)
  if (fieldSlots.length === 0) {
    fieldSlots = s.field.filter(c => !capturedIds.has(c.id)).map(c => c.id);
  }

  const cardMap = new Map(s.field.filter(c => !capturedIds.has(c.id)).map(c => [c.id, c]));
  fieldSlots = fieldSlots.map(slotId => {
    if (slotId === null) return null;
    if (newFieldIds.has(slotId)) return slotId;
    const carry = pendingFieldCarryAt.get(slotId);
    return (carry && carry.hideAt > now) ? slotId : null;
  });

  fieldSlots.forEach((slotId) => {
    if (slotId === null) {
      // Invisible placeholder — preserves the grid cell so other cards don't shift
      const ph = document.createElement('div');
      ph.className = 'card field-card field-placeholder';
      el.appendChild(ph);
      return;
    }
    const card = cardMap.get(slotId);
    if (!card) {
      const carry = pendingFieldCarryAt.get(slotId);
      if (carry && carry.hideAt > now) {
        const div = document.createElement('div');
        div.className = 'card field-card';
        div.dataset.cardId = slotId;
        const img = document.createElement('img');
        img.src = carry.imageSrc;
        img.alt = '';
        div.appendChild(img);
        el.appendChild(div);
        fieldCardLastRects.set(slotId, div.getBoundingClientRect());
      } else {
        const ph = document.createElement('div');
        ph.className = 'card field-card field-placeholder';
        el.appendChild(ph);
      }
      return;
    }

    const div = makeCard(card, false, false);
    div.classList.add('field-card');
    div.dataset.cardId = card.id;
    // Animate cards that just arrived on the field (but not ones hidden pending fly reveal)
    if (!lastFieldIds.has(card.id)) div.classList.add('field-enter');
    if (isFieldCardPendingReveal(card.id)) {
      div.classList.remove('field-enter');  // fly animation is the visual cue
      div.classList.add('pending-field-hidden');
    }

    div.ondragover = e => e.preventDefault();
    div.ondrop = e => {
      e.stopPropagation();
      onDropOnCard(card.id);
    };
    div.onclick = () => onFieldCardClick(card.id);
    el.appendChild(div);
    fieldCardLastRects.set(card.id, div.getBoundingClientRect());
  });

  lastFieldIds = newFieldIds;
}

function isFieldCardPendingReveal(cardId) {
  const revealAt = pendingFieldRevealAt.get(cardId);
  return !!revealAt && revealAt > Date.now();
}

// Called from queueStateAnimations (BEFORE renderAll) to hide the card immediately.
// Uses rough timing that will be overridden by scheduleFieldRevealAbsolute in playQueuedAnimations.
function scheduleFieldReveal(cardId, delayMs, durationMs) {
  if (cardId === null || cardId === undefined) return;
  const revealAt = Date.now() + Math.max(0, delayMs || 0) + Math.max(0, durationMs || 0) + 90;
  pendingFieldRevealAt.set(cardId, revealAt);
  scheduleFieldRevealFlush();
}

// Called from playQueuedAnimations with the accurate end time (overrides the preliminary entry).
function scheduleFieldRevealAbsolute(cardId, absoluteMs) {
  if (cardId === null || cardId === undefined) return;
  pendingFieldRevealAt.set(cardId, absoluteMs);
  scheduleFieldRevealFlush();
}

function scheduleFieldRevealFlush() {
  if (pendingFieldRevealTimer) {
    clearTimeout(pendingFieldRevealTimer);
    pendingFieldRevealTimer = null;
  }
  if (pendingFieldRevealAt.size === 0) return;
  const nextAt = Math.min(...Array.from(pendingFieldRevealAt.values()));
  const waitMs = Math.max(0, nextAt - Date.now() + 10);
  pendingFieldRevealTimer = setTimeout(() => {
    pendingFieldRevealTimer = null;
    if (gameState) renderField(gameState);
    if (pendingFieldRevealAt.size > 0) scheduleFieldRevealFlush();
  }, waitMs);
}

function scheduleFieldCarry(cardId, imageSrc, absoluteMs) {
  if (cardId === null || cardId === undefined || !imageSrc) return;
  const existing = pendingFieldCarryAt.get(cardId);
  const hideAt = Math.max(absoluteMs || 0, existing ? existing.hideAt : 0);
  pendingFieldCarryAt.set(cardId, { imageSrc, hideAt });
  scheduleFieldCarryFlush();
}

function scheduleFieldCarryFlush() {
  if (pendingFieldCarryTimer) {
    clearTimeout(pendingFieldCarryTimer);
    pendingFieldCarryTimer = null;
  }
  if (pendingFieldCarryAt.size === 0) return;
  const nextAt = Math.min(...Array.from(pendingFieldCarryAt.values()).map(v => v.hideAt));
  const waitMs = Math.max(0, nextAt - Date.now() + 10);
  pendingFieldCarryTimer = setTimeout(() => {
    pendingFieldCarryTimer = null;
    if (gameState) renderField(gameState, new Set([
      ...gameState.myCapture.map(c => c.id),
      ...gameState.oppCapture.map(c => c.id),
    ]));
    if (pendingFieldCarryAt.size > 0) scheduleFieldCarryFlush();
  }, waitMs);
}

/* ── My Hand ─────────────────────────────────────────────────────────────────── */
function renderMyHand(s, capturedIds = new Set()) {
  const el = $('player-hand');
  el.innerHTML = '';
  const isMyTurn = s.currentPlayer === myIndex && s.phase === 'hand-play';
  const safeHand = s.myHand.filter(c => !capturedIds.has(c.id));
  const newHandIds = new Set(safeHand.map(c => c.id));

  safeHand.forEach(card => {
    const isNew = !lastHandIds.has(card.id);
    const div = makeCard(card, isMyTurn, isNew);
    if (isMyTurn) {
      div.draggable = true;
      div.classList.add('draggable');
      div.ondragstart = e => onDragStart(e, card.id);
      div.ondragend   = e => onDragEnd(e);
      div.onclick     = () => onHandCardClick(card.id);
    }
    el.appendChild(div);
  });
  lastHandIds = newHandIds;
}

/* ── Opponent Hand ───────────────────────────────────────────────────────────── */
function renderOppHand(s) {
  const el = $('opp-hand');
  el.innerHTML = '';
  for (let i = 0; i < s.oppHandCount; i++) {
    const div = document.createElement('div');
    div.className = 'card opp-back';
    const img = document.createElement('img');
    img.src = 'hanafuda_cards/unfold.png';
    img.alt = 'card back';
    div.appendChild(img);
    el.appendChild(div);
  }
}

/* ── Deck Pile ───────────────────────────────────────────────────────────────── */
function renderDeckPile(s) {
  const badge = $('deck-pile-count');
  if (badge) badge.textContent = s.stockCount;
  const canFlip = canManuallyFlipDeck(s);
  const pile = $('deck-pile');
  if (pile) {
    pile.classList.toggle('deck-clickable', canFlip);
    pile.classList.toggle('deck-disabled', !canFlip);
  }

  const layer3 = document.querySelector('.deck-layer-3');
  const layer2 = document.querySelector('.deck-layer-2');
  const layer1 = document.querySelector('.deck-layer-1');
  if (layer3) layer3.style.display = s.stockCount > 4 ? '' : 'none';
  if (layer2) layer2.style.display = s.stockCount > 1 ? '' : 'none';
  if (layer1) layer1.style.display = s.stockCount > 0 ? '' : 'none';
}

/* ── Captures ────────────────────────────────────────────────────────────────── */
function renderCaptures(s) {
  const allCaptured = [...s.myCapture, ...s.oppCapture];
  const newIds = new Set(allCaptured.map(c => c.id));
  const now = Date.now();
  for (const [id, ts] of pendingCaptureRevealAt.entries()) {
    if (ts <= now || !newIds.has(id)) pendingCaptureRevealAt.delete(id);
  }

  // Update section titles with player names
  const myName  = playerNames[myIndex]   || 'You';
  const oppName = playerNames[1-myIndex] || 'Opp';
  const myTitleEl  = $('my-cap-title');
  const oppTitleEl = $('opp-cap-title');
  if (myTitleEl)  myTitleEl.textContent  = myName;
  if (oppTitleEl) oppTitleEl.textContent = oppName;

  // Render per-type rows for each player
  const seenGlobal = new Set();
  ['hikari', 'tanzaku', 'tane', 'kasu'].forEach(type => {
    renderTypeRow('my-cap-'  + type, s.myCapture.filter(c => c.type === type),  lastCaptureIds, seenGlobal);
    renderTypeRow('opp-cap-' + type, s.oppCapture.filter(c => c.type === type), lastCaptureIds, seenGlobal);
  });

  // Once a captured card is visible, never hide it again in this round.
  visibleCapturedIds = new Set([...visibleCapturedIds].filter(id => newIds.has(id)));
  allCaptured.forEach(card => {
    if (!isCaptureCardPendingReveal(card.id)) visibleCapturedIds.add(card.id);
  });

  lastCaptureIds = newIds;
}

function renderTypeRow(elId, cards, prevIds, seenGlobal = new Set()) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = '';
  const seenLocal = new Set();
  cards.forEach(card => {
    if (seenLocal.has(card.id) || seenGlobal.has(card.id)) return;
    seenLocal.add(card.id);
    seenGlobal.add(card.id);
    const div = document.createElement('div');
    div.className = 'cap-card';
    div.dataset.cardId = card.id;
    const capPending = isCaptureCardPendingReveal(card.id);
    if (capPending) {
      div.classList.add('pending-cap-hidden');
    } else if (prevIds && !prevIds.has(card.id)) {
      div.classList.add('cap-enter');  // only animate when card actually becomes visible
    }
    const img = document.createElement('img');
    img.src = `hanafuda_cards/${encodeURIComponent(card.file)}`;
    img.alt = card.nameEn;
    img.title = currentLang === 'jp' ? card.nameJp : card.nameEn;
    div.appendChild(img);
    el.appendChild(div);
  });
}

function isCaptureCardPendingReveal(cardId) {
  const revealAt = pendingCaptureRevealAt.get(cardId);
  if (visibleCapturedIds.has(cardId)) return false;
  return !!revealAt && revealAt > Date.now();
}

function scheduleCaptureRevealAt(cardId, absoluteMs) {
  if (cardId === null || cardId === undefined) return;
  if (visibleCapturedIds.has(cardId)) return;
  pendingCaptureRevealAt.set(cardId, absoluteMs);
  scheduleCaptureRevealFlush();
}

function scheduleCaptureRevealFlush() {
  if (pendingCaptureRevealTimer) {
    clearTimeout(pendingCaptureRevealTimer);
    pendingCaptureRevealTimer = null;
  }
  if (pendingCaptureRevealAt.size === 0) return;
  const nextAt = Math.min(...Array.from(pendingCaptureRevealAt.values()));
  const waitMs = Math.max(0, nextAt - Date.now() + 10);
  pendingCaptureRevealTimer = setTimeout(() => {
    pendingCaptureRevealTimer = null;
    if (gameState) renderCaptures(gameState);
    if (pendingCaptureRevealAt.size > 0) scheduleCaptureRevealFlush();
  }, waitMs);
}

// Called from queueCaptureSequence (BEFORE renderAll) so renderCaptures hides the card
// immediately with pending-cap-hidden. The accurate time is overridden later by
// scheduleCaptureRevealAt from playQueuedAnimations.
function scheduleCaptureReveal(cardId, delayMs, durationMs) {
  if (cardId === null || cardId === undefined) return;
  if (visibleCapturedIds.has(cardId)) return;
  const revealAt = Date.now() + Math.max(0, delayMs || 0) + Math.max(0, durationMs || 0) + 90;
  pendingCaptureRevealAt.set(cardId, revealAt);
  scheduleCaptureRevealFlush();
}

/* ── Make Card DOM ───────────────────────────────────────────────────────────── */
function makeCard(card, interactive, animateIn = false) {
  const div = document.createElement('div');
  div.className = animateIn ? 'card animate-in' : 'card';
  div.dataset.cardId = card.id;
  const img = document.createElement('img');
  img.src = `hanafuda_cards/${encodeURIComponent(card.file)}`;
  img.alt = currentLang === 'jp' ? card.nameJp : card.nameEn;
  img.title = (currentLang === 'jp' ? card.nameJp : card.nameEn) + ` (${t('months')[card.month - 1]})`;
  div.appendChild(img);
  return div;
}

function queueStateAnimations(prev, next) {
  if (!prev || myIndex === null) return;
  if (prev.roundNumber !== next.roundNumber) {
    pendingDeckDrawCard = null;
    pendingLocalPlayCardId = null;
    pendingLocalPlayFromRect = null;
    pendingLocalPlayImageSrc = null;
    pendingChoiceCardId = null;
    pendingChoiceImageSrc = null;
    queuedFlyAnimations = [];
    pendingFieldRevealAt.clear();
    pendingFieldCarryAt.clear();
    pendingCaptureRevealAt.clear();
    visibleCapturedIds.clear();
    animationBusyUntil = 0;
    if (pendingFieldRevealTimer) {
      clearTimeout(pendingFieldRevealTimer);
      pendingFieldRevealTimer = null;
    }
    if (pendingCaptureRevealTimer) {
      clearTimeout(pendingCaptureRevealTimer);
      pendingCaptureRevealTimer = null;
    }
    if (pendingFieldCarryTimer) {
      clearTimeout(pendingFieldCarryTimer);
      pendingFieldCarryTimer = null;
    }
    document.querySelectorAll('.flying-card').forEach(el => el.remove());
    lastHandIds = new Set();
    fieldSlots = next.field.map(c => c.id);
    lastCaptureIds = new Set();
    return;
  }
  if (prev.phase === 'round-end' || prev.phase === 'game-end') return;

  const prevFieldIds = new Set(prev.field.map(c => c.id));
  const addedFieldCards = next.field.filter(c => !prevFieldIds.has(c.id));
  const removedFieldCards = prev.field.filter(c => !next.field.find(nc => nc.id === c.id));
  const removedFieldMonthCounts = new Map();
  removedFieldCards.forEach(c => {
    removedFieldMonthCounts.set(c.month, (removedFieldMonthCounts.get(c.month) || 0) + 1);
  });
  const preferredTargetId = addedFieldCards.length ? addedFieldCards[0].id : null;
  const addedFieldCardIds = new Set(addedFieldCards.map(c => c.id));
  // Per-sequence field card assignment: each capture sequence claims the field card
  // whose month matches the played card's month. This correctly separates which
  // field card belongs to the player's play vs. the deck draw when both happen
  // in the same state update and each captures a different field card.
  const _assignedFieldCardIds = new Set();
  function pickFieldCards(month, desiredCount = 1) {
    const cards = [];
    if (month != null) {
      removedFieldCards.forEach(c => {
        if (cards.length >= desiredCount) return;
        if (c.month === month && !_assignedFieldCardIds.has(c.id)) {
          _assignedFieldCardIds.add(c.id);
          cards.push(c);
        }
      });
    }
    // Fallback: any remaining unassigned removed field cards
    removedFieldCards.forEach(c => {
      if (cards.length >= desiredCount) return;
      if (!_assignedFieldCardIds.has(c.id)) {
        _assignedFieldCardIds.add(c.id);
        cards.push(c);
      }
    });
    return cards;
  }
  function fieldCardProps(card, cards = []) {
    return {
      touchFieldCardId: card != null ? card.id : null,
      touchFieldCardIds: cards.map(c => c.id),
      touchFieldCardImageSrc: card ? `hanafuda_cards/${encodeURIComponent(card.file)}` : null,
      touchFieldCardImageSrcs: cards.map(c => `hanafuda_cards/${encodeURIComponent(c.file)}`),
      touchRect: card ? (fieldCardLastRects.get(card.id) || null) : null,
    };
  }
  function desiredFieldCountForMonth(month) {
    if (month == null) return 1;
    const removedCount = removedFieldMonthCounts.get(month) || 0;
    return removedCount >= 3 ? 3 : 1;
  }
  function sequenceRevealIds(captureCards, newlyCapturedPool, fallbackId = null) {
    const poolIds = new Set((newlyCapturedPool || []).map(c => c.id));
    const ids = (captureCards || [])
      .map(c => c && c.id)
      .filter(id => id != null && poolIds.has(id));
    if (ids.length > 0) return [...new Set(ids)];
    if (fallbackId != null && poolIds.has(fallbackId)) return [fallbackId];
    return [];
  }

  // Maintain slot positions and reuse freed slots so field layout stays stable.
  const nextFieldIds = new Set(next.field.map(c => c.id));
  const removedById = new Map(removedFieldCards.map(c => [c.id, c]));
  fieldSlots = fieldSlots.map(id => {
    if (id === null) return null;
    if (nextFieldIds.has(id)) return id;
    // Keep removed card ids in their slots for this update so carry rendering can
    // hold them visible until stack travel begins (no disappear/blink).
    if (removedById.has(id)) return id;
    const carry = pendingFieldCarryAt.get(id);
    return (carry && carry.hideAt > Date.now()) ? id : null;
  });
  addedFieldCards.forEach(c => {
    const emptyIdx = fieldSlots.findIndex(v => v === null);
    if (emptyIdx !== -1) {
      fieldSlots[emptyIdx] = c.id;  // reuse the freed slot
    } else {
      fieldSlots.push(c.id);        // no empty slot — extend to row 3+
    }
  });

  const FLY_TO_FIELD_MS = 1500;
  const DRAW_TO_FIELD_MS = 1460;
  const CAPTURE_SEQUENCE_MS = 3000;
  const CAPTURE_SETTLE_MS = 700; // keep captured cards visibly settled before next step
  let timelineMs = 0;

  const nextMyIds = new Set(next.myHand.map(c => c.id));
  const removedMyCards = prev.myHand.filter(c => !nextMyIds.has(c.id));
  const nextMyCaptureIds = new Set(next.myCapture.map(c => c.id));
  const nextOppCaptureIds = new Set(next.oppCapture.map(c => c.id));
  const newMyCapturedCards = next.myCapture.filter(c => !prev.myCapture.find(pc => pc.id === c.id));
  const newOppCapturedCards = next.oppCapture.filter(c => !prev.oppCapture.find(pc => pc.id === c.id));
  const drawnCardId = pendingDeckDrawCard ? pendingDeckDrawCard.id : null;
  const oppPlayedCard =
    newOppCapturedCards.find(c => !prevFieldIds.has(c.id) && c.id !== drawnCardId) ||
    addedFieldCards.find(c => c.id !== drawnCardId) ||
    null;

  if (removedMyCards.length === 1) {
    const removed = removedMyCards[0];
    if (pendingLocalPlayCardId === removed.id) {
      pendingLocalPlayCardId = null;
      if (nextMyCaptureIds.has(removed.id)) {
        const desiredFieldCount = desiredFieldCountForMonth(removed.month);
        const fcs = pickFieldCards(removed.month, desiredFieldCount);
        const fcp = fieldCardProps(fcs[0] || null, fcs);
        const captureCards = [removed, ...fcs];
        queueCaptureSequence({
          sourceRect: pendingLocalPlayFromRect,
          sourceRectFallbackSelector: '#field',
          imageSrc: pendingLocalPlayImageSrc || `hanafuda_cards/${encodeURIComponent(removed.file)}`,
          capturedCardId: removed.id,
          captureCards,
          revealCardIds: sequenceRevealIds(captureCards, newMyCapturedCards, removed.id),
          ...fcp,
          delayBaseMs: timelineMs
        });
        timelineMs += CAPTURE_SEQUENCE_MS + CAPTURE_SETTLE_MS;
      } else {
        const myPlayedLandedId = addedFieldCardIds.has(removed.id) ? removed.id : preferredTargetId;
        if (addedFieldCardIds.has(myPlayedLandedId)) scheduleFieldReveal(myPlayedLandedId, timelineMs, 1300);
        queueFlyFromSource(null, {
          fromRect: pendingLocalPlayFromRect,
          imageSrc: pendingLocalPlayImageSrc || `hanafuda_cards/${encodeURIComponent(removed.file)}`,
          targetCardId: myPlayedLandedId,
          revealFieldCardId: addedFieldCardIds.has(myPlayedLandedId) ? myPlayedLandedId : null,
          delayBaseMs: timelineMs,
          durationMs: 1300
        });
        timelineMs += FLY_TO_FIELD_MS;
        if (next.phase === 'capture-choice') {
          pendingChoiceCardId = removed.id;
          pendingChoiceImageSrc = pendingLocalPlayImageSrc || `hanafuda_cards/${encodeURIComponent(removed.file)}`;
        }
      }
      pendingLocalPlayFromRect = null;
      pendingLocalPlayImageSrc = null;
    } else {
      const srcEl = document.querySelector(`#player-hand .card[data-card-id="${removed.id}"]`);
      if (nextMyCaptureIds.has(removed.id)) {
        const desiredFieldCount = desiredFieldCountForMonth(removed.month);
        const fcs = pickFieldCards(removed.month, desiredFieldCount);
        const fcp = fieldCardProps(fcs[0] || null, fcs);
        const captureCards = [removed, ...fcs];
        queueCaptureSequence({
          sourceEl: srcEl,
          imageSrc: `hanafuda_cards/${encodeURIComponent(removed.file)}`,
          capturedCardId: removed.id,
          captureCards,
          revealCardIds: sequenceRevealIds(captureCards, newMyCapturedCards, removed.id),
          ...fcp,
          delayBaseMs: timelineMs
        });
        timelineMs += CAPTURE_SEQUENCE_MS + CAPTURE_SETTLE_MS;
      } else {
        const myPlayedLandedId = addedFieldCardIds.has(removed.id) ? removed.id : preferredTargetId;
        if (addedFieldCardIds.has(myPlayedLandedId)) scheduleFieldReveal(myPlayedLandedId, timelineMs, 1300);
        queueFlyFromSource(srcEl, {
          imageSrc: `hanafuda_cards/${encodeURIComponent(removed.file)}`,
          targetCardId: myPlayedLandedId,
          revealFieldCardId: addedFieldCardIds.has(myPlayedLandedId) ? myPlayedLandedId : null,
          delayBaseMs: timelineMs,
          durationMs: 1300
        });
        timelineMs += FLY_TO_FIELD_MS;
      }
    }
  } else if (pendingLocalPlayCardId !== null) {
    pendingLocalPlayCardId = null;
    pendingLocalPlayFromRect = null;
    pendingLocalPlayImageSrc = null;
  }

  // Resolve "capture-choice" hand card capture before any deck-draw animation.
  if (prev.phase === 'capture-choice' && pendingChoiceCardId !== null) {
    const capturedByMe = nextMyCaptureIds.has(pendingChoiceCardId);
    const capturedByOpp = nextOppCaptureIds.has(pendingChoiceCardId);
    const capturePool = capturedByMe ? newMyCapturedCards : (capturedByOpp ? newOppCapturedCards : []);
    const playedCard =
      capturePool.find(c => c.id === pendingChoiceCardId) ||
      next.myCapture.find(c => c.id === pendingChoiceCardId) ||
      next.oppCapture.find(c => c.id === pendingChoiceCardId) ||
      null;
    if (playedCard) {
      const desiredFieldCount = desiredFieldCountForMonth(playedCard.month);
      const fcs = pickFieldCards(playedCard.month, desiredFieldCount);
      const fcp = fieldCardProps(fcs[0] || null, fcs);
      const captureCards = [playedCard, ...fcs];
      queueCaptureSequence({
        sourceRectFallbackSelector: '#field',
        imageSrc: pendingChoiceImageSrc || `hanafuda_cards/${encodeURIComponent(playedCard.file)}`,
        capturedCardId: playedCard.id,
        captureCards,
        revealCardIds: sequenceRevealIds(captureCards, capturePool, playedCard.id),
        ...fcp,
        delayBaseMs: timelineMs
      });
      timelineMs += CAPTURE_SEQUENCE_MS + CAPTURE_SETTLE_MS;
    }
    pendingChoiceCardId = null;
    pendingChoiceImageSrc = null;
  }

  if (prev.oppHandCount === next.oppHandCount + 1) {
    const srcEl = document.querySelector('#opp-hand .card:last-child');
    // True only if opp's HAND card itself captured — deck-draw-only captures must NOT trigger this.
    // (nextOppCaptureIds.size > prev.oppCapture.length is wrong: it fires for deck-draw captures too)
    const oppHandCaptured = newOppCapturedCards.some(c => !prevFieldIds.has(c.id) && c.id !== drawnCardId);
    if (oppHandCaptured) {
      const playedMonth = oppPlayedCard ? oppPlayedCard.month : null;
      const desiredFieldCount = desiredFieldCountForMonth(playedMonth);
      const fcs = pickFieldCards(playedMonth, desiredFieldCount);
      const fcp = fieldCardProps(fcs[0] || null, fcs);
      // Reveal opponent's card face-up from the moment it leaves their hand
      const oppFaceImg = oppPlayedCard
        ? `hanafuda_cards/${encodeURIComponent(oppPlayedCard.file)}`
        : (newOppCapturedCards[0]
          ? `hanafuda_cards/${encodeURIComponent(newOppCapturedCards[0].file)}`
          : 'hanafuda_cards/unfold.png');
      const captureCards = [
        ...(oppPlayedCard ? [oppPlayedCard] : []),
        ...fcs
      ];
      // Use the opp's played card id as the primary capture id (not newlyCaptured[0] which
      // could be a deck-draw card if the array happens to be ordered that way).
      const primaryCapturedId = oppPlayedCard ? oppPlayedCard.id : (newOppCapturedCards[0] ? newOppCapturedCards[0].id : null);
      queueCaptureSequence({
        sourceEl: srcEl,
        imageSrc: oppFaceImg,
        capturedCardId: primaryCapturedId,
        captureCards,
        revealCardIds: sequenceRevealIds(captureCards, newOppCapturedCards, primaryCapturedId),
        ...fcp,
        delayBaseMs: timelineMs
      });
      timelineMs += CAPTURE_SEQUENCE_MS + CAPTURE_SETTLE_MS;
    } else {
      const oppFieldCard = oppPlayedCard;
      const oppFieldTargetId = oppFieldCard ? oppFieldCard.id : preferredTargetId;
      if (addedFieldCardIds.has(oppFieldTargetId)) scheduleFieldReveal(oppFieldTargetId, timelineMs, 1120);
      // Reveal opponent's card face-up from the moment it leaves their hand
      const oppFaceImg = oppFieldCard
        ? `hanafuda_cards/${encodeURIComponent(oppFieldCard.file)}`
        : (addedFieldCards[0]
          ? `hanafuda_cards/${encodeURIComponent(addedFieldCards[0].file)}`
          : 'hanafuda_cards/unfold.png');
      queueFlyFromSource(srcEl, {
        imageSrc: oppFaceImg,
        targetCardId: oppFieldTargetId,
        revealFieldCardId: addedFieldCardIds.has(oppFieldTargetId) ? oppFieldTargetId : null,
        delayBaseMs: timelineMs,
        durationMs: 1120
      });
      timelineMs += FLY_TO_FIELD_MS;
    }
  }

  if (prev.stockCount === next.stockCount + 1) {
    const drawnLandedOnField = drawnCardId !== null && addedFieldCardIds.has(drawnCardId);
    const drawnCapturedMy = drawnCardId !== null && nextMyCaptureIds.has(drawnCardId);
    const drawnCapturedOpp = drawnCardId !== null && nextOppCaptureIds.has(drawnCardId);
    const srcEl = document.querySelector('.deck-layer-1');
    const drawnImage = pendingDeckDrawCard
      ? `hanafuda_cards/${encodeURIComponent(pendingDeckDrawCard.file)}`
      : 'hanafuda_cards/unfold.png';
    if (drawnLandedOnField) {
      if (drawnCardId) scheduleFieldReveal(drawnCardId, timelineMs, 1250);
      queueFlyFromSource(srcEl, {
        imageSrc: 'hanafuda_cards/unfold.png',
        frontImageSrc: drawnImage,
        targetCardId: drawnCardId,
        targetSelector: '#field',
        revealFieldCardId: drawnCardId,
        flip: true,
        durationMs: 1250,
        delayBaseMs: timelineMs
      });
      timelineMs += DRAW_TO_FIELD_MS;
    } else if (drawnCapturedMy || drawnCapturedOpp) {
      const capturePool = drawnCapturedMy ? newMyCapturedCards : newOppCapturedCards;
      const drawMonth = pendingDeckDrawCard ? pendingDeckDrawCard.month : null;
      const desiredFieldCount = desiredFieldCountForMonth(drawMonth);
      const fcs = pickFieldCards(drawMonth, desiredFieldCount);
      const fcp = fieldCardProps(fcs[0] || null, fcs);
      const captureCards = [
        ...(pendingDeckDrawCard ? [pendingDeckDrawCard] : []),
        ...fcs
      ];
      queueCaptureSequence({
        sourceEl: srcEl,
        imageSrc: 'hanafuda_cards/unfold.png',
        frontImageSrc: drawnImage,
        flipOnFirstLeg: true,
        capturedCardId: drawnCardId,
        captureCards,
        revealCardIds: sequenceRevealIds(captureCards, capturePool, drawnCardId),
        ...fcp,
        delayBaseMs: timelineMs
      });
      timelineMs += CAPTURE_SEQUENCE_MS + CAPTURE_SETTLE_MS;
    } else {
      if (drawnCardId) scheduleFieldReveal(drawnCardId, timelineMs, 1250);
      queueFlyFromSource(srcEl, {
        imageSrc: 'hanafuda_cards/unfold.png',
        frontImageSrc: drawnImage,
        targetCardId: drawnCardId,
        targetSelector: '#field',
        revealFieldCardId: drawnCardId,
        flip: true,
        durationMs: 1250,
        delayBaseMs: timelineMs
      });
      timelineMs += DRAW_TO_FIELD_MS;
    }
    pendingDeckDrawCard = null;
  }
}

function queueFlyFromSource(srcEl, opts = {}) {
  const r = opts.fromRect || (srcEl ? srcEl.getBoundingClientRect() : null);
  if (!r) return;
  queuedFlyAnimations.push({
    fromRect: { left: r.left, top: r.top, width: r.width, height: r.height },
    imageSrc: opts.imageSrc || 'hanafuda_cards/unfold.png',
    frontImageSrc: opts.frontImageSrc || null,
    targetCardId: opts.targetCardId ?? null,
    targetSelector: opts.targetSelector || '#field',
    targetElementSelector: opts.targetElementSelector || null,
    toRect: opts.toRect || null,
    flip: !!opts.flip,
    scaleToTarget: !!opts.scaleToTarget,
    stackImages: opts.stackImages || null,
    revealCaptureCardIds: opts.revealCaptureCardIds || null,
    revealFieldCardId: opts.revealFieldCardId || null,
    durationMs: opts.durationMs || 500,
    delayMs: (opts.delayBaseMs || 0) + (opts.delayMs ?? 0),
    group: opts.group || null   // items with the same group key run in parallel
  });
}

function queueCaptureSequence(opts) {
  const sourceEl = opts.sourceEl || (opts.sourceSelector ? document.querySelector(opts.sourceSelector) : null);
  let fromRect = opts.sourceRect || (sourceEl ? sourceEl.getBoundingClientRect() : null);
  if (!fromRect && opts.sourceRectFallbackSelector) {
    const area = document.querySelector(opts.sourceRectFallbackSelector);
    if (area) {
      const ar = area.getBoundingClientRect();
      const rootStyle = getComputedStyle(document.documentElement);
      const cardW = parseFloat(rootStyle.getPropertyValue('--card-w')) || 72;
      const cardH = parseFloat(rootStyle.getPropertyValue('--card-h')) || 100;
      fromRect = {
        left: ar.left + (ar.width - cardW) / 2,
        top: ar.top + (ar.height - cardH) / 2,
        width: cardW,
        height: cardH
      };
    }
  }
  if (!fromRect || opts.capturedCardId == null) return;

  let touchRect = opts.touchRect || null;
  if (opts.touchFieldCardId !== null && opts.touchFieldCardId !== undefined) {
    const touchEl = document.querySelector(`#field .card[data-card-id="${opts.touchFieldCardId}"]`);
    if (touchEl) touchRect = touchEl.getBoundingClientRect();
  }
  if (!touchRect) {
    const field = document.querySelector('#field');
    if (!field) return;
    const fr = field.getBoundingClientRect();
    touchRect = {
      left: fr.left + (fr.width - fromRect.width) / 2,
      top: fr.top + (fr.height - fromRect.height) / 2,
      width: fromRect.width,
      height: fromRect.height
    };
  }

  const firstDuration = 900;
  const secondDuration = 1100;
  const delayBase = opts.delayBaseMs || 0;
  const revealIds = (opts.revealCardIds && opts.revealCardIds.length)
    ? opts.revealCardIds
    : [opts.capturedCardId];
  const captureStackImages = (() => {
    const fromCards = opts.captureCards || [];
    const fromTouched = [];
    if (opts.touchFieldCardImageSrcs && opts.touchFieldCardImageSrcs.length) {
      fromTouched.push(...opts.touchFieldCardImageSrcs);
    } else if (opts.touchFieldCardImageSrc) {
      fromTouched.push(opts.touchFieldCardImageSrc);
    }
    const seen = new Set();
    const images = [];
    fromCards.forEach(c => {
      if (!c || seen.has(c.id)) return;
      seen.add(c.id);
      images.push(`hanafuda_cards/${encodeURIComponent(c.file)}`);
    });
    fromTouched.forEach(src => {
      if (!src || images.includes(src)) return;
      images.push(src);
    });
    return images;
  })();

  // Preliminary hiding: mark captured cards as pending BEFORE renderAll runs, so
  // renderCaptures gives them pending-cap-hidden (they won't pop in early).
  // playQueuedAnimations will override with the accurate absolute time.
  const preliminaryTotalMs = delayBase + firstDuration + 80 + secondDuration;
  revealIds.forEach(id => scheduleCaptureReveal(id, 0, preliminaryTotalMs));
  const carryIds = (opts.touchFieldCardIds && opts.touchFieldCardIds.length)
    ? opts.touchFieldCardIds
    : ((opts.touchFieldCardId != null) ? [opts.touchFieldCardId] : []);
  carryIds.forEach((cardId, idx) => {
    const carrySrc = (opts.touchFieldCardImageSrcs && opts.touchFieldCardImageSrcs[idx])
      ? opts.touchFieldCardImageSrcs[idx]
      : (opts.touchFieldCardImageSrc ||
        ((opts.touchFieldCardImageSrcs && opts.touchFieldCardImageSrcs.length) ? opts.touchFieldCardImageSrcs[0] : null));
    scheduleFieldCarry(cardId, carrySrc, Date.now() + delayBase + firstDuration + 60);
  });

  // Leg 1: played card travels from source → field card position (they "meet")
  queueFlyFromSource(null, {
    fromRect,
    toRect: touchRect,
    imageSrc: opts.imageSrc,
    frontImageSrc: opts.frontImageSrc || null,
    flip: !!opts.flipOnFirstLeg,
    durationMs: firstDuration,
    delayMs: delayBase
  });

  // Step 2: each captured card flies simultaneously to its own slot in the capture panel.
  // Cards that can be matched to a card object get individual flights (parallel group).
  // Any remaining ids fall back to a single bundle animation.
  const leg2DelayMs = delayBase + firstDuration + 80;
  const leg2Group = `cap2-${delayBase}-${opts.capturedCardId}`;
  const cardMap = new Map((opts.captureCards || []).filter(Boolean).map(c => [c.id, c]));
  const revealWithCard  = revealIds.filter(id => cardMap.has(id));
  const revealNoCard    = revealIds.filter(id => !cardMap.has(id));

  if (revealWithCard.length > 1) {
    // Multiple known cards — each flies to its own cap-card position in parallel
    revealWithCard.forEach(id => {
      const card = cardMap.get(id);
      const imgSrc = (opts.flipOnFirstLeg && opts.frontImageSrc && id === opts.capturedCardId)
        ? opts.frontImageSrc
        : `hanafuda_cards/${encodeURIComponent(card.file)}`;
      queueFlyFromSource(null, {
        fromRect: touchRect,
        imageSrc: imgSrc,
        targetElementSelector: `.cap-card[data-card-id="${id}"]`,
        scaleToTarget: true,
        revealCaptureCardIds: [id],
        durationMs: secondDuration,
        delayMs: leg2DelayMs,
        group: leg2Group
      });
    });
    // Reveal any ids we didn't have a card object for at the same time
    if (revealNoCard.length > 0) {
      revealNoCard.forEach(id => scheduleCaptureReveal(id, leg2DelayMs, secondDuration));
    }
  } else {
    // Single card or no card objects — original bundle animation
    queueFlyFromSource(null, {
      fromRect: touchRect,
      imageSrc: captureStackImages[0] || opts.frontImageSrc || opts.imageSrc,
      stackImages: captureStackImages.length > 1 ? captureStackImages : null,
      targetElementSelector: `.cap-card[data-card-id="${opts.capturedCardId}"]`,
      scaleToTarget: true,
      revealCaptureCardIds: revealIds,
      durationMs: secondDuration,
      delayMs: leg2DelayMs
    });
  }
}

function playQueuedAnimations() {
  if (queuedFlyAnimations.length === 0) return;
  const items = queuedFlyAnimations.slice();
  queuedFlyAnimations = [];
  items.sort((a, b) => (a.delayMs || 0) - (b.delayMs || 0));

  // Build process order: items with the same `group` key are batched together and
  // run in parallel (same startAt). Items without a group each form their own batch.
  const processOrder = [];   // array of item-arrays (batches)
  const groupMap = new Map();
  items.forEach(item => {
    const g = item.group || null;
    if (g && groupMap.has(g)) {
      groupMap.get(g).push(item);
    } else {
      const batch = [item];
      processOrder.push(batch);
      if (g) groupMap.set(g, batch);
    }
  });

  const now = Date.now();
  const batchBaseOffset = Math.max(0, animationBusyUntil - now);
  let cursor = batchBaseOffset;
  let maxEnd = now + batchBaseOffset;

  processOrder.forEach(batch => {
    const repItem = batch[0];
    const requested = batchBaseOffset + (repItem.delayMs || 0);
    const startAt = Math.max(cursor, requested);
    const maxDuration = Math.max(...batch.map(it => it.durationMs || 500));

    batch.forEach(item => {
      setTimeout(() => animateFlyCard(item), startAt);
      const endAt = now + startAt + (item.durationMs || 500);
      if (item.revealCaptureCardIds && item.revealCaptureCardIds.length) {
        // Reveal slightly before fly card is removed (endAt + 20 vs removal at duration + 80)
        // so the real card is already visible when the fly card disappears — no blink gap.
        item.revealCaptureCardIds.forEach(cardId => scheduleCaptureRevealAt(cardId, endAt + 20));
      }
      if (item.revealFieldCardId) {
        scheduleFieldRevealAbsolute(item.revealFieldCardId, endAt + 20);
      }
      if (endAt > maxEnd) maxEnd = endAt;
    });

    cursor = startAt + maxDuration + 180;
  });
  animationBusyUntil = Math.max(animationBusyUntil, maxEnd);
}

function animateFlyCard(item) {
  let to = item.toRect || null;
  if (!to && item.targetElementSelector) {
    const targetEl = document.querySelector(item.targetElementSelector);
    if (targetEl) to = targetEl.getBoundingClientRect();
  }
  if (!to && item.targetCardId !== null) {
    const targetCard = document.querySelector(`#field .card[data-card-id="${item.targetCardId}"]`);
    if (targetCard) {
      to = targetCard.getBoundingClientRect();
    }
  }
  if (!to) {
    const targetArea = document.querySelector(item.targetSelector);
    if (!targetArea) return;
    const areaRect = targetArea.getBoundingClientRect();
    // Fallback: fly to a card-sized slot near deck side, not field center.
    const toLeft = item.targetSelector === '#field'
      ? areaRect.left + Math.max(8, areaRect.width - item.fromRect.width - 8)
      : areaRect.left + (areaRect.width - item.fromRect.width) / 2;
    const toTop = item.targetSelector === '#field'
      ? areaRect.top + Math.max(8, areaRect.height - item.fromRect.height - 8)
      : areaRect.top + (areaRect.height - item.fromRect.height) / 2;
    to = {
      left: toLeft,
      top: toTop,
      width: item.fromRect.width,
      height: item.fromRect.height,
    };
  }
  if (!to.width || !to.height || !item.fromRect.width || !item.fromRect.height) return;

  const fly = document.createElement('div');
  fly.className = 'flying-card';
  fly.style.left = `${item.fromRect.left}px`;
  fly.style.top = `${item.fromRect.top}px`;
  fly.style.width = `${item.fromRect.width}px`;
  fly.style.height = `${item.fromRect.height}px`;

  const fromCx = item.fromRect.left + item.fromRect.width / 2;
  const fromCy = item.fromRect.top + item.fromRect.height / 2;
  const toCx = to.left + to.width / 2;
  const toCy = to.top + to.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const sx = item.scaleToTarget ? (to.width / item.fromRect.width) : 1;
  const sy = item.scaleToTarget ? (to.height / item.fromRect.height) : 1;

  if (item.flip && item.frontImageSrc) {
    fly.classList.add('flip-reveal');
    fly.innerHTML = `
      <div class="fly-inner">
        <div class="fly-face back"><img src="${item.imageSrc}" alt="" /></div>
        <div class="fly-face front"><img src="${item.frontImageSrc}" alt="" /></div>
      </div>
    `;
  } else {
    if (item.stackImages && item.stackImages.length > 0) {
      const stack = document.createElement('div');
      stack.className = 'fly-stack';
      item.stackImages.slice(0, 4).forEach((src, idx) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.style.transform = `translate(${idx * 6}px, ${idx * 4}px)`;
        img.style.zIndex = String(100 - idx);
        stack.appendChild(img);
      });
      fly.appendChild(stack);
    } else {
      const img = document.createElement('img');
      img.src = item.imageSrc;
      img.alt = '';
      fly.appendChild(img);
    }
  }
  document.body.appendChild(fly);
  fly.style.opacity = '1';

  const duration = item.durationMs;
  // Force the browser to commit the initial position before starting the transition.
  // A single rAF is not always enough; double rAF guarantees the first paint happens first.
  requestAnimationFrame(() => {
    void fly.offsetWidth; // force layout/reflow
    fly.style.transition = `transform ${duration}ms cubic-bezier(.18,.82,.22,1)`;
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    });
  });

  if (item.flip && item.frontImageSrc) {
    const inner = fly.querySelector('.fly-inner');
    if (inner) setTimeout(() => { inner.style.transform = 'rotateY(180deg)'; }, Math.floor(duration * 0.18));
  }

  // Keep fly card alive until 80ms after animation ends so the real card
  // (revealed at endAt + 20ms) has time to appear before the fly disappears.
  // This eliminates the ~60ms blink gap between fly removal and card reveal.
  setTimeout(() => fly.remove(), duration + 80);
}

function showEndOverlayWhenReady(showFn) {
  const finishAt = getAnimationsFullyCompleteAt();
  const waitMs = Math.max(0, finishAt - Date.now());
  if (waitMs <= 10) {
    showFn();
    return;
  }
  if (phaseOverlayTimer) clearTimeout(phaseOverlayTimer);
  phaseOverlayTimer = setTimeout(() => {
    phaseOverlayTimer = null;
    showFn();
  }, waitMs + 30);
}

function getAnimationsFullyCompleteAt() {
  let finishAt = animationBusyUntil;
  if (pendingFieldRevealAt.size > 0) {
    const latestReveal = Math.max(...Array.from(pendingFieldRevealAt.values()));
    if (latestReveal > finishAt) finishAt = latestReveal;
  }
  if (pendingCaptureRevealAt.size > 0) {
    const latestCaptureReveal = Math.max(...Array.from(pendingCaptureRevealAt.values()));
    if (latestCaptureReveal > finishAt) finishAt = latestCaptureReveal;
  }
  return finishAt;
}

function showKoiKoiPanelWhenReady(state) {
  const finishAt = getAnimationsFullyCompleteAt();
  const waitMs = Math.max(0, finishAt - Date.now());
  if (waitMs <= 10) {
    showKoiKoiPanel(state);
    return;
  }
  if (koikoiPanelTimer) clearTimeout(koikoiPanelTimer);
  koikoiPanelTimer = setTimeout(() => {
    koikoiPanelTimer = null;
    if (gameState && gameState.phase === 'koi-koi-decision' && gameState.currentPlayer === myIndex) {
      showKoiKoiPanel(gameState);
    }
  }, waitMs + 40);
}

function setStatus(msg, opts = {}) {
  const force = !!opts.force;
  const lockMs = Math.max(0, opts.lockMs || 0);
  if (!force && Date.now() < statusLockUntil) return;
  $('status-msg').textContent = msg;
  if (lockMs > 0) {
    statusLockUntil = Date.now() + lockMs;
    if (statusUnlockTimer) clearTimeout(statusUnlockTimer);
    statusUnlockTimer = setTimeout(() => {
      statusUnlockTimer = null;
      if (gameState) handlePhase(gameState);
    }, lockMs + 30);
  }
}

function showEventToast(msg, durationMs = 2400) {
  let el = $('event-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'event-toast';
    el.className = 'event-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (eventToastTimer) clearTimeout(eventToastTimer);
  eventToastTimer = setTimeout(() => {
    el.classList.remove('show');
    eventToastTimer = null;
  }, Math.max(900, durationMs));
}

function canManuallyFlipDeck(state = gameState) {
  return !!state &&
    state.phase === 'await-deck-flip' &&
    state.currentPlayer === myIndex &&
    state.stockCount > 0;
}

function onDeckPileClick() {
  if (!canManuallyFlipDeck(gameState)) return;
  if (Date.now() + 30 < getAnimationsFullyCompleteAt()) return;
  socket.emit('flip-deck');
}

/* ── Drag & Drop ─────────────────────────────────────────────────────────────── */
function onDragStart(e, cardId) {
  draggedCardId = cardId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';

  // Highlight matching field cards
  if (gameState) {
    const card = gameState.myHand.find(c => c.id === cardId);
    if (card) {
      document.querySelectorAll('#field .card').forEach(el => {
        const fid = parseInt(el.dataset.cardId);
        const fc = gameState.field.find(c => c.id === fid);
        if (fc && fc.month === card.month) {
          el.classList.add('matchable');
        }
      });
    }
  }
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedCardId = null;
  clearHighlights();
}

function onDropOnCard(fieldCardId) {
  if (draggedCardId === null) return;
  clearHighlights();
  const id = draggedCardId;
  draggedCardId = null;
  animateHandPlay(id, () => socket.emit('play-card', { cardId: id }), fieldCardId);
}

function onDropToField(e) {
  if (draggedCardId === null) return;
  clearHighlights();
  const id = draggedCardId;
  draggedCardId = null;
  animateHandPlay(id, () => socket.emit('play-card', { cardId: id }));
}

function clearHighlights() {
  document.querySelectorAll('.card.matchable').forEach(el => el.classList.remove('matchable'));
  document.querySelectorAll('.card.capture-target').forEach(el => el.classList.remove('capture-target'));
}

/* ── Click interactions ──────────────────────────────────────────────────────── */
function onHandCardClick(cardId) {
  if (!gameState) return;
  if (gameState.currentPlayer !== myIndex || gameState.phase !== 'hand-play') return;
  animateHandPlay(cardId, () => socket.emit('play-card', { cardId }));
}

function animateHandPlay(cardId, cb, targetFieldCardId = null) {
  const el = document.querySelector(`#player-hand .card[data-card-id="${cardId}"]`);
  if (el) {
    const img = el.querySelector('img');
    const r = el.getBoundingClientRect();
    pendingLocalPlayFromRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    pendingLocalPlayImageSrc = img ? img.src : 'hanafuda_cards/unfold.png';
    pendingLocalPlayCardId = cardId;
    el.style.visibility = 'hidden';
    cb(); // emit immediately so the fly starts as soon as the server responds
  } else {
    pendingLocalPlayCardId = null;
    pendingLocalPlayFromRect = null;
    pendingLocalPlayImageSrc = null;
    cb();
  }
}

function onFieldCardClick(cardId) {
  if (!gameState) return;
  if (gameState.phase === 'capture-choice' && gameState.currentPlayer === myIndex) {
    if (gameState.pendingMatches.includes(cardId)) {
      socket.emit('select-capture', { targetId: cardId });
    }
  }
}

function highlightCaptureTargets(matchIds) {
  document.querySelectorAll('#field .card').forEach(el => {
    const id = parseInt(el.dataset.cardId);
    if (matchIds.includes(id)) {
      el.classList.add('capture-target');
    }
  });
}

/* ── Koi-Koi Panel ───────────────────────────────────────────────────────────── */
function showKoiKoiPanel(state) {
  const yaku = state.lastYaku[myIndex] || [];
  const list = $('yaku-list');
  list.innerHTML = yaku.map(y => `
    <div class="yaku-item">
      <span>${t(y.key) || y.nameEn} <small style="color:var(--text-dim)">${y.nameJp}</small></span>
      <span class="pts">${y.pts} ${t('pts_label')}</span>
    </div>`).join('');
  const total = yaku.reduce((s, y) => s + y.pts, 0);
  $('yaku-total').textContent = `${t('total')} ${total} ${t('pts_label')}`;
  show('koikoi-panel');
}

/* ── Round End ───────────────────────────────────────────────────────────────── */
function showRoundEnd(state) {
  const summary = state.roundSummary;
  const win  = summary?.winner;
  const pts  = state.roundPoints;

  let title, winnerName;
  if (win === null) {
    title = t('draw');
  } else {
    winnerName = playerNames[win] || (win === myIndex ? 'You' : 'Opp');
    title = win === myIndex ? t('youWin') : t('oppWins');
  }
  $('round-result-title').textContent = `${t('roundResult')} ${state.roundNumber}/${state.totalRounds} — ${title}`;

  let body = '';
  if (win !== null) {
    const koiRows = summary?.koiKoiCalled || state.koiKoiCalled || [false, false];
    const winnerYaku = win === 0 ? (summary?.p0Yaku || []) : (summary?.p1Yaku || []);
    const basePts = winnerYaku.reduce((sum, y) => sum + (y.pts || 0), 0);
    const didSevenDouble = basePts >= 7;
    const didWinnerKoiDouble = !!koiRows[win];
    const didOppKoiBonus = !!koiRows[1 - win];

    body += `<div class="round-detail-title">${winnerName} ${t('wonBy')}</div>`;
    body += `<div class="round-detail-subtitle">${t('winningYaku')}</div>`;
    if (winnerYaku.length === 0) {
      body += `<div class="round-score-row"><span>${t('noYaku')}</span><span>0 ${t('pts_label')}</span></div>`;
    } else {
      winnerYaku.forEach(y => {
        const fromKey = y.key ? t(y.key) : '';
        const localized = (fromKey && fromKey !== y.key)
          ? fromKey
          : (currentLang === 'jp' ? y.nameJp : y.nameEn);
        body += `<div class="round-score-row"><span>${localized}</span><span>+${y.pts} ${t('pts_label')}</span></div>`;
      });
    }

    body += `<div class="round-detail-subtitle">${t('pointBreakdown')}</div>`;
    body += `<div class="round-score-row"><span>${t('baseYakuPts')}</span><span>${basePts} ${t('pts_label')}</span></div>`;
    if (didSevenDouble) body += `<div class="round-score-row"><span>${t('sevenDoubled')}</span><span></span></div>`;
    if (didWinnerKoiDouble) body += `<div class="round-score-row"><span>${t('koiKoiDoubled')}</span><span></span></div>`;
    if (didOppKoiBonus) body += `<div class="round-score-row"><span>${t('oppKoiBonus')}</span><span></span></div>`;
    body += `<div class="round-score-row round-score-final"><span>${t('finalRoundPts')}</span><span>+${pts} ${t('pts_label')}</span></div>`;
  }
  body += `<div class="round-score-row" style="margin-top:12px"><span>${playerNames[0]}</span><span>${state.myIndex===0 ? state.myScore : state.oppScore} ${t('pts_label')}</span></div>`;
  body += `<div class="round-score-row"><span>${playerNames[1]}</span><span>${state.myIndex===1 ? state.myScore : state.oppScore} ${t('pts_label')}</span></div>`;

  $('round-result-body').innerHTML = body;

  // Both players can click next round — server handles coordination by accepting the event
  show('overlay-round');
}

/* ── Game End ────────────────────────────────────────────────────────────────── */
function showGameEnd(state) {
  const myScore = state.myScore;
  const oppScore = state.oppScore;
  const p0Name = playerNames[0] || 'Player 1';
  const p1Name = playerNames[1] || 'Player 2';
  const p0Score = state.myIndex === 0 ? myScore : oppScore;
  const p1Score = state.myIndex === 1 ? myScore : oppScore;
  const history = state.roundHistory || [];

  let splashText = 'DRAW';
  let splashClass = 'draw';
  if (myScore > oppScore) {
    splashText = 'YOU WIN';
    splashClass = 'win';
  } else if (oppScore > myScore) {
    splashText = 'GAME OVER';
    splashClass = 'lose';
  } else {
    splashText = 'DRAW GAME';
    splashClass = 'draw';
  }

  const roundsRows = history.map(h => `
    <tr>
      <td>${h.round}</td>
      <td>${h.p0Delta}</td>
      <td>${h.p1Delta}</td>
    </tr>`).join('');

  $('game-result-title').textContent = 'Final Scores';
  $('game-result-body').innerHTML = `
    <table class="game-score-table">
      <thead>
        <tr>
          <th>Round</th>
          <th>${p0Name}</th>
          <th>${p1Name}</th>
        </tr>
      </thead>
      <tbody>
        ${roundsRows || `<tr><td colspan="3">No rounds</td></tr>`}
      </tbody>
    </table>
    <div class="game-score-total">
      <div><span class="name">${p0Name}</span><span class="val">${p0Score} ${t('pts_label')}</span></div>
      <div><span class="name">${p1Name}</span><span class="val">${p1Score} ${t('pts_label')}</span></div>
    </div>
  `;

  const splashWrap = $('game-result-splash-wrap');
  const splash = $('game-result-splash');
  const hint = $('game-result-continue');
  const titleEl = $('game-result-title');
  const bodyEl = $('game-result-body');
  const btn = $('btn-play-again');
  const box = $('overlay-game-box');

  splash.textContent = splashText;
  splash.className = `game-result-splash ${splashClass}`;
  if (splashWrap) splashWrap.classList.remove('hidden');
  if (hint) hint.classList.remove('hidden');
  if (titleEl) titleEl.classList.add('hidden');
  if (bodyEl) bodyEl.classList.add('hidden');
  if (btn) btn.classList.add('hidden');
  if (box) box.classList.add('awaiting-reveal');
  gameEndRevealArmedAt = Date.now() + 280;

  if (box) {
    box.onclick = (e) => {
      if (e.target && e.target.id === 'btn-play-again') return;
      if (Date.now() < gameEndRevealArmedAt) return;
      if (!box.classList.contains('awaiting-reveal')) return;
      box.classList.remove('awaiting-reveal');
      if (splashWrap) splashWrap.classList.add('hidden');
      if (titleEl) titleEl.classList.remove('hidden');
      if (bodyEl) bodyEl.classList.remove('hidden');
      if (btn) btn.classList.remove('hidden');
    };
  }

  show('overlay-game');
}

/* ── Deck Reveal ─────────────────────────────────────────────────────────────── */
function showDeckReveal(card) {
  const wrap = $('drawn-card-reveal');
  const imgEl = $('drawn-card-img');
  const nameEl = $('drawn-card-name');

  // Build card element with flip animation
  imgEl.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'card deck-flip-card';
  const img = document.createElement('img');
  img.src = `hanafuda_cards/${encodeURIComponent(card.file)}`;
  img.alt = currentLang === 'jp' ? card.nameJp : card.nameEn;
  div.appendChild(img);
  imgEl.appendChild(div);

  if (nameEl) nameEl.textContent = currentLang === 'jp' ? card.nameJp : card.nameEn;

  wrap.classList.remove('hidden');

  // Auto-hide after animation
  if (deckRevealTimer) clearTimeout(deckRevealTimer);
  deckRevealTimer = setTimeout(() => {
    wrap.classList.add('hidden');
    deckRevealTimer = null;
  }, 1400);
}

/* ── Init ────────────────────────────────────────────────────────────────────── */
applyTranslations();
updateRulesContent();
