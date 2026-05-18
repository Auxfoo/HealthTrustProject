import React from "react";
import { Clipboard, ExternalLink, FileText, Key, KeyRound } from "lucide-react";
import { toast } from "react-toastify";

function truncateCid(cid) {
  if (!cid) return "";
  return `${cid.slice(0, 10)}...${cid.slice(-8)}`;
}

export default function RecordCard({ record, filename, aesKey, onManageAccess, actions }) {
  const timestamp = record.timestamp
    ? new Date(record.timestamp * 1000).toLocaleString()
    : "Pending timestamp";

  async function copyCid() {
    await navigator.clipboard.writeText(record.cid);
    toast.success("CID copied");
  }

  async function copyAesKey() {
    await navigator.clipboard.writeText(aesKey);
    toast.success("AES key copied");
  }

  return (
    <article className="record-card">
      <div className="record-icon">
        <FileText size={22} />
      </div>
      <div className="record-details">
        <strong>{filename || `Record #${record.id}`}</strong>
        <span>CID: {truncateCid(record.cid)}</span>
        {record.uploadedBy && <span>Patient: {record.uploadedBy}</span>}
        <span>{timestamp}</span>
      </div>
      <div className="record-actions">
        <button className="icon-button ghost" onClick={copyCid} aria-label="Copy CID">
          <Clipboard size={16} />
        </button>
        <a className="icon-link" href={`https://gateway.pinata.cloud/ipfs/${record.cid}`} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
        </a>
        {aesKey && (
          <button className="icon-button with-label secondary" onClick={copyAesKey}>
            <Key size={16} />
            Copy Key
          </button>
        )}
        {onManageAccess && (
          <button className="icon-button with-label" onClick={() => onManageAccess(record)}>
            <KeyRound size={16} />
            Manage
          </button>
        )}
        {actions}
      </div>
    </article>
  );
}
