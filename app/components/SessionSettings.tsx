"use client";

import { useState, useEffect } from "react";
import type { SessionData } from "@/app/lib/types";

const STORAGE_KEY = "hf_session";
const HF_COOKIES_KEY = "hf_cookies";
const HF_COOKIE_TIME_KEY = "hf_cookie_time";

const BOOKMARKLET_CODE = `javascript:(function(){const keys=['__session','cf_clearance','__cf_bm','datadome','__client','__client_uat'];const vals={};keys.forEach(k=>{const v=document.cookie.split('; ').find(c=>c.startsWith(k+'='));if(v)vals[k]=v.split('=')[1]});if(vals.__session){localStorage.setItem('hf_cookies',JSON.stringify(vals));localStorage.setItem('hf_cookie_time',Date.now().toString());alert('%E2%9C%85%20Cookies%20synced!%20Go%20back%20to%20HiggsField%20Automation.');}else{alert('%E2%9D%8C%20Not%20logged%20into%20HiggsField.%20Please%20log%20in%20first.');}})();`;

type SessionStatus = "active" | "stale" | "none";

function getSessionStatus(session: SessionData): SessionStatus {
  const hasCookies = session.clerkJwt.length > 0;
  if (!hasCookies) return "none";

  try {
    const raw = localStorage.getItem(HF_COOKIES_KEY);
    const timeRaw = localStorage.getItem(HF_COOKIE_TIME_KEY);
    if (!raw || !timeRaw) return "active";

    const age = Date.now() - parseInt(timeRaw, 10);
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    if (age > EIGHT_HOURS) return "stale";
    return "active";
  } catch {
    return "active";
  }
}

function statusConfig(status: SessionStatus) {
  if (status === "active") return { dot: "#4ce080", label: "Session active" };
  if (status === "stale") return { dot: "#f0c040", label: "Session stale" };
  return { dot: "#fc4747", label: "No session" };
}

interface Props {
  session: SessionData;
  onChange: (s: SessionData) => void;
}

