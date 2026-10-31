// webPush.js — turns on phone notifications (Web Push) for the savings circles. The browser
// registers public/sw.js, asks for permission, subscribes with the server's public key and sends
// the subscription to `${base}/push/subscribe` (base = "/circle" for members, "/admin/circles"
// for the owner). On iPhone this only works after "Add to Home Screen" (iOS 16.4+).
import { api } from "./api";

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

const keyBytes = (base64) => {
  const raw = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const register = () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

// "unsupported" | "blocked" | "on" | "off"
export async function pushState() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  const sub = reg && await reg.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export async function enablePush(base) {
  const reg = await register();
  if ((await Notification.requestPermission()) !== "granted") throw new Error("blocked");
  const { publicKey } = await api.get(`${base}/push/key`);
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await api.post(`${base}/push/subscribe`, sub.toJSON());
}

// Adds the circles' web app manifest + iPhone icon while the portal is open, so "Install /
// Add to Home Screen" opens straight into /#/gam3eya. Returns a clean-up function.
export function addCirclesManifest() {
  const base = import.meta.env.BASE_URL;
  const tags = [
    Object.assign(document.createElement("link"), { rel: "manifest", href: `${base}gam3eya.webmanifest` }),
    Object.assign(document.createElement("link"), { rel: "apple-touch-icon", href: `${base}gam3eya-192.png` }),
    Object.assign(document.createElement("meta"), { name: "apple-mobile-web-app-capable", content: "yes" }),
  ];
  tags.forEach((t) => document.head.appendChild(t));
  return () => tags.forEach((t) => t.remove());
}
