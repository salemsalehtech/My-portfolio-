// youtube.js — reads the 11-character video id out of any usual YouTube link:
//   https://www.youtube.com/watch?v=ID   https://youtu.be/ID
//   https://www.youtube.com/shorts/ID    https://www.youtube.com/embed/ID
// Returns "" when the link isn't a YouTube video link. The server accepts the same formats
// (see VIDEO_URL in server/src/lib/mongo.js).
export function youtubeId(url) {
  const match = String(url || "").match(
    /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i
  );
  return match ? match[1] : "";
}

// Privacy-friendly embed address: youtube-nocookie.com sets no tracking cookies until the
// visitor actually plays the video.
export const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
