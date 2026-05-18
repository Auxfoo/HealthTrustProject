import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import { parseReceiptEvent, registerInstitution } from "../utils/contractHelper";

export default function Register() {
  const { walletAddress, API_URL, fetchProfile } = useWallet();
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "patient",
    institutionId: "",
    institutionName: "",
    institutionType: "hospital",
  });

  useEffect(() => {
    axios.get(`${API_URL}/api/institutions`).then((response) => setInstitutions(response.data));
  }, [API_URL]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    let institutionId = form.institutionId ? Number(form.institutionId) : undefined;

    if (form.role === "institution_admin") {
      const toastId = toast.loading("Registering institution on-chain...");
      try {
        const tx = await registerInstitution(form.institutionName, form.institutionType);
        const receipt = await tx.wait();
        const eventLog = await parseReceiptEvent(receipt, "InstitutionRegistered");
        institutionId = Number(eventLog.args.institutionId);

        await axios.post(`${API_URL}/api/institutions/register`, {
          name: form.institutionName,
          institutionType: form.institutionType,
          adminWallet: walletAddress,
          institutionId,
        });

        toast.update(toastId, { render: "Institution registered", type: "success", isLoading: false, autoClose: 3000 });
      } catch (error) {
        toast.update(toastId, {
          render: error.reason || error.message,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }
    }

    await axios.post(`${API_URL}/api/users/register`, {
      wallet: walletAddress,
      name: form.name,
      email: form.email,
      role: form.role,
      institutionId,
    });
    await fetchProfile(walletAddress);
    toast.success("Profile saved");
  }

  return (
    <main className="panel narrow">
      <h1>Register</h1>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Name
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </label>
        <label>
          Role
          <select value={form.role} onChange={(event) => update("role", event.target.value)}>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="institution_admin">Institution Admin</option>
          </select>
        </label>

        {form.role === "doctor" && (
          <label>
            Institution
            <select value={form.institutionId} onChange={(event) => update("institutionId", event.target.value)}>
              <option value="">None</option>
              {institutions.map((institution) => (
                <option key={institution.institutionId} value={institution.institutionId}>
                  {institution.name} ({institution.institutionType})
                </option>
              ))}
            </select>
          </label>
        )}

        {form.role === "institution_admin" && (
          <>
            <label>
              Institution name
              <input
                value={form.institutionName}
                onChange={(event) => update("institutionName", event.target.value)}
                required
              />
            </label>
            <label>
              Institution type
              <select value={form.institutionType} onChange={(event) => update("institutionType", event.target.value)}>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
              </select>
            </label>
          </>
        )}

        <button>Save Profile</button>
      </form>
    </main>
  );
}
