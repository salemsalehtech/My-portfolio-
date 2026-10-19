// App.jsx — the app's root component: sets up global state providers and all routes.
//
// Route map:
//   /                    -> Portfolio (the public single-page site)
//   /admin/login         -> AdminLogin
//   /admin               -> AdminLayout (redirects to /admin/projects if visited directly)
//     /admin/projects    -> AdminProjects
//     /admin/skills      -> AdminSkills
//     /admin/youtube     -> AdminYoutube
//     /admin/messages    -> AdminMessages
//
// SiteProvider (theme/language) and AdminProvider (admin login state) wrap EVERYTHING, so
// every page/component below can call useSite()/useAdmin() without extra setup. HashRouter
// (URLs like "/#/admin") is used instead of BrowserRouter because the client is deployed as
// a static site to GitHub Pages, which can't be configured to redirect unknown paths back
// to index.html the way a real server can.
import { HashRouter, Route, Routes } from "react-router-dom";
import { SiteProvider } from "./context/SiteContext";
import { AdminProvider } from "./context/AdminContext";
import Portfolio from "./pages/Portfolio";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminSkills from "./pages/admin/AdminSkills";
import AdminYoutube from "./pages/admin/AdminYoutube";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminCV from "./pages/admin/AdminCV";
import AdminAbout from "./pages/admin/AdminAbout";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import FeedbackForm from "./pages/FeedbackForm";
import { Navigate } from "react-router-dom";

export default function App() {
  return (
    <SiteProvider>
      <AdminProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/feedback" element={<Navigate to="/feedback/en" replace />} />
            <Route path="/feedback/:lang" element={<FeedbackForm />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/projects" replace />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="skills" element={<AdminSkills />} />
              <Route path="youtube" element={<AdminYoutube />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="testimonials" element={<AdminTestimonials />} />
              <Route path="about" element={<AdminAbout />} />
              <Route path="cv" element={<AdminCV />} />
            </Route>
          </Routes>
        </HashRouter>
      </AdminProvider>
    </SiteProvider>
  );
}
