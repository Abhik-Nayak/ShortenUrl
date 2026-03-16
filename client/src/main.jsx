import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { UrlProvider } from "./context/UrlContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <UrlProvider>
        <App />
      </UrlProvider>
    </AuthProvider>
  </React.StrictMode>
);
