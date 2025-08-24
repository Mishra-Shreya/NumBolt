// Audio context for sound feedback
let audioContext;
let beepSound, successSound, errorSound;
let isProcessingAnswer = false;
let feedbackTimeout;
let isShowingFeedback = false;

// Add visibility monitoring for mobile
let keypadVisibilityMonitor;

function startKeypadMonitoring() {
  if (!isMobile || keypadVisibilityMonitor) return;
  
  keypadVisibilityMonitor = setInterval(() => {
    if (gameActive && isMobile) {
      const keypadRect = mobileKeypad.getBoundingClientRect();
      const isVisible = keypadRect.height > 0 && keypadRect.width > 0;
      
      if (!isVisible || mobileKeypad.style.display !== 'grid') {
        console.log('Keypad visibility issue detected, fixing...');
        mobileKeypad.style.display = 'grid';
        mobileKeypad.classList.add('game-active');
        mobileKeypad.style.visibility = 'visible';
        mobileKeypad.style.opacity = '1';
      }
    }
  }, 1000);
}

function stopKeypadMonitoring() {
  if (keypadVisibilityMonitor) {
    clearInterval(keypadVisibilityMonitor);
    keypadVisibilityMonitor = null;
  }
}

// Initialize audio
function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create beep sound for keypress
    beepSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };
    
    // Success sound - Enhanced celebratory chime
    successSound = () => {
      // First note - C5
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      gain1.gain.setValueAtTime(0.06, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.15);
      
      // Second note - E5
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(0.06, audioContext.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
      osc2.start(audioContext.currentTime + 0.1);
      osc2.stop(audioContext.currentTime + 0.25);
      
      // Third note - G5
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      gain3.gain.setValueAtTime(0.08, audioContext.currentTime + 0.2);
      gain3.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
      osc3.start(audioContext.currentTime + 0.2);
      osc3.stop(audioContext.currentTime + 0.4);
    };
    
    // Error sound
    errorSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };
  } catch (e) {
    console.warn('Audio not supported');
  }
}

function showFeedback(message, isCorrect = true, duration = 2000) {
  if (isShowingFeedback) return;
  
  isShowingFeedback = true;
  
  let feedbackDiv = document.getElementById('feedback');
  if (!feedbackDiv) {
    feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'feedback';
    feedbackDiv.className = 'feedback';
    document.body.appendChild(feedbackDiv);
  }
  
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  
  feedbackDiv.classList.remove('correct', 'wrong', 'hidden');
  feedbackDiv.style.display = 'none';
  
  feedbackDiv.innerHTML = message;
  feedbackDiv.className = isCorrect ? 'feedback correct' : 'feedback wrong';
  
  feedbackDiv.style.position = 'fixed';
  feedbackDiv.style.top = '20px';
  feedbackDiv.style.right = '20px';
  feedbackDiv.style.zIndex = '999999';
  feedbackDiv.style.display = 'block';
  
  feedbackTimeout = setTimeout(() => {
    hideFeedback();
  }, duration);
}

function hideFeedback() {
  const feedbackDiv = document.getElementById('feedback');
  if (feedbackDiv && isShowingFeedback) {
    feedbackDiv.classList.add('hidden');
    setTimeout(() => {
      feedbackDiv.style.display = 'none';
      feedbackDiv.classList.remove('hidden', 'correct', 'wrong');
      isShowingFeedback = false;
    }, 300);
  }
}

// Initialize variables
let timer, timeLeft, score = 0, totalQuestions = 0, currentAnswer, currentHint, startTime, totalTimePerQuestion = 0;
let history = [];
let gameActive = false;
let initialTimeLimit = 0;
let isMobile = false;

