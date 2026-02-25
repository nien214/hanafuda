const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/hanafuda_cards', express.static(path.join(__dirname, 'hanafuda_cards')));

// ─── Card Data ────────────────────────────────────────────────────────────────
const CARDS = [
  // Month 1 — Pine
  { id:0,  month:1,  type:'hikari',  points:20, nameEn:'Pine with Crane',              nameJp:'松に鶴',       file:'01_Pine with Crane.png' },
  { id:1,  month:1,  type:'tanzaku', points:5,  ribbonType:'akatan', nameEn:'Pine with Poetry Ribbon', nameJp:'松に短冊', file:'01_Pine with Poetry Ribbon.png' },
  { id:2,  month:1,  type:'kasu',    points:1,  nameEn:'Pine Chaff 1',                 nameJp:'松の滓1',      file:'01_Pine Chaff 1.png' },
  { id:3,  month:1,  type:'kasu',    points:1,  nameEn:'Pine Chaff 2',                 nameJp:'松の滓2',      file:'01_Pine Chaff 2.png' },
  // Month 2 — Plum
  { id:4,  month:2,  type:'tane',    points:10, nameEn:'Plum with Bush Warbler',       nameJp:'梅に鶯',       file:'02_Plum Blossoms with Bush Warbler.png' },
  { id:5,  month:2,  type:'tanzaku', points:5,  ribbonType:'akatan', nameEn:'Plum with Poetry Ribbon', nameJp:'梅に短冊', file:'02_Plum Blossoms with Poetry Ribbon.png' },
  { id:6,  month:2,  type:'kasu',    points:1,  nameEn:'Plum Chaff 1',                 nameJp:'梅の滓1',      file:'02_Plum Blossoms Chaff 1.png' },
  { id:7,  month:2,  type:'kasu',    points:1,  nameEn:'Plum Chaff 2',                 nameJp:'梅の滓2',      file:'02_Plum Blossoms Chaff 2.png' },
  // Month 3 — Cherry Blossom
  { id:8,  month:3,  type:'hikari',  points:20, nameEn:'Cherry Blossom Curtain',       nameJp:'桜に幕',       file:'03_Cherry Blossoms with Curtain.png' },
  { id:9,  month:3,  type:'tanzaku', points:5,  ribbonType:'akatan', nameEn:'Cherry with Poetry Ribbon', nameJp:'桜に短冊', file:'03_Cherry Blossoms with Poetry Ribbon.png' },
  { id:10, month:3,  type:'kasu',    points:1,  nameEn:'Cherry Chaff 1',               nameJp:'桜の滓1',      file:'03_Cherry Blossoms Chaff 1.png' },
  { id:11, month:3,  type:'kasu',    points:1,  nameEn:'Cherry Chaff 2',               nameJp:'桜の滓2',      file:'03_Cherry Blossoms Chaff 2.png' },
  // Month 4 — Wisteria
  { id:12, month:4,  type:'tane',    points:10, nameEn:'Wisteria with Cuckoo',         nameJp:'藤に不如帰',   file:'04_Wisteria with Cuckoo.png' },
  { id:13, month:4,  type:'tanzaku', points:5,  ribbonType:'plain',  nameEn:'Wisteria with Ribbon',     nameJp:'藤に短冊',   file:'04_Wisteria with Ribbon.png' },
  { id:14, month:4,  type:'kasu',    points:1,  nameEn:'Wisteria Chaff 1',             nameJp:'藤の滓1',      file:'04_Wisteria Chaff 1.png' },
  { id:15, month:4,  type:'kasu',    points:1,  nameEn:'Wisteria Chaff 2',             nameJp:'藤の滓2',      file:'04_Wisteria Chaff 2.png' },
  // Month 5 — Iris
  { id:16, month:5,  type:'tane',    points:10, nameEn:'Iris with Eight-Plank Bridge', nameJp:'菖蒲に八橋',   file:'05_Iris with Eight-Plank Bridge.png' },
  { id:17, month:5,  type:'tanzaku', points:5,  ribbonType:'plain',  nameEn:'Iris with Ribbon',         nameJp:'菖蒲に短冊', file:'05_Iris with Ribbon.png' },
  { id:18, month:5,  type:'kasu',    points:1,  nameEn:'Iris Chaff 1',                 nameJp:'菖蒲の滓1',    file:'05_Iris Chaff 1.png' },
  { id:19, month:5,  type:'kasu',    points:1,  nameEn:'Iris Chaff 2',                 nameJp:'菖蒲の滓2',    file:'05_Iris Chaff 2.png' },
  // Month 6 — Peony
  { id:20, month:6,  type:'tane',    points:10, nameEn:'Peony with Butterflies',       nameJp:'牡丹に蝶',     file:'06_Peony with Butterflies.png' },
  { id:21, month:6,  type:'tanzaku', points:5,  ribbonType:'aotan',  nameEn:'Peony with Blue Ribbon',   nameJp:'牡丹に短冊', file:'06_Peony with Blue Ribbon.png' },
  { id:22, month:6,  type:'kasu',    points:1,  nameEn:'Peony Chaff 1',                nameJp:'牡丹の滓1',    file:'06_Peony Chaff 1.png' },
  { id:23, month:6,  type:'kasu',    points:1,  nameEn:'Peony Chaff 2',                nameJp:'牡丹の滓2',    file:'06_Peony Chaff 2.png' },
  // Month 7 — Bush Clover
  { id:24, month:7,  type:'tane',    points:10, nameEn:'Bush Clover with Boar',        nameJp:'萩に猪',       file:'07_Bush Clover with Boar.png' },
  { id:25, month:7,  type:'tanzaku', points:5,  ribbonType:'plain',  nameEn:'Bush Clover with Ribbon',  nameJp:'萩に短冊',   file:'07_Bush Clover with Ribbon.png' },
  { id:26, month:7,  type:'kasu',    points:1,  nameEn:'Bush Clover Chaff 1',          nameJp:'萩の滓1',      file:'07_Bush Clover Chaff 1.png' },
  { id:27, month:7,  type:'kasu',    points:1,  nameEn:'Bush Clover Chaff 2',          nameJp:'萩の滓2',      file:'07_Bush Clover Chaff 2.png' },
  // Month 8 — Susuki Grass
  { id:28, month:8,  type:'hikari',  points:20, nameEn:'Susuki with Moon',             nameJp:'芒に月',       file:'08_Susuki Grass with Moon.png' },
  { id:29, month:8,  type:'tane',    points:10, nameEn:'Susuki with Geese',            nameJp:'芒に雁',       file:'08_Susuki Grass with Geese.png' },
  { id:30, month:8,  type:'kasu',    points:1,  nameEn:'Susuki Chaff 1',               nameJp:'芒の滓1',      file:'08_Susuki Grass Chaff 1.png' },
  { id:31, month:8,  type:'kasu',    points:1,  nameEn:'Susuki Chaff 2',               nameJp:'芒の滓2',      file:'08_Susuki Grass Chaff 2.png' },
  // Month 9 — Chrysanthemum
  { id:32, month:9,  type:'tane',    points:10, isSakeCup:true, nameEn:'Chrysanthemum with Sake Cup', nameJp:'菊に盃', file:'09_Chrysanthemum with Sake Cup.png' },
  { id:33, month:9,  type:'tanzaku', points:5,  ribbonType:'aotan', nameEn:'Chrysanthemum with Blue Ribbon', nameJp:'菊に短冊', file:'09_Chrysanthemum with Blue Ribbon.png' },
  { id:34, month:9,  type:'kasu',    points:1,  nameEn:'Chrysanthemum Chaff 1',        nameJp:'菊の滓1',      file:'09_Chrysanthemum Chaff 1.png' },
  { id:35, month:9,  type:'kasu',    points:1,  nameEn:'Chrysanthemum Chaff 2',        nameJp:'菊の滓2',      file:'09_Chrysanthemum Chaff 2.png' },
  // Month 10 — Maple
  { id:36, month:10, type:'tane',    points:10, nameEn:'Maple with Deer',              nameJp:'紅葉に鹿',     file:'10_Maple with Deer.png' },
  { id:37, month:10, type:'tanzaku', points:5,  ribbonType:'aotan', nameEn:'Maple with Blue Ribbon',   nameJp:'紅葉に短冊', file:'10_Maple with Blue Ribbon.png' },
  { id:38, month:10, type:'kasu',    points:1,  nameEn:'Maple Chaff 1',                nameJp:'紅葉の滓1',    file:'10_Maple Chaff 1.png' },
  { id:39, month:10, type:'kasu',    points:1,  nameEn:'Maple Chaff 2',                nameJp:'紅葉の滓2',    file:'10_Maple Chaff 2.png' },
  // Month 11 — Willow
  { id:40, month:11, type:'hikari',  points:20, isRainMan:true, nameEn:'Willow (Rain Man)', nameJp:'柳に小野道風', file:'11_Willow with Ono no Michikaze.png' },
  { id:41, month:11, type:'tane',    points:10, nameEn:'Willow with Swallow',          nameJp:'柳に燕',       file:'11_Willow with Swallow.png' },
  { id:42, month:11, type:'tanzaku', points:5,  ribbonType:'plain', nameEn:'Willow with Ribbon',       nameJp:'柳に短冊',   file:'11_Willow with Ribbon.png' },
  { id:43, month:11, type:'kasu',    points:1,  nameEn:'Willow Chaff',                 nameJp:'柳の滓',       file:'11_Willow Chaff.png' },
  // Month 12 — Paulownia
  { id:44, month:12, type:'hikari',  points:20, nameEn:'Paulownia with Phoenix',       nameJp:'桐に鳳凰',     file:'12_Paulownia with Phoenix.png' },
  { id:45, month:12, type:'kasu',    points:1,  nameEn:'Paulownia Chaff 1',            nameJp:'桐の滓1',      file:'12_Paulownia Chaff 1.png' },
  { id:46, month:12, type:'kasu',    points:1,  nameEn:'Paulownia Chaff 2',            nameJp:'桐の滓2',      file:'12_Paulownia Chaff 2.png' },
  { id:47, month:12, type:'kasu',    points:1,  nameEn:'Paulownia Chaff 3',            nameJp:'桐の滓3',      file:'12_Paulownia Chaff 3.png' },
];

