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
  { id: 'gold_dust', name: '天然淘金沙', imageName: 'gold_dust.png', icon: '✨', value: 800, weight: 10, color: '#facc15', isJunk: false, quote: '閃亮細緻的天然金粉！', baseScale: 1.2 },
  { id: 'gold_coin', name: '西班牙古金幣', imageName: 'gold_coin.png', icon: '🪙', value: 2500, weight: 35, color: '#f59e0b', isJunk: false, quote: '沉睡百年的海盜古幣！', baseScale: 1.15 },
  { id: 'gold_nugget', name: '天然狗頭金', imageName: 'gold_nugget.png', icon: '👑', value: 6500, weight: 80, color: '#fbbf24', isJunk: false, quote: '沉甸甸的珍稀大金塊！', baseScale: 1.35 },
  { id: 'ruby', name: '閃耀紅寶石', imageName: 'ruby.png', icon: '💎', value: 12000, weight: 15, color: '#f43f5e', isJunk: false, quote: '剔透無瑕的深山寶石！', baseScale: 1.2 },
  { id: 'amber', name: '遠古琥珀化石', imageName: 'amber.png', icon: '🦖', value: 20000, weight: 45, color: '#ea580c', isJunk: false, quote: '封存千萬年的史前奇蹟！', baseScale: 1.3 },
];

// 逗趣廢鐵與雜物列表 (增加淘洗驚喜與莞爾一笑的解壓感)
const JUNK_TYPES = [
  { id: 'rusty_bolt', name: '生鏽大螺帽', imageName: 'rusty_bolt.png', icon: '🔩', value: 1, weight: 25, color: '#a8a29e', isJunk: true, quote: '滿滿的鐵鏽味，老礦工掉的？', baseScale: 1.15 },
  { id: 'soda_can', name: '壓扁易開罐', imageName: 'soda_can.png', icon: '🥫', value: 0, weight: 12, color: '#ef4444', isJunk: true, quote: '是誰在這麼美的河裡亂丟垃圾！', baseScale: 1.35 },
  { id: 'old_boot', name: '破爛泡水鞋', imageName: 'old_boot.png', icon: '👞', value: 0, weight: 220, color: '#78350f', isJunk: true, quote: '傳說中的淘金老前輩之鞋！', baseScale: 1.45 },
  { id: 'rusty_key', name: '神祕生鏽鑰匙', imageName: 'rusty_key.png', icon: '🗝️', value: 50, weight: 18, color: '#d97706', isJunk: true, quote: '不知道能打開哪座被遺忘的寶箱？', baseScale: 1.25 },
  { id: 'old_magnet', name: '廢棄老磁鐵', imageName: 'old_magnet.png', icon: '🧲', value: 5, weight: 40, color: '#dc2626', isJunk: true, quote: '吸滿了一整層黑黑的重鐵砂！', baseScale: 1.3 },
  { id: 'fish_bone', name: '深山魚骨頭', imageName: 'fish_bone.png', icon: '🦴', value: 0, weight: 5, color: '#e2e8f0', isJunk: true, quote: '純天然深山溪流鈣質補充物。', baseScale: 1.3 },
];

export class GoldPanMode extends BaseMode {
  constructor() {
    super('goldpan', '體感淘金洗泥沙', { needPose: true, needHand: true });

    // 淘金盤位置與動態
    this.pan = { x: 0, y: 0, radiusX: 260, radiusY: 160, tilt: 0 };
    this.panHistory = []; // 歷史軌跡 (用來判定簡單自然晃動)

    // 水流晃動起伏強度 (溫和搖擺 ASMR 視覺，不 360 度旋轉以免眼花)
    this.sloshIntensity = 0;

    // 淘金狀態: 'EMPTY' (等待舀沙) | 'SIFTING' (簡單晃動淘洗中) | 'REVEALED' (泥清寶現)
    this.state = 'EMPTY';
    this.mudLevel = 0; // 100 -> 0 (混濁度)

    // 水花粒子與當前物品
    this.waterSplashes = [];
    this.lastSplashTime = 0;
    this.currentTreasures = [];
    this.popups = [];

    // 累積統計 (解壓收集)
    this.totalEarnings = 0;
    this.totalItemsCount = 0;
    this.totalGoldWeight = 0; // 克
    this.junkCount = 0;
    this.roundsCompleted = 0;

    this.promptText = '👇 將雙手下移浸入溪流，舀起一盤泥沙！';

    // 預熱加載所有第一人稱與物品圖片
    this.preloadAssets();
  }

