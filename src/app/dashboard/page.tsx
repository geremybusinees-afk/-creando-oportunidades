'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Lock, Unlock, UploadCloud, PlayCircle, CheckCircle2,
  Search, LogOut, Bell, Check, AlertCircle, ChevronRight, X, AlertTriangle, Film, MonitorPlay,
  ExternalLink, MessageCircle, Clock, RefreshCw, Eye
} from 'lucide-react';

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: any; }
}

const DEFAULT_WHATSAPP_URL = 'https://chat.whatsapp.com/HdOQklvjXDnEmCy3ZIdFJw?mode=gi_t';

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video state
  const [videoConfig, setVideoConfig] = useState<{ videoUrl: string; videoType: string } | null>(null);
  const [publicConfig, setPublicConfig] = useState<Record<string, string>>({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [hasWatched2Min, setHasWatched2Min] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeTrackingRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);

  // Estado para la página puente
  const [bridgedImageUrl, setBridgedImageUrl] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [bridgeReason, setBridgeReason] = useState<string | null>(null);
  const [bridgeCheckedAt, setBridgeCheckedAt] = useState<Date | null>(null);

  // Cargar API de YouTube
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setIsYoutubeReady(true);
    } else if (window.YT) {
      setIsYoutubeReady(true);
    }
  }, []);

  // Cargar configuración pública
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    fetch('/api/config/public')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPublicConfig(data.data);
          setVideoConfig({
            videoUrl: data.data.videoUrl || '',
            videoType: data.data.videoType || 'link',
          });
        }
      })
      .catch(() => {});
  }, [status, router]);

  // Verificar estado inicial del usuario (para cuando vuelve a login)
  useEffect(() => {
    if (session?.user) {
      const userStatus = (session.user as any).status;
      if (userStatus === 'verified') {
        setStep(4);
      } else if (userStatus === 'pending_review') {
        setStep(3);
        startPolling();
      }
    }
  }, [session]);

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Inicializar reproductor de YouTube
  useEffect(() => {
    const ytId = getYoutubeId(videoConfig?.videoUrl);
    if (!ytId || !isYoutubeReady || youtubePlayerRef.current) return;

    const playerDiv = document.getElementById('youtube-player');
    if (!playerDiv) return;

    youtubePlayerRef.current = new window.YT.Player('youtube-player', {
      videoId: ytId,
      width: '100%',
      height: '100%',
      playerVars: {
        rel: 0,
        modestbranding: 1,
        controls: 1,
      },
      events: {
        onReady: () => {
          const dur = youtubePlayerRef.current.getDuration();
          if (dur) setVideoDuration(dur);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            if (youtubeTrackingRef.current) clearInterval(youtubeTrackingRef.current);
            youtubeTrackingRef.current = setInterval(() => {
              try {
                const ct = youtubePlayerRef.current?.getCurrentTime();
                if (ct !== undefined) {
                  setVideoProgress(Math.floor(ct));
                  if (ct >= 120) setHasWatched2Min(true);
                }
              } catch {}
            }, 1000);
          } else {
            if (youtubeTrackingRef.current) {
              clearInterval(youtubeTrackingRef.current);
              youtubeTrackingRef.current = null;
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              setVideoEnded(true);
              try {
                const dur = youtubePlayerRef.current?.getDuration();
                if (dur) setVideoProgress(Math.ceil(dur));
              } catch {}
            }
          }
        },
      },
    });

    return () => {
      if (youtubeTrackingRef.current) clearInterval(youtubeTrackingRef.current);
    };
  }, [videoConfig?.videoUrl, isYoutubeReady]);

  // Polling de estado de verificación
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/user/status');
        const data = await res.json();
        if (data.success) {
          setBridgeCheckedAt(new Date());
          const userStatus = data.data.status;
          if (userStatus === 'verified') {
            setBridgeStatus('verified');
            // Actualizar sesión
            await update();
            // Ir a paso 4 después de breve delay
            setTimeout(() => {
              setStep(4);
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }, 1500);
          } else if (userStatus === 'pending' && data.data.maxAttempts > 0) {
            // Fue rechazado pero aún tiene intentos
            setBridgeStatus('rejected');
            setBridgeReason(data.data.lastVerification?.reason || 'El comprobante no cumple con los requisitos.');
            setRemainingAttempts(data.data.maxAttempts);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          } else if (userStatus === 'pending' && data.data.maxAttempts <= 0) {
            setBridgeStatus('rejected');
            setBridgeReason('Has agotado todos tus intentos. Contacta al soporte.');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
          // Si sigue pending_review, seguimos polling
        }
      } catch {}
    }, 10000); // Poll cada 10 segundos
  }, [update]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError('');
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const startUpload = async () => {
    if (!selectedImage || !imagePreview) return;

    setIsScanning(true);
    setError('');

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 500);

    try {
      // Paso 1: Subir archivo directamente al servidor
      const formData = new FormData();
      formData.append('file', selectedImage);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Error al subir el archivo');
      }

      const finalUrl = uploadData.data.url;
      setBridgedImageUrl(finalUrl);

      clearInterval(progressInterval);
      setScanProgress(100);

      // Paso 2: Guardar comprobante como pendiente de revisión manual
      const verifyRes = await fetch('/api/verify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: finalUrl }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Error al enviar comprobante');
      }

      setRemainingAttempts(verifyData.data.remainingAttempts);

      // Ir a la página puente (paso 3)
      setTimeout(() => {
        setIsScanning(false);
        setStep(3);
        startPolling();
      }, 1000);

    } catch (err) {
      clearInterval(progressInterval);
      setIsScanning(false);
      setError(err instanceof Error ? err.message : 'Error al subir el comprobante');
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Manejo del progreso del video
  const handleTimeUpdate = () => {
    if (videoRef.current && !videoEnded) {
      const currentTime = videoRef.current.currentTime;
      setVideoProgress(currentTime);
      if (currentTime >= 120 && !hasWatched2Min) {
        setHasWatched2Min(true);
      }
    }
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    setVideoProgress(videoDuration);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleContinueClick = () => {
    if (!videoConfig?.videoUrl) {
      setStep(2);
      return;
    }

    if (videoProgress < 120) {
      const faltante = Math.ceil(120 - videoProgress);
      setWarningMessage(`⏳ Debes ver al menos 2 minutos del video para continuar.\n\nTe faltan ${faltante} segundo${faltante !== 1 ? 's' : ''}.`);
      setShowWarningModal(true);
      return;
    }

    setStep(2);
  };

  const handleReUpload = () => {
    setBridgeStatus('pending');
    setBridgeReason(null);
    setStep(2);
    setSelectedImage(null);
    setImagePreview(null);
    setError('');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getYoutubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in-up border border-amber-200">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-4">
              {videoProgress < 120 ? 'Espera un momento...' : ''}
            </h3>
            <p className="text-slate-600 text-center text-base leading-relaxed whitespace-pre-line mb-8">
              {warningMessage}
            </p>
            {videoProgress < 120 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Tu progreso</span>
                  <span>{formatTime(videoProgress)} / 2:00</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (videoProgress / 120) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-colors"
            >
              Seguir viendo el video
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="text-xl font-black text-slate-800 flex items-center">
          <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs mr-2">VA</div>
          Mastery
        </div>
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
              {session.user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-600 truncate max-w-[150px]">
              {session.user.email}
            </span>
          </div>
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-rose-500 flex items-center font-medium transition-colors">
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 py-10">
        <div className="mb-10">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-3 px-2">
            <span className={step >= 1 ? 'text-blue-600' : ''}>Paso 1: Video</span>
            <span className={step >= 2 ? 'text-blue-600' : ''}>Paso 2: Comprobante</span>
            <span className={step >= 3 ? 'text-blue-600' : ''}>Paso 3: Revisión</span>
            <span className={step >= 4 ? 'text-emerald-600' : ''}>Paso 4: Acceso</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000 ease-out"
              style={{ width: step === 1 ? '25%' : step === 2 ? '50%' : step === 3 ? '75%' : '100%' }}
            />
          </div>
        </div>

        {/* ===== STEP 1: VIDEO ===== */}
        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="p-6 md:p-8 text-center">
              <span className="inline-block px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                Acción Requerida
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-800">Mira este video para continuar</h2>
              <p className="text-slate-500 text-base max-w-2xl mx-auto">
                Te explico exactamente cómo activar tu cuenta gratuita y descargar todo el material del curso sin pagar un centavo.
              </p>
            </div>

            <div className="pb-4">
              {videoConfig?.videoUrl ? (
                <>
                  <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative">
                    {getYoutubeId(videoConfig.videoUrl) ? (
                      <div id="youtube-player" className="w-full h-full" />
                    ) : videoConfig.videoType === 'link' ? (
                      <iframe
                        src={videoConfig.videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={videoConfig.videoUrl}
                        className="w-full h-full object-contain bg-black"
                        controls
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={handleVideoEnded}
                        playsInline
                      />
                    )}

                    {!getYoutubeId(videoConfig.videoUrl) && videoConfig.videoType !== 'link' && !videoEnded && videoDuration > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-none">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${videoProgress >= 120 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, (videoProgress / (videoDuration || 120)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {videoProgress >= 120 ? (
                              <span className="text-emerald-400 text-xs font-bold flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Mínimo cumplido
                              </span>
                            ) : (
                              <span className="text-amber-400 text-xs font-medium">
                                {formatTime(videoProgress)} / 2:00
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!getYoutubeId(videoConfig.videoUrl) && videoConfig.videoType !== 'link' && videoEnded && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl px-8 py-4 border border-emerald-400/30 flex items-center gap-3">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          <span className="text-white font-bold text-lg">Video completo ✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-slate-900 rounded-2xl relative flex items-center justify-center group cursor-pointer overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-50 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <Film className="w-16 h-16 text-white/50 mb-3" />
                    <p className="text-white/60 text-sm font-medium">No hay video configurado</p>
                  </div>
                </div>
              )}
            </div>

            {videoConfig?.videoUrl && videoDuration > 0 && (
              <div className="px-4 md:px-6 pb-2">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MonitorPlay className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Progreso del video</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {videoProgress >= 120 ? (
                        <span className="text-emerald-600 font-bold flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Mínimo cumplido ✓
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">{formatTime(videoProgress)} / 2:00 mínimo</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        videoProgress >= 120 ? 'bg-emerald-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={handleContinueClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-xl text-lg shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-1 w-full md:w-auto"
              >
                Continuar al Paso 2
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: UPLOAD RECEIPT ===== */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="p-6 md:p-8 text-center">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                Paso 2 de 4
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-800">Sube tu comprobante de registro</h2>
              <p className="text-slate-500 text-base max-w-2xl mx-auto">
                Toma una captura de pantalla de tu registro exitoso en la plataforma y súbela aquí.{' '}
                <strong>Un agente de nuestro equipo verificará tu comprobante manualmente</strong> y te dará acceso al curso.
              </p>
            </div>

            <div className="px-6 md:px-8 pb-8 max-w-2xl mx-auto">
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-rose-700 font-medium text-sm">{error}</p>
                    {remainingAttempts > 0 && (
                      <p className="text-rose-500 text-xs mt-1">
                        Te quedan <strong>{remainingAttempts}</strong> intento{remainingAttempts !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8">
                {/* Enlace para registrarse */}
                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 text-lg mb-3 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </span>
                    1. Regístrate en la plataforma
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 ml-11">
                    Haz clic en el botón, crea tu cuenta y verifica tu correo electrónico.
                  </p>
                  <div className="ml-11">
                    <a
                      href={publicConfig.offerLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg transition-all group"
                    >
                      <span>Ir a crear mi cuenta</span>
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>

                <div className="h-px bg-blue-200/50 my-6" />

                {/* Subir comprobante */}
                <div>
                  <h3 className="font-bold text-slate-800 text-lg mb-3 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </span>
                    2. Sube tu captura de pantalla
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 ml-11">
                    Toma un screenshot donde se vea tu registro exitoso y súbela aquí. Aceptamos cualquier tipo de archivo.
                  </p>

                  <div className="ml-11">
                    {!imagePreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-blue-300 rounded-xl p-8 bg-white hover:bg-blue-50/50 transition-colors cursor-pointer text-center"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-700 mb-2">Haz clic para seleccionar tu comprobante</h4>
                        <p className="text-xs text-slate-500">Selecciona la captura de pantalla de tu registro</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-4 border border-blue-200">
                        <div className="relative h-48 rounded-lg overflow-hidden mb-4 border border-slate-200 bg-slate-100">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                          {isScanning && (
                            <>
                              <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-[1px]" />
                              <div className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] z-20 animate-scan" />
                              <div className="absolute inset-0 flex items-center justify-center z-30">
                                <span className="text-3xl font-black text-white drop-shadow-lg">{scanProgress}%</span>
                              </div>
                            </>
                          )}
                        </div>
                        {!isScanning ? (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setSelectedImage(null);
                                setImagePreview(null);
                              }}
                              className="px-5 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                            >
                              Cambiar imagen
                            </button>
                            <button
                              onClick={startUpload}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-600/20"
                              disabled={remainingAttempts <= 0}
                            >
                              <UploadCloud className="w-5 h-5 mr-2" /> Enviar comprobante
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-sm font-bold text-blue-600 animate-pulse">
                            Subiendo comprobante...
                          </p>
                        )}
                      </div>
                    )}

                    {remainingAttempts <= 3 && (
                      <div className="mt-3 text-xs text-slate-500 text-center">
                        Intentos restantes: {remainingAttempts}/3
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: BRIDGE PAGE (MANUAL REVIEW) ===== */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            {bridgeStatus === 'pending' && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-b from-blue-600 to-indigo-700 p-10 md:p-14 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/30">
                      <Clock className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                      ¡Comprobante recibido!
                    </h2>
                    <p className="text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
                      Tu comprobante está siendo verificado por un agente de nuestro equipo. Aprobaremos tu acceso en los próximos minutos si todo está correcto.
                    </p>
                  </div>
                </div>

                <div className="p-8 md:p-10 space-y-8">
                  {/* Estado de revisión */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="w-4 h-4 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-amber-800 font-bold text-lg">⏳ Tu verificación está siendo revisada</span>
                    </div>
                    <p className="text-amber-700 text-sm">
                      Un agente de nuestro equipo está revisando tu comprobante en este momento. Apenas sea aprobado, tendrás acceso automático al curso. Este proceso puede tomar algunos minutos.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-amber-600 text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Buscando actualizaciones cada 10 segundos...</span>
                    </div>
                    {bridgeCheckedAt && (
                      <p className="text-xs text-amber-500 mt-2">
                        Última verificación: {bridgeCheckedAt.toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Group - CTA Principal */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 md:p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-3">
                      ¡Únete a nuestro grupo de soporte!
                    </h3>
                    <p className="text-slate-600 mb-6 max-w-lg mx-auto">
                      Mientras nuestro equipo verifica tu registro, únete al grupo de WhatsApp para recibir seguimiento personalizado. Ahí te daremos el acceso completo y podrás resolver todas tus dudas directamente con nosotros.
                    </p>
                    <a
                      href={publicConfig.whatsappGroupUrl || DEFAULT_WHATSAPP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-xl shadow-emerald-500/30 transition-all transform hover:-translate-y-1"
                    >
                      <MessageCircle className="w-6 h-6 mr-3" />
                      Unirme al grupo de WhatsApp
                    </a>
                    <p className="text-xs text-slate-500 mt-4">
                      Recibirás el acceso completo y podrás preguntar todas tus dudas directamente con el equipo
                    </p>
                  </div>

                  {/* Recordatorio */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-blue-900 text-sm">🔐 IMPORTANTE:</p>
                        <p className="text-blue-700 text-sm mt-1">
                          Ten en cuenta tu <strong>correo y contraseña</strong> para poder ingresar después a la plataforma y logearte para ver el curso.{' '}
                          <strong className="text-blue-900">
                            ¿Estás listo para comenzar a generar ingresos desde casa como Asistente Virtual?
                          </strong>
                        </p>
                        <p className="text-blue-600 text-sm mt-2 font-medium">
                          Haz clic en el botón de aquí arriba y únete al grupo de soporte para darte seguimiento y el acceso completo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {bridgeStatus === 'verified' && (
              <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
                <div className="bg-gradient-to-b from-emerald-50 to-white p-12 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-3">¡Verificado!</h2>
                  <p className="text-emerald-700 font-semibold">Tu cuenta ha sido aprobada. Redirigiendo...</p>
                </div>
              </div>
            )}

            {bridgeStatus === 'rejected' && (
              <div className="bg-white rounded-3xl shadow-xl border border-rose-100 overflow-hidden">
                <div className="bg-gradient-to-b from-rose-50 to-white p-10 md:p-12 text-center">
                  <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3">
                    Comprobante no válido
                  </h2>
                  <p className="text-rose-600 font-medium mb-2">{bridgeReason}</p>
                  {remainingAttempts > 0 ? (
                    <>
                      <p className="text-slate-500 text-sm mb-6">
                        Te quedan <strong>{remainingAttempts}</strong> intento{remainingAttempts !== 1 ? 's' : ''}.
                        Asegúrate de que en la captura se vea tu email y la confirmación de registro.
                      </p>
                      <button
                        onClick={handleReUpload}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg transition-all inline-flex items-center"
                      >
                        <UploadCloud className="w-5 h-5 mr-2" /> Intentar de nuevo
                      </button>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm mt-4">
                      Has agotado todos tus intentos. Por favor, contacta al soporte para recibir ayuda.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 4: ACCESS GRANTED ===== */}
        {step === 4 && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100 animate-fade-in-up">
            <div className="bg-gradient-to-b from-emerald-50 to-white p-12 text-center border-b border-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMxMGI5ODEiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative z-10 w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
                <Check className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="relative z-10 text-4xl font-black text-slate-800 mb-3 tracking-tight">¡Acceso Concedido!</h2>
              <p className="relative z-10 text-emerald-700 font-semibold text-lg">Tu cuenta ha sido verificada exitosamente por nuestro equipo.</p>
            </div>
            <div className="p-10 flex flex-col md:flex-row items-center gap-10">
              <div className="w-full md:w-1/3 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-200">
                  <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6m-11.33-4L15.14 3h-6.86L1.72 15" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Material de Estudio</h4>
                    <p className="text-xs text-slate-500">Google Drive Compartido</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" /> 4 Módulos en Video</div>
                  <div className="flex items-center text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" /> Plantillas PDF</div>
                  <div className="flex items-center text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" /> Guía de Clientes</div>
                </div>
              </div>
              <div className="w-full md:w-2/3 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Todo tu material está listo</h3>
                <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                  Hemos preparado una carpeta segura con todos los videos y recursos. Puedes descargarlos a tu computadora o verlos directamente online.
                </p>
                <a
                  href={publicConfig.driveLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-emerald-600/30 transition-transform transform hover:-translate-y-1 w-full md:w-auto"
                >
                  Abrir Carpeta del Curso
                  <ChevronRight className="ml-2 w-5 h-5" />
                </a>
                <div className="mt-6 flex items-center justify-center md:justify-start gap-4">
                  <a
                    href={publicConfig.whatsappGroupUrl || DEFAULT_WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Unirme al grupo de soporte
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
