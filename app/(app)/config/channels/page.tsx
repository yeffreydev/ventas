"use client";

import { useState, useEffect } from "react";
import {
  HiPlus,
  HiTrash,
  HiXCircle,
  HiCog,
  HiExternalLink,
  HiRefresh,
} from "react-icons/hi";
import {
  SiWhatsapp,
  SiFacebook,
  SiInstagram,
  SiTelegram,
  SiX,
} from "react-icons/si";
import axios from "axios";
import Link from "next/link";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: string;
  phone_number?: string;
  avatar_url?: string;
  greeting_enabled?: boolean;
  greeting_message?: string;
  enable_auto_assignment?: boolean;
  allow_messages_after_resolved?: boolean;
}

interface UserChannel {
   id: string;
   user_id: string;
   workspace_id: string;
   chatwoot_account_id: number;
   chatwoot_inbox_id: number;
   chatwoot_inbox_name: string;
   chatwoot_channel_type: string;
   is_active: boolean;
   created_at: string;
   metadata?: any;
 }

export default function ChannelsPage() {
   const { currentWorkspace } = useWorkspace();
   const [inboxes, setInboxes] = useState<ChatwootInbox[]>([]);
   const [userChannels, setUserChannels] = useState<UserChannel[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [channelToDelete, setChannelToDelete] = useState<{ id: string; name: string } | null>(null);
   const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const loadInboxes = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch inboxes from Chatwoot
      const inboxesResponse = await axios.get(`/chats/chat/api/inboxes?workspace_id=${currentWorkspace.id}`);
      setInboxes(inboxesResponse.data.inboxes || []);

      // Fetch user channels from Supabase
      const channelsResponse = await axios.get(`/api/user-chatwoot-channels?workspace_id=${currentWorkspace.id}`);
      setUserChannels(channelsResponse.data.channels || []);
    } catch (err: any) {
      console.error('Error loading inboxes:', err);
      setError(err.response?.data?.error || 'Error al cargar los canales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      loadInboxes();
    }
  }, [currentWorkspace]);

  const openDeleteModal = (channelId: string, inboxName: string) => {
    setChannelToDelete({ id: channelId, name: inboxName });
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setChannelToDelete(null);
    setDeleteConfirmText('');
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    setDeletingId(channelToDelete.id);
    try {
      await axios.delete(`/api/user-chatwoot-channels/${channelToDelete.id}`);
      await loadInboxes();
      closeDeleteModal();
    } catch (err: any) {
      console.error('Error deleting channel:', err);
      alert(err.response?.data?.error || 'Error al eliminar el canal');
    } finally {
      setDeletingId(null);
    }
  };

  const getChannelIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('whatsapp')) return <SiWhatsapp className={iconClass} />;
    if (lowerType.includes('facebook')) return <SiFacebook className={iconClass} />;
    if (lowerType.includes('instagram')) return <SiInstagram className={iconClass} />;
    if (lowerType.includes('telegram')) return <SiTelegram className={iconClass} />;
    if (lowerType.includes('twitter') || lowerType.includes('x')) return <SiX className={iconClass} />;
    return <HiCog className={iconClass} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Canales Conectados</h2>
          <p className="text-sm text-text-secondary mt-1">
            Gestiona tus integraciones de mensajería
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadInboxes}
            disabled={loading}
            className="p-2 text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar lista"
          >
            <HiRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/chats/connect"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm hover:shadow"
          >
            <HiPlus className="w-4 h-4" />
            Nuevo Canal
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg p-4 flex items-center gap-3">
            <HiXCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Data Content */}
      {!loading && !error && (
        <>
            {inboxes.length === 0 ? (
                // Empty State
                <div className="text-center py-16 bg-background border border-dashed border-border rounded-xl">
                    <div className="w-12 h-12 bg-hover-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiCog className="w-6 h-6 text-text-tertiary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                        No hay canales
                    </h3>
                    <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                        Conecta tus redes sociales para empezar a gestionar mensajes desde un solo lugar.
                    </p>
                    <Link
                        href="/chats/connect"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-hover-bg transition-colors"
                    >
                        Conectar ahora
                    </Link>
                </div>
            ) : (
                // Channels Grid
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {inboxes.map((inbox) => {
                        const userChannel = userChannels.find(
                            uc => uc.chatwoot_inbox_id === inbox.id
                        );
                        
                        // Determine brand color only for the icon container
                        const getBrandColorClass = (type: string) => {
                            const t = type.toLowerCase();
                            if (t.includes('whatsapp')) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                            if (t.includes('facebook')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                            if (t.includes('instagram')) return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
                            if (t.includes('telegram')) return 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
                            return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                        };

                        return (
                            <div 
                                key={inbox.id}
                                className="group bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 flex flex-col justify-between min-h-[160px]"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2.5 rounded-lg ${getBrandColorClass(inbox.channel_type)}`}>
                                            {getChannelIcon(inbox.channel_type)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {userChannel ? (
                                                <button
                                                    onClick={() => openDeleteModal(userChannel.id, inbox.name)}
                                                    className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Desconectar canal"
                                                >
                                                    <HiTrash className="w-4 h-4" />
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-semibold text-foreground truncate pr-2">
                                        {inbox.name}
                                    </h3>
                                    <p className="text-xs text-text-secondary truncate mt-0.5 font-mono opacity-80">
                                        {inbox.channel_type.toUpperCase()} • #{inbox.id}
                                    </p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                                    <Link
                                        href={`/chats/chat?inbox=${inbox.id}`}
                                        className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 group/link"
                                    >
                                        Ir a mensajes
                                        <HiExternalLink className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                                    </Link>
                                    
                                    {/* Minimal status indicators */}
                                    <div className="flex gap-2">
                                        {inbox.greeting_enabled && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Saludo activo"></span>
                                        )}
                                        {inbox.enable_auto_assignment && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Auto-asignación activa"></span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
      )}

      {/* Delete Confirmation Modal - Minimalist */}
      {showDeleteModal && channelToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-sm w-full shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Desconectar Canal</h3>
            <p className="text-sm text-text-secondary mb-6">
                ¿Estás seguro que deseas eliminar <span className="font-semibold text-foreground">{channelToDelete.name}</span>? Perderás el acceso al historial de mensajes de este canal.
            </p>

            <div className="space-y-3">
                <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Escribe el nombre para confirmar"
                    className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                    autoFocus
                />
                
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={closeDeleteModal}
                        disabled={deletingId === channelToDelete.id}
                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDeleteChannel}
                        disabled={deleteConfirmText !== channelToDelete.name || deletingId === channelToDelete.id}
                        className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {deletingId === channelToDelete.id && (
                             <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        )}
                        Eliminar
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}