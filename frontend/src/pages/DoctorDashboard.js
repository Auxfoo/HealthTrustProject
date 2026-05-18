import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Download, FilePlus2, FileSearch, RefreshCw, Search, Stethoscope, UsersRound } from "lucide-react";
import { ethers } from "ethers";
import PredictionForm from "../components/PredictionForm";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import RiskMeter from "../components/RiskMeter";
import StatCard from "../components/StatCard";
import { useWallet } from "../context/WalletContext";
import { decryptFile } from "../utils/encryption";
import { getAllRecords, hasAccess } from "../utils/contractHelper";
import { createAuthHeaders } from "../utils/auth";
import { decryptRecordKey } from "../utils/keySharing";

const emptyPredictionValues = {
  gender: "Female",
  age: "",
  hypertension: "0",
  heart_disease: "0",
  smoking_history: "never",
  bmi: "",
  HbA1c_level: "",
  blood_glucose_level: "",
};

const predictionFields = [
  { key: "gender", labels: ["Gender"] },
  { key: "age", labels: ["Age"] },
  { key: "hypertension", labels: ["Hypertension"] },
  { key: "heart_disease", labels: ["Heart disease", "Heart Disease"] },
  { key: "smoking_history", labels: ["Smoking history", "Smoking History"] },
  { key: "bmi", labels: ["BMI"] },
  { key: "HbA1c_level", labels: ["HbA1c level", "HbA1c"] },
  { key: "blood_glucose_level", labels: ["Blood glucose level", "Blood Glucose"] },
];

function cleanPdfTextValue(value) {
  return value
    .replace(/\\([()\\])/g, "$1")
    .replace(/\)?\s*(Tj|TJ|ET|Td|Tm).*$/i, "")
    .replace(/[\])>]+$/g, "")
    .trim();
}

function normalizeExtractedValue(field, value) {
  const cleanedValue = cleanPdfTextValue(value);
  if (field === "hypertension" || field === "heart_disease") {
    return ["yes", "true", "1"].includes(cleanedValue.toLowerCase()) ? "1" : "0";
  }
  if (field === "gender") {
    const normalized = cleanedValue.toLowerCase();
    if (normalized === "male") return "Male";
    if (normalized === "other") return "Other";
    return "Female";
  }
  if (field === "smoking_history") {
    const normalized = cleanedValue.toLowerCase();
    const options = ["never", "current", "former", "ever", "not current"];
    return options.includes(normalized) ? normalized : "No Info";
  }
  return cleanedValue.match(/-?\d+(?:\.\d+)?/)?.[0] || cleanedValue;
}

