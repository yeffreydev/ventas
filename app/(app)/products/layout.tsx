"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { HiPlus, HiTag, HiCube } from "react-icons/hi";
import { HiOutlinePlayCircle } from "react-icons/hi2";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const productsTabs = [
    {
      name: "Productos",
      href: "/products",
      icon: HiCube,
      description: "Gestiona tu inventario de productos",
    },
    {
      name: "Categorías",
      href: "/products/categories",
      icon: HiTag,
      description: "Organiza productos por categorías",
    },
    {
      name: "Stock",
      href: "/products/stock",
      icon: HiCube,
      description: "Control y gestión de inventario",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-current/20">
        <div className="p-3 bg-primary/10 rounded-lg">
          <HiCube className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            Gestión de Productos
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Administra tu catálogo, categorías e inventario
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              const event = new CustomEvent('openProductForm');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
          >
            <HiPlus className="w-5 h-5" />
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {productsTabs.map((tab) => {
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

      {/* Help Section */}
      <div className="bg-background-bg border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              ¿Necesitas ayuda?
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Conoce más sobre cómo funciona la sección de Productos
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <HiOutlinePlayCircle className="w-5 h-5" />
            Ver video
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
