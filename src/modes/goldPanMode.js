import { BaseMode } from './baseMode.js';
import { sound } from '../services/audio.js';

// 貴重寶物列表
const TREASURE_TYPES = [
  { id: 'gold_dust', name: '天然淘金沙', icon: '✨', value: 800, weight: 10, color: '#facc15', isJunk: false, quote: '閃亮細緻的天然金粉！' },
  { id: 'gold_coin', name: '西班牙古金幣', icon: '🪙', value: 2500, weight: 35, color: '#f59e0b', isJunk: false, quote: '沉睡百年的海盜古幣！' },
  { id: 'gold_nugget', name: '天然狗頭金', icon: '👑', value: 6500, weight: 80, color: '#fbbf24', isJunk: false, quote: '沉甸甸的珍稀大金塊！' },
  { id: 'ruby', name: '閃耀紅寶石', icon: '💎', value: 12000, weight: 15, color: '#f43f5e', isJunk: false, quote: '剔透無瑕的深山寶石！' },
  { id: 'amber', name: '遠古琥珀化石', icon: '🦖', value: 20000, weight: 45, color: '#ea580c', isJunk: false, quote: '封存千萬年的史前奇蹟！' },
];

// 逗趣廢鐵與雜物列表 (增加淘洗驚喜與莞爾一笑的解壓感)
const JUNK_TYPES = [
  { id: 'rusty_bolt', name: '生鏽大螺帽', icon: '🔩', value: 1, weight: 25, color: '#a8a29e', isJunk: true, quote: '滿滿的鐵鏽味，老礦工掉的？' },
  { id: 'soda_can', name: '壓扁易開罐', icon: '🥫', value: 0, weight: 12, color: '#ef4444', isJunk: true, quote: '是誰在這麼美的河裡亂丟垃圾！' },
  { id: 'old_boot', name: '破爛泡水鞋', icon: '👞', value: 0, weight: 220, color: '#78350f', isJunk: true, quote: '傳說中的淘金老前輩之鞋！' },
  { id: 'rusty_key', name: '神祕生鏽鑰匙', icon: '🗝️', value: 50, weight: 18, color: '#d97706', isJunk: true, quote: '不知道能打開哪座被遺忘的寶箱？' },
  { id: 'old_magnet', name: '廢棄老磁鐵', icon: '🧲', value: 5, weight: 40, color: '#dc2626', isJunk: true, quote: '吸滿了一整層黑黑的重鐵砂！' },
  { id: 'fish_bone', name: '深山魚骨頭', icon: '🦴', value: 0, weight: 5, color: '#e2e8f0', isJunk: true, quote: '純天然深山溪流鈣質補充物。' },
];

export class GoldPanMode extends BaseMode {
  constructor() {
    super('goldpan', '體感淘金洗泥沙', { needPose: true, needHand: true });

    // 淘金盤位置與幾何
    this.pan = { x: 0, y: 0, radiusX: 120, radiusY: 62, tilt: 0 };
    this.panHistory = []; // 歷史軌跡 (用來精確判定畫圓旋轉動作)

    // 水流漩渦旋轉角度與旋轉強度 (ASMR 視覺)
    this.vortexAngle = 0;
    this.vortexSpeed = 0;
    this.swirlIntensity = 0;

    // 淘金狀態: 'EMPTY' (等待舀沙) | 'SIFTING' (旋轉淘洗中) | 'REVEALED' (泥清寶現)
    this.state = 'EMPTY';
    this.mudLevel = 0; // 100 -> 0 (混濁度)

    // 盤內懸浮物、漩渦氣泡與水花
    this.mudParticles = [];
    this.vortexBubbles = [];
    this.waterSplashes = [];
    this.currentTreasures = [];
    this.popups = [];

    // 累積統計 (解壓收集)
    this.totalEarnings = 0;
    this.totalItemsCount = 0;
    this.totalGoldWeight = 0; // 克
    this.junkCount = 0;
    this.roundsCompleted = 0;

    this.promptText = '👇 將雙手下移浸入溪流，舀起一盤泥沙！';
  }

