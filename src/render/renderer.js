export const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,11],[6,12],[11,12],
  [11,13],[13,15],[15,17],[15,19],[15,21],[12,14],[14,16],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32]
];

export const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]
];

export class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.particles = [];
  }

  resize(containerElement) {
    const rect = containerElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(width, height) {
    this.ctx.clearRect(0, 0, width, height);
  }

  // 繪製身體骨架
  drawPose(landmarks, width, height, options = {}) {
    if (!landmarks) return;
    const { boneColor = 'rgba(56, 189, 248, 0.55)', jointColor = '#22d3ee', minVisibility = 0.35 } = options;

    const points = landmarks.map(({ x, y, visibility = 1 }) => ({
      x: (1 - x) * width,
      y: y * height,
      visibility,
    }));

    this.ctx.save();
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = boneColor;

    for (const [a, b] of POSE_CONNECTIONS) {
      if (points[a].visibility < minVisibility || points[b].visibility < minVisibility) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(points[a].x, points[a].y);
      this.ctx.lineTo(points[b].x, points[b].y);
      this.ctx.stroke();
    }

    for (const point of points) {
      if (point.visibility < minVisibility) continue;
      this.ctx.beginPath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = jointColor;
      this.ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // 繪製手部節點
  drawHands(handResult, width, height) {
    if (!handResult || !handResult.landmarks) return [];

    const handsPoints = [];
    this.ctx.save();
    this.ctx.lineWidth = 2.0;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = 'rgba(251, 113, 133, 0.65)';

    for (const landmarks of handResult.landmarks) {
      const points = landmarks.map(({ x, y }) => ({
        x: (1 - x) * width,
        y: y * height,
      }));
      handsPoints.push(points);

      for (const [a, b] of HAND_CONNECTIONS) {
        this.ctx.beginPath();
        this.ctx.moveTo(points[a].x, points[a].y);
        this.ctx.lineTo(points[b].x, points[b].y);
        this.ctx.stroke();
      }

      for (const point of points) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#fff1f2';
        this.ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.fillStyle = '#fb7185';
        this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
    return handsPoints;
  }

  // 頂部樹梢與樹枝繪製
  drawTreeCanopy(width, _height) {
    const ctx = this.ctx;
    ctx.save();

    // 樹枝橫木
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.bezierCurveTo(width * 0.25, 45, width * 0.5, 65, width, 50);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#4a2c11';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width * 0.2, 50);
    ctx.bezierCurveTo(width * 0.35, 75, width * 0.55, 80, width * 0.8, 65);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#5c3a1e';
    ctx.stroke();

    // 樹葉團簇 (多層半透明深淺綠色，帶來童趣感)
    const leaves = [
      { x: width * 0.08, y: 35, r: 42, color: 'rgba(22, 101, 52, 0.82)' },
      { x: width * 0.18, y: 25, r: 50, color: 'rgba(34, 197, 94, 0.85)' },
      { x: width * 0.32, y: 38, r: 46, color: 'rgba(21, 128, 61, 0.88)' },
      { x: width * 0.48, y: 26, r: 56, color: 'rgba(34, 197, 94, 0.88)' },
      { x: width * 0.65, y: 36, r: 48, color: 'rgba(22, 101, 52, 0.85)' },
      { x: width * 0.82, y: 24, r: 52, color: 'rgba(34, 197, 94, 0.86)' },
      { x: width * 0.94, y: 40, r: 44, color: 'rgba(21, 128, 61, 0.82)' },
    ];

    for (const leaf of leaves) {
      ctx.beginPath();
      ctx.arc(leaf.x, leaf.y, leaf.r, 0, Math.PI * 2);
      ctx.fillStyle = leaf.color;
      ctx.fill();
    }

    ctx.restore();
  }

  // 繪製生動的水果
  drawFruit(fruit) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation || 0);

    const scale = fruit.scale || 1;
    ctx.scale(scale, scale);

    const r = fruit.radius;

    // 懸掛枝梗 (若正在掉落則不畫樹枝連線)
    if (fruit.state === 'HANGING') {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(4, -r - 12, 0, -r - 20);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#3d2514';
      ctx.stroke();

      // 小綠葉
      ctx.beginPath();
      ctx.ellipse(6, -r - 10, 8, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
    }

    // 水果本體
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fruit.color;
    ctx.fill();

    // 水果陰影與高光立體感
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, 0, 0, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 水果圖示或表情符號
    ctx.font = `${Math.round(r * 1.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fruit.icon, 0, 1);

    ctx.restore();
  }

  // 繪製木質 Y 型彈弓與皮筋
  drawSlingshot(baseX, baseY, pouchX, pouchY, isPulling) {
    const ctx = this.ctx;
    ctx.save();

    // 彈弓兩叉頂點
    const forkLeft = { x: baseX - 38, y: baseY - 62 };
    const forkRight = { x: baseX + 38, y: baseY - 62 };

    // 後皮筋 (穿在彈丸後方)
    ctx.beginPath();
    ctx.moveTo(forkLeft.x, forkLeft.y);
    ctx.lineTo(pouchX, pouchY);
    ctx.lineWidth = isPulling ? 5 : 4;
    ctx.strokeStyle = '#ea580c';
    ctx.lineCap = 'round';
    ctx.stroke();

    // 彈弓木柄與 Y 字分叉
    ctx.beginPath();
    // 手柄底部往上
    ctx.moveTo(baseX, baseY + 60);
    ctx.lineTo(baseX, baseY);
    // 左叉
    ctx.lineTo(forkLeft.x, forkLeft.y);
    // 右叉
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(forkRight.x, forkRight.y);

    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#78350f';
    ctx.stroke();

    // 木紋高光層
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#b45309';
    ctx.stroke();

    // 皮筋固定端金屬扣
    for (const pt of [forkLeft, forkRight]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }

    // 前皮筋
    ctx.beginPath();
    ctx.moveTo(forkRight.x, forkRight.y);
    ctx.lineTo(pouchX, pouchY);
    ctx.lineWidth = isPulling ? 5 : 4;
    ctx.strokeStyle = '#f97316';
    ctx.stroke();

    // 皮革皮兜與彈丸
    ctx.beginPath();
    ctx.ellipse(pouchX, pouchY, 15, 10, isPulling ? Math.PI / 12 : 0, 0, Math.PI * 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    // 裝在皮兜上的彈丸小石子
    ctx.beginPath();
    ctx.arc(pouchX, pouchY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    ctx.restore();
  }

  // 繪製發光瞄準虛線與目標準星
  drawAimingTrajectory(fromX, fromY, toX, toY, progress = 0.5) {
    const ctx = this.ctx;
    ctx.save();

    // 發光瞄準虛線
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -performance.now() * 0.03;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    // 微微上揚的拋物線
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 - 25 * progress;
    ctx.quadraticCurveTo(midX, midY, toX, toY);

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = progress > 0.8 ? '#4ade80' : '#38bdf8';
    ctx.shadowColor = progress > 0.8 ? '#4ade80' : '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // 目標處發光準星
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(toX, toY, 20 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    // 準星十字線
    const cr = 8;
    ctx.beginPath();
    ctx.moveTo(toX - cr, toY); ctx.lineTo(toX + cr, toY);
    ctx.moveTo(toX, toY - cr); ctx.lineTo(toX, toY + cr);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    ctx.restore();
  }

  // 繪製飛行的彈丸
  drawProjectile(proj) {
    const ctx = this.ctx;
    ctx.save();

    // 殘影尾跡
    if (proj.trail && proj.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
      for (let i = 1; i < proj.trail.length; i++) {
        ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
      }
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 彈丸實體
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius || 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.restore();
  }

  // 擊中水果產生爆裂果汁粒子
  addFruitJuiceParticles(x, y, color = '#ef4444', count = 22) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 3.0 + Math.random() * 6.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // 向上爆開
        size: 3.5 + Math.random() * 5.0,
        color,
        alpha: 1,
        life: 1,
        gravity: 0.18,
        decay: 0.025 + Math.random() * 0.02,
      });
    }
  }

  // 觸發擊中爆發粒子 (通用)
  addHitParticles(x, y, count = 14, color = '#4ade80') {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color,
        alpha: 1,
        life: 1,
        gravity: 0,
        decay: 0.035 + Math.random() * 0.025,
      });
    }
  }

  // 更新並繪製所有粒子
  renderParticles() {
    if (this.particles.length === 0) return;

    this.ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(1, p.size * p.alpha), 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // 飄字加分動畫
  drawScorePopups(popups) {
    if (!popups || popups.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.y += pop.vy;
      pop.alpha -= 0.022;

      if (pop.alpha <= 0) {
        popups.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color || '#facc15';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }
}
