"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { HiCog, HiChat, HiUsers, HiTag, HiTemplate, HiClipboardList, HiOfficeBuilding } from "react-icons/hi";
import { Package } from "lucide-react";

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const configTabs = [
    {
      name: "Negocio",
      href: "/config/business",
      icon: HiOfficeBuilding,
      description: "Edita perfil y logo del negocio",
    },
    {
      name: "Canales",
      href: "/config/channels",
      icon: HiChat,
      description: "Gestiona tus canales de comunicación",
    },
    {
      name: "Equipos",
      href: "/config/teams",
      icon: HiUsers,
      description: "Administra equipos y agentes",
    },
    {
      name: "Etiquetas",
      href: "/config/labels",
      icon: HiTag,
      description: "Organiza con etiquetas personalizadas",
    },
    {
      name: "Plantillas",
      href: "/config/templates",
      icon: HiTemplate,
      description: "Crea respuestas rápidas",
    },
    {
      name: "Stock",
      href: "/config/stock",
      icon: Package,
      description: "Configura alertas y reglas de inventario",
    },
    {
      name: "Campos de Pedidos",
      href: "/config/orders/custom-fields",
      icon: HiClipboardList,
      description: "Campos personalizados para pedidos",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-current/20">
        <div className="p-3 bg-primary/10 rounded-lg">
          <HiCog className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Configuración de Chats
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Administra canales, equipos y configuraciones de mensajería
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {configTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border-current/20 hover:border-primary/50 hover:bg-hover-bg"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-border group-hover:bg-primary/10 text-text-secondary group-hover:text-primary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold text-sm mb-1 ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {tab.name}
                  </h3>
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {tab.description}
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-lg" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}