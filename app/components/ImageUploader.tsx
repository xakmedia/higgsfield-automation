"use client";

import { useState, useRef, useCallback } from "react";
import type { InputImage, SessionData } from "@/app/lib/types";
import { uploadReferenceImage, uuid } from "@/app/lib/higgsfield";

interface Props {
  images: InputImage[];
  session: SessionData;
  onChange: (imgs: InputImage[]) => void;
}

export default function ImageUploader({ images, session, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!session.clerkJwt) {
      setError("Session not configured — set your Clerk JWT first");
      return;
    }

    setUploading(true);
    setError("");

    const newImages: InputImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      try {
        const result = await uploadReferenceImage(file, session);
        newImages.push({
          id: result.id,
          url: result.url,
          type: "media_input",
          position: images.length + newImages.length + 1,
        });
      } catch (err: any) {
        setError(`Upload failed for ${file.name}: ${err.message}`);
      }
    }

    onChange([...images, ...newImages]);
    setUploading(false);
  }, [session, images, onChange]);

  function remove(pos: number) {
    const updated = images
      .filter((_, i) => i !== pos - 1)
      .map((img, i) => ({ ...img, position: i + 1 }));
    onChange(updated);
  }

  function clearAll() {
    onChange([]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="label" style={{ margin: 0 }}>Reference Images</div>
        {images.length > 0 && (
          <button className="btn-secondary" style={{ padding: "2px 10px", fontSize: 11 }} onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        onPaste={handlePaste}
        tabIndex={0}
        style={{
          border: "2px dashed var(--border)",
          borderRadius: 8,
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: "var(--surface-2)",
          transition: "border-color 0.15s",
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        {uploading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div className="spinner" />
            <span style={{ color: "var(--text-muted)" }}>Uploading...</span>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Drop images here, click to browse, or paste from clipboard
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>{error}</div>
      )}

      {/* Image list */}
      {images.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {images.map((img) => (
            <div key={img.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <img
                src={img.url}
                alt={`Reference ${img.position}`}
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <button
                onClick={() => remove(img.position)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ×
              </button>
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: 10,
                textAlign: "center",
                padding: "2px 4px",
              }}>
                #{img.position}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
          Use <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 3 }}>{"{{1}}"}</code> for first,{" "}
          <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 3 }}>{"{{2}}"}</code> for second, etc. in your prompt.
        </div>
      )}
    </div>
  );
}
