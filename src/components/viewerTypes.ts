export interface Viewpoint {
  theta: number;
  phi: number;
  radius: number;
  target: { x: number; y: number; z: number };
  fov: number;
}
export interface AnimationPlayback {
  time: number;
  playing: boolean;
}
export interface ToonController {
  getPlayback(): AnimationPlayback;
  setPlaying(value: boolean): void;
  restartAnimation(): void;
  getViewpoint(): Viewpoint;
  reset(): void;
  setRotating(value: boolean): void;
  dispose(): void;
}