// ─── Pure Game Logic ──────────────────────────────────────────────────────────
function createDeck() {
  return CARDS.map(c => ({ ...c }));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function deal(deck) {
  const d = shuffle(deck);
  return {
    p0Hand: d.slice(0, 8),
    p1Hand: d.slice(8, 16),
    field:  d.slice(16, 24),
    stock:  d.slice(24),
  };
}

function checkTeyaku(hand) {
  const counts = {};
  hand.forEach(c => { counts[c.month] = (counts[c.month] || 0) + 1; });
  const vals = Object.values(counts);
  if (vals.some(v => v === 4)) return 'teshi';
  if (vals.length === 4 && vals.every(v => v === 2)) return 'kuttsuki';
  return null;
}

function fieldHasFourOfMonth(field) {
  const counts = {};
  field.forEach(c => { counts[c.month] = (counts[c.month] || 0) + 1; });
  return Object.values(counts).some(v => v === 4);
}

function getMatches(card, field) {
  return field.filter(f => f.month === card.month);
}

function calculateYaku(captured) {
  const yaku = [];
  const hikari   = captured.filter(c => c.type === 'hikari');
  const tane     = captured.filter(c => c.type === 'tane');
  const tanzaku  = captured.filter(c => c.type === 'tanzaku');
  const kasu     = captured.filter(c => c.type === 'kasu');

  const hasCard  = id => captured.some(c => c.id === id);

  // Brights
  if (hikari.length >= 5) {
    yaku.push({ key:'goko',     nameEn:'Five Brights',       nameJp:'五光',    pts:15 });
  } else if (hikari.length === 4) {
    if (hikari.some(c => c.isRainMan)) {
      yaku.push({ key:'ameshiko', nameEn:'Rainy Four Brights', nameJp:'雨四光', pts:7 });
    } else {
      yaku.push({ key:'shiko',  nameEn:'Four Brights',        nameJp:'四光',   pts:8 });
    }
  } else if (hikari.length === 3 && !hikari.some(c => c.isRainMan)) {
    yaku.push({ key:'sanko',   nameEn:'Three Brights',       nameJp:'三光',    pts:5 });
  }

  // Viewing yaku
  if (hasCard(8) && hasCard(32)) {
    yaku.push({ key:'hanami',  nameEn:'Flower Viewing',      nameJp:'花見酒',  pts:5 });
  }
  if (hasCard(28) && hasCard(32)) {
    yaku.push({ key:'tsukimi', nameEn:'Moon Viewing',        nameJp:'月見酒',  pts:5 });
  }

  // Ino-Shika-Cho
  if (hasCard(24) && hasCard(36) && hasCard(20)) {
    const extra = tane.length - 3;
    yaku.push({ key:'isc',     nameEn:'Boar-Deer-Butterfly', nameJp:'猪鹿蝶', pts: 5 + Math.max(0, extra) });
  }

  // Akatan
  if (hasCard(1) && hasCard(5) && hasCard(9)) {
    const extra = tanzaku.length - 3;
    yaku.push({ key:'akatan',  nameEn:'Red Poetry Ribbons',  nameJp:'赤短',    pts: 5 + Math.max(0, extra) });
  }

  // Aotan
  if (hasCard(21) && hasCard(33) && hasCard(37)) {
    const extra = tanzaku.length - 3;
    yaku.push({ key:'aotan',   nameEn:'Blue Ribbons',        nameJp:'青短',    pts: 5 + Math.max(0, extra) });
  }

  // Tane (5+)
  if (tane.length >= 5) {
    yaku.push({ key:'tane',    nameEn:'Five Animals',        nameJp:'タネ',    pts: tane.length - 4 });
  }

  // Tanzaku (5+)
  if (tanzaku.length >= 5) {
    yaku.push({ key:'tanzaku', nameEn:'Five Ribbons',        nameJp:'短冊',    pts: tanzaku.length - 4 });
  }

  // Kasu (10+)
  const kasuCount = kasu.length + (hasCard(32) ? 1 : 0); // sake cup counts double
  if (kasuCount >= 10) {
    yaku.push({ key:'kasu',    nameEn:'Ten Plains',          nameJp:'カス',    pts: kasuCount - 9 });
  }

  return yaku;
}

function totalYakuScore(yaku) {
  return yaku.reduce((s, y) => s + y.pts, 0);
}

function yakuKeys(yaku) {
  return yaku.map(y => y.key + y.pts).sort().join(',');
}

// ─── Room & Game State ────────────────────────────────────────────────────────
const rooms = new Map();

function createGameState(totalRounds) {
  const deck = createDeck();
  const { p0Hand, p1Hand, field, stock } = deal(deck);
  return {
    totalRounds,
    roundNumber: 1,
    dealer: 0,
    field,
    stock,
    players: [
      { hand: p0Hand, captured: [], score: 0 },
      { hand: p1Hand, captured: [], score: 0 },
    ],
    currentPlayer: 1, // non-dealer goes first
    phase: 'hand-play', // hand-play | capture-choice | await-deck-flip | koi-koi-decision | round-end | game-end
    drawnCard: null,
    pendingCard: null,       // card just played from hand or drawn
    pendingMatches: [],      // field card ids player must choose between
    pendingPhase: null,      // 'hand' or 'deck'
    koiKoiCalled: [false, false],
    yakuSnapshot: ['', ''],  // last yaku key string for each player
    lastYaku: [[], []],
    roundWinner: null,
    roundPoints: 0,
    roundSummary: null,
    roundHistory: [],
  };
}

function startNewRound(gs) {
  const deck = createDeck();
  const { p0Hand, p1Hand, field, stock } = deal(deck);
  const dealer = gs.roundWinner !== null ? gs.roundWinner : gs.dealer;
  return {
    ...gs,
    roundNumber: gs.roundNumber + 1,
    dealer,
    field,
    stock,
    players: [
      { ...gs.players[0], hand: p0Hand, captured: [] },
      { ...gs.players[1], hand: p1Hand, captured: [] },
    ],
    currentPlayer: dealer === 0 ? 1 : 0,
    phase: 'hand-play',
    drawnCard: null,
    pendingCard: null,
    pendingMatches: [],
    pendingPhase: null,
    koiKoiCalled: [false, false],
    yakuSnapshot: ['', ''],
    lastYaku: [[], []],
    roundWinner: null,
    roundPoints: 0,
    roundSummary: null,
  };
}

// Sanitise state before sending to a specific player index
function stateForPlayer(gs, pi) {
  return {
    totalRounds: gs.totalRounds,
    roundNumber: gs.roundNumber,
    field: gs.field,
    stockCount: gs.stock.length,
    myIndex: pi,
    myHand: gs.players[pi].hand,
    myCapture: gs.players[pi].captured,
    myScore: gs.players[pi].score,
    oppHandCount: gs.players[1 - pi].hand.length,
    oppCapture: gs.players[1 - pi].captured,
    oppScore: gs.players[1 - pi].score,
    currentPlayer: gs.currentPlayer,
    phase: gs.phase,
    drawnCard: gs.drawnCard,
    pendingMatches: gs.pendingMatches,
    koiKoiCalled: gs.koiKoiCalled,
    lastYaku: gs.lastYaku,
    roundWinner: gs.roundWinner,
    roundPoints: gs.roundPoints,
    roundSummary: gs.roundSummary,
    roundHistory: gs.roundHistory,
  };
}

function broadcastState(room) {
  room.players.forEach((p, pi) => {
    if (p.socketId) {
      io.to(p.socketId).emit('game-state', stateForPlayer(room.gs, pi));
    }
  });
  if (room.isSolo) scheduleAiMove(room);
}

// ─── Move Processing ──────────────────────────────────────────────────────────
function processCapture(gs, playedCard, targetCard) {
  // Remove played card from appropriate source (it's already removed from hand/stock)
  // Remove target from field, add both to current player capture
  gs.field = gs.field.filter(c => c.id !== targetCard.id);
  gs.players[gs.currentPlayer].captured.push(playedCard, targetCard);
}

function processNoMatch(gs, playedCard) {
  gs.field.push(playedCard);
}

function captureAll(gs, playedCard, matches) {
  matches.forEach(m => { gs.field = gs.field.filter(c => c.id !== m.id); });
  gs.players[gs.currentPlayer].captured.push(playedCard, ...matches);
}

function afterCaptures(gs, room) {
  // Check for new yaku
  const pi = gs.currentPlayer;
  const yaku = calculateYaku(gs.players[pi].captured);
  const newKey = yakuKeys(yaku);
  const isNew = newKey !== gs.yakuSnapshot[pi] && yaku.length > 0;

  if (isNew) {
    gs.yakuSnapshot[pi] = newKey;
    gs.lastYaku[pi] = yaku;
    emitYakuAchieved(room, {
      playerIndex: pi,
      yaku,
      score: totalYakuScore(yaku),
    });
    // For solo AI, decide immediately so declaration/end-round cannot be skipped.
    if (room.isSolo && pi === AI_INDEX) {
      aiDoKoiKoi(gs, room);
      return;
    }
    gs.phase = 'koi-koi-decision';
    broadcastState(room);
  } else {
    // Terminal condition: if nobody formed a new yaku and all cards are exhausted,
    // finish as draw.
    if (
      gs.players[0].hand.length === 0 &&
      gs.players[1].hand.length === 0 &&
      gs.stock.length === 0
    ) {
      endRound(gs, room, null, 0);
      return;
    }
    endTurn(gs, room);
  }
}

function endTurn(gs, room) {
  // Check for exhausted deck and hands
  const p0 = gs.players[0];
  const p1 = gs.players[1];
  if (p0.hand.length === 0 && p1.hand.length === 0 && gs.stock.length === 0) {
    endRound(gs, room, null, 0);
    return;
  }
  gs.currentPlayer = 1 - gs.currentPlayer;
  gs.phase = 'hand-play';
  gs.drawnCard = null;
  gs.pendingCard = null;
  gs.pendingMatches = [];
  broadcastState(room);
}

function endRound(gs, room, winner, points) {
  let finalPts = 0;
  let p0Delta = 0;
  let p1Delta = 0;

  if (winner !== null) {
    finalPts = computeFinalRoundPoints(gs, winner, points);
    gs.players[winner].score += finalPts;
    gs.roundPoints = finalPts;
    if (winner === 0) p0Delta = finalPts;
    else p1Delta = finalPts;
  } else {
    gs.roundPoints = 0;
  }
  gs.roundWinner = winner;
  gs.roundSummary = {
    winner,
    pts: gs.roundPoints,
    p0Yaku: gs.lastYaku[0],
    p1Yaku: gs.lastYaku[1],
    koiKoiCalled: [...gs.koiKoiCalled],
  };
  gs.roundHistory.push({
    round: gs.roundNumber,
    winner,
    pts: gs.roundPoints,
    p0Delta,
    p1Delta,
    p0Total: gs.players[0].score,
    p1Total: gs.players[1].score,
  });

  if (gs.roundNumber >= gs.totalRounds) {
    gs.phase = 'game-end';
  } else {
    gs.phase = 'round-end';
  }
  broadcastState(room);
}

function shouldManualDeckFlip(gs, room) {
  const current = room.players[gs.currentPlayer];
  if (!current || !current.socketId) return false;
  // In solo mode, only human (index 0) flips manually.
  if (room.isSolo && gs.currentPlayer === AI_INDEX) return false;
  return true;
}

function beginDeckPhase(gs, room) {
  if (gs.stock.length === 0) {
    gs.drawnCard = null;
    gs.pendingCard = null;
    gs.pendingMatches = [];
    gs.pendingPhase = null;
    afterCaptures(gs, room);
    return;
  }
  if (shouldManualDeckFlip(gs, room)) {
    gs.phase = 'await-deck-flip';
    gs.drawnCard = null;
    gs.pendingCard = null;
    gs.pendingMatches = [];
    gs.pendingPhase = null;
    broadcastState(room);
    return;
  }
  doDeckDraw(gs, room);
}

// ─── Deck Draw ────────────────────────────────────────────────────────────────
function doDeckDraw(gs, room) {
  if (gs.stock.length === 0) {
    afterCaptures(gs, room); // no more cards
    return;
  }
  const drawn = gs.stock.shift();
  gs.drawnCard = drawn;

  // Notify all connected players for deck-flip animation (non-blocking)
  room.players.forEach(p => {
    if (p && p.socketId) io.to(p.socketId).emit('deck-draw', { card: drawn });
  });

  const matches = getMatches(drawn, gs.field);

  if (matches.length === 0) {
    processNoMatch(gs, drawn);
    gs.drawnCard = null;
    afterCaptures(gs, room);
  } else if (matches.length === 1) {
    processCapture(gs, drawn, matches[0]);
    gs.drawnCard = null;
    afterCaptures(gs, room);
  } else if (matches.length === 3) {
    captureAll(gs, drawn, matches);
    gs.drawnCard = null;
    afterCaptures(gs, room);
  } else {
    // 2 matches — player must choose
    gs.pendingCard = drawn;
    gs.pendingMatches = matches.map(c => c.id);
    gs.pendingPhase = 'deck';
    gs.phase = 'capture-choice';
    broadcastState(room);
  }
}

// ─── Socket Events ────────────────────────────────────────────────────────────
io.on('connection', socket => {

  socket.on('create-room', ({ name, rounds }) => {
    let code;
    do { code = generateCode(); } while (rooms.has(code));
    const room = {
      code,
      totalRounds: rounds,
      players: [{ socketId: socket.id, name, index: 0 }],
      gs: null,
      status: 'waiting',
    };
    rooms.set(code, room);
    socket.join(code);
    socket.emit('room-created', { code });
  });

  socket.on('join-room', ({ name, code }) => {
    const room = rooms.get(code);
    if (!room) { socket.emit('join-error', { msg: 'Room not found' }); return; }
    if (room.status !== 'waiting') { socket.emit('join-error', { msg: 'Game already started' }); return; }
    if (room.players.length >= 2) { socket.emit('join-error', { msg: 'Room full' }); return; }

    room.players.push({ socketId: socket.id, name, index: 1 });
    room.status = 'playing';
    socket.join(code);

    // Announce player names then start
    io.to(code).emit('players-ready', {
      p0Name: room.players[0].name,
      p1Name: room.players[1].name,
    });

    // Check teyaku / redeal loop
    let gs;
    let attempts = 0;
    do {
      gs = createGameState(room.totalRounds);
      attempts++;
      if (attempts > 20) break; // safety
    } while (
      fieldHasFourOfMonth(gs.field) ||
      checkTeyaku(gs.players[0].hand) ||
      checkTeyaku(gs.players[1].hand)
    );
    room.gs = gs;
    broadcastState(room);
  });

  socket.on('play-card', ({ cardId }) => {
    const room = getRoomForSocket(socket.id);
    if (!room || !room.gs) return;
    const gs = room.gs;
    const pi = getPlayerIndex(room, socket.id);
    if (pi !== gs.currentPlayer || gs.phase !== 'hand-play') return;

    const player = gs.players[pi];
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;

    const card = player.hand[cardIdx];
    player.hand.splice(cardIdx, 1);

    const matches = getMatches(card, gs.field);

    if (matches.length === 0) {
      processNoMatch(gs, card);
      beginDeckPhase(gs, room);
    } else if (matches.length === 1) {
      processCapture(gs, card, matches[0]);
      beginDeckPhase(gs, room);
    } else if (matches.length === 3) {
      captureAll(gs, card, matches);
      beginDeckPhase(gs, room);
    } else {
      // 2 matches — need choice
      gs.pendingCard = card;
      gs.pendingMatches = matches.map(c => c.id);
      gs.pendingPhase = 'hand';
      gs.phase = 'capture-choice';
      broadcastState(room);
    }
  });

  socket.on('select-capture', ({ targetId }) => {
    const room = getRoomForSocket(socket.id);
    if (!room || !room.gs) return;
    const gs = room.gs;
    const pi = getPlayerIndex(room, socket.id);
    if (pi !== gs.currentPlayer || gs.phase !== 'capture-choice') return;
    if (!gs.pendingMatches.includes(targetId)) return;

    const target = gs.field.find(c => c.id === targetId);
    if (!target) return;

    processCapture(gs, gs.pendingCard, target);
    const wasHand = gs.pendingPhase === 'hand';
    gs.pendingCard = null;
    gs.pendingMatches = [];
    gs.pendingPhase = null;
    gs.phase = 'hand-play'; // reset temporarily

    if (wasHand) {
      beginDeckPhase(gs, room);
    } else {
      afterCaptures(gs, room);
    }
  });

  socket.on('flip-deck', () => {
    const room = getRoomForSocket(socket.id);
    if (!room || !room.gs) return;
    const gs = room.gs;
    const pi = getPlayerIndex(room, socket.id);
    if (pi !== gs.currentPlayer || gs.phase !== 'await-deck-flip') return;
    doDeckDraw(gs, room);
  });

  socket.on('koi-koi-choice', ({ choice }) => {
    const room = getRoomForSocket(socket.id);
    if (!room || !room.gs) return;
    const gs = room.gs;
    const pi = getPlayerIndex(room, socket.id);
    if (pi !== gs.currentPlayer || gs.phase !== 'koi-koi-decision') return;

    if (choice === 'shobu') {
      const pts = totalYakuScore(gs.lastYaku[pi]);
      const finalPts = computeFinalRoundPoints(gs, pi, pts);
      emitKoiKoiDeclared(room, { playerIndex: pi, choice: 'shobu', score: finalPts, baseScore: pts });
      endRound(gs, room, pi, pts);
    } else {
      emitKoiKoiDeclared(room, {
        playerIndex: pi,
        choice: 'koi-koi',
        score: totalYakuScore(gs.lastYaku[pi])
      });
      gs.koiKoiCalled[pi] = true;
      endTurn(gs, room);
    }
  });

  socket.on('next-round', () => {
    const room = getRoomForSocket(socket.id);
    if (!room || !room.gs) return;
    const gs = room.gs;
    if (gs.phase !== 'round-end') return;

    let newGs;
    let attempts = 0;
    do {
      newGs = startNewRound(gs);
      attempts++;
    } while ((fieldHasFourOfMonth(newGs.field) || checkTeyaku(newGs.players[0].hand) || checkTeyaku(newGs.players[1].hand)) && attempts < 20);
    room.gs = newGs;
    broadcastState(room);
  });

  socket.on('start-solo', ({ name, rounds, difficulty }) => {
    const room = {
      code: null,
      totalRounds: rounds,
      players: [
        { socketId: socket.id, name, index: 0 },
        { socketId: null, name: 'Computer', index: 1 },
      ],
      gs: null,
      status: 'playing',
      isSolo: true,
      aiDifficulty: difficulty || 'medium',
      aiTimer: null,
    };
    rooms.set(socket.id, room);
    socket.emit('players-ready', { p0Name: name, p1Name: 'Computer' });

    let gs, attempts = 0;
    do {
      gs = createGameState(rounds);
      attempts++;
    } while ((fieldHasFourOfMonth(gs.field) ||
              checkTeyaku(gs.players[0].hand) ||
              checkTeyaku(gs.players[1].hand)) && attempts < 20);
    room.gs = gs;
    broadcastState(room);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, code) => {
      if (room.players.some(p => p.socketId === socket.id)) {
        if (room.aiTimer) clearTimeout(room.aiTimer);
        if (!room.isSolo) io.to(code).emit('opponent-left');
        rooms.delete(code);
      }
    });
  });
});

