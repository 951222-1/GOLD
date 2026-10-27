const BASE = import.meta.env.BASE_URL || './';

// Web Audio API 音效引擎 (支援真實音訊解碼播放與原生合成音備援)
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastStretchTime = 0;
    this.lastWaterSloshTime = 0;
    this.audioBuffers = {};
    this.loading = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.loading && this.ctx) {
      this.loadSoundAssets();
    }
  }

  // 預載外部 MP3 音效檔案並透過 AudioContext 解碼為高品質低延遲 Buffer
  async loadSoundAssets() {
    this.loading = true;
    const soundList = [
      { key: 'water_slosh', file: 'water_slosh.mp3' }, // 清脆溪水拍打 ASMR 聲
      { key: 'coin_clink', file: 'coin_clink.mp3' },   // 金幣清脆碰撞音效
      { key: 'junk', file: 'junk.mp3' }                // 廢鐵卡通音效
    ];

    for (const item of soundList) {
      try {
        const url = `${BASE}audio/${item.file}`.replace('//', '/');
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const arrayBuf = await resp.arrayBuffer();
        if (this.ctx) {
          const decoded = await this.ctx.decodeAudioData(arrayBuf);
          this.audioBuffers[item.key] = decoded;
        }
      } catch (err) {
        console.warn(`Failed to decode audio asset ${item.file}:`, err);
      }
    }
  }

  // 播放已解碼真實音訊 Buffer (支援音量、隨機音高防疲乏、以及自動淡出截斷)
  playBuffer(key, { volume = 0.4, detune = 0, maxDuration = null } = {}) {
    if (!this.enabled) return false;
    this.init();
    if (!this.ctx) return false;

    const buffer = this.audioBuffers[key];
    if (!buffer) return false;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      if (detune !== 0 && source.detune) {
        source.detune.setValueAtTime(detune, this.ctx.currentTime);
      }

      const gainNode = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gainNode.gain.setValueAtTime(volume, now);

      if (maxDuration && maxDuration < buffer.duration) {
        // 在結尾前 0.6 秒優雅指數漸弱淡出
        const fadeStart = now + Math.max(0.1, maxDuration - 0.6);
        gainNode.gain.setValueAtTime(volume, fadeStart);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + maxDuration);
        source.stop(now + maxDuration);
      }

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(now);
      return true;
    } catch (err) {
      console.warn(`Error playing sound buffer ${key}:`, err);
      return false;
    }
  }

  playTone(freq, type = 'sine', duration = 0.12, volume = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // 忽略音效播放異常
    }
  }

  // 命中音效 (碰觸目標)
  playHit() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore
    }
  }

  // 彈弓皮筋拉緊微弱繃弦聲
  playStretch(progress = 0.5) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastStretchTime < 180) return; // 節流防止過頻
    this.lastStretchTime = now;

    try {
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = 160 + progress * 240;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 80, t + 0.09);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
      // ignore
    }
  }

  // 彈弓發射破空「咻——」聲
  playShoot() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  // 水果擊中爆裂「啵碰！」清脆音效
  playFruitHit() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // 第 1 聲：清脆擊中
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // 第 2 聲：低沉破裂
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(320, now + 0.03);
      osc2.frequency.exponentialRampToValueAtTime(120, now + 0.2);
      gain2.gain.setValueAtTime(0.22, now + 0.03);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.03);
      osc2.stop(now + 0.2);
    } catch {
      // ignore
    }
  }

  // 新水果生長啵一聲
  playFruitRespawn() {
    this.playTone(660, 'sine', 0.08, 0.08);
  }

  // 深蹲完成音效 (雙音悅耳和弦)
  playSuccess() {
    this.playTone(587.33, 'sine', 0.1, 0.18); // D5
    setTimeout(() => {
      this.playTone(880, 'sine', 0.2, 0.22); // A5
    }, 90);
  }

  // 下蹲到位提醒音
  playDownPrompt() {
    this.playTone(392, 'sine', 0.08, 0.12); // G4
  }

  // 煙火升空「咻——」哨音
  playFireworkWhistle() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.55);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  // 煙火震撼爆炸「碰！轟——」
  playFireworkBoom(multiplier = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. 重低音衝擊波
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

      const baseVol = Math.min(0.5, 0.28 * multiplier);
      subGain.gain.setValueAtTime(baseVol, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.55);

      // 2. 爆炸白噪音裂響
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.4);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32 * multiplier, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.4);
    } catch {}
  }

  // 煙火劈啪劈啪碎星 (Crackle)
  playFireworkCrackle() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const count = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const delay = Math.random() * 0.25;
        setTimeout(() => {
          this.playTone(1800 + Math.random() * 1200, 'triangle', 0.03, 0.06);
        }, delay * 1000);
      }
    } catch {}
  }

  // 星光閃耀清亮音效
  playSparkle() {
    this.playTone(1318.5, 'sine', 0.08, 0.1); // E6
    setTimeout(() => this.playTone(1760, 'sine', 0.12, 0.12), 40); // A6
  }

  // 淘金舀水入泥沙聲
  playScoopWater() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // 淘金搖晃水花嘩啦聲 (優先播放真實 清脆溪水拍打 ASMR 聲.mp3)
  playWaterSlosh() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastWaterSloshTime < 750) return; // 750ms 舒適節流，維持天然溪水拍打 ASMR 的自然流動
    this.lastWaterSloshTime = now;

    if (this.playBuffer('water_slosh', {
      volume: 0.4,
      detune: (Math.random() - 0.5) * 60,
      maxDuration: 2.3,
    })) {
      return;
    }

    this.fallbackWaterSlosh();
  }

  // 淘金水花後備合成音
  fallbackWaterSlosh() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, t);
      filter.Q.value = 1.8;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.15);
    } catch {}
  }

  // 金幣/金礦清脆撞擊「叮鏘！」(優先播放真實 金幣清脆碰撞音效.mp3)
  playCoinClink() {
    if (!this.enabled) return;

    if (this.playBuffer('coin_clink', {
      volume: 0.65,
      detune: (Math.random() - 0.5) * 40,
    })) {
      return;
    }

    this.fallbackCoinClink();
  }

  // 金幣碰撞後備合成音
  fallbackCoinClink() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [2093, 3135];
      freqs.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch {}
  }

  // 挖到大寶物勝利號角/和弦
  playFanfare() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.22, 0.18);
      }, index * 70);
    });
  }

  // 淘出廢鐵/破爛逗趣音效 (優先播放真實 廢鐵卡通音效.mp3)
  playJunk() {
    if (!this.enabled) return;

    if (this.playBuffer('junk', {
      volume: 0.52,
      maxDuration: 4.2, // 播放 4.2 秒經典逗趣卡通音效並自然淡出
    })) {
      return;
    }

    this.fallbackJunk();
  }

  // 廢鐵後備合成音
  fallbackJunk() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // 重置/點擊按鈕音
  playClick() {
    this.playTone(400, 'triangle', 0.05, 0.1);
  }
}

export const sound = new SoundEffects();
