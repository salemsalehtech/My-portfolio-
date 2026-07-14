import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);

  const load = () => api.get("/admin/messages").then(setMessages);
  useEffect(() => { load(); }, []);

  const toggleRead = async (m) => {
    await api.patch(`/admin/messages/${m.id}`, { read: !m.read });
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this message?")) return;
    await api.del(`/admin/messages/${id}`);
    load();
  };

  return (
    <div>
      <h1>Messages</h1>
      <table className="admin-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Message</th><th>Received</th><th></th></tr>
        </thead>
        <tbody>
          {messages.length === 0 && <tr><td colSpan={5} className="admin-empty">No messages yet.</td></tr>}
          {messages.map((m) => (
            <tr key={m.id} className={!m.read ? "admin-row-unread" : ""}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{m.message}</td>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => toggleRead(m)}>{m.read ? "Mark Unread" : "Mark Read"}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(m.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
