// HiggsField API client — all calls are made from the browser

import type { SessionData, GenerationRequest, JobResult, JobStatus } from "./types";

const HF_API_BASE = "https://fnf.higgsfield.ai";
const HF_UPLOAD_URL = "https://fnf.higgsfield.ai/images";

function buildHeaders(session: SessionData): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.clerkJwt}`,
    "Origin": "https://higgsfield.ai",
    "Referer": "https://higgsfield.ai/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  };

  if (session.xDatadomeClientid) {
    headers["x-datadome-clientid"] = session.xDatadomeClientid;
  }

  return headers;
}

function buildCookie(session: SessionData): string {
  const parts: string[] = [];
  if (session.cfBm) parts.push(`__cf_bm=${session.cfBm}`);
  if (session.cfClearance) parts.push(`cf_clearance=${session.cfClearance}`);
  if (session.clerkJwt) parts.push(`__session=${session.clerkJwt}`);
  if (session.datadome) parts.push(`datadome=${session.datadome}`);
  if (session.clientJwt) parts.push(`__client=${session.clientJwt}`);
  return parts.join("; ");
}

/**
 * Submit a generation job to HiggsField
 */
export async function submitGeneration(
  session: SessionData,
  request: GenerationRequest
): Promise<{ job_id: string }> {
  const response = await fetch(`${HF_API_BASE}/jobs/nano-banana-2`, {
    method: "POST",
    headers: buildHeaders(session),
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Submit failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Poll job status until completed, failed, or nsfw
 */
export async function pollJobStatus(
  session: SessionData,
  jobId: string,
  onProgress?: (status: string) => void,
  signal?: AbortSignal
): Promise<JobResult> {
  const maxAttempts = 200;
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      throw new Error("Polling aborted");
    }

    await sleep(4000);

    const res = await fetch(`${HF_API_BASE}/jobs/${jobId}`, {
      method: "GET",
      headers: {
        ...buildHeaders(session),
        "Cookie": buildCookie(session),
      } as Record<string, string>,
      credentials: "include",
    });

    if (!res.ok) {
      attempts++;
      continue;
    }

    const data = await res.json();
    const status: JobStatus = mapStatus(data.status);
    onProgress?.(status);

    if (status === "completed") {
      const images = (data.output?.images || []).map((img: any, i: number) => ({
        id: img.id || `${jobId}-${i}`,
        url: img.url || img.thumb_url || "",
        url_hd: img.url_hd || img.url || "",
        thumb_url: img.thumb_url || img.url || "",
        width: img.width || 768,
        height: img.height || 1376,
        nsfw: img.nsfw || false,
      }));

      return {
        job_id: jobId,
        status: "completed",
        images,
        completed_at: Date.now(),
      };
    }

    if (status === "nsfw") {
      return {
        job_id: jobId,
        status: "nsfw",
        nsfw: true,
        completed_at: Date.now(),
      };
    }

    if (status === "failed") {
      return {
        job_id: jobId,
        status: "failed",
        error: data.error?.message || data.error || "Generation failed",
        completed_at: Date.now(),
      };
    }

    attempts++;
  }

  return {
    job_id: jobId,
    status: "failed",
    error: "Polling timed out",
    completed_at: Date.now(),
  };
}

function mapStatus(raw: string): JobStatus {
  const s = (raw || "").toLowerCase();
  if (s === "completed" || s === "success") return "completed";
  if (s === "nsfw") return "nsfw";
  if (s === "failed" || s === "error") return "failed";
  if (s === "pending" || s === "queued") return "pending";
  return "running";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a reference image to HiggsField.
 * Returns the CloudFront URL and image ID.
 */
export async function uploadReferenceImage(
  file: File,
  session: SessionData
): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${session.clerkJwt}`,
    "Origin": "https://higgsfield.ai",
    "Referer": "https://higgsfield.ai/",
  };
  if (session.xDatadomeClientid) {
    headers["x-datadome-clientid"] = session.xDatadomeClientid;
  }

  const response = await fetch(HF_UPLOAD_URL, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    id: data.id || data.image_id || data.uuid,
    url: data.url || data.cloudfront_url || data.signed_url,
  };
}

/**
 * Generate a UUID v4
 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
