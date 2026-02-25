/* ── Translations ────────────────────────────────────────────────────────────── */
window.I18N = {
  en: {
    titleSub:        'Hanafuda · Koi-Koi',
    createGame:      'Create Game',
    joinGame:        'Join Game',
    gameRules:       'Game Rules',
    labelName:       'Name',
    labelRounds:     'Rounds',
    labelCode:       'Room Code',
    shareCode:       'Share this code with your opponent:',
    waitingOpponent: 'Waiting for opponent…',
    create:          'Create',
    join:            'Join',
    cancel:          'Cancel',
    close:           'Close',
    round:           'Round',
    pts:             'pts',
    deck:            'Deck:',
    yourTurn:        'Your turn — play a card',
    oppTurn:         "Opponent's turn…",
    deckPhase:       'Deck card drawn',
    chooseCapture:   'Choose which field card to capture',
    yakuFormed:      'Yaku Formed!',
    shobu:           'Shobu  (Take Points)',
    koikoi:          'Koi-Koi!  (Keep Going)',
    myYaku:          'My Yaku',
    nextRound:       'Next Round',
    playAgain:       'Play Again',
    drawnCard:       'Drawn:',
    total:           'Total:',
    roundResult:     'Round Result',
    youWin:          'You Win!',
    oppWins:         'Opponent Wins',
    draw:            'Draw',
    finalResult:     'Final Result',
    youWinGame:      'You Win the Game!',
    oppWinsGame:     'Opponent Wins',
    oppLeft:         'Opponent disconnected',
    errorRoomFull:   'Room is full',
    errorNotFound:   'Room not found',
    errorStarted:    'Game already started',
    koiKoiDoubled:   '× 2 (Koi-Koi)',
    sevenDoubled:    '× 2 (7+ pts)',
    oppKoiBonus:     '× 2 (Opp. called Koi-Koi)',
    pts_label:       'pts',
    noYaku:          'No yaku yet',
    playComputer:    'Play with Computer',
    labelDifficulty: 'Difficulty',
    diffEasy:        'Easy',
    diffMedium:      'Medium',
    diffHard:        'Hard',
    startGame:       'Start Game',
    aiThinking:      'Computer is thinking…',
    aiName:          'Computer',
    vsComputer:      'vs Computer',

    // Yaku names
    goko:      'Five Brights',
    shiko:     'Four Brights',
    ameshiko:  'Rainy Four Brights',
    sanko:     'Three Brights',
    hanami:    'Flower Viewing',
    tsukimi:   'Moon Viewing',
    isc:       'Boar-Deer-Butterfly',
    akatan:    'Red Poetry Ribbons',
    aotan:     'Blue Ribbons',
    tanzaku:   'Five Ribbons',
    tane:      'Five Animals',
    kasu:      'Ten Plains',

    // Months
    months: ['January','February','March','April','May','June',
             'July','August','September','October','November','December'],

    // Rules
    rulesTitle: 'Game Rules',
    rulesContent: `
      <h3>Overview</h3>
      <p>Hanafuda Koi-Koi is a 2-player Japanese card game. The 48-card deck is divided into 12 suits (one per month). On each turn you play a card from your hand and then draw from the deck — capturing field cards that match your card's month.</p>

      <h3>Card Types</h3>
      <table>
        <tr><th>Type</th><th>Points</th><th>Count</th></tr>
        <tr><td>Hikari (Bright)</td><td>20</td><td>5</td></tr>
        <tr><td>Tane (Animal)</td><td>10</td><td>9</td></tr>
        <tr><td>Tanzaku (Ribbon)</td><td>5</td><td>10</td></tr>
        <tr><td>Kasu (Chaff)</td><td>1</td><td>24</td></tr>
      </table>

      <h3>Turn Structure</h3>
      <p>1. Play a card from your hand onto the field.<br>
         2. If it matches a field card (same month), capture both.<br>
         3. If 2 matches exist, choose which to take.<br>
         4. Draw the top deck card — same matching rules apply.<br>
         5. If you form a <b>yaku</b>, decide: <b>Shobu</b> (take points and end round) or <b>Koi-Koi</b> (risk for more).</p>

      <h3>Koi-Koi</h3>
      <p>Calling Koi-Koi doubles your points if you later win, but if your opponent forms any yaku first, <b>they win</b> and you score zero.</p>

      <h3>Scoring (7+ rule)</h3>
      <p>If your winning total is <b>7 or more points</b>, the score is doubled automatically.</p>

      <h3>Yaku (Scoring Combinations)</h3>
      <table>
        <tr><th>Yaku</th><th>Japanese</th><th>Requirements</th><th>Pts</th></tr>
        <tr><td>Five Brights</td><td>五光</td><td>All 5 Hikari cards</td><td>15</td></tr>
        <tr><td>Four Brights</td><td>四光</td><td>4 Hikari (no Rain Man)</td><td>8</td></tr>
        <tr><td>Rainy Four Brights</td><td>雨四光</td><td>4 Hikari incl. Rain Man</td><td>7</td></tr>
        <tr><td>Three Brights</td><td>三光</td><td>3 Hikari (no Rain Man)</td><td>5</td></tr>
        <tr><td>Flower Viewing</td><td>花見酒</td><td>Cherry Curtain + Sake Cup</td><td>5</td></tr>
        <tr><td>Moon Viewing</td><td>月見酒</td><td>Moon + Sake Cup</td><td>5</td></tr>
        <tr><td>Boar-Deer-Butterfly</td><td>猪鹿蝶</td><td>Boar + Deer + Butterfly (+1/extra tane)</td><td>5+</td></tr>
        <tr><td>Red Poetry Ribbons</td><td>赤短</td><td>Jan+Feb+Mar ribbons (+1/extra)</td><td>5+</td></tr>
        <tr><td>Blue Ribbons</td><td>青短</td><td>Jun+Sep+Oct ribbons (+1/extra)</td><td>5+</td></tr>
        <tr><td>Five Animals</td><td>タネ</td><td>Any 5 Tane cards (+1/extra)</td><td>1+</td></tr>
        <tr><td>Five Ribbons</td><td>短冊</td><td>Any 5 Tanzaku (+1/extra)</td><td>1+</td></tr>
        <tr><td>Ten Plains</td><td>カス</td><td>Any 10 Kasu (+1/extra)</td><td>1+</td></tr>
      </table>
    `
  },

  jp: {
    titleSub:        '花札・こいこい',
    createGame:      'ゲームを作成',
    joinGame:        'ゲームに参加',
    gameRules:       'ゲームのルール',
    labelName:       '名前',
    labelRounds:     'ラウンド数',
    labelCode:       '部屋コード',
    shareCode:       '対戦相手にこのコードを伝えてください：',
    waitingOpponent: '対戦相手を待っています…',
    create:          '作成',
    join:            '参加',
    cancel:          'キャンセル',
    close:           '閉じる',
    round:           'ラウンド',
    pts:             '点',
    deck:            '山札:',
    yourTurn:        'あなたの番です — カードを出してください',
    oppTurn:         '相手の番です…',
    deckPhase:       '山札からカードを引きました',
    chooseCapture:   '取るカードを選んでください',
    yakuFormed:      '役ができました！',
    shobu:           '勝負  (点数をもらう)',
    koikoi:          'こいこい！  (続ける)',
    myYaku:          '自分の役',
    nextRound:       '次のラウンドへ',
    playAgain:       'もう一度プレイ',
    drawnCard:       '引いたカード:',
    total:           '合計:',
    roundResult:     'ラウンド結果',
    youWin:          'あなたの勝ち！',
    oppWins:         '相手の勝ち',
    draw:            '引き分け',
    finalResult:     '最終結果',
    youWinGame:      'あなたのゲーム勝利！',
    oppWinsGame:     '相手がゲームに勝ちました',
    oppLeft:         '相手が切断しました',
    errorRoomFull:   '部屋が満員です',
    errorNotFound:   '部屋が見つかりません',
    errorStarted:    'ゲームはすでに開始されています',
    koiKoiDoubled:   '× 2 (こいこい)',
    sevenDoubled:    '× 2 (7点以上)',
    oppKoiBonus:     '× 2 (相手がこいこい)',
    pts_label:       '点',
    noYaku:          'まだ役なし',
    playComputer:    'コンピューターと対戦',
    labelDifficulty: '難易度',
    diffEasy:        '初級',
    diffMedium:      '中級',
    diffHard:        '上級',
    startGame:       'ゲーム開始',
    aiThinking:      'コンピューターが考えています…',
    aiName:          'コンピューター',
    vsComputer:      'vs コンピューター',

    goko:      '五光',
    shiko:     '四光',
    ameshiko:  '雨四光',
    sanko:     '三光',
    hanami:    '花見酒',
    tsukimi:   '月見酒',
    isc:       '猪鹿蝶',
    akatan:    '赤短',
    aotan:     '青短',
    tanzaku:   '短冊',
    tane:      'タネ',
    kasu:      'カス',

    months: ['睦月','如月','弥生','卯月','皐月','水無月',
             '文月','葉月','長月','神無月','霜月','師走'],

    rulesTitle: 'ゲームのルール',
    rulesContent: `
      <h3>概要</h3>
      <p>花札こいこいは2人用の日本のカードゲームです。48枚のデッキは12のスーツ（月ごと）に分かれています。毎ターン、手札からカードを出し、山札からカードを引いて、同じ月のカードを取り合います。</p>

      <h3>カードの種類</h3>
      <table>
        <tr><th>種類</th><th>点数</th><th>枚数</th></tr>
        <tr><td>光札（ひかり）</td><td>20点</td><td>5枚</td></tr>
        <tr><td>種札（たね）</td><td>10点</td><td>9枚</td></tr>
        <tr><td>短冊（たんざく）</td><td>5点</td><td>10枚</td></tr>
        <tr><td>滓札（かす）</td><td>1点</td><td>24枚</td></tr>
      </table>

      <h3>ターンの流れ</h3>
      <p>1. 手札から1枚を場に出す。<br>
         2. 同じ月の場札があれば、両方を取る。<br>
         3. 2枚ある場合は、どちらを取るか選ぶ。<br>
         4. 山札の一番上を引き、同様にマッチングを行う。<br>
         5. <b>役</b>ができたら「<b>勝負</b>」か「<b>こいこい</b>」を選ぶ。</p>

      <h3>こいこい</h3>
      <p>「こいこい」を宣言すると点数が2倍になりますが、相手が先に役を作ると<b>相手の勝ち</b>となり、自分は0点になります。</p>

      <h3>得点計算（7点ルール）</h3>
      <p>勝利時の合計が<b>7点以上</b>の場合、点数が自動的に2倍になります。</p>

      <h3>役一覧</h3>
      <table>
        <tr><th>役名</th><th>条件</th><th>点数</th></tr>
        <tr><td>五光</td><td>光札5枚すべて</td><td>15点</td></tr>
        <tr><td>四光</td><td>光札4枚（雨以外）</td><td>8点</td></tr>
        <tr><td>雨四光</td><td>光札4枚（雨含む）</td><td>7点</td></tr>
        <tr><td>三光</td><td>光札3枚（雨以外）</td><td>5点</td></tr>
        <tr><td>花見酒</td><td>桜の幕＋菊の盃</td><td>5点</td></tr>
        <tr><td>月見酒</td><td>芒の月＋菊の盃</td><td>5点</td></tr>
        <tr><td>猪鹿蝶</td><td>萩の猪＋紅葉の鹿＋牡丹の蝶（+1/追加タネ）</td><td>5点〜</td></tr>
        <tr><td>赤短</td><td>松・梅・桜の赤短冊（+1/追加短冊）</td><td>5点〜</td></tr>
        <tr><td>青短</td><td>牡丹・菊・紅葉の青短冊（+1/追加短冊）</td><td>5点〜</td></tr>
        <tr><td>タネ</td><td>種札5枚以上（+1/追加）</td><td>1点〜</td></tr>
        <tr><td>短冊</td><td>短冊5枚以上（+1/追加）</td><td>1点〜</td></tr>
        <tr><td>カス</td><td>滓札10枚以上（+1/追加）</td><td>1点〜</td></tr>
      </table>
    `
  }
};

let currentLang = 'en';

function setLang(lang) {
  currentLang = lang;
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-jp').classList.toggle('active', lang === 'jp');
  applyTranslations();
  updateRulesContent();
  if (window.gameState) renderAll();
}

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en[key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // placeholders
  const cn = document.getElementById('create-name');
  if (cn) cn.placeholder = t('labelName');
  const jn = document.getElementById('join-name');
  if (jn) jn.placeholder = t('labelName');
  const jc = document.getElementById('join-code');
  if (jc) jc.placeholder = '1234';
}

function updateRulesContent() {
  const el = document.getElementById('rules-content');
  if (el) el.innerHTML = I18N[currentLang].rulesContent || I18N.en.rulesContent;
}
