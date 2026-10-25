// useScrollTracking.js — one hook, used once by pages/Portfolio.jsx, that tracks
// everything the page needs to know about scroll position:
//   - scrolled        true once the user has scrolled past 60px (Navbar uses this to add
//                      a background/shadow so it's visible over page content)
//   - activeSection    which section id is currently in view (Navbar highlights this link)
//   - showScrollTop    true once scrolled past 400px (shows the ScrollTop button)
//
// (The related scrollToSection() helper — for clicking a nav link to jump to a section —
// lives in lib/scrollToSection.js since it's a plain DOM utility, not a stateful hook.)
import { useEffect, useState } from "react";

// In page order. Optional sections (services, testimonials) that aren't on the page right now
// are simply skipped below — getElementById returns null for them.
const SECTION_IDS = ["home", "about", "services", "skills", "projects", "certificates", "testimonials", "blog", "youtube", "contact"];

export function useScrollTracking() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      setScrolled(y > 60);
      setShowScrollTop(y > 400);
      // Walk the sections top-to-bottom and keep the last one we've scrolled past —
      // that's the section currently "active" in the viewport.
      let current = "home";
      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) current = id;
      });
      setActiveSection(current);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // run once immediately so state is correct even before the first scroll
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrolled, activeSection, showScrollTop };
}
