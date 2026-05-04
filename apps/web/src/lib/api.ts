import type { StoreSnapshot } from "./types";

export type ApiOptions = { 
  method?: "GET" | "POST" | "PATCH" | "DELETE"; 
  body?: unknown 
};

export async function apiCall<T = StoreSnapshot>(path: string, options: ApiOptions = {}): Promise<T> {
  console.log(`[API] Fetching ${options.method || 'GET'} ${path}`);
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  console.log(`[API] Response received: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.status}`);
  }
  
  return (await response.json()) as T;
}
