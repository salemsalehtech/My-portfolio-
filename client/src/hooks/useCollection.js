// useCollection.js — shared data-fetching hook for public list data (projects, skills,
// YouTube videos). Used by components/Projects.jsx, components/Skills.jsx, and
// components/YouTube.jsx.
//
// Usage: const { data, loading } = useCollection("/projects");
// It calls api.get(path) (see lib/api.js) once when the component mounts (or whenever
// `path` changes), and always resolves `data` to an array — even on error, so components
// can map() over it without extra null-checks.
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useCollection(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guards against a "race condition": if `path` changes again (or the component
    // unmounts) before this request finishes, `cancelled` stops the late response from
    // overwriting state with stale data.
    let cancelled = false;
    setLoading(true);
    api
      .get(path)
      .then((res) => { if (!cancelled) setData(res || []); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path]);

  return { data, loading };
}
