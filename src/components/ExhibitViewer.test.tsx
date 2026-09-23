// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ExhibitViewer from "./ExhibitViewer";
import { exhibits } from "../lib";

vi.mock("@google/model-viewer", () => {
  class MockViewer extends HTMLElement {
    static modelCacheSize = 1;
    static dracoDecoderLocation = "";
    static ktx2TranscoderLocation = "";
    static meshoptDecoderLocation = "";
    turntableRotation = 0;
    getCameraOrbit = () => ({ theta: 0.4, phi: 1.3, radius: 4 });
    getCameraTarget = () => ({ x: 0, y: 1, z: 0 });
    getFieldOfView = () => 30;
    autoRotate = false;
    src = "";
    cameraOrbit = "";
    cameraTarget = "";
    fieldOfView = "";
    availableAnimations: string[] = [];
    currentTime = 0;
    play = vi.fn();
    pause = vi.fn();
    resetTurntableRotation = vi.fn();
    jumpCameraToGoal = vi.fn();
  }
  customElements.define("model-viewer", MockViewer);
  return { ModelViewerElement: MockViewer };
});
const toonMock = vi.hoisted(() => ({
  getPlayback: vi.fn(() => ({ time: 3.5, playing: false })),
  setPlaying: vi.fn(),
  restartAnimation: vi.fn(),
  dispose: vi.fn(),
  reset: vi.fn(),
  setRotating: vi.fn(),
  getViewpoint: vi.fn(() => ({
    theta: 0.8,
    phi: 1.2,
    radius: 3,
    target: { x: 0, y: 1, z: 0 },
    fov: 30,
  })),
  options: null as null | {
    onLoad(hasAnimation?: boolean): void;
    playback: { time: number; playing: boolean };
    onError(): void;
    viewpoint: { theta: number };
  },
}));
vi.mock("./toonViewer", () => ({
  createToonViewer: vi.fn((options) => {
    toonMock.options = options;
    options.host.replaceChildren(document.createElement("canvas"));
    return toonMock;
  }),
}));
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function mounted() {
  const view = render(<ExhibitViewer exhibit={exhibits[0]} />);
  await waitFor(() =>
    expect(document.querySelector("model-viewer")).not.toBeNull(),
  );
  const element = document.querySelector("model-viewer")!;
  return { ...view, element };
}
describe("viewer lifecycle and fallbacks", () => {
  it("allows a slow download while progress continues, but recovers from a stalled transfer", async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<ExhibitViewer exhibit={exhibits[0]} />);
    });
    const element = document.querySelector("model-viewer")!;
    expect(element).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(90000);
      element.dispatchEvent(
        new CustomEvent("progress", { detail: { totalProgress: 0.4 } }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(90000);
    });
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(30001);
    });
    expect(screen.getByRole("alert").textContent).toContain("暫時無法開啟");
  });
  it("keeps the poster and disabled controls during loading, then reveals the viewer", async () => {
    const { element } = await mounted();
    expect(
      (screen.getByRole("button", { name: "重設視角" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    act(() => {
      element.dispatchEvent(
        new CustomEvent("progress", { detail: { totalProgress: 0.45 } }),
      );
    });
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("45");
    act(() => {
      element.dispatchEvent(new Event("load"));
    });
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(
      (screen.getByRole("button", { name: "重設視角" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(document.querySelector(".model-poster")).toBeNull();
  });
  it("recovers from a network or invalid GLB error with a new viewer on retry", async () => {
    const { element } = await mounted();
    act(() => {
      element.dispatchEvent(new Event("error"));
    });
    expect(screen.getByRole("alert").textContent).toContain("暫時無法開啟");
    expect(document.querySelector(".model-poster")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
    await waitFor(() =>
      expect(document.querySelector("model-viewer")).not.toBe(element),
    );
    expect(element.isConnected).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("stops rotation, clears the model source and detaches listeners on unmount", async () => {
    const { element, unmount } = await mounted();
    act(() => {
      element.dispatchEvent(new Event("load"));
    });
    fireEvent.click(screen.getByRole("button", { name: "開始自動旋轉" }));
    expect(
      screen
        .getByRole("button", { name: "停止自動旋轉" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    unmount();
    expect(element.isConnected).toBe(false);
    expect(element.getAttribute("src")).toBeNull();
    expect((element as HTMLElement & { autoRotate: boolean }).autoRotate).toBe(
      false,
    );
  });
  it("resets rotation and camera controls to the exhibit defaults", async () => {
    const { element } = await mounted();
    act(() => {
      element.dispatchEvent(new Event("load"));
    });
    fireEvent.click(screen.getByRole("button", { name: "開始自動旋轉" }));
    fireEvent.click(screen.getByRole("button", { name: "重設視角" }));
    expect(
      screen
        .getByRole("button", { name: "開始自動旋轉" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect((element as HTMLElement & { cameraOrbit: string }).cameraOrbit).toBe(
      exhibits[0].cameraOrbit,
    );
  });
  it("falls back to viewport fullscreen and restores scrolling on Escape", async () => {
    await mounted();
    fireEvent.click(screen.getByRole("button", { name: "全螢幕賞玩" }));
    await waitFor(() =>
      expect(document.querySelector(".model-stage.expanded")).not.toBeNull(),
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector(".model-stage.expanded")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("original / Toon switching", () => {
  it("transfers the viewpoint, routes controls and releases the inactive renderer", async () => {
    const { element } = await mounted();
    expect(
      (screen.getByRole("button", { name: "Toon" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    act(() => element.dispatchEvent(new Event("load")));
    (element as unknown as { turntableRotation: number }).turntableRotation =
      0.1;
    fireEvent.click(screen.getByRole("button", { name: "Toon" }));
    await waitFor(() =>
      expect(document.querySelector("canvas")).not.toBeNull(),
    );
    expect(element.isConnected).toBe(false);
    expect(toonMock.options!.viewpoint.theta).toBeCloseTo(0.3);
    act(() => toonMock.options!.onLoad());
    fireEvent.click(screen.getByRole("button", { name: "開始自動旋轉" }));
    expect(toonMock.setRotating).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "重設視角" }));
    expect(toonMock.reset).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "原始" }));
    await waitFor(() =>
      expect(document.querySelector("model-viewer")).not.toBeNull(),
    );
    expect(toonMock.dispose).toHaveBeenCalled();
    expect(document.querySelector("canvas")).toBeNull();
    expect(
      (
        document.querySelector("model-viewer") as unknown as {
          cameraOrbit: string;
        }
      ).cameraOrbit,
    ).toBe("0.8rad 1.2rad 3m");
  });
  it("allows returning to original mode after a Toon failure and ignores stale load callbacks", async () => {
    const { element } = await mounted();
    act(() => element.dispatchEvent(new Event("load")));
    fireEvent.click(screen.getByRole("button", { name: "Toon" }));
    await waitFor(() =>
      expect(document.querySelector("canvas")).not.toBeNull(),
    );
    const previous = toonMock.options!;
    act(() => previous.onError());
    expect(screen.getByRole("alert")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "原始" }));
    await waitFor(() =>
      expect(document.querySelector("model-viewer")).not.toBeNull(),
    );
    act(() => previous.onLoad());
    expect(screen.getByRole("progressbar")).not.toBeNull();
  });
});

describe("animation playback", () => {
  it("hides animation controls for a static model", async () => {
    const { element } = await mounted();
    act(() => element.dispatchEvent(new Event("load")));
    expect(screen.queryByRole("group", { name: "動畫控制" })).toBeNull();
  });
  it("plays, pauses, rewinds, and carries playback across both renderers", async () => {
    const { element } = await mounted();
    const animated = element as unknown as {
      availableAnimations: string[];
      currentTime: number;
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
    };
    animated.availableAnimations = ["You_Groove"];
    act(() => element.dispatchEvent(new Event("load")));
    expect(screen.getByRole("button", { name: "播放動畫" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "播放動畫" }));
    expect(animated.play).toHaveBeenCalled();
    animated.currentTime = 2.25;
    fireEvent.click(screen.getByRole("button", { name: "Toon" }));
    await waitFor(() =>
      expect(document.querySelector("canvas")).not.toBeNull(),
    );
    expect(toonMock.options!.playback).toEqual({ time: 2.25, playing: true });
    act(() => toonMock.options!.onLoad(true));
    fireEvent.click(screen.getByRole("button", { name: "暫停動畫" }));
    expect(toonMock.setPlaying).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "動畫回到開頭" }));
    expect(toonMock.restartAnimation).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "原始" }));
    await waitFor(() =>
      expect(document.querySelector("model-viewer")).not.toBeNull(),
    );
    const restored = document.querySelector("model-viewer")!;
    Object.assign(restored, { availableAnimations: ["You_Groove"] });
    act(() => restored.dispatchEvent(new Event("load")));
    expect((restored as unknown as { currentTime: number }).currentTime).toBe(
      3.5,
    );
    expect(screen.getByRole("button", { name: "播放動畫" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "動畫回到開頭" }));
    expect((restored as unknown as { currentTime: number }).currentTime).toBe(
      0,
    );
  });
});
