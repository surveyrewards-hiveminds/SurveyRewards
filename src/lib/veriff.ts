// src/lib/veriff.ts
import { supabase } from "./supabase"; // adjust path as needed

export interface VeriffPersonInfo {
  idNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO format: YYYY-MM-DD
  email: string;
  documentNumber?: string;
  nationality?: string;
  address?: string;
}

export interface VeriffSessionPayload {
  person: VeriffPersonInfo;
  selfiePhotoBase64?: string; // base64-encoded selfie image (optional)
  documentPhotoBase64?: string; // base64-encoded document image (optional)
  callback?: string; // callback url from frontend
}

const supabaseEdgeFunctionsUrl = import.meta.env
  .VITE_SUPABASE_EDGE_FUNCTIONS_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function createVeriffSession(payload: VeriffSessionPayload) {
  const url = `${supabaseEdgeFunctionsUrl}/veriff-session`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabase.auth.apiKey || supabaseAnonKey,
      Authorization: `Bearer ${supabase.auth.apiKey || supabaseAnonKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  // Expecting: { sessionId, url }
  const data = await res.json();
  return {
    sessionId: data.sessionId,
    url: data.url,
  };
}
