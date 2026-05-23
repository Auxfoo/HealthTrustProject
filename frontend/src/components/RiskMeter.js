import React from "react";
import { useLanguage } from "../i18n";

export default function RiskMeter({ probability }) {
  const { t, formatNumber } = useLanguage();
  const percent = Math.round(probability * 100);
  const label = probability <= 0.33 ? "Low Risk" : probability <= 0.66 ? "Medium Risk" : "High Risk";
  const tone = probability <= 0.33 ? "low" : probability <= 0.66 ? "medium" : "high";

  return (
    <div className="risk-meter">
      <div className="risk-topline">
        <strong>{formatNumber(percent)}%</strong>
        <span>{t(label)}</span>
      </div>
      <div className="risk-track">
        <div className={`risk-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
