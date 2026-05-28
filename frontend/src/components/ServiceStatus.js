import React, { useEffect, useState } from "react";
import axios from "axios";
import { Activity, BrainCircuit, Database, RefreshCw } from "lucide-react";
import { useWallet } from "../context/WalletContext";

const ML_URL = import.meta.env.VITE_ML_URL || "http://localhost:8000";
const SEPOLIA_RPC = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

export default function ServiceStatus() {
  const { API_URL } = useWallet();
  const [status, setStatus] = useState({ backend: "checking", ml: "checking", sepolia: "checking" });

  async function checkStatus() {
    setStatus({ backend: "checking", ml: "checking", sepolia: "checking" });
    const backend = axios.get(`${API_URL}/api/health`, { timeout: 2500 });
    const ml = axios.get(ML_URL, { timeout: 2500 });
    const sepolia = axios.post(SEPOLIA_RPC, { jsonrpc: "2.0", method: "net_version", params: [], id: 1 }, { timeout: 3000 });

    const [backendResult, mlResult, sepoliaResult] = await Promise.allSettled([backend, ml, sepolia]);
    setStatus({
      backend: backendResult.status === "fulfilled" ? "online" : "offline",
      ml: mlResult.status === "fulfilled" ? "online" : "offline",
      sepolia: sepoliaResult.status === "fulfilled" ? "online" : "offline",
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
        {dot(status.sepolia)}
        <span>Sepolia</span>
      </div>
      <button className="icon-button ghost compact" onClick={checkStatus} aria-label="Refresh service status">
        <RefreshCw size={15} />
      </button>
    </section>
  );
}
