import "@/styles.css";

import { createRoot } from "react-dom/client";

import App from "@/App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root application mount.");

createRoot(root).render(<App />);
