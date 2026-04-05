"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import SessionSettings from "@/app/components/SessionSettings";
import Controls from "@/app/components/Controls";
import ImageUploader from "@/app/components/ImageUploader";
import PromptBuilder from "@/app/components/PromptBuilder";
import GenerationQueue from "@/app/components/GenerationQueue";
import ResultsGallery from "@/app/components/ResultsGallery";
import type { SessionData, QueueItem, JobResult, GenerationParams, InputImage, GenerationRequest } from "@/app/lib/types";
import { DEFAULT_SESSION, ASPECT_RATIOS } from "@/app/lib/types";
import { submitGeneration, pollJobStatus, uuid } from "@/app/lib/higgsfield";

const SESSION_KEY = "hf_session";
const QUEUE_KEY = "hf_queue";
const RESULTS_KEY = "hf_results";

export default function Home() {
  const [session, setSession] = useState<SessionData>(DEFAULT_SESSION);
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<InputImage[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<JobResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Generation controls state
  const [ctrlParams, setCtrlParams] = useState<Omit<GenerationParams, "prompt" | "input_images">>({
    width: 768,
    height: 1376,
    batch_size: 1,
    aspect_ratio: "9:16",
    is_storyboard: false,
    is_zoom_control: false,
    use_unlim: true,
    resolution: "2k",
  });

  // Load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch {}
    }
    const qraw = localStorage.getItem(QUEUE_KEY);
    if (qraw) {
      try { setQueue(JSON.parse(qraw)); } catch {}
    }
    const rraw = localStorage.getItem(RESULTS_KEY);
    if (rraw) {
      try { setResults(JSON.parse(rraw)); } catch {}
    }
  }, []);

  function resolvePrompt(p: string, imgs: InputImage[]): string {
    let resolved = p;
    imgs.forEach((img) => {
      resolved = resolved.replace(new RegExp(`\\[\\[${img.position}\\]\\]`, "g"), img.id);
    });
    return resolved;
  }

  function addToQueue() {
    if (!prompt.trim()) return;
    const item: QueueItem = {
      id: uuid(),
      index: queue.length + 1,
      prompt: prompt.trim(),
      params: { ...ctrlParams },
      input_images: referenceImages,
      status: "pending",
    };
    const updated = [...queue, item];
    setQueue(updated);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    setPrompt("");
  }

  function updateQueueItem(id: string, updates: Partial<QueueItem>) {
    const updated = queue.map((q) => (q.id === id ? { ...q, ...updates } : q));
    setQueue(updated);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  }

  async function runQueue() {
    const pending = queue.filter((q) => q.status === "pending");
    if (pending.length === 0 || !session.clerkJwt) return;

    setIsRunning(true);
    abortRef.current = new AbortController();

    for (const item of pending) {
      if (abortRef.current.signal.aborted) break;

      updateQueueItem(item.id, { status: "running" });
      setActiveJobId(item.id);
      setCurrentProgress("Submitting...");

      try {
        const resolvedPrompt = resolvePrompt(item.prompt, item.input_images);

        const req: GenerationRequest = {
          params: {
            prompt: resolvedPrompt,
            input_images: item.input_images.map((img) => ({
              id: img.id,
              url: img.url,
              type: img.type,
              position: img.position,
            })),
            width: item.params.width,
            height: item.params.height,
            batch_size: item.params.batch_size,
            aspect_ratio: item.params.aspect_ratio,
            is_storyboard: item.params.is_storyboard,
            is_zoom_control: item.params.is_zoom_control,
            use_unlim: item.params.use_unlim,
            resolution: item.params.resolution,
          },
          use_unlim: true,
        };

        const { job_id } = await submitGeneration(session, req);
        setCurrentProgress("Polling status...");

        const result = await pollJobStatus(
          session,
          job_id,
          (s) => setCurrentProgress(`Status: ${s}`),
          abortRef.current.signal
        );

        updateQueueItem(item.id, { status: result.status, result, error: result.error });

        const newResult: JobResult = {
          job_id: result.job_id,
          status: result.status,
          images: result.images,
          error: result.error,
          nsfw: result.nsfw,
          completed_at: result.completed_at,
        };
        setResults((prev) => {
          const updated = [newResult, ...prev];
          localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
          return updated;
        });

        setCurrentProgress(result.status === "completed"
          ? `Done! ${result.images?.length || 0} image(s)`
          : result.status === "nsfw" ? "NSFW — skipped" : `Failed: ${result.error}`
        );
      } catch (err: any) {
        const errorMsg = err.message || "Unknown error";
        updateQueueItem(item.id, { status: "failed", error: errorMsg });
        setCurrentProgress(`Error: ${errorMsg}`);
      }

      // Small delay between jobs
      await new Promise((r) => setTimeout(r, 1000));
    }

    setIsRunning(false);
    setActiveJobId(null);
    setCurrentProgress("");
  }

  function stopQueue() {
    abortRef.current?.abort();
    setIsRunning(false);
    setCurrentProgress("Stopped.");
  }

  function clearResults() {
    setResults([]);
    localStorage.removeItem(RESULTS_KEY);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          HiggsField Automation
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Browser-side generation tool — your cookies power the API calls.
        </p>
      </div>

      {/* Session */}
      <div style={{ marginBottom: 16 }}>
        <SessionSettings session={session} onChange={setSession} />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Reference images */}
          <ImageUploader
            images={referenceImages}
            session={session}
            onChange={setReferenceImages}
          />

          {/* Prompt builder */}
          <PromptBuilder
            prompt={prompt}
            images={referenceImages}
            onChange={setPrompt}
          />

          {/* Controls */}
          <Controls params={ctrlParams} onChange={setCtrlParams} />

          {/* Add to queue */}
          <div className="card">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="label">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter prompt, then click Add to Queue..."
                  rows={3}
                  style={{ fontSize: 13 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      addToQueue();
                    }
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                onClick={addToQueue}
                disabled={!prompt.trim()}
              >
                Add to Queue
              </button>
              {isRunning && (
                <button className="btn-danger" onClick={stopQueue}>
                  Stop
                </button>
              )}
            </div>
            {isRunning && currentProgress && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <div className="spinner" />
                {currentProgress}
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
              Ctrl+Enter to add quickly
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Queue */}
          <GenerationQueue
            queue={queue}
            currentIndex={activeJobId ? queue.findIndex(q => q.id === activeJobId) : -1}
            onChange={(q) => { setQueue(q); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }}
            onRun={runQueue}
            isRunning={isRunning}
          />

          {/* Results gallery */}
          <ResultsGallery
            results={results}
            onClear={clearResults}
          />
        </div>
      </div>

      <div style={{ marginTop: 32, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
        All API calls are made directly from your browser. Your session cookies are stored locally only.
      </div>
    </div>
  );
}
