"use client";

import { useState } from "react";
import { HiOfficeBuilding } from "react-icons/hi";
import { HiRocketLaunch } from "react-icons/hi2";
import CreateWorkspace from "./CreateWorkspace";

export default function EmptyStateLanding() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (showCreateForm) {
    return <CreateWorkspace isFirstWorkspace={true} />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 animate-fadeIn w-full max-w-2xl mx-auto min-h-[60vh]">
      <div className="text-center w-full space-y-8">
        
        {/* Icon Illustration */}
        <div className="mx-auto h-32 w-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center shadow-xl shadow-primary/10 ring-1 ring-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
            <HiRocketLaunch className="h-16 w-16 text-primary relative z-10 animate-bounce-slow" />
        </div>

        <div className="space-y-4 max-w-lg mx-auto">
            <h2 className="text-4xl font-bold tracking-tight text-foreground">
            ¡Bienvenido a CRM-IA!
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed">
            Estás a un paso de potenciar tu negocio. Crea tu primer espacio de trabajo para comenzar a gestionar tus clientes y ventas de manera inteligente.
            </p>
        </div>

        <div className="pt-8 space-y-6">
            <button
                onClick={() => setShowCreateForm(true)}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg hover:shadow-primary/30 hover:-translate-y-1"
            >
                <HiOfficeBuilding className="w-6 h-6 mr-2 opacity-90" />
                Empezar Ahora - Crear Negocio
            </button>
            
            <div className="flex items-center justify-center gap-2 text-sm text-text-tertiary">
                <div className="h-px w-12 bg-border"></div>
                <span>O espera a ser invitado a un equipo existente</span>
                <div className="h-px w-12 bg-border"></div>
            </div>
        </div>
      </div>
    </div>
  );
}
