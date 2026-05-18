import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, Stethoscope, X } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import {
  grantAccessToDoctor,
  grantAccessToInstitution,
  revokeAccessFromDoctor,
  revokeAccessFromInstitution,
} from "../utils/contractHelper";

export default function AccessModal({ record, onClose }) {
  const { API_URL } = useWallet();
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

  async function runTransaction(action, pendingMessage, successMessage) {
    const toastId = toast.loading(pendingMessage);
    try {
      const tx = await action();
      await tx.wait();
      toast.update(toastId, { render: successMessage, type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, {
        render: error.reason || error.message,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
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
          <button
            className={activeTab === "institution" ? "active" : ""}
            onClick={() => setActiveTab("institution")}
          >
            <Building2 size={16} />
            Institution
          </button>
        </div>

        {activeTab === "doctor" ? (
          <div className="form-grid">
            <label>
              Doctor wallet address
              <input value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} />
            </label>
            <div className="button-row">
              <button
                onClick={() =>
                  runTransaction(
                    () => grantAccessToDoctor(record.id, doctorAddress),
                    "Granting doctor access...",
                    "Doctor access granted"
                  )
                }
              >
                Grant
              </button>
              <button
                className="secondary"
                onClick={() =>
                  runTransaction(
                    () => revokeAccessFromDoctor(record.id, doctorAddress),
                    "Revoking doctor access...",
                    "Doctor access revoked"
                  )
                }
              >
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="form-grid">
            <label>
              Registered institution
              <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)}>
                {institutions.map((institution) => (
                  <option key={institution.institutionId} value={institution.institutionId}>
                    {institution.name} ({institution.institutionType})
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button
                onClick={() =>
                  runTransaction(
                    () => grantAccessToInstitution(record.id, institutionId),
                    "Granting institution access...",
                    "Institution access granted"
                  )
                }
              >
                Grant
              </button>
              <button
                className="secondary"
                onClick={() =>
                  runTransaction(
                    () => revokeAccessFromInstitution(record.id, institutionId),
                    "Revoking institution access...",
                    "Institution access revoked"
                  )
                }
              >
                Revoke
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
