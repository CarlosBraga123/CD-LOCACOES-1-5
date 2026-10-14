import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext";
import { LeituraDevProvider } from "./data/LeituraDevContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider><LeituraDevProvider><App /></LeituraDevProvider></AuthProvider>
  </React.StrictMode>
);
