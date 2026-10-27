import { BaseMode } from './baseMode.js';
import { sound } from '../services/audio.js';

const BASE = import.meta.env.BASE_URL || './';
const ASSETS_CACHE = {};

function getAsset(name) {
  if (!ASSETS_CACHE[name]) {
    const img = new Image();
    img.src = `${BASE}images/${name}`.replace('//', '/');
    ASSETS_CACHE[name] = img;
  }
  return ASSETS_CACHE[name];
}

// 貴重寶物列表 (對應切片後的透明圖片)
const TREASURE_TYPES = [
  { id: 'gold_dust', name: '天然淘金沙', imageName: 'gold_dust.png', icon: '✨', value: 800, weight: 10, color: '#facc15', isJunk: false, quote: '閃亮細緻的天然金粉！' },
  { id: 'gold_coin', name: '西班牙古金幣', imageName: 'gold_coin.png', icon: '🪙', value: 2500, weight: 35, color: '#f59e0b', isJunk: false, quote: '沉睡百年的海盜古幣！' },
  { id: 'gold_nugget', name: '天然狗頭金', imageName: 'gold_nugget.png', icon: '👑', value: 6500, weight: 80, color: '#fbbf24', isJunk: false, quote: '沉甸甸的珍稀大金塊！' },
  { id: 'ruby', name: '閃耀紅寶石', imageName: 'ruby.png', icon: '💎', value: 12000, weight: 15, color: '#f43f5e', isJunk: false, quote: '剔透無瑕的深山寶石！' },
  { id: 'amber', name: '遠古琥珀化石', imageName: 'amber.png', icon: '🦖', value: 20000, weight: 45, color: '#ea580c', isJunk: false, quote: '封存千萬年的史前奇蹟！' },
];

// 逗趣廢鐵與雜物列表 (增加淘洗驚喜與莞爾一笑的解壓感)
const JUNK_TYPES = [
  { id: 'rusty_bolt', name: '生鏽大螺帽', imageName: 'rusty_bolt.png', icon: '🔩', value: 1, weight: 25, color: '#a8a29e', isJunk: true, quote: '滿滿的鐵鏽味，老礦工掉的？' },
  { id: 'soda_can', name: '壓扁易開罐', imageName: 'soda_can.png', icon: '🥫', value: 0, weight: 12, color: '#ef4444', isJunk: true, quote: '是誰在這麼美的河裡亂丟垃圾！' },
  { id: 'old_boot', name: '破爛泡水鞋', imageName: 'old_boot.png', icon: '👞', value: 0, weight: 220, color: '#78350f', isJunk: true, quote: '傳說中的淘金老前輩之鞋！' },
  { id: 'rusty_key', name: '神祕生鏽鑰匙', imageName: 'rusty_key.png', icon: '🗝️', value: 50, weight: 18, color: '#d97706', isJunk: true, quote: '不知道能打開哪座被遺忘的寶箱？' },
  { id: 'old_magnet', name: '廢棄老磁鐵', imageName: 'old_magnet.png', icon: '🧲', value: 5, weight: 40, color: '#dc2626', isJunk: true, quote: '吸滿了一整層黑黑的重鐵砂！' },
  { id: 'fish_bone', name: '深山魚骨頭', imageName: 'fish_bone.png', icon: '🦴', value: 0, weight: 5, color: '#e2e8f0', isJunk: true, quote: '純天然深山溪流鈣質補充物。' },
];

export class GoldPanMode extends BaseMode {
  constructor() {
    super('goldpan', '體感淘金洗泥沙', { needPose: true, needHand: true });

    // 淘金盤位置與幾何
    this.pan = { x: 0, y: 0, radiusX: 130, radiusY: 70, tilt: 0 };
    this.panHistory = []; // 歷史軌跡 (用來精確判定畫圓旋轉動作)

    // 水流漩渦旋轉角度與旋轉強度 (ASMR 視覺)
    this.vortexAngle = 0;
    this.vortexSpeed = 0;
    this.swirlIntensity = 0;

    // 淘金狀態: 'EMPTY' (等待舀沙) | 'SIFTING' (旋轉淘洗中) | 'REVEALED' (泥清寶現)
    this.state = 'EMPTY';
    this.mudLevel = 0; // 100 -> 0 (混濁度)

    // 水花粒子與當前物品
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

    // 預熱加載常用圖片
    this.preloadAssets();
  }

