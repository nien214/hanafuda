/* ── Socket & State ───────────────────────────────────────────────────────────── */
const socket = io();
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
let queuedFlyAnimations = [];
let pendingDeckDrawCard = null;
let pendingFieldRevealAt = new Map();
let pendingFieldRevealTimer = null;
let pendingCaptureRevealAt = new Map();
let pendingCaptureRevealTimer = null;
let fieldCardLastRects = new Map();
let fieldSlots        = [];   // ordered slot array: card id or null (captured placeholder)
let lastHandIds       = new Set();
let animationBusyUntil = 0;
let phaseOverlayTimer = null;
let koikoiPanelTimer = null;

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

  // AI thinking indicator
  if (isAiTurn && state.phase !== 'round-end' && state.phase !== 'game-end') {
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
  renderField(s);
  renderMyHand(s);
  renderOppHand(s);
  renderCaptures(s);
}

/* ── Field ───────────────────────────────────────────────────────────────────── */
function renderField(s) {
  const el = $('field');
  const newFieldIds = new Set(s.field.map(c => c.id));
  const now = Date.now();
  for (const [id, ts] of pendingFieldRevealAt.entries()) {
    if (ts <= now || !newFieldIds.has(id)) pendingFieldRevealAt.delete(id);
  }
  el.innerHTML = '';
  fieldCardLastRects = new Map();

  // Initialize slots on first render of a round (queueStateAnimations returned early for first state)
  if (fieldSlots.length === 0) {
    fieldSlots = s.field.map(c => c.id);
  }

  const cardMap = new Map(s.field.map(c => [c.id, c]));

  fieldSlots.forEach(slotId => {
    if (slotId === null) {
      // Invisible placeholder — preserves the grid cell so other cards don't shift
      const ph = document.createElement('div');
      ph.className = 'card field-card field-placeholder';
      el.appendChild(ph);
      return;
    }
    const card = cardMap.get(slotId);
    if (!card) return; // safety: slot id not in current state

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

/* ── My Hand ─────────────────────────────────────────────────────────────────── */
function renderMyHand(s) {
  const el = $('player-hand');
  el.innerHTML = '';
  const isMyTurn = s.currentPlayer === myIndex && s.phase === 'hand-play';
  const newHandIds = new Set(s.myHand.map(c => c.id));

  s.myHand.forEach(card => {
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
    img.src = '/hanafuda_cards/unfold.png';
    img.alt = 'card back';
    div.appendChild(img);
    el.appendChild(div);
  }
}

/* ── Deck Pile ───────────────────────────────────────────────────────────────── */
function renderDeckPile(s) {
  const badge = $('deck-pile-count');
  if (badge) badge.textContent = s.stockCount;

  const layer3 = document.querySelector('.deck-layer-3');
  const layer2 = document.querySelector('.deck-layer-2');
  const layer1 = document.querySelector('.deck-layer-1');
  if (layer3) layer3.style.display = s.stockCount > 4 ? '' : 'none';
  if (layer2) layer2.style.display = s.stockCount > 1 ? '' : 'none';
  if (layer1) layer1.style.display = s.stockCount > 0 ? '' : 'none';
}

/* ── Captures ────────────────────────────────────────────────────────────────── */
function renderCaptures(s) {
  const newIds = new Set([...s.myCapture, ...s.oppCapture].map(c => c.id));
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
  ['hikari', 'tanzaku', 'tane', 'kasu'].forEach(type => {
    renderTypeRow('my-cap-'  + type, s.myCapture.filter(c => c.type === type),  lastCaptureIds);
    renderTypeRow('opp-cap-' + type, s.oppCapture.filter(c => c.type === type), lastCaptureIds);
  });

  lastCaptureIds = newIds;
}

function renderTypeRow(elId, cards, prevIds) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = '';
  cards.forEach(card => {
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
    img.src = `/hanafuda_cards/${encodeURIComponent(card.file)}`;
    img.alt = card.nameEn;
    img.title = currentLang === 'jp' ? card.nameJp : card.nameEn;
    div.appendChild(img);
    el.appendChild(div);
  });
}

function isCaptureCardPendingReveal(cardId) {
  const revealAt = pendingCaptureRevealAt.get(cardId);
  return !!revealAt && revealAt > Date.now();
}

function scheduleCaptureRevealAt(cardId, absoluteMs) {
  if (cardId === null || cardId === undefined) return;
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
  img.src = `/hanafuda_cards/${encodeURIComponent(card.file)}`;
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
    lastHandIds = new Set();
    fieldSlots = next.field.map(c => c.id);
    return;
  }
  if (prev.phase === 'round-end' || prev.phase === 'game-end') return;

  const prevFieldIds = new Set(prev.field.map(c => c.id));
  const addedFieldCards = next.field.filter(c => !prevFieldIds.has(c.id));
  const removedFieldCards = prev.field.filter(c => !next.field.find(nc => nc.id === c.id));
  const preferredTargetId = addedFieldCards.length ? addedFieldCards[0].id : null;
  const addedFieldCardIds = new Set(addedFieldCards.map(c => c.id));
  // Per-sequence field card assignment: each capture sequence claims the field card
  // whose month matches the played card's month. This correctly separates which
  // field card belongs to the player's play vs. the deck draw when both happen
  // in the same state update and each captures a different field card.
  const _assignedFieldCardIds = new Set();
  function pickFieldCard(month) {
    let card = month != null
      ? removedFieldCards.find(c => c.month === month && !_assignedFieldCardIds.has(c.id))
      : null;
    // Fallback: any remaining unassigned removed field card
    if (!card) card = removedFieldCards.find(c => !_assignedFieldCardIds.has(c.id)) || null;
    if (card) _assignedFieldCardIds.add(card.id);
    return card;
  }
  function fieldCardProps(card) {
    return {
      touchFieldCardId: card != null ? card.id : null,
      touchFieldCardImageSrc: card ? `/hanafuda_cards/${encodeURIComponent(card.file)}` : null,
      touchRect: card ? (fieldCardLastRects.get(card.id) || null) : null,
    };
  }

  // Maintain slot positions: mark captured cards as null (preserve grid holes),
  // then place newly arrived cards into the first empty slot (reusing captured positions)
  // so new cards never push beyond row 2 unless rows 1–2 are fully occupied.
  const nextFieldIds = new Set(next.field.map(c => c.id));
  fieldSlots = fieldSlots.map(id => (id !== null && !nextFieldIds.has(id)) ? null : id);
  addedFieldCards.forEach(c => {
    const emptyIdx = fieldSlots.indexOf(null);
    if (emptyIdx !== -1) {
      fieldSlots[emptyIdx] = c.id;  // reuse the freed slot
    } else {
      fieldSlots.push(c.id);        // no empty slot — extend to row 3+
    }
  });

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
        const fc = pickFieldCard(removed.month);
        const fcp = fieldCardProps(fc);
        queueCaptureSequence({
          sourceRect: pendingLocalPlayFromRect,
          sourceRectFallbackSelector: '#field',
          imageSrc: pendingLocalPlayImageSrc || `/hanafuda_cards/${encodeURIComponent(removed.file)}`,
          capturedCardId: removed.id,
          revealCardIds: [removed.id, fcp.touchFieldCardId].filter(id => id != null && newMyCapturedCards.some(c => c.id === id)),
          ...fcp,
          delayBaseMs: timelineMs
        });
        timelineMs += 1120;
      } else {
        const myPlayedLandedId = addedFieldCardIds.has(removed.id) ? removed.id : preferredTargetId;
        if (addedFieldCardIds.has(myPlayedLandedId)) scheduleFieldReveal(myPlayedLandedId, timelineMs, 1300);
        queueFlyFromSource(null, {
          fromRect: pendingLocalPlayFromRect,
          imageSrc: pendingLocalPlayImageSrc || `/hanafuda_cards/${encodeURIComponent(removed.file)}`,
          targetCardId: myPlayedLandedId,
          revealFieldCardId: addedFieldCardIds.has(myPlayedLandedId) ? myPlayedLandedId : null,
          delayBaseMs: timelineMs,
          durationMs: 1300
        });
        timelineMs += 1500;
      }
      pendingLocalPlayFromRect = null;
      pendingLocalPlayImageSrc = null;
    } else {
      const srcEl = document.querySelector(`#player-hand .card[data-card-id="${removed.id}"]`);
      if (nextMyCaptureIds.has(removed.id)) {
        const fc = pickFieldCard(removed.month);
        const fcp = fieldCardProps(fc);
        queueCaptureSequence({
          sourceEl: srcEl,
          imageSrc: `/hanafuda_cards/${encodeURIComponent(removed.file)}`,
          capturedCardId: removed.id,
          revealCardIds: [removed.id, fcp.touchFieldCardId].filter(id => id != null && newMyCapturedCards.some(c => c.id === id)),
          ...fcp,
          delayBaseMs: timelineMs
        });
        timelineMs += 1120;
      } else {
        const myPlayedLandedId = addedFieldCardIds.has(removed.id) ? removed.id : preferredTargetId;
        if (addedFieldCardIds.has(myPlayedLandedId)) scheduleFieldReveal(myPlayedLandedId, timelineMs, 1300);
        queueFlyFromSource(srcEl, {
          imageSrc: `/hanafuda_cards/${encodeURIComponent(removed.file)}`,
          targetCardId: myPlayedLandedId,
          revealFieldCardId: addedFieldCardIds.has(myPlayedLandedId) ? myPlayedLandedId : null,
          delayBaseMs: timelineMs,
          durationMs: 1300
        });
        timelineMs += 1500;
      }
    }
  } else if (pendingLocalPlayCardId !== null) {
    pendingLocalPlayCardId = null;
    pendingLocalPlayFromRect = null;
    pendingLocalPlayImageSrc = null;
  }

  if (prev.oppHandCount === next.oppHandCount + 1) {
    const srcEl = document.querySelector('#opp-hand .card:last-child');
    const oppPlayedCaptured = nextOppCaptureIds.size > prev.oppCapture.length;
    if (oppPlayedCaptured) {
      const newlyCapturedCards = newOppCapturedCards;
      const newlyCaptured = newlyCapturedCards[0];
      const fc = pickFieldCard(oppPlayedCard ? oppPlayedCard.month : null);
      const fcp = fieldCardProps(fc);
      // Reveal opponent's card face-up from the moment it leaves their hand
      const oppFaceImg = oppPlayedCard
        ? `/hanafuda_cards/${encodeURIComponent(oppPlayedCard.file)}`
        : '/hanafuda_cards/unfold.png';
      queueCaptureSequence({
        sourceEl: srcEl,
        imageSrc: oppFaceImg,
        capturedCardId: newlyCaptured ? newlyCaptured.id : null,
        revealCardIds: newlyCapturedCards.map(c => c.id),
        ...fcp,
        delayBaseMs: timelineMs
      });
      timelineMs += 1320;
    } else {
      const oppFieldCard = oppPlayedCard;
      const oppFieldTargetId = oppFieldCard ? oppFieldCard.id : preferredTargetId;
      if (addedFieldCardIds.has(oppFieldTargetId)) scheduleFieldReveal(oppFieldTargetId, timelineMs, 1120);
      // Reveal opponent's card face-up from the moment it leaves their hand
      const oppFaceImg = oppFieldCard
        ? `/hanafuda_cards/${encodeURIComponent(oppFieldCard.file)}`
        : '/hanafuda_cards/unfold.png';
      queueFlyFromSource(srcEl, {
        imageSrc: oppFaceImg,
        targetCardId: oppFieldTargetId,
        revealFieldCardId: addedFieldCardIds.has(oppFieldTargetId) ? oppFieldTargetId : null,
        delayBaseMs: timelineMs,
        durationMs: 1120
      });
      timelineMs += 1320;
    }
  }

  if (prev.stockCount === next.stockCount + 1) {
    const drawnLandedOnField = drawnCardId !== null && addedFieldCardIds.has(drawnCardId);
    const drawnCapturedMy = drawnCardId !== null && nextMyCaptureIds.has(drawnCardId);
    const drawnCapturedOpp = drawnCardId !== null && nextOppCaptureIds.has(drawnCardId);
    const srcEl = document.querySelector('.deck-layer-1');
    const drawnImage = pendingDeckDrawCard
      ? `/hanafuda_cards/${encodeURIComponent(pendingDeckDrawCard.file)}`
      : '/hanafuda_cards/unfold.png';
    if (drawnLandedOnField) {
      if (drawnCardId) scheduleFieldReveal(drawnCardId, timelineMs, 1250);
      queueFlyFromSource(srcEl, {
        imageSrc: '/hanafuda_cards/unfold.png',
        frontImageSrc: drawnImage,
        targetCardId: drawnCardId,
        targetSelector: '#field',
        revealFieldCardId: drawnCardId,
        flip: true,
        durationMs: 1250,
        delayBaseMs: timelineMs
      });
      timelineMs += 1460;
    } else if (drawnCapturedMy || drawnCapturedOpp) {
      const fc = pickFieldCard(pendingDeckDrawCard ? pendingDeckDrawCard.month : null);
      const fcp = fieldCardProps(fc);
      queueCaptureSequence({
        sourceEl: srcEl,
        imageSrc: '/hanafuda_cards/unfold.png',
        frontImageSrc: drawnImage,
        flipOnFirstLeg: true,
        capturedCardId: drawnCardId,
        revealCardIds: (drawnCapturedMy ? newMyCapturedCards : newOppCapturedCards).map(c => c.id),
        ...fcp,
        delayBaseMs: timelineMs
      });
      timelineMs += 1580;
    } else {
      if (drawnCardId) scheduleFieldReveal(drawnCardId, timelineMs, 1250);
      queueFlyFromSource(srcEl, {
        imageSrc: '/hanafuda_cards/unfold.png',
        frontImageSrc: drawnImage,
        targetCardId: drawnCardId,
        targetSelector: '#field',
        revealFieldCardId: drawnCardId,
        flip: true,
        durationMs: 1250,
        delayBaseMs: timelineMs
      });
      timelineMs += 1460;
    }
    pendingDeckDrawCard = null;
  }
}

