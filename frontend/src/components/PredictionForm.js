import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Send } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { createAuthHeaders } from "../utils/auth";

const initialValues = {
  gender: "Female",
  age: "",
  hypertension: "0",
  heart_disease: "0",
  smoking_history: "never",
  bmi: "",
  HbA1c_level: "",
  blood_glucose_level: "",
};

const fieldConfig = {
  gender: { label: "Gender", type: "select", options: ["Female", "Male", "Other"] },
  age: { label: "Age", type: "number", step: "0.1", parser: Number.parseFloat },
  hypertension: { label: "Hypertension", type: "select", options: [{ value: "0", label: "No" }, { value: "1", label: "Yes" }] },
  heart_disease: { label: "Heart disease", type: "select", options: [{ value: "0", label: "No" }, { value: "1", label: "Yes" }] },
  smoking_history: {
    label: "Smoking history",
    type: "select",
    options: ["never", "No Info", "current", "former", "ever", "not current"],
  },
  bmi: { label: "BMI", type: "number", step: "0.01", parser: Number.parseFloat },
  HbA1c_level: { label: "HbA1c level", type: "number", step: "0.1", parser: Number.parseFloat },
  blood_glucose_level: { label: "Blood glucose level", type: "number", step: "1", parser: (value) => Number.parseInt(value, 10) },
};

export default function PredictionForm({ onResult, values, onValuesChange, patientWallet, onPatientWalletChange }) {
  const { API_URL, walletAddress } = useWallet();
  const [localValues, setLocalValues] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [localPatientWallet, setLocalPatientWallet] = useState("");
  const formValues = values || localValues;
  const selectedPatientWallet = patientWallet ?? localPatientWallet;

  useEffect(() => {
    if (values) {
      return;
    }
    setLocalValues(initialValues);
  }, [values]);

  function updateValue(field, value) {
    const nextValues = { ...formValues, [field]: value };
    if (onValuesChange) {
      onValuesChange(nextValues);
    } else {
      setLocalValues(nextValues);
    }
  }

  function updatePatientWallet(value) {
    if (onPatientWalletChange) {
      onPatientWalletChange(value);
    } else {
      setLocalPatientWallet(value);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    const payload = Object.fromEntries(
      Object.entries(formValues).map(([key, value]) => {
        const parser = fieldConfig[key]?.parser;
        return [key, parser ? parser(value) : value];
      })
    );
    const invalidField = Object.entries(payload).find(([key, value]) => {
      const config = fieldConfig[key];
      return config?.type === "number" && !Number.isFinite(value);
    });
    if (invalidField) {
      const [key] = invalidField;
      const config = fieldConfig[key];
      toast.error(`${config.label} must be a valid number.`);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/predict`,
        { ...payload, patientWallet: selectedPatientWallet || undefined },
        { headers: await createAuthHeaders(walletAddress) }
      );
      onResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="prediction-form" onSubmit={submit}>
      <label>
        Patient wallet
        <input value={selectedPatientWallet} onChange={(event) => updatePatientWallet(event.target.value)} placeholder="Optional" />
      </label>
      {Object.keys(initialValues).map((field) => (
        <label key={field}>
          {fieldConfig[field].label}
          {fieldConfig[field].type === "select" ? (
            <select value={formValues[field]} onChange={(event) => updateValue(field, event.target.value)} required>
              {fieldConfig[field].options.map((option) => {
                const value = typeof option === "string" ? option : option.value;
                const label = typeof option === "string" ? option : option.label;
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type="number"
              step={fieldConfig[field].step}
              value={formValues[field]}
              onChange={(event) => updateValue(field, event.target.value)}
              required
            />
          )}
        </label>
      ))}
      <button className="icon-button with-label submit-wide" disabled={loading}>
        <Send size={16} />
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
