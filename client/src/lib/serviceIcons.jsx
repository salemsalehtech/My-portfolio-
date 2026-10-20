// serviceIcons.jsx — the built-in icons a service card can use (picked in Admin → Services).
// The keys must match SERVICE_ICONS in server/src/lib/mongo.js. Each icon is a simple
// stroke SVG that takes the current text color, so it follows the theme automatically.
const svg = (children) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const SERVICE_ICONS = {
  web: { label: "Web app", icon: svg(<><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>) },
  mobile: { label: "Mobile / responsive", icon: svg(<><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>) },
  backend: { label: "Backend / API", icon: svg(<><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></>) },
  code: { label: "Code", icon: svg(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>) },
  design: { label: "UI / UX design", icon: svg(<><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>) },
  teaching: { label: "Teaching / courses", icon: svg(<><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>) },
  automation: { label: "Automation", icon: svg(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />) },
  database: { label: "Database", icon: svg(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>) },
  consulting: { label: "Consulting", icon: svg(<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />) },
};

// The icon for a key, or the "web" one if the key is unknown.
export const serviceIcon = (key) => (SERVICE_ICONS[key] || SERVICE_ICONS.web).icon;