  preloadAssets() {
    const list = [
      'gold_pan.png', 'water_vortex.png', 'mud_gravel.png', 'river_bed.png',
      'gold_dust.png', 'gold_coin.png', 'gold_nugget.png', 'ruby.png', 'amber.png',
      'rusty_bolt.png', 'soda_can.png', 'old_boot.png', 'rusty_key.png', 'old_magnet.png', 'fish_bone.png',
      'water_splash.png', 'water_bubble.png', 'mud_splash.png', 'mud_rock.png'
    ];
    list.forEach(getAsset);
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

    // 隨機決定挖掘物 (1 ~ 3 件，有可能是真金，也可能是搞笑廢鐵)
    this.currentTreasures = [];
    const itemCount = 1 + (Math.random() < 0.45 ? 1 : 0) + (Math.random() < 0.18 ? 1 : 0);

    for (let i = 0; i < itemCount; i++) {
      const isJunkRoll = Math.random() < 0.35; // 35% 機率挖出趣味廢鐵
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
      const dist = 0.2 + Math.random() * 0.45;

      this.currentTreasures.push({
        ...selectedItem,
        relX: Math.cos(angle) * dist,
        relY: Math.sin(angle) * dist,
        rotation: (Math.random() - 0.5) * 0.4,
        scale: 0.85 + Math.random() * 0.3,
        collected: false,
      });
    }

    this.promptText = '🌀 雙手畫圓旋轉淘洗～ 感受水流旋渦與泥沙沖刷洗淨！';
  }

  // 偵測「雙手畫圓旋轉」動作物理
  detectCircularSwirl(curX, curY) {
    this.panHistory.push({ x: curX, y: curY, time: performance.now() });
    if (this.panHistory.length > 20) {
      this.panHistory.shift();
    }
    if (this.panHistory.length < 8) return 0;

    let sumX = 0, sumY = 0;
    for (const pt of this.panHistory) {
      sumX += pt.x;
      sumY += pt.y;
    }
    const centerX = sumX / this.panHistory.length;
    const centerY = sumY / this.panHistory.length;

    const p1 = this.panHistory[this.panHistory.length - 2];
    const p2 = this.panHistory[this.panHistory.length - 1];

    const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
    const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);

    let dTheta = angle2 - angle1;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;

    const radius = Math.hypot(p2.x - centerX, p2.y - centerY);

    if (radius > 12 && Math.abs(dTheta) > 0.04) {
      return dTheta;
    }

    // 寬容後備：水平晃動也提供一定淘洗力
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

