import React from "react";
import { Activity, Clipboard, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";

function truncateWallet(wallet) {
  if (!wallet) return "";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function Navbar() {
  const { walletAddress, userProfile, isConnected, connectWallet, logout, theme, toggleTheme } = useWallet();

  async function copyWallet() {
    await navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet copied");
  }

  return (
    <header className="navbar">
      <div className="brand">
        <Activity size={22} />
        <span>HealthTrust</span>
      </div>
      <div className="nav-meta">
        {userProfile && (
          <span>
            {userProfile.name} / {userProfile.role.replace("_", " ")}
          </span>
        )}
        <button className="icon-button ghost" onClick={toggleTheme} aria-label="Toggle dark mode">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {isConnected ? (
          <>
            <button className="wallet-pill" onClick={copyWallet}>
              <Clipboard size={15} />
              {truncateWallet(walletAddress)}
            </button>
            <button className="icon-button ghost" onClick={logout} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button className="icon-button with-label" onClick={connectWallet}>
            <LogIn size={18} />
            Connect
          </button>
        )}
      </div>
    </header>
  );
}
