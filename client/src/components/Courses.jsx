// Courses.jsx — the "Courses & Content" section (id="courses"): one card per course or content
// series (a YouTube playlist, a Udemy course, a Facebook series…) with a cover picture, the
// platform, a short description, a details line ("12 lessons · Free") and a link out. The list
// comes from the public GET /courses API (only the visible ones, managed in Admin → Courses);
// Portfolio.jsx fetches it and passes it in as `items` / `loading`, because the Navbar also needs
// to know if it's empty.
//
// Cover pictures work like certificate pictures (GET /courses/:id/image?v=<updatedAt>). If there
// are no courses the whole section is skipped. As in Certificates.jsx, the content is a separate
// component so useReveal() sees its elements when it mounts.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { API_BASE } from "../lib/api";
import { pick } from "../lib/pick";

export const courseImageUrl = (course) =>
  `${API_BASE}/courses/${course.id}/image?v=${encodeURIComponent(course.updatedAt || "")}`;

export default function Courses({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <CoursesContent items={items} />;
}

function CoursesContent({ items }) {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();
  // Arabic text that starts with an English word ("Node.js للمبتدئين") would be laid out
  // left-to-right by dir="auto", so the direction follows which language was actually picked.
  const dirOf = (en, ar) => (pick(lang, en, ar) === ar ? "rtl" : "ltr");

  return (
    <section id="courses" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.courses.subtitle}</div>
          <h2>{t.courses.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={gridRef} className={`certs-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.map((course) => {
            const title = pick(lang, course.titleEn, course.titleAr);
            const desc = pick(lang, course.descEn, course.descAr);
            const details = pick(lang, course.detailsEn, course.detailsAr);
            return (
              <article className="cert-card course-card" key={course.id}>
                <div className={`cert-image ${course.hasImage ? "" : "cert-image-empty"}`}>
                  {course.hasImage ? (
                    <img src={courseImageUrl(course)} alt="" loading="lazy" />
                  ) : (
                    <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                  )}
                  {course.platform && <span className="course-platform" dir="auto">{course.platform}</span>}
                </div>
                <div className="cert-body">
                  <h3 className="cert-title" dir={dirOf(course.titleEn, course.titleAr)}>{title}</h3>
                  {details && <p className="cert-meta" dir={dirOf(course.detailsEn, course.detailsAr)}>{details}</p>}
                  {desc && <p className="course-desc" dir={dirOf(course.descEn, course.descAr)}>{desc}</p>}
                  {course.url && (
                    <a className="cert-link" href={course.url} target="_blank" rel="noopener noreferrer">
                      {t.courses.open} <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
