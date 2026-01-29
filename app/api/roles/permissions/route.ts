import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// System modules list
const SYSTEM_MODULES = [
  { slug: 'dashboard', name: 'Dashboard', description: 'Panel de estadísticas y métricas', icon: 'HiChartBar' },
  { slug: 'chats', name: 'Chats', description: 'Gestión de conversaciones', icon: 'HiChat' },
  { slug: 'assistant', name: 'Asistente', description: 'Asistente de IA', icon: 'HiSparkles' },
  { slug: 'customers', name: 'Clientes', description: 'Gestión de clientes', icon: 'HiUserGroup' },
  { slug: 'orders', name: 'Pedidos', description: 'Gestión de pedidos', icon: 'HiDocumentText' },
  { slug: 'scheduled_messages', name: 'Mensajes Programados', description: 'Programación de mensajes', icon: 'HiClock' },
  { slug: 'products', name: 'Productos', description: 'Gestión de productos', icon: 'HiShoppingCart' },
  { slug: 'kanban', name: 'Kanban', description: 'Tablero Kanban', icon: 'HiViewBoards' },
  { slug: 'payments', name: 'Pagos', description: 'Gestión de pagos', icon: 'HiCreditCard' },
  { slug: 'integrations', name: 'Integraciones', description: 'Integraciones externas', icon: 'HiPuzzle' },
  { slug: 'automation', name: 'Automatización', description: 'Flujos automáticos', icon: 'HiLightningBolt' },
  { slug: 'config', name: 'Configuración', description: 'Configuración del sistema', icon: 'HiCog' },
];

export async function GET(request: Request) {
  try {
    const supabase = await createClient(cookies());
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("role_id");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    // Fetch the role
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, name, slug, description, is_system_role, workspace_id")
      .eq("id", roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Fetch role's active modules
    const { data: roleModules, error: modulesError } = await supabase
      .from("role_modules")
      .select("module_slug, is_active")
      .eq("role_id", roleId);

    if (modulesError) {
      console.error("Error fetching role modules:", modulesError);
    }

    // Create map for quick lookup
    const roleModulesMap = new Map(
      (roleModules || []).map((rm) => [rm.module_slug, rm.is_active])
    );

    // Build the response structure - simplified with just modules
    const modulesWithStatus = SYSTEM_MODULES.map((module) => ({
      module: {
        slug: module.slug,
        name: module.name,
        description: module.description,
        icon: module.icon,
      },
      is_active: roleModulesMap.get(module.slug) || false,
    }));

    return NextResponse.json({
      role,
      modules: modulesWithStatus,
    });
  } catch (error) {
    console.error("Error in GET /api/roles/permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST to toggle a module for a role
export async function POST(request: Request) {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { role_id, module_slug, is_active } = body;

    if (!role_id || !module_slug || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: "role_id, module_slug, and is_active are required" },
        { status: 400 }
      );
    }

    // Get the role to check workspace
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("workspace_id")
      .eq("id", role_id)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Upsert the module status
    const { data, error } = await supabase
      .from("role_modules")
      .upsert(
        {
          role_id,
          module_slug,
          is_active,
          workspace_id: role.workspace_id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "role_id,module_slug,workspace_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating module:", error);
      return NextResponse.json(
        { error: "Failed to update module", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in POST /api/roles/permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
