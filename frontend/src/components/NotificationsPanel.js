import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bell, Check, Inbox, RefreshCw } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { createAuthHeaders } from "../utils/auth";
import { useLanguage } from "../i18n";

function truncateWallet(wallet) {
  if (!wallet) return "";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function NotificationsPanel() {
  const { API_URL, walletAddress } = useWallet();
  const { t, localizeText, formatDate } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    if (!walletAddress) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: await createAuthHeaders(walletAddress),
      });
      setNotifications(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "Unable to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
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
        <button className="icon-button secondary" onClick={loadNotifications} disabled={loading} aria-label={t("Refresh notifications")}>
          <RefreshCw className={loading ? "spin-icon" : ""} size={16} />
        </button>
      </div>
      <p className="muted">Showing notifications for {truncateWallet(walletAddress)}.</p>
      {error && (
        <div className="notice">
          <strong>{t("Unable to load notifications")}</strong>
          <span>{localizeText(error)}</span>
        </div>
      )}
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
        {!loading && notifications.length === 0 && !error && (
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
