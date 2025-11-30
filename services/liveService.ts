import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface LiveSessionCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onAudioData?: (base64Audio: string) => void;
  onError?: (error: any) => void;
  onTranscription?: (text: string, isUser: boolean) => void;
}

export class LiveSession {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: LiveSessionCallbacks, systemInstruction: string) {
    // Ensure any previous session on this instance is cleaned up
    await this.disconnect();

    try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        this.sessionPromise = this.ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
                console.log("Live Session Opened");
                this.startAudioStream();
                if (callbacks.onOpen) callbacks.onOpen();
            },
            onmessage: (message: LiveServerMessage) => {
                // Handle Audio Output
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio && callbacks.onAudioData) {
                    callbacks.onAudioData(base64Audio);
                }

                // Handle Transcriptions
                 if (message.serverContent?.outputTranscription) {
                     const text = message.serverContent.outputTranscription.text;
                     if (callbacks.onTranscription) callbacks.onTranscription(text, false);
                 } else if (message.serverContent?.inputTranscription) {
                     const text = message.serverContent.inputTranscription.text;
                      if (callbacks.onTranscription) callbacks.onTranscription(text, true);
                 }

                if (message.serverContent?.turnComplete) {
                    // Turn complete logic if needed
                }
            },
            onclose: () => {
                console.log("Live Session Closed");
                if (callbacks.onClose) callbacks.onClose();
            },
            onerror: (err) => {
                console.error("Live Session Error", err);
                if (callbacks.onError) callbacks.onError(err);
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
          }
        });
    } catch (error) {
        console.error("Connection failed", error);
        if (callbacks.onError) callbacks.onError(error);
        await this.disconnect();
    }
  }

  private startAudioStream() {
    if (!this.audioContext || !this.stream || !this.sessionPromise) return;

    this.inputSource = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = this.createPcmBlob(inputData);
        
        this.sessionPromise?.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
        }).catch(err => {
            console.error("Error sending audio input", err);
        });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private createPcmBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);
    
    return {
        data: base64,
        mimeType: 'audio/pcm;rate=16000'
    };
  }

  async disconnect() {
    // Stop processing input audio
    if (this.processor && this.inputSource) {
        this.inputSource.disconnect();
        this.processor.disconnect();
        this.processor = null;
        this.inputSource = null;
    }

    // Stop microphone stream
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
    }

    // Close AudioContext
    if (this.audioContext) {
        if (this.audioContext.state !== 'closed') {
            try {
                await this.audioContext.close();
            } catch (e) {
                console.error("Error closing AudioContext", e);
            }
        }
        this.audioContext = null;
    }

    // Reset session promise (we cannot explicitly close the session object in this SDK version easily, 
    // but abandoning the promise and closing the websocket underneath via browser gc/timeout usually happens.
    // Ideally we would call session.close() if available on the resolved value).
    this.sessionPromise = null;
  }
}

// Audio Decode Helper
export const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const sampleRate = 24000;
    const numChannels = 1;
    const frameCount = dataInt16.length / numChannels;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
}