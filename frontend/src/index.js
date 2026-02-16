/**
 * React Application Entry Point
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Render without StrictMode to prevent double effect execution in development
// StrictMode would cause initAuth to be called twice, causing the infinite reload issue
root.render(<App />);
