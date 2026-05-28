import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Archive,
  Bell,
  Check,
  Clock3,
  Download,
  ExternalLink,
  FileKey2,
  FilePlus2,
  FileText,
  History,
  Inbox,
  LoaderCircle,
  Lock,
  NotebookPen,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useWallet } from "../context/WalletContext";
import AccessModal from "../components/AccessModal";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import SecurityModel from "../components/SecurityModel";
import StatCard from "../components/StatCard";
import {
  addRecord,
  getBrowserProvider,
  getContract,
  grantAccessToDoctor,
  parseReceiptEvent,
} from "../utils/contractHelper";
import { encryptFile, generateRandomKey } from "../utils/encryption";
import { createAuthHeaders } from "../utils/auth";
import { buildDoctorKeyEnvelope, storeKeyEnvelope } from "../utils/recordSharing";
import { createHealthTrustPdf } from "../utils/pdfReport";
import { useLanguage } from "../i18n";

const patientTabs = [
  { key: "records", label: "Records", icon: FileText },
  { key: "archive", label: "Archive", icon: Archive },
  { key: "consent", label: "Consent", icon: ShieldCheck },
  { key: "requests", label: "Requests", icon: Inbox },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "documents", label: "Documents", icon: FilePlus2 },
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "audit", label: "Audit", icon: History },
  { key: "security", label: "Security", icon: Lock },
];

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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

