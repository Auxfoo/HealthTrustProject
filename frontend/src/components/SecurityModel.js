import React from "react";
import { BrainCircuit, Database, FileKey2, History, ShieldCheck } from "lucide-react";

const rows = [
  {
    icon: FileKey2,
    title: "Client-side encryption",
    text: "Files are encrypted in the browser before upload. The backend and Pinata do not receive plaintext records.",
  },
  {
    icon: Database,
    title: "IPFS stores encrypted files",
    text: "Encrypted files are pinned to IPFS/Pinata. Blockchain stores only CIDs and permission state.",
  },
  {
    icon: History,
    title: "Tamper-resistant audit trail",
    text: "Grant, revoke, institution, and record events are written to Sepolia and shown as audit history.",
  },
  {
    icon: ShieldCheck,
    title: "Revocation limit",
    text: "Revocation blocks future authorized access and key sharing. It cannot erase copies already downloaded or decrypted.",
  },
  {
    icon: BrainCircuit,
    title: "ML is not diagnosis",
    text: "The diabetes model is a prototype risk-support tool. It does not replace clinical judgment or lab diagnosis.",
  },
];

export default function SecurityModel() {
  return (
    <section className="panel request-list">
      <h3>Security Model</h3>
      {rows.map(({ icon: Icon, title, text }) => (
        <article className="request-row" key={title}>
          <div>
            <strong>
              <Icon size={16} /> {title}
            </strong>
            <span>{text}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
