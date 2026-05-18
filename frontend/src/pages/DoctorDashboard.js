import React, { useEffect, useState } from "react";
import { Download, FileSearch, RefreshCw, Search, Stethoscope, UsersRound } from "lucide-react";
import { toast } from "react-toastify";
import PredictionForm from "../components/PredictionForm";
import RecordCard from "../components/RecordCard";
import RiskMeter from "../components/RiskMeter";
import StatCard from "../components/StatCard";
import { useWallet } from "../context/WalletContext";
import { deriveKey, decryptFile } from "../utils/encryption";
import { getAllRecords, hasAccess } from "../utils/contractHelper";

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
    if (match) {
      extracted[field] = match[1];
    }
  });

  return predictionFields.every((field) => extracted[field]) ? extracted : null;
}

export default function DoctorDashboard() {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [predictionValues, setPredictionValues] = useState(emptyPredictionValues);

  async function loadAccessibleRecords() {
    const allRecords = await getAllRecords();
    const checks = await Promise.all(allRecords.map((record) => hasAccess(record.id, walletAddress)));
    setRecords(allRecords.filter((_, index) => checks[index]));
  }

  useEffect(() => {
    if (walletAddress) loadAccessibleRecords();
  }, [walletAddress]);

  const filteredRecords = records.filter((record) =>
    `${record.id} ${record.cid} ${record.uploadedBy}`.toLowerCase().includes(search.toLowerCase())
  );
  const patientCount = new Set(records.map((record) => record.uploadedBy.toLowerCase())).size;
  const riskLabel = result ? `${Math.round(result.probability * 100)}%` : "Not run";

  async function downloadRecord(record) {
    const toastId = toast.loading("Fetching encrypted record...");
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${record.cid}`);
      const encryptedString = await response.text();
      const secret = window.prompt("Paste the AES key copied from the patient's record card");
      if (!secret) throw new Error("AES key is required");
      // Assumption: for demo recovery, a patient can share either the derived AES key or the original signature out-of-band.
      const key = secret.startsWith("0x") && secret.length > 80 ? deriveKey(record.uploadedBy, secret) : secret;
      const bytes = decryptFile(encryptedString, key);
      const signature = Array.from(bytes.slice(0, 8))
        .map((byte) => String.fromCharCode(byte))
        .join("");
      const isPdf = signature.startsWith("%PDF");
      const isPng = bytes[0] === 0x89 && signature.includes("PNG");
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;

      if (!isPdf && !isPng && !isJpeg) {
        throw new Error("Wrong AES key, or the decrypted file is not a supported PDF/image.");
      }

      const mimeType = isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg";
      const extension = isPdf ? "pdf" : isPng ? "png" : "jpg";

      // Assumption: text-based PDFs can be scanned directly; image OCR would require an OCR library/service.
      const extractedValues = isPdf ? extractPredictionValues(bytes) : null;
      if (extractedValues) {
        setPredictionValues(extractedValues);
        setActiveTab("prediction");
        toast.success("Prediction form auto-filled from PDF");
      } else if (isPdf) {
        toast.info("PDF decrypted, but no complete diabetes vitals were found");
      }

      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `healthtrust-record-${record.id}.${extension}`;
      link.click();
      toast.update(toastId, { render: "Record decrypted", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, { render: error.message, type: "error", isLoading: false, autoClose: 5000 });
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
      </section>

      <div className="tabs">
        <button className={activeTab === "records" ? "active" : ""} onClick={() => setActiveTab("records")}>
          Accessible Records
        </button>
        <button className={activeTab === "prediction" ? "active" : ""} onClick={() => setActiveTab("prediction")}>
          Diabetes Prediction
        </button>
      </div>

      {activeTab === "records" ? (
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
      ) : (
        <section className="panel">
          <PredictionForm values={predictionValues} onValuesChange={setPredictionValues} onResult={setResult} />
          {result && (
            <div className="result-card">
              <h2>{result.prediction === 1 ? "Diabetic" : "Non-Diabetic"}</h2>
              <RiskMeter probability={result.probability} />
              <p>This is not a medical diagnosis.</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
