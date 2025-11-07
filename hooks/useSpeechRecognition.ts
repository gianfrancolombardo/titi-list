import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DESIRED_CHUNK_SIZE,
  mergeChunks,
  resampleTo16k,
  TARGET_SAMPLE_RATE,
  isLocalWhisperSupported,
} from '../utils/audioUtils';

// Fix: Add types for the Web Speech API to resolve TypeScript errors.
// These interfaces are not part of the standard DOM library types as they are experimental.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface CustomWindow extends Window {
  SpeechRecognition?: SpeechRecognitionStatic;
  webkitSpeechRecognition?: SpeechRecognitionStatic;
}

type StatusLevel = 'info' | 'success' | 'warning' | 'error';

export interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
  isSupported: boolean;
  isModelLoading: boolean;
  usingLocalModel: boolean;
  statusMessage: string | null;
  statusLevel: StatusLevel | null;
}

type RecognizerDriver = 'local' | 'webspeech';

const LOCAL_MODEL_ID = 'Xenova/whisper-small';

const detectSpeechRecognition = (): SpeechRecognitionStatic | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const customWindow = window as CustomWindow;
  return customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;
};

const SpeechRecognitionAPI = detectSpeechRecognition();

let whisperTranscriberPromise: Promise<any> | null = null;

const loadWhisperTranscriber = async () => {
  try {
    if (!whisperTranscriberPromise) {
      console.info('[Speech] Loading local Whisper pipeline…');
      whisperTranscriberPromise = (async () => {
        const transformers = await import('@xenova/transformers');
        const { pipeline, env } = transformers;

        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        env.backends.onnx.wasm.proxy = false;

        return pipeline('automatic-speech-recognition', LOCAL_MODEL_ID, {
          quantized: true,
        });
      })();
    }

    const transcriber = await whisperTranscriberPromise;
    console.info('[Speech] Whisper pipeline ready.');
    return transcriber;
  } catch (error) {
    whisperTranscriberPromise = null;
    throw error;
  }
};

const transcribeWithWhisper = async (
  input: Blob | Float32Array,
  existingTranscriber?: any,
): Promise<string> => {
  const transcriber = existingTranscriber ?? (await loadWhisperTranscriber());
  const processedInput =
    input instanceof Float32Array
      ? {
          array: input,
          sampling_rate: TARGET_SAMPLE_RATE,
        }
      : input;

  if (input instanceof Float32Array) {
    console.info('[Speech] Sending audio to Whisper:', {
      samples: input.length,
      durationSec: input.length / TARGET_SAMPLE_RATE,
    });
  }

  const result = await transcriber(processedInput, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'es',
    task: 'transcribe',
  });

  if (result && typeof result.text === 'string') {
    return result.text.trim();
  }

  if (result && Array.isArray(result.segments)) {
    return result.segments.map((segment: { text: string }) => segment.text).join(' ').trim();
  }

  if (result && Array.isArray(result.chunks)) {
    return result.chunks.map((chunk: { text: string }) => chunk.text).join(' ').trim();
  }

  return '';
};

class WhisperAudioCollector {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private firstChunkLogged = false;

  async start(onChunk: (chunk: Float32Array, sampleRate: number) => void) {
    if (this.audioContext) {
      console.info('[Speech] Audio collector already running.');
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) {
      throw new Error('AudioContext no disponible.');
    }

    console.info('[Speech] Requesting microphone access…');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.info('[Speech] Microphone stream acquired.');
    const audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') {
      console.info('[Speech] Resuming suspended AudioContext.');
      await audioContext.resume();
      console.info('[Speech] AudioContext state:', audioContext.state);
    }
    const source = audioContext.createMediaStreamSource(stream);
    try {
      await audioContext.audioWorklet.addModule('/worklets/speech-collector.js');
    } catch (error) {
      console.error('Unable to load audio worklet module:', error);
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      throw error;
    }

