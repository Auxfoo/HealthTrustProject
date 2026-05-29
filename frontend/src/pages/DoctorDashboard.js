import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  Building2,
  ClipboardList,
  Download,
  FilePlus2,
  FileSearch,
  History,
  Lock,
  NotebookPen,
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
import { useLanguage } from "../i18n";

const doctorTabs = [
  { key: "records", label: "Records", icon: FileSearch },
  { key: "patients", label: "Patients", icon: UsersRound },
  { key: "emergency", label: "Emergency", icon: AlertTriangle },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "documents", label: "Documents", icon: FilePlus2 },
  { key: "membership", label: "Membership", icon: Building2 },
  { key: "prediction", label: "Prediction", icon: BrainCircuit },
  { key: "history", label: "History", icon: History },
  { key: "audit", label: "Audit", icon: ClipboardList },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Lock },
];

const emptyPredictionValues = {
  gender: "Female",
  age: "",
  hypertension: "0",
  heart_disease: "0",
  smoking_history: "never",
  bmi: "",
  HbA1c_level: "",
  blood_glucose_level: "",
  glucose_context: "unknown",
};

const predictionFields = [
  { key: "gender", labels: ["Gender"], optional: true },
  { key: "age", labels: ["Age"] },
  { key: "hypertension", labels: ["Hypertension"] },
  { key: "heart_disease", labels: ["Heart disease", "Heart Disease"] },
  { key: "smoking_history", labels: ["Smoking history", "Smoking History"], optional: true },
  { key: "bmi", labels: ["BMI"] },
  { key: "HbA1c_level", labels: ["HbA1c level", "HbA1c"] },
  { key: "blood_glucose_level", labels: ["Blood glucose level", "Blood Glucose"] },
  { key: "glucose_context", labels: ["Glucose test context", "Glucose Context"], optional: true },
];

