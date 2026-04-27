import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Invite from "./pages/Invite";
import Questions from "./pages/Questions";
import Privacy from "./pages/Privacy";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/vprasanja" element={<Questions />} />
        <Route path="/faq" element={<Questions />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
