"use client";

import { useState, useEffect } from "react";
import type { SessionData } from "@/app/lib/types";

const STORAGE_KEY = "hf_session";

interface Props {
  session: SessionData;
  onChange: (s: SessionData) => void;
}

export default function SessionSettings({ session, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<SessionData>(session);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocal(session);
  }, [session]);

  function update(field: keyof SessionData, value: string) {
    setLocal((prev) => ({ ...prev, [field]: value }));
  }

  function save() {
    onChange(local);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    setOpen(false);
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SessionData;
        setLocal(parsed);
        onChange(parsed);
      } catch {}
    }
  }

  function clear() {
    const empty: SessionData = {
      clerkJwt: "", cfClearance: "", cfBm: "", datadome: "", clientJwt: "", xDatadomeClientid: "",
    };
    setLocal(empty);
    onChange(empty);
    localStorage.removeItem(STORAGE_KEY);
  }

  const isConfigured = local.clerkJwt.length > 0;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="label" style={{ margin: 0 }}>Session</span>
          {isConfigured ? (
            <span className="badge badge-success">Configured</span>
          ) : (
            <span className="badge badge-warning">Not configured</span>
          )}
        </div>
        <button
          className="btn-secondary"
          style={{ padding: "4px 12px", fontSize: 12 }}
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Configure"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
            Get these values from your browser DevTools after logging into{" "}
            <strong>higgsfield.ai</strong>. Open the Application → Cookies tab.
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">__session (Clerk JWT)</label>
            <textarea
              value={local.clerkJwt}
              onChange={(e) => update("clerkJwt", e.target.value)}
              placeholder="eyJ..."
              rows={2}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">cf_clearance</label>
            <input
              type="text"
              value={local.cfClearance}
              onChange={(e) => update("cfClearance", e.target.value)}
              placeholder="token from cf_clearance cookie"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">__cf_bm</label>
            <input
              type="text"
              value={local.cfBm}
              onChange={(e) => update("cfBm", e.target.value)}
              placeholder="token from __cf_bm cookie"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">__client (optional)</label>
            <input
              type="text"
              value={local.clientJwt}
              onChange={(e) => update("clientJwt", e.target.value)}
              placeholder="jwt from __client cookie"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">datadome (optional)</label>
            <input
              type="text"
              value={local.datadome}
              onChange={(e) => update("datadome", e.target.value)}
              placeholder="datadome cookie value"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">x-datadome-clientid (optional)</label>
            <input
              type="text"
              value={local.xDatadomeClientid}
              onChange={(e) => update("xDatadomeClientid", e.target.value)}
              placeholder="from request headers"
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={save}>Save Session</button>
            <button className="btn-secondary" onClick={loadFromStorage}>Load from Storage</button>
            <button className="btn-danger" onClick={clear}>Clear</button>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
            Session expires frequently — refresh cookies in DevTools and re-paste as needed.
          </div>
        </div>
      )}
    </div>
  );
}
