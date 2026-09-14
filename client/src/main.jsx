// main.jsx — the app's entry point (standard Vite + React setup). Mounts <App /> into the
// #root element in index.html and loads the single global stylesheet. There's no routing
// or state logic here — see App.jsx for that.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