function extractReadablePdfText(text) {
  const pdfStrings = [];
  const literalStringPattern = /\(((?:\\.|[^\\()])*)\)\s*(?:Tj|'|"|TJ)?/g;
  let match = literalStringPattern.exec(text);
  while (match) {
    pdfStrings.push(cleanPdfTextValue(match[1]));
    match = literalStringPattern.exec(text);
  }
  return `${pdfStrings.join("\n")}\n${text}`;
}

function extractPredictionValues(bytes) {
  const rawText = new TextDecoder("latin1").decode(bytes);
  const text = extractReadablePdfText(rawText);
  const extracted = {};
  predictionFields.forEach(({ key, labels }) => {
    for (const label of labels) {
      const pattern = new RegExp(`${label}\\s*[:=]\\s*([^\\n\\r,;]+)`, "i");
      const match = text.match(pattern);
      if (match) {
        extracted[key] = normalizeExtractedValue(key, match[1].trim());
        break;
      }
    }
  });
  return predictionFields.every(({ key }) => extracted[key]) ? extracted : null;
}

export default function DoctorDashboard() {
  const { walletAddress, API_URL } = useWallet();
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [predictionValues, setPredictionValues] = useState(emptyPredictionValues);
  const [predictionPatientWallet, setPredictionPatientWallet] = useState("");
  const [joinForm, setJoinForm] = useState({ institutionId: "", message: "" });
  const [noteForm, setNoteForm] = useState({ recordId: "", patientWallet: "", status: "reviewed", note: "" });
  const [docForm, setDocForm] = useState({
    sourceRecordId: "",
    patientWallet: "",
    documentType: "prescription",
    title: "",
    content: "",
  });

  async function loadAccessibleRecords() {
    const headers = await createAuthHeaders(walletAddress);
    const allRecords = await getAllRecords();
    const checks = await Promise.all(allRecords.map((record) => hasAccess(record.id, walletAddress)));
    const chainAccessible = allRecords.filter((_, index) => checks[index]);
    const keyChecks = await Promise.all(
      chainAccessible.map((record) =>
        axios
          .get(`${API_URL}/api/record-keys/${record.id}`, { headers })
          .then(() => true)
          .catch(() => false)
      )
    );
    const accessible = chainAccessible.filter((_, index) => keyChecks[index]);
    setRecords(accessible);

    const ids = accessible.map((record) => record.id).join(",");
    if (ids) {
      const meta = await axios.get(`${API_URL}/api/records/metadata/bulk?ids=${ids}`);
      setMetadata(Object.fromEntries(meta.data.map((row) => [row.recordId, row])));
    } else {
      setMetadata({});
    }

    const [institutionsResponse, membershipResponse, noteResponse, docResponse, historyResponse] = await Promise.all([
      axios.get(`${API_URL}/api/institutions`),
      axios.get(`${API_URL}/api/membership-requests`, { headers }),
      axios.get(`${API_URL}/api/notes`, { headers }),
      axios.get(`${API_URL}/api/doctor-documents`, { headers }),
      axios.get(`${API_URL}/api/predict/history`, { headers }),
    ]);
    setInstitutions(institutionsResponse.data);
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
  const hasAccessibleRecords = records.length > 0;

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
        setPredictionPatientWallet(record.uploadedBy || "");
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

  async function requestMembership(event) {
    event.preventDefault();
    if (!joinForm.institutionId) {
      toast.error("Choose an institution first");
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/membership-requests`,
        { institutionId: Number(joinForm.institutionId), message: joinForm.message },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success("Membership request sent");
      setJoinForm((current) => ({ ...current, message: "" }));
      await loadAccessibleRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to send membership request");
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    const selectedRecord = records.find((record) => String(record.id) === String(noteForm.recordId));
    if (!selectedRecord) {
      toast.error("Choose an accessible record");
      return;
    }
    if (!ethers.isAddress(noteForm.patientWallet)) {
      toast.error("Enter a valid patient wallet address");
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/notes`,
        { ...noteForm, recordId: Number(noteForm.recordId) },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success("Note saved");
      setNoteForm({ recordId: "", patientWallet: "", status: "reviewed", note: "" });
      await loadAccessibleRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to save note");
    }
  }

  async function sendCareDocument(event) {
    event.preventDefault();
    const selectedRecord = records.find((record) => String(record.id) === String(docForm.sourceRecordId));
    if (!selectedRecord) {
      toast.error("Choose an accessible record");
      return;
    }
    if (!ethers.isAddress(docForm.patientWallet)) {
      toast.error("Enter a valid patient wallet address");
      return;
    }
    const toastId = toast.loading("Creating care document...");
    try {
      await axios.post(
        `${API_URL}/api/doctor-documents`,
        { ...docForm, sourceRecordId: undefined, recordId: Number(docForm.sourceRecordId), cid: "", encrypted: false },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: "Care document sent", type: "success", isLoading: false, autoClose: 3000 });
      setDocForm({ sourceRecordId: "", patientWallet: "", documentType: "prescription", title: "", content: "" });
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
        {["records", "notes", "documents", "membership", "prediction", "history", "notifications"].map((tab) => (
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

      {activeTab === "notes" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={saveNote}>
            <label>
              Record
              <select
                value={noteForm.recordId}
                onChange={(event) => {
                  const selected = records.find((record) => String(record.id) === event.target.value);
                  setNoteForm({
                    ...noteForm,
                    recordId: event.target.value,
                    patientWallet: selected?.uploadedBy || "",
                  });
                }}
                required
                disabled={!hasAccessibleRecords}
              >
                <option value="">Choose a record</option>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    Record #{record.id} - {metadata[record.id]?.title || metadata[record.id]?.filename || record.uploadedBy}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Patient wallet
              <input value={noteForm.patientWallet} readOnly required />
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
            <button disabled={!hasAccessibleRecords}>Save note</button>
          </form>
          <div className="request-list">
            {notes.map((note) => (
              <article className="request-row" key={note.id}>
                <strong>Record #{note.recordId}</strong>
                <span>{note.status}</span>
                <p>{note.note}</p>
              </article>
            ))}
            {notes.length === 0 && (
              <div className="empty-state">
                <Stethoscope size={28} />
                <strong>No notes</strong>
                <span>Notes you add for accessible records will appear here.</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "documents" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={sendCareDocument}>
            <label>
              Record
              <select
                value={docForm.sourceRecordId}
                onChange={(event) => {
                  const selected = records.find((record) => String(record.id) === event.target.value);
                  setDocForm({
                    ...docForm,
                    sourceRecordId: event.target.value,
                    patientWallet: selected?.uploadedBy || "",
                  });
                }}
                required
                disabled={!hasAccessibleRecords}
              >
                <option value="">Choose a record</option>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    Record #{record.id} - {metadata[record.id]?.title || metadata[record.id]?.filename || record.uploadedBy}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Patient wallet
              <input value={docForm.patientWallet} readOnly required />
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
            <button disabled={!hasAccessibleRecords}>Send to patient</button>
          </form>
          <div className="request-list">
            {documents.map((document) => (
              <article className="request-row" key={document.id}>
                <strong>{document.title}</strong>
                <span>{document.patientWallet}</span>
                <small>{document.documentType}</small>
              </article>
            ))}
            {documents.length === 0 && (
              <div className="empty-state">
                <FilePlus2 size={28} />
                <strong>No documents</strong>
                <span>Care documents you send to patients will appear here.</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "membership" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={requestMembership}>
            <label>
              Institution
              <select
                value={joinForm.institutionId}
                onChange={(event) => setJoinForm({ ...joinForm, institutionId: event.target.value })}
                disabled={institutions.length === 0}
              >
                {institutions.length === 0 && <option value="">No institutions available</option>}
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
            <button disabled={!joinForm.institutionId}>Request membership</button>
          </form>
          <div className="request-list">
            {membershipRequests.map((request) => (
              <article className="request-row" key={request.id}>
                <strong>Institution #{request.institutionId}</strong>
                <span>Status: {request.status}</span>
                <p>{request.message}</p>
              </article>
            ))}
            {membershipRequests.length === 0 && (
              <div className="empty-state">
                <UsersRound size={28} />
                <strong>No membership history</strong>
                <span>Your institution join requests will appear here.</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "prediction" && (
        <section className="panel">
          <PredictionForm
            values={predictionValues}
            onValuesChange={setPredictionValues}
            patientWallet={predictionPatientWallet}
            onPatientWalletChange={setPredictionPatientWallet}
            onResult={setResult}
          />
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
          {predictionHistory.length === 0 && (
            <div className="empty-state">
              <Stethoscope size={28} />
              <strong>No history</strong>
              <span>Diabetes prediction results will appear here after you submit the form.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "notifications" && <NotificationsPanel />}
    </main>
  );
}
