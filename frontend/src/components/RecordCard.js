import React from "react";
import { Clipboard, ExternalLink, FileText, KeyRound } from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "../i18n";

function truncateCid(cid) {
  if (!cid) return "";
  return `${cid.slice(0, 10)}...${cid.slice(-8)}`;
}

export default function RecordCard({ record, filename, onManageAccess, actions }) {
  const { t, localizeText, formatDate, formatNumber } = useLanguage();
  const timestamp = record.timestamp
    ? formatDate(record.timestamp * 1000)
    : t("Pending timestamp");

  async function copyCid() {
    await navigator.clipboard.writeText(record.cid);
    toast.success(t("CID copied"));
  }

  return (
    <article className="record-card">
      <div className="record-icon">
        <FileText size={22} />
      </div>
      <div className="record-details">
        <strong>{filename || localizeText(`Record #${record.id}`)}</strong>
        <span>{t("Record ID")}: <bdi dir="ltr">{formatNumber(record.id)}</bdi></span>
        <span>{t("CID")}: <bdi dir="ltr">{truncateCid(record.cid)}</bdi></span>
        {record.uploadedBy && <span>{t("Patient")}: <bdi dir="ltr">{record.uploadedBy}</bdi></span>}
        <span>{timestamp}</span>
      </div>
      <div className="record-actions">
        <button className="icon-button ghost" onClick={copyCid} aria-label={t("Copy CID")}>
          <Clipboard size={16} />
        </button>
        <a className="icon-link" href={`https://gateway.pinata.cloud/ipfs/${record.cid}`} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
        </a>
        {onManageAccess && (
          <button className="icon-button with-label" onClick={() => onManageAccess(record)}>
            <KeyRound size={16} />
            {t("Manage")}
          </button>
        )}
        {actions}
      </div>
    </article>
  );
}
