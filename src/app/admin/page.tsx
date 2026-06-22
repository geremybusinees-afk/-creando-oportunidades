'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Users, TrendingUp, Edit3, LogOut, Search,
  CheckCircle2, AlertCircle, MonitorPlay, Upload,
  Image as ImageIcon, Trash2, Loader2, Video, Link, Film
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
  const [videoLink, setVideoLink] = useState('');

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
      // Paso 1: Obtener URL firmada para subida directa a Blob
      const urlRes = await fetch('/api/admin/reference-image', {
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
        setUploadingRef(false);
        return;
      }

      const { uploadUrl, pathname } = urlData.data;

      // Paso 2: Subir archivo DIRECTAMENTE a Vercel Blob (sin pasar por el servidor)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        alert('Error al subir la imagen al almacenamiento. Intenta de nuevo.');
        setUploadingRef(false);
        return;
      }

      // Paso 3: Confirmar subida y guardar URL en la base de datos
      const confirmRes = await fetch('/api/admin/reference-image/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadUrl, pathname }),
      });
      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        setLocalConfig(prev => ({ ...prev, referenceImageUrl: confirmData.data.url }));
        setConfigData(prev => ({ ...prev, referenceImageUrl: confirmData.data.url }));
      } else {
        alert(confirmData.error || 'Error al guardar la imagen');
      }
    } catch (err) {
      alert('Error de conexión al subir la imagen');
      console.error('Reference image upload error:', err);
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
      // Paso 1: Obtener URL firmada para subida directa a Blob
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

      // Paso 2: Subir archivo DIRECTAMENTE a Vercel Blob (sin pasar por el servidor)
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

      // Paso 3: Confirmar subida y guardar URL en la base de datos
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
    } catch (err) {
      alert('Error de conexión al subir el video');
      console.error('Upload error:', err);
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
    pending: userList.filter(u => u.status === 'pending').length,
    conversion: userList.length > 0 ? Math.round((userList.filter(u => u.status === 'verified').length / userList.length) * 100) : 0,
  };

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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Buscar email..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <span className="text-sm text-slate-500">{userList.length} leads</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Lead Info</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Fecha</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Estado</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Intentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userList.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3">
                            {u.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{u.email}</p>
                            <p className="text-xs text-slate-400">{u.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.status === 'verified' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {u.status === 'verified' ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Verificado</> : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{u.maxAttempts}/3</td>
                    </tr>
                  ))}
                  {userList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No hay leads registrados aún</td>
                    </tr>
                  )}
                </tbody>
              </table>
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

                {/* Opción 1: Enlace externo */}
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

                {/* Opción 2: Subir MP4 */}
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
                            onClick={() => {
                              setVideoLink(localConfig.videoUrl || '');
                            }}
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

                {/* Vista previa de cómo se verá */}
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
