"use client";

import { useEffect, useRef, useCallback, useReducer } from "react";
import Vapi from "@vapi-ai/web";

export type Emotion = "happy" | "excited" | "sad" | "empathetic" | "proud" | "thinking" | "talking" | "idle";
export type CallStatus = "idle" | "connecting" | "active" | "ending" | "ended" | "error";

interface VoiceCallState {
  status: CallStatus;
  emotion: Emotion;
  transcript: string;
  isMuted: boolean;
  error: string | null;
  volumeLevel: number;
}

type VoiceCallAction =
  | { type: "CALL_START" }
  | { type: "CALL_CONNECT" }
  | { type: "CALL_END" }
  | { type: "CALL_ERROR"; error: string }
  | { type: "SET_EMOTION"; emotion: Emotion }
  | { type: "SET_TRANSCRIPT"; transcript: string }
  | { type: "SET_MUTED"; muted: boolean }
  | { type: "SET_VOLUME"; level: number }
  | { type: "RESET" };

function voiceCallReducer(state: VoiceCallState, action: VoiceCallAction): VoiceCallState {
  switch (action.type) {
    case "CALL_START":     return { ...state, status: "connecting", error: null };
    case "CALL_CONNECT":   return { ...state, status: "active", emotion: "talking" };
    case "CALL_END":       return { ...state, status: "ended", emotion: "idle" };
    case "CALL_ERROR":     return { ...state, status: "error", error: action.error };
    case "SET_EMOTION":    return { ...state, emotion: action.emotion };
    case "SET_TRANSCRIPT": return { ...state, transcript: action.transcript };
    case "SET_MUTED":      return { ...state, isMuted: action.muted };
    case "SET_VOLUME":     return { ...state, volumeLevel: action.level };
    case "RESET":          return initialState;
    default:               return state;
  }
}

const initialState: VoiceCallState = {
  status: "idle",
  emotion: "idle",
  transcript: "",
  isMuted: false,
  error: null,
  volumeLevel: 0,
};

interface UseVoiceCallOptions {
  assistantId: string;
  vapiPublicKey: string;
  firstMessage: string;
  authToken: string | null;
}

export function useVoiceCall({
  assistantId,
  vapiPublicKey,
  firstMessage,
  authToken,
}: UseVoiceCallOptions) {
  const [state, dispatch] = useReducer(voiceCallReducer, initialState);

  const vapiRef = useRef<Vapi | null>(null);
  const emotionAbortRef = useRef<AbortController | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const analyzeEmotion = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      if (emotionAbortRef.current) {
        emotionAbortRef.current.abort();
      }
      emotionAbortRef.current = new AbortController();

      try {
        const res = await fetch("/api/analyze-emotion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ transcript }),
          signal: emotionAbortRef.current.signal,
        });

        if (!res.ok) return;

        const { emotion } = await res.json();
        if (emotion) {
          dispatch({ type: "SET_EMOTION", emotion: emotion as Emotion });
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[useVoiceCall] Emotion analysis error:", err);
        }
      }
    },
    [authToken]
  );

  const setupVapiListeners = useCallback(
    (vapi: Vapi) => {
      vapi.on("call-start", () => {
        dispatch({ type: "CALL_CONNECT" });
      });

      vapi.on("call-end", () => {
        dispatch({ type: "CALL_END" });
        if (emotionAbortRef.current) {
          emotionAbortRef.current.abort();
        }
      });

      vapi.on("error", (error) => {
        console.error("[useVoiceCall] Vapi error:", error);
        dispatch({ type: "CALL_ERROR", error: "Call failed. Please try again." });
      });

      vapi.on("volume-level", (level: number) => {
        dispatch({ type: "SET_VOLUME", level });
      });

      vapi.on("message", (message: { type: string; role?: string; transcript?: string }) => {
        if (message.type === "transcript" && message.role === "assistant" && message.transcript) {
          dispatch({ type: "SET_TRANSCRIPT", transcript: message.transcript });
          dispatch({ type: "SET_EMOTION", emotion: "talking" });

          setTimeout(() => {
            analyzeEmotion(message.transcript!);
          }, 400);
        }
      });
    },
    [analyzeEmotion]
  );

  const startCall = useCallback(async () => {
    if (state.status === "connecting" || state.status === "active") return;

    dispatch({ type: "CALL_START" });

    try {
      const vapi = new Vapi(vapiPublicKey);
      vapiRef.current = vapi;
      setupVapiListeners(vapi);

      // CRITICAL: only pass firstMessage — no model or voice overrides
      await vapi.start(assistantId, { firstMessage });
    } catch (err) {
      console.error("[useVoiceCall] Failed to start call:", err);
      dispatch({ type: "CALL_ERROR", error: "Could not start call. Check your microphone permissions." });
    }
  }, [state.status, vapiPublicKey, assistantId, firstMessage, setupVapiListeners]);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      dispatch({ type: "CALL_END" });
      vapiRef.current.stop();
      vapiRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const newMuted = !state.isMuted;
    vapiRef.current.setMuted(newMuted);
    dispatch({ type: "SET_MUTED", muted: newMuted });
  }, [state.isMuted]);

  const registerAnimFrame = useCallback((frameId: number) => {
    animFrameRef.current = frameId;
  }, []);

  useEffect(() => {
    return () => {
      if (emotionAbortRef.current) {
        emotionAbortRef.current.abort();
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startCall,
    endCall,
    toggleMute,
    registerAnimFrame,
  };
}
