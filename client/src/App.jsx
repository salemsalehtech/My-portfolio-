import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SiteProvider } from "./context/SiteContext";
import { AdminProvider } from "./context/AdminContext";
import Portfolio from "./pages/Portfolio";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminSkills from "./pages/admin/AdminSkills";
import AdminYoutube from "./pages/admin/AdminYoutube";
import AdminMessages from "./pages/admin/AdminMessages";
import { Navigate } from "react-router-dom";

export default function App() {
  return (
    <SiteProvider>
      <AdminProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/projects" replace />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="skills" element={<AdminSkills />} />
              <Route path="youtube" element={<AdminYoutube />} />
              <Route path="messages" element={<AdminMessages />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AdminProvider>
    </SiteProvider>
  );
}
