import { useEffect, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Share2,
  X,
  LoaderCircle,
} from "lucide-react";
import type { ModelViewerElement } from "@google/model-viewer";
import { assetUrl } from "../lib";
import type { Exhibit } from "../types";
import type { ToonController, Viewpoint } from "./viewerTypes";

export default function ExhibitViewer({ exhibit }: { exhibit: Exhibit }) {
  const [mode, setMode] = useState<"original" | "toon">("original");
  const toon = useRef<ToonController | null>(null);
  const viewpoint = useRef<Viewpoint | null>(null);
  const initialViewpoint = useRef<Viewpoint | null>(null);
  const currentExhibit = useRef(exhibit);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const model = useRef<ModelViewerElement | null>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const shareDialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (currentExhibit.current !== exhibit) {
      currentExhibit.current = exhibit;
      viewpoint.current = null;
      initialViewpoint.current = null;
      setMode("original");
      if (mode !== "original") return;
    }
    let active = true;
    let settled = false;
    let lastProgress = 0;
    let element: ModelViewerElement | undefined;
    let timer: ReturnType<typeof setTimeout>;
    setStatus("loading");
    setProgress(0);
    setRotating(false);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 20000);
    const loaded = () => {
      if (active && !settled) {
        settled = true;
        if (element && !initialViewpoint.current && element.getCameraOrbit) {
          const orbit = element.getCameraOrbit();
          initialViewpoint.current = {
            ...orbit,
            target: element.getCameraTarget(),
            fov: element.getFieldOfView(),
          };
        }
        setStatus("ready");
        clearTimeout(timer);
        clearTimeout(slowTimer);
      }
    };
    const failed = () => {
      if (active) {
        settled = true;
        setStatus("error");
        toon.current?.dispose();
        toon.current = null;
        clearTimeout(timer);
        clearTimeout(slowTimer);
      }
    };
    const onProgress = (event: Event) => {
      if (!active || settled) return;
      const value = (event as CustomEvent<{ totalProgress: number }>).detail
        .totalProgress;
      setProgress(Math.round(value * 100));
      // A large model on a slow connection may legitimately take several minutes.
      // Fail only after two minutes without new progress, not total download time.
      if (value > lastProgress) {
        lastProgress = value;
        clearTimeout(timer);
        timer = setTimeout(failed, 120000);
      }
    };
    timer = setTimeout(failed, 120000);
    // Loading this module only on the exhibit route keeps Three.js off the entrance page.
    if (mode === "toon" && viewpoint.current && initialViewpoint.current) {
      import("./toonViewer")
        .then(({ createToonViewer }) => {
          if (!active || settled || !host.current) return;
          toon.current = createToonViewer({
            host: host.current,
            src: assetUrl(exhibit.model),
            alt: exhibit.alt,
            viewpoint: viewpoint.current!,
            initialViewpoint: initialViewpoint.current!,
            onLoad: loaded,
            onError: failed,
            onProgress: (totalProgress) =>
              onProgress(
                new CustomEvent("progress", { detail: { totalProgress } }),
              ),
          });
        })
        .catch(failed);
    } else
      import("@google/model-viewer")
        .then(({ ModelViewerElement }) => {
          if (!active || settled || !host.current) return;
          ModelViewerElement.dracoDecoderLocation = assetUrl("decoders/draco/");
          ModelViewerElement.ktx2TranscoderLocation =
            assetUrl("decoders/basis/");
          ModelViewerElement.meshoptDecoderLocation = assetUrl(
            "decoders/meshopt_decoder.js",
          );
          ModelViewerElement.modelCacheSize = 0;
          element = document.createElement(
            "model-viewer",
          ) as ModelViewerElement;
          const attributes = {
            alt: exhibit.alt,
            "camera-controls": "",
            "touch-action": "pan-y",
            "interaction-prompt": "none",
            "camera-orbit": exhibit.cameraOrbit || "25deg 75deg 105%",
            "camera-target": exhibit.cameraTarget || "auto auto auto",
            "field-of-view": exhibit.fieldOfView || "30deg",
            "shadow-intensity": "0.8",
            "shadow-softness": "1",
            exposure: "1",
            "environment-image": "neutral",
            "tone-mapping": "aces",
            loading: "eager",
            "aria-label": `${exhibit.title}：拖曳旋轉、雙指縮放，也可使用方向鍵控制`,
          };
          Object.entries(attributes).forEach(([key, value]) =>
            element!.setAttribute(key, value),
          );
          if (viewpoint.current) {
            const view = viewpoint.current;
            element.cameraOrbit = `${view.theta}rad ${view.phi}rad ${view.radius}m`;
            element.cameraTarget = `${view.target.x}m ${view.target.y}m ${view.target.z}m`;
            element.fieldOfView = `${view.fov}deg`;
          }
          element.addEventListener("load", loaded);
          element.addEventListener("error", failed);
          element.addEventListener("progress", onProgress);
          const reduced = matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          if (reduced) element.interpolationDecay = 0;
          model.current = element;
          host.current.replaceChildren(element);
          element.src = assetUrl(exhibit.model);
        })
        .catch(failed);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(slowTimer);
      element?.removeEventListener("load", loaded);
      element?.removeEventListener("error", failed);
      element?.removeEventListener("progress", onProgress);
      if (element) {
        element.pause();
        element.autoRotate = false;
        element.removeAttribute("src");
        element.remove();
      }
      model.current = null;
      toon.current?.dispose();
      toon.current = null;
    };
  }, [exhibit, attempt, mode]);

  useEffect(() => {
    const changed = () =>
      setNativeFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const shell = document.querySelector<HTMLElement>(".site-header");
    const details = document.querySelector<HTMLElement>(".exhibit-details");
    const footer = document.querySelector<HTMLElement>(".site-footer");
    const crumb = document.querySelector<HTMLElement>(".breadcrumb");
    const navigation = document.querySelector<HTMLElement>(
      ".exhibit-pagination",
    );
    const others = [shell, details, footer, crumb, navigation].filter(
      (el): el is HTMLElement => !!el,
    );
    others.forEach((el) => {
      el.inert = true;
    });
    fullscreenButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !shareDialog.current?.open) setExpanded(false);
      if (e.key === "Tab" && !shareDialog.current?.open) {
        const focusable = Array.from(
          stage.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], model-viewer, canvas[tabindex]",
          ) || [],
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      others.forEach((el) => {
        el.inert = false;
      });
      document.removeEventListener("keydown", key);
      fullscreenButton.current?.focus();
    };
  }, [expanded]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const switchMode = (next: "original" | "toon") => {
    if (next === mode) return;
    if (status === "ready") {
      if (mode === "original" && model.current) {
        const el = model.current;
        const orbit = el.getCameraOrbit();
        viewpoint.current = {
          ...orbit,
          theta: orbit.theta - el.turntableRotation,
          target: el.getCameraTarget(),
          fov: el.getFieldOfView(),
        };
      } else if (toon.current) viewpoint.current = toon.current.getViewpoint();
    }
    setMode(next);
  };
  const reset = () => {
    if (toon.current) {
      toon.current.reset();
      setRotating(false);
      return;
    }
    const el = model.current;
    if (!el) return;
    el.autoRotate = false;
    setRotating(false);
    el.resetTurntableRotation();
    el.cameraOrbit = exhibit.cameraOrbit || "25deg 75deg 105%";
    el.cameraTarget = exhibit.cameraTarget || "auto auto auto";
    el.fieldOfView = exhibit.fieldOfView || "30deg";
    el.jumpCameraToGoal();
  };
  const toggleRotation = () => {
    if (toon.current) {
      toon.current.setRotating(!rotating);
      setRotating(!rotating);
      return;
    }
    if (model.current) {
      model.current.autoRotate = !rotating;
      setRotating(!rotating);
    }
  };
  const fullscreen = async () => {
    if (nativeFullscreen) {
      await document.exitFullscreen();
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    try {
      if (stage.current?.requestFullscreen) {
        await stage.current.requestFullscreen();
        return;
      }
    } catch {
      /* iOS and embedded contexts use viewport mode */
    }
    setExpanded(true);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice("已複製展品連結");
    } catch {
      shareDialog.current?.showModal();
    }
  };
  const fullscreenActive = expanded || nativeFullscreen;
  return (
    <div
      className={`model-stage ${expanded ? "expanded" : ""}`}
      ref={stage}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label={`${exhibit.title} 3D 展示區`}
    >
      <div ref={host} className="model-host" hidden={status === "error"} />
      {status !== "ready" ? (
        <div className="model-poster">
          <img src={assetUrl(exhibit.poster)} alt={exhibit.alt} />
        </div>
      ) : null}
      <div className="viewer-modes glass" role="group" aria-label="展示模式">
        <button
          aria-pressed={mode === "original"}
          onClick={() => switchMode("original")}
        >
          原始
        </button>
        <button
          aria-pressed={mode === "toon"}
          disabled={
            !initialViewpoint.current ||
            (mode === "original" && status !== "ready")
          }
          onClick={() => switchMode("toon")}
        >
          Toon
        </button>
      </div>
      <span className="stage-caption">
        {exhibit.subtitle}
        <span>INTERACTIVE OBJECT</span>
      </span>
      {status === "loading" ? (
        <div className="load-panel glass" role="status">
          <LoaderCircle className="loading-icon" size={18} />
          <span>
            {slow ? "模型較大，仍在載入中…" : "正在準備展品"} <b>{progress}%</b>
          </span>
          <progress value={progress} max="100" aria-label="模型載入進度" />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="error-panel glass" role="alert">
          <strong>暫時無法開啟 3D 展品</strong>
          <p>模型可能無法連線，或裝置不支援 3D。你仍可欣賞封面與展品介紹。</p>
          <button
            className="button primary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            重新載入
          </button>
          <a href="#/collection">返回展品目錄</a>
        </div>
      ) : null}
      <div className="viewer-toolbar glass" aria-label="模型控制">
        <button
          onClick={toggleRotation}
          disabled={status !== "ready"}
          aria-pressed={rotating}
          aria-label={rotating ? "停止自動旋轉" : "開始自動旋轉"}
        >
          <RotateCw size={19} />
          <span>{rotating ? "停止" : "旋轉"}</span>
        </button>
        <button
          onClick={reset}
          disabled={status !== "ready"}
          aria-label="重設視角"
        >
          <RotateCcw size={19} />
          <span>重置</span>
        </button>
        <button
          ref={fullscreenButton}
          onClick={fullscreen}
          aria-label={fullscreenActive ? "離開全螢幕" : "全螢幕賞玩"}
        >
          {fullscreenActive ? <Minimize size={19} /> : <Maximize size={19} />}
          <span>{fullscreenActive ? "返回" : "全螢幕"}</span>
        </button>
        <button onClick={share} aria-label="分享展品連結">
          <Share2 size={19} />
          <span>分享</span>
        </button>
      </div>
      <p className="viewer-hint">拖曳旋轉 · 滾輪或雙指縮放</p>
      <div className="toast" role="status">
        {notice}
      </div>
      <dialog ref={shareDialog} className="share-dialog">
        <button
          aria-label="關閉分享視窗"
          className="icon-button"
          onClick={() => shareDialog.current?.close()}
        >
          <X />
        </button>
        <h2>分享這件展品</h2>
        <p>複製以下連結，邀請朋友一起欣賞。</p>
        <input
          aria-label="展品分享連結"
          readOnly
          value={location.href}
          onFocus={(e) => e.target.select()}
        />
        <button
          className="button primary"
          onClick={() => shareDialog.current?.close()}
        >
          完成
        </button>
      </dialog>
    </div>
  );
}
