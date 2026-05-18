import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, Clipboard, Check, FileText, Plus, RefreshCw, Stethoscope, Trash2, X } from "lucide-react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import NotificationsPanel from "../components/NotificationsPanel";
import RecordCard from "../components/RecordCard";
import StatCard from "../components/StatCard";
import {
  addDoctorToInstitution,
  getAllInstitutionsFromChain,
  getInstitutionSharedRecords,
  getInstitutionDoctors,
  parseReceiptEvent,
  registerInstitution,
  removeDoctorFromInstitution,
} from "../utils/contractHelper";
import { createAuthHeaders } from "../utils/auth";

export default function InstitutionDashboard() {
  const { walletAddress, API_URL } = useWallet();
  const [activeTab, setActiveTab] = useState("institution");
  const [institution, setInstitution] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorAddress, setDoctorAddress] = useState("");
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [sharedKeys, setSharedKeys] = useState([]);
  const [sharedRecords, setSharedRecords] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [form, setForm] = useState({ name: "", institutionType: "hospital" });

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
        toast.warn("This institution record is not owned by the connected wallet on the current contract.");
      }
      const doctorList = await getInstitutionDoctors(found.institutionId);
      setDoctors(doctorList);
      const keys = await axios.get(`${API_URL}/api/record-keys/institution/${found.institutionId}`, { headers });
      setSharedKeys(keys.data);
      const records = await getInstitutionSharedRecords(found.institutionId);
      setSharedRecords(records);
      const ids = records.map((record) => record.id).join(",");
      if (ids) {
        const meta = await axios.get(`${API_URL}/api/records/metadata/bulk?ids=${ids}`);
        setMetadata(Object.fromEntries(meta.data.map((row) => [row.recordId, row])));
      } else {
        setMetadata({});
      }
    } else {
      setDoctors([]);
      setSharedKeys([]);
      setSharedRecords([]);
      setMetadata({});
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

  async function createInstitution(event) {
    event.preventDefault();
    const toastId = toast.loading("Registering institution...");
    try {
      const tx = await registerInstitution(form.name, form.institutionType);
      const receipt = await tx.wait();
      const eventLog = await parseReceiptEvent(receipt, "InstitutionRegistered");
      const institutionId = Number(eventLog.args.institutionId);
      await axios.post(
        `${API_URL}/api/institutions/register`,
        { name: form.name, institutionType: form.institutionType, adminWallet: walletAddress, institutionId },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: "Institution registered", type: "success", isLoading: false, autoClose: 3000 });
      await loadInstitution();
    } catch (error) {
      toast.update(toastId, { render: error.reason || error.response?.data?.message || error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  async function addDoctor(address = doctorAddress) {
    if (!institution) {
      toast.error("Register an institution first");
      return false;
    }
    if (!ethers.isAddress(address)) {
      toast.error("Enter a valid doctor wallet address");
      return false;
    }
    const toastId = toast.loading("Adding doctor...");
    try {
      const tx = await addDoctorToInstitution(institution.institutionId, address);
      await tx.wait();
      toast.update(toastId, { render: "Doctor added", type: "success", isLoading: false, autoClose: 3000 });
      setDoctorAddress("");
      await loadInstitution();
      return true;
    } catch (error) {
      toast.update(toastId, { render: error.reason || error.message, type: "error", isLoading: false, autoClose: 5000 });
      return false;
    }
  }

  async function removeDoctor(address) {
    if (!institution) {
      toast.error("Register an institution first");
      return;
    }
    const toastId = toast.loading("Removing doctor...");
    try {
      const tx = await removeDoctorFromInstitution(institution.institutionId, address);
      await tx.wait();
      await axios.post(
        `${API_URL}/api/notifications`,
        {
          wallet: address,
          type: "membership_removed",
          title: "Removed from institution",
          message: `You were removed from ${institution.name}.`,
        },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.update(toastId, { render: "Doctor removed", type: "success", isLoading: false, autoClose: 3000 });
      await loadInstitution();
    } catch (error) {
      toast.update(toastId, { render: error.reason || error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  async function copyAddress(address) {
    await navigator.clipboard.writeText(address);
    toast.success("Doctor wallet copied");
  }

  async function updateMembership(request, status) {
    try {
      if (status === "approved") {
        const doctorAdded = await addDoctor(request.doctorWallet);
        if (!doctorAdded) return;
      }
      await axios.patch(
        `${API_URL}/api/membership-requests/${request.id}`,
        { status },
        { headers: await createAuthHeaders(walletAddress) }
      );
      toast.success(`Membership ${status}`);
      await loadInstitution();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || `Unable to mark membership ${status}`);
    }
  }

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Institution workspace</p>
          <h1>Organization access</h1>
        </div>
        <button className="icon-button secondary" onClick={loadInstitution} aria-label="Refresh institution">
          <RefreshCw size={16} />
        </button>
      </div>

      <section className="stat-grid">
        <StatCard icon={Building2} label="Institution" value={institution?.name || "Not registered"} />
        <StatCard icon={Stethoscope} label="Doctors" value={doctors.length} accent="green" />
        <StatCard icon={FileText} label="Shared records" value={activeSharedRecords} />
        <StatCard icon={Building2} label="Pending joins" value={pendingMembership.length} accent="amber" />
      </section>

      <div className="tabs">
        {["institution", "doctors", "doctor_requests", "shared", "notifications"].map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab === "institution" ? "My Institution" : tab === "doctor_requests" ? "Doctor Requests" : tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "institution" && (
        <section className="panel narrow">
          {institution ? (
            <div className="info-stack">
              <h2>{institution.name}</h2>
              <span>Type: {institution.institutionType}</span>
              <span>On-chain ID: {institution.institutionId}</span>
              <span>Admin: {institution.adminWallet}</span>
            </div>
          ) : (
            <form className="form-grid" onSubmit={createInstitution}>
              <label>
                Institution name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>
              <label>
                Institution type
                <select value={form.institutionType} onChange={(event) => setForm({ ...form, institutionType: event.target.value })}>
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                </select>
              </label>
              <button>Register Institution</button>
            </form>
          )}
        </section>
      )}

      {activeTab === "doctors" && (
        <section className="panel">
          <div className="inline-form">
            <input value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} placeholder="Doctor wallet address" />
            <button className="icon-button with-label" onClick={() => addDoctor()} disabled={!institution}>
              <Plus size={16} />
              Add
            </button>
          </div>
          <div className="doctor-list">
            {doctors.map((doctor) => (
              <div className="doctor-row" key={doctor}>
                <span>{doctor}</span>
                <div className="row-actions">
                  <button className="icon-button ghost" onClick={() => copyAddress(doctor)} aria-label="Copy doctor wallet">
                    <Clipboard size={16} />
                  </button>
                  <button className="icon-button" onClick={() => removeDoctor(doctor)} aria-label="Remove doctor">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {doctors.length === 0 && (
              <div className="empty-state">
                <Stethoscope size={28} />
                <strong>No doctors yet</strong>
                <span>Approved or manually added doctors will appear here.</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "doctor_requests" && (
        <section className="panel request-list">
          <h3>Doctor membership requests</h3>
          {pendingMembership.map((request) => (
            <article className="request-row" key={request.id}>
              <div>
                <strong>{request.doctorWallet}</strong>
                <small>Status: {request.status}</small>
                {request.message && <p>{request.message}</p>}
              </div>
              <div className="row-actions">
                <button onClick={() => updateMembership(request, "approved")}>
                  <Check size={16} />
                  Approve
                </button>
                <button className="secondary" onClick={() => updateMembership(request, "rejected")} aria-label="Reject request">
                  <X size={16} />
                </button>
              </div>
            </article>
          ))}
          {pendingMembership.length === 0 && (
            <div className="empty-state">
              <Stethoscope size={28} />
              <strong>No doctor requests</strong>
              <span>New doctor membership requests will appear here.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "shared" && (
        <section className="panel record-list">
          <h3>Records shared with this institution</h3>
          {sharedRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              filename={metadata[record.id]?.title || metadata[record.id]?.filename}
              actions={
                <span className="badge">
                  {sharedKeys.filter((key) => key.recordId === record.id).length} doctor key(s)
                </span>
              }
            />
          ))}
          {sharedRecords.length === 0 && (
            <div className="empty-state">
              <FileText size={28} />
              <strong>No shared records yet</strong>
              <span>Records granted to this institution will appear here.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === "notifications" && <NotificationsPanel />}
    </main>
  );
}
