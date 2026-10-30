// "My First Post: React & Node!" -> "my-first-post-react-node". Used to suggest the readable
// part of a link (blog posts, forms) from an English title; the server accepts only a-z, 0-9
// and single dashes.
export const slugify = (text) =>
  String(text).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
