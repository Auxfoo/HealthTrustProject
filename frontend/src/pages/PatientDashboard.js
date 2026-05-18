import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Clock3, FileText, History, RefreshCw, Search, ShieldCheck, Upload } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import AccessModal from "../components/AccessModal";
import RecordCard from "../components/RecordCard";
import StatCard from "../components/StatCard";
import { addRecord, getBrowserProvider, getContract, parseReceiptEvent } from "../utils/contractHelper";
import { deriveKey, encryptFile } from "../utils/encryption";

const SIGN_MESSAGE = "HealthTrust AES key derivation for encrypted medical records";

function metadataKey(wallet) {
  return `healthtrust_record_metadata_${wallet?.toLowerCase()}`;
}

function getMetadata(wallet) {
  return JSON.parse(localStorage.getItem(metadataKey(wallet)) || "{}");
}

function saveMetadata(wallet, recordId, data) {
  const current = getMetadata(wallet);
  localStorage.setItem(metadataKey(wallet), JSON.stringify({ ...current, [recordId]: data }));
}

export default function PatientDashboard() {
  const { walletAddress, API_URL } = useWallet();
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("records");
  const [auditTrail, setAuditTrail] = useState([]);
  const [search, setSearch] = useState("");

  async function loadRecords() {
    const response = await axios.get(`${API_URL}/api/records/${walletAddress}`);
    setRecords(response.data);
    setMetadata(getMetadata(walletAddress));
  }

  const filteredRecords = records.filter((record) => {
    const filename = metadata[record.id]?.filename || "";
    return `${record.id} ${record.cid} ${filename}`.toLowerCase().includes(search.toLowerCase());
  });

  const lastUpload = records.length
    ? new Date(Math.max(...records.map((record) => Number(record.timestamp || 0))) * 1000).toLocaleDateString()
    : "None";

  async function loadAuditTrail() {
    const provider = await getBrowserProvider();
    const contract = getContract(provider);
    const filters = [
      contract.filters.AccessGrantedToDoctor(walletAddress),
      contract.filters.AccessRevokedFromDoctor(walletAddress),
      contract.filters.AccessGrantedToInstitution(walletAddress),
      contract.filters.AccessRevokedFromInstitution(walletAddress),
    ];
    const logs = (await Promise.all(filters.map((filter) => contract.queryFilter(filter, 0, "latest")))).flat();
    const rows = await Promise.all(
      logs.map(async (log) => {
        const block = await provider.getBlock(log.blockNumber);
        const target = log.args.doctor || log.args.institutionId?.toString();
        return {
          action: log.fragment.name,
          target,
          recordId: Number(log.args.recordId),
          timestamp: new Date(Number(block.timestamp) * 1000).toLocaleString(),
        };
      })
    );
    setAuditTrail(rows.sort((a, b) => b.recordId - a.recordId));
  }

  useEffect(() => {
    if (walletAddress) loadRecords();
  }, [walletAddress]);

  useEffect(() => {
    if (activeTab === "audit" && walletAddress) loadAuditTrail();
  }, [activeTab, walletAddress]);

  async function uploadRecord(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Encrypting record...");
    try {
      const provider = await getBrowserProvider();
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(SIGN_MESSAGE);
      const key = deriveKey(walletAddress, signature);
      const encryptedString = await encryptFile(await file.arrayBuffer(), key);
      const blob = new Blob([encryptedString], { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", blob, `${file.name}.encrypted.txt`);
      toast.update(toastId, { render: "Pinning encrypted file to IPFS...", isLoading: true });
      const response = await axios.post(`${API_URL}/api/records/upload`, formData);

      toast.update(toastId, { render: "Confirming record on-chain...", isLoading: true });
      const tx = await addRecord(response.data.cid);
      const receipt = await tx.wait();
      const eventLog = await parseReceiptEvent(receipt, "RecordAdded");
      const recordId = Number(eventLog.args.recordId);

      // Assumption: for local demo testing, the patient's browser stores the AES key so it can be shared with an approved doctor.
      saveMetadata(walletAddress, recordId, { filename: file.name, mimeType: file.type, aesKey: key });
      toast.update(toastId, { render: "Record uploaded", type: "success", isLoading: false, autoClose: 3000 });
      await loadRecords();
    } catch (error) {
      toast.update(toastId, {
        render: error.reason || error.message,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      event.target.value = "";
    }
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
        <StatCard icon={ShieldCheck} label="Access model" value="Per record" accent="green" />
        <StatCard icon={History} label="Audit events" value={auditTrail.length || "Load tab"} accent="amber" />
        <StatCard icon={Clock3} label="Latest upload" value={lastUpload} />
      </section>

      <div className="tabs">
        <button className={activeTab === "records" ? "active" : ""} onClick={() => setActiveTab("records")}>
          My Records
        </button>
        <button className={activeTab === "audit" ? "active" : ""} onClick={() => setActiveTab("audit")}>
          Audit Trail
        </button>
      </div>

      {activeTab === "records" ? (
        <>
          <div className="toolbar">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records or CID" />
          </div>
          <section className="record-list">
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                filename={metadata[record.id]?.filename}
                aesKey={metadata[record.id]?.aesKey}
                onManageAccess={setSelectedRecord}
              />
            ))}
            {filteredRecords.length === 0 && (
              <div className="empty-state">
                <FileText size={28} />
                <strong>No records found</strong>
              </div>
            )}
          </section>
        </>
      ) : (
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

      {selectedRecord && <AccessModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </main>
  );
}
