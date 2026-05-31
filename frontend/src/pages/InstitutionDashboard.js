import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BarChart3, Bell, Building2, Clipboard, ClipboardList, Check, Download, FileText, Lock, Plus, RefreshCw, Stethoscope, Trash2, UserRound, X } from "lucide-react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import SecurityModel from "../components/SecurityModel";
import StatCard from "../components/StatCard";
import {
  addDoctorToInstitution,
  getAllInstitutionsFromChain,
  getBrowserProvider,
  getContract,
  getInstitutionSharedRecords,
  getInstitutionDoctors,
  parseReceiptEvent,
  registerInstitution,
  removeDoctorFromInstitution,
} from "../utils/contractHelper";
import { createAuthHeaders } from "../utils/auth";
import { createHealthTrustPdf } from "../utils/pdfReport";
import { useLanguage } from "../i18n";

const institutionTabs = [
  { key: "institution", label: "My Institution", icon: Building2 },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "doctors", label: "Doctors", icon: Stethoscope },
  { key: "doctor_requests", label: "Doctor Requests", icon: UserRound },
  { key: "shared", label: "Shared", icon: FileText },
  { key: "audit", label: "Audit", icon: ClipboardList },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Lock },
];

export default function InstitutionDashboard() {
  const { walletAddress, API_URL } = useWallet();
  const { t, localizeText, formatDate, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState("institution");
  const [institution, setInstitution] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorAddress, setDoctorAddress] = useState("");
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [sharedKeys, setSharedKeys] = useState([]);
  const [sharedRecords, setSharedRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [chainAuditRows, setChainAuditRows] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ name: "", institutionType: "hospital" });
  const [contractStatus, setContractStatus] = useState({ stale: false, message: "" });
  const [pendingAction, setPendingAction] = useState("");
  const busy = Boolean(pendingAction);

  async function loadChainAuditRows(institutionId) {
    const provider = await getBrowserProvider();
    const contract = getContract(provider);
    const filters = [
      contract.filters.AccessGrantedToInstitution(),
      contract.filters.AccessRevokedFromInstitution(),
      contract.filters.DoctorAddedToInstitution(),
      contract.filters.DoctorRemovedFromInstitution(),
    ];
    const logs = (await Promise.all(filters.map((filter) => contract.queryFilter(filter, 0, "latest")))).flat();
    const rows = await Promise.all(
      logs
        .filter((log) => Number(log.args.institutionId) === Number(institutionId))
        .map(async (log) => {
          const block = await provider.getBlock(log.blockNumber);
          return {
            action: log.fragment.name,
            target: log.args.doctorAddress || `Institution #${institutionId}`,
            detail: log.args.recordId ? `Record #${Number(log.args.recordId)}` : "",
            timestamp: new Date(Number(block.timestamp) * 1000),
          };
        })
    );
    setChainAuditRows(rows);
  }

  async function loadInstitution() {
    const response = await axios.get(`${API_URL}/api/institutions`);
    const found = response.data.find((item) => item.adminWallet.toLowerCase() === walletAddress.toLowerCase());
    setInstitution(found || null);
    const headers = await createAuthHeaders(walletAddress);
    const [membershipResponse] = await Promise.all([
      axios.get(`${API_URL}/api/membership-requests`, { headers }),
    ]);
    setMembershipRequests(membershipResponse.data);
    if (found) {
      const chainInstitutions = await getAllInstitutionsFromChain();
      const chainMatch = chainInstitutions.find((item) => item.id === found.institutionId);
      if (!chainMatch || chainMatch.adminWallet.toLowerCase() !== walletAddress.toLowerCase()) {
        const message = chainMatch
          ? `Database institution ID ${found.institutionId} is owned by ${chainMatch.adminWallet} on this contract.`
          : `Database institution ID ${found.institutionId} does not exist on this contract.`;
        setContractStatus({ stale: true, message });
        setDoctors([]);
        setSharedKeys([]);
        setSharedRecords([]);
        setMetadata({});
        setChainAuditRows([]);
        return;
      }
      setContractStatus({ stale: false, message: "" });
      const doctorList = await getInstitutionDoctors(found.institutionId);
      setDoctors(doctorList);
      const keys = await axios.get(`${API_URL}/api/record-keys/institution/${found.institutionId}`, { headers });
      setSharedKeys(keys.data);
      const records = await getInstitutionSharedRecords(found.institutionId);
      setSharedRecords(records);
      const ids = records.map((record) => record.id).join(",");
      if (ids) {
        const meta = await axios.get(`${API_URL}/api/records/metadata/bulk?ids=${ids}`, { headers });
        setMetadata(Object.fromEntries(meta.data.map((row) => [row.recordId, row])));
      } else {
        setMetadata({});
      }
      await loadChainAuditRows(found.institutionId);
    } else {
      setDoctors([]);
      setSharedKeys([]);
      setSharedRecords([]);
      setMetadata({});
      setChainAuditRows([]);
      setContractStatus({ stale: false, message: "" });
    }
  }

  useEffect(() => {
    if (walletAddress) loadInstitution();
  }, [walletAddress]);

  const pendingMembership = useMemo(
    () => membershipRequests.filter((request) => request.status === "pending" && request.institutionId === institution?.institutionId),
    [membershipRequests, institution]
  );
  const activeSharedRecords = sharedRecords.length;
  const categoryCounts = useMemo(() => {
    const counts = {};
    sharedRecords.forEach((record) => {
      const category = metadata[record.id]?.category || "other";
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [sharedRecords, metadata]);
  const filteredSharedRecords = useMemo(
    () =>
      sharedRecords.filter((record) => categoryFilter === "all" || (metadata[record.id]?.category || "other") === categoryFilter),
    [sharedRecords, metadata, categoryFilter]
  );
  const monthlyAccessEvents = useMemo(() => {
    const now = new Date();
    return sharedKeys.filter((key) => {
      const created = new Date(key.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
  }, [sharedKeys]);
  const institutionAuditRows = useMemo(() => {
    const keyRows = sharedKeys.map((key) => ({
      action: "Doctor key envelope available",
      target: key.recipientWallet,
      detail: `Record #${key.recordId}`,
      timestamp: new Date(key.updatedAt || key.createdAt),
    }));
    const requestRows = membershipRequests
      .filter((request) => !institution || request.institutionId === institution.institutionId)
      .map((request) => ({
        action: `Membership ${request.status}`,
        target: request.doctorWallet,
        detail: request.message || "Doctor membership request",
        timestamp: new Date(request.updatedAt || request.createdAt),
      }));
    const doctorRows = doctors.map((doctor) => ({
      action: "Doctor currently registered",
      target: doctor,
      detail: institution ? `Institution #${institution.institutionId}` : "Institution",
      timestamp: new Date(),
    }));
    return [...chainAuditRows, ...keyRows, ...requestRows, ...doctorRows].sort((a, b) => b.timestamp - a.timestamp);
  }, [chainAuditRows, sharedKeys, membershipRequests, doctors, institution]);

  async function createInstitution(event) {
    event.preventDefault();
    await registerCurrentInstitution(form.name, form.institutionType);
  }

  async function registerCurrentInstitution(name, institutionType) {
    if (busy) return;
    setPendingAction("institution");
    const toastId = toast.info(t("Registering institution..."), { autoClose: 3000 });
    try {
      const tx = await registerInstitution(name, institutionType);
      const receipt = await tx.wait();
      const eventLog = await parseReceiptEvent(receipt, "InstitutionRegistered");
      const institutionId = Number(eventLog.args.institutionId);
      await axios.post(
        `${API_URL}/api/institutions/register`,
        { name, institutionType, adminWallet: walletAddress, institutionId },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: t("Institution registered"), type: "success", isLoading: false, autoClose: 3000 });
      await loadInstitution();
    } catch (error) {
      toast.update(toastId, { render: localizeText(error.reason || error.response?.data?.error || error.response?.data?.message || error.message), type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setPendingAction("");
    }
  }

  async function addDoctor(address = doctorAddress, options = {}) {
    const controlledByParent = Boolean(options.controlledByParent);
    if (busy && !controlledByParent) return false;
    if (!institution) {
      toast.error(t("Register an institution first"));
      return false;
    }
    if (!ethers.isAddress(address)) {
      toast.error(t("Enter a valid doctor wallet address"));
      return false;
    }
    if (!controlledByParent) setPendingAction("doctor");
    const toastId = toast.info(t("Adding doctor..."), { autoClose: 3000 });
    try {
      const tx = await addDoctorToInstitution(institution.institutionId, address);
      await tx.wait();
      await axios.post(
        `${API_URL}/api/institutions/${institution.institutionId}/doctors/${address}/link`,
        {},
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: t("Doctor added"), type: "success", isLoading: false, autoClose: 3000 });
      setDoctorAddress("");
      await loadInstitution();
      return true;
    } catch (error) {
      toast.update(toastId, { render: localizeText(error.reason || error.message), type: "error", isLoading: false, autoClose: 5000 });
      return false;
    } finally {
      if (!controlledByParent) setPendingAction("");
    }
  }

  async function removeDoctor(address) {
    if (busy) return;
    if (!institution) {
      toast.error(t("Register an institution first"));
      return;
    }
    setPendingAction("doctor");
    const toastId = toast.info(t("Removing doctor..."), { autoClose: 3000 });
    try {
      const tx = await removeDoctorFromInstitution(institution.institutionId, address);
      await tx.wait();
      await axios.delete(`${API_URL}/api/institutions/${institution.institutionId}/doctors/${address}/link`, {
        headers: await createAuthHeaders(walletAddress),
      });
      toast.update(toastId, { render: t("Doctor removed"), type: "success", isLoading: false, autoClose: 3000 });
      await loadInstitution();
    } catch (error) {
      toast.update(toastId, { render: localizeText(error.reason || error.message), type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setPendingAction("");
    }
  }

  async function copyAddress(address) {
    await navigator.clipboard.writeText(address);
    toast.success(t("Doctor wallet copied"));
  }

  async function updateMembership(request, status) {
    if (busy) return;
    setPendingAction(`membership-${request.id}`);
    try {
      if (status === "approved") {
        const doctorAdded = await addDoctor(request.doctorWallet, { controlledByParent: true });
        if (!doctorAdded) return;
      }
      await axios.patch(
        `${API_URL}/api/membership-requests/${request.id}`,
        { status },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success(localizeText(`Membership ${status}`));
      await loadInstitution();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message || localizeText(`Unable to mark membership ${status}`));
    } finally {
      setPendingAction("");
    }
  }

  function exportInstitutionAuditPdf() {
    const blob = createHealthTrustPdf({
      title: t("Institution Audit Report"),
      subtitle: t("Membership, shared-record, and access activity exported from HealthTrust."),
      meta: [
        { label: t("Institution"), value: institution?.name || t("Not registered") },
        { label: t("Admin wallet"), value: walletAddress },
        { label: t("Generated"), value: formatDate(new Date()) },
        { label: t("Events"), value: formatNumber(institutionAuditRows.length) },
        { label: t("Doctors"), value: formatNumber(doctors.length) },
        { label: t("Shared records"), value: formatNumber(activeSharedRecords) },
      ],
      sections: [
        {
          heading: t("Operational Summary"),
          accent: "#22b8aa",
          rows: [
            `${t("Pending membership requests")}: ${formatNumber(pendingMembership.length)}`,
            `${t("Monthly encrypted key events")}: ${formatNumber(monthlyAccessEvents)}`,
            `${t("Shared record categories")}: ${Object.entries(categoryCounts).map(([category, count]) => `${localizeText(category)} (${formatNumber(count)})`).join(", ") || t("None")}`,
          ],
        },
        {
          heading: t("Audit Timeline"),
          accent: "#0a84ff",
          rows: institutionAuditRows.map((row) => ({
            label: `${formatDate(row.timestamp)} - ${localizeText(row.action)}`,
            value: `${t("Target")}: ${localizeText(row.target)}${row.detail ? ` | ${localizeText(row.detail)}` : ""}`,
          })),
        },
        {
          heading: t("Security Note"),
          accent: "#ffb020",
          rows: [
            t("Encrypted files remain off-chain. The report summarizes permissions, key envelopes, membership actions, and blockchain events."),
            t("Revocation prevents future authorized access but cannot erase files that were already downloaded or decrypted."),
          ],
        },
      ],
      footer: t("HealthTrust institution audit report - Sepolia prototype"),
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "healthtrust-institution-audit-report.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">{t("Institution Workspace")}</p>
          <h1>{t("Organization Access")}</h1>
        </div>
        <button className="icon-button secondary" onClick={loadInstitution} aria-label={t("Refresh institution")}>
          <RefreshCw size={16} />
        </button>
      </div>

      <section className="stat-grid">
        <StatCard icon={Building2} label={t("Institution")} value={institution?.name || t("Not registered")} />
        <StatCard icon={Stethoscope} label={t("Doctors")} value={doctors.length} accent="green" />
        <StatCard icon={FileText} label={t("Shared records")} value={activeSharedRecords} />
        <StatCard icon={Building2} label={t("Pending joins")} value={pendingMembership.length} accent="amber" />
        <StatCard icon={BarChart3} label={t("Monthly access")} value={monthlyAccessEvents} accent="amber" />
      </section>

      <div className="tabs">
        {institutionTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
              {Icon && <Icon size={16} />}
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {activeTab === "institution" && (
        <section className="panel narrow">
          {institution ? (
            <div className="info-stack">
              <h2><Building2 size={18} />{institution.name}</h2>
              <span>{t("Type")}: {localizeText(institution.institutionType)}</span>
              <span>{t("On-chain ID")}: <bdi dir="ltr">{formatNumber(institution.institutionId)}</bdi></span>
              <span>{t("Admin")}: <bdi dir="ltr">{institution.adminWallet}</bdi></span>
              {contractStatus.stale && (
                <div className="notice">
                  <strong>{t("Contract sync needed")}</strong>
                  <span>{localizeText(contractStatus.message)}</span>
                  <span>{t("This usually happens after redeploying the smart contract. Register this institution again on the current contract to get a new on-chain ID for this wallet.")}</span>
                  <button onClick={() => registerCurrentInstitution(institution.name, institution.institutionType)} disabled={busy}>
                    {pendingAction === "institution" ? t("Waiting for MetaMask...") : t("Register on current contract")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form className="form-grid" onSubmit={createInstitution}>
              <label>
                {t("Institution name")}
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>
              <label>
                {t("Institution type")}
                <select value={form.institutionType} onChange={(event) => setForm({ ...form, institutionType: event.target.value })}>
                  <option value="hospital">{t("Hospital")}</option>
                  <option value="clinic">{t("Clinic")}</option>
                </select>
              </label>
              <button disabled={busy}>{pendingAction === "institution" ? t("Waiting for MetaMask...") : t("Register Institution")}</button>
            </form>
          )}
        </section>
      )}

      {activeTab === "analytics" && (
        <section className="panel request-list">
          <h3><BarChart3 size={18} />{t("Institution Analytics")}</h3>
          <article className="request-row">
            <div>
              <strong>{t("Operational Summary")}</strong>
              <span>{localizeText(`${doctors.length} registered doctor(s)`)}</span>
              <span>{localizeText(`${activeSharedRecords} active shared record(s)`)}</span>
              <span>{localizeText(`${pendingMembership.length} pending membership request(s)`)}</span>
              <span>{localizeText(`${monthlyAccessEvents} encrypted key event(s) this month`)}</span>
            </div>
          </article>
          <article className="request-row">
            <div>
              <strong>{t("Records by category")}</strong>
              {Object.keys(categoryCounts).length > 0 ? (
                Object.entries(categoryCounts).map(([category, count]) => (
                  <span key={category}>
                    {localizeText(category)}: {formatNumber(count)}
                  </span>
                ))
              ) : (
                <span>{t("No shared record categories yet.")}</span>
              )}
            </div>
          </article>
        </section>
      )}

      {activeTab === "doctors" && (
        <section className="panel">
          <div className="inline-form">
            <input value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} placeholder={t("Doctor wallet address")} />
            <button className="icon-button with-label" onClick={() => addDoctor()} disabled={!institution || busy}>
              <Plus size={16} />
              {t("Add")}
            </button>
          </div>
          <div className="doctor-list">
            {doctors.map((doctor) => (
              <div className="doctor-row" key={doctor}>
                <span><bdi dir="ltr">{doctor}</bdi></span>
                <div className="row-actions">
                  <button className="icon-button ghost" onClick={() => copyAddress(doctor)} aria-label={t("Copy doctor wallet")}>
                    <Clipboard size={16} />
                  </button>
                  <button className="icon-button" onClick={() => removeDoctor(doctor)} aria-label={t("Remove doctor")} disabled={busy}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {doctors.length === 0 && (
              <div className="empty-state">
                <Stethoscope size={28} />
                <strong>{t("No doctors yet")}</strong>
                <span>{t("Approved or manually added doctors will appear here.")}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "doctor_requests" && (
        <section className="panel request-list">
          <h3><UserRound size={18} />{t("Doctor Membership Requests")}</h3>
          {pendingMembership.map((request) => (
            <article className="request-row" key={request.id}>
              <div>
                <strong><bdi dir="ltr">{request.doctorWallet}</bdi></strong>
                <small>{localizeText(`Status: ${request.status}`)}</small>
                {request.message && <p>{request.message}</p>}
              </div>
              <div className="row-actions">
                <button onClick={() => updateMembership(request, "approved")} disabled={busy}>
                  <Check size={16} />
                  {t("Approve")}
                </button>
                <button className="secondary" onClick={() => updateMembership(request, "rejected")} aria-label={t("Reject")} disabled={busy}>
                  <X size={16} />
                </button>
              </div>
            </article>
          ))}
          {pendingMembership.length === 0 && (
            <div className="empty-state">
              <Stethoscope size={28} />
              <strong>{t("No Doctor Requests")}</strong>
              <span>{t("New doctor membership requests will appear here.")}</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "shared" && (
        <section className="panel record-list">
          <div className="panel-title-row">
            <h3><FileText size={18} />{t("Records Shared With This Institution")}</h3>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label={t("Filter category")}>
              <option value="all">{t("All categories")}</option>
              <option value="lab">{t("Lab")}</option>
              <option value="prescription">{t("Prescription")}</option>
              <option value="diagnosis">{t("Diagnosis")}</option>
              <option value="imaging">{t("Imaging")}</option>
              <option value="other">{t("Other")}</option>
            </select>
          </div>
          {filteredSharedRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              filename={metadata[record.id]?.title || metadata[record.id]?.filename}
              actions={
                <span className="badge shared-key-badge">
                  {formatNumber(sharedKeys.filter((key) => key.recordId === record.id).length)} {t("Doctor Key(s)")}
                </span>
              }
            />
          ))}
          {filteredSharedRecords.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <strong>{t("No Shared Records Yet")}</strong>
              <span>{t("Records granted to this institution will appear here.")}</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="panel">
          <div className="panel-title-row">
            <h2><ClipboardList size={18} />{t("Institution Audit Timeline")}</h2>
            <button className="icon-button with-label secondary" onClick={exportInstitutionAuditPdf} disabled={institutionAuditRows.length === 0}>
              <Download size={16} />
              {t("Export PDF")}
            </button>
          </div>
          {institutionAuditRows.length > 0 ? (
            <div className="timeline">
              {institutionAuditRows.map((row, index) => (
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
              <FileText size={28} />
              <strong>{t("No Audit Events Yet")}</strong>
              <span>{t("Membership, shared record, and encrypted key events will appear here.")}</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "notifications" && <NotificationsPanel />}
      {activeTab === "security" && <SecurityModel />}
    </main>
  );
}
