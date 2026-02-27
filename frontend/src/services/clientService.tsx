import { toastManager } from '../utils/ToastManager';

const BASE_URL =
    typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_ADK_API_BASE_URL ?? 'http://localhost:8081'
        : 'http://localhost:8081';
console.log(`API Service Initialized using Base URL: ${BASE_URL}`);

// --- Helpers ---

const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream, application/json, text/plain, */*',
});

/** Format FastAPI-style error body (detail can be string or array of errors). */
function formatErrorDetail(detail: unknown): string {
    if (detail == null) return '';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map((e: any) => e?.msg ?? e?.message ?? JSON.stringify(e)).join('; ');
    }
    return String(detail);
}

export interface StreamCallbacks {
    onChunk?: (text: string) => void;
    onChartSpec?: (spec: Record<string, unknown>) => void;
    onStatus?: (status: string) => void;
}

function isVegaLiteSpec(obj: unknown): obj is Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null) return false;
    const rec = obj as Record<string, unknown>;
    return (
        (typeof rec.$schema === 'string' && rec.$schema.includes('vega-lite')) ||
        ('mark' in rec && ('encoding' in rec || 'data' in rec))
    );
}

function tryExtractChartSpec(data: any, callbacks?: StreamCallbacks): void {
    try {
        const parts = data?.content?.parts ?? data?.parts ?? [];
        for (const part of parts) {
            if (part?.functionResponse) {
                const respData = part.functionResponse.response;
                if (typeof respData === 'string') {
                    try {
                        const parsed = JSON.parse(respData);
                        if (isVegaLiteSpec(parsed)) {
                            callbacks?.onChartSpec?.(parsed);
                        }
                    } catch { /* not JSON */ }
                } else if (isVegaLiteSpec(respData)) {
                    callbacks?.onChartSpec?.(respData);
                }
            }
            if (part?.functionCall?.name) {
                const toolName = part.functionCall.name;
                if (toolName === 'bigquery_nl2sql') callbacks?.onStatus?.('Generating SQL…');
                else if (toolName === 'execute_sql') callbacks?.onStatus?.('Querying BigQuery…');
                else if (toolName === 'build_dashboard') callbacks?.onStatus?.('Building visualization…');
                else if (toolName === 'get_recommendations') callbacks?.onStatus?.('Generating recommendations…');
                else callbacks?.onStatus?.(`Calling ${toolName}…`);
            }
        }
    } catch { /* ignore extraction errors */ }
}

const handleStreamingResponse = async (response: Response, callbacks?: StreamCallbacks) => {
    if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status}`;
        const text = await response.text();
        if (text) {
            try {
                const errorBody = JSON.parse(text);
                const detail = formatErrorDetail(errorBody.detail ?? errorBody.message);
                if (detail) errorMessage = detail;
            } catch {
                errorMessage = text;
            }
        }
        const toastMsg = errorMessage.includes('\n')
            ? errorMessage.split('\n')[0].trim()
            : errorMessage.slice(0, 300);
        console.error(`API Error (${response.status}):`, errorMessage);
        toastManager.show(toastMsg, 'error');
        throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("text/event-stream")) {
        if (response.status === 204) return {};
        return await response.json();
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) return {};

    let buffer = "";
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
                const jsonStr = trimmed.replace("data:", "").trim();
                if (!jsonStr) continue;

                try {
                    const data = JSON.parse(jsonStr);

                    tryExtractChartSpec(data, callbacks);

                    let newText = "";
                    if (data?.content?.parts?.[0]?.text) {
                        newText = data.content.parts[0].text;
                    } else if (data?.parts?.[0]?.text) {
                        newText = data.parts[0].text;
                    }

                    if (newText) {
                        fullText += newText;
                        callbacks?.onChunk?.(newText);
                    }
                } catch (e) {
                    console.warn("Stream parse error", e);
                }
            }
        }
    }
    
    callbacks?.onStatus?.('idle');
    return { parts: [{ text: fullText }] };
};

// --- API Client ---
export const apiClient = {
    get: async <T = any>(endpoint: string): Promise<T> => {
        try {
            const response = await fetch(`/api${endpoint}`, { 
                method: 'GET',
                headers: getHeaders(),
            });
            return await handleStreamingResponse(response);
        } catch (error: any) {
            const msg = error.message || "Network error.";
            if (!msg.includes("HTTP Error")) toastManager.show(msg, 'error');
            throw error;
        }
    },

    post: async <T = any>(endpoint: string, body: any = {}, callbacks?: StreamCallbacks | ((text: string) => void)): Promise<T> => {
        const normalizedCallbacks: StreamCallbacks | undefined =
            typeof callbacks === 'function' ? { onChunk: callbacks } : callbacks;
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body),
            });
            return await handleStreamingResponse(response, normalizedCallbacks);
        } catch (error: any) {
            const msg = error.message || "Network error.";
            if (!msg.includes("HTTP Error")) {
                 toastManager.show(msg, 'error');
            }
            throw error;
        }
    },

    delete: async <T = any>(endpoint: string): Promise<T> => {
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            return await handleStreamingResponse(response);
        } catch (error: any) {
            const msg = error.message || "Delete failed.";
            if (!msg.includes("HTTP Error")) {
                 toastManager.show(msg, 'error');
            }
            throw error;
        }
    },

    download: async (endpoint: string): Promise<Blob> => {
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json, text/plain, */*' },
            });
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            return await response.blob();
        } catch (error) {
            console.error(`Download ${endpoint} failed:`, error);
            toastManager.show("Failed to download file.", 'error');
            throw error;
        }
    },

    baseUrl: BASE_URL
};

export const chatService = {
    sendUserMessage: async (
        agentId: string,
        text: string, 
        sessionId: string, 
        files: any[] = [], 
        callbacks?: StreamCallbacks | ((text: string) => void)
    ) => {
        const parts: any[] = [];
        if (text && text.trim().length > 0) parts.push({ text: text });

        if (files && files.length > 0) {
            for (const fileObj of files) {
                let actualFile: Blob | null = null;
                let displayName = "attachment";
                let mimeType = "application/octet-stream"; 

                if (fileObj instanceof Blob) {
                    actualFile = fileObj;
                    if ('name' in fileObj) displayName = (fileObj as File).name;
                    if (fileObj.type) mimeType = fileObj.type; 
                } else if (fileObj.file instanceof Blob) {
                    actualFile = fileObj.file;
                    displayName = fileObj.name || "attachment";
                    if (fileObj.file.type) mimeType = fileObj.file.type;
                }

                if (!actualFile) {
                    console.error("Skipping invalid file object:", fileObj);
                    continue;
                }

                try {
                    const base64Data = await fileToBase64(actualFile);
                    parts.push({
                        inlineData: {
                            displayName: displayName,
                            data: base64Data,
                            mimeType: mimeType 
                        }
                    });
                } catch (err) {
                    console.error("Failed to process file:", displayName, err);
                    toastManager.show(`Failed to attach file: ${displayName}`, 'warning');
                }
            }
        }

        const payload = {
            appName: agentId,
            userId: "user",          
            sessionId: sessionId,
            newMessage: {
                role: "user",
                parts: parts 
            },
            streaming: false,
            stateDelta: null
        };

        return await apiClient.post('/run_sse', payload, callbacks);
    }
};