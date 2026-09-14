// scrollToSection.js — smooth-scrolls the page to a section by its element id.
//
// This is a plain DOM helper, not a React hook (no "use" prefix, no state) — that's why it
// lives in lib/ next to api.js and particles.js rather than in hooks/. Used by the Navbar
// links and Hero's CTA buttons/scroll hint to jump to sections like "about" or "projects".
//
// Subtracts 70px from the target so the fixed navbar doesn't cover the top of the section.
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
  }
}
