import { sound } from './services/audio.js';
import { CameraManager } from './services/camera.js';
import { visionEngine } from './services/vision.js';
import { CanvasRenderer } from './render/renderer.js';
import { GoldPanMode } from './modes/goldPanMode.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">MEDIAPIPE VISION INTERACTIVE</p>
        <h1>體感淘金洗泥沙 🪙</h1>
        <p class="subtitle">雙手化作淘金盤深入溪流舀沙，自然晃動淘洗讓泥水漸漸澄澈，淘出大金塊與逗趣古怪雜物！</p>
      </div>
      <div class="hero-actions">
        <button class="secondary icon-btn" id="soundToggle" title="音效開關">🔊 音效</button>
        <div class="badge"><span class="dot" id="statusDot"></span><span id="status">尚未啟動</span></div>
      </div>
    </header>

    <section class="stage-card">
      <div class="stage" id="stage">
        <video id="webcam" autoplay playsinline muted></video>
        <canvas id="overlay"></canvas>
        <div class="empty-state" id="emptyState">
          <div class="camera-icon">🪙</div>
          <h2>準備開始解壓淘金探險</h2>
          <p>請點擊「啟動 Webcam」允許攝影機權限，放鬆心情，將雙手捧在鏡頭前畫圓淘洗泥沙！</p>
        </div>
      </div>

      <div class="controls">
        <button class="primary" id="startButton">啟動 Webcam</button>
        <button class="secondary" id="stopButton" disabled>停止</button>
        <button class="secondary" id="resetButton" disabled>重設計數/分數</button>
        <div class="metrics">
          <span>FPS <strong id="fps">—</strong></span>
          <span>辨識 <strong id="detection">—</strong></span>
          <span class="metric-highlight"><span id="metricLabel">淘得收穫數</span> <strong id="metricValue">0</strong></span>
          <span id="extraMetric">—</span>
        </div>
      </div>
    </section>

    <section class="info-grid">
      <article>
        <span class="info-label">STEP 1. 舀取河沙</span>
        <strong>雙手下移浸入溪流</strong>
        <small>雙手捧盤下移浸入畫面下方的流水波光處，舀起滿盤厚重沉甸甸的河底泥沙。</small>
      </article>
      <article>
        <span class="info-label">STEP 2. 輕柔淘洗</span>
        <strong>雙手自然晃動沖洗</strong>
        <small>雙手在胸前自然左右搖晃淘洗，泥水漸漸由混濁變清澈，雜質隨柔和水波洗淨！</small>
      </article>
      <article>
        <span class="info-label">STEP 3. 解壓驚喜</span>
        <strong>碰觸或傾倒收穫</strong>
        <small>溪水澄澈透底後，盤底的珍貴金沙、大金塊，或是生鏽螺絲、破皮鞋等驚喜顯現！</small>
      </article>
    </section>

    <p class="footnote">提示：Webcam 權限僅供本頁瀏覽器即時本機運算，影像絕對不會上傳至伺服器。</p>
  </main>
`;

const video = document.querySelector('#webcam');
const canvas = document.querySelector('#overlay');
const stage = document.querySelector('#stage');
const emptyState = document.querySelector('#emptyState');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const resetButton = document.querySelector('#resetButton');
const soundToggle = document.querySelector('#soundToggle');
const statusEl = document.querySelector('#status');
const statusDot = document.querySelector('#statusDot');
const fpsEl = document.querySelector('#fps');
const detectionEl = document.querySelector('#detection');
const metricLabel = document.querySelector('#metricLabel');
const metricValue = document.querySelector('#metricValue');
const extraMetric = document.querySelector('#extraMetric');

const camera = new CameraManager(video);
const renderer = new CanvasRenderer(canvas);
const goldPanGame = new GoldPanMode();

let running = false;
let lastVideoTime = -1;
let frameCount = 0;
let lastFpsUpdate = performance.now();

soundToggle.addEventListener('click', () => {
  sound.init();
  sound.enabled = !sound.enabled;
  soundToggle.textContent = sound.enabled ? '🔊 音效' : '🔇 靜音';
  sound.playClick();
});

// 使用者與頁面首次互動即預先解鎖音效與預載 MP3
window.addEventListener('pointerdown', () => sound.init(), { once: true });

function updateMetricsUI() {
  const m = goldPanGame.getMetrics();
  metricLabel.textContent = m.label;
  metricValue.textContent = String(m.count);
  extraMetric.textContent = `${m.status} (${m.detail || ''})`;
}

function updateFps() {
  frameCount += 1;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    fpsEl.textContent = String(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

function renderLoop() {
  if (!running) return;

  try {
    if (camera.isReady() && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const timestamp = performance.now();
      const width = stage.clientWidth;
      const height = stage.clientHeight;

      const { poseResult, handResult } = visionEngine.detect(
        video,
        timestamp,
        goldPanGame.requirements
      );

      renderer.clear(width, height);
      goldPanGame.update({ handResult, poseResult }, renderer, width, height);

      const detected = poseResult?.landmarks?.[0] || handResult?.landmarks?.length;
      detectionEl.textContent = detected ? '已偵測' : '未偵測';
      updateMetricsUI();
      updateFps();
    }
  } catch (err) {
    console.warn('Render loop encountered recoverable frame error:', err);
  } finally {
    if (running) {
      requestAnimationFrame(renderLoop);
    }
  }
}

async function start() {
  if (running) return;
  sound.playClick();
  startButton.disabled = true;
  statusEl.textContent = '載入模型中…';
  statusDot.className = 'dot';

  try {
    await visionEngine.init();
    await camera.start();

    renderer.resize(stage);
    goldPanGame.init(stage.clientWidth, stage.clientHeight);

    running = true;
    emptyState.hidden = true;
    stopButton.disabled = false;
    resetButton.disabled = false;
    statusEl.textContent = '辨識中';
    statusDot.className = 'dot active';

    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error(error);
    statusEl.textContent = '啟動失敗';
    startButton.disabled = false;
    alert(`無法啟動：${error.message}`);
  }
}

function stop() {
  sound.playClick();
  running = false;
  camera.stop();
  renderer.clear(stage.clientWidth, stage.clientHeight);
  emptyState.hidden = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  resetButton.disabled = true;
  statusEl.textContent = '已停止';
  statusDot.className = 'dot';
  fpsEl.textContent = '—';
  detectionEl.textContent = '—';
}

startButton.addEventListener('click', start);
stopButton.addEventListener('click', stop);
resetButton.addEventListener('click', () => {
  sound.playClick();
  goldPanGame.reset();
  goldPanGame.init(stage.clientWidth, stage.clientHeight);
  updateMetricsUI();
});

window.addEventListener('resize', () => {
  if (running) {
    renderer.resize(stage);
    goldPanGame.init(stage.clientWidth, stage.clientHeight);
  }
});

updateMetricsUI();