function getRoomForSocket(socketId) {
  for (const [, room] of rooms) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return null;
}

function getPlayerIndex(room, socketId) {
  const p = room.players.find(p => p.socketId === socketId);
  return p ? p.index : -1;
}

function emitYakuAchieved(room, payload) {
  room.players.forEach((p) => {
    if (!p || !p.socketId) return;
    io.to(p.socketId).emit('yaku-achieved', payload);
  });
}

function emitKoiKoiDeclared(room, payload) {
  room.players.forEach((p) => {
    if (!p || !p.socketId) return;
    io.to(p.socketId).emit('koi-koi-declared', payload);
  });
}

function computeFinalRoundPoints(gs, winner, basePoints) {
  let finalPts = Number(basePoints) || 0;
  // 7+ point doubling
  if (finalPts >= 7) finalPts *= 2;
  // winner called koi-koi
  if (gs.koiKoiCalled[winner]) finalPts *= 2;
  // opponent called koi-koi bonus
  if (gs.koiKoiCalled[1 - winner]) {
    finalPts *= 2;
    // Safety: opponent Koi-Koi must guarantee at least base x2 for winner.
    const minWithOppKoi = (Number(basePoints) || 0) * 2;
    if (finalPts < minWithOppKoi) finalPts = minWithOppKoi;
  }
  return finalPts;
}

