"use client";

import { useState, useEffect } from "react";
import { FiCheck, FiAlertCircle, FiCopy, FiRefreshCw, FiMessageSquare } from "react-icons/fi";
import { createWhatsAppInbox, getWhatsAppInboxes } from "./api";
import { useConnectContext } from "../../ConnectContext";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface WhatsAppInboxInfo {
  id: number;
  name: string;
  phone_number: string;
  provider: string;
  webhook_url: string;
  callback_webhook_url: string;
  provider_config: {
    webhook_verify_token?: string;
    api_key?: string;
    phone_number_id?: string;
    business_account_id?: string;
  };
}

export default function WhatsAppConnectPage() {
   const router = useRouter();
   const { currentStep, setCurrentStep, updateStepCompletion } = useConnectContext();
   const { currentWorkspace } = useWorkspace();
   const [formData, setFormData] = useState({
     inboxName: "",
     phoneNumber: "",
     phoneNumberId: "",
     businessAccountId: "",
     apiKey: "",
   });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState(false);
   const [inboxes, setInboxes] = useState<WhatsAppInboxInfo[]>([]);
   const [loadingInboxes, setLoadingInboxes] = useState(false);
   const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Remove spaces from phone number field
    const processedValue = name === 'phoneNumber' ? value.replace(/\s/g, '') : value;
    
    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  const loadInboxes = async () => {
    if (!currentWorkspace) return;
    setLoadingInboxes(true);
    try {
      const data = await getWhatsAppInboxes(currentWorkspace.id);
      setInboxes(data);
    } catch (err) {
      console.error("Error loading inboxes:", err);
    } finally {
      setLoadingInboxes(false);
    }
  };

  useEffect(() => {
    loadInboxes();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWorkspace) {
      setError("No hay un espacio de trabajo seleccionado");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await createWhatsAppInbox({
        inboxName: formData.inboxName,
        phoneNumber: formData.phoneNumber,
        phoneNumberId: formData.phoneNumberId,
        businessAccountId: formData.businessAccountId,
        apiKey: formData.apiKey,
        workspace_id: currentWorkspace.id,
      });

      setSuccess(true);
      // Mark step 2 as completed and move to step 3 (completion)
      updateStepCompletion(2, true);
      setCurrentStep(3);
      updateStepCompletion(3, true);
      
      // Reload inboxes list
      await loadInboxes();
      
      // Reset form
      setFormData({
        inboxName: "",
        phoneNumber: "",
        phoneNumberId: "",
        businessAccountId: "",
        apiKey: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating the inbox");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mark step 1 as completed when component mounts (user selected WhatsApp)
  useEffect(() => {
    updateStepCompletion(1, true);
    setCurrentStep(2);
  }, []);

  return (
    <div className="space-y-6">
            {/* Existing Inboxes Section */}
            <div className="rounded-lg border border-border bg-background p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    WhatsApp Inboxes Configurados
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Lista de tus canales de WhatsApp con webhooks y tokens
                  </p>
                </div>
                <button
                  onClick={loadInboxes}
                  disabled={loadingInboxes}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-hover-bg border border-border rounded-lg hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw className={`h-4 w-4 ${loadingInboxes ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>

              {loadingInboxes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : inboxes.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No hay inboxes de WhatsApp configurados aún
                </div>
              ) : (
                <div className="space-y-4">
                  {inboxes.map((inbox) => (
                    <div key={inbox.id} className="border border-border bg-background rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {inbox.name}
                            </h3>
                            <p className="text-sm text-text-secondary">
                              {inbox.phone_number}
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {inbox.provider}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {/* Callback Webhook URL */}
                          {inbox.callback_webhook_url && (
                            <div>
                              <label className="block text-xs font-medium text-foreground mb-1">
                                Callback Webhook URL
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 overflow-x-auto">
                                  <input
                                    type="text"
                                    value={inbox.callback_webhook_url}
                                    readOnly
                                    className="w-full px-3 py-2 text-xs font-mono bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  />
                                </div>
                                <button
                                  onClick={() => copyToClipboard(inbox.callback_webhook_url, `callback-${inbox.id}`)}
                                  className="p-2 text-text-secondary hover:text-foreground bg-hover-bg border border-border rounded-lg hover:bg-opacity-80 transition-colors"
                                >
                                  {copiedField === `callback-${inbox.id}` ? (
                                    <FiCheck className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <FiCopy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Webhook Verify Token */}
                          {inbox.provider_config?.webhook_verify_token && (
                            <div>
                              <label className="block text-xs font-medium text-foreground mb-1">
                                Webhook Verify Token
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 overflow-x-auto">
                                  <input
                                    type="text"
                                    value={inbox.provider_config.webhook_verify_token}
                                    readOnly
                                    className="w-full px-3 py-2 text-xs font-mono bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  />
                                </div>
                                <button
                                  onClick={() => copyToClipboard(inbox.provider_config.webhook_verify_token!, `token-${inbox.id}`)}
                                  className="p-2 text-text-secondary hover:text-foreground bg-hover-bg border border-border rounded-lg hover:bg-opacity-80 transition-colors"
                                >
                                  {copiedField === `token-${inbox.id}` ? (
                                    <FiCheck className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <FiCopy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Additional Info */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                            {inbox.provider_config?.phone_number_id && (
                              <div>
                                <label className="block text-xs font-medium text-foreground mb-1">
                                  Phone Number ID
                                </label>
                                <p className="text-xs text-text-secondary font-mono">
                                  {inbox.provider_config.phone_number_id}
                                </p>
                              </div>
                            )}
                            {inbox.provider_config?.business_account_id && (
                              <div>
                                <label className="block text-xs font-medium text-foreground mb-1">
                                  Business Account ID
                                </label>
                                <p className="text-xs text-text-secondary font-mono">
                                  {inbox.provider_config.business_account_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Inbox Form */}
            <div className="rounded-lg border border-border bg-background p-8 shadow-sm">
              <h1 className="text-2xl font-bold text-foreground">
                Crear Nuevo Canal de WhatsApp
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Configura un nuevo canal de WhatsApp para tu cuenta.
              </p>

              {error && (
                <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 flex items-start gap-3">
                  <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
                  <div className="flex items-start gap-3 mb-4">
                    <FiCheck className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        ¡Canal de WhatsApp creado exitosamente!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Tu canal está listo para recibir mensajes. Puedes empezar a chatear con tus clientes ahora.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/chats/chat')}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  >
                    <FiMessageSquare className="h-5 w-5" />
                    Ir a Chats
                  </button>
                </div>
              )}

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {/* API Provider */}
                <div>
                  <label
                    htmlFor="apiProvider"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Proveedor de API
                  </label>
                  <select
                    id="apiProvider"
                    name="apiProvider"
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  >
                    <option value="whatsapp-cloud">WhatsApp Cloud</option>
                    <option value="whatsapp-business">WhatsApp Business</option>
                  </select>
                </div>

                {/* Inbox Name */}
                <div>
                  <label
                    htmlFor="inboxName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Nombre del Inbox
                  </label>
                  <input
                    id="inboxName"
                    name="inboxName"
                    type="text"
                    placeholder="Por favor ingresa un nombre para el inbox"
                    value={formData.inboxName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Número de teléfono
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="text"
                    placeholder="Ingresa el número de teléfono desde el cual se enviarán los mensajes"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* Phone Number ID */}
                <div>
                  <label
                    htmlFor="phoneNumberId"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    ID del número de teléfono
                  </label>
                  <input
                    id="phoneNumberId"
                    name="phoneNumberId"
                    type="text"
                    placeholder="Ingresa el ID del número de teléfono obtenido del panel de desarrolladores de Facebook"
                    value={formData.phoneNumberId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* Business Account ID */}
                <div>
                  <label
                    htmlFor="businessAccountId"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    ID de cuenta de negocio
                  </label>
                  <input
                    id="businessAccountId"
                    name="businessAccountId"
                    type="text"
                    placeholder="Ingresa el ID de cuenta de negocio obtenido del panel de desarrolladores de Facebook"
                    value={formData.businessAccountId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label
                    htmlFor="apiKey"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Clave de API
                  </label>
                  <input
                    id="apiKey"
                    name="apiKey"
                    type="text"
                    placeholder="Ingresa la clave de API"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Creando..." : "Crear Canal de WhatsApp"}
                  </button>
                </div>
              </form>
            </div>
          </div>
  );
}
