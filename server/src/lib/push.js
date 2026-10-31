// push.js — phone notifications (Web Push) for the savings circles. The VAPID key pair is made
// once and kept in CircleSettings, so nothing has to be added to Render's environment.
// A device subscribes from the portal (/#/gam3eya) or the dashboard; dead subscriptions (the
// browser answers 404 / 410) are deleted. Sending never throws.
const webpush = require("web-push");
const { CircleSettings, PushSubscription } = require("./mongo");

let ready = null; // a promise of { publicKey }, set up on first use

async function setup() {
  let settings = await CircleSettings.findOne().select("+vapidPrivate");
  if (!settings) settings = new CircleSettings();
  if (!settings.vapidPublic || !settings.vapidPrivate) {
    const keys = webpush.generateVAPIDKeys();
    settings.vapidPublic = keys.publicKey;
    settings.vapidPrivate = keys.privateKey;
    await settings.save();
  }
  webpush.setVapidDetails("mailto:noreply@salemsaleh.tech", settings.vapidPublic, settings.vapidPrivate);
  return { publicKey: settings.vapidPublic };
}
const vapid = () => {
  if (!ready) ready = setup().catch((err) => { ready = null; throw err; });
  return ready;
};

// Sends { title, body, url } to every device of a member (or of the owner, for null).
async function sendPush(memberId, message) {
  try {
    const subs = await PushSubscription.find({ member: memberId });
    if (subs.length === 0) return;
    await vapid();
    await Promise.all(subs.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(message), { TTL: 24 * 60 * 60 })
        .catch((err) => {
          if (err.statusCode === 404 || err.statusCode === 410) return PushSubscription.deleteOne({ _id: sub._id });
          console.warn("Push failed:", err.statusCode || err.message);
        })));
  } catch (err) {
    console.error("Push error:", err.message);
  }
}

// Saves a device's subscription for a member (or the owner, null). Returns false if it is malformed.
async function saveSubscription(memberId, sub) {
  const endpoint = String(sub?.endpoint || "");
  const keys = sub?.keys || {};
  if (!/^https:\/\//.test(endpoint) || !keys.p256dh || !keys.auth) return false;
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { member: memberId, endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) } },
    { upsert: true }
  );
  return true;
}

module.exports = { vapid, sendPush, saveSubscription };