export default function PatientDashboard() {
  const { walletAddress, API_URL, userProfile, fetchProfile } = useWallet();
  const { t, localizeText, formatDate, formatNumber } = useLanguage();
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [keyRows, setKeyRows] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("records");
  const [auditTrail, setAuditTrail] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [uploadMeta, setUploadMeta] = useState({ category: "lab", provider: "", notes: "", important: false, emergency: false });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [profile, setProfile] = useState({});
  const uploadInProgress = uploadStatus?.state === "working";

  async function loadRecords() {
    try {
      const response = await axios.get(`${API_URL}/api/records/${walletAddress}`);
      setRecords(response.data);
      const local = getLocalMetadata(walletAddress);
      const merged = {};
      response.data.forEach((record) => {
        merged[record.id] = { ...(local[record.id] || {}), ...(record.metadata || {}) };
      });
      setMetadata(merged);

      const headers = await createAuthHeaders(walletAddress);
      const [keys, noteResponse, docs, accessRequests] = await Promise.all([
        axios.get(`${API_URL}/api/record-keys/owned`, { headers }),
        axios.get(`${API_URL}/api/notes`, { headers }),
        axios.get(`${API_URL}/api/doctor-documents`, { headers }),
        axios.get(`${API_URL}/api/access-requests`, { headers }),
      ]);
      setKeyRows(keys.data);
      setNotes(noteResponse.data);
      setDocuments(docs.data);
      setRequests(accessRequests.data);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t("Unable to load records"));
    }
  }

  async function loadAuditTrail() {
    try {
      const headers = await createAuthHeaders(walletAddress);
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
      const chainRows = await Promise.all(
        logs.map(async (log) => {
          const block = await provider.getBlock(log.blockNumber);
          return {
            action: log.fragment.name,
            target: log.args.doctor || log.args.createdBy || log.args.institutionId?.toString() || "-",
            recordId: Number(log.args.recordId),
            timestamp: new Date(Number(block.timestamp) * 1000),
          };
        })
      );
      const requestRows = requests.map((request) => ({
        action: request.requestType === "emergency" ? "EmergencyAccessRequested" : "AccessRequested",
        target: request.requesterWallet,
        recordId: request.recordId,
        timestamp: new Date(request.createdAt),
        detail: request.reason || request.status,
      }));
      const noteRows = notes.map((note) => ({
        action: "DoctorNoteAdded",
        target: note.doctorWallet,
        recordId: note.recordId,
        timestamp: new Date(note.updatedAt || note.createdAt),
        detail: note.status,
      }));
      const documentRows = documents.map((document) => ({
        action: "CareDocumentAdded",
        target: document.doctorWallet,
        recordId: document.recordId ?? null,
        timestamp: new Date(document.createdAt),
        detail: document.title,
      }));
      const notificationResponse = await axios.get(`${API_URL}/api/notifications`, { headers });
      const notificationRows = notificationResponse.data.map((notification) => ({
        action: `Notification: ${notification.title}`,
        target: notification.type,
        recordId: null,
        timestamp: new Date(notification.createdAt),
        detail: notification.message,
      }));
      const rows = [...chainRows, ...requestRows, ...noteRows, ...documentRows, ...notificationRows];
      setAuditTrail(rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      toast.error(error.reason || error.message || "Unable to load history");
    }
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
        if (activeTab === "archive" && !meta.archived) return false;
        if (meta.archived && activeTab !== "archive") return false;
        if (categoryFilter !== "all" && (meta.category || "other") !== categoryFilter) return false;
        if (flagFilter === "important" && !meta.important) return false;
        if (flagFilter === "emergency" && !meta.emergency) return false;
        return `${record.id} ${record.cid} ${meta.filename || ""} ${meta.title || ""} ${meta.category || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [records, metadata, search, activeTab, categoryFilter, flagFilter]
  );

  const lastUpload = records.length
    ? formatDate(Math.max(...records.map((record) => Number(record.timestamp || 0))) * 1000, { hour: undefined, minute: undefined })
    : t("None");

  async function uploadRecord(event) {
    const file = event.target.files?.[0];
    if (!file || uploadInProgress) return;

    const toastId = toast.info(t("Encrypting record..."), { autoClose: 3000 });
    try {
      setUploadStatus({
        state: "working",
        title: "Encrypting record",
        detail: `${file.name} is being encrypted in your browser.`,
      });
      const key = generateRandomKey();
      const encryptedString = await encryptFile(await file.arrayBuffer(), key);
      const blob = new Blob([encryptedString], { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", blob, `${file.name}.encrypted.txt`);

      setUploadStatus({
        state: "working",
        title: "Uploading encrypted file",
        detail: "Sending the encrypted file to IPFS storage.",
      });
      toast.update(toastId, { render: t("Pinning encrypted file to IPFS..."), type: "info", isLoading: false, autoClose: 3000 });
      const response = await axios.post(`${API_URL}/api/records/upload`, formData, {
        headers: await createAuthHeaders(walletAddress),
      });

      setUploadStatus({
        state: "working",
        title: "Waiting for MetaMask confirmation",
        detail: "Confirm the blockchain transaction in MetaMask.",
      });
      toast.update(toastId, { render: t("Confirming record on-chain..."), type: "info", isLoading: false, autoClose: 3000 });
      const tx = await addRecord(response.data.cid);
      setUploadStatus({
        state: "working",
        title: "Transaction submitted",
        detail: "Waiting for Sepolia to confirm the record.",
        txHash: tx.hash,
      });
      const receipt = await tx.wait();
      const eventLog = await parseReceiptEvent(receipt, "RecordAdded");
      if (!eventLog) {
        throw new Error("Transaction confirmed, but the RecordAdded event was not found. Check that the frontend ABI matches the deployed contract.");
      }
      const recordId = Number(eventLog.args.recordId);
      const data = { filename: file.name, mimeType: file.type, aesKey: key, archived: false, ...uploadMeta };
      saveLocalMetadata(walletAddress, recordId, data);
      setUploadStatus({
        state: "working",
        title: "Saving record details",
        detail: `Record #${recordId} confirmed. Saving its metadata now.`,
        txHash: tx.hash,
      });
      await axios.post(
        `${API_URL}/api/records/metadata`,
        { recordId, ownerWallet: walletAddress, ...data },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: t("Record uploaded"), type: "success", isLoading: false, autoClose: 3000 });
      await loadRecords();
      setUploadStatus({
        state: "success",
        title: "Record uploaded",
        detail: `Record #${recordId} is encrypted, confirmed, and listed below.`,
        txHash: tx.hash,
      });
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.reason || error.message || "Upload failed";
      setUploadStatus({
        state: "error",
        title: "Upload stopped",
        detail: typeof message === "string" ? message : JSON.stringify(message),
      });
      toast.update(toastId, {
        render: typeof message === "string" ? message : t("Upload failed"),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      event.target.value = "";
    }
  }

  async function saveRecordMetadata(recordId, nextMeta) {
    const previous = metadata[recordId] || {};
    const next = { ...(metadata[recordId] || {}), ...nextMeta };
    saveLocalMetadata(walletAddress, recordId, next);
    setMetadata((current) => ({ ...current, [recordId]: { ...(current[recordId] || {}), ...nextMeta } }));
    try {
      await axios.post(
        `${API_URL}/api/records/metadata`,
        { recordId, ownerWallet: walletAddress, ...next },
        { headers: await createAuthHeaders(walletAddress) }
      );
    } catch (error) {
      saveLocalMetadata(walletAddress, recordId, previous);
      setMetadata((current) => ({ ...current, [recordId]: previous }));
      toast.error(error.response?.data?.message || error.message || "Unable to save record details");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      await axios.post(
        `${API_URL}/api/users/register`,
        { wallet: walletAddress, name: userProfile.name, email: userProfile.email, role: "patient", ...profile },
        { headers: await createAuthHeaders(walletAddress) }
      );
      await fetchProfile(walletAddress);
      toast.success(t("Medical profile saved"));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t("Unable to save profile"));
    }
  }

  function downloadCarePdf(careDocument) {
    const blob = createHealthTrustPdf({
      title: careDocument.title,
      subtitle: "Care document generated inside the HealthTrust patient vault.",
      meta: [
        { label: "Type", value: careDocument.documentType },
        { label: "Created", value: new Date(careDocument.createdAt).toLocaleString() },
        { label: "Doctor wallet", value: careDocument.doctorWallet },
        { label: "Patient wallet", value: careDocument.patientWallet },
      ],
      sections: [
        {
          heading: "Clinical Content",
          accent: "#22b8aa",
          rows: [careDocument.content || "Encrypted file is stored on IPFS."],
        },
        ...(careDocument.cid
          ? [
            {
              heading: "Storage Reference",
              accent: "#0a84ff",
              rows: [{ label: "IPFS CID", value: careDocument.cid }],
            },
          ]
          : []),
      ],
      footer: "HealthTrust care document - prototype, not a clinical certification",
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${careDocument.title.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportAuditPdf() {
    const rows = auditTrail.length ? auditTrail : [];
    const blob = createHealthTrustPdf({
      title: "Patient Audit Report",
      subtitle: "Tamper-resistant access and workflow timeline exported from HealthTrust.",
      meta: [
        { label: "Patient wallet", value: walletAddress },
        { label: "Generated", value: new Date().toLocaleString() },
        { label: "Events", value: String(rows.length) },
        { label: "Network", value: "Sepolia prototype" },
      ],
      sections: [
        {
          heading: "Audit Timeline",
          accent: "#0a84ff",
          rows: rows.map((row) => ({
            label: row.action,
            value: `${row.timestamp} | ${typeof row.recordId === "number" ? `Record: #${row.recordId} | ` : ""}Target: ${row.target}${row.detail ? ` | ${row.detail}` : ""}`,
          })),
        },
      ],
      footer: "HealthTrust audit report - blockchain events plus application workflow events",
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "healthtrust-audit-report.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function grantDoctorAccessForRequest(request) {
    const record = records.find((item) => item.id === Number(request.recordId));
    if (!record) throw new Error("Record was not found in your patient records.");
    const aesKey = metadata[record.id]?.aesKey;
    if (!aesKey) {
      throw new Error("AES key is missing in this browser. Use the record Manage screen to resend/share the key.");
    }
    const envelope = await buildDoctorKeyEnvelope(API_URL, walletAddress, request.requesterWallet, record, aesKey);
    const tx = await grantAccessToDoctor(record.id, request.requesterWallet);
    await tx.wait();
    await storeKeyEnvelope(API_URL, walletAddress, envelope);
  }

  async function updateRequest(request, status) {
    try {
      const isDoctorAccess = request.requestType === "doctor" || request.requestType === "emergency";
      if (status === "approved" && isDoctorAccess) {
        await grantDoctorAccessForRequest(request);
      }
      await axios.patch(
        `${API_URL}/api/access-requests/${request.id}`,
        { status },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success(status === "approved" && isDoctorAccess ? t("Access granted and key shared") : localizeText(`Request ${status}`));
      await loadRecords();
      if (activeTab === "audit") await loadAuditTrail();
    } catch (error) {
      toast.error(error.response?.data?.message || error.reason || error.message || t("Unable to update request"));
    }
  }

  function renderRecords() {
    const emptyTitle = activeTab === "archive" ? "No archived records" : "No records found";
    const emptyMessage =
      activeTab === "archive"
        ? "Records you archive will appear here."
        : search
          ? "No records match your search."
          : "Uploaded records will appear here.";
    return (
      <>
        <div className="toolbar">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search records or CID")} />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label={t("Filter category")}>
            <option value="all">{t("All categories")}</option>
            <option value="lab">{t("Lab")}</option>
            <option value="prescription">{t("Prescription")}</option>
            <option value="diagnosis">{t("Diagnosis")}</option>
            <option value="imaging">{t("Imaging")}</option>
            <option value="other">{t("Other")}</option>
          </select>
          <select value={flagFilter} onChange={(event) => setFlagFilter(event.target.value)} aria-label={t("Filter flags")}>
            <option value="all">{t("All flags")}</option>
            <option value="important">{t("Important")}</option>
            <option value="emergency">{t("Emergency")}</option>
          </select>
        </div>
        <section className="record-list">
          {filteredRecords.map((record) => {
            const meta = metadata[record.id] || {};
            return (
              <RecordCard
                key={record.id}
                record={record}
                filename={meta.title || meta.filename}
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
                      {t("Important")}
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={Boolean(meta.emergency)}
                        onChange={(event) => saveRecordMetadata(record.id, { emergency: event.target.checked })}
                      />
                      {t("Emergency")}
                    </label>
                  </>
                }
              />
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <strong>{t(emptyTitle)}</strong>
              <span>{t(emptyMessage)}</span>
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
          <p className="eyebrow">{t("Patient Workspace")}</p>
          <h1>{t("Records and Access")}</h1>
        </div>
        <div className="header-actions">
          <button className="icon-button secondary" onClick={loadRecords} aria-label={t("Refresh records")}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <section className="stat-grid">
        <StatCard icon={FileText} label={t("Records")} value={records.length} />
        <StatCard icon={ShieldCheck} label={t("Shared Keys")} value={keyRows.length} accent="green" />
        <StatCard icon={History} label={t("Audit Events")} value={auditTrail.length || t("Load tab")} accent="amber" />
        <StatCard icon={Clock3} label={t("Latest Upload")} value={lastUpload} />
      </section>

      <section className="panel upload-panel">
        <div>
          <h2>{t("Upload Details")}</h2>
          <p>{t("These details will be saved with the next record you upload.")}</p>
        </div>
        <div className="metadata-panel">
          <label>
            {t("Category")}
            <select value={uploadMeta.category} onChange={(event) => setUploadMeta({ ...uploadMeta, category: event.target.value })}>
              <option value="lab">{t("Lab")}</option>
              <option value="prescription">{t("Prescription")}</option>
              <option value="diagnosis">{t("Diagnosis")}</option>
              <option value="imaging">{t("Imaging")}</option>
              <option value="other">{t("Other")}</option>
            </select>
          </label>
          <label>
            {t("Provider")}
            <input value={uploadMeta.provider} onChange={(event) => setUploadMeta({ ...uploadMeta, provider: event.target.value })} />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={uploadMeta.emergency}
              onChange={(event) => setUploadMeta({ ...uploadMeta, emergency: event.target.checked })}
              disabled={uploadInProgress}
            />
            {t("Emergency record")}
          </label>
          <label className={`icon-button with-label upload-button ${uploadInProgress ? "is-disabled" : ""}`}>
            {uploadInProgress ? <LoaderCircle className="spin-icon" size={16} /> : <Upload size={16} />}
            {uploadInProgress ? t("Uploading...") : t("Upload Record")}
            <input type="file" accept="application/pdf,image/*" onChange={uploadRecord} disabled={uploadInProgress} hidden />
          </label>
        </div>
        {uploadStatus && (
          <div className={`upload-status ${uploadStatus.state}`}>
            <div className="upload-status-main">
              {uploadStatus.state === "working" && <LoaderCircle className="spin-icon" size={18} />}
              {uploadStatus.state === "success" && <Check size={18} />}
              {uploadStatus.state === "error" && <X size={18} />}
              <div>
                <strong>{localizeText(uploadStatus.title)}</strong>
                <span>{localizeText(uploadStatus.detail)}</span>
              </div>
            </div>
            {uploadStatus.txHash && (
              <a className="icon-link compact" href={`https://sepolia.etherscan.io/tx/${uploadStatus.txHash}`} target="_blank" rel="noreferrer">
                <ExternalLink size={15} />
                {t("View tx")}
              </a>
            )}
          </div>
        )}
      </section>

      <div className="tabs">
        {patientTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
              {Icon && <Icon size={16} />}
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {activeTab === "records" && renderRecords()}
      {activeTab === "archive" && renderRecords()}
      {activeTab === "consent" && (
        <section className="panel request-list">
          <h3><ShieldCheck size={18} />{t("Patient Consent Summary")}</h3>
          {records.map((record) => {
            const meta = metadata[record.id] || {};
            const recordKeys = keyRows.filter((key) => key.recordId === record.id);
            return (
              <article className="request-row" key={record.id}>
                <div>
                  <strong>{meta.title || meta.filename || localizeText(`Record #${record.id}`)}</strong>
                  <span>{localizeText(`Category: ${meta.category || "other"} ${meta.emergency ? "Emergency-visible" : ""}`)}</span>
                  <small>{localizeText(`${recordKeys.length} active encrypted key envelope(s)`)}</small>
                  {recordKeys.map((key) => (
                    <span key={key.id}>
                      {key.accessType === "institution" ? localizeText(`Institution #${key.accessTarget}`) : <bdi dir="ltr">{key.recipientWallet}</bdi>}
                      {" - "}{localizeText("key shared yes")}{" - "}{formatDate(key.updatedAt)}
                    </span>
                  ))}
                </div>
                <button className="icon-button secondary" onClick={() => setSelectedRecord(record)}>
                  <FileKey2 size={16} />
                  {t("Manage")}
                </button>
              </article>
            );
          })}
        </section>
      )}
      {activeTab === "requests" && (
        <section className="panel request-list">
          <h3><Inbox size={18} />{t("Access Requests")}</h3>
          {requests.map((request) => {
            const hasSharedKey = keyRows.some(
              (key) => key.recordId === request.recordId && key.recipientWallet?.toLowerCase() === request.requesterWallet?.toLowerCase()
            );
            const canCompleteGrant =
              (request.requestType === "doctor" || request.requestType === "emergency") &&
              (request.status === "pending" || (request.status === "approved" && !hasSharedKey));
            return (
              <article className={`request-row ${request.requestType === "emergency" ? "unread" : ""}`} key={request.id}>
                <div>
                  <strong>{localizeText(`${request.requestType === "emergency" ? "Emergency access request" : "Access request"} for record #${request.recordId}`)}</strong>
                  <span><bdi dir="ltr">{request.requesterWallet}</bdi></span>
                  <small>{localizeText(`Status: ${request.status} - key shared: ${hasSharedKey ? "yes" : "no"}`)}</small>
                  {request.reason && <p>{request.reason}</p>}
                </div>
                <div className="row-actions">
                  {canCompleteGrant && (
                    <button onClick={() => updateRequest(request, "approved")}>
                      <Check size={16} />
                      {request.status === "approved" ? t("Complete grant") : t("Approve")}
                    </button>
                  )}
                  {request.status === "pending" && (
                    <button className="secondary" onClick={() => updateRequest(request, "rejected")}>
                      <X size={16} />
                      {t("Reject")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {requests.length === 0 && (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <strong>{t("No Access Requests")}</strong>
              <span>{t("Doctor and emergency access requests will appear here.")}</span>
            </div>
          )}
        </section>
      )}
      {activeTab === "documents" && (
        <section className="panel request-list">
          <div className="panel-title-row"><h3><FilePlus2 size={18} />{t("Care Documents")}</h3></div>
          {documents.map((document) => (
            <article className="request-row" key={document.id}>
              <div>
                <strong>{document.title}</strong>
                <span>{localizeText(`${document.documentType} from`)} <bdi dir="ltr">{document.doctorWallet}</bdi></span>
                <small>{formatDate(document.createdAt)}</small>
                {document.content && <p>{document.content}</p>}
              </div>
              <button className="icon-button with-label" onClick={() => downloadCarePdf(document)}>
                <Download size={16} />
                {t("PDF")}
              </button>
            </article>
          ))}
          {documents.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <strong>{t("No Care Documents")}</strong>
              <span>{t("Documents sent by doctors will appear here.")}</span>
            </div>
          )}
        </section>
      )}
      {activeTab === "notes" && (
        <section className="panel request-list">
          <div className="panel-title-row"><h3><NotebookPen size={18} />{t("Doctor Notes")}</h3></div>
          {notes.map((note) => (
            <article className="request-row" key={note.id}>
              <div>
                <strong>{localizeText(`Record #${note.recordId}`)}</strong>
                <span>{localizeText(formatLabel(note.status))}</span>
                <small>{t("Doctor")}: <bdi dir="ltr">{note.doctorWallet}</bdi></small>
                {note.note && <p>{note.note}</p>}
              </div>
            </article>
          ))}
          {notes.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <strong>{t("No Doctor Notes")}</strong>
              <span>{t("Notes added by doctors will appear here.")}</span>
            </div>
          )}
        </section>
      )}
      {activeTab === "profile" && (
        <section className="panel narrow">
          <form className="form-grid" onSubmit={saveProfile}>
            {Object.keys(profile).map((field) => (
              <label key={field}>
                {t(field)}
                <input value={profile[field] || ""} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} />
              </label>
            ))}
            <button>{t("Save profile")}</button>
          </form>
        </section>
      )}
      {activeTab === "notifications" && <NotificationsPanel />}
      {activeTab === "audit" && (
        <section className="panel">
          <div className="panel-title-row">
            <h2><History size={18} />{t("Audit Timeline")}</h2>
            <button className="icon-button with-label secondary" onClick={exportAuditPdf} disabled={auditTrail.length === 0}>
              <Download size={16} />
              {t("Export PDF")}
            </button>
          </div>
          {auditTrail.length > 0 ? (
            <div className="timeline">
              {auditTrail.map((row, index) => (
                <article className="timeline-item" key={`${row.action}-${row.recordId}-${index}`}>
                  <strong>{localizeText(row.action)}</strong>
                  <span>{typeof row.recordId === "number" ? `${localizeText(`Record #${row.recordId}`)} - ` : ""}{localizeText(row.target)}</span>
                  {row.detail && <small>{localizeText(row.detail)}</small>}
                  <small>{formatDate(row.timestamp)}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <History size={28} />
              <strong>{t("No history")}</strong>
              <span>{t("Access grants, revokes, and patient-created records will appear here.")}</span>
            </div>
          )}
        </section>
      )}
      {activeTab === "security" && <SecurityModel />}

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
