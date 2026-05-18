import React from "react";

export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <article className="stat-card">
      {Icon && (
        <div className={`stat-icon ${accent || ""}`}>
          <Icon size={20} />
        </div>
      )}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