// DOM elements
const questionEl = document.getElementById('question');
const answerEl = document.getElementById('answer');
const startBtn = document.getElementById('startBtn');
const startBtnMobile = document.getElementById('startBtnMobile');
const skipBtn = document.getElementById('skipBtn');
const submitBtn = document.getElementById('submitBtn');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('scoreValue');
const accuracyEl = document.getElementById('accuracyValue');
const avgTimeEl = document.getElementById('avgTimeValue');
const highScoreEl = document.getElementById('highScoreValue');
const feedbackEl = document.getElementById('feedback');
const topicEl = document.getElementById('topic');
const topicElMobile = document.getElementById('topicMobile');
const difficultyEl = document.getElementById('difficulty');
const difficultyElMobile = document.getElementById('difficultyMobile');
const timerInputEl = document.getElementById('timerInput');
const timerInputElMobile = document.getElementById('timerInputMobile');
const progressBar = document.getElementById('progressBar');
const historyBody = document.getElementById('historyBody');
const mobileKeypad = document.getElementById('mobileKeypad');
const progressText = document.getElementById('progressText');
const buttonContainer = document.getElementById('buttonContainer');

// Utility functions
function generateNumber(max, min = 1) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMaxNum(diff) {
  const limits = {
    easy: 25,
    medium: 100,
    hard: 500,
    expert: 1000
  };
  return limits[diff] || 100;
}

function getCurrentTopic() {
  return isMobile ? topicElMobile.value : topicEl.value;
}

function getCurrentDifficulty() {
  return isMobile ? difficultyElMobile.value : difficultyEl.value;
}

function getCurrentTimer() {
  return parseInt((isMobile ? timerInputElMobile.value : timerInputEl.value) || '60');
}

function getHighScoreKey() {
  return `cat_math_${getCurrentTopic()}_${getCurrentDifficulty()}_highscore`;
}

function loadHighScore() {
  return window.highScores?.[getHighScoreKey()] || 0;
}

function saveHighScore(newScore) {
  if (!window.highScores) {
    window.highScores = {};
  }
  const currentHigh = loadHighScore();
  if (newScore > currentHigh) {
    window.highScores[getHighScoreKey()] = newScore;
    return true;
  }
  return false;
}

// Enhanced keypad feedback - optimized for speed
function keypadFeedback(button) {
  button.classList.add('pressed');
  setTimeout(() => button.classList.remove('pressed'), 50);
  
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
  
  if (audioContext && beepSound) {
    setTimeout(() => {
      try {
        beepSound();
      } catch (e) {
        console.log('Audio feedback failed');
      }
    }, 0);
  }
}

// Sync controls between desktop and mobile
function syncControls() {
  if (!isMobile) {
    topicElMobile.value = topicEl.value;
    difficultyElMobile.value = difficultyEl.value;
    timerInputElMobile.value = timerInputEl.value;
  } else {
    topicEl.value = topicElMobile.value;
    difficultyEl.value = difficultyElMobile.value;
    timerInputEl.value = timerInputElMobile.value;
  }
}

// Improved mobile detection
function detectMobile() {
  const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  isMobile = hasTouch && (userAgentMobile || isSmallScreen);
  
  console.log('Mobile detection:', {
    userAgentMobile,
    hasTouch,
    isSmallScreen,
    finalResult: isMobile
  });
  
  // Always hide keypad initially and show/hide based on game state
  mobileKeypad.style.display = 'none';
  
  if (isMobile) {
    console.log('Mobile detected, keypad will show during game');
    answerEl.setAttribute('readonly', true);
    answerEl.setAttribute('inputmode', 'none');
    answerEl.style.caretColor = 'transparent';
  } else {
    console.log('Desktop detected, keypad will stay hidden');
    answerEl.removeAttribute('readonly');
    answerEl.removeAttribute('inputmode');
    answerEl.style.caretColor = '';
  }
}

function showGameElements() {
  answerEl.classList.add('visible');
  buttonContainer.classList.add('visible');
  
  // Show keypad on mobile using visibility instead of display
  if (isMobile && gameActive) {
    // Restore all dimensions to make keypad visible
    mobileKeypad.style.visibility = 'visible';
    mobileKeypad.style.opacity = '1';
    mobileKeypad.style.height = 'auto';
    mobileKeypad.style.padding = '18px';
    mobileKeypad.style.margin = '15px auto';
    mobileKeypad.style.borderWidth = '1px';
    mobileKeypad.style.gap = '10px';
    mobileKeypad.style.pointerEvents = 'auto';
  }
  
  answerEl.disabled = false;
  
  if (!isMobile) {
    setTimeout(() => answerEl.focus(), 100);
  }
}

