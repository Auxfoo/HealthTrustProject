import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const WalletContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("healthtrust_theme") || "light");

  const fetchProfile = useCallback(async (wallet) => {
    if (!wallet) return null;
    setLoadingProfile(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/${wallet}`);
      setUserProfile(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        setUserProfile(null);
        return null;
      }
      throw error;
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask is required");
    }

    localStorage.removeItem("healthtrust_logged_out");
    if (window.ethereum.request) {
      // Assumption: requesting account permission on connect lets MetaMask show the account chooser.
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const wallet = accounts[0];
    setWalletAddress(wallet);
    await fetchProfile(wallet);
    return wallet;
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    // Assumption: MetaMask supports wallet_revokePermissions; unsupported wallets still clear app session state.
    if (window.ethereum?.request) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (error) {
        console.warn("Wallet permission revoke was skipped:", error.message);
      }
    }
    localStorage.setItem("healthtrust_logged_out", "true");
    setWalletAddress("");
    setUserProfile(null);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("healthtrust_theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    if (localStorage.getItem("healthtrust_logged_out") === "true") return;

    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        fetchProfile(accounts[0]);
      }
    });

    const handleAccountsChanged = (accounts) => {
      const wallet = accounts[0] || "";
      setWalletAddress(wallet);
      setUserProfile(null);
      if (wallet) fetchProfile(wallet);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [fetchProfile]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({
      walletAddress,
      userProfile,
      role: userProfile?.role || "",
      isConnected: Boolean(walletAddress),
      loadingProfile,
      theme,
      connectWallet,
      logout,
      toggleTheme,
      fetchProfile,
      setUserProfile,
      API_URL,
    }),
    [walletAddress, userProfile, loadingProfile, theme, connectWallet, logout, toggleTheme, fetchProfile]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
