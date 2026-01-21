"use client";

import { useState } from "react";
import {
  HiPlay,
  HiPause,
  HiPlus,
  HiCog,
  HiTrash,
  HiDuplicate,
  HiLightningBolt,
  HiClock,
  HiCheckCircle,
  HiExclamation,
  HiChartBar,
  HiSearch,
  HiFilter,
} from "react-icons/hi";
import {
  FaWhatsapp,
  FaEnvelope,
  FaSlack,
  FaDatabase,
  FaRobot,
} from "react-icons/fa";
import { SiZapier } from "react-icons/si";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "error";
  trigger: {
    type: string;
    icon: React.ReactNode;
    color: string;
  };
  actions: number;
  executions: number;
  lastRun?: string;
  successRate: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  steps: string[];
}

export default function AutomationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showTemplates, setShowTemplates] = useState(false);

  const workflows: Workflow[] = [
    {
      id: "1",
      name: "Bienvenida Automática WhatsApp",
      description: "Envía mensaje de bienvenida cuando un nuevo cliente escribe",
      status: "active",
      trigger: {
        type: "WhatsApp Message",
        icon: <FaWhatsapp className="w-5 h-5" />,
        color: "text-green-600 dark:text-green-400",
      },
      actions: 3,
      executions: 1234,
      lastRun: "Hace 5 min",
      successRate: 98.5,
    },
    {
      id: "2",
      name: "Seguimiento de Pedidos",
      description: "Notifica al cliente sobre el estado de su pedido",
      status: "active",
      trigger: {
        type: "Order Status Change",
        icon: <FaDatabase className="w-5 h-5" />,
        color: "text-blue-600 dark:text-blue-400",
      },
      actions: 5,
      executions: 856,
      lastRun: "Hace 15 min",
      successRate: 99.2,
    },
    {
      id: "3",
      name: "Email Marketing Automático",
      description: "Envía emails personalizados basados en comportamiento",
      status: "active",
      trigger: {
        type: "Customer Action",
        icon: <FaEnvelope className="w-5 h-5" />,
        color: "text-purple-600 dark:text-purple-400",
      },
      actions: 4,
      executions: 2341,
      lastRun: "Hace 1h",
      successRate: 97.8,
    },
    {
      id: "4",
      name: "Notificaciones Slack",
      description: "Alerta al equipo sobre nuevos leads importantes",
      status: "inactive",
      trigger: {
        type: "New Lead",
        icon: <FaSlack className="w-5 h-5" />,
        color: "text-purple-600 dark:text-purple-400",
      },
      actions: 2,
      executions: 432,
      lastRun: "Hace 2 días",
      successRate: 100,
    },
    {
      id: "5",
      name: "Respuestas Automáticas IA",
      description: "Responde preguntas frecuentes con IA",
      status: "error",
      trigger: {
        type: "Message Received",
        icon: <FaRobot className="w-5 h-5" />,
        color: "text-orange-600 dark:text-orange-400",
      },
      actions: 6,
      executions: 156,
      lastRun: "Hace 3h",
      successRate: 85.3,
    },
  ];

  const templates: WorkflowTemplate[] = [
    {
      id: "t1",
      name: "Bienvenida a Nuevos Clientes",
      description: "Envía un mensaje de bienvenida personalizado",
      category: "Marketing",
      icon: <FaWhatsapp className="w-6 h-6" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      steps: ["Trigger: Nuevo cliente", "Enviar WhatsApp", "Agregar a lista"],
    },
    {
      id: "t2",
      name: "Recordatorio de Carrito Abandonado",
      description: "Recupera ventas perdidas automáticamente",
      category: "E-commerce",
      icon: <FaEnvelope className="w-6 h-6" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      steps: ["Trigger: Carrito abandonado", "Esperar 1 hora", "Enviar email"],
    },
    {
      id: "t3",
      name: "Sincronización de Datos",
      description: "Mantén tus sistemas sincronizados",
      category: "Integración",
      icon: <FaDatabase className="w-6 h-6" />,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      steps: ["Trigger: Webhook", "Transformar datos", "Actualizar CRM"],
    },
    {
      id: "t4",
      name: "Notificaciones de Equipo",
      description: "Mantén al equipo informado en tiempo real",
      category: "Comunicación",
      icon: <FaSlack className="w-6 h-6" />,
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      steps: ["Trigger: Evento importante", "Formatear mensaje", "Enviar a Slack"],
    },
  ];

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || workflow.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: Workflow["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <HiCheckCircle className="w-3.5 h-3.5" />
            Activo
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            <HiPause className="w-3.5 h-3.5" />
            Inactivo
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <HiExclamation className="w-3.5 h-3.5" />
            Error
          </span>
        );
    }
  };

  const activeCount = workflows.filter(w => w.status === "active").length;
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Automatización</h1>
            <p className="text-text-secondary mt-1">
              Crea workflows para automatizar tus procesos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-4 py-2.5 bg-hover-bg text-foreground border border-border rounded-lg hover:bg-opacity-80 transition-colors font-medium flex items-center gap-2"
            >
              <SiZapier className="w-4 h-4" />
              {showTemplates ? "Ver Workflows" : "Ver Plantillas"}
            </button>
            <button className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
              <HiPlus className="w-5 h-5" />
              Crear Workflow
            </button>
          </div>
        </div>

        {/* Stats Grid - Flat style matching Orders module */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Workflows Activos</p>
                <p className="text-2xl font-bold text-foreground mt-2">{activeCount}</p>
                <p className="text-sm text-green-500 mt-1">Funcionando</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <HiLightningBolt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Ejecuciones</p>
                <p className="text-2xl font-bold text-foreground mt-2">{totalExecutions.toLocaleString()}</p>
                <p className="text-sm text-green-500 mt-1">+12% este mes</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <HiChartBar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-foreground mt-2">97.8%</p>
                <p className="text-sm text-green-500 mt-1">Excelente</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <HiCheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Tiempo Ahorrado</p>
                <p className="text-2xl font-bold text-foreground mt-2">124h</p>
                <p className="text-sm text-green-500 mt-1">Este mes</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <HiClock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {!showTemplates ? (
          <>
            {/* Search and Filter */}
            <div className="bg-background border border-border rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Buscar workflows..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filterStatus === "all"
                        ? "bg-primary text-white"
                        : "bg-hover-bg text-foreground hover:bg-opacity-80"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterStatus("active")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filterStatus === "active"
                        ? "bg-primary text-white"
                        : "bg-hover-bg text-foreground hover:bg-opacity-80"
                    }`}
                  >
                    Activos
                  </button>
                  <button
                    onClick={() => setFilterStatus("inactive")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filterStatus === "inactive"
                        ? "bg-primary text-white"
                        : "bg-hover-bg text-foreground hover:bg-opacity-80"
                    }`}
                  >
                    Inactivos
                  </button>
                </div>
              </div>
            </div>

            {/* Workflows List */}
            <div className="space-y-4">
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="bg-background border border-border rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {workflow.name}
                        </h3>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <p className="text-sm text-text-secondary mb-3">
                        {workflow.description}
                      </p>
                      
                      {/* Trigger Info */}
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-hover-bg rounded-lg">
                          <div className={workflow.trigger.color}>
                            {workflow.trigger.icon}
                          </div>
                          <span className="text-foreground font-medium">
                            {workflow.trigger.type}
                          </span>
                        </div>
                        <span className="text-text-secondary">→</span>
                        <span className="text-text-secondary">
                          {workflow.actions} acciones
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button className="p-2 text-text-secondary hover:text-foreground bg-hover-bg rounded-lg hover:bg-opacity-80 transition-colors">
                        <HiPlay className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-text-secondary hover:text-foreground bg-hover-bg rounded-lg hover:bg-opacity-80 transition-colors">
                        <HiCog className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-text-secondary hover:text-foreground bg-hover-bg rounded-lg hover:bg-opacity-80 transition-colors">
                        <HiDuplicate className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Ejecuciones</p>
                      <p className="text-lg font-semibold text-foreground">
                        {workflow.executions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Última ejecución</p>
                      <p className="text-lg font-semibold text-foreground">
                        {workflow.lastRun}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Tasa de éxito</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {workflow.successRate}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Templates Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-background border border-border rounded-xl p-6 hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 ${template.bgColor} rounded-xl`}>
                    <div className={template.color}>{template.icon}</div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-2">
                      {template.description}
                    </p>
                    <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {template.category}
                    </span>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2 mb-4">
                  {template.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-text-secondary">{step}</span>
                    </div>
                  ))}
                </div>

                {/* Use Template Button */}
                <button className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2">
                  <HiPlus className="w-4 h-4" />
                  Usar Plantilla
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
