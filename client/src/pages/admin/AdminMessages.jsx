// AdminMessages.jsx — admin page listing contact-form submissions (from Contact.jsx on the
// public site). Supports marking a message read/unread and deleting it. Simpler than the
// other admin pages: no create/edit form, just a table and two actions per row.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAdminT } from "../../lib/adminI18n";

export default function AdminMessages() {
  const { t } = useAdminT();
  const [messages, setMessages] = useState([]);

  // Re-fetches the full list from the server. Called once on mount, and again after every
  // mutation (toggleRead/remove) below instead of updating local state by hand — simpler
  // to reason about, at the cost of an extra request per action.
  const load = () => api.get("/admin/messages").then(setMessages);
  useEffect(() => { load(); }, []);

  const toggleRead = async (m) => {
    await api.patch(`/admin/messages/${m.id}`, { read: !m.read });
    load();
  };

  const remove = async (id) => {
    if (!confirm(t("Delete this message?"))) return;
    await api.del(`/admin/messages/${id}`);
    load();
  };

  return (
    <div>
      <h1>{t("Messages")}</h1>
      <table className="admin-table">
        <thead>
          <tr><th>{t("Name")}</th><th>{t("Email")}</th><th>{t("Message")}</th><th>{t("Received")}</th><th></th></tr>
        </thead>
        <tbody>
          {messages.length === 0 && <tr><td colSpan={5} className="admin-empty">{t("No messages yet.")}</td></tr>}
          {messages.map((m) => (
            <tr key={m.id} className={!m.read ? "admin-row-unread" : ""}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td dir="auto" style={{ whiteSpace: "pre-wrap", minWidth: 220 }}>{m.message}</td>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => toggleRead(m)}>{m.read ? t("Mark Unread") : t("Mark Read")}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(m.id)}>{t("Delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