function queueFlyFromSource(srcEl, opts = {}) {
  const r = opts.fromRect || (srcEl ? srcEl.getBoundingClientRect() : null);
  if (!r) return;
  queuedFlyAnimations.push({
    fromRect: { left: r.left, top: r.top, width: r.width, height: r.height },
    imageSrc: opts.imageSrc || '/hanafuda_cards/unfold.png',
    frontImageSrc: opts.frontImageSrc || null,
    targetCardId: opts.targetCardId ?? null,
    targetSelector: opts.targetSelector || '#field',
    targetElementSelector: opts.targetElementSelector || null,
    toRect: opts.toRect || null,
    flip: !!opts.flip,
    scaleToTarget: !!opts.scaleToTarget,
    revealCaptureCardIds: opts.revealCaptureCardIds || null,
    revealFieldCardId: opts.revealFieldCardId || null,
    durationMs: opts.durationMs || 500,
    delayMs: (opts.delayBaseMs || 0) + (opts.delayMs ?? 0)
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

  const firstDuration = 760;
  const secondDuration = 980;
  const delayBase = opts.delayBaseMs || 0;
  const revealIds = (opts.revealCardIds && opts.revealCardIds.length)
    ? opts.revealCardIds
    : [opts.capturedCardId];

  // Preliminary hiding: mark captured cards as pending BEFORE renderAll runs, so
  // renderCaptures gives them pending-cap-hidden (they won't pop in early).
  // playQueuedAnimations will override with the accurate absolute time.
  const preliminaryTotalMs = delayBase + firstDuration + 80 + secondDuration;
  revealIds.forEach(id => scheduleCaptureReveal(id, 0, preliminaryTotalMs));

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

  // Leg 2a: played card travels from field card position → its capture slot
  queueFlyFromSource(null, {
    fromRect: touchRect,
    imageSrc: opts.frontImageSrc || opts.imageSrc,
    targetElementSelector: `.cap-card[data-card-id="${opts.capturedCardId}"]`,
    scaleToTarget: true,
    revealCaptureCardIds: revealIds,
    durationMs: secondDuration,
    delayMs: delayBase + firstDuration + 80
  });

  // Leg 2b: matched field card also travels from its position → its own capture slot
  // (runs concurrently with 2a — same delayMs so both start together)
  if (opts.touchFieldCardImageSrc && opts.touchFieldCardId != null) {
    queueFlyFromSource(null, {
      fromRect: touchRect,
      imageSrc: opts.touchFieldCardImageSrc,
      targetElementSelector: `.cap-card[data-card-id="${opts.touchFieldCardId}"]`,
      scaleToTarget: true,
      durationMs: secondDuration,
      delayMs: delayBase + firstDuration + 80
    });
  }
}

function playQueuedAnimations() {
  if (queuedFlyAnimations.length === 0) return;
  const items = queuedFlyAnimations.slice();
  queuedFlyAnimations = [];
  items.sort((a, b) => (a.delayMs || 0) - (b.delayMs || 0));

  // Process in groups of items that share the same requested delay.
  // Items within a group start at the same time (concurrent); the cursor
  // only advances by the longest animation in each group so shorter
  // concurrent animations never push later groups backward.
  let cursor = 0;
  let maxEnd = Date.now();
  let i = 0;
  while (i < items.length) {
    const groupDelay = items[i].delayMs || 0;
    let j = i;
    while (j < items.length && (items[j].delayMs || 0) === groupDelay) j++;
    const group = items.slice(i, j);

    const startAt = Math.max(cursor, groupDelay);
    let maxGroupDuration = 0;
    group.forEach(item => {
      setTimeout(() => animateFlyCard(item), startAt);
      const endAt = Date.now() + startAt + (item.durationMs || 500);
      if (item.revealCaptureCardIds && item.revealCaptureCardIds.length) {
        item.revealCaptureCardIds.forEach(cardId => scheduleCaptureRevealAt(cardId, endAt + 100));
      }
      if (item.revealFieldCardId) {
        scheduleFieldRevealAbsolute(item.revealFieldCardId, endAt + 90);
      }
      if (endAt > maxEnd) maxEnd = endAt;
      maxGroupDuration = Math.max(maxGroupDuration, item.durationMs || 500);
    });
    cursor = startAt + maxGroupDuration + 180;
    i = j;
  }
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
    const img = document.createElement('img');
    img.src = item.imageSrc;
    img.alt = '';
    fly.appendChild(img);
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

  setTimeout(() => fly.remove(), duration + 40);
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

/* ── Status ──────────────────────────────────────────────────────────────────── */
function setStatus(msg) {
  $('status-msg').textContent = msg;
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
    pendingLocalPlayImageSrc = img ? img.src : '/hanafuda_cards/unfold.png';
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
    const koiRows = state.koiKoiCalled || [false, false];
    body += `<div class="round-score-row"><span>${winnerName}</span><span>+${pts} ${t('pts_label')}</span></div>`;
    if (koiRows[win]) body += `<div class="round-score-row"><span>${t('koiKoiDoubled')}</span><span></span></div>`;
    if (koiRows[1-win]) body += `<div class="round-score-row"><span>${t('oppKoiBonus')}</span><span></span></div>`;
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

  if (box) {
    box.onclick = (e) => {
      if (e.target && e.target.id === 'btn-play-again') return;
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
  img.src = `/hanafuda_cards/${encodeURIComponent(card.file)}`;
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