function hideGameElements() {
  answerEl.classList.remove('visible');
  buttonContainer.classList.remove('visible');
  
  // Hide keypad by collapsing all dimensions
  if (isMobile) {
    mobileKeypad.style.visibility = 'hidden';
    mobileKeypad.style.opacity = '0';
    mobileKeypad.style.height = '0';
    mobileKeypad.style.padding = '0';
    mobileKeypad.style.margin = '0';
    mobileKeypad.style.borderWidth = '0';
    mobileKeypad.style.gap = '0';
    mobileKeypad.style.pointerEvents = 'none';
  }
  
  answerEl.disabled = true;
  answerEl.value = '';
}

// Countdown function
function startCountdown() {
  if (!audioContext) {
    initAudio();
  }
  
  syncControls();

  if (isMobile) {
    setTimeout(() => {
      const questionSection = document.querySelector('.timer-display');
      if (questionSection) {
        questionSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest' 
        });
      }
    }, 100);
  }
  
  startBtn.disabled = true;
  startBtnMobile.disabled = true;
  startBtn.textContent = '⏳ Starting...';
  startBtnMobile.textContent = '⏳ Starting...';

  // Show game elements immediately
  // showGameElements();
  // startKeypadMonitoring();
  
  let countdown = 3;
  
  questionEl.innerHTML = `<div style="font-size: 3rem; color: #4f46e5; font-weight: 700; animation: pulse 0.5s ease-in-out;">${countdown}</div>`;
  
  if (audioContext && beepSound) {
    try {
      beepSound();
    } catch (e) {
      console.log('Countdown beep failed');
    }
  }
  
  const countdownTimer = setInterval(() => {
    countdown--;
    
    if (countdown > 0) {
      questionEl.innerHTML = `<div style="font-size: 3rem; color: #4f46e5; font-weight: 700; animation: pulse 0.5s ease-in-out;">${countdown}</div>`;
      if (audioContext && beepSound) {
        try {
          beepSound();
        } catch (e) {
          console.log('Countdown beep failed');
        }
      }
    } else {
      questionEl.innerHTML = `<div style="font-size: 3rem; color: #10b981; font-weight: 700; animation: pulse 0.3s ease-in-out;">GO!</div>`;
      
      if (audioContext && successSound) {
        try {
          successSound();
        } catch (e) {
          console.log('Go sound failed');
        }
      }
      
      clearInterval(countdownTimer);
      
      setTimeout(() => {
        startTest();
      }, 500);
    }
  }, 1000);
}

// Game functions
function startTest() {
  startBtn.disabled = false;
  startBtnMobile.disabled = false;
  
  gameActive = true;
  score = 0;
  totalQuestions = 0;
  totalTimePerQuestion = 0;
  history = [];
  
  updateStats();
  updateProgress();
  updateHistory();
  
  feedbackEl.style.display = 'none';
  feedbackEl.className = 'feedback';
  
  timeLeft = getCurrentTimer();
  initialTimeLimit = timeLeft;
  timerEl.textContent = `⏱️ Time Left: ${timeLeft}s`;
  timerEl.className = 'timer-display';
  
  startBtn.textContent = '🛑 Stop Test';
  startBtnMobile.textContent = '🛑 Stop';
  
  showGameElements();
  startKeypadMonitoring(); 
  nextQuestion();
  
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `⏱️ Time Left: ${timeLeft}s`;
    
    if (timeLeft <= 10) {
      timerEl.className = 'timer-display timer-warning';
    }
    
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameActive = false;
  isProcessingAnswer = false;
  clearInterval(timer);
  stopKeypadMonitoring(); 
  
  const accuracy = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0;
  
  questionEl.innerHTML = `
    <div class="game-over">
      <h2>🏁 Time's Up!</h2>
      <p>Final Score: <strong>${score}/${totalQuestions}</strong></p>
      <p>Accuracy: <strong>${accuracy}%</strong></p>
      <p>Questions attempted / minute: <strong>${(score / (initialTimeLimit / 60)).toFixed(1)}</strong></p>
      <p>Avg. Time / Question: <strong>${score > 0 ? (totalTimePerQuestion / score).toFixed(1) : '0.0'}s</strong></p>
    </div>
  `;
  
  hideGameElements();
  
  startBtn.textContent = '🚀 Start Test';
  startBtnMobile.textContent = '🚀 Start';
  timerEl.className = 'timer-display';
  
  if (saveHighScore(score)) {
    showFeedback('🎉 New High Score! Well done!', true, 5000);
    if (successSound) {
      try {
        successSound();
      } catch (e) {
        console.log('Success sound failed');
      }
    }
  }
  
  updateStats();
}

