// Certificates.jsx — the "Certificates & Achievements" section (id="certificates"): cards with
// the certificate picture, title, issuer, date and an optional "verify" link. The list comes
// from the public GET /certificates API (only the visible ones, managed in Admin →
// Certificates); Portfolio.jsx fetches it and passes it in as `items` / `loading`, because the
// Navbar also needs to know if it's empty.
//
// Pictures are served by the API (GET /certificates/:id/image) — `?v=<updatedAt>` changes when a
// new picture is uploaded, so browsers never keep showing an old one. Clicking a picture opens
// it full size. If there are no certificates the whole section is skipped. As in Services.jsx,
// the content is a separate component so useReveal() sees its elements when it mounts.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { API_BASE } from "../lib/api";
import { pick } from "../lib/pick";

export const certificateImageUrl = (cert) =>
  `${API_BASE}/certificates/${cert.id}/image?v=${encodeURIComponent(cert.updatedAt || "")}`;

export default function Certificates({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <CertificatesContent items={items} />;
}

function CertificatesContent({ items }) {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  return (
    <section id="certificates" className="section-bg">
      <div className="section-bg-circle" style={{ bottom: "-60px", right: "-60px" }}></div>
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.certificates.subtitle}</div>
          <h2>{t.certificates.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={gridRef} className={`certs-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.map((cert) => {
            const title = pick(lang, cert.titleEn, cert.titleAr);
            const issuer = pick(lang, cert.issuerEn, cert.issuerAr);
            return (
              <article className="cert-card" key={cert.id}>
                {cert.hasImage ? (
                  <a className="cert-image" href={certificateImageUrl(cert)} target="_blank" rel="noopener noreferrer">
                    <img src={certificateImageUrl(cert)} alt={title} loading="lazy" />
                  </a>
                ) : (
                  <div className="cert-image cert-image-empty" aria-hidden="true">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.48 12.89L17 22l-5-3-5 3 1.52-9.11" /></svg>
                  </div>
                )}
                <div className="cert-body">
                  <h3 className="cert-title" dir="auto">{title}</h3>
                  {(issuer || cert.date) && (
                    <p className="cert-meta" dir="auto">{[issuer, cert.date].filter(Boolean).join(" · ")}</p>
                  )}
                  {cert.credentialUrl && (
                    <a className="cert-link" href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">
                      {t.certificates.view} <span aria-hidden="true">↗</span>
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
