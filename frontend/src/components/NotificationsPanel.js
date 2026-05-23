import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bell, Check, Inbox } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { createAuthHeaders } from "../utils/auth";
import { useLanguage } from "../i18n";

export default function NotificationsPanel() {
  const { API_URL, walletAddress } = useWallet();
  const { t, localizeText, formatDate } = useLanguage();
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
    <section className="panel notifications-panel">
      <div className="panel-title-row">
        <h2><Bell size={18} />{t("Notifications")}</h2>
      </div>
      <div className="request-list">
        {notifications.map((item) => (
          <article className={`request-row ${item.read ? "" : "unread"}`} key={item.id}>
            <div>
              <strong>{localizeText(item.title)}</strong>
              <span>{localizeText(item.message)}</span>
              <small>{formatDate(item.createdAt)}</small>
            </div>
            {!item.read && (
              <button className="icon-button ghost" onClick={() => markRead(item.id)} aria-label={t("Mark notification read")}>
                <Check size={16} />
              </button>
            )}
          </article>
        ))}
        {notifications.length === 0 && (
          <div className="empty-state">
            <Inbox size={28} />
            <strong>{t("No notifications")}</strong>
            <span>{t("Updates about access, notes, documents, and membership will appear here.")}</span>
          </div>
        )}
      </div>
    </section>
  );
}