function nextQuestion() {
  if (!gameActive) return;
  
  isProcessingAnswer = false;
  let topic = getCurrentTopic();
  let diff = getCurrentDifficulty();
  
  totalQuestions++;
  startTime = Date.now();
  answerEl.value = '';
  hideFeedback();
  
  let num1, num2, question;
  
  switch(topic) {
    case 'add':
      const maxAdd = getMaxNum(diff);
      num1 = generateNumber(maxAdd);
      num2 = generateNumber(maxAdd);
      currentAnswer = num1 + num2;
      question = `${num1} + ${num2} = ?`;
      break;
      
    case 'sub':
      const maxSub = getMaxNum(diff);
      num1 = generateNumber(maxSub);
      num2 = generateNumber(num1);
      currentAnswer = num1 - num2;
      question = `${num1} - ${num2} = ?`;
      break;
      
    case 'mul':
      const maxMul = Math.min(Math.sqrt(getMaxNum(diff) * 2), 50);
      num1 = generateNumber(Math.floor(maxMul), 2);
      num2 = generateNumber(Math.floor(maxMul), 2);
      currentAnswer = num1 * num2;
      question = `${num1} × ${num2} = ?`;
      break;
      
    case 'div':
      const maxDiv = Math.min(getMaxNum(diff) / 10, 25);
      num2 = generateNumber(Math.floor(maxDiv), 2);
      currentAnswer = generateNumber(Math.floor(maxDiv), 1);
      num1 = currentAnswer * num2;
      question = `${num1} ÷ ${num2} = ?`;
      break;
      
    case 'sq':
      const sqMax = Math.min(30, diff === 'easy' ? 15 : diff === 'medium' ? 20 : diff === 'hard' ? 25 : 30);
      num1 = generateNumber(sqMax, 1);
      currentAnswer = num1 * num1;
      question = `${num1}² = ?`;
      break;
      
    case 'cube':
      const cubeMax = Math.min(20, diff === 'easy' ? 10 : diff === 'medium' ? 12 : diff === 'hard' ? 15 : 20);
      num1 = generateNumber(cubeMax, 1);
      currentAnswer = num1 * num1 * num1;
      question = `${num1}³ = ?`;
      break;
      
    case 'sqrt':
      const maxSqrt = diff === 'easy' ? 15 : diff === 'medium' ? 20 : diff === 'hard' ? 25 : 30;
      num1 = generateNumber(maxSqrt, 1);
      const perfectSquare = num1 * num1;
      currentAnswer = num1;
      question = `√${perfectSquare} = ?`;
      break;
      
    case 'cbrt':
      const maxCbrt = diff === 'easy' ? 8 : diff === 'medium' ? 10 : diff === 'hard' ? 12 : 15;
      num1 = generateNumber(maxCbrt, 1);
      const perfectCube = num1 * num1 * num1;
      currentAnswer = num1;
      question = `∛${perfectCube} = ?`;
      break;
      
    case 'perc':
      const fractions = [
        {n: 1, d: 2, p: 50},      // 1/2 = 50%
        {n: 1, d: 3, p: 33.33},   // 1/3 = 33.33%
        {n: 1, d: 4, p: 25},      // 1/4 = 25%
        {n: 1, d: 5, p: 20},      // 1/5 = 20%
        {n: 1, d: 6, p: 16.67},   // 1/6 = 16.67%
        {n: 1, d: 7, p: 14.29},   // 1/7 = 14.29%
        {n: 1, d: 8, p: 12.5},    // 1/8 = 12.5%
        {n: 1, d: 9, p: 11.11},   // 1/9 = 11.11%
        {n: 1, d: 10, p: 10},     // 1/10 = 10%
        {n: 1, d: 11, p: 9.09},   // 1/11 = 9.09%
        {n: 1, d: 12, p: 8.33},   // 1/12 = 8.33%
        {n: 1, d: 13, p: 7.69},   // 1/13 = 7.69%
        {n: 1, d: 14, p: 7.14},   // 1/14 = 7.14%
        {n: 1, d: 15, p: 6.67},   // 1/15 = 6.67%
        {n: 1, d: 16, p: 6.25},   // 1/16 = 6.25%
        {n: 1, d: 17, p: 5.88},   // 1/17 = 5.88%
        {n: 1, d: 18, p: 5.56},   // 1/18 = 5.56%
        {n: 1, d: 19, p: 5.26},   // 1/19 = 5.26%
        {n: 1, d: 20, p: 5},      // 1/20 = 5%
        {n: 1, d: 25, p: 4},      // 1/25 = 4%
        {n: 1, d: 50, p: 2},      // 1/50 = 2%
        {n: 1, d: 75, p: 1.33}    // 1/75 = 1.33%
      ];
      
      let availableFractions;
      if (diff === 'easy') {
        availableFractions = fractions.filter(f => f.d <= 10);
      } else if (diff === 'medium') {
        availableFractions = fractions.filter(f => f.d <= 20);
      } else {
        availableFractions = fractions;
      }
      
      const selectedFraction = availableFractions[generateNumber(availableFractions.length) - 1];
      currentAnswer = selectedFraction.p;
      question = `${selectedFraction.n}/${selectedFraction.d} = ?%`;
      break;
      
    case 'rem':
      num2 = generateNumber(15, 2);
      const quotient = generateNumber(20, 1);
      const remainder = generateNumber(num2 - 1, 0);
      num1 = quotient * num2 + remainder;
      currentAnswer = remainder;
      question = `Remainder: ${num1} ÷ ${num2} = ?`;
      break;
  }
  
  questionEl.textContent = question;
  
  if (!isMobile) {
    setTimeout(() => answerEl.focus(), 100);
  }
}