      // 沿著切線甩出盤緣的水花泥水
      if (Math.random() < 0.6) {
        const splashAngle = this.vortexAngle + Math.random() * 0.5;
        const isMudSplash = this.mudLevel > 35;
        this.waterSplashes.push({
          x: this.pan.x + Math.cos(splashAngle) * (this.pan.radiusX * 0.85),
          y: this.pan.y + Math.sin(splashAngle) * (this.pan.radiusY * 0.85),
          vx: Math.cos(splashAngle + Math.PI / 2) * (2 + Math.random() * 4),
          vy: -1.5 - Math.random() * 2.5,
          imageName: isMudSplash ? (Math.random() > 0.5 ? 'mud_splash.png' : 'mud_rock.png') : (Math.random() > 0.5 ? 'water_splash.png' : 'water_bubble.png'),
          size: 20 + Math.random() * 18,
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
      sound.playJunk();
    } else {
      sound.playCoinClink();
    }

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
      imageName: t.imageName,
    });

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
    } else if (this.state === 'REVEALED') {
      const isTilted = Math.abs(this.pan.tilt) > 0.45 || this.pan.y < height * 0.35;

      for (const t of this.currentTreasures) {
        if (t.collected) continue;
        const absX = this.pan.x + t.relX * this.pan.radiusX;
        const absY = this.pan.y + t.relY * this.pan.radiusY;

        let touched = false;
        if (h1 && Math.hypot(h1.x - absX, h1.y - absY) < 55) touched = true;
        if (h2 && Math.hypot(h2.x - absX, h2.y - absY) < 55) touched = true;
        if (isTilted) touched = true;

        if (touched) {
          this.collectTreasure(t, width, height);
        }
      }
    }

    // 3. 更新甩出的粒子
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

    // 4. 更新浮動文字
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 1.1;
      pop.alpha -= 0.015;
      if (pop.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }

    // 5. 渲染全景畫面
    this.renderCanvas(ctx, width, height, h1, h2, streamY);
  }

  renderCanvas(ctx, width, height, h1, h2, streamY) {
    ctx.save();

    // 1. 繪製底部溪流河床圖片 (River Bed)
    const riverImg = getAsset('river_bed.png');
    const riverHeight = height - streamY + 45;
    if (riverImg.complete && riverImg.naturalWidth > 0) {
      ctx.drawImage(riverImg, 0, streamY - 35, width, riverHeight);
    } else {
      // 後備漸層
      const streamGrad = ctx.createLinearGradient(0, streamY, 0, height);
      streamGrad.addColorStop(0, 'rgba(14, 116, 144, 0.45)');
      streamGrad.addColorStop(1, 'rgba(8, 47, 73, 0.92)');
      ctx.fillStyle = streamGrad;
      ctx.fillRect(0, streamY, width, height - streamY);
    }

    // 溪流水波波紋線
    ctx.beginPath();
    ctx.moveTo(0, streamY);
    for (let x = 0; x <= width; x += 30) {
      const wave = Math.sin(x * 0.02 + performance.now() * 0.0025) * 5;
      ctx.lineTo(x, streamY + wave);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 2. 進入淘金盤坐標系
    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.rotate(this.pan.tilt);

    const panImg = getAsset('gold_pan.png');
    const panW = this.pan.radiusX * 2.15;
    const panH = this.pan.radiusY * 2.15;

    // 繪製金屬淘金盤圖片
    if (panImg.complete && panImg.naturalWidth > 0) {
      ctx.drawImage(panImg, -panW / 2, -panH / 2, panW, panH);
    } else {
      // 後備盤身繪製
      ctx.beginPath();
      ctx.ellipse(0, 0, this.pan.radiusX, this.pan.radiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#475569';
      ctx.stroke();
    }

    // 3. 繪製盤內寶物與逗趣廢鐵 (依泥水混濁度逐漸浮現)
    for (const t of this.currentTreasures) {
      if (t.collected) continue;
      const tx = t.relX * this.pan.radiusX;
      const ty = t.relY * this.pan.radiusY;

      // 泥沙厚度漸層決定寶物的可見度
      const revealFactor = Math.min(1, Math.max(0.08, (100 - this.mudLevel) / 70));
      ctx.save();
      ctx.globalAlpha = revealFactor;

      const itemImg = getAsset(t.imageName);
      const itemSize = 58 * t.scale;

      if (this.state === 'REVEALED') {
        // 洗淨後的金色/閃爍光暈
        ctx.beginPath();
        ctx.arc(tx, ty, itemSize * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = t.isJunk ? 'rgba(168, 162, 158, 0.35)' : 'rgba(250, 204, 21, 0.45)';
        ctx.fill();
      }

      ctx.translate(tx, ty);
      ctx.rotate(t.rotation);

      if (itemImg.complete && itemImg.naturalWidth > 0) {
        ctx.drawImage(itemImg, -itemSize / 2, -itemSize / 2, itemSize, itemSize);
      } else {
        // 後備 Emoji
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.icon, 0, 0);
      }
      ctx.restore();
    }

    // 4. 繪製盤中泥沙與礫石層 (Mud & Gravel Texture)
    if (this.mudLevel > 0) {
      const mudRatio = this.mudLevel / 100;
      ctx.save();
      ctx.globalAlpha = mudRatio * 0.95;

      const mudImg = getAsset('mud_gravel.png');
      const mudW = this.pan.radiusX * 1.85;
      const mudH = this.pan.radiusY * 1.85;

      if (mudImg.complete && mudImg.naturalWidth > 0) {
        // 隨旋轉角度微動
        ctx.rotate(this.vortexAngle * 0.3);
        ctx.drawImage(mudImg, -mudW / 2, -mudH / 2, mudW, mudH);
      } else {
        // 後備泥水遮罩
        ctx.beginPath();
        ctx.ellipse(0, 0, this.pan.radiusX * 0.88, this.pan.radiusY * 0.88, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(85, 55, 35, ${mudRatio * 0.85})`;
        ctx.fill();
      }
      ctx.restore();
    } else {
      // 泥沙沖淨後的清澈水光倒影
      const clearGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.pan.radiusX * 0.85);
      clearGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      clearGrad.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
      ctx.beginPath();
      ctx.ellipse(0, 0, this.pan.radiusX * 0.88, this.pan.radiusY * 0.88, 0, 0, Math.PI * 2);
      ctx.fillStyle = clearGrad;
      ctx.fill();
    }

    // 5. 繪製旋轉水流漩渦 (Water Vortex)
    if (this.state === 'SIFTING') {
      ctx.save();
      const vortexImg = getAsset('water_vortex.png');
      const vortexSize = this.pan.radiusX * 1.7;
      ctx.rotate(this.vortexAngle);
      ctx.globalAlpha = Math.min(0.85, 0.25 + this.swirlIntensity * 0.6);

      if (vortexImg.complete && vortexImg.naturalWidth > 0) {
        ctx.drawImage(vortexImg, -vortexSize / 2, -vortexSize / 2 * (this.pan.radiusY / this.pan.radiusX), vortexSize, vortexSize * (this.pan.radiusY / this.pan.radiusX));
      }
      ctx.restore();

      // 泥水混濁度文字提示
      const pct = Math.round(this.mudLevel);
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 5;
      ctx.fillText(`泥水混濁度: ${pct}%`, 0, -this.pan.radiusY - 14);
    }

    ctx.restore(); // 退出盤子座標系

    // 6. 繪製甩出的水花滴或泥石顆粒
    for (const sp of this.waterSplashes) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.alpha);
      const spImg = getAsset(sp.imageName);
      if (spImg.complete && spImg.naturalWidth > 0) {
        ctx.drawImage(spImg, sp.x - sp.size / 2, sp.y - sp.size / 2, sp.size, sp.size);
      } else {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
        ctx.fill();
      }
      ctx.restore();
    }

    // 7. 繪製浮動提示跳字
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