  preloadAssets() {
    const list = [
      'fp_river_scene.png', 'fp_hand_left.png', 'fp_hand_right.png',
      'gold_pan.png', 'water_vortex.png', 'mud_gravel.png', 'river_bed.png',
      'gold_dust.png', 'gold_coin.png', 'gold_nugget.png', 'ruby.png', 'amber.png',
      'rusty_bolt.png', 'soda_can.png', 'old_boot.png', 'rusty_key.png', 'old_magnet.png', 'fish_bone.png',
      'water_splash.png', 'water_bubble.png', 'mud_splash.png', 'mud_rock.png'
    ];
    list.forEach(getAsset);
  }

  updateDimensions(width, height) {
    this.pan.radiusX = Math.max(160, Math.min(320, width * 0.24));
    this.pan.radiusY = this.pan.radiusX * 0.62;
  }

  init(width, height) {
    this.reset();
    this.updateDimensions(width, height);
    this.pan.x = width / 2;
    this.pan.y = height * 0.58;
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
    this.sloshIntensity = 0;
    this.panHistory = [];
    this.waterSplashes = [];
    this.lastSplashTime = 0;
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
      // 確保 h1 在左邊, h2 在右邊
      if (h1.x > h2.x) {
        const tmp = h1;
        h1 = h2;
        h2 = tmp;
      }
    } else if (hands.length === 1) {
      const h = { x: (1 - hands[0][9].x) * width, y: hands[0][9].y * height };
      if (h.x < width / 2) {
        h1 = h;
      } else {
        h2 = h;
      }
    } else {
      const pose = poseResult?.landmarks?.[0];
      if (pose) {
        if (pose[15]?.visibility > 0.4) h1 = { x: (1 - pose[15].x) * width, y: pose[15].y * height };
        if (pose[16]?.visibility > 0.4) h2 = { x: (1 - pose[16].x) * width, y: pose[16].y * height };
        if (h1 && h2 && h1.x > h2.x) {
          const tmp = h1;
          h1 = h2;
          h2 = tmp;
        }
      }
    }
    return { h1, h2 };
  }

  // 舀起泥沙並隨機生成本盤隱藏寶物與趣味廢鐵
  scoopGravel(width, height) {
    this.state = 'SIFTING';
    this.mudLevel = 100;
    this.sloshIntensity = 0;
    sound.playScoopWater();

    // 舀水入盤時的清澈小水花 (維持舒適節奏，尺寸適度放大更顯眼)
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI * 0.75 + (i / 2) * Math.PI * 0.5;
      const speed = 2.8 + Math.random() * 2.5;
      this.waterSplashes.push({
        x: this.pan.x + Math.cos(angle) * (this.pan.radiusX * 0.8),
        y: this.pan.y + Math.sin(angle) * (this.pan.radiusY * 0.7),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        rotation: Math.random() * 0.5,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        imageName: Math.random() > 0.5 ? 'water_splash.png' : 'water_bubble.png',
        size: 55 + Math.random() * 22, // 55px ~ 77px 放大清晰
        alpha: 0.9,
      });
    }

    // 隨機決定挖掘物 (1 ~ 3 件，有可能是真金，也可能是搞笑廢鐵)
    this.currentTreasures = [];
    const itemCount = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);

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
      const dist = 0.12 + Math.random() * 0.38;

      this.currentTreasures.push({
        ...selectedItem,
        relX: Math.cos(angle) * dist,
        relY: Math.sin(angle) * dist,
        rotation: (Math.random() - 0.5) * 0.4,
        scale: (selectedItem.baseScale || 1.2) * (0.95 + Math.random() * 0.2),
        collected: false,
      });
    }

    this.promptText = '🌊 雙手自然左右晃動淘洗～ 泥水漸漸澄澈透底！';
  }

  // 偵測簡單自然晃動 (不需360度轉圈，只需左右或微幅前後搖晃)
  detectShakingMotion(curX, curY) {
    this.panHistory.push({ x: curX, y: curY, time: performance.now() });
    if (this.panHistory.length > 10) {
      this.panHistory.shift();
    }
    if (this.panHistory.length < 3) return 0;

    const p1 = this.panHistory[this.panHistory.length - 2];
    const p2 = this.panHistory[this.panHistory.length - 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const speed = Math.hypot(dx, dy);

    // 只要有簡單自然的晃動（左右微晃或輕搖）
    if (speed > 2.0) {
      return Math.min(1.8, speed / 5.5);
    }
    return 0;
  }

  // 溫和晃動淘洗泥沙 (泥水逐漸變清澈，水花疏朗清爽不眼花)
  processShakingSift(shakePower) {
    if (shakePower > 0.1) {
      sound.playWaterSlosh();

      // 晃動起伏平滑提升
      this.sloshIntensity = Math.min(1.0, this.sloshIntensity + 0.14);

      // 泥沙混濁度漸層由混濁變清澈 (晃動洗淨節奏舒適)
      const washSpeed = Math.min(2.5, shakePower * 1.4);
      this.mudLevel = Math.max(0, this.mudLevel - washSpeed);

      // 嚴格維持舒緩節奏（每 280ms 最多 1 個，畫面最多 4 個），水花適度放大更具份量！
      const now = performance.now();
      if (now - this.lastSplashTime > 280 && this.waterSplashes.length < 4 && Math.random() < 0.65) {
        this.lastSplashTime = now;
        const side = Math.random() > 0.5 ? 1 : -1;
        const splashX = this.pan.x + side * (this.pan.radiusX * 0.82);
        const splashY = this.pan.y + (Math.random() - 0.5) * (this.pan.radiusY * 0.25);
        const isMudSplash = this.mudLevel > 35;

        const vx = side * (2.2 + Math.random() * 2.5);
        const vy = -2.4 - Math.random() * 2.6;

        this.waterSplashes.push({
          x: splashX,
          y: splashY,
          vx: vx,
          vy: vy,
          rotation: (side > 0 ? 0.22 : -0.22) + (Math.random() - 0.5) * 0.35,
          rotSpeed: side * 0.018,
          imageName: isMudSplash
            ? (Math.random() > 0.5 ? 'mud_splash.png' : 'mud_rock.png')
            : (Math.random() > 0.5 ? 'water_splash.png' : 'water_bubble.png'),
          size: 60 + Math.random() * 26, // 放大至 60px ~ 86px，大方顯眼不眼花！
          alpha: 0.9,
        });
      }

      // 泥沙完全洗淨 -> 寶物與廢鐵徹底顯現！
      if (this.mudLevel <= 0 && this.state === 'SIFTING') {
        this.state = 'REVEALED';
        sound.playFanfare();
        this.promptText = '✨ 泥沙已洗淨、溪水清澈！伸手碰觸或傾斜淘金盤，將收穫入袋！';
      }
    } else {
      this.sloshIntensity *= 0.90;
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
      y: absY - 40,
      alpha: 1,
      color: t.color,
      imageName: t.imageName,
      isJunk: t.isJunk,
    });

    const allCollected = this.currentTreasures.every((item) => item.collected);
    if (allCollected) {
      setTimeout(() => {
        if (this.state === 'REVEALED') {
          this.state = 'EMPTY';
          this.roundsCompleted += 1;
          this.promptText = '🎉 淘洗完畢！再次將雙手伸入溪流舀取下一盤！';
        }
      }, 1000);
    }
  }

  update({ handResult, poseResult }, renderer, width, height) {
    const ctx = renderer.ctx;
    this.updateDimensions(width, height);
    const { h1, h2 } = this.getHandsPosition(handResult, poseResult, width, height);

    // 1. 計算淘金盤位置 (雙手重心或單手驅動)
    let targetX = width / 2;
    let targetY = height * 0.58;
    let tiltAngle = 0;

    if (h1 && h2) {
      targetX = (h1.x + h2.x) / 2;
      targetY = (h1.y + h2.y) / 2;
      tiltAngle = Math.atan2(h2.y - h1.y, h2.x - h1.x);
      // 限制傾斜角在自然人體範圍 (-40度 ~ 40度)
      tiltAngle = Math.max(-0.7, Math.min(0.7, tiltAngle));
    } else if (h1) {
      targetX = h1.x + this.pan.radiusX * 0.35;
      targetY = h1.y;
    } else if (h2) {
      targetX = h2.x - this.pan.radiusX * 0.35;
      targetY = h2.y;
    }

    // 平滑插值 (保持靈活又沉著的手感)
    this.pan.x += (targetX - this.pan.x) * 0.32;
    this.pan.y += (targetY - this.pan.y) * 0.32;
    this.pan.tilt += (tiltAngle - this.pan.tilt) * 0.3;

    // 2. 溫和晃動偵測與水流物理 (簡單自然晃動，不需 360 度轉)
    const shakePower = this.detectShakingMotion(this.pan.x, this.pan.y);

    const streamY = height * 0.64; // 溪流水位線

    if (this.state === 'EMPTY') {
      if (this.pan.y > streamY + 15) {
        this.scoopGravel(width, height);
      }
    } else if (this.state === 'SIFTING') {
      this.processShakingSift(shakePower);
    } else if (this.state === 'REVEALED') {
      const isTilted = Math.abs(this.pan.tilt) > 0.42 || this.pan.y < height * 0.36;

      for (const t of this.currentTreasures) {
        if (t.collected) continue;
        const absX = this.pan.x + t.relX * this.pan.radiusX;
        const absY = this.pan.y + t.relY * this.pan.radiusY;

        let touched = false;
        if (h1 && Math.hypot(h1.x - absX, h1.y - absY) < 95) touched = true;
        if (h2 && Math.hypot(h2.x - absX, h2.y - absY) < 95) touched = true;
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
      sp.vy += 0.28; // 重力自然弧形下墜
      if (sp.rotSpeed) sp.rotation = (sp.rotation || 0) + sp.rotSpeed;
      sp.alpha -= 0.020; // 稍長留存時間，水花更清晰可辨
      if (sp.alpha <= 0 || sp.y > height + 80) {
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

  // 繪製第一人稱雙臂 Inverse Kinematics
  drawFirstPersonArms(ctx, width, height, panX, panY, tiltAngle, panW, panH) {
    const handL = getAsset('fp_hand_left.png');
    const handR = getAsset('fp_hand_right.png');

    // 左手臂：從螢幕左下角延伸至盤緣左側
    if (handL.complete && handL.naturalWidth > 0) {
      const rx_l = -panW * 0.38;
      const ry_l = panH * 0.05;
      const gripLx = panX + rx_l * Math.cos(tiltAngle) - ry_l * Math.sin(tiltAngle);
      const gripLy = panY + rx_l * Math.sin(tiltAngle) + ry_l * Math.cos(tiltAngle);
      const anchorLx = width * 0.12;
      const anchorLy = height + 25;

      const distL = Math.hypot(gripLx - anchorLx, gripLy - anchorLy);
      const angleL = Math.atan2(gripLy - anchorLy, gripLx - anchorLx);

      const srcDistL = Math.hypot(70, -150);
      const srcAngleL = Math.atan2(-150, 70);
      const scaleL = distL / srcDistL;
      const rotL = angleL - srcAngleL;

      ctx.save();
      ctx.translate(gripLx, gripLy);
      ctx.rotate(rotL);
      ctx.scale(scaleL, scaleL);
      ctx.drawImage(handL, -110, -40);
      ctx.restore();
    }

    // 右手臂：從螢幕右下角延伸至盤緣右側
    if (handR.complete && handR.naturalWidth > 0) {
      const rx_r = panW * 0.38;
      const ry_r = panH * 0.05;
      const gripRx = panX + rx_r * Math.cos(tiltAngle) - ry_r * Math.sin(tiltAngle);
      const gripRy = panY + rx_r * Math.sin(tiltAngle) + ry_r * Math.cos(tiltAngle);
      const anchorRx = width * 0.88;
      const anchorRy = height + 25;

      const distR = Math.hypot(gripRx - anchorRx, gripRy - anchorRy);
      const angleR = Math.atan2(gripRy - anchorRy, gripRx - anchorRx);

      const srcDistR = Math.hypot(-70, -150);
      const srcAngleR = Math.atan2(-150, -70);
      const scaleR = distR / srcDistR;
      const rotR = angleR - srcAngleR;

      ctx.save();
      ctx.translate(gripRx, gripRy);
      ctx.rotate(rotR);
      ctx.scale(scaleR, scaleR);
      ctx.drawImage(handR, -50, -40);
      ctx.restore();
    }
  }

  renderCanvas(ctx, width, height, h1, h2, streamY) {
    ctx.save();

    // 1. 全螢幕繪製第一人稱清澈溪流背景 (Scenic River Scene)
    const riverScene = getAsset('fp_river_scene.png');
    if (riverScene.complete && riverScene.naturalWidth > 0) {
      ctx.drawImage(riverScene, 0, 0, width, height);
    } else {
      // 後備溪流風景漸層
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#7dd3fc');
      bgGrad.addColorStop(0.3, '#38bdf8');
      bgGrad.addColorStop(0.7, '#0284c7');
      bgGrad.addColorStop(1, '#075985');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 溪流水光波光粼粼特效
    const now = performance.now();
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const waveY = streamY + i * 25 + Math.sin(now * 0.002 + i) * 6;
      ctx.moveTo(width * 0.2, waveY);
      ctx.quadraticCurveTo(width * 0.5, waveY + Math.cos(now * 0.0025 + i) * 12, width * 0.8, waveY);
      ctx.stroke();
    }
    ctx.restore();

    // 2. 進入淘金盤坐標系
    const panW = this.pan.radiusX * 2.2;
    const panH = this.pan.radiusY * 2.2;

    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.rotate(this.pan.tilt);

    const panImg = getAsset('gold_pan.png');

    // 繪製金屬淘金盤圖片
    if (panImg.complete && panImg.naturalWidth > 0) {
      ctx.drawImage(panImg, -panW / 2, -panH / 2, panW, panH);
    } else {
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

      // 泥沙混濁度決定寶物的透光可見度
      const revealFactor = Math.min(1, Math.max(0.06, (100 - this.mudLevel) / 60));
      ctx.save();
      ctx.globalAlpha = revealFactor;

      const itemImg = getAsset(t.imageName);
      // 大幅放大驚喜物品尺寸 (從 0.28 擴大至 0.52，洗淨時加入呼吸高光)
      const baseItemSize = Math.max(90, this.pan.radiusX * 0.52);
      const pulse = this.state === 'REVEALED' ? (1 + Math.sin(now * 0.005 + tx) * 0.06) : 1;
      const itemSize = baseItemSize * t.scale * pulse;

      if (this.state === 'REVEALED') {
        // 洗淨後的珍寶高光光暈
        ctx.beginPath();
        ctx.arc(tx, ty, itemSize * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = t.isJunk ? 'rgba(168, 162, 158, 0.45)' : 'rgba(250, 204, 21, 0.55)';
        ctx.fill();

        // 四周閃爍星芒
        const starAngle = now * 0.003;
        for (let s = 0; s < 4; s++) {
          const sa = starAngle + (s * Math.PI) / 2;
          const sx = tx + Math.cos(sa) * (itemSize * 0.55);
          const sy = ty + Math.sin(sa) * (itemSize * 0.55);
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
        }
      }

      ctx.translate(tx, ty);
      ctx.rotate(t.rotation);

      if (itemImg.complete && itemImg.naturalWidth > 0) {
        ctx.drawImage(itemImg, -itemSize / 2, -itemSize / 2, itemSize, itemSize);
      } else {
        ctx.font = '38px sans-serif';
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
      ctx.globalAlpha = mudRatio * 0.94;

      const mudImg = getAsset('mud_gravel.png');
      const mudW = this.pan.radiusX * 1.8;
      const mudH = this.pan.radiusY * 1.8;

      // 4. 繪製盤中泥沙與礫石層 (溫和微晃，絕不 360 度旋轉以免眼花)
      const sloshShiftX = Math.sin(now * 0.005) * (10 * this.sloshIntensity);
      const sloshShiftY = Math.cos(now * 0.005) * (4 * this.sloshIntensity);
      const sloshWobble = Math.sin(now * 0.005) * (0.04 * this.sloshIntensity);

      ctx.translate(sloshShiftX, sloshShiftY);
      ctx.rotate(sloshWobble);

      if (mudImg.complete && mudImg.naturalWidth > 0) {
        ctx.drawImage(mudImg, -mudW / 2, -mudH / 2, mudW, mudH);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, this.pan.radiusX * 0.88, this.pan.radiusY * 0.88, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(85, 55, 35, ${mudRatio * 0.85})`;
        ctx.fill();
      }
      ctx.restore();
    } else {
      // 泥沙沖淨後的清澈水光倒影
      const clearGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.pan.radiusX * 0.85);
      clearGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      clearGrad.addColorStop(1, 'rgba(14, 165, 233, 0.04)');
      ctx.beginPath();
      ctx.ellipse(0, 0, this.pan.radiusX * 0.88, this.pan.radiusY * 0.88, 0, 0, Math.PI * 2);
      ctx.fillStyle = clearGrad;
      ctx.fill();
    }

    // 5. 繪製水波晃動效果 (溫和左右搖擺，絕不 360 度旋轉)
    if (this.state === 'SIFTING') {
      ctx.save();
      const vortexImg = getAsset('water_vortex.png');
      const vortexSize = this.pan.radiusX * 1.75;

      // 溫和水波晃動 (左右微幅擺動 ±3 度，柔和起伏)
      const waveShiftX = Math.sin(now * 0.006) * (12 * this.sloshIntensity);
      const waveShiftY = Math.cos(now * 0.006) * (4 * this.sloshIntensity);
      const waveAngle = Math.sin(now * 0.006) * (0.05 * this.sloshIntensity);

      ctx.translate(waveShiftX, waveShiftY);
      ctx.rotate(waveAngle);
      ctx.globalAlpha = Math.min(0.65, 0.15 + this.sloshIntensity * 0.45);

      if (vortexImg.complete && vortexImg.naturalWidth > 0) {
        ctx.drawImage(vortexImg, -vortexSize / 2, -vortexSize / 2 * (this.pan.radiusY / this.pan.radiusX), vortexSize, vortexSize * (this.pan.radiusY / this.pan.radiusX));
      }
      ctx.restore();

      // 盤中水浪微幅起伏 (柔和透明水光，不刺眼)
      ctx.save();
      const waveShift = Math.sin(now * 0.006) * (this.pan.radiusX * 0.06 * this.sloshIntensity);
      ctx.beginPath();
      ctx.ellipse(waveShift, 0, this.pan.radiusX * 0.86, this.pan.radiusY * 0.84, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + this.sloshIntensity * 0.22})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 泥水混濁度文字提示
      const pct = Math.round(this.mudLevel);
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6;
      ctx.fillText(`泥水混濁度: ${pct}%`, 0, -this.pan.radiusY - 14);
    }

    ctx.restore(); // 退出盤子坐標系

    // 6. 繪製甩出的水花滴或泥石顆粒 (適中尺寸、自然柔和、不密集眩目)
    for (const sp of this.waterSplashes) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(0.9, sp.alpha));
      ctx.translate(sp.x, sp.y);
      if (sp.rotation) ctx.rotate(sp.rotation);

      const spImg = getAsset(sp.imageName);
      if (spImg.complete && spImg.naturalWidth > 0) {
        ctx.drawImage(spImg, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, sp.size * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
        ctx.fill();
      }
      ctx.restore();
    }

    // 7. 繪製第一人稱雙手臂握盤 (第一視角最關鍵沉浸感！)
    this.drawFirstPersonArms(ctx, width, height, this.pan.x, this.pan.y, this.pan.tilt, panW, panH);

    // 8. 繪製浮動提示跳字與超大驚喜寶物/廢鐵圖片
    for (const pop of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.alpha);

      const popImg = getAsset(pop.imageName);
      const popImgSize = 105; // 超大尺寸驚喜展示！

      // 榮耀金色/銀灰色發光光環
      const auraGrad = ctx.createRadialGradient(pop.x, pop.y - popImgSize * 0.5, 12, pop.x, pop.y - popImgSize * 0.5, popImgSize * 0.95);
      auraGrad.addColorStop(0, pop.isJunk ? 'rgba(214, 211, 209, 0.65)' : 'rgba(250, 204, 21, 0.8)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y - popImgSize * 0.5, popImgSize * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // 繪製大圖片
      if (popImg.complete && popImg.naturalWidth > 0) {
        ctx.drawImage(popImg, pop.x - popImgSize / 2, pop.y - popImgSize, popImgSize, popImgSize);
      }

      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 8;
      ctx.fillText(pop.text, pop.x, pop.y + 24);

      if (pop.subText) {
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.shadowBlur = 5;
        ctx.fillText(pop.subText, pop.x, pop.y + 48);
      }
      ctx.restore();
    }

    // 9. 頂部引導指示牌
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(this.promptText, width / 2, 38);

    // 雙手位置即時追蹤小光圈 (輔助引導)
    [h1, h2].forEach((h) => {
      if (h) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(h.x, h.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    });

    ctx.restore();
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
