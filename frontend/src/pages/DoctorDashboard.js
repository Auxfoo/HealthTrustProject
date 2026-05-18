import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Download, FilePlus2, FileSearch, RefreshCw, Search, Send, Stethoscope, UsersRound } from "lucide-react";
import PredictionForm from "../components/PredictionForm";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import RiskMeter from "../components/RiskMeter";
import StatCard from "../components/StatCard";
import { useWallet } from "../context/WalletContext";
import { decryptFile, encryptFile, generateRandomKey } from "../utils/encryption";
import { addRecordForPatient, getAllRecords, parseReceiptEvent, hasAccess } from "../utils/contractHelper";
import { createAuthHeaders } from "../utils/auth";
import { decryptRecordKey } from "../utils/keySharing";
import { buildRecipientKeyEnvelope, storeKeyEnvelope } from "../utils/recordSharing";

const emptyPredictionValues = {
  Pregnancies: "",
  Glucose: "",
  BloodPressure: "",
  SkinThickness: "",
  Insulin: "",
  BMI: "",
  DiabetesPedigreeFunction: "",
  Age: "",
};

const predictionFields = Object.keys(emptyPredictionValues);

function extractPredictionValues(bytes) {
  const text = new TextDecoder("latin1").decode(bytes);
  const extracted = {};
  predictionFields.forEach((field) => {
    const spacedField = field.replace(/([a-z])([A-Z])/g, "$1\\s*$2");
    const pattern = new RegExp(`${spacedField}\\s*[:=]\\s*(-?\\d+(?:\\.\\d+)?)`, "i");
    const match = text.match(pattern);
    if (match) extracted[field] = match[1];
  });
  return predictionFields.every((field) => extracted[field]) ? extracted : null;
}