export default function SessionSettings({ session, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<SessionData>(session);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocal(session);
  }, [session]);

  // On mount, check for synced cookies from bookmarklet
  useEffect(() => {
    const raw = localStorage.getItem(HF_COOKIES_KEY);
    const timeRaw = localStorage.getItem(HF_COOKIE_TIME_KEY);
    if (!raw) return;

    try {
      const vals = JSON.parse(raw) as Partial<SessionData>;
      const savedAt = timeRaw ? parseInt(timeRaw, 10) : 0;
      const age = Date.now() - savedAt;
      const ONE_DAY = 24 * 60 * 60 * 1000;

      if (age > ONE_DAY) {
        setSyncNotice("⚠️ Synced cookies are older than 24 hours. Please re-sync from HiggsField.");
        return;
      }

      const mapped: SessionData = {
        clerkJwt: vals.clerkJwt ?? "",
        cfClearance: vals.cfClearance ?? "",
        cfBm: vals.cfBm ?? "",
        datadome: vals.datadome ?? "",
        clientJwt: vals.clientJwt ?? "",
        xDatadomeClientid: vals.xDatadomeClientid ?? "",
      };

      // Only auto-populate if the current session is empty
      if (!session.clerkJwt) {
        setLocal(mapped);
        onChange(mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch {
      // ignore malformed data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field: keyof SessionData, value: string) {
    setLocal((prev) => ({ ...prev, [field]: value }));
  }

  function save() {
    onChange(local);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
  }

  function clear() {
    const empty: SessionData = {
      clerkJwt: "", cfClearance: "", cfBm: "", datadome: "", clientJwt: "", xDatadomeClientid: "",
    };
    setLocal(empty);
    onChange(empty);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HF_COOKIES_KEY);
    localStorage.removeItem(HF_COOKIE_TIME_KEY);
  }

  function dismissSyncNotice() {
    setSyncNotice(null);
  }

  const status = getSessionStatus(local);
  const { dot, label } = statusConfig(status);

  return (
    <>
      <div className="card">
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="label" style={{ margin: 0 }}>Session</span>
            {/* Status indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
              <span style={{ color: dot }}>{label}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-secondary"
              style={{ padding: "4px 12px", fontSize: 12 }}
              onClick={() => setOpen(!open)}
            >
              {open ? "Close" : "Configure"}
            </button>
          </div>
        </div>

        {/* Sync notice banner */}
        {syncNotice && (
          <div style={{
            marginBottom: 10,
            padding: "8px 12px",
            background: "rgba(240,192,64,0.1)",
            border: "1px solid rgba(240,192,64,0.3)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--warning)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}>
            <span>{syncNotice}</span>
            <button
              onClick={dismissSyncNotice}
              style={{ background: "none", border: "none", color: "var(--warning)", padding: 0, fontSize: 14, cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {open && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Cookie Sync section ── */}
            <div style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px 14px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Sync from HiggsField</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
                Use the bookmarklet to grab cookies automatically — no manual copy-pasting needed.
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: 12, padding: "5px 12px" }}
                onClick={() => setSyncModalOpen(true)}
              >
                Open Sync Instructions
              </button>
            </div>

            <hr className="divider" />

            {/* ── Manual cookie input section ── */}
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                Get these values from your browser DevTools after logging into{" "}
                <strong>higgsfield.ai</strong>. Open <strong>Application → Cookies</strong>.
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { key: "clerkJwt", label: "__session (Clerk JWT)", placeholder: "eyJ...", rows: 2, mono: true },
                  { key: "cfClearance", label: "cf_clearance", placeholder: "token from cf_clearance cookie", rows: 1, mono: false },
                  { key: "cfBm", label: "__cf_bm", placeholder: "token from __cf_bm cookie", rows: 1, mono: false },
                  { key: "datadome", label: "datadome", placeholder: "datadome cookie value", rows: 1, mono: false },
                ].map(({ key, label: lbl, placeholder, rows, mono }) => (
                  <div key={key}>
                    <label className="label">{lbl}</label>
                    {rows > 1 ? (
                      <textarea
                        value={local[key as keyof SessionData]}
                        onChange={(e) => update(key as keyof SessionData, e.target.value)}
                        placeholder={placeholder}
                        rows={rows}
                        style={{ fontFamily: mono ? "monospace" : undefined, fontSize: 12 }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={local[key as keyof SessionData]}
                        onChange={(e) => update(key as keyof SessionData, e.target.value)}
                        placeholder={placeholder}
                        style={{ fontSize: 13 }}
                      />
                    )}
                  </div>
                ))}

                {/* Advanced / optional row */}
                <div style={{
                  marginTop: 4,
                  padding: "10px 12px",
                  background: "rgba(124,92,252,0.05)",
                  border: "1px solid rgba(124,92,252,0.15)",
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Optional
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      { key: "clientJwt", label: "__client (optional)", placeholder: "jwt from __client cookie" },
                      { key: "xDatadomeClientid", label: "x-datadome-clientid (optional)", placeholder: "from request headers" },
                    ].map(({ key, label: lbl, placeholder }) => (
                      <div key={key}>
                        <label className="label" style={{ fontSize: 11 }}>{lbl}</label>
                        <input
                          type="text"
                          value={local[key as keyof SessionData]}
                          onChange={(e) => update(key as keyof SessionData, e.target.value)}
                          placeholder={placeholder}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn-primary" onClick={save}>Save</button>
                <button className="btn-secondary" onClick={() => {
                  const raw = localStorage.getItem(STORAGE_KEY);
                  if (raw) { try { const p = JSON.parse(raw); setLocal(p); onChange(p); } catch {} }
                }}>
                  Reload Saved
                </button>
                <button className="btn-danger" onClick={clear}>Clear Session</button>
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                Session expires frequently — refresh cookies in DevTools and re-paste as needed.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bookmarklet Modal ── */}
      {syncModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSyncModalOpen(false); }}
        >
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            maxWidth: 480,
            width: "100%",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Cookie Sync Instructions</h3>
              <button
                onClick={() => setSyncModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, color: "var(--text)" }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Step 1 — Add the bookmarklet</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>
                  Drag the button below to your bookmarks bar:
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", background: "var(--surface-2)", borderRadius: 8 }}>
                  <a
                    href={BOOKMARKLET_CODE}
                    draggable
                    onClick={(e) => { e.preventDefault(); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      background: "var(--accent)",
                      color: "#fff",
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "grab",
                      textDecoration: "none",
                      userSelect: "none",
                    }}
                  >
                    {copied ? "✓ Copied!" : "🔗 HiggsField Cookie Sync"}
                  </a>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
                  Or right-click → Copy link address, then create a bookmark manually
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Step 2 — Sync your cookies</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  1. Open <strong>higgsfield.ai</strong> in this browser and log in.<br />
                  2. Click the <strong>"HiggsField Cookie Sync"</strong> bookmark.<br />
                  3. You&apos;ll see &ldquo;✅ Cookies synced!&rdquo; — then return here.
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Step 3 — Done!</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Your cookies are auto-filled above. Click <strong>Save</strong> to persist them.
                  Cookies older than 24 hours will prompt you to re-sync.
                </div>
              </div>

              <div style={{
                background: "rgba(124,92,252,0.08)",
                border: "1px solid rgba(124,92,252,0.2)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: 11,
                color: "var(--text-muted)",
              }}>
                <strong style={{ color: "var(--accent)" }}>Privacy note:</strong> All cookies stay in your browser.
                The app never sends session data anywhere — all API calls run from your browser directly.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
