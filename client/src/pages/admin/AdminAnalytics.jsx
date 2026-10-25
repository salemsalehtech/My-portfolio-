// AdminAnalytics.jsx — the visitor statistics page (/admin/analytics). Read-only: it shows what
// the anonymous counters (server/src/routes/analytics.js) collected for the last 7 / 30 / 90 days:
// summary tiles, a "visits per day" bar chart, and the top sections, projects and referrers.
//
// The chart is plain SVG (no library): one bar per day, hover OR keyboard focus on a day shows
// its value, and the same numbers are always available in the "Daily numbers" table, so nothing
// depends on hovering. Bar color comes from the --chart-bar CSS variable (one step per theme,
// checked for contrast on the light and dark surfaces).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { T } from "../../i18n/translations";

const RANGES = [7, 30, 90];
const fmt = (n) => Number(n || 0).toLocaleString("en");
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");
// "2026-10-25" -> "Oct 25"
const shortDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

// Rounds a maximum up to a tidy axis value (…, 10, 20, 30, 40, 50, 60, 80, 100, …), so the
// tallest bar fills most of the chart instead of leaving half of it empty.
function niceMax(value) {
  const max = Math.max(1, value);
  const power = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 3, 4, 5, 6, 8, 10]) if (max <= step * power) return step * power;
  return 10 * power;
}

// A bar with 4px rounded corners at the top (the data end) and a square base.
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function VisitsChart({ daily }) {
  const [hover, setHover] = useState(null);
  const W = 760, H = 230;
  const pad = { top: 14, right: 10, bottom: 30, left: 38 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const top = niceMax(Math.max(...daily.map((d) => d.visits)));
  const slot = innerW / daily.length;
  const barW = Math.min(24, Math.max(2, slot - 2)); // ≤ 24px thick, ≥ 2px gap between bars
  const yOf = (v) => pad.top + innerH - (v / top) * innerH;
  const labelDays = [0, Math.floor((daily.length - 1) / 2), daily.length - 1];
  const hovered = hover === null ? null : daily[hover];

  return (
    <div className="an-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visits per day">
        {/* Gridlines at 0, the middle (only when it is a whole number of visits) and the top. */}
        {[0, top / 2, top].filter(Number.isInteger).map((v) => (
          <g key={v}>
            <line className="an-grid" x1={pad.left} x2={W - pad.right} y1={yOf(v)} y2={yOf(v)} />
            <text className="an-axis" x={pad.left - 8} y={yOf(v) + 4} textAnchor="end">{fmt(v)}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          const h = (d.visits / top) * innerH;
          return (
            <g key={d.date}>
              {h > 0 && <path className={`an-bar ${hover === i ? "is-hover" : ""}`} d={barPath(x, pad.top + innerH - h, barW, h)} />}
              {/* Invisible hit area: the whole column, so the pointer doesn't have to land on a thin bar. */}
              <rect
                className="an-hit"
                x={pad.left + i * slot} y={pad.top} width={slot} height={innerH}
                tabIndex={0}
                aria-label={`${shortDate(d.date)}: ${d.visits} visits`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              />
            </g>
          );
        })}
        {labelDays.filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} className="an-axis" x={pad.left + i * slot + slot / 2} y={H - 8} textAnchor="middle">{shortDate(daily[i].date)}</text>
        ))}
      </svg>
      {hovered && (
        <div className="an-tooltip" style={{ left: `${((pad.left + hover * slot + slot / 2) / W) * 100}%` }}>
          <strong>{fmt(hovered.visits)} visits</strong>
          <span>{shortDate(hovered.date)}</span>
        </div>
      )}
    </div>
  );
}

// A small ranked table with an inline bar showing each row's share of the top value.
function TopTable({ title, rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="an-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="admin-empty">Nothing yet.</p>
      ) : (
        <table className="admin-table an-top">
          <tbody>
            {rows.map((r) => (
              <tr key={label(r)}>
                <td>{label(r)}</td>
                <td className="an-bar-cell"><div className="an-inline-bar"><span style={{ width: `${(r.count / max) * 100}%` }} /></div></td>
                <td className="an-num">{fmt(r.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api.get(`/admin/analytics?days=${days}`).then(setData).catch((err) => setError(err.message));
  }, [days]);

  const t = data && data.totals;
  return (
    <div>
      <h1>Analytics</h1>
      <div className="an-filters">
        {RANGES.map((r) => (
          <button key={r} className={`admin-btn ${days === r ? "admin-btn-primary" : ""}`} onClick={() => setDays(r)}>Last {r} days</button>
        ))}
      </div>
      <p className="an-note">Anonymous counts only — no cookies, no IP addresses. Your own visits while logged in are not counted.</p>
      {error && <p className="admin-error">{error}</p>}
      {!data && !error && <p>Loading…</p>}

      {data && (
        <>
          <div className="an-tiles">
            <div className="an-tile"><span>Visits</span><strong>{fmt(t.visits)}</strong></div>
            <div className="an-tile"><span>Per day (average)</span><strong>{(t.visits / data.days).toFixed(1)}</strong></div>
            <div className="an-tile"><span>CV downloads</span><strong>{fmt(t.cvDownloads)}</strong></div>
            <div className="an-tile"><span>On mobile</span><strong>{pct(t.mobile, t.mobile + t.desktop)}</strong></div>
            <div className="an-tile"><span>In Arabic</span><strong>{pct(t.langAr, t.langAr + t.langEn)}</strong></div>
          </div>

          <div className="an-card">
            <h2>Visits per day</h2>
            {t.visits === 0 ? <p className="admin-empty">No visits recorded in this period yet.</p> : <VisitsChart daily={data.daily} />}
            <details className="an-details">
              <summary>Daily numbers (table)</summary>
              <table className="admin-table">
                <thead><tr><th>Date</th><th className="an-num">Visits</th></tr></thead>
                <tbody>
                  {[...data.daily].reverse().map((d) => (
                    <tr key={d.date}><td>{d.date}</td><td className="an-num">{fmt(d.visits)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>

          <div className="an-grid-3">
            <TopTable title="Sections viewed" rows={data.sections} label={(r) => T.en.nav[r.name] || r.name} />
            <TopTable title="Projects opened" rows={data.projects} label={(r) => r.title} />
            <TopTable title="Where visitors came from" rows={data.referrers} label={(r) => (r.host === "direct" ? "Direct / unknown" : r.host === "other" ? "Other sites" : r.host)} />
          </div>
        </>
      )}
    </div>
  );
}
