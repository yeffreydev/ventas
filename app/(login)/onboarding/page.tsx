"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  HiCheckCircle,
  HiUser,
  HiOfficeBuilding,
  HiChatAlt2,
  HiLightningBolt,
  HiArrowRight,
  HiArrowLeft,
} from "react-icons/hi";
import { createClient } from "@/app/utils/supabase/client";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Información Personal",
    description: "Cuéntanos sobre ti",
    icon: <HiUser className="w-6 h-6" />,
  },
  {
    id: 2,
    title: "Información del Negocio",
    description: "Detalles de tu empresa",
    icon: <HiOfficeBuilding className="w-6 h-6" />,
  },
  {
    id: 3,
    title: "Preferencias de Comunicación",
    description: "Configura tus canales",
    icon: <HiChatAlt2 className="w-6 h-6" />,
  },
  {
    id: 4,
    title: "¡Listo!",
    description: "Todo configurado",
    icon: <HiLightningBolt className="w-6 h-6" />,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    displayName: "",
    phoneNumber: "",
    role: "",
    
    // Step 2: Business Info
    businessName: "",
    businessType: "",
    businessSize: "",
    industry: "",
    
    // Step 3: Communication Preferences
    preferredChannels: [] as string[],
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChannelToggle = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredChannels: prev.preferredChannels.includes(channel)
        ? prev.preferredChannels.filter((c) => c !== channel)
        : [...prev.preferredChannels, channel],
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Update user metadata in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.auth.updateUser({
          data: {
            display_name: formData.displayName,
            phone_number: formData.phoneNumber,
            role: formData.role,
            business_name: formData.businessName,
            business_type: formData.businessType,
            business_size: formData.businessSize,
            industry: formData.industry,
            preferred_channels: formData.preferredChannels,
            notification_preferences: formData.notificationPreferences,
            onboarding_completed: true,
          },
        });
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Error al completar el onboarding. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.displayName.trim() !== "" && formData.role !== "";
      case 2:
        return formData.businessName.trim() !== "" && formData.businessType !== "";
      case 3:
        return formData.preferredChannels.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/botia.svg" alt="Botia" width={80} height={80} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido a Botia CRM
          </h1>
          <p className="text-text-secondary">
            Configuremos tu cuenta en solo unos pasos
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      step.id < currentStep
                        ? "bg-green-500 text-white"
                        : step.id === currentStep
                        ? "bg-primary text-white"
                        : "bg-background border-2 border-border text-text-secondary"
                    }`}
                  >
                    {step.id < currentStep ? (
                      <HiCheckCircle className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center font-medium ${
                      step.id <= currentStep ? "text-foreground" : "text-text-secondary"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      step.id < currentStep ? "bg-green-500" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-background border border-border rounded-2xl p-8 shadow-lg">
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Información Personal
                </h2>
                <p className="text-text-secondary">
                  Ayúdanos a conocerte mejor
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Número de Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="+51 999 999 999"
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tu Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                >
                  <option value="">Selecciona tu rol</option>
                  <option value="owner">Propietario</option>
                  <option value="manager">Gerente</option>
                  <option value="sales">Ventas</option>
                  <option value="support">Soporte</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Información del Negocio
                </h2>
                <p className="text-text-secondary">
                  Cuéntanos sobre tu empresa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Ej: Mi Empresa SAC"
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Negocio *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange("businessType", e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                >
                  <option value="">Selecciona el tipo</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="retail">Retail</option>
                  <option value="services">Servicios</option>
                  <option value="saas">SaaS</option>
                  <option value="agency">Agencia</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tamaño de la Empresa
                </label>
                <select
                  value={formData.businessSize}
                  onChange={(e) => handleInputChange("businessSize", e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                >
                  <option value="">Selecciona el tamaño</option>
                  <option value="1-10">1-10 empleados</option>
                  <option value="11-50">11-50 empleados</option>
                  <option value="51-200">51-200 empleados</option>
                  <option value="201-500">201-500 empleados</option>
                  <option value="500+">500+ empleados</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industria
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => handleInputChange("industry", e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                >
                  <option value="">Selecciona la industria</option>
                  <option value="technology">Tecnología</option>
                  <option value="retail">Retail</option>
                  <option value="healthcare">Salud</option>
                  <option value="education">Educación</option>
                  <option value="finance">Finanzas</option>
                  <option value="real-estate">Bienes Raíces</option>
                  <option value="food">Alimentos y Bebidas</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Communication Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Preferencias de Comunicación
                </h2>
                <p className="text-text-secondary">
                  Selecciona los canales que usarás
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-4">
                  Canales Preferidos *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "whatsapp", name: "WhatsApp", color: "green" },
                    { id: "messenger", name: "Messenger", color: "blue" },
                    { id: "instagram", name: "Instagram", color: "pink" },
                    { id: "email", name: "Email", color: "purple" },
                    { id: "telegram", name: "Telegram", color: "sky" },
                    { id: "sms", name: "SMS", color: "indigo" },
                  ].map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => handleChannelToggle(channel.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.preferredChannels.includes(channel.id)
                          ? `border-${channel.color}-500 bg-${channel.color}-50 dark:bg-${channel.color}-900/20`
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            formData.preferredChannels.includes(channel.id)
                              ? `bg-${channel.color}-500 text-white`
                              : "bg-hover-bg text-text-secondary"
                          }`}
                        >
                          {formData.preferredChannels.includes(channel.id) && (
                            <HiCheckCircle className="w-6 h-6" />
                          )}
                        </div>
                        <span className="font-medium text-foreground">
                          {channel.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-4">
                  Notificaciones
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-hover-bg rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.email}
                      onChange={(e) =>
                        handleInputChange("notificationPreferences", {
                          ...formData.notificationPreferences,
                          email: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-primary border-input-border rounded focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Email</p>
                      <p className="text-xs text-text-secondary">
                        Recibe notificaciones por correo
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-hover-bg rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.push}
                      onChange={(e) =>
                        handleInputChange("notificationPreferences", {
                          ...formData.notificationPreferences,
                          push: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-primary border-input-border rounded focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Push</p>
                      <p className="text-xs text-text-secondary">
                        Notificaciones en el navegador
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-hover-bg rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.sms}
                      onChange={(e) =>
                        handleInputChange("notificationPreferences", {
                          ...formData.notificationPreferences,
                          sms: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-primary border-input-border rounded focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">SMS</p>
                      <p className="text-xs text-text-secondary">
                        Alertas por mensaje de texto
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Completion */}
          {currentStep === 4 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <HiCheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  ¡Todo Listo!
                </h2>
                <p className="text-text-secondary">
                  Tu cuenta ha sido configurada exitosamente
                </p>
              </div>

              <div className="bg-hover-bg rounded-xl p-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-foreground mb-4">Resumen:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Nombre:</span>
                    <span className="font-medium text-foreground">{formData.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Negocio:</span>
                    <span className="font-medium text-foreground">{formData.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Canales:</span>
                    <span className="font-medium text-foreground">
                      {formData.preferredChannels.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-hover-bg text-foreground rounded-lg hover:bg-opacity-80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <HiArrowLeft className="w-5 h-5" />
              Anterior
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Siguiente
                <HiArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Completando...
                  </>
                ) : (
                  <>
                    Comenzar
                    <HiCheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-text-secondary hover:text-foreground transition-colors"
          >
            Saltar por ahora
          </button>
        </div>
      </div>
    </div>
  );
}