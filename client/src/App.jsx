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
// SiteProvider (theme/language), AdminProvider (admin login state) and AdminI18nProvider (the
// dashboard's own English/Arabic switch, lib/adminI18n.jsx) wrap EVERYTHING, so
// every page/component below can call useSite()/useAdmin() without extra setup. HashRouter
// (URLs like "/#/admin") is used instead of BrowserRouter because the client is deployed as
// a static site to GitHub Pages, which can't be configured to redirect unknown paths back
// to index.html the way a real server can.
import { HashRouter, Route, Routes } from "react-router-dom";
import { SiteProvider } from "./context/SiteContext";
import { AdminProvider } from "./context/AdminContext";
import { AdminI18nProvider } from "./lib/adminI18n";
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
import PublicForm from "./pages/PublicForm";
import AdminServices from "./pages/admin/AdminServices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCertificates from "./pages/admin/AdminCertificates";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminForms from "./pages/admin/AdminForms";
import AdminFormEditor from "./pages/admin/AdminFormEditor";
import AdminFormResponses from "./pages/admin/AdminFormResponses";
import BlogList from "./pages/BlogList";
import { Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// The article page and the post editor use the Markdown libraries (marked + DOMPurify). Loading
// them lazily puts that code in a separate file that is only downloaded when one of these two
// pages is opened — the home page stays as light as before.
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AdminPostEditor = lazy(() => import("./pages/admin/AdminPostEditor"));
// The team workspace (member portal + the owner's team pages) is only downloaded when opened.
const TeamPortal = lazy(() => import("./pages/team/TeamPortal"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminTeamProject = lazy(() => import("./pages/admin/AdminTeamProject"));
const loading = <p style={{ padding: 40, textAlign: "center" }}>…</p>;

export default function App() {
  return (
    <SiteProvider>
      <AdminProvider>
      <AdminI18nProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<Suspense fallback={loading}><BlogPost /></Suspense>} />
            <Route path="/feedback" element={<Navigate to="/feedback/en" replace />} />
            <Route path="/feedback/:lang" element={<FeedbackForm />} />
            <Route path="/form/:slug" element={<PublicForm />} />
            <Route path="/form/:slug/:lang" element={<PublicForm />} />
            <Route path="/team/*" element={<Suspense fallback={loading}><TeamPortal /></Suspense>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/projects" replace />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="skills" element={<AdminSkills />} />
              <Route path="youtube" element={<AdminYoutube />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="certificates" element={<AdminCertificates />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="team" element={<Suspense fallback={loading}><AdminTeam /></Suspense>} />
              <Route path="team/projects/:id" element={<Suspense fallback={loading}><AdminTeamProject /></Suspense>} />
              <Route path="forms" element={<AdminForms />} />
              <Route path="forms/:id" element={<AdminFormEditor />} />
              <Route path="forms/:id/responses" element={<AdminFormResponses />} />
              <Route path="posts/:id" element={<Suspense fallback={loading}><AdminPostEditor /></Suspense>} />
              <Route path="testimonials" element={<AdminTestimonials />} />
              <Route path="about" element={<AdminAbout />} />
              <Route path="cv" element={<AdminCV />} />
            </Route>
          </Routes>
        </HashRouter>
      </AdminI18nProvider>
      </AdminProvider>
    </SiteProvider>
  );
}
