import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make sure the uploads directory exists on app start
// This happens on the server side

createRoot(document.getElementById("root")!).render(<App />);
