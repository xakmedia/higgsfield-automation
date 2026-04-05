// Types for the HiggsField Automation app

export interface InputImage {
  id: string;
  url: string;
  type: "image_job" | "media_input";
  position: number; // 1 = first, 2 = second, etc.
}

export interface GenerationParams {
  prompt: string;
  input_images: InputImage[];
  width: number;
  height: number;
  batch_size: number;
  aspect_ratio: string;
  is_storyboard: boolean;
  is_zoom_control: boolean;
  use_unlim: boolean;
  resolution: "1k" | "2k" | "4k";
}

export interface GenerationRequest {
  params: GenerationParams;
  use_unlim: boolean;
}

export type JobStatus = "pending" | "running" | "completed" | "failed" | "nsfw";

export interface GeneratedImage {
  id: string;
  url: string;
  url_hd?: string;
  thumb_url?: string;
  width: number;
  height: number;
  nsfw?: boolean;
}

export interface JobResult {
  job_id: string;
  status: JobStatus;
  images?: GeneratedImage[];
  error?: string;
  nsfw?: boolean;
  completed_at?: number;
}

export interface QueueItem {
  id: string;
  index: number;
  prompt: string;
  params: Omit<GenerationParams, "prompt" | "input_images">;
  input_images: InputImage[];
  status: JobStatus;
  result?: JobResult;
  error?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
}

export interface AppState {
  session: SessionData;
  queue: QueueItem[];
  results: JobResult[];
  referenceImages: InputImage[];
  templates: PromptTemplate[];
}

export interface SessionData {
  clerkJwt: string;
  cfClearance: string;
  cfBm: string;
  datadome: string;
  clientJwt: string;
  xDatadomeClientid: string;
}

export const DEFAULT_SESSION: SessionData = {
  clerkJwt: "",
  cfClearance: "",
  cfBm: "",
  datadome: "",
  clientJwt: "",
  xDatadomeClientid: "",
};

export const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 768, height: 1376 },
  "1:1":  { width: 1024, height: 1024 },
  "16:9": { width: 1376, height: 768 },
  "4:3":  { width: 1152, height: 896 },
};

export const RESOLUTIONS: Array<"1k" | "2k" | "4k"> = ["1k", "2k", "4k"];
export const ASPECT_RATIO_OPTIONS = Object.keys(ASPECT_RATIOS);
