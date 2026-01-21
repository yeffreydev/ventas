'use client';

import { useState, useRef, useEffect } from 'react';
import { HiMicrophone, HiX, HiCheck } from 'react-icons/hi';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100, // Standard sample rate for better compatibility
          channelCount: 1, // Mono for smaller file size
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Try different MIME types for better WhatsApp compatibility
      // Prioritize OGG Opus as requested for better WhatsApp compatibility
      let mimeType = 'audio/webm;codecs=opus'; // Default fallback

      // Try OGG Opus first as it's widely compatible with WhatsApp
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'; // OGG Opus - Best WhatsApp compatibility
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg'; // MP3 - Good WhatsApp compatibility
      } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
        mimeType = 'audio/mp4;codecs=mp4a.40.2'; // AAC - Decent compatibility
      }

      console.log('AudioRecorder: Supported MIME types:');
      console.log('- audio/ogg;codecs=opus (OGG Opus):', MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'));
      console.log('- audio/mpeg (MP3):', MediaRecorder.isTypeSupported('audio/mpeg'));
      console.log('- audio/mp4;codecs=mp4a.40.2 (AAC):', MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2'));
      console.log('- audio/webm;codecs=opus (WebM):', MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
      console.log('Selected MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps for good quality but reasonable file size
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Request data every 100ms for better chunking
      mediaRecorder.start(100);
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSend = () => {
    if (audioChunksRef.current.length > 0) {
      // Use the same mimeType that was used for recording
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm;codecs=opus';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      onRecordingComplete(audioBlob);
    }
  };

  const handleCancel = () => {
    stopRecording();
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 border border-current/20">
        <div className="flex flex-col items-center space-y-6">
          {/* Recording Indicator */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary'
            }`}>
              <HiMicrophone className="w-12 h-12 text-white" />
            </div>
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
            )}
          </div>

          {/* Status Text */}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              {isRecording ? 'Grabando audio...' : 'Audio grabado'}
            </p>
            <p className="text-3xl font-mono text-primary mt-2">
              {formatTime(recordingTime)}
            </p>
          </div>

          {/* Audio Preview */}
          {audioURL && !isRecording && (
            <div className="w-full">
              <audio
                src={audioURL}
                controls
                className="w-full"
                style={{
                  filter: 'invert(var(--is-dark-mode, 0))',
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 w-full">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex-1 py-3 px-6 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
              >
                Detener
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 px-6 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <HiX className="w-5 h-5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSend}
                  className="flex-1 py-3 px-6 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <HiCheck className="w-5 h-5" />
                  Enviar
                </button>
              </>
            )}
          </div>

          {/* Instructions */}
          <p className="text-xs text-text-secondary text-center">
            {isRecording 
              ? 'Haz clic en "Detener" cuando termines de grabar'
              : 'Escucha tu audio y envíalo o cancela para grabar de nuevo'
            }
          </p>
        </div>
      </div>
    </div>
  );
}