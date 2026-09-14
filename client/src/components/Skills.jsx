// Skills.jsx — the "Technical Skills" section (id="skills"): a tab switcher
// (frontend/backend/tools) above a list of animated progress bars, fetched live from the
// public GET /skills API via useCollection(). Only skills matching the active tab's
// `group` are shown.
import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";

const TABS = ["frontend", "backend", "tools"];

export default function Skills() {
  const { t, lang } = useSite();
  const [activeTab, setActiveTab] = useState("frontend");
  const { data: skills } = useCollection("/skills");
  const [sectionRef, sectionVisible] = useReveal();

  const list = skills.filter((s) => s.group === activeTab);

  return (
    <section id="skills" className="section-bg">
      <div className="section-bg-circle" style={{ bottom: "-60px", left: "-60px" }}></div>
      <div className="container">
        <div className="section-header" data-ao>
          <div className="section-badge">{t.skills.subtitle}</div>
          <h2>{t.skills.title}</h2>
          <div className="section-line"></div>
        </div>

        <div className="skills-tabs" data-ao>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`skill-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {t.skills[tab]}
            </button>
          ))}
        </div>

        <div ref={sectionRef} className={`skills-list ${sectionVisible ? "visible" : ""}`} data-ao>
          {list.map((skill, i) => (
            <div className="skill-item" key={skill.id}>
              <div className="skill-header">
                <div className="skill-left">
                  <div className="skill-abbr" style={{ background: skill.color, color: skill.textColor }}>{skill.abbr}</div>
                  <span className="skill-name">{skill.name}</span>
                </div>
                <div className="skill-right">
                  <span className="skill-level">{lang === "ar" ? skill.levelAr : skill.levelEn}</span>
                  <span className="skill-pct">{skill.percentage}%</span>
                </div>
              </div>
              <div className="skill-bar">
                {/* Bar starts at 0% and animates (via CSS transition) to the real
                    percentage only once the section has scrolled into view; each bar is
                    staggered slightly (0.12s * index) so they fill in one after another. */}
                <div
                  className="skill-fill"
                  style={{
                    background: `linear-gradient(90deg, ${skill.color}, var(--gold-light))`,
                    width: sectionVisible ? `${skill.percentage}%` : "0%",
                    transitionDelay: `${i * 0.12}s`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
