'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Users, TrendingUp, Edit3, LogOut, Search,
  CheckCircle2, AlertCircle, MonitorPlay, Upload,
  Image as ImageIcon, Trash2, Loader2, Video, Link, Film,
  ExternalLink, MessageCircle, Eye, X, Check, AlertTriangle, RefreshCw,
  ChevronRight
} from 'lucide-react';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/HdOQklvjXDnEmCy3ZIdFJw?mode=gi_t';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userList, setUserList] = useState<any[]>([]);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({});
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const [refImageLink, setRefImageLink] = useState('');

  // Estado para verificación manual
  const [imageModal, setImageModal] = useState<{ url: string; userEmail: string; userName: string } | null>(null);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<{ userId: number; userEmail: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      const res = await fetch('/api/admin/verify-user');
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

  const handleReferenceImageUrlSave = async () => {
    const url = refImageLink.trim();
    if (!url) {
      alert('Ingresa una URL de imagen');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('La URL debe comenzar con http:// o https://');
      return;
    }

    try {
      const res = await fetch('/api/admin/reference-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (data.success) {
        setLocalConfig(prev => ({ ...prev, referenceImageUrl: url }));
        setConfigData(prev => ({ ...prev, referenceImageUrl: url }));
        setRefImageLink('');
      } else {
        alert(data.error || 'Error al guardar la imagen de referencia');
      }
    } catch {
      alert('Error de conexión');
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!videoTypes.includes(file.type)) {
      alert('Solo se permiten archivos MP4, WebM, OGG o MOV');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      alert('El video debe ser menor a 500MB');
      return;
    }

    setUploadingVideo(true);
    try {
      const urlRes = await fetch('/api/admin/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const urlData = await urlRes.json();

      if (!urlData.success) {
        alert(urlData.error || 'Error al generar URL de subida');
        setUploadingVideo(false);
        return;
      }

      const { uploadUrl, pathname } = urlData.data;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        alert('Error al subir el video al almacenamiento. Intenta de nuevo.');
        setUploadingVideo(false);
        return;
      }

      const confirmRes = await fetch('/api/admin/video/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadUrl, pathname }),
      });
      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        setLocalConfig(prev => ({ ...prev, videoUrl: confirmData.data.url, videoType: 'upload' }));
        setConfigData(prev => ({ ...prev, videoUrl: confirmData.data.url, videoType: 'upload' }));
        setVideoLink('');
        alert('Video subido exitosamente');
      } else {
        alert(confirmData.error || 'Error al guardar el video');
      }
    } catch {
      alert('Error de conexión al subir el video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleVideoLinkSave = async () => {
    if (!videoLink.trim()) {
      alert('Ingresa una URL de video');
      return;
    }

    try {
      const res = await fetch('/api/admin/video', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoLink.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setLocalConfig(prev => ({ ...prev, videoUrl: videoLink.trim(), videoType: 'link' }));
        setConfigData(prev => ({ ...prev, videoUrl: videoLink.trim(), videoType: 'link' }));
        setVideoLink('');
        alert('Enlace de video guardado');
      } else {
        alert(data.error || 'Error al guardar el enlace');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const handleRemoveVideo = async () => {
    if (!confirm('¿Eliminar el video?')) return;

    try {
      const res = await fetch('/api/admin/video', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const newConfig = { ...localConfig };
        delete newConfig.videoUrl;
        delete newConfig.videoType;
        setLocalConfig(newConfig);
        const newConfigData = { ...configData };
        delete newConfigData.videoUrl;
        delete newConfigData.videoType;
        setConfigData(newConfigData);
      }
    } catch {
      alert('Error al eliminar el video');
    }
  };

  // Acciones de verificación manual
  const handleApprove = async (userId: number) => {
    setProcessingUserId(userId);
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUsers();
      } else {
        alert(data.error || 'Error al aprobar usuario');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    setProcessingUserId(showRejectModal.userId);
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: showRejectModal.userId,
          action: 'reject',
          reason: rejectReason || 'El comprobante no cumple con los requisitos.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUsers();
        setShowRejectModal(null);
        setRejectReason('');
      } else {
        alert(data.error || 'Error al rechazar usuario');
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

  // Filtrar y buscar usuarios
  const filteredUsers = userList.filter((u: any) => {
    const matchesSearch = !searchQuery || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: userList.length,
    verified: userList.filter(u => u.status === 'verified').length,
    pending: userList.filter(u => u.status === 'pending' || u.status === 'pending_review').length,
    pendingReview: userList.filter(u => u.status === 'pending_review').length,
    rejected: userList.filter(u => u.status === 'rejected').length,
    conversion: userList.length > 0 ? Math.round((userList.filter(u => u.status === 'verified').length / userList.length) * 100) : 0,
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; label: string }> = {
      verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Verificado' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Pendiente' },
      pending_review: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'En revisión' },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', label: 'Rechazado' },
    };
    const c = configs[status] || configs.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Modal de imagen */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setImageModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Comprobante de {imageModal.userName || imageModal.userEmail}</h3>
                <p className="text-xs text-slate-500">{imageModal.userEmail}</p>
              </div>
              <button
                onClick={() => setImageModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="bg-slate-100 p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={imageModal.url}
                alt="Comprobante"
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-between items-center">
              <a
                href={imageModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Abrir en nueva pestaña
              </a>
              <button
                onClick={() => setImageModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Rechazar usuario</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              ¿Estás seguro de rechazar a <strong>{showRejectModal.userEmail}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo del rechazo</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="El comprobante no cumple con los requisitos."
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500 outline-none text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processingUserId === showRejectModal.userId}
                className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {processingUserId === showRejectModal.userId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Rechazar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
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
            {stats.pendingReview > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.pendingReview}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Edit3 className="w-5 h-5 mr-3" /> Constructor CPA
          </button>
          <button onClick={() => setActiveTab('video')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${activeTab === 'video' ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Video className="w-5 h-5 mr-3" /> Video Landing
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
            {activeTab === 'video' && 'Video de la Landing Page'}
          </h1>
          <div className="flex items-center gap-3">
            {activeTab === 'users' && (
              <button
                onClick={fetchUsers}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Actualizar
              </button>
            )}
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 uppercase tracking-wider">
              Base de Datos Conectada
            </span>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          {/* ===== TAB: DASHBOARD ===== */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[
                  { title: "Total Leads", value: stats.total, color: "text-blue-600", bg: "bg-blue-100" },
                  { title: "Completaron CPA", value: stats.verified, color: "text-emerald-600", bg: "bg-emerald-100" },
                  { title: "En Revisión", value: stats.pendingReview, color: "text-blue-600", bg: "bg-blue-100" },
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

              {/* Enlace rápido a usuarios en revisión */}
              {stats.pendingReview > 0 && (
                <div
                  onClick={() => setActiveTab('users')}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Eye className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {stats.pendingReview} usuario{stats.pendingReview !== 1 ? 's' : ''} esperando verificación
                        </h3>
                        <p className="text-sm text-slate-500">Haz clic para revisar los comprobantes pendientes</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              )}

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-64">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Gráficos en desarrollo</h3>
                <p className="text-slate-500 mt-2 max-w-md">Pronto podrás ver la evolución de registros y conversiones en el tiempo.</p>
              </div>
            </>
          )}

          {/* ===== TAB: USERS (con verificación manual) ===== */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por email o nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="pending_review">En revisión</option>
                      <option value="pending">Pendientes</option>
                      <option value="verified">Verificados</option>
                      <option value="rejected">Rechazados</option>
                    </select>
                    <span className="text-sm text-slate-500 whitespace-nowrap">{filteredUsers.length} leads</span>
                  </div>
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Lead Info</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Fecha</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Estado</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Comprobante</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Intentos</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.status === 'pending_review' ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3">
                            {u.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{u.email}</p>
                            <p className="text-xs text-slate-400">{u.name || 'Sin nombre'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(u.status)}
                      </td>
                      <td className="px-6 py-4">
                        {u.verification?.imageUrl ? (
                          <button
                            onClick={() => setImageModal({
                              url: u.verification.imageUrl,
                              userEmail: u.email,
                              userName: u.name || u.email,
                            })}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Ver imagen
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Sin comprobante</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{u.maxAttempts}/3</td>
                      <td className="px-6 py-4">
                        {u.status === 'pending_review' && u.verification?.imageUrl ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(u.id)}
                              disabled={processingUserId === u.id}
                              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {processingUserId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Aprobar
                            </button>
                            <button
                              onClick={() => setShowRejectModal({ userId: u.id, userEmail: u.email })}
                              disabled={processingUserId === u.id}
                              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              Rechazar
                            </button>
                          </div>
                        ) : u.status === 'verified' ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprobado
                          </span>
                        ) : u.status === 'rejected' ? (
                          <span className="text-xs text-rose-600 font-medium">Rechazado</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No se encontraron leads con esos filtros'
                          : 'No hay leads registrados aún'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== TAB: SETTINGS ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
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
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <MessageCircle className="w-4 h-4 inline mr-1 text-emerald-500" />
                          Enlace del Grupo de WhatsApp
                        </label>
                        <input
                          type="url"
                          value={localConfig.whatsappGroupUrl || WHATSAPP_GROUP_URL}
                          onChange={e => setLocalConfig({...localConfig, whatsappGroupUrl: e.target.value})}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-slate-50"
                          placeholder={WHATSAPP_GROUP_URL}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Enlace que verán los usuarios en la página de "Revisión Manual" y en el acceso final.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-100" />

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                      <span className="w-8 h-8 rounded bg-purple-100 text-purple-600 flex items-center justify-center mr-3"><Search className="w-4 h-4" /></span>
                      Configuración de Verificación
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
                      </div>
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
                        Pega el enlace de una captura de pantalla de <strong>cómo se ve un registro exitoso</strong> en la plataforma externa.
                        Cuando los usuarios suban su comprobante, la IA lo comparará con esta imagen de referencia para verificar que sea similar.
                      </p>

                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={refImageLink}
                          onChange={e => setRefImageLink(e.target.value)}
                          placeholder="https://ejemplo.com/mi-imagen-de-referencia.png"
                          className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                        />
                        <button
                          onClick={handleReferenceImageUrlSave}
                          disabled={!refImageLink.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
                        >
                          Guardar
                        </button>
                      </div>

                      {localConfig.referenceImageUrl && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white max-w-md mx-auto">
                            <img
                              src={localConfig.referenceImageUrl}
                              alt="Referencia"
                              className="w-full h-auto object-contain max-h-[300px]"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => setRefImageLink(localConfig.referenceImageUrl || '')}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Cambiar Enlace
                            </button>
                            <button
                              onClick={handleRemoveReferenceImage}
                              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        </div>
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
            </div>
          )}

          {/* ===== TAB: VIDEO ===== */}
          {activeTab === 'video' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="space-y-8 max-w-3xl">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-rose-100 text-rose-600 flex items-center justify-center mr-3"><Film className="w-4 h-4" /></span>
                    Video Principal del Dashboard
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 pl-11">
                    Este video aparecerá en el <strong>Paso 1 del Dashboard</strong> (después del registro).
                    Los usuarios deberán verlo completo antes de poder continuar con la activación.
                  </p>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <h4 className="text-md font-bold text-slate-700 mb-3 flex items-center">
                    <Link className="w-4 h-4 mr-2 text-blue-500" />
                    Opción 1: Enlace de video (YouTube, Vimeo, etc.)
                  </h4>
                  <div className="pl-7 space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="url"
                        value={videoLink}
                        onChange={e => setVideoLink(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                      />
                      <button
                        onClick={handleVideoLinkSave}
                        disabled={!videoLink.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
                      >
                        Guardar Enlace
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Soporta YouTube, Vimeo, Dailymotion y cualquier URL de video directo.</p>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div>
                  <h4 className="text-md font-bold text-slate-700 mb-3 flex items-center">
                    <Upload className="w-4 h-4 mr-2 text-emerald-500" />
                    Opción 2: Subir archivo MP4
                  </h4>
                  <div className="pl-7 space-y-5">
                    <p className="text-sm text-slate-500">
                      Sube tu video directamente. Soporta videos de <strong>más de 3 minutos</strong> y hasta <strong>500MB</strong>.
                    </p>

                    {localConfig.videoType === 'upload' && localConfig.videoUrl ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black max-w-lg mx-auto">
                          <video
                            src={localConfig.videoUrl}
                            controls
                            className="w-full h-auto max-h-[250px]"
                          />
                        </div>
                        <div className="text-center text-xs text-slate-500 truncate max-w-full px-2">
                          {localConfig.videoUrl}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer">
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/ogg,video/quicktime"
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
                            onClick={handleRemoveVideo}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                        </div>
                      </div>
                    ) : localConfig.videoType === 'link' && localConfig.videoUrl ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                        <div className="text-center text-sm text-blue-600 font-medium truncate max-w-full px-2">
                          <Link className="w-4 h-4 inline mr-1" />
                          {localConfig.videoUrl}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setVideoLink(localConfig.videoUrl || ''); }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" /> Cambiar Enlace
                          </button>
                          <button
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
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          onChange={handleVideoUpload}
                          className="hidden"
                          disabled={uploadingVideo}
                        />
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                          {uploadingVideo ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                              <p className="text-sm font-medium text-slate-600">Subiendo video...</p>
                              <p className="text-xs text-slate-400 mt-1">Esto puede tomar unos momentos</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Film className="w-10 h-10 text-slate-400 mb-3" />
                              <p className="text-sm font-semibold text-slate-700 mb-1">
                                Haz clic para subir un archivo de video
                              </p>
                              <p className="text-xs text-slate-500">MP4, WebM, OGG o MOV • Máximo 500MB</p>
                            </div>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                {localConfig.videoUrl && (
                  <div>
                    <h4 className="text-md font-bold text-slate-700 mb-3 flex items-center">
                      <MonitorPlay className="w-4 h-4 mr-2 text-indigo-500" />
                      Vista Previa en Dashboard
                    </h4>
                    <div className="pl-7">
                      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-lg max-w-2xl">
                        {localConfig.videoType === 'link' ? (
                          <div className="aspect-video flex items-center justify-center bg-slate-800">
                            <div className="text-center p-8">
                              <Link className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                              <p className="text-slate-400 text-sm font-medium">Video desde enlace externo</p>
                              <p className="text-xs text-slate-600 mt-1 break-all">{localConfig.videoUrl}</p>
                            </div>
                          </div>
                        ) : (
                          <video
                            src={localConfig.videoUrl}
                            controls
                            className="w-full aspect-video"
                          />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Así verán el video los usuarios en el Dashboard. Deberán verlo completo para continuar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
