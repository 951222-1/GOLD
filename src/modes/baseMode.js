export class BaseMode {
  constructor(id, name, requirements = { needPose: true, needHand: true }) {
    this.id = id;
    this.name = name;
    this.requirements = requirements;
    this.count = 0;
  }

  init() {
    this.count = 0;
  }

  reset() {
    this.count = 0;
  }

  // 子類別覆寫：每幀更新與計算
  update(_data, _renderer, _width, _height) {
    throw new Error('update() must be implemented by subclass');
  }

  // 取得儀表板顯示數值
  getMetrics() {
    return {
      count: this.count,
      label: '次數',
      status: '正常',
      detail: '',
    };
  }
}