function emitAiDecision(room, payload) {
  room.players.forEach((p, idx) => {
    if (!p || !p.socketId) return;
    if (idx === AI_INDEX) return;
    io.to(p.socketId).emit('ai-koi-koi-decision', payload);
  });
}

// ─── AI Engine ───────────────────────────────────────────────────────────────
const AI_INDEX = 1;

function scheduleAiMove(room) {
  if (!room.isSolo) return;
  const gs = room.gs;
  if (!gs) return;
  if (gs.currentPlayer !== AI_INDEX) return;
  if (gs.phase === 'round-end' || gs.phase === 'game-end') return;

  // Delay based on difficulty (harder = slightly longer "thinking")
  const delays = { easy: 900, medium: 1300, hard: 1700 };
  const delay  = delays[room.aiDifficulty] || 1300;

  if (room.aiTimer) clearTimeout(room.aiTimer);
  room.aiTimer = setTimeout(() => {
    const currentGs = room.gs;
    if (!currentGs || currentGs.currentPlayer !== AI_INDEX) return;
    if (currentGs.phase === 'hand-play')         aiPlayHand(currentGs, room);
    else if (currentGs.phase === 'capture-choice') aiSelectCapture(currentGs, room);
    else if (currentGs.phase === 'koi-koi-decision') aiDoKoiKoi(currentGs, room);
  }, delay);
}

