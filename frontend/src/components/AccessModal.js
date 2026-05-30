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
import { useLanguage } from "../i18n";

export default function AccessModal({ record, aesKey, keyRows = [], onRefresh, onClose }) {
  const { API_URL, walletAddress } = useWallet();
  const { t, localizeText } = useLanguage();
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
      .catch((error) => toast.error(error.response?.data?.error || error.response?.data?.message || error.message || t("Unable to load institutions")))
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
    toast.success(t("Wallet copied"));
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
        toast.warn(error.response?.data?.error || error.response?.data?.message || error.message || t("Dashboard refresh failed. Modal data was refreshed."));
      }
    }
  }

  async function runTransaction(action, pendingMessage, successMessage, after) {
    const toastId = toast.info(pendingMessage, { autoClose: 3000 });
    setAccessStatus({ state: "working", title: pendingMessage, detail: t("Confirm the transaction in MetaMask.") });
    try {
      const tx = await action();
      setAccessStatus({
        state: "working",
        title: t("Transaction submitted"),
        detail: t("Waiting for Sepolia confirmation."),
        txHash: tx.hash,
      });
      await tx.wait();
      setAccessStatus({
        state: "working",
        title: t("Updating access list"),
        detail: t("Saving key envelope changes and refreshing this modal."),
        txHash: tx.hash,
      });
      if (after) await after();
      toast.update(toastId, { render: successMessage, type: "success", isLoading: false, autoClose: 3000 });
      await refreshEverywhere();
      setAccessStatus({
        state: "success",
        title: successMessage,
        detail: t("The access list below is up to date."),
        txHash: tx.hash,
      });
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.reason || error.message || "Access update failed";
      setAccessStatus({
        state: "error",
        title: t("Access update failed"),
        detail: typeof message === "string" ? localizeText(message) : JSON.stringify(message),
      });
      toast.update(toastId, {
        render: typeof message === "string" ? localizeText(message) : t("Access update failed"),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  async function shareDoctorKey(target = doctorAddress) {
    if (!aesKey) throw new Error(t("AES key is not available in this browser. Re-upload or paste the key first."));
    const envelope = await buildDoctorKeyEnvelope(API_URL, walletAddress, target, record, aesKey);
    await storeKeyEnvelope(API_URL, walletAddress, envelope);
  }

  async function resendDoctorKey(target) {
    const toastId = toast.info(t("Resending key..."), { autoClose: 3000 });
    setAccessStatus({ state: "working", title: t("Resending key..."), detail: t("Saving key envelope changes and refreshing this modal.") });
    try {
      await shareDoctorKey(target);
      toast.update(toastId, { render: t("Key resent"), type: "success", isLoading: false, autoClose: 3000 });
      await refreshEverywhere();
      setAccessStatus({ state: "success", title: t("Key resent"), detail: t("The access list below is up to date.") });
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || t("Unable to resend key");
      setAccessStatus({ state: "error", title: t("Unable to resend key"), detail: localizeText(message) });
      toast.update(toastId, {
        render: localizeText(message),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  async function grantDoctor() {
    if (!ethers.isAddress(doctorAddress)) {
      toast.error(t("Enter a valid doctor wallet address"));
      return;
    }
    if (!aesKey) {
      toast.error(t("AES key is not available in this browser. Re-upload or paste the key first."));
      return;
    }
    let envelope;
    try {
      envelope = await buildDoctorKeyEnvelope(API_URL, walletAddress, doctorAddress, record, aesKey);
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message);
      return;
    }
    await runTransaction(
      () => grantAccessToDoctor(record.id, doctorAddress),
      t("Granting doctor access..."),
      t("Doctor access granted"),
      () => storeKeyEnvelope(API_URL, walletAddress, envelope)
    );
  }

  async function revokeDoctor(target = doctorAddress) {
    if (!ethers.isAddress(target)) {
      toast.error(t("Enter a valid doctor wallet address"));
      return;
    }
    await runTransaction(
      () => revokeAccessFromDoctor(record.id, target),
      t("Revoking doctor access..."),
      t("Doctor access revoked"),
      () => deleteKeyEnvelope(API_URL, walletAddress, { recordId: record.id, recipientWallet: target })
    );
  }

  async function grantInstitution() {
    const institution = institutions.find((item) => String(item.institutionId) === String(institutionId));
    if (!institution) return toast.error(t("Choose an institution"));
    if (!aesKey) return toast.error(t("AES key is not available in this browser. Re-upload or paste the key first."));
    let envelopes = [];
    try {
      const doctors = await getInstitutionDoctors(institution.institutionId);
      if (doctors.length === 0) {
        toast.error(t("This institution has no doctors to receive the encrypted key."));
        return;
      }
      envelopes = await buildInstitutionKeyEnvelopes(API_URL, institution, doctors, record, aesKey);
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message);
      return;
    }
    await runTransaction(
      () => grantAccessToInstitution(record.id, institution.institutionId),
      t("Granting institution access..."),
      t("Institution access granted"),
      () => storeKeyEnvelopes(API_URL, walletAddress, envelopes)
    );
  }

  async function reshareInstitutionKeys() {
    const institution = institutions.find((item) => String(item.institutionId) === String(institutionId));
    if (!institution) return toast.error("Choose an institution");
    if (!aesKey) return toast.error(t("AES key is not available in this browser. Re-upload or paste the key first."));

    const toastId = toast.info(t("Sharing institution keys..."), { autoClose: 3000 });
    setAccessStatus({ state: "working", title: t("Sharing institution keys..."), detail: t("Saving key envelope changes and refreshing this modal.") });
    try {
      const doctors = await getInstitutionDoctors(institution.institutionId);
      if (doctors.length === 0) throw new Error(t("This institution has no doctors to receive the encrypted key."));
      const envelopes = await buildInstitutionKeyEnvelopes(API_URL, institution, doctors, record, aesKey);
      await storeKeyEnvelopes(API_URL, walletAddress, envelopes);
      toast.update(toastId, { render: t("Institution keys shared"), type: "success", isLoading: false, autoClose: 3000 });
      await refreshEverywhere();
      setAccessStatus({ state: "success", title: t("Institution keys shared"), detail: t("The access list below is up to date.") });
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || t("Unable to share institution keys");
      setAccessStatus({ state: "error", title: t("Unable to share institution keys"), detail: localizeText(message) });
      toast.update(toastId, {
        render: localizeText(message),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  async function revokeInstitution(target = institutionId) {
    if (!target) {
      toast.error(t("Choose an institution"));
      return;
    }
    await runTransaction(
      () => revokeAccessFromInstitution(record.id, target),
      t("Revoking institution access..."),
      t("Institution access revoked"),
      () => deleteKeyEnvelope(API_URL, walletAddress, { recordId: record.id, accessType: "institution", accessTarget: String(target) })
    );
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-header">
          <div>
            <h2>{localizeText(`Record #${record.id}`)}</h2>
            <span><bdi dir="ltr">{record.cid}</bdi></span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="segmented">
          <button className={activeTab === "doctor" ? "active" : ""} onClick={() => setActiveTab("doctor")}>
            <Stethoscope size={16} />
            {t("Doctor")}
          </button>
          <button className={activeTab === "institution" ? "active" : ""} onClick={() => setActiveTab("institution")}>
            <Building2 size={16} />
            {t("Institution")}
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
                {t("View tx")}
              </a>
            )}
          </div>
        )}

        {activeTab === "doctor" ? (
          <div className="form-grid">
            <label>
              {t("Doctor wallet address")}
              <input value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} />
            </label>
            <div className="button-row">
              <button onClick={grantDoctor} disabled={busy}>
                <KeyRound size={16} />
                {t("Grant")}
              </button>
              <button className="secondary" onClick={() => revokeDoctor()} disabled={busy}>
                {t("Revoke")}
              </button>
            </div>
            <h3>{t("Doctors With Key Envelopes")}</h3>
            <div className="request-list">
              {directKeys.map((key) => (
                <div className="request-row" key={key.id}>
                  <span>{key.recipientWallet}</span>
                  <div className="row-actions">
                    <button className="icon-button ghost" onClick={() => copyWallet(key.recipientWallet)} aria-label={t("Copy wallet")}>
                      <Clipboard size={16} />
                    </button>
                    <button className="icon-button ghost" onClick={() => resendDoctorKey(key.recipientWallet)} aria-label={t("Resend key")} disabled={busy}>
                      <RotateCw size={16} />
                    </button>
                    <button className="secondary" onClick={() => revokeDoctor(key.recipientWallet)} disabled={busy}>
                      {t("Revoke")}
                    </button>
                  </div>
                </div>
              ))}
              {directKeys.length === 0 && (
                <div className="empty-state">
                  <Stethoscope size={24} />
                  <strong>{t("No doctors shared yet")}</strong>
                  <span>{t("Doctor key envelopes will appear here after access is granted.")}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-grid">
            <label>
              {t("Registered institution")}
              <select
                value={institutionId}
                onChange={(event) => setInstitutionId(event.target.value)}
                disabled={loadingInstitutions || institutions.length === 0}
              >
                {(loadingInstitutions || institutions.length === 0) && (
                  <option value="">{loadingInstitutions ? t("Loading institutions...") : t("No institutions available")}</option>
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
                {t("Grant")}
              </button>
              <button className="secondary" onClick={reshareInstitutionKeys} disabled={loadingInstitutions || institutions.length === 0 || busy}>
                {t("Share keys")}
              </button>
              <button className="secondary" onClick={() => revokeInstitution()} disabled={loadingInstitutions || institutions.length === 0 || busy}>
                {t("Revoke")}
              </button>
            </div>
            <p className="notice">
              When a new doctor joins an institution that already has record access, share keys again so that doctor receives a MetaMask-encrypted key envelope.
            </p>
            <h3>{t("Institution Key Envelopes")}</h3>
            <div className="request-list">
              {institutionKeys.map((key) => (
                <div className="request-row" key={key.id}>
                  <span>
                    {localizeText(`Institution #${key.accessTarget}`)} {t("doctor")} {key.recipientWallet}
                  </span>
                </div>
              ))}
              {institutionKeys.length === 0 && (
                <div className="empty-state">
                  <Building2 size={24} />
                  <strong>{t("No Institution Sharing Yet")}</strong>
                  <span>{t("Institution doctor key envelopes will appear here after access is granted.")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
