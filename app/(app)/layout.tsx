"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  HiMenu,
  HiX,
  HiSearch,
  HiUser,
  HiViewGrid,
  HiChat,
  HiUsers,
  HiShoppingBag,
  HiMail,
  HiCube,
  HiTemplate,
  HiCreditCard,
  HiPuzzle,
  HiCog,
  HiLogout,
  HiMoon,
  HiSun,
  HiSelector,
  HiPlus,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiSparkles
} from "react-icons/hi";
import { createClient } from "../utils/supabase/client";
import { useThemeContext } from "../providers/ThemeProvider";
import { NotificationBell } from "../components/NotificationBell";
import CreateWorkspace from "../components/CreateWorkspace";
import EmptyStateLanding from "../components/EmptyStateLanding";
import { useWorkspace } from "../providers/WorkspaceProvider";
import type { Permission } from "../types/roles-agents";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, any>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const initialized = useRef(false);
  const { theme, toggleTheme, mounted } = useThemeContext();

  const { 
    workspaces, 
    currentWorkspace, 
    userRole, 
    isLoading: isWorkspaceLoading,
    isSwitching,
    switchWorkspace
  } = useWorkspace();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    const getUser = async () => {
      if (!mounted) return;

      // First try to load from localStorage for instant render
      const cachedUser = localStorage.getItem('user_data');
      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          setIsLoading(false);
          // Don't return - still verify session in background
        } catch (e) {
          localStorage.removeItem('user_data');
        }
      }

      // Shorter timeout for faster perceived loading
      const timeoutId = setTimeout(() => {
        if (mounted && !user) {
          setIsLoading(false);
        }
      }, 2000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        
        if (mounted) {
          if (error) {
            setUser(null);
            localStorage.removeItem('user_data');
            setIsLoading(false);
            return;
          }

          if (session?.user && session.expires_at && session.expires_at * 1000 > Date.now()) {
            setUser(session.user);
            localStorage.setItem('user_data', JSON.stringify(session.user));
          } else {
            setUser(null);
            localStorage.removeItem('user_data');
          }
          setIsLoading(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Invitation sync disabled for performance - notifications are disabled

  // Fetch user permissions
  useEffect(() => {
    // If we have a workspace role, we can simplify permissions or map them
    if (userRole) {
        // Simple mapping for now
        if (userRole === 'admin') {
            setUserPermissions({ all: true });
        } else {
            // Agent permissions - strict default
            setUserPermissions({ 
                chats: true, 
                products: { view_published: true } 
            }); 
        }
        return;
    }

    // Fallback to old system if no workspace (unlikely if loop works)
    const fetchPermissions = async () => {
      if (!user) return;

      try {
        const { data: roles } = await supabase.rpc("get_user_roles", {
          user_uuid: user.id,
        });

        if (roles && roles.length > 0) {
          const mergedPermissions: Record<string, any> = {};
          roles.forEach((role: any) => {
            if (role.permissions) {
              Object.assign(mergedPermissions, role.permissions);
            }
          });
          setUserPermissions(mergedPermissions);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      }
    };

    fetchPermissions();
  }, [user, supabase, userRole]);

  const allMenuItems = [

    // { name: "Super Admin", icon: HiViewGrid, href: "/super-admin", permission: "super_admin" as Permission },
    { name: "Panel", icon: HiViewGrid, href: "/dashboard", permission: "dashboard" as Permission },
    { name: "Chats", icon: HiChat, href: "/chats", permission: "chats" as Permission },
    { name: "Asistente IA", icon: HiSparkles, href: "/assistance", permission: "chats" as Permission },
    { name: "Clientes", icon: HiUsers, href: "/customers", permission: "customers" as Permission },
    { name: "Pedidos", icon: HiShoppingBag, href: "/orders", permission: "orders" as Permission },
    { name: "Mensajes programados", icon: HiMail, href: "/scheduled-messages", permission: "scheduled_messages" as Permission },
    { name: "Productos", icon: HiCube, href: "/products", permission: "products" as Permission },
    { name: "Kanban", icon: HiTemplate, href: "/kanban", permission: "kanban" as Permission },
    { name: "Pagos", icon: HiCreditCard, href: "/payments", permission: "payments" as Permission },
    { name: "Integraciones", icon: HiPuzzle, href: "/integrations", permission: "integrations" as Permission },
    { name: "Automatización", icon: HiCog, href: "/automation", permission: "automation" as Permission },
    { name: "Configuración", icon: HiCog, href: "/config/channels", permission: "config" as Permission },
  ];

  // Filter menu items based on user permissions
  const menuItems = useMemo(() => {
    if (!user || Object.keys(userPermissions).length === 0) {
      return allMenuItems;
    }

    // If user has 'all' permission (super admin), show everything
    if (userPermissions.all === true) {
      return allMenuItems;
    }

    // Filter based on permissions
    return allMenuItems.filter((item) => {
      if (!item.permission) return true;
      
      const perm = userPermissions[item.permission];
      
      // Check if permission exists and is true, or has view property
      return perm === true || perm?.view === true || perm?.view_published === true;
    });
  }, [userPermissions, user]);

  // Função robusta de cierre de sesión
  const handleSignOut = async () => {
    try {
      // 1. Activar loader PRIMERO
      setIsSigningOut(true);
      setDropdownOpen(false);
      
      // 2. Limpiar localStorage
      localStorage.removeItem('user_data');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('last_workspace_id');
      
      // 3. Limpiar todas las cookies de Supabase
      const allCookies = document.cookie.split(';');
      for (let cookie of allCookies) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name.includes('supabase') || name.includes('sb-')) {
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        }
      }

      // 4. Intentar cerrar sesión en Supabase (con timeout)
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      
      await Promise.race([signOutPromise, timeoutPromise]);

      // 5. Actualizar estado DESPUÉS de limpiar todo
      setUser(null);
      setIsLoading(false);
      
      // 6. Redirigir a login
      router.push('/login');
      
      // 7. Forzar recarga completa después de redirigir (asegura limpieza total)
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);

    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
      // Aún así actualizar estado y redirigir al login
      setUser(null);
      setIsSigningOut(false);
      window.location.href = '/login';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.relative')) {
        setDropdownOpen(false);
      }
      if (workspaceDropdownOpen && !(event.target as Element).closest('.workspace-selector')) {
        setWorkspaceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, workspaceDropdownOpen]);

  // Reset navigation state when route changes
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  // 1. Loading State
  if (isLoading || (user && isWorkspaceLoading && !currentWorkspace && workspaces.length === 0)) {
       return (
        <div className="flex h-screen items-center justify-center bg-background">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full animate-pulse"></div>
              <div className="text-foreground animate-pulse">Cargando...</div>
           </div>
        </div>
       );
  }

  // 2. No Workspace State (Onboarding)
  if (user && !currentWorkspace && !isWorkspaceLoading && workspaces.length === 0) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Simplified Header */}
            <header className="h-16 border-b border-current/20 px-6 flex items-center justify-between bg-background sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Image src="/botia.svg" alt="Botia" width={32} height={32} />
                    <h1 className="text-xl font-bold text-primary hidden sm:block">Botia CRM</h1>
                </div>
                <div className="flex items-center gap-4">
                     {/* Notification bell */}
                    <NotificationBell />
                    
                     {/* Simplified User Profile - Just Avatar & SignOut */}
                    <div className="relative">
                        <button
                         onClick={() => setDropdownOpen(!dropdownOpen)}
                         className="flex items-center gap-2 p-1.5 hover:bg-hover-bg rounded-full transition-colors"
                        >
                            <img
                             src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.display_name || user?.email}&background=6366f1&color=fff`}
                             alt="Profile"
                             className="w-8 h-8 rounded-full ring-2 ring-background"
                            />
                        </button>
                        
                         {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-background border border-current/20 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1">
                                 <button
                                     onClick={handleSignOut}
                                     className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-hover-bg flex items-center gap-2"
                                 >
                                     <HiLogout className="w-4 h-4" />
                                     Cerrar Sesión
                                 </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <EmptyStateLanding />
            </main>
        </div>
      );
  }

  // 3. Workspace Switching Loader
  if (isSwitching) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Cambiando de espacio de trabajo
            </h3>
            <p className="text-text-secondary">
              Cargando datos de <span className="font-medium text-foreground">{workspaces.find(w => w.id !== currentWorkspace?.id)?.name || 'tu workspace'}</span>...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background ">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive for mobile and desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-full lg:rounded-xl lg:shadow-lg bg-background transition-transform duration-300 ease-in-out h-screen overflow-y-auto lg:p-2`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-current/20">
            <div className={`flex items-center w-full min-w-0 ${collapsed ? 'justify-center' : 'mr-2'}`}>
            <Link href="/dashboard" className={`flex-shrink-0 ${collapsed ? 'mr-0' : 'mr-3'}`}>
                <Image src="/botia.svg" alt="Botia" width={40} height={40} />
            </Link>
            {/* WORKSPACE SWITCHER / BRANDING */}
            {!collapsed && workspaces.length > 0 ? (
                <div className="relative workspace-selector w-full">
                    <button 
                        onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                        className="flex items-center justify-between w-full hover:bg-hover-bg p-2 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-2 overflow-hidden mx-auto">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                                {currentWorkspace?.name?.charAt(0).toUpperCase() || "B"}
                            </div>
                            {!collapsed && (
                                <span className="font-semibold text-foreground truncate">{currentWorkspace?.name || "Botia"}</span>
                            )}
                        </div>
                        {!collapsed && (
                            <HiSelector className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        )}
                    </button>
                    
                    {workspaceDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="max-h-60 overflow-y-auto">
                                {/* Owned Workspaces */}
                                {workspaces.some(ws => ws.is_owner) && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-hover-bg/30">
                                            Mis Negocios
                                        </div>
                                        {workspaces.filter(ws => ws.is_owner).map(ws => (
                                            <button
                                                key={ws.id}
                                                onClick={async () => {
                                                    await switchWorkspace(ws.id);
                                                    setWorkspaceDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm hover:bg-hover-bg transition-colors flex items-center justify-between ${currentWorkspace?.id === ws.id ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'}`}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                                        {ws.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate">{ws.name}</span>
                                                </div>
                                                {currentWorkspace?.id === ws.id && (
                                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                                                )}
                                            </button>
                                        ))}
                                    </>
                                )}
                                
                                {/* Guest Workspaces */}
                                {workspaces.some(ws => !ws.is_owner) && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-hover-bg/30 border-t border-border mt-1">
                                            Invitado
                                        </div>
                                        {workspaces.filter(ws => !ws.is_owner).map(ws => (
                                            <button
                                                key={ws.id}
                                                onClick={async () => {
                                                    await switchWorkspace(ws.id);
                                                    setWorkspaceDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm hover:bg-hover-bg transition-colors flex items-center justify-between ${currentWorkspace?.id === ws.id ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'}`}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <HiUser className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                                                    <span className="truncate">{ws.name}</span>
                                                </div>
                                                {currentWorkspace?.id === ws.id && (
                                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                                                )}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                            <div className="border-t border-border p-2">
                                    <Link
                                      href="/create-workspace"
                                      onClick={() => setWorkspaceDropdownOpen(false)}
                                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-hover-bg rounded-md transition-colors"
                                  >
                                      <HiPlus className="w-4 h-4" />
                                      Crear Negocio
                                  </Link>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
            </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-foreground hover:bg-hover-bg transition-colors flex-shrink-0"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div className="px-4 mb-6">
             {!collapsed ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiSearch className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="block w-full pl-10 pr-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              ) : (
                 <div className="flex justify-center">
                    <button className="p-2 hover:bg-hover-bg rounded-lg text-text-tertiary">
                        <HiSearch className="h-5 w-5" />
                    </button>
                 </div>
              )}
            </div>

          <nav className="px-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const isNavigating = navigatingTo === item.href;
              
              const handleLinkClick = (e: React.MouseEvent, href: string) => {
                // Set loading state
                setNavigatingTo(href);
                // Close mobile sidebar
                setSidebarOpen(false);
                // Let Next.js Link handle navigation
              };
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`group flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-3 text-sm font-medium rounded-lg transition-all duration-50 ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  } ${isNavigating ? 'opacity-70 cursor-wait' : ''}`}
                  title={collapsed ? item.name : undefined}
                >
                  {isNavigating ? (
                    <svg 
                      className={`${collapsed ? 'mr-0' : 'mr-3'} shrink-0 h-5 w-5 animate-spin`} 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <item.icon className={`${collapsed ? 'mr-0' : 'mr-3'} shrink-0 h-5 w-5 ${isActive ? "text-white" : ""}`} />
                  )}
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* Spacer to push collapse button to bottom */}
          <div className="flex-1"></div>

          {/* Collapse Toggle Button (Desktop Only) */}
          <div className="hidden lg:flex p-4 justify-center border-t border-current/20">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className={`p-2 rounded-lg text-foreground hover:bg-hover-bg transition-colors flex items-center ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? "Expandir menú" : "Contraer menú"}
            >
                {collapsed ? (
                    <HiChevronDoubleRight className="w-5 h-5" />
                ) : (
                    <>
                        <HiChevronDoubleLeft className="w-5 h-5 mr-3" />
                        <span className="text-sm font-medium">Colapsar menú</span>
                    </>
                )}
            </button>
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className=" border-b border-current/20 lg:hidden">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-foreground hover:bg-hover-bg transition-colors"
            >
              <HiMenu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/botia.svg" alt="Botia" width={28} height={28} />
              <h1 className="text-2xl font-bold text-primary">Botia</h1>
            </div>
            <div className="relative">
              <button
                onClick={() => !isSigningOut && setDropdownOpen(!dropdownOpen)}
                disabled={isSigningOut}
                className="flex items-center gap-2 p-2 hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || isSigningOut ? (
                  <div className="w-8 h-8 bg-border rounded-full animate-pulse"></div>
                ) : (
                  <img
                    src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.display_name || user?.email || 'Usuario'}&background=6366f1&color=fff`}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                )}
                {isSigningOut ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <svg className={`w-4 h-4 text-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute bg-background right-0 mt-2 w-48 rounded-md shadow-lg z-50 border border-current/20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        // TODO: Navigate to profile page
                        setDropdownOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-hover-bg transition-colors"
                    >
                      <HiUser className="w-4 h-4 mr-3" />
                      Perfil
                    </button>
                    <div className="border-t border-current/20"></div>
                    <button
                      onClick={() => {
                        toggleTheme();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-hover-bg transition-colors"
                    >
                      {theme === 'light' ? (
                        <>
                          <HiMoon className="w-4 h-4 mr-3" />
                          Modo oscuro
                        </>
                      ) : (
                        <>
                          <HiSun className="w-4 h-4 mr-3" />
                          Modo claro
                        </>
                      )}
                    </button>
                    <div className="border-t border-current/20"></div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-hover-bg transition-colors"
                    >
                      <HiLogout className="w-4 h-4 mr-3" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

       {/* Page content */}
      <main className="flex-1 flex flex-col p-6 overflow-auto">
 <div className="flex-1 rounded-lg flex flex-col px-2 pt-2 shadow-[-10px_0_25px_-5px_rgba(99,102,241,0.15),0_10px_25px_-5px_rgba(99,102,241,0.1)] overflow-auto">
   {/* Header visible */}
   {/* Top header with search and user profile */}
           <div className="flex items-center justify-between pb-4 border-b border-current/20">
             {/* Search bar */}
             <div className="flex-1 max-w-md">
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <HiSearch className="h-5 w-5 text-text-tertiary" />
                 </div>
                 <input
                   type="text"
                   placeholder="Buscar algo..."
                   className="block w-full pl-10 pr-3 py-2 border border-current/20 rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                 />
               </div>
             </div>

             {/* User profile section */}
             <div className="hidden lg:flex items-center gap-4 ml-6">
               {/* Notification bell */}
               <NotificationBell />

               {/* User info */}
               <div className="relative">
                 <button
                   onClick={() => !isSigningOut && setDropdownOpen(!dropdownOpen)}
                   disabled={isSigningOut}
                   className="flex items-center gap-3 p-2 hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isLoading || isSigningOut ? (
                     <div className="w-10 h-10 bg-border rounded-full animate-pulse"></div>
                   ) : (
                     <img
                       src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.display_name || user?.email}&background=6366f1&color=fff`}
                       alt="Profile"
                       className="w-10 h-10 rounded-full"
                     />
                   )}
                   <div className="hidden md:block text-left">
                     {isLoading || isSigningOut ? (
                       <div className="space-y-1">
                         <div className="h-4 bg-border rounded animate-pulse w-24"></div>
                         <div className="h-3 bg-border rounded animate-pulse w-16"></div>
                       </div>
                     ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">{user?.user_metadata?.display_name || user?.email}</p>
                        <p 
                          className="text-[8px] text-text-secondary truncate max-w-[120px] cursor-help" 
                          title={user?.user_metadata?.email || user?.email}
                        >
                          {isSigningOut ? 'Cerrando sesión...' : (user?.user_metadata?.email || user?.email)}
                        </p>
                      </>
                     )}
                   </div>
                   {isSigningOut ? (
                     <svg className="animate-spin h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                   ) : (
                     <svg className={`w-5 h-5 text-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                   )}
                 </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute bg-background right-0 mt-2 w-48 rounded-md shadow-lg z-50 border border-current/20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          // TODO: Navigate to profile page
                          setDropdownOpen(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-hover-bg transition-colors"
                      >
                        <HiUser className="w-4 h-4 mr-3" />
                        Perfil
                      </button>
                      <div className="border-t border-current/20"></div>
                      <button
                        onClick={() => {
                          toggleTheme();
                          setDropdownOpen(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-hover-bg transition-colors"
                      >
                        {theme === 'light' ? (
                          <>
                            <HiMoon className="w-4 h-4 mr-3" />
                            Modo oscuro
                          </>
                        ) : (
                          <>
                            <HiSun className="w-4 h-4 mr-3" />
                            Modo claro
                          </>
                        )}
                      </button>
                      <div className="border-t border-current/20"></div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-hover-bg transition-colors"
                      >
                        <HiLogout className="w-4 h-4 mr-3" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
  {/* Contenedor que ocupa el espacio restante */}
  <div className="flex-1 min-h-0">
    <div className="rounded-lg h-full">
     {children}
    </div>
  </div>
 </div>
</main>

      </div>
    </div>
  );
}