export default function DoctorDashboard() {
  const { walletAddress, API_URL } = useWallet();
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [predictionValues, setPredictionValues] = useState(emptyPredictionValues);
  const [accessForm, setAccessForm] = useState({ patientWallet: "", recordId: "", reason: "" });
  const [joinForm, setJoinForm] = useState({ institutionId: "", message: "" });
  const [noteForm, setNoteForm] = useState({ recordId: "", patientWallet: "", status: "reviewed", note: "" });
  const [docForm, setDocForm] = useState({
    patientWallet: "",
    documentType: "prescription",
    title: "",
    content: "",
    file: null,
  });

  async function loadAccessibleRecords() {
    const headers = await createAuthHeaders(walletAddress);
    const allRecords = await getAllRecords();
    const checks = await Promise.all(allRecords.map((record) => hasAccess(record.id, walletAddress)));
    const accessible = allRecords.filter((_, index) => checks[index]);
    setRecords(accessible);

    const ids = accessible.map((record) => record.id).join(",");
    if (ids) {
      const meta = await axios.get(`${API_URL}/api/records/metadata/bulk?ids=${ids}`);
      setMetadata(Object.fromEntries(meta.data.map((row) => [row.recordId, row])));
    }

    const [institutionsResponse, accessResponse, membershipResponse, noteResponse, docResponse, historyResponse] = await Promise.all([
      axios.get(`${API_URL}/api/institutions`),
      axios.get(`${API_URL}/api/access-requests`, { headers }),
      axios.get(`${API_URL}/api/membership-requests`, { headers }),
      axios.get(`${API_URL}/api/notes`, { headers }),
      axios.get(`${API_URL}/api/doctor-documents`, { headers }),
      axios.get(`${API_URL}/api/predict/history`, { headers }),
    ]);
    setInstitutions(institutionsResponse.data);
    setRequests(accessResponse.data);
    setMembershipRequests(membershipResponse.data);
    setNotes(noteResponse.data);
    setDocuments(docResponse.data);
    setPredictionHistory(historyResponse.data);
    if (institutionsResponse.data[0] && !joinForm.institutionId) {
      setJoinForm((current) => ({ ...current, institutionId: String(institutionsResponse.data[0].institutionId) }));
    }
  }

  useEffect(() => {
    if (walletAddress) loadAccessibleRecords();
  }, [walletAddress]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const meta = metadata[record.id] || {};
        return `${record.id} ${record.cid} ${record.uploadedBy} ${meta.title || ""} ${meta.filename || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [records, metadata, search]
  );
  const patientCount = new Set(records.map((record) => record.uploadedBy.toLowerCase())).size;
  const riskLabel = result ? `${Math.round(result.probability * 100)}%` : "Not run";

  async function downloadRecord(record) {
    const toastId = toast.loading("Fetching encrypted record...");
    try {
      const keyResponse = await axios.get(`${API_URL}/api/record-keys/${record.id}`, {
        headers: await createAuthHeaders(walletAddress),
      });
      const key = await decryptRecordKey(keyResponse.data.encryptedKey, walletAddress);
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${record.cid}`);
      const encryptedString = await response.text();
      const bytes = decryptFile(encryptedString, key);
      const signature = Array.from(bytes.slice(0, 8))
        .map((byte) => String.fromCharCode(byte))
        .join("");
      const isPdf = signature.startsWith("%PDF");
      const isPng = bytes[0] === 0x89 && signature.includes("PNG");
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      if (!isPdf && !isPng && !isJpeg) throw new Error("Wrong AES key, or unsupported file type.");

      const extractedValues = isPdf ? extractPredictionValues(bytes) : null;
      if (extractedValues) {
        setPredictionValues(extractedValues);
        setActiveTab("prediction");
        toast.success("Prediction form auto-filled from PDF");
      }

      const mimeType = isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg";
      const extension = isPdf ? "pdf" : isPng ? "png" : "jpg";
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `healthtrust-record-${record.id}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.update(toastId, { render: "Record decrypted", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, { render: error.response?.data?.message || error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  async function requestAccess(event) {
    event.preventDefault();
    await axios.post(
      `${API_URL}/api/access-requests`,
      { ...accessForm, recordId: Number(accessForm.recordId) },
      { headers: await createAuthHeaders(walletAddress) }
    );
    toast.success("Access request sent");
    setAccessForm({ patientWallet: "", recordId: "", reason: "" });
    await loadAccessibleRecords();
  }

  async function requestMembership(event) {
    event.preventDefault();
    await axios.post(
      `${API_URL}/api/membership-requests`,
      { institutionId: Number(joinForm.institutionId), message: joinForm.message },
      { headers: await createAuthHeaders(walletAddress) }
    );
    toast.success("Membership request sent");
    setJoinForm((current) => ({ ...current, message: "" }));
    await loadAccessibleRecords();
  }

  async function saveNote(event) {
    event.preventDefault();
    await axios.post(
      `${API_URL}/api/notes`,
      { ...noteForm, recordId: Number(noteForm.recordId) },
      { headers: await createAuthHeaders(walletAddress) }
    );
    toast.success("Note saved");
    setNoteForm({ recordId: "", patientWallet: "", status: "reviewed", note: "" });
    await loadAccessibleRecords();
  }

  async function sendCareDocument(event) {
    event.preventDefault();
    const toastId = toast.loading("Creating care document...");
    try {
      let recordId = null;
      let cid = "";
      let encrypted = false;
      if (docForm.file) {
        const key = generateRandomKey();
        const encryptedString = await encryptFile(await docForm.file.arrayBuffer(), key);
        const blob = new Blob([encryptedString], { type: "text/plain" });
        const formData = new FormData();
        formData.append("file", blob, `${docForm.file.name}.encrypted.txt`);
        const upload = await axios.post(`${API_URL}/api/records/upload`, formData, {
          headers: await createAuthHeaders(walletAddress),
        });
        cid = upload.data.cid;
        const tx = await addRecordForPatient(docForm.patientWallet, cid);
        const receipt = await tx.wait();
        const eventLog = await parseReceiptEvent(receipt, "RecordAdded");
        recordId = Number(eventLog.args.recordId);
        const envelope = await buildRecipientKeyEnvelope(API_URL, { id: recordId }, key, docForm.patientWallet);
        await storeKeyEnvelope(API_URL, walletAddress, envelope);
        await axios.post(
          `${API_URL}/api/records/metadata`,
          {
            recordId,
            ownerWallet: docForm.patientWallet,
            filename: docForm.file.name,
            mimeType: docForm.file.type,
            title: docForm.title,
            category: docForm.documentType,
            provider: walletAddress,
          },
          { headers: await createAuthHeaders(walletAddress) }
        );
        encrypted = true;
      }

      await axios.post(
        `${API_URL}/api/doctor-documents`,
        { ...docForm, file: undefined, recordId, cid, encrypted },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: "Care document sent", type: "success", isLoading: false, autoClose: 3000 });
      setDocForm({ patientWallet: "", documentType: "prescription", title: "", content: "", file: null });
      await loadAccessibleRecords();
    } catch (error) {
      toast.update(toastId, { render: error.response?.data?.message || error.reason || error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Doctor workspace</p>
          <h1>Care review</h1>
        </div>
        <button className="icon-button secondary" onClick={loadAccessibleRecords} aria-label="Refresh accessible records">
          <RefreshCw size={16} />
        </button>
      </div>

      <section className="stat-grid">
        <StatCard icon={FileSearch} label="Accessible records" value={records.length} />
        <StatCard icon={UsersRound} label="Patients" value={patientCount} accent="green" />
        <StatCard icon={Stethoscope} label="Latest risk" value={riskLabel} accent="amber" />
        <StatCard icon={FilePlus2} label="Care docs" value={documents.length} />
      </section>

      <div className="tabs">
        {["records", "requests", "notes", "documents", "membership", "prediction", "history", "notifications"].map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "records" && (
        <>
          <div className="toolbar">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records or patient" />
          </div>
          <section className="record-list">
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                filename={metadata[record.id]?.title || metadata[record.id]?.filename}
                actions={
                  <button className="icon-button with-label" onClick={() => downloadRecord(record)}>
                    <Download size={16} />
                    View
                  </button>
                }
              />
            ))}
            {filteredRecords.length === 0 && (
              <div className="empty-state">
                <FileSearch size={28} />
                <strong>No accessible records</strong>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "requests" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={requestAccess}>
            <label>
              Patient wallet
              <input value={accessForm.patientWallet} onChange={(event) => setAccessForm({ ...accessForm, patientWallet: event.target.value })} required />
            </label>
            <label>
              Record ID
              <input type="number" value={accessForm.recordId} onChange={(event) => setAccessForm({ ...accessForm, recordId: event.target.value })} required />
            </label>
            <label>
              Reason
              <textarea value={accessForm.reason} onChange={(event) => setAccessForm({ ...accessForm, reason: event.target.value })} />
            </label>
            <button>
              <Send size={16} />
              Request Access
            </button>
          </form>
          <div className="request-list">
            {requests.map((request) => (
              <article className="request-row" key={request.id}>
                <strong>Record #{request.recordId}</strong>
                <span>Status: {request.status}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "notes" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={saveNote}>
            <label>
              Record ID
              <input type="number" value={noteForm.recordId} onChange={(event) => setNoteForm({ ...noteForm, recordId: event.target.value })} required />
            </label>
            <label>
              Patient wallet
              <input value={noteForm.patientWallet} onChange={(event) => setNoteForm({ ...noteForm, patientWallet: event.target.value })} required />
            </label>
            <label>
              Review status
              <select value={noteForm.status} onChange={(event) => setNoteForm({ ...noteForm, status: event.target.value })}>
                <option value="reviewed">Reviewed</option>
                <option value="follow_up">Follow-up needed</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label>
              Note
              <textarea value={noteForm.note} onChange={(event) => setNoteForm({ ...noteForm, note: event.target.value })} />
            </label>
            <button>Save note</button>
          </form>
          <div className="request-list">
            {notes.map((note) => (
              <article className="request-row" key={note.id}>
                <strong>Record #{note.recordId}</strong>
                <span>{note.status}</span>
                <p>{note.note}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "documents" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={sendCareDocument}>
            <label>
              Patient wallet
              <input value={docForm.patientWallet} onChange={(event) => setDocForm({ ...docForm, patientWallet: event.target.value })} required />
            </label>
            <label>
              Type
              <select value={docForm.documentType} onChange={(event) => setDocForm({ ...docForm, documentType: event.target.value })}>
                <option value="prescription">Prescription</option>
                <option value="diagnosis">Diagnosis note</option>
                <option value="lab_request">Lab request</option>
                <option value="referral">Referral</option>
                <option value="follow_up">Follow-up summary</option>
              </select>
            </label>
            <label>
              Title
              <input value={docForm.title} onChange={(event) => setDocForm({ ...docForm, title: event.target.value })} required />
            </label>
            <label>
              Content
              <textarea value={docForm.content} onChange={(event) => setDocForm({ ...docForm, content: event.target.value })} />
            </label>
            <label>
              Optional file
              <input type="file" accept="application/pdf,image/*" onChange={(event) => setDocForm({ ...docForm, file: event.target.files?.[0] || null })} />
            </label>
            <button>Send to patient</button>
          </form>
          <div className="request-list">
            {documents.map((document) => (
              <article className="request-row" key={document.id}>
                <strong>{document.title}</strong>
                <span>{document.patientWallet}</span>
                <small>{document.documentType}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "membership" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={requestMembership}>
            <label>
              Institution
              <select value={joinForm.institutionId} onChange={(event) => setJoinForm({ ...joinForm, institutionId: event.target.value })}>
                {institutions.map((institution) => (
                  <option key={institution.institutionId} value={institution.institutionId}>
                    {institution.name} ({institution.institutionType})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message
              <textarea value={joinForm.message} onChange={(event) => setJoinForm({ ...joinForm, message: event.target.value })} />
            </label>
            <button>Request membership</button>
          </form>
          <div className="request-list">
            {membershipRequests.map((request) => (
              <article className="request-row" key={request.id}>
                <strong>Institution #{request.institutionId}</strong>
                <span>Status: {request.status}</span>
                <p>{request.message}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "prediction" && (
        <section className="panel">
          <PredictionForm values={predictionValues} onValuesChange={setPredictionValues} onResult={setResult} />
          {result && (
            <div className="result-card">
              <h2>{result.prediction === 1 ? "Diabetic risk indicated" : "No diabetic risk indicated"}</h2>
              <RiskMeter probability={result.probability} />
              <p>This is not a medical diagnosis.</p>
            </div>
          )}
        </section>
      )}

      {activeTab === "history" && (
        <section className="panel request-list">
          {predictionHistory.map((row) => (
            <article className="request-row" key={row.id}>
              <strong>{Math.round(row.probability * 100)}% risk</strong>
              <span>{row.patientWallet || "No patient linked"}</span>
              <small>{new Date(row.createdAt).toLocaleString()}</small>
            </article>
          ))}
        </section>
      )}

      {activeTab === "notifications" && <NotificationsPanel />}
    </main>
  );
}