/* Score a potential capture for the AI ------------------------------------ */
function scoreCapture(playedCard, fieldCard, currentCaptured, difficulty) {
  const simCap   = [...currentCaptured, playedCard, fieldCard];
  const oldScore = totalYakuScore(calculateYaku(currentCaptured));
  const newYaku  = calculateYaku(simCap);
  const newScore = totalYakuScore(newYaku);
  const yakuGain = newScore - oldScore;
  const newYakuFormed = newYaku.length > calculateYaku(currentCaptured).length;

  let score = playedCard.points + fieldCard.points;
  score += yakuGain * 2;
  if (newYakuFormed)    score += 25;
  if (difficulty === 'hard') score += yakuGain; // extra weight on yaku for hard

  return score;
}

/* Choose the best card to play from hand ----------------------------------- */
function aiChooseBestHandCard(gs, room) {
  const hand      = gs.players[AI_INDEX].hand;
  const captured  = gs.players[AI_INDEX].captured;
  const diff      = (room && room.aiDifficulty) || 'medium';
  let best = null, bestScore = -Infinity;

  hand.forEach(card => {
    const matches = getMatches(card, gs.field);
    let score;

    if (matches.length > 0) {
      const bestMatch = matches.reduce((b, m) =>
        scoreCapture(card, m, captured, diff) > scoreCapture(card, b, captured, diff) ? m : b, matches[0]);
      score = scoreCapture(card, bestMatch, captured, diff);
    } else {
      // Placing card on field — prefer low-value cards (don't give away hikari/tane)
      score = -card.points;
    }

    // Add noise: easy = more random, hard = almost none
    const noise = { easy: 15, medium: 5, hard: 1 };
    score += Math.random() * (noise[diff] || 5);

    if (score > bestScore) { bestScore = score; best = card; }
  });

  return best;
}

