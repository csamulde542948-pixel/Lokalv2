
  import { createRoot } from "react-dom/client";
  import { Toaster } from "sonner";
  import { Analytics } from "@vercel/analytics/react";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  const savedTheme = window.localStorage.getItem("theme");
  document.documentElement.classList.toggle("dark", savedTheme !== "light");

  createRoot(document.getElementById("root")!).render(
    <>
      <App />
      <Toaster richColors position="top-right" />
      <Analytics />
    </>
  );
  