function checkAnswer() {
  if (!gameActive || isProcessingAnswer) return;
  
  isProcessingAnswer = true;
  
  let elapsed = (Date.now() - startTime) / 1000;
  totalTimePerQuestion += elapsed;
  
  let userAnswer = parseFloat(answerEl.value);
  let isCorrect = false;
  
  if (isNaN(userAnswer)) {
    userAnswer = 'No answer';
    isCorrect = false;
  } else if (getCurrentTopic() === 'perc') {
    isCorrect = Math.abs(userAnswer - currentAnswer) < 0.1;
  } else {
    isCorrect = userAnswer === currentAnswer;
  }
  
  let result = '';
  if (isCorrect) {
    score++;
    result = 'Correct';
    showFeedback('✅ Correct!', true, 3000);
    if (successSound) {
      try {
        successSound();
      } catch (e) {
        console.log('Success sound failed');
      }
    }
  } else {
    result = 'Wrong';
    showFeedback(`❌ Correct answer: ${currentAnswer}`, false, 3000);
    if (errorSound) {
      try {
        errorSound();
      } catch (e) {
        console.log('Error sound failed');
      }
    }
  }
  
  history.unshift({
    q: questionEl.textContent,
    user: userAnswer,
    correct: currentAnswer,
    time: elapsed.toFixed(2),
    result: result
  });
  
  updateStats();
  updateProgress();
  updateHistory();
  
  setTimeout(() => {
    if (gameActive) {
      nextQuestion();
      isProcessingAnswer = false;
    }
  }, 600);
}

