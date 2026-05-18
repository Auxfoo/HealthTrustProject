import React, { useEffect, useState } from "react";
import axios from "axios";
import { Send } from "lucide-react";
import { useWallet } from "../context/WalletContext";

const initialValues = {
  Pregnancies: "",
  Glucose: "",
  BloodPressure: "",
  SkinThickness: "",
  Insulin: "",
  BMI: "",
  DiabetesPedigreeFunction: "",
  Age: "",
};

export default function PredictionForm({ onResult, values, onValuesChange }) {
  const { API_URL } = useWallet();
  const [localValues, setLocalValues] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const formValues = values || localValues;

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

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    const payload = Object.fromEntries(
      Object.entries(formValues).map(([key, value]) => [key, key === "BMI" || key === "DiabetesPedigreeFunction" ? Number.parseFloat(value) : Number.parseInt(value, 10)])
    );

    try {
      const response = await axios.post(`${API_URL}/api/predict`, payload);
      onResult(response.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="prediction-form" onSubmit={submit}>
      {Object.keys(initialValues).map((field) => (
        <label key={field}>
          {field}
          <input
            type="number"
            step={field === "BMI" || field === "DiabetesPedigreeFunction" ? "0.01" : "1"}
            value={formValues[field]}
            onChange={(event) => updateValue(field, event.target.value)}
            required
          />
        </label>
      ))}
      <button className="icon-button with-label submit-wide" disabled={loading}>
        <Send size={16} />
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
