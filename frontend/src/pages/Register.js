import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import { parseReceiptEvent, registerInstitution } from "../utils/contractHelper";
import { createAuthHeaders } from "../utils/auth";
import { getEncryptionPublicKey } from "../utils/keySharing";
import { useLanguage } from "../i18n";

export default function Register() {
  const { walletAddress, API_URL, fetchProfile } = useWallet();
  const { t } = useLanguage();
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "patient",
    institutionId: "",
    institutionName: "",
    institutionType: "hospital",
    bloodType: "",
    allergies: "",
    chronicConditions: "",
    emergencyContact: "",
  });

  useEffect(() => {
    let active = true;
    setLoadingInstitutions(true);
    axios
      .get(`${API_URL}/api/institutions`)
      .then((response) => {
        if (active) setInstitutions(response.data);
      })
      .catch((error) => toast.error(error.response?.data?.message || error.message || "Unable to load institutions"))
      .finally(() => {
        if (active) setLoadingInstitutions(false);
      });
    return () => {
      active = false;
    };
  }, [API_URL]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const requestedInstitutionId = form.role === "doctor" && form.institutionId ? Number(form.institutionId) : undefined;
    let institutionId = form.role === "doctor" ? undefined : form.institutionId ? Number(form.institutionId) : undefined;

    try {
      if (form.role === "institution_admin") {
        const toastId = toast.info("Registering institution on-chain...", { autoClose: 3000 });
        const tx = await registerInstitution(form.institutionName, form.institutionType);
        const receipt = await tx.wait();
        const eventLog = await parseReceiptEvent(receipt, "InstitutionRegistered");
        institutionId = Number(eventLog.args.institutionId);

        await axios.post(`${API_URL}/api/institutions/register`, {
          name: form.institutionName,
          institutionType: form.institutionType,
          adminWallet: walletAddress,
          institutionId,
        }, {
          headers: await createAuthHeaders(walletAddress),
        });

        toast.update(toastId, { render: "Institution registered", type: "success", isLoading: false, autoClose: 3000 });
      }

      let encryptionPublicKey = "";
      if (form.role !== "institution_admin") {
        try {
          encryptionPublicKey = await getEncryptionPublicKey(walletAddress);
        } catch (error) {
          toast.warn("Profile saved without encryption public key. Secure key sharing will be limited until you register it.");
        }
      }

      const authHeaders = await createAuthHeaders(walletAddress);
      await axios.post(`${API_URL}/api/users/register`, {
        wallet: walletAddress,
        name: form.name,
        email: form.email,
        role: form.role,
        institutionId,
        encryptionPublicKey,
        bloodType: form.bloodType,
        allergies: form.allergies,
        chronicConditions: form.chronicConditions,
        emergencyContact: form.emergencyContact,
      }, {
        headers: authHeaders,
      });
      if (form.role === "doctor" && requestedInstitutionId) {
        try {
          await axios.post(
            `${API_URL}/api/membership-requests`,
            {
              institutionId: requestedInstitutionId,
              message: `${form.name} requested institution membership during doctor registration.`,
            },
            { headers: authHeaders }
          );
          toast.success("Institution membership request sent");
        } catch (error) {
          if (error.response?.status === 409) {
            toast.info(error.response.data.message);
          } else {
            toast.error(error.response?.data?.message || error.message || "Profile saved, but membership request failed");
          }
        }
      }
      await fetchProfile(walletAddress);
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error.reason || error.response?.data?.message || error.message || "Unable to save profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="panel narrow register-panel">
      <h1>{t("Register")}</h1>
      <form className="form-grid" onSubmit={submit}>
        <label>
          {t("Name")}
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label>
          {t("Email")}
          <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </label>
        <label>
          {t("Role")}
          <select value={form.role} onChange={(event) => update("role", event.target.value)}>
            <option value="patient">{t("Patient")}</option>
            <option value="doctor">{t("Doctor")}</option>
            <option value="institution_admin">{t("Institution Admin")}</option>
          </select>
        </label>

        {form.role === "doctor" && (
          <label>
            {t("Institution")}
            <select value={form.institutionId} onChange={(event) => update("institutionId", event.target.value)} disabled={loadingInstitutions}>
              <option value="">{loadingInstitutions ? t("Loading institutions...") : t("None")}</option>
              {institutions.map((institution) => (
                <option key={institution.institutionId} value={institution.institutionId}>
                  {institution.name} ({institution.institutionType})
                </option>
              ))}
            </select>
          </label>
        )}

        {form.role === "patient" && (
          <>
            <label>
              {t("Blood type")}
              <select value={form.bloodType} onChange={(event) => update("bloodType", event.target.value)}>
                <option value="">{t("Select")}</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </label>
            <label>
              {t("Allergies")}
              <input value={form.allergies} onChange={(event) => update("allergies", event.target.value)} />
            </label>
            <label>
              {t("Chronic conditions")}
              <input value={form.chronicConditions} onChange={(event) => update("chronicConditions", event.target.value)} />
            </label>
            <label>
              {t("Emergency contact")}
              <input value={form.emergencyContact} onChange={(event) => update("emergencyContact", event.target.value)} />
            </label>
          </>
        )}

        {form.role === "institution_admin" && (
          <>
            <label>
              {t("Institution name")}
              <input
                value={form.institutionName}
                onChange={(event) => update("institutionName", event.target.value)}
                required
              />
            </label>
            <label>
              {t("Institution type")}
              <select value={form.institutionType} onChange={(event) => update("institutionType", event.target.value)}>
                <option value="hospital">{t("Hospital")}</option>
                <option value="clinic">{t("Clinic")}</option>
              </select>
            </label>
          </>
        )}

        <button disabled={isSubmitting}>{isSubmitting ? t("Waiting for MetaMask...") : t("Save Profile")}</button>
      </form>
    </main>
  );
}
