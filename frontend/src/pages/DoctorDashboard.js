import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Download,
  FilePlus2,
  FileSearch,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ethers } from "ethers";
import PredictionForm from "../components/PredictionForm";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import RiskMeter from "../components/RiskMeter";
import SecurityModel from "../components/SecurityModel";
import StatCard from "../components/StatCard";
import { useWallet } from "../context/WalletContext";
import { decryptFile } from "../utils/encryption";
import { getAllRecords, getBrowserProvider, getContract, hasAccess } from "../utils/contractHelper";
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

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DoctorDashboard() {
  const { walletAddress, API_URL, userProfile } = useWallet();
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [emergencyRecords, setEmergencyRecords] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [chainAuditRows, setChainAuditRows] = useState([]);
  const [patientProfiles, setPatientProfiles] = useState({});
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [predictionValues, setPredictionValues] = useState(emptyPredictionValues);
  const [predictionPatientWallet, setPredictionPatientWallet] = useState("");
  const [joinForm, setJoinForm] = useState({ institutionId: "", message: "" });
  const [emergencyForm, setEmergencyForm] = useState({ patientWallet: "", recordId: "", reason: "" });
  const [noteForm, setNoteForm] = useState({ recordId: "", patientWallet: "", status: "reviewed", note: "" });
  const [docForm, setDocForm] = useState({
    sourceRecordId: "",
    patientWallet: "",
    documentType: "prescription",
    title: "",
    content: "",
  });

  async function loadDoctorChainAuditRows() {
    const provider = await getBrowserProvider();
    const contract = getContract(provider);
    const filters = [
      contract.filters.AccessGrantedToDoctor(null, walletAddress),
      contract.filters.AccessRevokedFromDoctor(null, walletAddress),
      contract.filters.RecordAddedForPatient(null, walletAddress),
    ].filter(Boolean);
    const logs = (await Promise.all(filters.map((filter) => contract.queryFilter(filter, 0, "latest")))).flat();
    const rows = await Promise.all(
      logs.map(async (log) => {
        const block = await provider.getBlock(log.blockNumber);
        return {
          action: log.fragment.name,
          target: log.args.patient || log.args.createdBy || "-",
          detail: log.args.recordId ? `Record #${Number(log.args.recordId)}` : "",
          timestamp: new Date(Number(block.timestamp) * 1000),
        };
      })
    );
    setChainAuditRows(rows);
  }

  async function loadAccessibleRecords() {
    const headers = await createAuthHeaders(walletAddress);
    const allRecords = await getAllRecords();
    const allIds = allRecords.map((record) => record.id).join(",");
    if (allIds) {
      const [allMeta, accessRequestResponse] = await Promise.all([
        axios.get(`${API_URL}/api/records/metadata/bulk?ids=${allIds}`),
        axios.get(`${API_URL}/api/access-requests`, { headers }),
      ]);
      const allMetadataById = Object.fromEntries(allMeta.data.map((row) => [row.recordId, row]));
      const accessChecks = await Promise.all(allRecords.map((record) => hasAccess(record.id, walletAddress)));
      const blockedEmergencyRecordIds = new Set(
        accessRequestResponse.data
          .filter((request) => ["pending", "approved"].includes(request.status))
          .map((request) => Number(request.recordId))
      );
      setEmergencyRecords(
        allRecords
          .filter((record, index) => allMetadataById[record.id]?.emergency && !accessChecks[index] && !blockedEmergencyRecordIds.has(record.id))
          .map((record) => ({ ...record, metadata: allMetadataById[record.id] }))
      );
    } else {
      setEmergencyRecords([]);
    }
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

    const [institutionsResponse, membershipResponse, accessRequestResponse, noteResponse, docResponse, historyResponse] = await Promise.all([
      axios.get(`${API_URL}/api/institutions`),
      axios.get(`${API_URL}/api/membership-requests`, { headers }),
      axios.get(`${API_URL}/api/access-requests`, { headers }),
      axios.get(`${API_URL}/api/notes`, { headers }),
      axios.get(`${API_URL}/api/doctor-documents`, { headers }),
      axios.get(`${API_URL}/api/predict/history`, { headers }),
    ]);
    setInstitutions(institutionsResponse.data);
    setMembershipRequests(membershipResponse.data);
    setAccessRequests(accessRequestResponse.data);
    setNotes(noteResponse.data);
    setDocuments(docResponse.data);
    setPredictionHistory(historyResponse.data);
    const patientWallets = [...new Set(accessible.map((record) => record.uploadedBy?.toLowerCase()).filter(Boolean))];
    const profileRows = await Promise.all(
      patientWallets.map((wallet) =>
        axios
          .get(`${API_URL}/api/users/${wallet}`)
          .then((profileResponse) => [wallet, profileResponse.data])
          .catch(() => [wallet, null])
      )
    );
    setPatientProfiles(Object.fromEntries(profileRows));
    await loadDoctorChainAuditRows();
  }

  useEffect(() => {
    if (walletAddress) loadAccessibleRecords();
  }, [walletAddress]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const meta = metadata[record.id] || {};
        if (categoryFilter !== "all" && (meta.category || "other") !== categoryFilter) return false;
        if (flagFilter === "important" && !meta.important) return false;
        if (flagFilter === "emergency" && !meta.emergency) return false;
        return `${record.id} ${record.cid} ${record.uploadedBy} ${meta.title || ""} ${meta.filename || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [records, metadata, search, categoryFilter, flagFilter]
  );
  const patientGroups = useMemo(() => {
    const groups = {};
    records.forEach((record) => {
      const wallet = record.uploadedBy?.toLowerCase();
      if (!wallet) return;
      if (!groups[wallet]) groups[wallet] = [];
      groups[wallet].push(record);
    });
    return groups;
  }, [records]);
  const riskFactors = useMemo(() => {
    if (!result) return [];
    const factors = [];
    const glucose = Number(predictionValues.blood_glucose_level);
    const hba1c = Number(predictionValues.HbA1c_level);
    const bmi = Number(predictionValues.bmi);
    const age = Number(predictionValues.age);
    if (Number.isFinite(hba1c) && hba1c >= 6.5) factors.push("HbA1c is in a high range.");
    if (Number.isFinite(glucose) && glucose >= 140) factors.push("Blood glucose is elevated.");
    if (Number.isFinite(bmi) && bmi >= 30) factors.push("BMI is in an obesity range.");
    if (Number.isFinite(age) && age >= 55) factors.push("Age increases diabetes risk in the model.");
    if (predictionValues.hypertension === "1") factors.push("Hypertension is present.");
    if (predictionValues.heart_disease === "1") factors.push("Heart disease is present.");
    if (!factors.length) factors.push("No single high-risk input stands out; the result comes from the combined model features.");
    return factors;
  }, [result, predictionValues]);
  const auditRows = useMemo(() => {
    const membershipRows = membershipRequests.map((request) => ({
      action: `Membership ${request.status}`,
      target: `Institution #${request.institutionId}`,
      detail: request.message || "Institution membership request",
      timestamp: new Date(request.updatedAt || request.createdAt),
    }));
    const accessRows = accessRequests.map((request) => ({
      action: `${request.requestType === "emergency" ? "Emergency access" : "Access"} ${request.status}`,
      target: request.patientWallet,
      detail: `Record #${request.recordId}${request.reason ? ` - ${request.reason}` : ""}`,
      timestamp: new Date(request.updatedAt || request.createdAt),
    }));
    const noteRows = notes.map((note) => ({
      action: "Doctor note saved",
      target: note.patientWallet,
      detail: `Record #${note.recordId} - ${note.status}`,
      timestamp: new Date(note.updatedAt || note.createdAt),
    }));
    const documentRows = documents.map((document) => ({
      action: "Care document sent",
      target: document.patientWallet,
      detail: `${document.documentType}: ${document.title}`,
      timestamp: new Date(document.createdAt),
    }));
    const predictionRows = predictionHistory.map((row) => ({
      action: "Diabetes prediction run",
      target: row.patientWallet || "No patient linked",
      detail: `${Math.round(row.probability * 100)}% risk`,
      timestamp: new Date(row.createdAt),
    }));
    return [...chainAuditRows, ...membershipRows, ...accessRows, ...noteRows, ...documentRows, ...predictionRows].sort((a, b) => b.timestamp - a.timestamp);
  }, [chainAuditRows, membershipRequests, accessRequests, notes, documents, predictionHistory]);
  const patientCount = new Set(records.map((record) => record.uploadedBy.toLowerCase())).size;
  const riskLabel = result ? `${Math.round(result.probability * 100)}%` : "Not run";
  const hasAccessibleRecords = records.length > 0;
  const unavailableInstitutionIds = useMemo(() => {
    const ids = new Set(
      membershipRequests
        .filter((request) => ["pending", "approved"].includes(request.status))
        .map((request) => String(request.institutionId))
    );
    if (userProfile?.institutionId) ids.add(String(userProfile.institutionId));
    return ids;
  }, [membershipRequests, userProfile]);
  const availableInstitutions = useMemo(() => {
    const seen = new Set();
    return institutions.filter((institution) => {
      if (unavailableInstitutionIds.has(String(institution.institutionId))) return false;
      const key = `${institution.name.trim().toLowerCase()}|${institution.institutionType}|${institution.adminWallet?.toLowerCase() || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [institutions, unavailableInstitutionIds]);

  useEffect(() => {
    if (
      joinForm.institutionId &&
      !availableInstitutions.some((institution) => String(institution.institutionId) === String(joinForm.institutionId))
    ) {
      setJoinForm((current) => ({ ...current, institutionId: "" }));
    }
  }, [availableInstitutions, joinForm.institutionId]);

  async function downloadRecord(record) {
    const toastId = toast.info("Fetching encrypted record...", { autoClose: 3000 });
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
      toast.error("No available institution to request");
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

  async function requestEmergencyAccess(event) {
    event.preventDefault();
    if (!ethers.isAddress(emergencyForm.patientWallet)) {
      toast.error("Enter a valid patient wallet address");
      return;
    }
    if (!emergencyForm.recordId || !emergencyForm.reason.trim()) {
      toast.error("Record ID and emergency reason are required");
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/access-requests`,
        {
          patientWallet: emergencyForm.patientWallet,
          recordId: Number(emergencyForm.recordId),
          requestType: "emergency",
          reason: emergencyForm.reason,
        },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success("Emergency access request sent");
      setEmergencyForm({ patientWallet: "", recordId: "", reason: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to request emergency access");
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
    const toastId = toast.info("Creating care document...", { autoClose: 3000 });
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
          <p className="eyebrow">Doctor Workspace</p>
          <h1>Care Review</h1>
        </div>
        <button className="icon-button secondary" onClick={loadAccessibleRecords} aria-label="Refresh accessible records">
          <RefreshCw size={16} />
        </button>
      </div>

      <section className="stat-grid">
        <StatCard icon={FileSearch} label="Accessible Records" value={records.length} />
        <StatCard icon={UsersRound} label="Patients" value={patientCount} accent="green" />
        <StatCard icon={Stethoscope} label="Latest risk" value={riskLabel} accent="amber" />
        <StatCard icon={FilePlus2} label="Care Docs" value={documents.length} />
      </section>

      <div className="tabs">
        {["records", "patients", "emergency", "notes", "documents", "membership", "prediction", "history", "audit", "notifications", "security"].map((tab) => (
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
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter category">
              <option value="all">All categories</option>
              <option value="lab">Lab</option>
              <option value="prescription">Prescription</option>
              <option value="diagnosis">Diagnosis</option>
              <option value="imaging">Imaging</option>
              <option value="other">Other</option>
            </select>
            <select value={flagFilter} onChange={(event) => setFlagFilter(event.target.value)} aria-label="Filter flags">
              <option value="all">All flags</option>
              <option value="important">Important</option>
              <option value="emergency">Emergency</option>
            </select>
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
                <strong>No Accessible Records</strong>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "patients" && (
        <section className="panel request-list">
          <h3>Patient Workspace</h3>
          {Object.entries(patientGroups).map(([wallet, patientRecords]) => {
            const profile = patientProfiles[wallet];
            const patientNotes = notes.filter((note) => note.patientWallet?.toLowerCase() === wallet);
            const patientDocs = documents.filter((document) => document.patientWallet?.toLowerCase() === wallet);
            const patientPredictions = predictionHistory.filter((row) => row.patientWallet?.toLowerCase() === wallet);
            return (
              <article className="request-row" key={wallet}>
                <div>
                  <strong>
                    <UserRound size={16} /> {profile?.name || "Patient"}
                  </strong>
                  <span>{wallet}</span>
                  <small>
                    {patientRecords.length} record(s) - {patientNotes.length} note(s) - {patientDocs.length} care document(s) -{" "}
                    {patientPredictions.length} prediction(s)
                  </small>
                  {profile && (
                    <span>
                      Blood: {profile.bloodType || "N/A"} - Allergies: {profile.allergies || "N/A"} - Conditions:{" "}
                      {profile.chronicConditions || "N/A"}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {Object.keys(patientGroups).length === 0 && (
            <div className="empty-state">
              <UserRound size={28} />
              <strong>No Patient Workspace Yet</strong>
              <span>Patients appear here after they grant you decryptable record access.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "emergency" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={requestEmergencyAccess}>
            <label>
              Emergency-visible record
              <select
                value={emergencyForm.recordId}
                onChange={(event) => {
                  const selected = emergencyRecords.find((record) => String(record.id) === event.target.value);
                  setEmergencyForm({
                    ...emergencyForm,
                    recordId: event.target.value,
                    patientWallet: selected?.uploadedBy || "",
                  });
                }}
                required
                disabled={emergencyRecords.length === 0}
              >
                <option value="">Choose emergency record</option>
                {emergencyRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    Record #{record.id} - {record.metadata?.title || record.metadata?.filename || record.uploadedBy}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Patient wallet
              <input value={emergencyForm.patientWallet} readOnly required />
            </label>
            <label>
              Clinical reason
              <textarea
                value={emergencyForm.reason}
                onChange={(event) => setEmergencyForm({ ...emergencyForm, reason: event.target.value })}
                required
              />
            </label>
            <button disabled={!emergencyForm.recordId}>
              <AlertTriangle size={16} />
              Request emergency access
            </button>
          </form>
          <div className="request-list">
            <div className="notice">
              <strong>Emergency mode</strong>
              <span>
                Choose a record the patient marked emergency-visible. This sends a clearly labeled request and notification;
                the patient still controls final on-chain access and encrypted key sharing.
              </span>
            </div>
            {emergencyRecords.map((record) => (
              <article className="request-row" key={record.id}>
                <div>
                  <strong>{record.metadata?.title || record.metadata?.filename || `Record #${record.id}`}</strong>
                  <span>Record #{record.id} - {record.uploadedBy}</span>
                  <small>{record.metadata?.category || "other"}</small>
                </div>
              </article>
            ))}
            {emergencyRecords.length === 0 && (
              <div className="empty-state">
                <AlertTriangle size={28} />
                <strong>No Emergency-Visible Records</strong>
                <span>Records patients mark as emergency will appear here.</span>
              </div>
            )}
          </div>
        </section>
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
          <div className="history-list">
            <div className="history-list-header">
              <h3>Notes History</h3>
              <span>{notes.length} Total</span>
            </div>
            {notes.map((note) => (
              <article className="history-row" key={note.id}>
                <div className="history-main">
                  <strong>Record #{note.recordId}</strong>
                  <span>{note.note || "No note text provided."}</span>
                </div>
                <div className="history-meta">
                  <span className="badge status-badge">{formatLabel(note.status)}</span>
                  <small>{new Date(note.updatedAt || note.createdAt).toLocaleString()}</small>
                </div>
              </article>
            ))}
            {notes.length === 0 && (
              <div className="empty-state">
                <Stethoscope size={28} />
                <strong>No Notes</strong>
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
          <div className="history-list">
            <div className="history-list-header">
              <h3>Documents History</h3>
              <span>{documents.length} Total</span>
            </div>
            {documents.map((document) => (
              <article className="history-row" key={document.id}>
                <div className="history-main">
                  <strong>{document.title}</strong>
                  <span>{document.patientWallet}</span>
                </div>
                <div className="history-meta">
                  <span className="badge status-badge">{formatLabel(document.documentType)}</span>
                  <small>{new Date(document.createdAt).toLocaleString()}</small>
                </div>
              </article>
            ))}
            {documents.length === 0 && (
              <div className="empty-state">
                <FilePlus2 size={28} />
                <strong>No Documents</strong>
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
                disabled={availableInstitutions.length === 0}
              >
                <option value="">{availableInstitutions.length === 0 ? "No available institutions" : "Choose institution"}</option>
                {availableInstitutions.map((institution) => (
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
            {availableInstitutions.length === 0 && (
              <span className="muted">Institutions with pending or approved requests are hidden from this list.</span>
            )}
          </form>
          <div className="history-list">
            <div className="history-list-header">
              <h3>Membership History</h3>
              <span>{membershipRequests.length} Total</span>
            </div>
            {membershipRequests.map((request) => {
              const institution = institutions.find((item) => Number(item.institutionId) === Number(request.institutionId));
              return (
                <article className="history-row" key={request.id}>
                  <div className="history-main">
                    <strong>{institution ? institution.name : `Institution #${request.institutionId}`}</strong>
                    <span>{request.message || "No message provided."}</span>
                  </div>
                  <div className="history-meta">
                    <span className={`badge status-badge ${request.status}`}>{formatLabel(request.status)}</span>
                    <small>{new Date(request.updatedAt || request.createdAt).toLocaleString()}</small>
                  </div>
                </article>
              );
            })}
            {membershipRequests.length === 0 && (
              <div className="empty-state">
                <UsersRound size={28} />
                <strong>No Membership History</strong>
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
              <h2>{result.prediction === 1 ? "Diabetic Risk Indicated" : "No Diabetic Risk Indicated"}</h2>
              <RiskMeter probability={result.probability} />
              <div className="request-list">
                <article className="request-row">
                  <div>
                    <strong>Main contributing values</strong>
                    {riskFactors.map((factor) => (
                      <span key={factor}>{factor}</span>
                    ))}
                  </div>
                </article>
              </div>
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
              <strong>No History</strong>
              <span>Diabetes prediction results will appear here after you submit the form.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="panel">
          <div className="panel-title-row">
            <h2>Doctor Audit Timeline</h2>
          </div>
          {auditRows.length > 0 ? (
            <div className="timeline">
              {auditRows.map((row, index) => (
                <article className="timeline-item" key={`${row.action}-${row.target}-${index}`}>
                  <strong>{row.action}</strong>
                  <span>{row.target}</span>
                  {row.detail && <small>{row.detail}</small>}
                  <small>{row.timestamp.toLocaleString()}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Stethoscope size={28} />
              <strong>No audit events yet</strong>
              <span>Membership, access requests, notes, documents, and predictions will appear here.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "notifications" && <NotificationsPanel />}
      {activeTab === "security" && <SecurityModel />}
    </main>
  );
}
