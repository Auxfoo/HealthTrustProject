import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, Clipboard, Plus, RefreshCw, Stethoscope, Trash2 } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import StatCard from "../components/StatCard";
import {
  addDoctorToInstitution,
  getInstitutionDoctors,
  parseReceiptEvent,
  registerInstitution,
  removeDoctorFromInstitution,
} from "../utils/contractHelper";

export default function InstitutionDashboard() {
  const { walletAddress, API_URL } = useWallet();
  const [activeTab, setActiveTab] = useState("institution");
  const [institution, setInstitution] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorAddress, setDoctorAddress] = useState("");
  const [form, setForm] = useState({ name: "", institutionType: "hospital" });

  async function loadInstitution() {
    const response = await axios.get(`${API_URL}/api/institutions`);
    const found = response.data.find((item) => item.adminWallet.toLowerCase() === walletAddress.toLowerCase());
    setInstitution(found || null);
    if (found) {
      const doctorList = await getInstitutionDoctors(found.institutionId);
      setDoctors(doctorList);
    }
  }

  useEffect(() => {
    if (walletAddress) loadInstitution();
  }, [walletAddress]);

  async function createInstitution(event) {
    event.preventDefault();
    const toastId = toast.loading("Registering institution...");
    try {
      const tx = await registerInstitution(form.name, form.institutionType);
      const receipt = await tx.wait();
      const eventLog = await parseReceiptEvent(receipt, "InstitutionRegistered");
      const institutionId = Number(eventLog.args.institutionId);
      await axios.post(`${API_URL}/api/institutions/register`, {
        name: form.name,
        institutionType: form.institutionType,
        adminWallet: walletAddress,
        institutionId,
      });
      toast.update(toastId, { render: "Institution registered", type: "success", isLoading: false, autoClose: 3000 });
      await loadInstitution();
    } catch (error) {
      toast.update(toastId, { render: error.reason || error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  async function addDoctor() {
    const toastId = toast.loading("Adding doctor...");
    try {
      const tx = await addDoctorToInstitution(institution.institutionId, doctorAddress);
      await tx.wait();
      toast.update(toastId, { render: "Doctor added", type: "success", isLoading: false, autoClose: 3000 });
      setDoctorAddress("");
      await loadInstitution();
    } catch (error) {
      toast.update(toastId, { render: error.reason || error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  async function removeDoctor(address) {
    const toastId = toast.loading("Removing doctor...");
    try {
      const tx = await removeDoctorFromInstitution(institution.institutionId, address);
      await tx.wait();
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
        <StatCard icon={Building2} label="Type" value={institution?.institutionType || form.institutionType} accent="amber" />
      </section>

      <div className="tabs">
        <button className={activeTab === "institution" ? "active" : ""} onClick={() => setActiveTab("institution")}>
          My Institution
        </button>
        <button className={activeTab === "doctors" ? "active" : ""} onClick={() => setActiveTab("doctors")}>
          Manage Doctors
        </button>
      </div>

      {activeTab === "institution" ? (
        <section className="panel narrow">
          {institution ? (
            <div className="info-stack">
              <h2>{institution.name}</h2>
              <span>Type: {institution.institutionType}</span>
              <span>On-chain ID: {institution.institutionId}</span>
            </div>
          ) : (
            <form className="form-grid" onSubmit={createInstitution}>
              <label>
                Institution name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>
              <label>
                Institution type
                <select
                  value={form.institutionType}
                  onChange={(event) => setForm({ ...form, institutionType: event.target.value })}
                >
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                </select>
              </label>
              <button>Register Institution</button>
            </form>
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="inline-form">
            <input
              value={doctorAddress}
              onChange={(event) => setDoctorAddress(event.target.value)}
              placeholder="Doctor wallet address"
            />
            <button className="icon-button with-label" onClick={addDoctor} disabled={!institution}>
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
                <strong>No doctors added</strong>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
