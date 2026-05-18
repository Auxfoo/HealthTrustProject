import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Archive, Clock3, Download, FileText, History, RefreshCw, Search, ShieldCheck, Upload } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import AccessModal from "../components/AccessModal";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import StatCard from "../components/StatCard";
import { addRecord, getBrowserProvider, getContract, parseReceiptEvent } from "../utils/contractHelper";
import { encryptFile, generateRandomKey } from "../utils/encryption";
import { createAuthHeaders } from "../utils/auth";

function metadataKey(wallet) {
  return `healthtrust_record_metadata_${wallet?.toLowerCase()}`;
}

function getLocalMetadata(wallet) {
  return JSON.parse(localStorage.getItem(metadataKey(wallet)) || "{}");
}

function saveLocalMetadata(wallet, recordId, data) {
  const current = getLocalMetadata(wallet);
  localStorage.setItem(metadataKey(wallet), JSON.stringify({ ...current, [recordId]: { ...current[recordId], ...data } }));
}

function makePdf(title, lines) {
  const text = [title, "", ...lines].join("\n").replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 12 Tf 50 780 Td 16 TL (${text.replace(/\n/g, ") Tj T* (")}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export default function PatientDashboard() {
  const { walletAddress, API_URL, userProfile, fetchProfile } = useWallet();
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [keyRows, setKeyRows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("records");
  const [auditTrail, setAuditTrail] = useState([]);
  const [search, setSearch] = useState("");
  const [uploadMeta, setUploadMeta] = useState({ category: "lab", provider: "", notes: "", important: false, emergency: false });
  const [profile, setProfile] = useState({});

  async function loadRecords() {
    const response = await axios.get(`${API_URL}/api/records/${walletAddress}`);
    setRecords(response.data);
    const local = getLocalMetadata(walletAddress);
    const merged = {};
    response.data.forEach((record) => {
      merged[record.id] = { ...(record.metadata || {}), ...(local[record.id] || {}) };
    });
    setMetadata(merged);

    const headers = await createAuthHeaders(walletAddress);
    const [keys, access, docs] = await Promise.all([
      axios.get(`${API_URL}/api/record-keys/owned`, { headers }),
      axios.get(`${API_URL}/api/access-requests`, { headers }),
      axios.get(`${API_URL}/api/doctor-documents`, { headers }),
    ]);
    setKeyRows(keys.data);
    setRequests(access.data);
    setDocuments(docs.data);
  }

  async function loadAuditTrail() {
    const provider = await getBrowserProvider();
    const contract = getContract(provider);
    const filters = [
      contract.filters.AccessGrantedToDoctor(walletAddress),
      contract.filters.AccessRevokedFromDoctor(walletAddress),
      contract.filters.AccessGrantedToInstitution(walletAddress),
      contract.filters.AccessRevokedFromInstitution(walletAddress),
      contract.filters.RecordAddedForPatient?.(walletAddress),
    ].filter(Boolean);
    const logs = (await Promise.all(filters.map((filter) => contract.queryFilter(filter, 0, "latest")))).flat();
    const rows = await Promise.all(
      logs.map(async (log) => {
        const block = await provider.getBlock(log.blockNumber);
        return {
          action: log.fragment.name,
          target: log.args.doctor || log.args.createdBy || log.args.institutionId?.toString() || "-",
          recordId: Number(log.args.recordId),
          timestamp: new Date(Number(block.timestamp) * 1000).toLocaleString(),
        };
      })
    );
    setAuditTrail(rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  }

  useEffect(() => {
    if (walletAddress) {
      setProfile({
        bloodType: userProfile?.bloodType || "",
        allergies: userProfile?.allergies || "",
        chronicConditions: userProfile?.chronicConditions || "",
        emergencyContact: userProfile?.emergencyContact || "",
      });
      loadRecords();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (activeTab === "audit" && walletAddress) loadAuditTrail();
  }, [activeTab, walletAddress]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const meta = metadata[record.id] || {};
        if (meta.archived && activeTab !== "archive") return false;
        return `${record.id} ${record.cid} ${meta.filename || ""} ${meta.title || ""} ${meta.category || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [records, metadata, search, activeTab]
  );

  const lastUpload = records.length
    ? new Date(Math.max(...records.map((record) => Number(record.timestamp || 0))) * 1000).toLocaleDateString()
    : "None";

  async function uploadRecord(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Encrypting record...");
    try {
      const key = generateRandomKey();
      const encryptedString = await encryptFile(await file.arrayBuffer(), key);
      const blob = new Blob([encryptedString], { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", blob, `${file.name}.encrypted.txt`);

      toast.update(toastId, { render: "Pinning encrypted file to IPFS...", isLoading: true });
      const response = await axios.post(`${API_URL}/api/records/upload`, formData, {
        headers: await createAuthHeaders(walletAddress),
      });

      toast.update(toastId, { render: "Confirming record on-chain...", isLoading: true });
      const tx = await addRecord(response.data.cid);
      const receipt = await tx.wait();
      const eventLog = await parseReceiptEvent(receipt, "RecordAdded");
      const recordId = Number(eventLog.args.recordId);
      const data = { filename: file.name, mimeType: file.type, aesKey: key, ...uploadMeta };
      saveLocalMetadata(walletAddress, recordId, data);
      await axios.post(
        `${API_URL}/api/records/metadata`,
        { recordId, ownerWallet: walletAddress, ...data },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: "Record uploaded", type: "success", isLoading: false, autoClose: 3000 });
      await loadRecords();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || error.reason || error.message,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      event.target.value = "";
    }
  }

  async function updateRequest(id, status) {
    await axios.patch(
      `${API_URL}/api/access-requests/${id}`,
      { status },
      { headers: await createAuthHeaders(walletAddress) }
    );
    toast.success(`Request ${status}`);
    await loadRecords();
  }

  async function saveRecordMetadata(recordId, nextMeta) {
    const next = { ...(metadata[recordId] || {}), ...nextMeta };
    saveLocalMetadata(walletAddress, recordId, next);
    await axios.post(
      `${API_URL}/api/records/metadata`,
      { recordId, ownerWallet: walletAddress, ...next },
      { headers: await createAuthHeaders(walletAddress) }
    );
    setMetadata((current) => ({ ...current, [recordId]: next }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    await axios.post(
      `${API_URL}/api/users/register`,
      { wallet: walletAddress, name: userProfile.name, email: userProfile.email, role: "patient", ...profile },
      { headers: await createAuthHeaders(walletAddress) }
    );
    await fetchProfile(walletAddress);
    toast.success("Medical profile saved");
  }

  function downloadCarePdf(document) {
    const blob = makePdf(document.title, [
      `Type: ${document.documentType}`,
      `Doctor: ${document.doctorWallet}`,
      `Patient: ${document.patientWallet}`,
      `Created: ${new Date(document.createdAt).toLocaleString()}`,
      "",
      document.content || "Encrypted file is stored on IPFS.",
      document.cid ? `IPFS CID: ${document.cid}` : "",
    ]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${document.title.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderRecords() {
    return (
      <>
        <div className="toolbar">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records or CID" />
        </div>
        <section className="record-list">
          {filteredRecords.map((record) => {
            const meta = metadata[record.id] || {};
            return (
              <RecordCard
                key={record.id}
                record={record}
                filename={meta.title || meta.filename}
                aesKey={meta.aesKey}
                onManageAccess={() => setSelectedRecord(record)}
                actions={
                  <>
                    <button className="icon-button ghost" onClick={() => saveRecordMetadata(record.id, { archived: !meta.archived })}>
                      <Archive size={16} />
                    </button>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={Boolean(meta.important)}
                        onChange={(event) => saveRecordMetadata(record.id, { important: event.target.checked })}
                      />
                      Important
                    </label>
                  </>
                }
              />
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <strong>No records found</strong>
            </div>
          )}
        </section>
      </>
    );
  }

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>Records and access</h1>
        </div>
        <div className="header-actions">
          <button className="icon-button secondary" onClick={loadRecords} aria-label="Refresh records">
            <RefreshCw size={16} />
          </button>
          <label className="icon-button with-label upload-button">
            <Upload size={16} />
            Upload Record
            <input type="file" accept="application/pdf,image/*" onChange={uploadRecord} hidden />
          </label>
        </div>
      </div>

      <section className="stat-grid">
        <StatCard icon={FileText} label="Records" value={records.length} />
        <StatCard icon={ShieldCheck} label="Shared keys" value={keyRows.length} accent="green" />
        <StatCard icon={History} label="Audit events" value={auditTrail.length || "Load tab"} accent="amber" />
        <StatCard icon={Clock3} label="Latest upload" value={lastUpload} />
      </section>

      <section className="panel metadata-panel">
        <label>
          New upload category
          <select value={uploadMeta.category} onChange={(event) => setUploadMeta({ ...uploadMeta, category: event.target.value })}>
            <option value="lab">Lab</option>
            <option value="prescription">Prescription</option>
            <option value="diagnosis">Diagnosis</option>
            <option value="imaging">Imaging</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Provider
          <input value={uploadMeta.provider} onChange={(event) => setUploadMeta({ ...uploadMeta, provider: event.target.value })} />
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={uploadMeta.emergency}
            onChange={(event) => setUploadMeta({ ...uploadMeta, emergency: event.target.checked })}
          />
          Emergency
        </label>
      </section>

      <div className="tabs">
        {["records", "requests", "documents", "profile", "notifications", "audit"].map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "records" && renderRecords()}
      {activeTab === "requests" && (
        <section className="panel request-list">
          {requests.map((request) => (
            <article className="request-row" key={request.id}>
              <div>
                <strong>Record #{request.recordId}</strong>
                <span>{request.requesterWallet}</span>
                <small>Status: {request.status}</small>
                {request.reason && <p>{request.reason}</p>}
              </div>
              {request.status === "pending" && (
                <div className="row-actions">
                  <button onClick={() => updateRequest(request.id, "approved")}>Approve</button>
                  <button className="secondary" onClick={() => updateRequest(request.id, "rejected")}>Reject</button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
      {activeTab === "documents" && (
        <section className="panel request-list">
          {documents.map((document) => (
            <article className="request-row" key={document.id}>
              <div>
                <strong>{document.title}</strong>
                <span>{document.documentType} from {document.doctorWallet}</span>
                <small>{new Date(document.createdAt).toLocaleString()}</small>
              </div>
              <button className="icon-button with-label" onClick={() => downloadCarePdf(document)}>
                <Download size={16} />
                PDF
              </button>
            </article>
          ))}
        </section>
      )}
      {activeTab === "profile" && (
        <section className="panel narrow">
          <form className="form-grid" onSubmit={saveProfile}>
            {Object.keys(profile).map((field) => (
              <label key={field}>
                {field}
                <input value={profile[field] || ""} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} />
              </label>
            ))}
            <button>Save profile</button>
          </form>
        </section>
      )}
      {activeTab === "notifications" && <NotificationsPanel />}
      {activeTab === "audit" && (
        <section className="panel">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target</th>
                <th>Record ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditTrail.map((row, index) => (
                <tr key={`${row.action}-${row.recordId}-${index}`}>
                  <td>{row.action}</td>
                  <td>{row.target}</td>
                  <td>{row.recordId}</td>
                  <td>{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selectedRecord && (
        <AccessModal
          record={selectedRecord}
          aesKey={metadata[selectedRecord.id]?.aesKey}
          keyRows={keyRows}
          onRefresh={loadRecords}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </main>
  );
}
