/**
 * 「これって何県？」クイズゲーム - メインアプリケーションスクリプト
 * 
 * 役割:
 * 1. SPA（シングルページアプリケーション）画面制御
 * 2. ゲーム状態管理（モード、得点、コンボ、ライフ等）
 * 3. Web Audio API によるシンセサイザー効果音のリアルタイム合成
 * 4. HTML5 Canvas を使用した桜吹雪＆紙吹雪パーティクルシステム
 * 5. ローカルストレージを使用した「御朱印帳」とハイスコアの保存
 * 6. 47都道府県の地域別フィルタリングと御朱印帳レンダリング
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. CONSTANTS & SYSTEM CONFIGURATION
     ========================================================================== */

  // 御朱印帳機能は廃止されました

  /* ==========================================================================
     2. STATE MANAGEMENT
     ========================================================================== */
  const state = {
    // 画面状態: 'home', 'quiz', 'result'
    currentScreen: 'home',

    // ゲーム設定・進行
    selectedMode: 'endless',    // 'endless' (全問挑戦・ライフ制)
    questionsQueue: [],         // シャッフルされた出題予定の配列
    currentQuestionIndex: 0,    // 現在の問題インデックス

    // プレイデータ
    score: 0,                   // 互換性のために残す（使用しない）
    combo: 0,
    maxCombo: 0,
    lives: 3,                   // 残りライフ
    correctCount: 0,
    isAnswered: false,          // 現在の問題に回答済みかどうか

    // 永続セーブデータ（ローカルストレージから復元）
    savedData: {
      highScore: 0,             // 最高正解数 (0〜102)
      totalAnswered: 0
    }
  };

  /* ==========================================================================
     3. DOM ELEMENTS
     ========================================================================== */
  const DOM = {
    // 画面要素
    screens: {
      home: document.getElementById('home-screen'),
      quiz: document.getElementById('quiz-screen'),
      result: document.getElementById('result-screen')
    },

    // ボタン & ナビゲーション
    logo: document.getElementById('header-logo'),
    btnStart: document.getElementById('btn-mode-start'),

    // ホーム画面データ
    homeHighScore: document.getElementById('home-high-score'),
    homeTotalAnswered: document.getElementById('home-total-answered'),

    // クイズ画面要素
    quizScoreVal: document.getElementById('quiz-score-val'),
    quizLivesContainer: document.getElementById('quiz-lives-container'),
    quizModeName: document.getElementById('quiz-mode-name'),
    quizCurrentIdx: document.getElementById('quiz-current-idx'),
    quizTotalIdx: document.getElementById('quiz-total-idx'),
    quizProgressBar: document.getElementById('quiz-progress-bar'),
    quizQuestionText: document.getElementById('quiz-question-text'),
    quizChoicesContainer: document.getElementById('quiz-choices-container'),
    quizExplanationPanel: document.getElementById('quiz-explanation-panel'),
    quizExplanationTitle: document.getElementById('quiz-explanation-title'),
    quizExplanationDesc: document.getElementById('quiz-explanation-desc'),
    btnQuizNext: document.getElementById('btn-quiz-next'),

    // 結果画面要素
    resultTitleText: document.getElementById('result-title-text'),
    resultScorePoints: document.getElementById('result-score-points'),
    resultFeedbackText: document.getElementById('result-feedback-text'),
    resultStatAccuracy: document.getElementById('result-stat-accuracy'),
    btnResultReplay: document.getElementById('btn-result-replay'),
    btnResultHome: document.getElementById('btn-result-home'),
    btnShareTwitter: document.getElementById('btn-share-twitter'),
    btnShareLine: document.getElementById('btn-share-line')
  };

  /* ==========================================================================
     4. AUDIO SYNTH ENGINE (Web Audio API)
     ========================================================================== */
  class SoundSynth {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            this.ctx = new AudioContextClass();
          }
        } catch (e) {
          console.warn("Web Audio API is not supported or blocked in this environment.", e);
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        try {
          this.ctx.resume();
        } catch (e) {
          console.warn("Failed to resume AudioContext", e);
        }
      }
    }

    playTone(freq, type, duration, delay = 0) {
      this.init();
      if (!this.ctx) return;

      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          // 音を徐々にフェードアウトさせて自然な余韻を作る
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
          console.warn("Audio Context playback blocked or unsupported.", e);
        }
      }, delay * 1000);
    }

    // 効果音: クリック音
    click() {
      this.playTone(800, 'sine', 0.1);
    }

    // 効果音: 正解音（明るい上昇アルペジオ）
    correct() {
      const base = 523.25; // C5
      this.playTone(base, 'sine', 0.15, 0);       // ド (C5)
      this.playTone(base * 1.25, 'sine', 0.15, 0.08); // ミ (E5)
      this.playTone(base * 1.5, 'sine', 0.15, 0.16);  // ソ (G5)
      this.playTone(base * 2, 'sine', 0.3, 0.24);    // ド (C6)
    }

    // 効果音: 不正解（低いブザー）
    incorrect() {
      this.playTone(220, 'sawtooth', 0.3); // A3 のノコギリ波
      this.playTone(207.65, 'sawtooth', 0.3, 0.05); // 短2度下がって濁る和音
    }

    // 効果音: コンボボーナス（ピッチが上がるチャイム）
    combo(comboCount) {
      const multiplier = Math.min(1.5, 1.0 + (comboCount * 0.05));
      const freq = 880 * multiplier;
      this.playTone(freq, 'sine', 0.1, 0);
      this.playTone(freq * 1.2, 'sine', 0.2, 0.06);
    }

    // 効果音: クイズクリア（豪華なファンファーレ）
    victory() {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4~C6アルペジオ
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'sine', 0.3, idx * 0.07);
      });
      // 最終和音
      setTimeout(() => {
        this.playTone(523.25, 'sine', 0.6, 0);
        this.playTone(659.25, 'sine', 0.6, 0);
        this.playTone(783.99, 'sine', 0.6, 0);
        this.playTone(1046.50, 'sine', 0.8, 0);
      }, notes.length * 70);
    }
  }

  const sound = new SoundSynth();

  /* ==========================================================================
     5. HTML5 CANVAS PARTICLE SYSTEM
     ========================================================================== */
  const canvas = document.getElementById('canvas-particles');
  const ctx = canvas.getContext('2d');

  let particles = [];
  let isRainingSakura = true; // ホーム画面などで穏やかに桜を降らせる

  // キャンバスリサイズ
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // パーティクルクラス
  class Particle {
    constructor(x, y, type = 'sakura') {
      this.x = x;
      this.y = y;
      this.type = type; // 'sakura' (桜の風情), 'ember' (戦火の火の粉), 'confetti' (大戦祝賀の紙吹雪)

      if (type === 'sakura') {
        this.size = Math.random() * 8 + 6;
        this.speedX = Math.random() * 1.5 + 0.5;
        this.speedY = Math.random() * 1.5 + 1.0;
        this.gravity = 0.02;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 2 - 1;
        this.color = `rgba(255, ${Math.floor(Math.random() * 40 + 175)}, ${Math.floor(Math.random() * 40 + 195)}, ${Math.random() * 0.3 + 0.6})`;
        this.opacity = Math.random() * 0.3 + 0.6;
        this.decay = 0.002;
      } else if (type === 'ember') {
        this.size = Math.random() * 3.5 + 1.5;
        this.speedX = Math.random() * 1.2 - 0.6;
        this.speedY = Math.random() * -0.8 - 0.4;
        this.gravity = -0.005; // かすかに浮上し続ける
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;

        const embers = [
          `rgba(212, 163, 44, ${Math.random() * 0.4 + 0.6})`,  // 山吹色 (ゴールド)
          `rgba(217, 56, 58, ${Math.random() * 0.4 + 0.6})`,   // 朱赤
          `rgba(249, 115, 22, ${Math.random() * 0.4 + 0.6})`   // 橙
        ];
        this.color = embers[Math.floor(Math.random() * embers.length)];
        this.opacity = Math.random() * 0.5 + 0.5;
        this.decay = Math.random() * 0.004 + 0.002;
      } else {
        // 紙吹雪 (Confetti) - 大戦を祝う伝統色 (朱赤、山吹、紺青、純白)
        this.size = Math.random() * 10 + 6;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * -6 - 2; // 上方向に吹き出す
        this.gravity = 0.2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;

        const colors = [
          '#d9383a', // 朱赤 (Shuaka)
          '#d4a32c', // 山吹色 (Yamabuki Gold)
          '#2563eb', // 紺青 (Konjo)
          '#ffffff'  // 純白 (Junhaku)
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = 1;
        this.decay = Math.random() * 0.015 + 0.01;
      }
    }

    update() {
      this.x += this.speedX;
      this.speedY += this.gravity;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.opacity -= this.decay;

      // 桜が画面外（下）に出たら少しリサイクル
      if (this.type === 'sakura' && this.y > canvas.height) {
        this.y = -10;
        this.x = Math.random() * canvas.width;
        this.opacity = Math.random() * 0.3 + 0.6;
        this.speedY = Math.random() * 1.5 + 1.0;
      }

      // 戦火の火の粉が画面外（上）に出たら少しリサイクル
      if (this.type === 'ember' && this.y < -10) {
        this.y = canvas.height + 10;
        this.x = Math.random() * canvas.width;
        this.opacity = Math.random() * 0.4 + 0.6;
        this.speedY = Math.random() * -0.8 - 0.4;
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.fillStyle = this.color;

      if (this.type === 'sakura') {
        // 花びらのような楕円形を描画
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, 2 * Math.PI);
        ctx.fill();

        // 切り込みを入れてより桜っぽく
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(this.size + 2, -2);
        ctx.lineTo(this.size + 2, 2);
        ctx.closePath();
        ctx.fill();
      } else if (this.type === 'ember') {
        // 丸い火の粉 / ゴールドダスト
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // 四角形の紙吹雪
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      }
      ctx.restore();
    }
  }

  // 背景で穏やかに立ちのぼる火の粉（ゴールドダスト）の初期化
  function initSakuraRain() {
    particles = [];
    const emberCount = 20;
    for (let i = 0; i < emberCount; i++) {
      particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height, 'ember'));
    }
  }

  // 正解時の紙吹雪 / 火の粉爆発エフェクト
  function spawnSplash(type = 'confetti') {
    const splashCount = type === 'confetti' ? 80 : 50;
    const spawnX = canvas.width / 2;
    const spawnY = canvas.height * 0.6;
    for (let i = 0; i < splashCount; i++) {
      // 画面中央下から上に向かって勢いよく拡散
      particles.push(new Particle(
        spawnX + (Math.random() * 60 - 30),
        spawnY + (Math.random() * 60 - 30),
        type
      ));
    }
  }

  // アニメーションループ
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パーティクルの更新と描画
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();

      // 不透明度が0になったパーティクルを削除（ただし、背景の火の粉はリサイクルされるため除く）
      if (p.opacity <= 0) {
        particles.splice(i, 1);
      }
    }

    // 穏やかな火の粉の数が減ったら追加する（背景レインがオンのときのみ）
    if (isRainingSakura) {
      const currentEmberCount = particles.filter(p => p.type === 'ember').length;
      if (currentEmberCount < 20) {
        particles.push(new Particle(Math.random() * canvas.width, canvas.height + 20, 'ember'));
      }
    }

    requestAnimationFrame(animate);
  }

  // 初期化とループ開始
  initSakuraRain();
  animate();

  /* ==========================================================================
     6. SAVE DATA / LOCAL STORAGE ENGINE
     ========================================================================== */
  const SAVE_KEY = 'KORETTE_NANI_KEN_SAVE_DATA_v1';

  function loadSavedData() {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        let loadedHighScore = parsed.highScore || 0;
        // Data Migration: If the old point-based score is loaded (greater than total questions 102), reset to 0
        if (loadedHighScore > 102) {
          loadedHighScore = 0;
        }
        state.savedData = {
          highScore: loadedHighScore,
          totalAnswered: parsed.totalAnswered || 0
        };
      }
    } catch (e) {
      console.error("Local Storage reading failed. Sandboxed environment?", e);
    }
    updateHomeStatsUI();
  }

  function saveGameData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state.savedData));
    } catch (e) {
      console.warn("Saving to Local Storage failed.", e);
    }
  }

  function updateHomeStatsUI() {
    DOM.homeHighScore.textContent = `${state.savedData.highScore}問`;
    DOM.homeTotalAnswered.textContent = state.savedData.totalAnswered;
  }

  // ローカルストレージデータの読み込み
  loadSavedData();

  /* ==========================================================================
     7. SPA SCREEN NAVIGATOR
     ========================================================================== */
  function showScreen(screenId) {
    sound.click();

    // 背景演出の最適化
    if (screenId === 'quiz') {
      isRainingSakura = false; // クイズ中は集中できるように背景の桜・火の粉を一時停止
      particles = particles.filter(p => p.type !== 'sakura' && p.type !== 'ember');
    } else {
      isRainingSakura = true; // それ以外は和の雰囲気を出すため桜と火の粉を舞わせる
    }

    // 全画面を非アクティブにして指定画面をアクティブにする
    Object.keys(DOM.screens).forEach(key => {
      const screen = DOM.screens[key];
      if (key === screenId) {
        screen.classList.add('active');
      } else {
        screen.classList.remove('active');
      }
    });

    state.currentScreen = screenId;

    // 画面固有の更新処理
    if (screenId === 'home') {
      updateHomeStatsUI();
    }
  }

  /* ==========================================================================
     8. QUIZ ENGINE LOGIC
     ========================================================================== */

  // クイズを開始
  function startQuiz() {
    state.selectedMode = 'endless';
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correctCount = 0;
    state.currentQuestionIndex = 0;
    state.isAnswered = false;

    // 問題プールをシャッフル
    const shuffledPool = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);

    // 全ての問題を利用し、3ライフ制
    state.questionsQueue = shuffledPool; // 全問
    state.lives = 3;
    DOM.quizModeName.textContent = "全問挑戦 (ライフ制)";
    DOM.quizLivesContainer.style.display = "flex";
    updateLivesUI();

    DOM.quizTotalIdx.textContent = state.questionsQueue.length;
    DOM.quizScoreVal.textContent = "0";

    loadQuestion(0);
    showScreen('quiz');
  }

  // ライフ表示の更新（Endless用）
  function updateLivesUI() {
    const hearts = DOM.quizLivesContainer.querySelectorAll('.life-heart');
    hearts.forEach(heart => {
      const lifeIdx = parseInt(heart.getAttribute('data-life'));
      if (lifeIdx <= state.lives) {
        heart.classList.remove('lost');
      } else {
        heart.classList.add('lost');
      }
    });
  }

  // 問題を読み込む
  function loadQuestion(index) {
    state.isAnswered = false;
    DOM.btnQuizNext.setAttribute('disabled', 'true');
    DOM.quizExplanationPanel.style.display = "none";

    const question = state.questionsQueue[index];
    if (!question) {
      endQuiz();
      return;
    }

    // UI更新
    DOM.quizCurrentIdx.textContent = index + 1;

    // 進捗プログレスバー
    const progressPercent = (index / state.questionsQueue.length) * 100;
    DOM.quizProgressBar.style.width = `${progressPercent}%`;

    DOM.quizQuestionText.textContent = question.question;

    // 選択肢の描画（選択肢をシャッフル）
    const shuffledChoices = [...question.choices].sort(() => Math.random() - 0.5);

    DOM.quizChoicesContainer.innerHTML = '';
    shuffledChoices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.choice = choice; // モダンなデータ属性に格納
      btn.innerHTML = `
        <span><span class="choice-num">${idx + 1}</span>${choice}</span>
        <i class="fa-solid fa-circle-check choice-status-icon"></i>
      `;
      btn.addEventListener('click', () => handleAnswer(choice, btn));
      DOM.quizChoicesContainer.appendChild(btn);
    });

    // 次へボタンのラベル調整
    if (index === state.questionsQueue.length - 1) {
      DOM.btnQuizNext.innerHTML = `結果発表 <i class="fa-solid fa-flag-checkered"></i>`;
    } else {
      DOM.btnQuizNext.innerHTML = `次に進む <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  // 回答を選択したときの処理
  function handleAnswer(selectedText, selectedBtn) {
    if (state.isAnswered) return;
    state.isAnswered = true;

    const question = state.questionsQueue[state.currentQuestionIndex];
    const choiceButtons = DOM.quizChoicesContainer.querySelectorAll('.choice-btn');

    // ローカルストレージ用の総解答数加算
    state.savedData.totalAnswered += 1;

    if (selectedText === question.answer) {
      // ーーー 正解！ ーーー
      sound.correct();
      state.correctCount += 1;
      state.combo += 1;

      if (state.combo > state.maxCombo) {
        state.maxCombo = state.combo;
      }

      // 得点表示だった部分に正解数を設定
      DOM.quizScoreVal.textContent = state.correctCount;

      // 正解のエフェクト (コンボ数が多いほどたくさん飛ばす)
      if (state.combo >= 5) {
        spawnSplash('confetti'); // 5コンボ以上でカラフル紙吹雪
        sound.combo(state.combo);
      } else {
        spawnSplash('ember');    // 通常は戦火・黄金の火の粉（桜吹雪の代わりに）
      }

      // ボタンのスタイル変更
      selectedBtn.classList.add('correct');

      // 解説パネルの表示
      showExplanation(true, question.explanation);

    } else {
      // ーーー 不正解... ーーー
      sound.incorrect();
      state.combo = 0;

      // 画面の揺れ
      DOM.screens.quiz.querySelector('.glass-card').classList.add('shake-anim');
      setTimeout(() => {
        DOM.screens.quiz.querySelector('.glass-card').classList.remove('shake-anim');
      }, 500);

      // スタイル変更: 間違えたボタンを赤、正解のボタンを緑にする
      selectedBtn.classList.add('incorrect');
      choiceButtons.forEach(btn => {
        if (btn.dataset.choice === question.answer) {
          btn.classList.add('correct');
        }
      });

      // ライフの減少
      state.lives -= 1;
      updateLivesUI();
      if (state.lives <= 0) {
        // ライフゼロの場合は次に進むボタンを「結果発表」にしてクイズを強制終了へ
        DOM.btnQuizNext.innerHTML = `結果発表 <i class="fa-solid fa-flag-checkered"></i>`;
      }

      // 解説パネル表示
      showExplanation(false, question.explanation);
    }

    // 他の全てのボタンを無効化（ディム状態に）
    choiceButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      if (!btn.classList.contains('correct') && !btn.classList.contains('incorrect')) {
        btn.classList.add('dimmed');
      }
    });

    // 次へボタンの有効化
    DOM.btnQuizNext.removeAttribute('disabled');
    saveGameData();

    // 解説パネルや「次に進む」ボタンが確実に画面に入るようスムーズスクロール
    setTimeout(() => {
      DOM.btnQuizNext.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  // 解説の表示
  function showExplanation(isCorrect, text) {
    DOM.quizExplanationPanel.style.display = "block";
    const currentQuestion = state.questionsQueue[state.currentQuestionIndex];
    if (isCorrect) {
      DOM.quizExplanationTitle.className = "explanation-title correct-text";
      DOM.quizExplanationTitle.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>正解！</span>`;
    } else {
      DOM.quizExplanationTitle.className = "explanation-title incorrect-text";
      DOM.quizExplanationTitle.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>残念！ 正解は「${currentQuestion.answer}」</span>`;
    }
    DOM.quizExplanationDesc.textContent = text;
  }

  // 次の問題へ
  function nextQuestion() {
    // ライフ切れ、または問題終了判定
    if ((state.selectedMode === 'endless' && state.lives <= 0) ||
      (state.currentQuestionIndex === state.questionsQueue.length - 1)) {
      endQuiz();
    } else {
      state.currentQuestionIndex += 1;
      loadQuestion(state.currentQuestionIndex);
    }
  }

  // クイズ終了、リザルト描画
  function endQuiz() {
    try {
      // ライフが残っている（＝全問制覇）時のみ祝賀の演出を実行
      if (state.lives > 0) {
        try {
          sound.victory();
        } catch (audioErr) {
          console.warn("Sound playback failed at quiz end", audioErr);
        }
        try {
          spawnSplash('confetti'); // 大量の祝祭紙吹雪
        } catch (splashErr) {
          console.warn("Confetti splash failed", splashErr);
        }
      }

      // 最終プログレスバーを100%に
      if (DOM.quizProgressBar) {
        DOM.quizProgressBar.style.width = `100%`;
      }

      // 正解数表示とハイスコア更新
      if (DOM.resultScorePoints) {
        DOM.resultScorePoints.textContent = `${state.correctCount} 問`;
      }

      if (state.savedData) {
        if (state.correctCount > state.savedData.highScore) {
          state.savedData.highScore = state.correctCount;
          if (DOM.resultTitleText) {
            DOM.resultTitleText.textContent = "🏆 最高記録更新！ 🏆";
            DOM.resultTitleText.style.color = "var(--color-gold)";
          }
        } else {
          if (DOM.resultTitleText) {
            DOM.resultTitleText.textContent = "挑戦完了！";
            DOM.resultTitleText.style.color = "var(--color-text)";
          }
        }
      }

      // 正解率計算
      const answeredCount = Math.max(1, state.currentQuestionIndex + 1); // 0除算防止
      const accuracy = Math.round((state.correctCount / answeredCount) * 100);

      if (DOM.resultStatAccuracy) {
        DOM.resultStatAccuracy.textContent = `${accuracy}%`;
      }

      // フィードバックテキストの設定
      let feedback = "";
      if (accuracy === 100 && state.correctCount === state.questionsQueue.length) {
        feedback = "完璧です！102問すべてに正解し、信長公記の真髄を極めた「織田家筆頭右筆」となりました！";
      } else if (accuracy >= 80) {
        feedback = "素晴らしい！信長公の波乱の生涯を深く理解する超一流 of 超一流の歴史通です！";
      } else if (accuracy >= 50) {
        feedback = "お見事！『信長公記』が描く戦国乱世の情勢にかなり精通していますね。";
      } else {
        feedback = "挑戦お疲れ様でした！もう一度遊んで、信長公の数々の武勲と奇跡を学びましょう！";
      }

      if (DOM.resultFeedbackText) {
        DOM.resultFeedbackText.textContent = feedback;
      }

      // 共有リンクの作成
      try {
        setupShareLinks(accuracy);
      } catch (shareErr) {
        console.warn("Setting up share links failed", shareErr);
      }

      // 状態の永続保存
      saveGameData();
    } catch (e) {
      console.error("An error occurred during endQuiz processing:", e);
    } finally {
      // どのような予期せぬエラーが途中で発生しても、画面遷移は確実に保証する
      showScreen('result');
    }
  }

  // SNS共有用リンクのセットアップ
  function setupShareLinks(accuracy) {
    const shareText = `『信長公記クイズ』に挑戦！\n【正解数: ${state.correctCount}問 / 102問 (正解率: ${accuracy}%)】\nみんなも挑戦して信長公記クイズ全問クリアを目指そう！\n`;
    const shareUrl = window.location.href;

    // Twitter (X) Share URL
    DOM.btnShareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent('信長公記クイズ')}`;

    // LINE Share URL
    DOM.btnShareLine.href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  }
  /* ==========================================================================
     9. EVENT LISTENERS
     ========================================================================== */

  // ロゴクリックでトップへ戻る
  DOM.logo.addEventListener('click', () => {
    if (state.currentScreen === 'quiz') {
      if (confirm('クイズの途中ですが、トップメニューに戻りますか？\n（現在のクイズの進行状況は破棄されます）')) {
        showScreen('home');
      }
    } else {
      showScreen('home');
    }
  });

  // クイズ中のページ離脱（リロードやタブ閉じるなど）防止
  window.addEventListener('beforeunload', (e) => {
    if (state.currentScreen === 'quiz') {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ゲームモード選択
  DOM.btnStart.addEventListener('click', () => startQuiz());

  // クイズ画面アクション
  DOM.btnQuizNext.addEventListener('click', () => {
    sound.click();
    nextQuestion();
  });

  // 結果画面アクション
  DOM.btnResultReplay.addEventListener('click', () => startQuiz());
  DOM.btnResultHome.addEventListener('click', () => showScreen('home'));

});