  init(width, height) {
    this.reset();
    this.pan.x = width / 2;
    this.pan.y = height * 0.72;
    this.panHistory = [];
  }

  reset() {
    this.count = 0;
    this.totalEarnings = 0;
    this.totalItemsCount = 0;
    this.totalGoldWeight = 0;
    this.junkCount = 0;
    this.roundsCompleted = 0;
    this.state = 'EMPTY';
    this.mudLevel = 0;
    this.vortexSpeed = 0;
    this.swirlIntensity = 0;
    this.panHistory = [];
    this.mudParticles = [];
    this.vortexBubbles = [];
    this.waterSplashes = [];
    this.currentTreasures = [];
    this.popups = [];
    this.promptText = '👇 將雙手下移浸入溪流，舀起一盤泥沙！';
  }

  // 取得玩家雙手位置
  getHandsPosition(handResult, poseResult, width, height) {
    const hands = handResult?.landmarks || [];
    let h1 = null;
    let h2 = null;

    if (hands.length >= 2) {
      h1 = { x: (1 - hands[0][9].x) * width, y: hands[0][9].y * height };
      h2 = { x: (1 - hands[1][9].x) * width, y: hands[1][9].y * height };
    } else if (hands.length === 1) {
      h1 = { x: (1 - hands[0][9].x) * width, y: hands[0][9].y * height };
    } else {
      const pose = poseResult?.landmarks?.[0];
      if (pose) {
        if (pose[15]?.visibility > 0.4) h1 = { x: (1 - pose[15].x) * width, y: pose[15].y * height };
        if (pose[16]?.visibility > 0.4) h2 = { x: (1 - pose[16].x) * width, y: pose[16].y * height };
      }
    }
    return { h1, h2 };
  }

  // 舀起泥沙並隨機生成本盤隱藏寶物與趣味廢鐵
  scoopGravel(width, height) {
    this.state = 'SIFTING';
    this.mudLevel = 100;
    this.swirlIntensity = 0;
    sound.playScoopWater();

    // 生成隨機泥沙與細礫顆粒
    this.mudParticles = [];
    const count = 55;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.82;
      this.mudParticles.push({
        angle,
        dist,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? '#4e342e' : '#6d4c41',
      });
    }

