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
