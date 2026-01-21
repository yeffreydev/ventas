"use client";

import { useState } from "react";
import {
  HiCheckCircle,
  HiClock,
  HiExternalLink,
  HiCog,
  HiLightningBolt,
  HiShieldCheck,
  HiSearch,
} from "react-icons/hi";
import {
  SiShopify,
  SiWoocommerce,
  SiStripe,
  SiPaypal,
  SiMailchimp,
  SiSlack,
  SiZapier,
  SiGoogle,
  SiMeta,
  SiHubspot,
  SiSalesforce,
  SiZendesk,
  SiTrello,
  SiAsana,
  SiNotion,
  SiGoogleanalytics,
} from "react-icons/si";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: "ecommerce" | "payment" | "marketing" | "productivity" | "analytics" | "crm";
  icon: React.ReactNode;
  status: "connected" | "available" | "coming-soon";
  color: string;
  bgColor: string;
  features: string[];
}

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const integrations: Integration[] = [
    // E-commerce
    {
      id: "shopify",
      name: "Shopify",
      description: "Sincroniza tus productos, pedidos y clientes de Shopify",
      category: "ecommerce",
      icon: <SiShopify className="w-8 h-8" />,
      status: "connected",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      features: ["Sincronización de productos", "Gestión de pedidos", "Datos de clientes"],
    },
    {
      id: "woocommerce",
      name: "WooCommerce",
      description: "Integra tu tienda WooCommerce con el CRM",
      category: "ecommerce",
      icon: <SiWoocommerce className="w-8 h-8" />,
      status: "available",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      features: ["Importar productos", "Seguimiento de pedidos", "Inventario"],
    },
    // Payment
    {
      id: "stripe",
      name: "Stripe",
      description: "Procesa pagos y gestiona suscripciones",
      category: "payment",
      icon: <SiStripe className="w-8 h-8" />,
      status: "connected",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      features: ["Procesamiento de pagos", "Suscripciones", "Facturación"],
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Acepta pagos con PayPal",
      category: "payment",
      icon: <SiPaypal className="w-8 h-8" />,
      status: "available",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      features: ["Pagos seguros", "Reembolsos", "Reportes"],
    },
    // Marketing
    {
      id: "mailchimp",
      name: "Mailchimp",
      description: "Automatiza tus campañas de email marketing",
      category: "marketing",
      icon: <SiMailchimp className="w-8 h-8" />,
      status: "connected",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      features: ["Email marketing", "Automatización", "Segmentación"],
    },
    {
      id: "meta",
      name: "Meta Business",
      description: "Conecta con Facebook e Instagram Ads",
      category: "marketing",
      icon: <SiMeta className="w-8 h-8" />,
      status: "available",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      features: ["Anuncios", "Audiencias", "Métricas"],
    },
    // Productivity
    {
      id: "slack",
      name: "Slack",
      description: "Recibe notificaciones en tiempo real en Slack",
      category: "productivity",
      icon: <SiSlack className="w-8 h-8" />,
      status: "available",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      features: ["Notificaciones", "Alertas", "Colaboración"],
    },
    {
      id: "zapier",
      name: "Zapier",
      description: "Conecta con miles de aplicaciones",
      category: "productivity",
      icon: <SiZapier className="w-8 h-8" />,
      status: "available",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      features: ["Automatización", "Workflows", "Integraciones"],
    },
    {
      id: "trello",
      name: "Trello",
      description: "Gestiona tareas y proyectos",
      category: "productivity",
      icon: <SiTrello className="w-8 h-8" />,
      status: "coming-soon",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      features: ["Tableros", "Tareas", "Colaboración"],
    },
    {
      id: "asana",
      name: "Asana",
      description: "Sincroniza proyectos y tareas",
      category: "productivity",
      icon: <SiAsana className="w-8 h-8" />,
      status: "coming-soon",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      features: ["Gestión de proyectos", "Seguimiento", "Reportes"],
    },
    {
      id: "notion",
      name: "Notion",
      description: "Integra tu workspace de Notion",
      category: "productivity",
      icon: <SiNotion className="w-8 h-8" />,
      status: "coming-soon",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/30",
      features: ["Documentación", "Base de datos", "Colaboración"],
    },
    // Analytics
    {
      id: "google-analytics",
      name: "Google Analytics",
      description: "Analiza el comportamiento de tus usuarios",
      category: "analytics",
      icon: <SiGoogleanalytics className="w-8 h-8" />,
      status: "available",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      features: ["Métricas", "Reportes", "Conversiones"],
    },
    {
      id: "google-workspace",
      name: "Google Workspace",
      description: "Integra Gmail, Calendar y Drive",
      category: "productivity",
      icon: <SiGoogle className="w-8 h-8" />,
      status: "available",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      features: ["Gmail", "Calendar", "Drive"],
    },
    // CRM
    {
      id: "hubspot",
      name: "HubSpot",
      description: "Sincroniza contactos y deals",
      category: "crm",
      icon: <SiHubspot className="w-8 h-8" />,
      status: "available",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      features: ["Contactos", "Deals", "Pipeline"],
    },
    {
      id: "salesforce",
      name: "Salesforce",
      description: "Integra con Salesforce CRM",
      category: "crm",
      icon: <SiSalesforce className="w-8 h-8" />,
      status: "coming-soon",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      features: ["Leads", "Oportunidades", "Cuentas"],
    },
    {
      id: "zendesk",
      name: "Zendesk",
      description: "Gestión de tickets y soporte",
      category: "crm",
      icon: <SiZendesk className="w-8 h-8" />,
      status: "available",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      features: ["Tickets", "Soporte", "Base de conocimiento"],
    },
  ];

  const categories = [
    { id: "all", name: "Todas", count: integrations.length },
    { id: "ecommerce", name: "E-commerce", count: integrations.filter(i => i.category === "ecommerce").length },
    { id: "payment", name: "Pagos", count: integrations.filter(i => i.category === "payment").length },
    { id: "marketing", name: "Marketing", count: integrations.filter(i => i.category === "marketing").length },
    { id: "productivity", name: "Productividad", count: integrations.filter(i => i.category === "productivity").length },
    { id: "analytics", name: "Analytics", count: integrations.filter(i => i.category === "analytics").length },
    { id: "crm", name: "CRM", count: integrations.filter(i => i.category === "crm").length },
  ];

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <HiCheckCircle className="w-3.5 h-3.5" />
            Conectado
          </span>
        );
      case "available":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <HiLightningBolt className="w-3.5 h-3.5" />
            Disponible
          </span>
        );
      case "coming-soon":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            <HiClock className="w-3.5 h-3.5" />
            Próximamente
          </span>
        );
    }
  };

  const connectedCount = integrations.filter(i => i.status === "connected").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-background border border-border rounded-xl p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integraciones</h1>
            <p className="text-text-secondary mt-1">
              Conecta tus herramientas favoritas con tu CRM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-primary">{connectedCount}</span> de{" "}
                <span className="font-semibold text-foreground">{integrations.length}</span> conectadas
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Integraciones Activas</p>
                <p className="text-3xl font-bold mt-2 text-foreground">{connectedCount}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <HiCheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-background border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Disponibles</p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {integrations.filter(i => i.status === "available").length}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <HiLightningBolt className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-background border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm font-medium">Seguridad</p>
                <p className="text-3xl font-bold mt-2 text-foreground">100%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <HiShieldCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-background border border-border rounded-xl p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar integraciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-input-bg border border-input-border text-foreground placeholder:text-text-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? "bg-primary text-white"
                      : "bg-hover-bg text-foreground hover:bg-opacity-80"
                  }`}
                >
                  {category.name} ({category.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-background border border-border rounded-xl p-6 hover:shadow-lg transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${integration.bgColor} rounded-xl`}>
                  <div className={integration.color}>{integration.icon}</div>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {integration.name}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {integration.description}
              </p>

              {/* Features */}
              <div className="space-y-2 mb-4">
                {integration.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-text-secondary">
                    <HiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                disabled={integration.status === "coming-soon"}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  integration.status === "connected"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                    : integration.status === "available"
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-hover-bg text-text-secondary cursor-not-allowed"
                }`}
              >
                {integration.status === "connected" ? (
                  <>
                    <HiCog className="w-4 h-4" />
                    Configurar
                  </>
                ) : integration.status === "available" ? (
                  <>
                    <HiExternalLink className="w-4 h-4" />
                    Conectar
                  </>
                ) : (
                  <>
                    <HiClock className="w-4 h-4" />
                    Próximamente
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredIntegrations.length === 0 && (
          <div className="bg-background border border-border rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <HiSearch className="w-16 h-16 text-text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No se encontraron integraciones
              </h3>
              <p className="text-text-secondary">
                Intenta con otros términos de búsqueda o selecciona una categoría diferente
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