    // 生成漩渦旋轉小氣泡
    this.vortexBubbles = [];
    for (let i = 0; i < 20; i++) {
      this.vortexBubbles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.15 + Math.random() * 0.75,
        size: 2 + Math.random() * 3,
        speed: 0.03 + Math.random() * 0.04,
      });
    }

    // 隨機決定挖掘物 (1 ~ 3 件，有可能是真金，也可能是搞笑廢鐵)
    this.currentTreasures = [];
    const itemCount = 1 + (Math.random() < 0.45 ? 1 : 0) + (Math.random() < 0.18 ? 1 : 0);

    for (let i = 0; i < itemCount; i++) {
      const isJunkRoll = Math.random() < 0.35; // 35% 機率挖出趣味廢鐵！
      let selectedItem;

      if (isJunkRoll) {
        selectedItem = JUNK_TYPES[Math.floor(Math.random() * JUNK_TYPES.length)];
      } else {
        const roll = Math.random();
        if (roll > 0.94) selectedItem = TREASURE_TYPES[4]; // 琥珀化石
        else if (roll > 0.82) selectedItem = TREASURE_TYPES[3]; // 紅寶石
        else if (roll > 0.6) selectedItem = TREASURE_TYPES[2]; // 狗頭金
        else if (roll > 0.28) selectedItem = TREASURE_TYPES[1]; // 古金幣
        else selectedItem = TREASURE_TYPES[0]; // 金沙
      }

      const angle = Math.random() * Math.PI * 2;
      const dist = 0.25 + Math.random() * 0.5;

      this.currentTreasures.push({
        ...selectedItem,
        relX: Math.cos(angle) * dist,
        relY: Math.sin(angle) * dist,
        collected: false,
      });
    }

    this.promptText = '🌀 雙手畫圓旋轉淘洗～ 感受水流旋渦與泥沙漸漸沖刷！';
  }

  // 偵測「雙手畫圓旋轉」動作物理
  detectCircularSwirl(curX, curY) {
    // 記錄近期軌跡點 (約 18 幀)
    this.panHistory.push({ x: curX, y: curY, time: performance.now() });
    if (this.panHistory.length > 20) {
      this.panHistory.shift();
    }
    if (this.panHistory.length < 8) return 0;

    // 計算這段時間軌跡的中心點
    let sumX = 0, sumY = 0;
    for (const pt of this.panHistory) {
      sumX += pt.x;
      sumY += pt.y;
    }
    const centerX = sumX / this.panHistory.length;
    const centerY = sumY / this.panHistory.length;

    // 計算最新兩點相對於軌跡中心的夾角變化 (角速度 dTheta)
    const p1 = this.panHistory[this.panHistory.length - 2];
    const p2 = this.panHistory[this.panHistory.length - 1];

    const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
    const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);

    let dTheta = angle2 - angle1;
    // 角度過界修正 [-PI, PI]
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;

    const radius = Math.hypot(p2.x - centerX, p2.y - centerY);

    // 當盤子有繞著中心旋轉，且旋轉半徑 > 12px
    if (radius > 12 && Math.abs(dTheta) > 0.04) {
      return dTheta; // 傳回帶有順/逆時針方向的角速度
    }

    // 寬容後備：即使不是標準正圓，水平或橢圓晃動也提供一定淘洗力
    const speed2D = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (speed2D > 3.5) {
      return (p2.x > p1.x ? 0.08 : -0.08);
    }

    return 0;
  }

  // 旋轉淘洗泥沙 (泥水逐漸變清澈)
  processCircularSifting(dTheta) {
    const absD = Math.abs(dTheta);
    if (absD > 0.03) {
      sound.playWaterSlosh();

      // 水流旋渦加速旋轉
      this.vortexSpeed = dTheta * 1.8;
      this.swirlIntensity = Math.min(1.0, this.swirlIntensity + 0.08);

      // 泥沙混濁度遞減 (依旋轉力道平滑洗淨)
      const washSpeed = Math.min(1.8, absD * 12);
      this.mudLevel = Math.max(0, this.mudLevel - washSpeed);

      // 泥沙顆粒往外圍離心漂移
      for (const p of this.mudParticles) {
        p.dist = Math.min(0.95, p.dist + 0.003 * absD * 10);
      }

      // 沿著切線甩出盤緣的水花泥水
      if (Math.random() < 0.6) {
        const splashAngle = this.vortexAngle + Math.random() * 0.5;
        this.waterSplashes.push({
          x: this.pan.x + Math.cos(splashAngle) * (this.pan.radiusX * 0.9),
          y: this.pan.y + Math.sin(splashAngle) * (this.pan.radiusY * 0.9),
          vx: Math.cos(splashAngle + Math.PI / 2) * (2 + Math.random() * 4),
          vy: -1.5 - Math.random() * 2.5,
          size: 2.5 + Math.random() * 3.5,
          color: this.mudLevel > 35 ? 'rgba(121, 85, 72, 0.7)' : 'rgba(186, 230, 253, 0.7)',
          alpha: 1,
        });
      }

      // 泥沙完全洗淨 -> 寶物與廢鐵徹底顯現！
      if (this.mudLevel <= 0 && this.state === 'SIFTING') {
        this.state = 'REVEALED';
        sound.playFanfare();
        this.promptText = '✨ 溪水澄澈透底！伸手碰觸或傾倒淘金盤，看看洗出了什麼！';
      }
    } else {
      // 停止旋轉時，旋渦慢慢減速 (解壓平滑感)
      this.vortexSpeed *= 0.92;
      this.swirlIntensity *= 0.94;
    }
  }

  // 收集寶物或收納廢鐵
  collectTreasure(t, width, height) {
    if (t.collected) return;
    t.collected = true;

    this.totalEarnings += t.value;
    this.totalGoldWeight += (t.isJunk ? 0 : t.weight);
    this.totalItemsCount += 1;
    this.count = this.totalItemsCount;

    if (t.isJunk) {
      this.junkCount += 1;
      sound.playJunk(); // 逗趣的廢鐵音效！
    } else {
      sound.playCoinClink(); // 清脆金幣碰撞聲！
    }

    // 漂浮逗趣與驚喜提示
    const absX = this.pan.x + t.relX * this.pan.radiusX;
    const absY = this.pan.y + t.relY * this.pan.radiusY;
    const gainText = t.isJunk
      ? `${t.icon} ${t.name} (廢鐵 +${t.weight}g)`
      : `${t.icon} ${t.name} +$${t.value}`;

    this.popups.push({
      text: gainText,
      subText: t.quote,
      x: absX,
      y: absY - 15,
      alpha: 1,
      color: t.color,
    });

    // 檢查是否皆已收集
    const allCollected = this.currentTreasures.every((item) => item.collected);
    if (allCollected) {
      setTimeout(() => {
        if (this.state === 'REVEALED') {
          this.state = 'EMPTY';
          this.roundsCompleted += 1;
          this.promptText = '🎉 淘洗完畢！再次將雙手伸入溪流舀取下一盤！';
        }
      }, 900);
    }
  }

  update({ handResult, poseResult }, renderer, width, height) {
    const ctx = renderer.ctx;
    const { h1, h2 } = this.getHandsPosition(handResult, poseResult, width, height);

    // 1. 計算淘金盤位置
    let targetX = width / 2;
    let targetY = height * 0.74;
    let tiltAngle = 0;

    if (h1 && h2) {
      targetX = (h1.x + h2.x) / 2;
      targetY = (h1.y + h2.y) / 2;
      tiltAngle = Math.atan2(h2.y - h1.y, h2.x - h1.x);
    } else if (h1) {
      targetX = h1.x;
      targetY = h1.y;
    }

    // 平滑移動盤子 (柔和解壓阻尼)
    this.pan.x += (targetX - this.pan.x) * 0.35;
    this.pan.y += (targetY - this.pan.y) * 0.35;
    this.pan.tilt = tiltAngle;

    // 2. 畫圓旋轉偵測與水流物理
    const dTheta = this.detectCircularSwirl(this.pan.x, this.pan.y);
    this.vortexAngle += this.vortexSpeed;

    const streamY = height * 0.72; // 溪流高度邊界

    if (this.state === 'EMPTY') {
      if (this.pan.y > streamY + 20) {
        this.scoopGravel(width, height);
      }
    } else if (this.state === 'SIFTING') {
      this.processCircularSifting(dTheta);

      // 更新盤中小氣泡繞中心旋轉
      for (const b of this.vortexBubbles) {
        b.angle += this.vortexSpeed * b.speed * 20;
      }
    } else if (this.state === 'REVEALED') {
      const isTilted = Math.abs(this.pan.tilt) > 0.45 || this.pan.y < height * 0.35;

      for (const t of this.currentTreasures) {
        if (t.collected) continue;
        const absX = this.pan.x + t.relX * this.pan.radiusX;
        const absY = this.pan.y + t.relY * this.pan.radiusY;

        let touched = false;
        if (h1 && Math.hypot(h1.x - absX, h1.y - absY) < 50) touched = true;
        if (h2 && Math.hypot(h2.x - absX, h2.y - absY) < 50) touched = true;
        if (isTilted) touched = true;

        if (touched) {
          this.collectTreasure(t, width, height);
        }
      }
    }

    // 3. 更新溢流水滴粒子
    for (let i = this.waterSplashes.length - 1; i >= 0; i--) {
      const sp = this.waterSplashes[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.22;
      sp.alpha -= 0.025;
      if (sp.alpha <= 0) {
        this.waterSplashes.splice(i, 1);
      }
    }

    // 4. 更新浮動獎勵/逗趣提示文字
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 1.1;
      pop.alpha -= 0.015;
      if (pop.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }

    // 5. 渲染視覺畫面
    this.renderCanvas(ctx, width, height, h1, h2, streamY);
  }

  renderCanvas(ctx, width, height, h1, h2, streamY) {
    ctx.save();

    // 1. 溪流水波環境
    const streamGrad = ctx.createLinearGradient(0, streamY, 0, height);
    streamGrad.addColorStop(0, 'rgba(14, 116, 144, 0.45)');
    streamGrad.addColorStop(0.35, 'rgba(3, 105, 161, 0.7)');
    streamGrad.addColorStop(1, 'rgba(8, 47, 73, 0.92)');
    ctx.fillStyle = streamGrad;
    ctx.fillRect(0, streamY, width, height - streamY);

    // 溪流水波波紋線
    ctx.beginPath();
    ctx.moveTo(0, streamY);
    for (let x = 0; x <= width; x += 25) {
      const wave = Math.sin(x * 0.02 + performance.now() * 0.0025) * 6;
      ctx.lineTo(x, streamY + wave);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 溪底閃爍的金沙微光
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#fde047';
    for (let i = 0; i < 5; i++) {
      const gx = ((i * 200 + performance.now() * 0.018) % (width - 40)) + 20;
      const gy = streamY + 28 + (i % 3) * 18;
      ctx.fillText('✨ 溪流金脈', gx, gy);
    }

    // 2. 繪製淘金盤
    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.rotate(this.pan.tilt);

    // 盤體外金屬深沈邊框
    ctx.beginPath();
    ctx.ellipse(0, 0, this.pan.radiusX, this.pan.radiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // 盤內同心防滑深條紋 (Riffles 抓金刻痕)
    ctx.beginPath();
    ctx.ellipse(0, 0, this.pan.radiusX * 0.8, this.pan.radiusY * 0.8, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, this.pan.radiusX * 0.58, this.pan.radiusY * 0.58, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. 繪製盤內寶物與逗趣廢鐵
    for (const t of this.currentTreasures) {
      if (t.collected) continue;
      const tx = t.relX * this.pan.radiusX;
      const ty = t.relY * this.pan.radiusY;

      // 泥沙厚度漸層決定寶物的可見度 (泥沙沖淨前隱約若現，沖淨後光芒四射)
      const revealFactor = Math.min(1, Math.max(0.08, (100 - this.mudLevel) / 70));
      ctx.save();
      ctx.globalAlpha = revealFactor;

      // 如果已徹底洗淨，寶物有閃爍光圈，廢鐵有逗趣鐵鏽光
      if (this.state === 'REVEALED') {
        ctx.beginPath();
        ctx.arc(tx, ty, 18, 0, Math.PI * 2);
        ctx.fillStyle = t.isJunk ? 'rgba(168, 162, 158, 0.35)' : 'rgba(250, 204, 21, 0.45)';
        ctx.fill();
      }

      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.icon, tx, ty);
      ctx.restore();
    }

    // 4. 泥水從「混濁變清澈」的平滑漸層層 (Mud Water Turbidity Layer)
    if (this.mudLevel > 0) {
      const mudRatio = this.mudLevel / 100; // 1.0 (濃濁泥漿) -> 0.0 (純淨透明)
      const mudGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.pan.radiusX * 0.88);

      // 色彩從深濃泥漿棕 -> 琥珀半透明泥水 -> 晶瑩溪水漸變
      const r = Math.round(78 + (56 - 78) * (1 - mudRatio));
      const g = Math.round(52 + (189 - 52) * (1 - mudRatio));
      const b = Math.round(34 + (248 - 34) * (1 - mudRatio));
      const a = 0.15 + 0.78 * mudRatio;

      mudGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
      mudGrad.addColorStop(0.7, `rgba(${r - 10}, ${g - 8}, ${b - 5}, ${a * 0.95})`);
      mudGrad.addColorStop(1, `rgba(${r - 20}, ${g - 15}, ${b - 10}, ${a * 0.8})`);

      ctx.beginPath();
      ctx.ellipse(0, 0, this.pan.radiusX * 0.88, this.pan.radiusY * 0.88, 0, 0, Math.PI * 2);
      ctx.fillStyle = mudGrad;
      ctx.fill();

      // 泥沙與雜石顆粒隨旋轉向外散開
      for (const p of this.mudParticles) {
        const px = Math.cos(p.angle) * p.dist * this.pan.radiusX;
        const py = Math.sin(p.angle) * p.dist * this.pan.radiusY;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = mudRatio * 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      // 泥沙洗淨後的清澈水光倒影 (Crystal Clear Mountain Water)
      const clearGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.pan.radiusX * 0.85);
      clearGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      clearGrad.addColorStop(1, 'rgba(14, 165, 233, 0.08)');
      ctx.beginPath();
      ctx.ellipse(0, 0, this.pan.radiusX * 0.88, this.pan.radiusY * 0.88, 0, 0, Math.PI * 2);
      ctx.fillStyle = clearGrad;
      ctx.fill();
    }

    // 5. 畫圓旋轉水流漩渦 (ASMR Swirling Water Vortex)
    if (this.state === 'SIFTING') {
      ctx.save();
      ctx.rotate(this.vortexAngle);

      // 旋轉水渦螺旋線
      ctx.strokeStyle = `rgba(224, 242, 254, ${0.15 + this.swirlIntensity * 0.4})`;
      ctx.lineWidth = 2.5;
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        const baseOffset = (arm * Math.PI * 2) / 3;
        for (let r = 8; r < this.pan.radiusX * 0.75; r += 6) {
          const a = baseOffset + r * 0.04;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * (r * (this.pan.radiusY / this.pan.radiusX));
          if (r === 8) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 漩渦中旋轉的水珠小氣泡
      for (const b of this.vortexBubbles) {
        const bx = Math.cos(b.angle) * b.dist * this.pan.radiusX;
        const by = Math.sin(b.angle) * b.dist * this.pan.radiusY;
        ctx.beginPath();
        ctx.arc(bx, by, b.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();
      }

      ctx.restore();

      // 淘洗進度提示 (柔和指示)
      const pct = Math.round(this.mudLevel);
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 5;
      ctx.fillText(`泥水混濁度: ${pct}%`, 0, -this.pan.radiusY - 14);
    }

    ctx.restore(); // 離開盤子座標系

    // 6. 繪製甩出的水花滴
    for (const sp of this.waterSplashes) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 7. 繪製浮動提示跳字 (包含搞笑吐槽與珍貴獲獎)
    for (const pop of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 6;
      ctx.fillText(pop.text, pop.x, pop.y);

      if (pop.subText) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(pop.subText, pop.x, pop.y + 18);
      }
      ctx.restore();
    }

    // 8. 頂部引導文字
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 5;
    ctx.fillText(this.promptText, width / 2, 42);

    // 雙手位置引導光圈
    [h1, h2].forEach((h) => {
      if (h) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(h.x, h.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  getMetrics() {
    return {
      count: this.totalItemsCount,
      label: '淘得收穫數',
      status: `💰 累計財富 $${this.totalEarnings.toLocaleString()}`,
      detail: `黃金 ${this.totalGoldWeight}g | 趣味雜物 ${this.junkCount} 件 (${this.state === 'SIFTING' ? `洗沙混濁度 ${Math.round(this.mudLevel)}%` : '淘金就緒'})`,
    };
  }
}