/* Choose which field card to capture when 2 options exist ------------------ */
function aiChooseBestCapture(gs) {
  const captured = gs.players[AI_INDEX].captured;
  const played   = gs.pendingCard;
  return gs.pendingMatches
    .map(id => gs.field.find(c => c.id === id))
    .filter(Boolean)
    .reduce((best, fc) =>
      scoreCapture(played, fc, captured) > scoreCapture(played, best, captured) ? fc : best
    );
}

/* Execute AI hand play ------------------------------------------------------ */
function aiPlayHand(gs, room) {
  const card = aiChooseBestHandCard(gs, room);
  if (!card) return;

  const idx = gs.players[AI_INDEX].hand.findIndex(c => c.id === card.id);
  if (idx === -1) return;
  gs.players[AI_INDEX].hand.splice(idx, 1);

  const matches = getMatches(card, gs.field);
  if (matches.length === 0) {
    processNoMatch(gs, card);
    beginDeckPhase(gs, room);
  } else if (matches.length === 1) {
    processCapture(gs, card, matches[0]);
    beginDeckPhase(gs, room);
  } else if (matches.length === 3) {
    captureAll(gs, card, matches);
    beginDeckPhase(gs, room);
  } else {
    // 2 matches — capture-choice phase; scheduleAiMove will re-fire
    gs.pendingCard    = card;
    gs.pendingMatches = matches.map(c => c.id);
    gs.pendingPhase   = 'hand';
    gs.phase = 'capture-choice';
    broadcastState(room);
  }
}

