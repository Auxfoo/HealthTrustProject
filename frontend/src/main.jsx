import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App";
import { WalletProvider } from "./context/WalletContext";
import { LanguageProvider, LocalizedPage } from "./i18n";
import "./styles.css";

function ToastAutoDismiss() {
  useEffect(() => {
    const timers = new Map();
    const scheduleDismiss = (id) => {
      window.clearTimeout(timers.get(id));
      timers.set(
        id,
        window.setTimeout(() => {
          toast.dismiss(id);
          timers.delete(id);
        }, 3600)
      );
    };
    const unsubscribe = toast.onChange((item) => {
      if (item.status === "removed") {
        window.clearTimeout(timers.get(item.id));
        timers.delete(item.id);
        return;
      }
      scheduleDismiss(item.id);
    });
    const hardClear = window.setInterval(() => {
      toast.dismiss();
    }, 4500);

    return () => {
      window.clearInterval(hardClear);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <WalletProvider>
        <App />
        <LocalizedPage />
        <ToastAutoDismiss />
        <ToastContainer
          position="bottom-right"
          theme="dark"
          autoClose={3000}
          limit={2}
          newestOnTop
          closeButton={false}
          closeOnClick
          draggable
          pauseOnHover={false}
          pauseOnFocusLoss={false}
          hideProgressBar={false}
          toastClassName="healthtrust-toast"
          progressClassName="healthtrust-toast-progress"
        />
      </WalletProvider>
    </LanguageProvider>
  </React.StrictMode>
);
