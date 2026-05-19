import React, { useEffect, useState } from "react";
import axios from "axios";
import { Check, Inbox } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { createAuthHeaders } from "../utils/auth";

export default function NotificationsPanel() {
  const { API_URL, walletAddress } = useWallet();
  const [notifications, setNotifications] = useState([]);

  async function loadNotifications() {
    if (!walletAddress) return;
    const response = await axios.get(`${API_URL}/api/notifications`, {
      headers: await createAuthHeaders(walletAddress),
    });
    setNotifications(response.data);
  }

  async function markRead(id) {
    await axios.patch(
      `${API_URL}/api/notifications/${id}/read`,
      {},
      { headers: await createAuthHeaders(walletAddress) }
    );
    await loadNotifications();
  }

  useEffect(() => {
    loadNotifications();
  }, [walletAddress]);

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>Notifications</h2>
      </div>
      <div className="request-list">
        {notifications.map((item) => (
          <article className={`request-row ${item.read ? "" : "unread"}`} key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.message}</span>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </div>
            {!item.read && (
              <button className="icon-button ghost" onClick={() => markRead(item.id)} aria-label="Mark notification read">
                <Check size={16} />
              </button>
            )}
          </article>
        ))}
        {notifications.length === 0 && (
          <div className="empty-state">
            <Inbox size={28} />
            <strong>No notifications</strong>
            <span>Updates about access, notes, documents, and membership will appear here.</span>
          </div>
        )}
      </div>
    </section>
  );
}
