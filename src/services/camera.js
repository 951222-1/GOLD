// 攝影機串流生命週期管理
export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.running = false;
  }

  async start(options = {}) {
    if (this.running) return;

    const defaultConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    const constraints = { ...defaultConstraints, ...options };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.video.srcObject = this.stream;

    await new Promise((resolve) => {
      this.video.onloadedmetadata = () => {
        resolve();
      };
    });

    await this.video.play();
    this.running = true;
  }

  stop() {
    this.running = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  isReady() {
    return this.running && this.video.readyState >= 2;
  }

  getDimensions() {
    return {
      videoWidth: this.video.videoWidth || 640,
      videoHeight: this.video.videoHeight || 480,
    };
  }
}
