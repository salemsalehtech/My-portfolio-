// Portfolio.jsx — the public single-page site (route "/"). Pure composition: it just lays
// out every section component in order and wires up the scroll-tracking state
// (useScrollTracking, see hooks/useScrollTracking.js) that Navbar and ScrollTop need.
// No section-specific logic lives here — each section owns its own content/state.
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import Skills from "../components/Skills";
import Projects from "../components/Projects";
import YouTube from "../components/YouTube";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import ScrollTop from "../components/ScrollTop";
import { useScrollTracking } from "../hooks/useScrollTracking";

export default function Portfolio() {
  const { scrolled, activeSection, showScrollTop } = useScrollTracking();

  return (
    <>
      <Navbar scrolled={scrolled} activeSection={activeSection} />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <YouTube />
      <Contact />
      <Footer />
      <ScrollTop visible={showScrollTop} />
    </>
  );
}
