import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { clearAllAuthSessions, clearAuthSession } from "../utils/auth";
import { clearActiveWallet, setActiveWallet } from "../utils/contractHelper";

const WalletContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loggedOut, setLoggedOut] = useState(() => localStorage.getItem("healthtrust_logged_out") === "true");
  const [theme, setTheme] = useState(() => localStorage.getItem("healthtrust_theme") || "light");
  const ignoreAccountEventsUntil = useRef(0);

  const activateWallet = useCallback((wallet) => {
    setWalletAddress(wallet);
    setActiveWallet(wallet);
  }, []);

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
    if (!window.ethereum?.request) {
      throw new Error("MetaMask is required");
    }

    let accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts.length) {
      ignoreAccountEventsUntil.current = Date.now() + 2500;
      accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    }
    const wallet = accounts[0];
    if (!wallet) throw new Error("No wallet account was selected");

    clearAllAuthSessions();
    localStorage.removeItem("healthtrust_logged_out");
    setLoggedOut(false);
    activateWallet(wallet);
    await fetchProfile(wallet);
    return wallet;
  }, [activateWallet, fetchProfile]);

  const logout = useCallback(async () => {
    ignoreAccountEventsUntil.current = Date.now() + 2500;
    clearAuthSession(walletAddress);
    clearAllAuthSessions();
    localStorage.setItem("healthtrust_logged_out", "true");
    setLoggedOut(true);
    setWalletAddress("");
    setUserProfile(null);
    clearActiveWallet();
  }, [walletAddress]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("healthtrust_theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!window.ethereum?.request || loggedOut) return undefined;

    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (!walletAddress && accounts.length > 0) {
        activateWallet(accounts[0]);
        fetchProfile(accounts[0]);
      }
    });

    const handleAccountsChanged = (accounts) => {
      if (Date.now() < ignoreAccountEventsUntil.current || localStorage.getItem("healthtrust_logged_out") === "true") return;
      const wallet = accounts[0] || "";
      activateWallet(wallet);
      setUserProfile(null);
      if (wallet) fetchProfile(wallet);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [activateWallet, fetchProfile, loggedOut, walletAddress]);

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
