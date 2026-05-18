import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, Clipboard, KeyRound, RotateCw, Stethoscope, X } from "lucide-react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  getInstitutionDoctors,
  grantAccessToDoctor,
  grantAccessToInstitution,
  revokeAccessFromDoctor,
  revokeAccessFromInstitution,
} from "../utils/contractHelper";
import {
  buildDoctorKeyEnvelope,
  buildInstitutionKeyEnvelopes,
  deleteKeyEnvelope,
  storeKeyEnvelope,
  storeKeyEnvelopes,
} from "../utils/recordSharing";

export default function AccessModal({ record, aesKey, keyRows = [], onRefresh, onClose }) {
  const { API_URL, walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState("doctor");
  const [doctorAddress, setDoctorAddress] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/institutions`).then((response) => {
      setInstitutions(response.data);
      if (response.data[0]) setInstitutionId(String(response.data[0].institutionId));
    });
  }, [API_URL]);

  const directKeys = keyRows.filter((key) => key.recordId === record.id && key.accessType === "doctor");
  const institutionKeys = keyRows.filter((key) => key.recordId === record.id && key.accessType === "institution");

  async function copyWallet(address) {
    await navigator.clipboard.writeText(address);
    toast.success("Wallet copied");
  }

  async function runTransaction(action, pendingMessage, successMessage, after) {
    const toastId = toast.loading(pendingMessage);
    try {
      const tx = await action();
      await tx.wait();
      if (after) await after();
      toast.update(toastId, { render: successMessage, type: "success", isLoading: false, autoClose: 3000 });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.update(toastId, {
        render: error.reason || error.message,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  async function shareDoctorKey(target = doctorAddress) {
    if (!aesKey) throw new Error("AES key is not available in this browser. Re-upload or paste the key first.");
    const envelope = await buildDoctorKeyEnvelope(API_URL, walletAddress, target, record, aesKey);
    await storeKeyEnvelope(API_URL, walletAddress, envelope);
  }

  async function resendDoctorKey(target) {
    const toastId = toast.loading("Resending key...");
    try {
      await shareDoctorKey(target);
      toast.update(toastId, { render: "Key resent", type: "success", isLoading: false, autoClose: 3000 });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || error.message,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  async function grantDoctor() {
    if (!ethers.isAddress(doctorAddress)) {
      toast.error("Enter a valid doctor wallet address");
      return;
    }
    if (!aesKey) {
      toast.error("AES key is not available in this browser. Re-upload or paste the key first.");
      return;
    }
    let envelope;
    try {
      envelope = await buildDoctorKeyEnvelope(API_URL, walletAddress, doctorAddress, record, aesKey);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      return;
    }
    await runTransaction(
      () => grantAccessToDoctor(record.id, doctorAddress),
      "Granting doctor access...",
      "Doctor access granted",
      () => storeKeyEnvelope(API_URL, walletAddress, envelope)
    );
  }

  async function revokeDoctor(target = doctorAddress) {
    if (!ethers.isAddress(target)) {
      toast.error("Enter a valid doctor wallet address");
      return;
    }
    await runTransaction(
      () => revokeAccessFromDoctor(record.id, target),
      "Revoking doctor access...",
      "Doctor access revoked",
      () => deleteKeyEnvelope(API_URL, walletAddress, { recordId: record.id, recipientWallet: target })
    );
  }

  async function grantInstitution() {
    const institution = institutions.find((item) => String(item.institutionId) === String(institutionId));
    if (!institution) return toast.error("Choose an institution");
    if (!aesKey) return toast.error("AES key is not available in this browser. Re-upload or paste the key first.");
    let envelopes = [];
    try {
      const doctors = await getInstitutionDoctors(institution.institutionId);
      if (doctors.length === 0) {
        toast.error("This institution has no doctors to receive the encrypted key.");
        return;
      }
      envelopes = await buildInstitutionKeyEnvelopes(API_URL, institution, doctors, record, aesKey);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      return;
    }
    await runTransaction(
      () => grantAccessToInstitution(record.id, institution.institutionId),
      "Granting institution access...",
      "Institution access granted",
      () => storeKeyEnvelopes(API_URL, walletAddress, envelopes)
    );
  }

  async function reshareInstitutionKeys() {
    const institution = institutions.find((item) => String(item.institutionId) === String(institutionId));
    if (!institution) return toast.error("Choose an institution");
    if (!aesKey) return toast.error("AES key is not available in this browser. Re-upload or paste the key first.");

    const toastId = toast.loading("Sharing institution keys...");
    try {
      const doctors = await getInstitutionDoctors(institution.institutionId);
      if (doctors.length === 0) throw new Error("This institution has no doctors to receive the encrypted key.");
      const envelopes = await buildInstitutionKeyEnvelopes(API_URL, institution, doctors, record, aesKey);
      await storeKeyEnvelopes(API_URL, walletAddress, envelopes);
      toast.update(toastId, { render: "Institution keys shared", type: "success", isLoading: false, autoClose: 3000 });
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || error.message,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  async function revokeInstitution(target = institutionId) {
    if (!target) {
      toast.error("Choose an institution");
      return;
    }
    await runTransaction(
      () => revokeAccessFromInstitution(record.id, target),
      "Revoking institution access...",
      "Institution access revoked",
      () => deleteKeyEnvelope(API_URL, walletAddress, { recordId: record.id, accessType: "institution", accessTarget: String(target) })
    );
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-header">
          <div>
            <h2>Record #{record.id}</h2>
            <span>{record.cid}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="segmented">
          <button className={activeTab === "doctor" ? "active" : ""} onClick={() => setActiveTab("doctor")}>
            <Stethoscope size={16} />
            Doctor
          </button>
          <button className={activeTab === "institution" ? "active" : ""} onClick={() => setActiveTab("institution")}>
            <Building2 size={16} />
            Institution
          </button>
        </div>

        <p className="notice">
          Revoking access stops future authorized access and removes shared encrypted keys. It cannot remove copies that were
          already decrypted or downloaded.
        </p>

        {activeTab === "doctor" ? (
          <div className="form-grid">
            <label>
              Doctor wallet address
              <input value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} />
            </label>
            <div className="button-row">
              <button onClick={grantDoctor}>Grant</button>
              <button className="secondary" onClick={() => revokeDoctor()}>
                Revoke
              </button>
            </div>
            <h3>Doctors with key envelopes</h3>
            <div className="request-list">
              {directKeys.map((key) => (
                <div className="request-row" key={key.id}>
                  <span>{key.recipientWallet}</span>
                  <div className="row-actions">
                    <button className="icon-button ghost" onClick={() => copyWallet(key.recipientWallet)} aria-label="Copy wallet">
                      <Clipboard size={16} />
                    </button>
                    <button className="icon-button ghost" onClick={() => resendDoctorKey(key.recipientWallet)} aria-label="Resend key">
                      <RotateCw size={16} />
                    </button>
                    <button className="secondary" onClick={() => revokeDoctor(key.recipientWallet)}>
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
              {directKeys.length === 0 && (
                <div className="empty-state">
                  <Stethoscope size={24} />
                  <strong>No doctors shared yet</strong>
                  <span>Doctor key envelopes will appear here after access is granted.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-grid">
            <label>
              Registered institution
              <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} disabled={institutions.length === 0}>
                {institutions.length === 0 && <option value="">No institutions available</option>}
                {institutions.map((institution) => (
                  <option key={institution.institutionId} value={institution.institutionId}>
                    {institution.name} ({institution.institutionType})
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button onClick={grantInstitution} disabled={institutions.length === 0}>
                <KeyRound size={16} />
                Grant
              </button>
              <button className="secondary" onClick={reshareInstitutionKeys} disabled={institutions.length === 0}>
                Share keys
              </button>
              <button className="secondary" onClick={() => revokeInstitution()} disabled={institutions.length === 0}>
                Revoke
              </button>
            </div>
            <h3>Institution key envelopes</h3>
            <div className="request-list">
              {institutionKeys.map((key) => (
                <div className="request-row" key={key.id}>
                  <span>
                    Institution #{key.accessTarget} doctor {key.recipientWallet}
                  </span>
                </div>
              ))}
              {institutionKeys.length === 0 && (
                <div className="empty-state">
                  <Building2 size={24} />
                  <strong>No institution sharing yet</strong>
                  <span>Institution doctor key envelopes will appear here after access is granted.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
