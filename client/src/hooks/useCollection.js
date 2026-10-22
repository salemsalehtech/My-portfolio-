// useCollection.js — shared data-fetching hook for public list data (projects, skills,
// YouTube videos, services, testimonials). Used by components/Projects.jsx, Skills.jsx,
// YouTube.jsx and pages/Portfolio.jsx.
//
// Usage: const { data, loading } = useCollection("/projects");
// It calls api.get(path) (see lib/api.js) once when the component mounts (or whenever
// `path` changes), and always resolves `data` to an array — even on error, so components
// can map() over it without extra null-checks.
//
// It also uses lib/apiCache.js: if this browser loaded `path` before, that last answer is
// shown immediately (loading = false) and replaced when the fresh answer arrives. If the
// request fails, the cached list is kept instead of emptying the section.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { readCache, writeCache } from "../lib/apiCache";

const cachedList = (path) => {
  const cached = readCache(path);
  return Array.isArray(cached) ? cached : null;
};

export function useCollection(path) {
  const [data, setData] = useState(() => cachedList(path) || []);
  const [loading, setLoading] = useState(() => cachedList(path) === null);

  useEffect(() => {
    // Guards against a "race condition": if `path` changes again (or the component
    // unmounts) before this request finishes, `cancelled` stops the late response from
    // overwriting state with stale data.
    let cancelled = false;
    const cached = cachedList(path);
    setData(cached || []);
    setLoading(cached === null); // only "loading" when there is nothing to show yet
    api
      .get(path)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : [];
        setData(list);
        writeCache(path, list);
      })
      .catch(() => { if (!cancelled && !cached) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path]);

  return { data, loading };
}
