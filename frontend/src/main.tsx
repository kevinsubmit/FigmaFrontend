import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Toaster } from "sonner";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster duration={1200} />
    <ToastContainer
      position="top-center"
      autoClose={1200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
    />
  </>
);
