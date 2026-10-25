// Portfolio.jsx — the public single-page site (route "/"). It lays out every section in order
// and wires up the scroll-tracking state (useScrollTracking, see hooks/useScrollTracking.js)
// that Navbar and ScrollTop need.
//
// Most sections load their own data. Services and Testimonials are the exception: they are
// OPTIONAL (hidden when the dashboard has none), and the Navbar must know whether they exist to
// show their links — so their lists are fetched once here and passed to both the section and
// the Navbar.
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import Skills from "../components/Skills";
import Projects from "../components/Projects";
import Testimonials from "../components/Testimonials";
import Services from "../components/Services";
import Certificates from "../components/Certificates";
import YouTube from "../components/YouTube";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import ScrollTop from "../components/ScrollTop";
import { useScrollTracking } from "../hooks/useScrollTracking";
import { useCollection } from "../hooks/useCollection";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { useEffect } from "react";
import { useSite } from "../context/SiteContext";
import { track, trackVisit } from "../lib/analytics";

export default function Portfolio() {
  const { scrolled, activeSection, showScrollTop } = useScrollTracking();
  const { lang } = useSite();
  // Anonymous analytics (lib/analytics.js): one visit per session, and each section once when
  // it first comes into view.
  useEffect(() => { trackVisit(lang); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { track("section", activeSection); }, [activeSection]);
  // Site-wide profile content (Hero texts, links, location…) — used by several sections.
  const settings = useSiteSettings();
  const services = useCollection("/services");
  const testimonials = useCollection("/testimonials");
  const certificates = useCollection("/certificates");

  // Navbar links, in page order. The optional sections only get a link when they have content.
  const navSections = [
    "home",
    "about",
    ...(services.data.length > 0 ? ["services"] : []),
    "skills",
    "projects",
    ...(certificates.data.length > 0 ? ["certificates"] : []),
    ...(testimonials.data.length > 0 ? ["testimonials"] : []),
    "youtube",
    "contact",
  ];

  return (
    <>
      <Navbar scrolled={scrolled} activeSection={activeSection} sections={navSections} />
      <Hero settings={settings} />
      <About />
      <Services items={services.data} loading={services.loading} />
      <Skills />
      <Projects />
      <Certificates items={certificates.data} loading={certificates.loading} />
      <Testimonials items={testimonials.data} loading={testimonials.loading} />
      <YouTube settings={settings} />
      <Contact settings={settings} />
      <Footer settings={settings} />
      <ScrollTop visible={showScrollTop} />
    </>
  );
}
