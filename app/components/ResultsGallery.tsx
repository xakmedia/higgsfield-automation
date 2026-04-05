"use client";

import { useState } from "react";
import type { JobResult, GeneratedImage } from "@/app/lib/types";

interface Props {
  results: JobResult[];
  onClear: () => void;
}

export default function ResultsGallery({ results, onClear }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GeneratedImage | null>(null);

  function downloadImage(img: GeneratedImage, jobId: string, index: number) {
    const url = img.url_hd || img.url;
    const a = document.createElement("a");
    a.href = url;
    a.download = `hf_${jobId}_${index + 1}.png`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function downloadAll() {
    const images = results.flatMap((r) => (r.images || []).map((img, i) => ({ img, jobId: r.job_id, index: i })));
    if (images.length === 0) return;

    setDownloading("all");

    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();

      await Promise.all(
        images.map(async ({ img, jobId, index }) => {
          const url = img.url_hd || img.url;
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            zip.file(`hf_${jobId}_${index + 1}.png`, blob);
          } catch {}
        })
      );

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `higgsfield_results_${Date.now()}.zip`);
    } catch (err) {
      console.error("Zip failed:", err);
    }

    setDownloading(null);
  }

  const completedResults = results.filter((r) => r.images && r.images.length > 0);
  const totalImages = completedResults.reduce((n, r) => n + (r.images?.length || 0), 0);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="label" style={{ margin: 0 }}>
          Results <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({totalImages} images)</span>
        </div>
        {results.length > 0 && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn-secondary"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={downloadAll}
              disabled={downloading !== null}
            >
              {downloading === "all" ? <div className="spinner" /> : null}
              {downloading === "all" ? "Zipping..." : `Download All (${totalImages})`}
            </button>
            <button className="btn-danger" style={{ padding: "3px 10px", fontSize: 11 }} onClick={onClear}>
              Clear
            </button>
          </div>
        )}
      </div>

      {completedResults.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          No generated images yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {completedResults.map((result) =>
            (result.images || []).map((img, imgIndex) => (
              <div key={`${result.job_id}-${imgIndex}`} className="result-card">
                <div
                  style={{ cursor: "pointer", position: "relative" }}
                  onClick={() => setLightbox(img)}
                >
                  <img
                    src={img.thumb_url || img.url}
                    alt={`Result ${result.job_id}`}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = img.url; }}
                  />
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={(e) => ((e.target as HTMLDivElement).style.background = "rgba(0,0,0,0.3)")}
                    onMouseLeave={(e) => ((e.target as HTMLDivElement).style.background = "rgba(0,0,0,0)")}
                  >
                    <span style={{ color: "#fff", fontSize: 24, opacity: 0 }}>🔍</span>
                  </div>
                </div>
                <div className="result-card-footer">
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{result.job_id.slice(0, 8)}</span>
                  <button
                    className="btn-secondary"
                    style={{ padding: "2px 8px", fontSize: 11 }}
                    onClick={() => downloadImage(img, result.job_id, imgIndex)}
                    disabled={downloading === `${result.job_id}-${imgIndex}`}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Failed results */}
      {results.filter(r => r.status === "failed").length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="label">Failed Jobs</div>
          {results.filter(r => r.status === "failed").map((r) => (
            <div key={r.job_id} style={{ marginBottom: 6, fontSize: 12, color: "var(--danger)" }}>
              <span className="badge badge-error" style={{ marginRight: 8 }}>Failed</span>
              {r.error || "Unknown error"} — {r.job_id.slice(0, 8)}
            </div>
          ))}
        </div>
      )}

      {/* NSFW results */}
      {results.filter(r => r.status === "nsfw").length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="label">NSFW Flagged</div>
          {results.filter(r => r.status === "nsfw").map((r) => (
            <div key={r.job_id} style={{ marginBottom: 6, fontSize: 12, color: "var(--warning)" }}>
              <span className="badge badge-warning" style={{ marginRight: 8 }}>NSFW</span>
              {r.job_id.slice(0, 8)}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
          }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url_hd || lightbox.url}
            alt="Full size"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              fontSize: 20,
              width: 36,
              height: 36,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
