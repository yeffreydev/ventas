'use client';

import { Card } from 'flowbite-react';
import {
  HiChartBar,
  HiBriefcase,
  HiTicket,
  HiUsers,
  HiCog
} from 'react-icons/hi';

export default function SuperAdminPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Tabs de navegación */}
      <div className="mb-6">
        <nav className="flex gap-4 border-b border-current/20">
          <button className="flex items-center gap-2 px-4 py-3 text-primary border-b-2 border-primary font-medium">
            <HiChartBar className="w-5 h-5" />
            Métricas de sistema
          </button>
          <button className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text font-medium transition-colors">
            <HiBriefcase className="w-5 h-5" />
            Gestión de negocios
          </button>
          <button className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text font-medium transition-colors">
            <HiTicket className="w-5 h-5" />
            Suscripción
          </button>
          <button className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text font-medium transition-colors">
            <HiUsers className="w-5 h-5" />
            Gestión de usuarios
          </button>
          <button className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:text-text font-medium transition-colors">
            <HiCog className="w-5 h-5" />
            Configuración
          </button>
        </nav>
      </div>

      {/* Grid de tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Tarjeta de Ingresos */}
        <Card className="shadow-md bg-background dark:bg-background">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">País:</span>
              <select className="text-sm border-0 bg-transparent text-text focus:ring-0 p-0">
                <option>Perú</option>
              </select>
            </div>
            <h3 className="text-text font-semibold mb-2">Ingresos</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-text">S/.5000</span>
              <span className="text-text-secondary">Pen</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
              Plan emprendedor
            </button>
            <button className="flex-1 px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
              Plan Pro
            </button>
          </div>
        </Card>

        {/* Tarjeta de Tenant activos */}
        <Card className="shadow-md bg-background dark:bg-background">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Estado:</span>
              <select className="text-sm border-0 bg-transparent text-text focus:ring-0 p-0">
                <option>Activo</option>
              </select>
            </div>
            <h3 className="text-text font-semibold mb-2">Tenant activos</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-text">20</span>
              <span className="text-primary font-semibold">Tenant</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
              Semana
            </button>
            <button className="flex-1 px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
              Mes
            </button>
            <button className="flex-1 px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
              Año
            </button>
          </div>
        </Card>

        {/* Tarjeta de Consumo de recursos */}
        <Card className="shadow-md bg-background dark:bg-background">
          <h3 className="text-text font-semibold mb-4">Consumo de recursos</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-primary font-medium">Mensajes enviados:</span>
                <span className="text-sm text-text font-semibold">500.000</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-primary font-medium">Uso de IA:</span>
                <span className="text-sm text-text font-semibold">55% de capacidad</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-primary font-medium">Almacenamiento:</span>
                <span className="text-sm text-text font-semibold">250 GB / 1TB</span>
              </div>
            </div>
          </div>
          <button className="mt-4 w-full px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
            Ver más
          </button>
        </Card>
      </div>

      {/* Grid inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tiempo promedio por tenant */}
        <Card className="shadow-md bg-background dark:bg-background">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-text font-semibold text-lg">Tiempo promedio por tenant</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Por:</span>
              <select className="text-sm border-current/20 rounded-lg focus:ring-primary focus:border-primary bg-input-bg text-text">
                <option>Semana</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {/* Tenant 1 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-lg">
                    👒
                  </div>
                  <div>
                    <p className="font-semibold text-text">Hat</p>
                    <p className="text-sm text-text-secondary">Luis Rodrigo Pérez</p>
                  </div>
                </div>
                <button className="text-text-tertiary hover:text-text-secondary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-text-secondary min-w-20 text-right">52 Horas</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">Paquete: <span className="font-medium">Emprendedor</span></p>
            </div>

            {/* Tenant 2 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💻</span>
                  </div>
                  <div>
                    <p className="font-semibold text-text">Laptop10</p>
                    <p className="text-sm text-text-secondary">Victoria Ruiz</p>
                  </div>
                </div>
                <button className="text-text-tertiary hover:text-text-secondary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-text-secondary min-w-20 text-right">48 Horas</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">Paquete: <span className="font-medium">Emprendedor</span></p>
            </div>

            {/* Tenant 3 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <p className="font-semibold text-text">PhoneCel</p>
                    <p className="text-sm text-text-secondary">Fernando Méndez</p>
                  </div>
                </div>
                <button className="text-text-tertiary hover:text-text-secondary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '56%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-text-secondary min-w-20 text-right">31 Horas</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">Paquete: <span className="font-medium">Emprendedor</span></p>
            </div>
          </div>

          <button className="mt-6 w-full px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
            Ver más
          </button>
        </Card>

        {/* Módulos más contratados */}
        <Card className="shadow-md bg-background dark:bg-background">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-text font-semibold text-lg">Módulos mas contratados</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">De:</span>
              <select className="text-sm border-current/20 rounded-lg focus:ring-primary focus:border-primary bg-input-bg text-text">
                <option>Febrero 2025</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {/* Barra 1 - Integraciones */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text">Integraciones</span>
                    <span className="text-sm font-semibold text-text">81,57%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mt-1">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '81%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra 2 - Mensajes programados */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text">Mensajes programados</span>
                    <span className="text-sm font-semibold text-text">63,25%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mt-1">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '63%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra 3 - Automatización */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text">Automatización</span>
                    <span className="text-sm font-semibold text-text">52,95%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mt-1">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '53%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra 4 - Kanban */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text">Kanban</span>
                    <span className="text-sm font-semibold text-text">47,29%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mt-1">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '47%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="mt-6 w-full px-4 py-2 text-sm border border-current/20 rounded-lg hover:bg-hover-bg transition-colors">
            Ver más
          </button>
        </Card>
      </div>

      {/* Botón flotante de chat */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:opacity-90 flex items-center justify-center transition-opacity">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3.293 3.293 3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
        </svg>
      </button>
    </div>
  );
}