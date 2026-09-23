import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
import { assetUrl } from "../lib";
import type {
  AnimationPlayback,
  ToonController,
  Viewpoint,
} from "./viewerTypes";

export function createToonViewer(options: {
  host: HTMLElement;
  src: string;
  alt: string;
  viewpoint: Viewpoint;
  initialViewpoint: Viewpoint;
  playback: AnimationPlayback;
  onLoad(hasAnimation: boolean): void;
  onProgress(value: number): void;
  onError(): void;
}): ToonController {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = "toon-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `${options.alt}，Toon 模式：拖曳旋轉、雙指縮放，方向鍵旋轉，加減鍵縮放`,
  );
  options.host.replaceChildren(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minPolarAngle = 0.01;
  controls.maxPolarAngle = Math.PI - 0.01;
  controls.autoRotateSpeed = 1;
  const effect = new OutlineEffect(renderer, {
    defaultThickness: 0.002,
    defaultColor: [0.12, 0.1, 0.08],
  });
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.5);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);
  const ramp = new THREE.DataTexture(
    new Uint8Array([50, 130, 210, 255]),
    4,
    1,
    THREE.RedFormat,
  );
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const draco = new DRACOLoader().setDecoderPath(assetUrl("decoders/draco/"));
  const ktx = new KTX2Loader()
    .setTranscoderPath(assetUrl("decoders/basis/"))
    .detectSupport(renderer);
  const loader = new GLTFLoader()
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx)
    .setMeshoptDecoder(MeshoptDecoder);
  let disposed = false;
  let ready = false;
  let frame = 0;
  let lastTime = 0;
  let mixer: THREE.AnimationMixer | undefined;
  let action: THREE.AnimationAction | undefined;
  let playing = options.playback.playing;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  function collect(root: THREE.Object3D) {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });
  }
  function releaseModel() {
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => {
      const data = value.source.data;
      if (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap)
        data.close();
      value.dispose();
    });
    geometries.clear();
    materials.clear();
    textures.clear();
  }
  function invalidate() {
    if (!disposed && !frame && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    controls.update(delta);
    if (playing) mixer?.update(delta);
    lastTime = time;
    if (ready) effect.render(scene, camera);
    if (controls.autoRotate || (playing && action)) invalidate();
  }
  function applyViewpoint(view: Viewpoint) {
    camera.fov = view.fov;
    camera.near = Math.max(view.radius / 10000, 0.00001);
    camera.far = Math.max(view.radius * 100, 100);
    controls.target.copy(view.target);
    camera.position
      .setFromSpherical(new THREE.Spherical(view.radius, view.phi, view.theta))
      .add(controls.target);
    controls.minDistance = options.initialViewpoint.radius * 0.15;
    controls.maxDistance = options.initialViewpoint.radius * 3;
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }
  function getViewpoint(): Viewpoint {
    const orbit = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(controls.target),
    );
    return {
      theta: orbit.theta,
      phi: orbit.phi,
      radius: orbit.radius,
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z,
      },
      fov: camera.fov,
    };
  }
  function resize() {
    const { width, height } = options.host.getBoundingClientRect();
    effect.setSize(Math.max(width, 1), Math.max(height, 1));
    camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    camera.updateProjectionMatrix();
    invalidate();
  }
  function keyboard(event: KeyboardEvent) {
    const view = getViewpoint();
    switch (event.key) {
      case "ArrowLeft":
        view.theta -= 0.1;
        break;
      case "ArrowRight":
        view.theta += 0.1;
        break;
      case "ArrowUp":
        view.phi = Math.max(0.01, view.phi - 0.1);
        break;
      case "ArrowDown":
        view.phi = Math.min(Math.PI - 0.01, view.phi + 0.1);
        break;
      case "+":
      case "=":
        view.radius *= 0.9;
        break;
      case "-":
        view.radius *= 1.1;
        break;
      default:
        return;
    }
    event.preventDefault();
    applyViewpoint(view);
  }
  function visibility() {
    lastTime = 0;
    invalidate();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    if (!disposed) options.onError();
  }
  controls.addEventListener("change", invalidate);
  canvas.addEventListener("keydown", keyboard);
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", visibility);
  const observer = new ResizeObserver(resize);
  observer.observe(options.host);
  applyViewpoint(options.viewpoint);
  resize();
  loader.load(
    options.src,
    (gltf) => {
      collect(gltf.scene);
      if (disposed) {
        releaseModel();
        return;
      }
      try {
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const convert = (source: THREE.MeshStandardMaterial) => {
            const toon = new THREE.MeshToonMaterial({
              color: source.color,
              map: source.map,
              normalMap: source.normalMap ?? null,
              normalScale: source.normalScale ?? new THREE.Vector2(1, 1),
              alphaMap: source.alphaMap,
              transparent: source.transparent,
              opacity: source.opacity,
              alphaTest: source.alphaTest,
              side: source.side,
              depthWrite: source.depthWrite,
              vertexColors: source.vertexColors,
              gradientMap: ramp,
            });
            materials.add(toon);
            return toon;
          };
          object.material = Array.isArray(object.material)
            ? object.material.map(convert)
            : convert(object.material);
        });
        scene.add(gltf.scene);
        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          action = mixer.clipAction(gltf.animations[0]);
          action.play();
          action.time =
            options.playback.time %
            Math.max(gltf.animations[0].duration, 0.001);
          mixer.update(0);
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.SkinnedMesh)
              object.frustumCulled = false;
          });
        }
        ready = true;
        options.onLoad(!!action);
        invalidate();
      } catch {
        options.onError();
      }
    },
    (event) => {
      if (!disposed && event.total > 0)
        options.onProgress(event.loaded / event.total);
    },
    () => {
      if (!disposed) options.onError();
    },
  );
  return {
    getViewpoint,
    getPlayback: () => ({ time: action?.time ?? 0, playing }),
    setPlaying(value) {
      playing = value;
      lastTime = 0;
      invalidate();
    },
    restartAnimation() {
      if (!action || !mixer) return;
      action.reset().play();
      mixer.update(0);
      lastTime = 0;
      invalidate();
    },
    reset() {
      controls.autoRotate = false;
      applyViewpoint(options.initialViewpoint);
    },
    setRotating(value) {
      controls.autoRotate = value;
      lastTime = 0;
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("keydown", keyboard);
      canvas.removeEventListener("webglcontextlost", contextLost);
      controls.dispose();
      draco.dispose();
      ktx.dispose();
      mixer?.stopAllAction();
      if (mixer) mixer.uncacheRoot(mixer.getRoot());
      scene.clear();
      releaseModel();
      ramp.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