    const workletNode = new AudioWorkletNode(audioContext, 'speech-collector-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      outputChannelCount: [1],
      processorOptions: {
        chunkSize: DESIRED_CHUNK_SIZE,
      },
    });

    workletNode.port.onmessage = event => {
      if (event.data.type === 'audio-chunk') {
        const chunk = new Float32Array(event.data.payload);
        onChunk(chunk, audioContext.sampleRate);
        if (!this.firstChunkLogged) {
          console.info(
            '[Speech] Received first audio chunk:',
            chunk.length,
            'samples @',
            audioContext.sampleRate,
            'Hz',
          );
          this.firstChunkLogged = true;
        }
      } else if (event.data.type === 'log') {
        console.info('[Speech][Worklet]', event.data.message);
      }
    };

    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    source.connect(workletNode);
    workletNode.connect(silentGain);
    silentGain.connect(audioContext.destination);
    console.info(
      '[Speech] Audio processing graph connected via AudioWorklet + silent gain node.',
    );

    this.audioContext = audioContext;
    this.workletNode = workletNode;
    this.silentGain = silentGain;
    this.sourceNode = source;
    this.stream = stream;
  }

  stop() {
    if (!this.audioContext) {
      console.info('[Speech] Audio collector already stopped.');
      return;
    }

    try {
      this.workletNode?.port.postMessage({ type: 'flush' });
    } catch (error) {
      console.warn('[Speech] Failed to flush audio worklet before stopping:', error);
    }

    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.silentGain?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext.close();
    console.info('[Speech] Audio collector stopped.');
    console.trace('[Speech] Audio collector stop trace');

    this.audioContext = null;
    this.workletNode = null;
    this.silentGain = null;
    this.sourceNode = null;
    this.stream = null;
    this.firstChunkLogged = false;
  }
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const mountedRef = useRef(true);

  const [canUseLocal, setCanUseLocal] = useState(() => isLocalWhisperSupported());
  const [activeDriver, setActiveDriver] = useState<RecognizerDriver>(() =>
    isLocalWhisperSupported() ? 'local' : 'webspeech',
  );
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [usingLocalModel, setUsingLocalModel] = useState(canUseLocal);
  const [status, setStatus] = useState<{ message: string; level: StatusLevel } | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recorderRef = useRef<WhisperAudioCollector | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);

  const isListeningRef = useRef(false);
  const pendingStartRef = useRef(false);
  const activeDriverRef = useRef<RecognizerDriver>(activeDriver);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.stop();
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    setCanUseLocal(isLocalWhisperSupported());
  }, []);

  useEffect(() => {
    activeDriverRef.current = activeDriver;
  }, [activeDriver]);

  const ensureFallbackRecognizer = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      return false;
    }

    if (recognitionRef.current) {
      return true;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (!mountedRef.current || !finalTranscript) {
        return;
      }

      setTranscript(prev => (prev ? `${prev.trim()} ${finalTranscript.trim()}`.trim() : finalTranscript.trim()));
      console.info('[Speech] Web Speech transcription chunk:', finalTranscript.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) {
        return;
      }
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!mountedRef.current) {
        return;
      }

      if (isListeningRef.current && activeDriverRef.current === 'webspeech' && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('Auto-restart failed:', err);
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, [activeDriver]);

  const handleLocalOnStop = useCallback(
    async (transcriber: any) => {
      const chunks = pcmChunksRef.current;
      pcmChunksRef.current = [];

      if (chunks.length === 0) {
        if (mountedRef.current) {
          setError('No se capturó audio.');
          setIsListening(false);
          setStatus(null);
        }
        return;
      }

      const audio = mergeChunks(chunks);
      if (audio.length === 0) {
        if (mountedRef.current) {
          setError('No se capturó audio.');
          setIsListening(false);
          setStatus(null);
        }
        return;
      }
      console.info('[Speech] Audio captured locally. Starting transcription…');
      const min = audio.reduce((acc, val) => Math.min(acc, val), Number.POSITIVE_INFINITY);
      const max = audio.reduce((acc, val) => Math.max(acc, val), Number.NEGATIVE_INFINITY);
      console.info('[Speech] Audio stats:', {
        sampleCount: audio.length,
        durationSec: audio.length / TARGET_SAMPLE_RATE,
        minAmplitude: min,
        maxAmplitude: max,
      });

      try {
        setStatus({ message: 'Transcribiendo audio local…', level: 'info' });
        const text = await transcribeWithWhisper(audio, transcriber);
        if (!mountedRef.current) {
          return;
        }

        if (text) {
          setTranscript(text);
          setError(null);
          console.info('[Speech] Local Whisper transcription complete:', text);
          setStatus({ message: 'Transcripción local completada.', level: 'success' });
        } else {
          setError('No se obtuvo una transcripción local.');
          console.warn('[Speech] Local Whisper returned an empty transcription.');
          setStatus({ message: 'No se obtuvo transcripción local.', level: 'warning' });
        }
      } catch (err) {
        console.error('Local whisper transcription failed:', err);
        if (mountedRef.current) {
          setError('Error al transcribir con Whisper local.');
          setStatus({ message: 'Error durante la transcripción local.', level: 'error' });
        }
      } finally {
        if (mountedRef.current) {
          setIsListening(false);
          // Allow brief time for toast visibility before clearing the status.
          setTimeout(() => {
            if (mountedRef.current) {
              setStatus(null);
            }
          }, 400);
        }
      }
    },
    [],
  );

  const startWebspeechListening = useCallback(() => {
    if (!ensureFallbackRecognizer() || isListeningRef.current) {
      return;
    }

    if (!recognitionRef.current) {
      setError('El reconocimiento de voz no es compatible con este navegador.');
      return;
    }

    try {
      setTranscript('');
      setError(null);
      setUsingLocalModel(false);
      setActiveDriver('webspeech');
      recognitionRef.current.start();
      console.info('[Speech] Using Web Speech API recognizer.');
      setIsListening(true);
      setStatus({ message: 'Escuchando con el reconocimiento del navegador…', level: 'info' });
    } catch (err) {
      console.error('Speech recognition start error:', err);
      setError('No se pudo iniciar el reconocimiento. ¿Está permitido el uso del micrófono?');
      setStatus({ message: 'No se pudo iniciar el reconocimiento del navegador.', level: 'error' });
    }
  }, [ensureFallbackRecognizer]);

  const startLocalListening = useCallback(async () => {
    console.info(
      '[Speech] startLocalListening entry',
      JSON.stringify({
        canUseLocal,
        isListening: isListeningRef.current,
        isModelLoading,
        chunkCount: pcmChunksRef.current.length,
      }),
    );
    if (!canUseLocal || isListeningRef.current || isModelLoading || pendingStartRef.current) {
      console.info('[Speech] startLocalListening aborted due to guard conditions.');
      return;
    }

    pendingStartRef.current = true;
    setTranscript('');
    setError(null);
    setStatus({ message: 'Inicializando micrófono…', level: 'info' });
    setIsModelLoading(true);

    try {
      console.info('[Speech] Starting audio collector…');
      const recorder = new WhisperAudioCollector();
      await recorder.start((chunk, sampleRate) => {
        const resampled = resampleTo16k(chunk, sampleRate);
        if (resampled.length > 0) {
          pcmChunksRef.current.push(resampled);
        }
      });

      if (!mountedRef.current) {
        recorder.stop();
        return;
      }

      recorderRef.current = recorder;
      pcmChunksRef.current = [];
      setActiveDriver('local');
      setUsingLocalModel(true);
      console.info('[Speech] Local Whisper listening started.');
      console.info('[Speech] State -> listening');
      setStatus({ message: 'Escuchando con Whisper local…', level: 'success' });
      setIsListening(true);
      isListeningRef.current = true;

      setIsModelLoading(true);
      try {
        console.info('[Speech] Prefetching Whisper pipeline for transcription…');
        await loadWhisperTranscriber();
        console.info('[Speech] Whisper pipeline ready (prefetched).');
      } catch (error) {
        console.error('Error preloading Whisper pipeline:', error);
        if (mountedRef.current) {
          setStatus({ message: 'Error al cargar el modelo local.', level: 'error' });
          setUsingLocalModel(false);
          setCanUseLocal(false);
          if (SpeechRecognitionAPI) {
            startWebspeechListening();
          }
        }
        return;
      } finally {
        if (mountedRef.current) {
          setIsModelLoading(false);
        }
      }
    } catch (err) {
      console.error('Unable to start local whisper:', err);
      recorderRef.current?.stop();
      recorderRef.current = null;

      if (mountedRef.current) {
        setUsingLocalModel(false);
        setCanUseLocal(false);
        setError('No se pudo iniciar Whisper local. Cambiando al modo compatible del navegador.');
        console.warn('[Speech] Falling back to Web Speech API recognizer.');
        setStatus({ message: 'Whisper local no disponible. Usando el reconocimiento del navegador…', level: 'warning' });

        if (SpeechRecognitionAPI) {
          startWebspeechListening();
        }
      }
    } finally {
      pendingStartRef.current = false;
      if (mountedRef.current && !isListeningRef.current) {
        setIsModelLoading(false);
      }
    }
  }, [canUseLocal, isModelLoading, startWebspeechListening]);

  const startListening = useCallback(() => {
    console.info(
      '[Speech] startListening invoked',
      JSON.stringify({
        activeDriver,
        canUseLocal,
        isModelLoading,
        isListening: isListeningRef.current,
        usingLocalModel,
      }),
    );
    if (activeDriver === 'local' && canUseLocal) {
      if (pendingStartRef.current) {
        console.info('[Speech] Start already in progress, ignoring click.');
        return;
      }
      if (isModelLoading) {
        console.info('[Speech] Model still loading, waiting before starting again.');
      }
      void startLocalListening();
    } else {
      if (!canUseLocal) {
        console.warn('[Speech] Local mode disabled, attempting Web Speech API.');
      }
      startWebspeechListening();
    }
  }, [activeDriver, canUseLocal, isModelLoading, startLocalListening, startWebspeechListening, usingLocalModel]);

  const stopListening = useCallback(() => {
    if (activeDriver === 'local') {
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.stop();
      }
      recorderRef.current = null;
      setIsListening(false);
      isListeningRef.current = false;
      console.info('[Speech] Local Whisper listening stopped.');
      setStatus({ message: 'Transcribiendo audio local…', level: 'info' });
      void (async () => {
        try {
          const transcriber = await loadWhisperTranscriber();
          await handleLocalOnStop(transcriber);
        } catch (error) {
          console.error('Error al finalizar la transcripción local:', error);
          if (mountedRef.current) {
            setError('No se pudo completar la transcripción local.');
            setStatus({ message: 'No se pudo completar la transcripción local.', level: 'error' });
            setIsListening(false);
          }
        }
      })();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.info('[Speech] Web Speech API listening stopped.');
      setStatus(null);
    }
  }, [activeDriver]);

  const isSupported = canUseLocal || !!SpeechRecognitionAPI;

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    isSupported,
    isModelLoading,
    usingLocalModel: usingLocalModel && activeDriver === 'local',
    statusMessage: status?.message ?? null,
    statusLevel: status?.level ?? null,
  };
};