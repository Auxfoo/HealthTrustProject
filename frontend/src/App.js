import React from "react";
import { ShieldCheck } from "lucide-react";
import Navbar from "./components/Navbar";
import ServiceStatus from "./components/ServiceStatus";
import { useWallet } from "./context/WalletContext";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import InstitutionDashboard from "./pages/InstitutionDashboard";

export default function App() {
  const { isConnected, connectWallet, userProfile, loadingProfile } = useWallet();

  function renderDashboard() {
    if (!userProfile) return <Register />;
    if (userProfile.role === "patient") return <PatientDashboard />;
    if (userProfile.role === "doctor") return <DoctorDashboard />;
    if (userProfile.role === "institution_admin") return <InstitutionDashboard />;
    return <Register />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      {isConnected && <ServiceStatus />}
      {!isConnected ? (
        <main className="connect-screen">
          <ShieldCheck size={48} />
          <h1>HealthTrust</h1>
          <p>
            The healthcare system in the Kurdistan region still faces many problems in managing and sharing patient
            records safely between hospitals and clinics. To solve this, our project introduces HealthTrust, a system
            that uses blockchain and machine learning to make health data more secure and useful. Blockchain helps
            protect medical records from being changed or accessed without permission, giving patients full control over
            their information. At the same time, machine learning analyzes medical data without showing personal details
            to predict possible diseases and help doctors make better decisions. With this project, we aim to make
            healthcare in Kurdistan more secure, transparent, and intelligent.
          </p>
          <button className="icon-button with-label" onClick={connectWallet}>
            <ShieldCheck size={18} />
            Connect MetaMask
          </button>
        </main>
      ) : loadingProfile ? (
        <main className="panel narrow">Loading profile...</main>
      ) : (
        renderDashboard()
      )}
    </div>
  );
}