const glucoseContextLabels = {
  unknown: "Unknown / not sure",
  fasting: "Fasting",
  random: "Random",
  post_meal: "2-hour / after meal",
};

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
  if (field === "glucose_context") {
    const normalized = cleanedValue.toLowerCase().replace(/[-\s]+/g, "_");
    if (["fasting", "fasted"].includes(normalized)) return "fasting";
    if (["random", "casual"].includes(normalized)) return "random";
    if (["post_meal", "after_meal", "2_hour", "two_hour", "ogtt"].includes(normalized)) return "post_meal";
    return "unknown";
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
  const extracted = { ...emptyPredictionValues };
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
  return predictionFields.every(({ key, optional }) => optional || extracted[key]) ? extracted : null;
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DoctorDashboard() {
  const { walletAddress, API_URL, userProfile } = useWallet();
  const { t, localizeText, formatDate, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [emergencyRecords, setEmergencyRecords] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
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
    setLoadingInstitutions(true);
    const institutionsPromise = axios
      .get(`${API_URL}/api/institutions`)
      .then((response) => {
        setInstitutions(response.data);
        return response.data;
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || error.message || t("Unable to load institutions"));
        return [];
      })
      .finally(() => setLoadingInstitutions(false));
    const membershipPromise = axios
      .get(`${API_URL}/api/membership-requests`, { headers })
      .then((response) => {
        setMembershipRequests(response.data);
        return response.data;
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || error.message || t("Unable to load membership requests"));
        return [];
      });

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

    const [accessRequestResponse, noteResponse, docResponse, historyResponse] = await Promise.all([
      axios.get(`${API_URL}/api/access-requests`, { headers }),
      axios.get(`${API_URL}/api/notes`, { headers }),
      axios.get(`${API_URL}/api/doctor-documents`, { headers }),
      axios.get(`${API_URL}/api/predict/history`, { headers }),
    ]);
    await Promise.all([institutionsPromise, membershipPromise]);
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

  async function loadPredictionHistory() {
    try {
      const headers = await createAuthHeaders(walletAddress);
      const response = await axios.get(`${API_URL}/api/predict/history`, { headers });
      setPredictionHistory(response.data);
    } catch { }
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
    const glucoseContext = predictionValues.glucose_context || "unknown";
    if (Number.isFinite(hba1c) && hba1c >= 6.5) factors.push("HbA1c is in a high range.");
    if (Number.isFinite(glucose)) {
      if (glucoseContext === "fasting" && glucose >= 126) {
        factors.push("Fasting glucose is in a diabetes-range marker.");
      } else if (glucoseContext === "fasting" && glucose >= 100) {
        factors.push("Fasting glucose is elevated.");
      } else if (glucoseContext === "post_meal" && glucose >= 200) {
        factors.push("2-hour glucose is in a diabetes-range marker.");
      } else if (glucoseContext === "post_meal" && glucose >= 140) {
        factors.push("2-hour / after-meal glucose is elevated.");
      } else if (glucoseContext === "random" && glucose >= 200) {
        factors.push("Random glucose is in a high range.");
      } else if (glucose >= 140) {
        factors.push("Blood glucose is elevated; interpretation depends on test context.");
      }
    }
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
    const toastId = toast.info(t("Fetching encrypted record..."), { autoClose: 3000 });
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
        toast.success(t("Prediction form auto-filled from PDF"));
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
      toast.update(toastId, { render: t("Record decrypted"), type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, { render: localizeText(error.response?.data?.message || error.message), type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  async function requestMembership(event) {
    event.preventDefault();
    if (!joinForm.institutionId) {
      toast.error(t("No available institution to request"));
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/membership-requests`,
        { institutionId: Number(joinForm.institutionId), message: joinForm.message },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success(t("Membership request sent"));
      setJoinForm((current) => ({ ...current, message: "" }));
      await loadAccessibleRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t("Unable to send membership request"));
    }
  }

  async function requestEmergencyAccess(event) {
    event.preventDefault();
    if (!ethers.isAddress(emergencyForm.patientWallet)) {
      toast.error(t("Enter a valid patient wallet address"));
      return;
    }
    if (!emergencyForm.recordId || !emergencyForm.reason.trim()) {
      toast.error(t("Record ID and emergency reason are required"));
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
      toast.success(t("Emergency access request sent"));
      setEmergencyForm({ patientWallet: "", recordId: "", reason: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t("Unable to request emergency access"));
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    const selectedRecord = records.find((record) => String(record.id) === String(noteForm.recordId));
    if (!selectedRecord) {
      toast.error(t("Choose an accessible record"));
      return;
    }
    if (!ethers.isAddress(noteForm.patientWallet)) {
      toast.error(t("Enter a valid patient wallet address"));
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/notes`,
        { ...noteForm, recordId: Number(noteForm.recordId) },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success(t("Note saved"));
      setNoteForm({ recordId: "", patientWallet: "", status: "reviewed", note: "" });
      await loadAccessibleRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t("Unable to save note"));
    }
  }

  async function sendCareDocument(event) {
    event.preventDefault();
    const selectedRecord = records.find((record) => String(record.id) === String(docForm.sourceRecordId));
    if (!selectedRecord) {
      toast.error(t("Choose an accessible record"));
      return;
    }
    if (!ethers.isAddress(docForm.patientWallet)) {
      toast.error(t("Enter a valid patient wallet address"));
      return;
    }
    const toastId = toast.info(t("Creating care document..."), { autoClose: 3000 });
    try {
      await axios.post(
        `${API_URL}/api/doctor-documents`,
        { ...docForm, sourceRecordId: undefined, recordId: Number(docForm.sourceRecordId), cid: "", encrypted: false },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: t("Care document sent"), type: "success", isLoading: false, autoClose: 3000 });
      setDocForm({ sourceRecordId: "", patientWallet: "", documentType: "prescription", title: "", content: "" });
      await loadAccessibleRecords();
    } catch (error) {
      toast.update(toastId, { render: localizeText(error.response?.data?.message || error.reason || error.message), type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">{t("Doctor Workspace")}</p>
          <h1>{t("Care Review")}</h1>
        </div>
        <button className="icon-button secondary" onClick={loadAccessibleRecords} aria-label={t("Refresh accessible records")}>
          <RefreshCw size={16} />
        </button>
      </div>

      <section className="stat-grid">
        <StatCard icon={FileSearch} label={t("Accessible Records")} value={records.length} />
        <StatCard icon={UsersRound} label={t("Patients")} value={patientCount} accent="green" />
        <StatCard icon={Stethoscope} label={t("Latest risk")} value={riskLabel} accent="amber" />
        <StatCard icon={FilePlus2} label={t("Care Docs")} value={documents.length} />
      </section>

      <div className="tabs">
        {doctorTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
              {Icon && <Icon size={16} />}
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {activeTab === "records" && (
        <>
          <div className="toolbar">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search records or patient")} />
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
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                filename={metadata[record.id]?.title || metadata[record.id]?.filename}
                actions={
                  <button className="icon-button with-label" onClick={() => downloadRecord(record)}>
                    <Download size={16} />
                    {t("View")}
                  </button>
                }
              />
            ))}
            {filteredRecords.length === 0 && (
              <div className="empty-state">
                <FileSearch size={28} />
                <strong>{t("No Accessible Records")}</strong>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "patients" && (
        <section className="panel request-list">
          <h3><UsersRound size={18} />{t("Patient Workspace")}</h3>
          {Object.entries(patientGroups).map(([wallet, patientRecords]) => {
            const profile = patientProfiles[wallet];
            const patientNotes = notes.filter((note) => note.patientWallet?.toLowerCase() === wallet);
            const patientDocs = documents.filter((document) => document.patientWallet?.toLowerCase() === wallet);
            const patientPredictions = predictionHistory.filter((row) => row.patientWallet?.toLowerCase() === wallet);
            return (
              <article className="request-row" key={wallet}>
                <div>
                  <strong>
                    <UserRound size={16} /> {profile?.name || t("Patient")}
                  </strong>
                  <span><bdi dir="ltr">{wallet}</bdi></span>
                  <small>{localizeText(`${patientRecords.length} record(s)`)}</small>
                  <small>{localizeText(`${patientNotes.length} note(s)`)}</small>
                  <small>{localizeText(`${patientDocs.length} care document(s)`)}</small>
                  <small>{localizeText(`${patientPredictions.length} prediction(s)`)}</small>
                  {profile && (
                    <>
                      <span>{t("Blood type")}: {profile.bloodType || t("N/A")}</span>
                      <span>{t("Allergies")}: {profile.allergies || t("N/A")}</span>
                      <span>{t("Chronic conditions")}: {profile.chronicConditions || t("N/A")}</span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {Object.keys(patientGroups).length === 0 && (
            <div className="empty-state">
              <UserRound size={28} />
              <strong>{t("No Patient Workspace Yet")}</strong>
              <span>{t("Patients appear here after they grant you decryptable record access.")}</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "emergency" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={requestEmergencyAccess}>
            <label>
              {t("Emergency-visible record")}
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
                <option value="">{t("Choose emergency record")}</option>
                {emergencyRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {localizeText(`Record #${record.id}`)} - {record.metadata?.title || record.metadata?.filename || record.uploadedBy}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Patient wallet")}
              <input value={emergencyForm.patientWallet} readOnly required />
            </label>
            <label>
              {t("Clinical reason")}
              <textarea
                value={emergencyForm.reason}
                onChange={(event) => setEmergencyForm({ ...emergencyForm, reason: event.target.value })}
                required
              />
            </label>
            <button disabled={!emergencyForm.recordId}>
              <AlertTriangle size={16} />
              {t("Request emergency access")}
            </button>
          </form>
          <div className="request-list">
            <div className="notice">
              <strong>{t("Emergency mode")}</strong>
              <span>{t("Choose a record the patient marked emergency-visible. This sends a clearly labeled request and notification; the patient still controls final on-chain access and encrypted key sharing.")}</span>
            </div>
            {emergencyRecords.map((record) => (
              <article className="request-row" key={record.id}>
                <div>
                  <strong>{record.metadata?.title || record.metadata?.filename || localizeText(`Record #${record.id}`)}</strong>
                  <span>{localizeText(`Record #${record.id}`)}</span>
                  <span><bdi dir="ltr">{record.uploadedBy}</bdi></span>
                  <small>{localizeText(record.metadata?.category || "other")}</small>
                </div>
              </article>
            ))}
            {emergencyRecords.length === 0 && (
              <div className="empty-state">
                <AlertTriangle size={28} />
                <strong>{t("No Emergency-Visible Records")}</strong>
                <span>{t("Records patients mark as emergency will appear here.")}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "notes" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={saveNote}>
            <label>
              {t("Record")}
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
                <option value="">{t("Choose a record")}</option>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {localizeText(`Record #${record.id}`)} - {metadata[record.id]?.title || metadata[record.id]?.filename || record.uploadedBy}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Patient wallet")}
              <input value={noteForm.patientWallet} readOnly required />
            </label>
            <label>
              {t("Review status")}
              <select value={noteForm.status} onChange={(event) => setNoteForm({ ...noteForm, status: event.target.value })}>
                <option value="reviewed">{t("Reviewed")}</option>
                <option value="follow_up">{t("Follow-up needed")}</option>
                <option value="urgent">{t("Urgent")}</option>
              </select>
            </label>
            <label>
              {t("Note")}
              <textarea value={noteForm.note} onChange={(event) => setNoteForm({ ...noteForm, note: event.target.value })} />
            </label>
            <button disabled={!hasAccessibleRecords}>{t("Save note")}</button>
          </form>
          <div className="history-list">
            <div className="history-list-header">
              <h3><NotebookPen size={18} />{t("Notes History")}</h3>
              <span>{formatNumber(notes.length)} {t("Total")}</span>
            </div>
            {notes.map((note) => (
              <article className="history-row" key={note.id}>
                <div className="history-main">
                  <strong>{localizeText(`Record #${note.recordId}`)}</strong>
                  <span>{note.note || t("No note text provided.")}</span>
                </div>
                <div className="history-meta">
                  <span className="badge status-badge">{localizeText(formatLabel(note.status))}</span>
                  <small>{formatDate(note.updatedAt || note.createdAt)}</small>
                </div>
              </article>
            ))}
            {notes.length === 0 && (
              <div className="empty-state">
                <Stethoscope size={28} />
                <strong>{t("No Notes")}</strong>
                <span>{t("Notes you add for accessible records will appear here.")}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "documents" && (
        <section className="panel split-panel">
          <form className="form-grid" onSubmit={sendCareDocument}>
            <label>
              {t("Record")}
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
                <option value="">{t("Choose a record")}</option>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {localizeText(`Record #${record.id}`)} - {metadata[record.id]?.title || metadata[record.id]?.filename || record.uploadedBy}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Patient wallet")}
              <input value={docForm.patientWallet} readOnly required />
            </label>
            <label>
              {t("Type")}
              <select value={docForm.documentType} onChange={(event) => setDocForm({ ...docForm, documentType: event.target.value })}>
                <option value="prescription">{t("Prescription")}</option>
                <option value="diagnosis">{t("Diagnosis note")}</option>
                <option value="lab_request">{t("Lab request")}</option>
                <option value="referral">{t("Referral")}</option>
                <option value="follow_up">{t("Follow-up summary")}</option>
              </select>
            </label>
            <label>
              {t("Title")}
              <input value={docForm.title} onChange={(event) => setDocForm({ ...docForm, title: event.target.value })} required />
            </label>
            <label>
              {t("Content")}
              <textarea value={docForm.content} onChange={(event) => setDocForm({ ...docForm, content: event.target.value })} />
            </label>
            <button disabled={!hasAccessibleRecords}>{t("Send to patient")}</button>
          </form>
          <div className="history-list">
            <div className="history-list-header">
              <h3><FilePlus2 size={18} />{t("Documents History")}</h3>
              <span>{formatNumber(documents.length)} {t("Total")}</span>
            </div>
            {documents.map((document) => (
              <article className="history-row" key={document.id}>
                <div className="history-main">
                  <strong>{document.title}</strong>
                  <span><bdi dir="ltr">{document.patientWallet}</bdi></span>
                </div>
                <div className="history-meta">
                  <span className="badge status-badge">{localizeText(formatLabel(document.documentType))}</span>
                  <small>{formatDate(document.createdAt)}</small>
                </div>
              </article>
            ))}
            {documents.length === 0 && (
              <div className="empty-state">
                <FilePlus2 size={28} />
                <strong>{t("No Documents")}</strong>
                <span>{t("Care documents you send to patients will appear here.")}</span>
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
                disabled={loadingInstitutions || availableInstitutions.length === 0}
              >
                <option value="">
                  {loadingInstitutions ? t("Loading institutions...") : availableInstitutions.length === 0 ? t("No available institutions") : t("Choose institution")}
                </option>
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
            <button disabled={loadingInstitutions || !joinForm.institutionId}>Request membership</button>
            {!loadingInstitutions && availableInstitutions.length === 0 && (
              <span className="muted">{t("Institutions with pending or approved requests are hidden from this list.")}</span>
            )}
          </form>
          <div className="history-list">
            <div className="history-list-header">
              <h3><Building2 size={18} />{t("Membership History")}</h3>
              <span>{formatNumber(membershipRequests.length)} {t("Total")}</span>
            </div>
            {membershipRequests.map((request) => {
              const institution = institutions.find((item) => Number(item.institutionId) === Number(request.institutionId));
              return (
                <article className="history-row" key={request.id}>
                  <div className="history-main">
                    <strong>{institution ? institution.name : localizeText(`Institution #${request.institutionId}`)}</strong>
                    <span>{request.message || t("No message provided.")}</span>
                  </div>
                  <div className="history-meta">
                    <span className={`badge status-badge ${request.status}`}>{localizeText(formatLabel(request.status))}</span>
                    <small>{formatDate(request.updatedAt || request.createdAt)}</small>
                  </div>
                </article>
              );
            })}
            {membershipRequests.length === 0 && (
              <div className="empty-state">
                <UsersRound size={28} />
                <strong>{t("No Membership History")}</strong>
                <span>{t("Your institution join requests will appear here.")}</span>
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
            onResult={(data) => {
              setResult(data);
              loadPredictionHistory();
            }}
          />
          {result && (
            <div className="result-card">
              <h2><BrainCircuit size={18} />{result.prediction === 1 ? t("Diabetic Risk Indicated") : t("No Diabetic Risk Indicated")}</h2>
              <RiskMeter probability={result.probability} />
              <div className="risk-breakdown">
                <span>{t("Glucose context")}: {t(glucoseContextLabels[predictionValues.glucose_context] || glucoseContextLabels.unknown)}</span>
                {Number.isFinite(result.modelProbability) && (
                  <span>{t("Model")}: {formatNumber(Math.round(result.modelProbability * 100))}%</span>
                )}
                {Number.isFinite(result.clinicalProbability) && (
                  <span>{t("Clinical rules")}: {formatNumber(Math.round(result.clinicalProbability * 100))}%</span>
                )}
              </div>
              <div className="request-list">
                <article className="request-row">
                  <div>
                    <strong>Main contributing values</strong>
                    {riskFactors.map((factor) => (
                      <span key={factor}>{localizeText(factor)}</span>
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
              <strong>{localizeText(`${Math.round(row.probability * 100)}% risk`)}</strong>
              <span><bdi dir="ltr">{row.patientWallet || t("No patient linked")}</bdi></span>
              <span>{t("Glucose context")}: {t(glucoseContextLabels[row.features?.glucose_context] || glucoseContextLabels.unknown)}</span>
              <small>{formatDate(row.createdAt)}</small>
            </article>
          ))}
          {predictionHistory.length === 0 && (
            <div className="empty-state">
              <Stethoscope size={28} />
              <strong>{t("No History")}</strong>
              <span>{t("Diabetes prediction results will appear here after you submit the form.")}</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="panel">
          <div className="panel-title-row">
            <h2><ClipboardList size={18} />{t("Doctor Audit Timeline")}</h2>
          </div>
          {auditRows.length > 0 ? (
            <div className="timeline">
              {auditRows.map((row, index) => (
                <article className="timeline-item" key={`${row.action}-${row.target}-${index}`}>
                  <strong>{localizeText(row.action)}</strong>
                  <span>{localizeText(row.target)}</span>
                  {row.detail && <small>{localizeText(row.detail)}</small>}
                  <small>{formatDate(row.timestamp)}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Stethoscope size={28} />
              <strong>{t("No audit events yet")}</strong>
              <span>{t("Membership, access requests, notes, documents, and predictions will appear here.")}</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "notifications" && <NotificationsPanel />}
      {activeTab === "security" && <SecurityModel />}
    </main>
  );
}
