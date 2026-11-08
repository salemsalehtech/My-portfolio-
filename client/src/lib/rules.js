// rules.js — the product rules, read from the server (GET /api/meta → server/src/lib/rules.js)
// instead of being copied into the client: upload limits and types, which status moves a member
// may make, the owner's @handle, and the time zone "today" is counted in.
//
// loadRules() fetches them once per page load (later calls share the same request); useRules()
// gives them to a component and re-renders when they arrive. Until they arrive the checks that
// depend on them are skipped — the server enforces every rule anyway, so nothing unsafe gets
// through; the browser checks only save a pointless upload or a refused drag.
import { useEffect, useState } from "react";
import { api } from "./api";

let rules = null;
let pending = null;

export function loadRules() {
  if (!pending) {
    pending = api.get("/meta")
      .then((r) => { rules = r; return r; })
      .catch(() => { pending = null; return null; }); // try again next time
  }
  return pending;
}
export const getRules = () => rules;

export function useRules() {
  const [value, setValue] = useState(rules);
  useEffect(() => {
    if (!value) loadRules().then((r) => r && setValue(r));
  }, [value]);
  return value;
}

// The owner's time zone (the server's value once loaded; the same default before that, so the
// first paint already counts dates like the server).
export const timeZone = () => rules?.timeZone || "Africa/Cairo";

// Why a file can't be uploaded as `kind` ("image" | "attachment"): "type", "size", or null when
// it's fine — or when the rules haven't loaded yet (the server will check it anyway).
export function fileProblem(file, kind) {
  const r = rules?.uploads[kind];
  if (!r) return null;
  if (!r.types.includes(file.type.split(";")[0])) return "type";
  if (file.size > r.maxBytes) return "size";
  return null;
}
export const maxMb = (kind) => Math.round((rules?.uploads[kind].maxBytes || 0) / (1024 * 1024));

// The dashboard's message for a picture that can't be uploaded, or "" when it's fine.
// `t` is the dashboard's translate function (lib/adminI18n.jsx).
export function imageError(file, t) {
  const problem = fileProblem(file, "image");
  if (problem === "type") return t("Please choose a PNG, JPEG or WebP image.");
  if (problem === "size") return t("The image is too large (max {mb} MB).", { mb: maxMb("image") });
  return "";
}
