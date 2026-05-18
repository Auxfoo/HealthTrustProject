import React from "react";
import ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App";
import { WalletProvider } from "./context/WalletContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
      <ToastContainer
        position="bottom-right"
        theme="dark"
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        toastClassName="healthtrust-toast"
        progressClassName="healthtrust-toast-progress"
      />
    </WalletProvider>
  </React.StrictMode>
);
