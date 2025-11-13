import { useState, useEffect, useRef, useCallback } from 'react';
import { transcribeAudioWithOpenAI } from '../services/openaiService';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
  isSupported: boolean;
  isTranscribing: boolean;
  status: 'idle' | 'recording' | 'transcribing' | 'error';
}

const MAX_RECORDING_MS = 60000;

interface CleanupOptions {
  preserveAudio?: boolean;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'error'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const cleanupMedia = useCallback((options?: CleanupOptions) => {
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (!options?.preserveAudio) {
      audioChunksRef.current = [];
    }
    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const handleTranscription = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn('[Whisper] No audio chunks collected, skipping transcription');
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    abortControllerRef.current = new AbortController();

    if (isMountedRef.current) {
      setIsTranscribing(true);
      setStatus('transcribing');
      console.info('[Whisper] Uploading audio blob to OpenAI Whisper', {
        size: audioBlob.size,
        type: audioBlob.type,
      });
    }

    try {
      const text = await transcribeAudioWithOpenAI(audioBlob, {
        signal: abortControllerRef.current.signal,
      });
      if (isMountedRef.current) {
        console.info('[Whisper] Transcription received', text);
        setTranscript(text);
        setStatus('idle');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      if (isMountedRef.current) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setIsTranscribing(false);
          setStatus('idle');
          return;
        }
        setError('No se pudo transcribir el audio. Inténtalo nuevamente.');
        setStatus('error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsTranscribing(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const hasSupport =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== 'undefined';

    setIsSupported(hasSupport);
    if (!hasSupport) {
      setError('El reconocimiento de voz no es compatible con este navegador.');
      setStatus('error');
    }

    return () => {
      isMountedRef.current = false;
      cleanupMedia();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cleanupMedia]);

  const startListening = useCallback(() => {
    if (!isSupported || isListening || isTranscribing) {
      console.warn('[Whisper] Ignoring startListening, invalid state', {
        isSupported,
        isListening,
        isTranscribing,
      });
      return;
    }

    const startRecording = async () => {
      try {
        setError(null);
        setTranscript('');
        setStatus('recording');
        console.info('[Whisper] Requesting microphone access');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = event => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            console.debug('[Whisper] Chunk captured', { size: event.data.size });
          }
        };

        recorder.onerror = event => {
          console.error('MediaRecorder error:', event);
          if (isMountedRef.current) {
            setError('Error de grabación. Revisa los permisos del micrófono.');
            setIsListening(false);
            setStatus('error');
          }
          cleanupMedia();
        };

        recorder.onstop = () => {
          cleanupMedia({ preserveAudio: true });
          if (isMountedRef.current) {
            setIsListening(false);
            void handleTranscription();
          }
        };

        recorder.start();
        setIsListening(true);
        console.info('[Whisper] Recording started');

        stopTimeoutRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            console.warn('[Whisper] Max recording length reached, stopping');
            mediaRecorderRef.current.stop();
          }
        }, MAX_RECORDING_MS);
      } catch (err) {
        console.error('Speech capture start error:', err);
        if (isMountedRef.current) {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setError('No tengo permisos para usar tu micrófono.');
          } else {
            setError('No se pudo iniciar la grabación.');
          }
          setStatus('error');
        }
        cleanupMedia();
      }
    };

    void startRecording();
  }, [cleanupMedia, handleTranscription, isListening, isSupported, isTranscribing]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.info('[Whisper] Stopping recording manually');
      mediaRecorderRef.current.stop();
    } else {
      console.warn('[Whisper] stopListening called with no active recording');
    }
  }, []);

  return { isListening, transcript, startListening, stopListening, error, isSupported, isTranscribing, status };
};