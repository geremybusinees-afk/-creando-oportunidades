'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Users, TrendingUp, Edit3, LogOut, Search,
  CheckCircle2, AlertCircle, MonitorPlay, Upload,
  Image as ImageIcon, Trash2, Loader2,
  Video, Globe, Link2, Film, X, Check, Eye
} from 'lucide-react';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userList, setUserList] = useState<any[]>([]);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({});
  const [uploadingRef, setUploadingRef] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoTab, setVideoTab] = useState<'youtube' | 'mp4'>('youtube');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (session && (session.user as any).role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (session) {
      fetchUsers();
      fetchConfig();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUserList(data.data);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.success) {
        setConfigData(data.data);
        setLocalConfig(data.data);
      }
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig),
      });
      const data = await res.json();
      if (data.success) {
        alert('Configuración guardada');
        fetchConfig();
      }
    } catch (e) {
      console.error('Error saving config:', e);
    }
  };

  const handleVideoUrlChange = (url: string) => {
    setLocalConfig(prev => ({ ...prev, videoUrl: url, videoType: url ? 'youtube' : '' }));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten videos MP4 o WebM');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      alert('El video debe ser menor a 200MB');
      return;
    }

    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'videos');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setLocalConfig(prev => ({ ...prev, videoUrl: data.data.url, videoType: 'mp4' }));
        setConfigData(prev => ({ ...prev, videoUrl: data.data.url, videoType: 'mp4' }));
      } else {
        alert(data.error || 'Error al subir el video');
      }
    } catch {
      alert('Error de conexión al subir el video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveVideo = () => {
    const newConfig = { ...localConfig };
    delete newConfig.videoUrl;
    delete newConfig.videoType;
    setLocalConfig(newConfig);
    const newConfigData = { ...configData };
    delete newConfigData.videoUrl;
    delete newConfigData.videoType;
    setConfigData(newConfigData);
  };

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten imágenes PNG, JPG o WebP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen debe ser menor a 10MB');
      return;
    }

    setUploadingRef(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/reference-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setLocalConfig(prev => ({ ...prev, referenceImageUrl: data.data.url }));
        setConfigData(prev => ({ ...prev, referenceImageUrl: data.data.url }));
      } else {
        alert(data.error || 'Error al subir la imagen');
      }
    } catch {
      alert('Error de conexión al subir la imagen');
    } finally {
      setUploadingRef(false);
    }
  };

  const handleRemoveReferenceImage = async () => {
    if (!confirm('¿Eliminar la imagen de referencia?')) return;

    try {
      const res = await fetch('/api/admin/reference-image', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const newConfig = { ...localConfig };
        delete newConfig.referenceImageUrl;
        setLocalConfig(newConfig);
        const newConfigData = { ...configData };
        delete newConfigData.referenceImageUrl;
        setConfigData(newConfigData);
      }
    } catch {
      alert('Error al eliminar la imagen');
    }
  };

  const handleApprove = async (userId: number) => {
    setProcessingUserId(userId);
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(userId), action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowImageModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Error al aprobar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (userId: number) => {
    const reason = prompt('Motivo del rechazo (opcional):') || '';
    setProcessingUserId(userId);
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(userId), action: 'reject', reason }),
      });
      const data = await res.json();
      if (data.success) {
        setShowImageModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Error al rechazar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setProcessingUserId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: userList.length,
    verified: userList.filter(u => u.status === 'verified').length,
    pending: userList.filter(u => u.status === 'pending' || u.status === 'pending_review').length,
    conversion: userList.length > 0 ? Math.round((userList.filter(u => u.status === 'verified').length / userList.length) * 100) : 0,
  };

  const filteredUsers = filterStatus === 'all'
    ? userList
    : userList.filter(u => u.status === filterStatus);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <div className="text-xl font-black text-white flex items-center">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mr-3 shadow-lg">
              <Settings className="w-4 h-4 text-white" />
            </div>
            Admin Panel
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <TrendingUp className="w-5 h-5 mr-3" /> Resumen
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Users className="w-5 h-5 mr-3" /> Base de Leads
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Edit3 className="w-5 h-5 mr-3" /> Constructor CPA
          </button>
        </nav>
        <div className="p-6 border-t border-slate-800 flex items-center text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
          <span className="text-slate-400">Sistema Online</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-slate-800">
            {activeTab === 'dashboard' && 'Rendimiento del Embudo'}
            {activeTab === 'users' && 'Gestión de Leads Registrados'}
            {activeTab === 'settings' && 'Configuración de Oferta'}
          </h1>
          <div className="flex items-center">
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 uppercase tracking-wider">
              Base de Datos Conectada
            </span>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { title: "Total Leads", value: stats.total, color: "text-blue-600", bg: "bg-blue-100" },
                  { title: "Completaron CPA", value: stats.verified, color: "text-emerald-600", bg: "bg-emerald-100" },
                  { title: "Pendientes", value: stats.pending, color: "text-amber-600", bg: "bg-amber-100" },
                  { title: "Conversión", value: `${stats.conversion}%`, color: "text-indigo-600", bg: "bg-indigo-100" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                      <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
                    </div>
                    <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center`}>
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-64">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Gráficos en desarrollo</h3>
                <p className="text-slate-500 mt-2 max-w-md">Pronto podrás ver la evolución de registros y conversiones en el tiempo.</p>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filtros */}
              <div className="flex gap-2 flex-wrap">
                {['all', 'pending_review', 'pending', 'verified'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      filterStatus === s
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'all' ? 'Todos' : s === 'pending_review' ? 'En Revisión' : s === 'pending' ? 'Pendientes' : 'Verificados'}
                    <span className="ml-2 text-xs opacity-70">
                      ({s === 'all' ? userList.length : userList.filter(u => u.status === s).length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Lista de usuarios */}
              <div className="grid gap-4">
                {filteredUsers.map((u: any) => (
                  <div key={u.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Info usuario */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                          {u.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{u.email}</p>
                          <p className="text-xs text-slate-400">{u.name} · {new Date(u.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="shrink-0">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                        u.status === 'verified' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        u.status === 'pending_review' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {u.status === 'verified' ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Verificado</> :
                         u.status === 'pending_review' ? '⏳ En Revisión' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Imagen + acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      {u.verification?.imageUrl && (
                        <button
                          onClick={() => { setSelectedUser(u); setShowImageModal(true); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" /> Ver comprobante
                        </button>
                      )}
                      {u.status === 'pending_review' && (
                        <>
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={processingUserId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {processingUserId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            disabled={processingUserId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                          >
                            {processingUserId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No hay usuarios en esta categoría</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal visor de imagen */}
          {showImageModal && selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowImageModal(false)}>
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Comprobante de {selectedUser.name || selectedUser.email}</h3>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => setShowImageModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                    <img
                      src={selectedUser.verification?.imageUrl}
                      alt="Comprobante"
                      className="w-full h-auto max-h-[500px] object-contain"
                    />
                  </div>
                  {selectedUser.verification?.reason && (
                    <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                      <strong>Nota:</strong> {selectedUser.verification.reason}
                    </p>
                  )}
                </div>
                {selectedUser.status === 'pending_review' && (
                  <div className="p-6 border-t border-slate-200 flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedUser.id)}
                      disabled={processingUserId === selectedUser.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {processingUserId === selectedUser.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Aprobar Usuario
                    </button>
                    <button
                      onClick={() => handleReject(selectedUser.id)}
                      disabled={processingUserId === selectedUser.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                    >
                      {processingUserId === selectedUser.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <form onSubmit={handleSaveConfig} className="space-y-8 max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center mr-3"><Edit3 className="w-4 h-4" /></span>
                    Textos de la Pre-Landing
                  </h3>
                  <div className="grid gap-5 pl-11">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Título Principal</label>
                      <input
                        type="text"
                        value={localConfig.landingHeadline || ''}
                        onChange={e => setLocalConfig({...localConfig, landingHeadline: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Subtítulo</label>
                      <textarea
                        rows={3}
                        value={localConfig.landingSubheadline || ''}
                        onChange={e => setLocalConfig({...localConfig, landingSubheadline: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3"><MonitorPlay className="w-4 h-4" /></span>
                    Enlaces de la Oferta (CPA)
                  </h3>
                  <div className="grid gap-5 pl-11">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Enlace a promocionar</label>
                      <input
                        type="url"
                        value={localConfig.offerLink || ''}
                        onChange={e => setLocalConfig({...localConfig, offerLink: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Enlace del Curso (Premio)</label>
                      <input
                        type="url"
                        value={localConfig.driveLink || ''}
                        onChange={e => setLocalConfig({...localConfig, driveLink: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Grupo de WhatsApp (Soporte)</label>
                      <input
                        type="url"
                        value={localConfig.whatsappGroupUrl || ''}
                        onChange={e => setLocalConfig({...localConfig, whatsappGroupUrl: e.target.value})}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Enlace del grupo de WhatsApp que se muestra a los usuarios en espera de aprobación</p>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-purple-100 text-purple-600 flex items-center justify-center mr-3"><Search className="w-4 h-4" /></span>
                    Configuración de Verificación IA
                  </h3>
                  <div className="grid gap-5 pl-11">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de la Plataforma</label>
                      <input
                        type="text"
                        value={localConfig.platformName || ''}
                        onChange={e => setLocalConfig({...localConfig, platformName: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Ej: Stripe, PayPal, Hotmart..."
                      />
                      <p className="text-xs text-slate-500 mt-1">La IA buscará este nombre en el comprobante</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Palabras Clave</label>
                      <input
                        type="text"
                        value={localConfig.platformKeywords || ''}
                        onChange={e => setLocalConfig({...localConfig, platformKeywords: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="registro exitoso, cuenta creada, bienvenido"
                      />
                      <p className="text-xs text-slate-500 mt-1">Separadas por coma. La IA buscará estas palabras en el comprobante.</p>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-rose-100 text-rose-600 flex items-center justify-center mr-3"><Video className="w-4 h-4" /></span>
                    Video de la Oferta
                  </h3>
                  <div className="pl-11 space-y-5">
                    <p className="text-sm text-slate-500">
                      Agrega un video promocional a la landing page. Puedes usar un enlace de YouTube o subir un archivo MP4.
                    </p>

                    {/* Tabs: YouTube / MP4 */}
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setVideoTab('youtube')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          videoTab === 'youtube' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Globe className="w-4 h-4" /> YouTube
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoTab('mp4')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          videoTab === 'mp4' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Film className="w-4 h-4" /> Subir MP4
                      </button>
                    </div>

                    {videoTab === 'youtube' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Enlace de YouTube</label>
                        <div className="relative">
                          <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={localConfig.videoUrl || ''}
                            onChange={e => handleVideoUrlChange(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">Pega el enlace completo del video de YouTube</p>
                      </div>
                    )}

                    {videoTab === 'mp4' && (
                      <div>
                        {localConfig.videoUrl && localConfig.videoType === 'mp4' ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black max-w-md mx-auto">
                              <video
                                src={localConfig.videoUrl}
                                controls
                                className="w-full h-auto max-h-[250px]"
                                preload="metadata"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm"
                                  onChange={handleVideoUpload}
                                  className="hidden"
                                  disabled={uploadingVideo}
                                />
                                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                                  {uploadingVideo ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                                  ) : (
                                    <><Upload className="w-4 h-4" /> Reemplazar Video</>
                                  )}
                                </div>
                              </label>
                              <button
                                type="button"
                                onClick={handleRemoveVideo}
                                className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              onChange={handleVideoUpload}
                              className="hidden"
                              disabled={uploadingVideo}
                            />
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                              {uploadingVideo ? (
                                <div className="flex flex-col items-center">
                                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                                  <p className="text-sm font-medium text-slate-600">Subiendo video...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Film className="w-10 h-10 text-slate-400 mb-3" />
                                  <p className="text-sm font-semibold text-slate-700 mb-1">Haz clic para subir un video MP4</p>
                                  <p className="text-xs text-slate-500">MP4 o WebM • Máximo 200MB</p>
                                </div>
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    )}

                    {localConfig.videoUrl && localConfig.videoType === 'youtube' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-rose-600" /> Video configurado
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveVideo}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 truncate">URL: {localConfig.videoUrl}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-amber-100 text-amber-600 flex items-center justify-center mr-3"><ImageIcon className="w-4 h-4" /></span>
                    Imagen de Referencia (Comparación Visual)
                  </h3>
                  <div className="pl-11 space-y-5">
                    <p className="text-sm text-slate-500">
                      Sube una captura de pantalla de <strong>cómo se ve un registro exitoso</strong> en la plataforma externa.
                      Cuando los usuarios suban su comprobante, la IA lo comparará con esta imagen de referencia para verificar que sea similar.
                    </p>

                    {localConfig.referenceImageUrl ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white max-w-md mx-auto">
                          <img
                            src={localConfig.referenceImageUrl}
                            alt="Referencia"
                            className="w-full h-auto object-contain max-h-[300px]"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleReferenceImageUpload}
                              className="hidden"
                              disabled={uploadingRef}
                            />
                            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                              {uploadingRef ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                              ) : (
                                <><Upload className="w-4 h-4" /> Reemplazar Imagen</>
                              )}
                            </div>
                          </label>
                          <button
                            onClick={handleRemoveReferenceImage}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleReferenceImageUpload}
                          className="hidden"
                          disabled={uploadingRef}
                        />
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                          {uploadingRef ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                              <p className="text-sm font-medium text-slate-600">Subiendo imagen...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Upload className="w-10 h-10 text-slate-400 mb-3" />
                              <p className="text-sm font-semibold text-slate-700 mb-1">Haz clic para subir la imagen de referencia</p>
                              <p className="text-xs text-slate-500">PNG, JPG o WebP • Máximo 10MB</p>
                            </div>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-6 pl-11">
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg transition-colors">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
