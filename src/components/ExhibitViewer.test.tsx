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
    autoRotate = false;
    src = "";
    cameraOrbit = "";
    cameraTarget = "";
    fieldOfView = "";
    pause = vi.fn();
    resetTurntableRotation = vi.fn();
    jumpCameraToGoal = vi.fn();
  }
  customElements.define("model-viewer", MockViewer);
  return { ModelViewerElement: MockViewer };
});
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
