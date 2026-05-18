import React, { useEffect, useState } from "react";
import axios from "axios";
import { Activity, BrainCircuit, Database, RefreshCw } from "lucide-react";
import { useWallet } from "../context/WalletContext";

export default function ServiceStatus() {
  const { API_URL } = useWallet();
  const [status, setStatus] = useState({ backend: "checking", ml: "checking" });

  async function checkStatus() {
    setStatus({ backend: "checking", ml: "checking" });
    const backend = axios.get(`${API_URL}/api/health`, { timeout: 2500 });
    const ml = axios.get("http://localhost:8000", { timeout: 2500 });

    const [backendResult, mlResult] = await Promise.allSettled([backend, ml]);
    setStatus({
      backend: backendResult.status === "fulfilled" ? "online" : "offline",
      ml: mlResult.status === "fulfilled" ? "online" : "offline",
    });
  }

  useEffect(() => {
    checkStatus();
  }, []);

  function dot(value) {
    return <span className={`status-dot ${value}`} />;
  }

  return (
    <section className="service-strip">
      <div className="service-item">
        <Database size={16} />
        {dot(status.backend)}
        <span>Backend</span>
      </div>
      <div className="service-item">
        <BrainCircuit size={16} />
        {dot(status.ml)}
        <span>ML</span>
      </div>
      <div className="service-item">
        <Activity size={16} />
        {dot("online")}
        <span>Sepolia</span>
      </div>
      <button className="icon-button ghost compact" onClick={checkStatus} aria-label="Refresh service status">
        <RefreshCw size={15} />
      </button>
    </section>
  );
}