function stopTest() {
  if (!gameActive) return;
  
  gameActive = false;
  clearInterval(timer);
  stopKeypadMonitoring(); 
  
  const accuracy = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0;
  const elapsedTime = initialTimeLimit - timeLeft;
  
  questionEl.innerHTML = `
    <div class="game-over">
      <h2>🛑 Test Stopped</h2>
      <p>Time Elapsed: <strong>${elapsedTime}s</strong></p>
      <p>Final Score: <strong>${score}/${totalQuestions}</strong></p>
      <p>Accuracy: <strong>${accuracy}%</strong></p>
      <p>Questions per minute: <strong>${totalQuestions > 0 ? (totalQuestions / (elapsedTime / 60)).toFixed(1) : '0.0'}</strong></p>
      <p>Avg. Time per Question: <strong>${totalQuestions > 0 ? (totalTimePerQuestion / totalQuestions).toFixed(1) : '0.0'}s</strong></p>
    </div>
  `;
  
  hideGameElements();
  
  startBtn.textContent = '🚀 Start Test';
  startBtnMobile.textContent = '🚀 Start';
  timerEl.className = 'timer-display';
  
  if (saveHighScore(score)) {
    showFeedback('🎉 New High Score! Well done!', true, 5000);
    if (successSound) {
      try {
        successSound();
      } catch (e) {
        console.log('Success sound failed');
      }
    }
  }
  
  updateStats();
}

function skipQuestion() {
  if (!gameActive) return;
  
  let elapsed = (Date.now() - startTime) / 1000;
  totalTimePerQuestion += elapsed;
  
  history.unshift({
    q: questionEl.textContent,
    user: 'Skipped',
    correct: currentAnswer,
    time: elapsed.toFixed(2),
    result: 'Skipped'
  });
  
  showFeedback(`⏭️ Skipped - Answer was: ${currentAnswer}`, false, 3000);
  
  updateStats();
  updateProgress();
  updateHistory();
  
  setTimeout(() => {
    if (gameActive) nextQuestion();
  }, 600);
}

// Event listeners
answerEl.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && gameActive && this.value.trim() !== '') {
    e.preventDefault();
    checkAnswer();
  } else if (e.key === 'Escape' && gameActive) {
    e.preventDefault();
    skipQuestion();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && gameActive) {
    e.preventDefault();
    skipQuestion();
  }
});

skipBtn.addEventListener('click', skipQuestion);

submitBtn.addEventListener('click', () => {
  if (gameActive && answerEl.value.trim() !== '') {
    checkAnswer();
  }
});

// Mobile keypad event listeners
mobileKeypad.addEventListener('touchstart', function(e) {
  e.preventDefault();
  
  if (!e.target.classList.contains('keypad-btn') || !gameActive) return;
  
  const key = e.target.getAttribute('data-key');
  const currentValue = answerEl.value;
  
  console.log('Keypad button touched:', key, 'Current value:', currentValue);
  
  keypadFeedback(e.target);
  
  switch(key) {
    case 'backspace':
      answerEl.value = currentValue.slice(0, -1);
      break;
    case 'clear':
      answerEl.value = '';
      break;
    case 'enter':
      if (currentValue.trim() !== '') {
        console.log('Submitting answer via keypad:', currentValue);
        checkAnswer();
      }
      break;
    case '-':
      if (currentValue === '' || currentValue === '0') {
        answerEl.value = '-';
      }
      break;
    case '.':
      if (!currentValue.includes('.')) {
        answerEl.value = currentValue === '' ? '0.' : currentValue + '.';
      }
      break;
    default:
      if (currentValue === '0' && key !== '.') {
        answerEl.value = key;
      } else {
        answerEl.value = currentValue + key;
      }
      break;
  }
  
  console.log('New value after keypad input:', answerEl.value);
}, {passive: false});

mobileKeypad.addEventListener('click', function(e) {
  if (e.target.classList.contains('keypad-btn') && gameActive) {
    const key = e.target.getAttribute('data-key');
    const currentValue = answerEl.value;
    
    keypadFeedback(e.target);
    
    switch(key) {
      case 'backspace':
        answerEl.value = currentValue.slice(0, -1);
        break;
      case 'clear':
        answerEl.value = '';
        break;
      case 'enter':
        if (currentValue.trim() !== '') {
          checkAnswer();
        }
        break;
      case '-':
        if (currentValue === '' || currentValue === '0') {
          answerEl.value = '-';
        }
        break;
      case '.':
        if (!currentValue.includes('.')) {
          answerEl.value = currentValue === '' ? '0.' : currentValue + '.';
        }
        break;
      default:
        if (currentValue === '0' && key !== '.') {
          answerEl.value = key;
        } else {
          answerEl.value = currentValue + key;
        }
        break;
    }
  }
});

mobileKeypad.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

startBtn.addEventListener('click', () => {
  if (gameActive) {
    stopTest();
  } else {
    startCountdown();
  }
});

