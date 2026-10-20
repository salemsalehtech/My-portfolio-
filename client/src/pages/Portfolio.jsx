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
import YouTube from "../components/YouTube";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import ScrollTop from "../components/ScrollTop";
import { useScrollTracking } from "../hooks/useScrollTracking";
import { useCollection } from "../hooks/useCollection";

export default function Portfolio() {
  const { scrolled, activeSection, showScrollTop } = useScrollTracking();
  const services = useCollection("/services");
  const testimonials = useCollection("/testimonials");

  // Navbar links, in page order. The optional sections only get a link when they have content.
  const navSections = [
    "home",
    "about",
    ...(services.data.length > 0 ? ["services"] : []),
    "skills",
    "projects",
    ...(testimonials.data.length > 0 ? ["testimonials"] : []),
    "youtube",
    "contact",
  ];

  return (
    <>
      <Navbar scrolled={scrolled} activeSection={activeSection} sections={navSections} />
      <Hero />
      <About />
      <Services items={services.data} loading={services.loading} />
      <Skills />
      <Projects />
      <Testimonials items={testimonials.data} loading={testimonials.loading} />
      <YouTube />
      <Contact />
      <Footer />
      <ScrollTop visible={showScrollTop} />
    </>
  );
}
