import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, Check, Clipboard, KeyRound, LoaderCircle, RotateCw, Stethoscope, X } from "lucide-react";
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
import { createAuthHeaders } from "../utils/auth";

export default function AccessModal({ record, aesKey, keyRows = [], onRefresh, onClose }) {
  const { API_URL, walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState("doctor");
  const [doctorAddress, setDoctorAddress] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [visibleKeyRows, setVisibleKeyRows] = useState(keyRows);
  const [accessStatus, setAccessStatus] = useState(null);
  const busy = accessStatus?.state === "working";

  useEffect(() => {
    let active = true;
    setLoadingInstitutions(true);
    axios
      .get(`${API_URL}/api/institutions`)
      .then((response) => {
        if (!active) return;
        setInstitutions(response.data);
        if (response.data[0]) setInstitutionId(String(response.data[0].institutionId));
      })
      .catch((error) => toast.error(error.response?.data?.message || error.message || "Unable to load institutions"))
      .finally(() => {
        if (active) setLoadingInstitutions(false);
      });
    return () => {
      active = false;
    };
  }, [API_URL]);

  useEffect(() => {
    setVisibleKeyRows(keyRows);
  }, [keyRows]);

  const directKeys = visibleKeyRows.filter((key) => key.recordId === record.id && key.accessType === "doctor");
  const institutionKeys = visibleKeyRows.filter((key) => key.recordId === record.id && key.accessType === "institution");

  async function copyWallet(address) {
    await navigator.clipboard.writeText(address);
    toast.success("Wallet copied");
  }

  async function refreshKeyRows() {
    const response = await axios.get(`${API_URL}/api/record-keys/owned`, {
      headers: await createAuthHeaders(walletAddress),
    });
    setVisibleKeyRows(response.data);
    return response.data;
  }

  async function refreshEverywhere() {
    await refreshKeyRows();
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        toast.warn(error.response?.data?.message || error.message || "Dashboard refresh failed. Modal data was refreshed.");
      }
    }
  }

  async function runTransaction(action, pendingMessage, successMessage, after) {
    const toastId = toast.info(pendingMessage, { autoClose: 3000 });
    setAccessStatus({ state: "working", title: pendingMessage, detail: "Confirm the transaction in MetaMask." });
    try {
      const tx = await action();
      setAccessStatus({
        state: "working",
        title: "Transaction submitted",
        detail: "Waiting for Sepolia confirmation.",
        txHash: tx.hash,
      });
      await tx.wait();
      setAccessStatus({
        state: "working",
        title: "Updating access list",
        detail: "Saving key envelope changes and refreshing this modal.",
        txHash: tx.hash,
      });
      if (after) await after();
      toast.update(toastId, { render: successMessage, type: "success", isLoading: false, autoClose: 3000 });
      await refreshEverywhere();
      setAccessStatus({
        state: "success",
        title: successMessage,
        detail: "The access list below is up to date.",
        txHash: tx.hash,
      });
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.reason || error.message || "Access update failed";
      setAccessStatus({
        state: "error",
        title: "Access update failed",
        detail: typeof message === "string" ? message : JSON.stringify(message),
      });
      toast.update(toastId, {
        render: typeof message === "string" ? message : "Access update failed",
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
    const toastId = toast.info("Resending key...", { autoClose: 3000 });
    setAccessStatus({ state: "working", title: "Resending key", detail: "Saving a fresh encrypted key envelope." });
    try {
      await shareDoctorKey(target);
      toast.update(toastId, { render: "Key resent", type: "success", isLoading: false, autoClose: 3000 });
      await refreshEverywhere();
      setAccessStatus({ state: "success", title: "Key resent", detail: "The key envelope list is up to date." });
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to resend key";
      setAccessStatus({ state: "error", title: "Unable to resend key", detail: message });
      toast.update(toastId, {
        render: message,
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

    const toastId = toast.info("Sharing institution keys...", { autoClose: 3000 });
    setAccessStatus({ state: "working", title: "Sharing institution keys", detail: "Creating key envelopes for institution doctors." });
    try {
      const doctors = await getInstitutionDoctors(institution.institutionId);
      if (doctors.length === 0) throw new Error("This institution has no doctors to receive the encrypted key.");
      const envelopes = await buildInstitutionKeyEnvelopes(API_URL, institution, doctors, record, aesKey);
      await storeKeyEnvelopes(API_URL, walletAddress, envelopes);
      toast.update(toastId, { render: "Institution keys shared", type: "success", isLoading: false, autoClose: 3000 });
      await refreshEverywhere();
      setAccessStatus({ state: "success", title: "Institution keys shared", detail: "The institution key envelope list is up to date." });
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to share institution keys";
      setAccessStatus({ state: "error", title: "Unable to share institution keys", detail: message });
      toast.update(toastId, {
        render: message,
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

        {accessStatus && (
          <div className={`access-status ${accessStatus.state}`}>
            <div className="access-status-main">
              {accessStatus.state === "working" && <LoaderCircle className="spin-icon" size={18} />}
              {accessStatus.state === "success" && <Check size={18} />}
              {accessStatus.state === "error" && <X size={18} />}
              <div>
                <strong>{accessStatus.title}</strong>
                <span>{accessStatus.detail}</span>
              </div>
            </div>
            {accessStatus.txHash && (
              <a className="icon-link compact" href={`https://sepolia.etherscan.io/tx/${accessStatus.txHash}`} target="_blank" rel="noreferrer">
                View tx
              </a>
            )}
          </div>
        )}

        {activeTab === "doctor" ? (
          <div className="form-grid">
            <label>
              Doctor wallet address
              <input value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} />
            </label>
            <div className="button-row">
              <button onClick={grantDoctor} disabled={busy}>
                <KeyRound size={16} />
                Grant
              </button>
              <button className="secondary" onClick={() => revokeDoctor()} disabled={busy}>
                Revoke
              </button>
            </div>
            <h3>Doctors With Key Envelopes</h3>
            <div className="request-list">
              {directKeys.map((key) => (
                <div className="request-row" key={key.id}>
                  <span>{key.recipientWallet}</span>
                  <div className="row-actions">
                    <button className="icon-button ghost" onClick={() => copyWallet(key.recipientWallet)} aria-label="Copy wallet">
                      <Clipboard size={16} />
                    </button>
                    <button className="icon-button ghost" onClick={() => resendDoctorKey(key.recipientWallet)} aria-label="Resend key" disabled={busy}>
                      <RotateCw size={16} />
                    </button>
                    <button className="secondary" onClick={() => revokeDoctor(key.recipientWallet)} disabled={busy}>
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
              <select
                value={institutionId}
                onChange={(event) => setInstitutionId(event.target.value)}
                disabled={loadingInstitutions || institutions.length === 0}
              >
                {(loadingInstitutions || institutions.length === 0) && (
                  <option value="">{loadingInstitutions ? "Loading institutions..." : "No institutions available"}</option>
                )}
                {institutions.map((institution) => (
                  <option key={institution.institutionId} value={institution.institutionId}>
                    {institution.name} ({institution.institutionType})
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button onClick={grantInstitution} disabled={loadingInstitutions || institutions.length === 0 || busy}>
                <KeyRound size={16} />
                Grant
              </button>
              <button className="secondary" onClick={reshareInstitutionKeys} disabled={loadingInstitutions || institutions.length === 0 || busy}>
                Share keys
              </button>
              <button className="secondary" onClick={() => revokeInstitution()} disabled={loadingInstitutions || institutions.length === 0 || busy}>
                Revoke
              </button>
            </div>
            <h3>Institution Key Envelopes</h3>
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
                  <strong>No Institution Sharing Yet</strong>
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
