export interface Viewpoint {
  theta: number;
  phi: number;
  radius: number;
  target: { x: number; y: number; z: number };
  fov: number;
}
export interface ToonController {
  getViewpoint(): Viewpoint;
  reset(): void;
  setRotating(value: boolean): void;
  dispose(): void;
}
