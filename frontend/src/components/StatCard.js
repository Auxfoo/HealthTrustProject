import React from "react";
import { useLanguage } from "../i18n";

export default function StatCard({ icon: Icon, label, value, accent }) {
  const { t, localizeText } = useLanguage();

  return (
    <article className="stat-card">
      {Icon && (
        <div className={`stat-icon ${accent || ""}`}>
          <Icon size={20} />
        </div>
      )}
      <div>
        <span>{t(label)}</span>
        <strong>{localizeText(value)}</strong>
      </div>
    </article>
  );
}