startBtnMobile.addEventListener('click', () => {
  if (gameActive) {
    stopTest();
  } else {
    startCountdown();
  }
});

// Topic/difficulty change handlers
topicEl.addEventListener('change', () => {
  syncControls();
  updateStats();
});

topicElMobile.addEventListener('change', () => {
  syncControls();
  updateStats();
});

difficultyEl.addEventListener('change', () => {
  syncControls();
  updateStats();
});

difficultyElMobile.addEventListener('change', () => {
  syncControls();
  updateStats();
});

timerInputEl.addEventListener('input', () => {
  syncControls();
});

timerInputElMobile.addEventListener('input', () => {
  syncControls();
});

// Update functions
function updateStats() {
  let accuracy = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : 0;
  let avgTime = totalQuestions > 0 ? (totalTimePerQuestion / totalQuestions).toFixed(2) : 0;
  
  scoreEl.textContent = totalQuestions > 0 ? `${score}/${totalQuestions}` : '0/0';
  accuracyEl.textContent = `${accuracy}%`;
  avgTimeEl.textContent = `${avgTime}s`;
  highScoreEl.textContent = loadHighScore();
}

function updateProgress() {
  if (totalQuestions === 0) {
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    return;
  }
  
  let percent = Math.min((score / totalQuestions) * 100, 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent.toFixed(1)}%`;
}

function updateHistory() {
  historyBody.innerHTML = '';
  
  if (history.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #64748b; font-style: italic;">
          No practice history yet. Start a test to see your progress!
        </td>
      </tr>
    `;
    return;
  }
  
  const maxEntries = isMobile ? 5 : 10;
  const recentHistory = [...history].reverse();
  
  recentHistory.forEach((h, i) => {
    let tr = document.createElement('tr');
    const resultClass = h.result.toLowerCase() === 'skipped' ? 'result-wrong' : `result-${h.result.toLowerCase()}`;
    
    let shortQ = h.q;
    if (isMobile && h.q.length > 15) {
      shortQ = h.q.substring(0, 15) + '...';
    }
    
    let shortUser = h.user;
    if (isMobile && typeof h.user === 'string' && h.user.length > 8) {
      shortUser = h.user.substring(0, 8) + '...';
    }
    
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td style="font-size: ${isMobile ? '0.8rem' : '0.9rem'};">${shortQ}</td>
      <td>${shortUser}</td>
      <td>${h.correct}</td>
      <td>${h.time}s</td>
      <td class="${resultClass}">${isMobile ? (h.result === 'Correct' ? '✓' : h.result === 'Wrong' ? '✗' : '⏭') : h.result}</td>
    `;
    historyBody.appendChild(tr);
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...');
  
  detectMobile();
  
  updateStats();
  updateHistory();
  
  // Prevent zoom on double tap for mobile
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    let now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  document.addEventListener('touchstart', function() {}, {passive: true});
  
  document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, {passive: false});
  
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    input, textarea {
      -webkit-user-select: text;
      -khtml-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
  `;
  document.head.appendChild(style);
  
  document.addEventListener('gesturestart', function(event) {
    event.preventDefault();
  });
  
  timerInputEl.addEventListener('input', function() {
    let value = parseInt(this.value);
    if (value > 300) this.value = 300;
  });
  
  timerInputElMobile.addEventListener('input', function() {
    let value = parseInt(this.value);
    if (value > 300) this.value = 300;
  });
  
  document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
    }
  });
  
  window.addEventListener('resize', function() {
    detectMobile();
  });

  // Add scroll event listener to prevent keypad issues
document.addEventListener('scroll', function() {
  if (gameActive && isMobile) {
    setTimeout(() => {
      if (mobileKeypad.style.display !== 'grid') {
        mobileKeypad.style.display = 'grid';
        mobileKeypad.classList.add('game-active');
      }
    }, 100);
  }
});

// Add resize event listener
window.addEventListener('resize', function() {
  if (gameActive && isMobile) {
    setTimeout(() => {
      mobileKeypad.style.display = 'grid';
      mobileKeypad.classList.add('game-active');
    }, 100);
  }
});
  
  console.log('Initialization complete');
});
