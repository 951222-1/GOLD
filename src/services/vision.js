import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

const BASE = import.meta.env.BASE_URL || './';
const LOCAL_POSE_MODEL = `${BASE}models/pose_landmarker_lite.task`.replace('//', '/');
const LOCAL_HAND_MODEL = `${BASE}models/hand_landmarker.task`.replace('//', '/');

const CDN_POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
const CDN_HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

async function createModelWithFallback(createFn, localPath, cdnPath) {
  try {
    // 優先嘗試本地相對路徑
    return await createFn(localPath);
  } catch (err) {
    console.warn(`本地模型 (${localPath}) 載入失敗，自動切換至 Google CDN 備援節點...`, err);
    return await createFn(cdnPath);
  }
}

export class VisionEngine {
  constructor() {
    this.vision = null;
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.isLoading = false;
  }

  async init() {
    if (this.poseLandmarker && this.handLandmarker) return;
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      this.vision = await FilesetResolver.forVisionTasks(WASM_URL);

      const [pose, hand] = await Promise.all([
        createModelWithFallback(
          (path) =>
            PoseLandmarker.createFromOptions(this.vision, {
              baseOptions: { modelAssetPath: path, delegate: 'GPU' },
              runningMode: 'VIDEO',
              numPoses: 1,
              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            }),
          LOCAL_POSE_MODEL,
          CDN_POSE_MODEL
        ),
        createModelWithFallback(
          (path) =>
            HandLandmarker.createFromOptions(this.vision, {
              baseOptions: { modelAssetPath: path, delegate: 'GPU' },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: 0.5,
              minHandPresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            }),
          LOCAL_HAND_MODEL,
          CDN_HAND_MODEL
        ),
      ]);

      this.poseLandmarker = pose;
      this.handLandmarker = hand;
    } finally {
      this.isLoading = false;
    }
  }

  detect(video, timestamp, { needPose = true, needHand = true } = {}) {
    let poseResult = null;
    let handResult = null;

    if (needPose && this.poseLandmarker) {
      poseResult = this.poseLandmarker.detectForVideo(video, timestamp);
    }

    if (needHand && this.handLandmarker) {
      handResult = this.handLandmarker.detectForVideo(video, timestamp);
    }

    return { poseResult, handResult };
  }
}

export const visionEngine = new VisionEngine();