/* Execute AI capture selection ---------------------------------------------- */
function aiSelectCapture(gs, room) {
  const target   = aiChooseBestCapture(gs);
  processCapture(gs, gs.pendingCard, target);
  const wasHand  = gs.pendingPhase === 'hand';
  gs.pendingCard    = null;
  gs.pendingMatches = [];
  gs.pendingPhase   = null;
  gs.phase = 'hand-play';

  if (wasHand) beginDeckPhase(gs, room);
  else          afterCaptures(gs, room);
}

/* AI Koi-Koi / Shobu decision ----------------------------------------------- */
function aiDoKoiKoi(gs, room) {
  const yaku        = gs.lastYaku[AI_INDEX] || [];
  const score       = totalYakuScore(yaku);
  const cardsLeft   = gs.stock.length + gs.players[AI_INDEX].hand.length;
  const diff        = room.aiDifficulty || 'medium';
  const oppKoied    = gs.koiKoiCalled[0]; // human called koi-koi

  let takePts = false;

  if (diff === 'easy') {
    // Easy: mostly random (60% shobu)
    takePts = Math.random() < 0.6;
  } else if (diff === 'medium') {
    // Medium: take 7+ pts or few cards left or opp called koi-koi
    if (score >= 7)     takePts = true;
    if (cardsLeft <= 5) takePts = true;
    if (oppKoied && score >= 3) takePts = true;
  } else {
    // Hard: optimal — double-dip only when expected gain > current score
    if (score >= 7)      takePts = true;
    if (cardsLeft <= 4)  takePts = true;
    if (oppKoied)        takePts = true; // never risk with hard
    // If likely to form another yaku, keep going
    const potential = estimatePotential(gs, AI_INDEX);
    if (!takePts && potential > score * 1.5) takePts = false; // stay
    else if (!takePts) takePts = true;
  }

  if (takePts) {
    const finalPts = computeFinalRoundPoints(gs, AI_INDEX, score);
    emitKoiKoiDeclared(room, {
      playerIndex: AI_INDEX,
      choice: 'shobu',
      score: finalPts,
      baseScore: score
    });
    emitAiDecision(room, { choice: 'shobu', score });
    endRound(gs, room, AI_INDEX, score);
  } else {
    emitKoiKoiDeclared(room, { playerIndex: AI_INDEX, choice: 'koi-koi', score });
    emitAiDecision(room, { choice: 'koi-koi', score });
    gs.koiKoiCalled[AI_INDEX] = true;
    endTurn(gs, room);
  }
}

/* Rough estimate of additional points AI could still earn this round ------- */
function estimatePotential(gs, pi) {
  const hand     = gs.players[pi].hand;
  const captured = gs.players[pi].captured;
  // Simulate capturing everything in hand (optimistic upper bound)
  const simCap   = [...captured, ...hand];
  return Math.max(0, totalYakuScore(calculateYaku(simCap)) - totalYakuScore(calculateYaku(captured)));
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Hanafuda server running on http://localhost:${PORT}`));
