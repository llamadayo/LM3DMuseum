import rawExhibits from "./data/exhibits.json";
import type { Exhibit } from "./types";

export const exhibits: Exhibit[] = [...rawExhibits].sort(
  (a, b) => a.order - b.order,
);
export function assetUrl(
  path: string,
  base = import.meta.env.BASE_URL,
): string {
  if (/^https:\/\//i.test(path)) return path;
  if (
    /^[a-z][a-z\d+.-]*:/i.test(path) ||
    path.startsWith("//") ||
    path.split("/").includes("..")
  )
    throw new Error("Asset must use HTTPS or a project-relative path");
  return `${base.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}
export type Route =
  | { page: "home" | "collection" | "not-found" }
  | { page: "exhibit"; id: string };
export function parseRoute(hash: string): Route {
  const route = hash.replace(/^#/, "") || "/";
  if (route === "/") return { page: "home" };
  if (route === "/collection") return { page: "collection" };
  const match = route.match(/^\/exhibit\/([^/]+)$/);
  if (match) {
    try {
      return { page: "exhibit", id: decodeURIComponent(match[1]) };
    } catch {
      /* malformed URL */
    }
  }
  return { page: "not-found" };
}
export const exhibitHref = (id: string) =>
  `#/exhibit/${encodeURIComponent(id)}`;
export const number = (value: number) => String(value).padStart(2, "0");
