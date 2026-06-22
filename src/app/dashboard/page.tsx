'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Lock, UploadCloud, PlayCircle, CheckCircle2,
  Search, LogOut, Bell, Check, AlertCircle, ChevronRight, X, ExternalLink,
  MessageCircle, RefreshCw, Clock
} from 'lucide-react';

const DEFAULT_WHATSAPP_URL = 'https://chat.whatsapp.com/HdOQklvjXDnEmCy3ZIdFJw?mode=gi_t';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [offerLink, setOfferLink] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState(DEFAULT_WHATSAPP_URL);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('');
  const [videoEnded, setVideoEnded] = useState(false);
  const ytPlayerRef = useRef<any>(null);
  const ytPlayerDivRef = useRef<HTMLDivElement>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [bridgeReason, setBridgeReason] = useState<string | null>(null);
  const [bridgeCheckedAt, setBridgeCheckedAt] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Detectar si es video de YouTube basándose en la URL
  const isYoutubeVideo = videoUrl && getYoutubeId(videoUrl);

  // Fetch config
  useEffect(() => {
    fetch('/api/config/public')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.data.offerLink) setOfferLink(data.data.offerLink);
          if (data.data.driveLink) setDriveLink(data.data.driveLink);
          if (data.data.whatsappGroupUrl) setWhatsappGroupUrl(data.data.whatsappGroupUrl);
          if (data.data.videoUrl) setVideoUrl(data.data.videoUrl);
          if (data.data.videoType) setVideoType(data.data.videoType);
        }
      })
      .catch(() => {});
  }, []);

  // YouTube IFrame API - detectar fin del video
  useEffect(() => {
    if (!isYoutubeVideo || step !== 1) return;
    const ytId = getYoutubeId(videoUrl);
    if (!ytId) return;

    // Esperar a que el div esté en el DOM
    const checkDiv = setInterval(() => {
      if (ytPlayerDivRef.current) {
        clearInterval(checkDiv);
        initYTPlayer(ytId);
      }
    }, 100);

    const initYTPlayer = (videoId: string) => {
      // Si ya existe un player, destruirlo primero
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // Ignorar errores al destruir
        }
        ytPlayerRef.current = null;
      }

      const createPlayer = () => {
        if (!ytPlayerDivRef.current) return;
        
        ytPlayerRef.current = new (window as any).YT.Player(ytPlayerDivRef.current, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            fs: 0,
          },
          events: {
            onReady: () => {
              console.log('YouTube player ready');
            },
            onStateChange: (event: any) => {
              // Estado 0 = video terminó
              if (event.data === 0) {
                setVideoEnded(true);
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
            },
          },
        });
      };

      if ((window as any).YT && (window as any).YT.Player) {
        createPlayer();
      } else {
        // Cargar la API de YouTube
        if (!(window as any).onYouTubeIframeAPIReady) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
        (window as any).onYouTubeIframeAPIReady = createPlayer;
      }
    };

    return () => {
      clearInterval(checkDiv);
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // Ignorar errores al destruir
        }
        ytPlayerRef.current = null;
      }
    };
  }, [isYoutubeVideo, videoUrl, step]);

  // Determinar paso inicial basado en el estado del usuario
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/user/status')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.status) {
          const s = data.data.status;
          if (s === 'verified') setStep(4);
          else if (s === 'pending_review') {
            setStep(3);
            setBridgeStatus('pending');
          }
          // else: 'pending' → step 1
        }
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Polling para step 3 (bridge page)
  const checkUserStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/status');
      const data = await res.json();
      if (data.success) {
        setBridgeCheckedAt(new Date());
        const s = data.data.status;
        if (s === 'verified') {
          setBridgeStatus('verified');
          setTimeout(() => setStep(4), 1500);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (s === 'pending' || (s === 'pending_review' && data.data.lastVerification?.reason?.includes('Rechazado'))) {
          setBridgeStatus('rejected');
          setBridgeReason(data.data.lastVerification?.reason || 'Comprobante no válido');
          setRemainingAttempts(data.data.maxAttempts ?? remainingAttempts);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else {
          setBridgeStatus('pending');
        }
      }
    } catch {
      // Silently fail, next poll will retry
    }
  }, [remainingAttempts]);

  useEffect(() => {
    if (step === 3 && bridgeStatus === 'pending') {
      pollingRef.current = setInterval(checkUserStatus, 10000);
      // Also check immediately on mount
      checkUserStatus();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [step, bridgeStatus, checkUserStatus]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSelectedImage(file);
    // Usar FileReader para vista previa (más confiable que createObjectURL)
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.onerror = () => {
      setError('No se pudo leer el archivo');
    };
    reader.readAsDataURL(file);
  };

  const startVerification = async () => {
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
      const formData = new FormData();
      formData.append('file', selectedImage);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Error al subir imagen');
      }

      const verifyRes = await fetch('/api/verify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.data.url }),
      });

      const verifyData = await verifyRes.json();

      clearInterval(progressInterval);
      setScanProgress(100);

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Error al verificar');
      }

      setTimeout(() => {
        setIsScanning(false);
        setRemainingAttempts(verifyData.data.remainingAttempts);

        // Ir a la página puente (paso 3)
        setBridgeStatus('pending');
        setBridgeReason(null);
        setBridgeCheckedAt(null);
        setStep(3);
      }, 1000);

    } catch (err) {
      clearInterval(progressInterval);
      setIsScanning(false);
      setError(err instanceof Error ? err.message : 'Error al verificar');
    }
  };

  const handleReUpload = () => {
    setBridgeStatus('pending');
    setBridgeReason(null);
    setStep(2);
    setSelectedImage(null);
    setImagePreview(null);
    setError('');
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
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

      <main className="max-w-4xl mx-auto p-6 py-10">
        <div className="mb-10">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-3 px-2">
            <span className={step >= 1 ? 'text-blue-600' : ''}>Paso 1: Instrucciones</span>
            <span className={step >= 2 ? 'text-blue-600' : ''}>Paso 2: Activación</span>
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

        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="p-10 text-center">
              <span className="inline-block px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                Acción Requerida
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-800">Mira este video para continuar</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Te explico exactamente cómo activar tu cuenta gratuita y descargar todo el material del curso sin pagar un centavo.
              </p>
            </div>
            <div className="px-10 pb-10">
              {isYoutubeVideo ? (
                <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative">
                  <div ref={ytPlayerDivRef} className="w-full h-full" />
                  {videoEnded && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl px-8 py-4 border border-emerald-400/30 flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        <span className="text-white font-bold text-lg">Video completo ✓</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-slate-900 rounded-2xl relative flex items-center justify-center group cursor-pointer overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-50 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all duration-300 shadow-[0_0_50px_rgba(37,99,235,0.5)] z-10 border border-white/20">
                    <PlayCircle className="w-12 h-12 text-white ml-2" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center z-10">
                    <span className="text-white font-medium drop-shadow-md">Guía de Activación - VA Mastery</span>
                    <span className="bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded">04:15</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setStep(2)}
                disabled={!!(isYoutubeVideo && !videoEnded)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-12 rounded-xl text-lg shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-1 w-full md:w-auto"
              >
                {isYoutubeVideo && !videoEnded ? 'Mira el video completo para continuar' : 'Ya vi el video, Continuar al Paso 2'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: SUBIR COMPROBANTE ===== */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative animate-fade-in-up min-h-[600px]">
            <div className="p-10 opacity-10 select-none blur-[3px] pointer-events-none">
              <h2 className="text-4xl font-black mb-8 text-slate-800">Módulo 1: Fundamentos</h2>
              <div className="space-y-6">
                <div className="h-6 bg-slate-400 rounded w-full" />
                <div className="h-6 bg-slate-400 rounded w-5/6" />
                <div className="h-64 bg-slate-300 rounded-2xl mt-8" />
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="h-20 bg-slate-300 rounded-xl" />
                  <div className="h-20 bg-slate-300 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="absolute inset-0 bg-white/85 backdrop-blur-md flex flex-col p-6 md:p-12 overflow-y-auto">
              <div className="text-center mb-8 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-rose-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-300">
                  <Lock className="w-10 h-10 text-rose-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Contenido Bloqueado</h2>
                <p className="text-slate-600 text-lg">
                  Para acceder al curso 100% gratis, necesitamos verificar que creaste tu cuenta en la plataforma de pagos asociada.
                </p>
              </div>

              {error && (
                <div className="max-w-4xl mx-auto w-full mb-6">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-rose-700 font-medium text-sm">{error}</p>
                      {remainingAttempts > 0 && (
                        <p className="text-rose-500 text-xs mt-1">
                          Te quedan {remainingAttempts} intentos
                        </p>
                      )}
                    </div>
                    <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full flex-1">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col justify-center">
                  <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">1</span>
                    Regístrate en la plataforma
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Haz clic en el botón de abajo, completa tu registro en la página externa y verifica tu correo electrónico.
                  </p>
                  <a
                    href={offerLink || '#'}
                    target={offerLink ? '_blank' : undefined}
                    rel={offerLink ? 'noreferrer' : undefined}
                    onClick={e => { if (!offerLink) { e.preventDefault(); alert('Primero configura el enlace de la oferta en el panel de administración.'); } }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center">
                      Ir a crear mi cuenta
                      {offerLink && <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-60" />}
                    </span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
                  <h3 className="font-bold text-blue-900 text-lg mb-4 flex items-center relative z-10">
                    <span className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center mr-3 shrink-0">2</span>
                    Sube tu comprobante
                  </h3>

                  {/* Selector de archivo visible */}
                  <div className="space-y-3 relative z-10">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      className="block w-full text-sm text-slate-600
                        file:mr-4 file:py-2.5 file:px-5
                        file:rounded-xl file:border-0
                        file:text-sm file:font-bold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700 file:cursor-pointer file:transition-colors
                        bg-white rounded-xl border border-blue-200 p-2"
                    />
                    <p className="text-xs text-blue-600 text-center">
                      Selecciona cualquier imagen de tu registro exitoso
                    </p>
                  </div>

                  {/* Vista previa */}
                  {imagePreview && (
                    <div className="mt-4 bg-white rounded-xl p-3 border border-blue-200 relative z-10">
                      <div className="relative h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={imagePreview} alt="Vista previa" className="w-full h-full object-contain" />
                        {isScanning && (
                          <>
                            <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-[1px]" />
                            <div className="absolute inset-0 flex items-center justify-center z-30">
                              <span className="text-3xl font-black text-white drop-shadow-lg">{scanProgress}%</span>
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 text-center mt-2 font-medium truncate">
                        {selectedImage?.name}
                      </p>

                      {!isScanning ? (
                        <div className="flex flex-col gap-2 mt-3">
                          <button
                            onClick={startVerification}
                            disabled={remainingAttempts <= 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-colors"
                          >
                            <UploadCloud className="w-5 h-5 mr-2" /> Enviar comprobante
                          </button>
                          <button
                            onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 rounded-lg text-sm transition-colors"
                          >
                            Cambiar imagen
                          </button>
                        </div>
                      ) : (
                        <p className="text-center text-sm font-bold text-blue-600 animate-pulse mt-3">
                          Enviando comprobante...
                        </p>
                      )}
                    </div>
                  )}

                  {!isScanning && (
                    <p className="mt-4 text-xs text-blue-600 text-center relative z-10">
                      Intentos disponibles: {remainingAttempts}/3
                    </p>
                  )}

                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200/50 rounded-full blur-3xl pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: PUENTE (REVISIÓN MANUAL) ===== */}
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
                      href={whatsappGroupUrl}
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

        {step === 4 && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100 animate-fade-in-up">
            <div className="bg-gradient-to-b from-emerald-50 to-white p-12 text-center border-b border-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMxMGI5ODEiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative z-10 w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
                <Check className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="relative z-10 text-4xl font-black text-slate-800 mb-3 tracking-tight">¡Acceso Concedido!</h2>
              <p className="relative z-10 text-emerald-700 font-semibold text-lg">Tu cuenta ha sido verificada exitosamente.</p>
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
                  href={driveLink || '#'}
                  target={driveLink ? '_blank' : undefined}
                  rel={driveLink ? 'noreferrer' : undefined}
                  onClick={e => { if (!driveLink) { e.preventDefault(); alert('Primero configura el enlace del curso en el panel de administración.'); } }}
                  className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-emerald-600/30 transition-transform transform hover:-translate-y-1 w-full md:w-auto"
                >
                  <span className="flex items-center">
                    Abrir Carpeta del Curso
                    {driveLink && <ExternalLink className="w-4 h-4 ml-2" />}
                  </span>
                  <ChevronRight className="ml-2 w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
