# 🔧 Instrucciones para Aplicar Migraciones Pendientes

## ⚠️ IMPORTANTE: Estas migraciones son necesarias para el sistema de permisos

Tienes 2 migraciones pendientes que deben aplicarse en Supabase:

---

## 📋 Migración 1: Fix Permissions System

**Archivo**: `supabase/migrations/20260125_fix_permissions_system.sql`

**Qué hace**: Crea la función `get_user_permissions()` que es necesaria para verificar los permisos de los usuarios en cada workspace.

**Cómo aplicar**:

1. Abre tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor** (en el menú lateral izquierdo)
3. Crea una nueva query
4. Copia y pega **TODO** el contenido del archivo `supabase/migrations/20260125_fix_permissions_system.sql`
5. Haz clic en **Run**
6. Verifica que no haya errores

**Verificación**: Después de aplicar, prueba la función con esta query:

```sql
SELECT get_user_permissions(
  '61f69eb5-091e-4915-9124-debc5e92d929'::uuid,  -- Tu user_id
  '0304a3b2-cb26-4b94-b065-22fdc129cce0'::uuid   -- Tu workspace_id
);
```

Deberías ver un resultado como: `{"all": true}` si eres el owner del workspace.

---

## 📋 Migración 2: Fix Workspace Image View

**Archivo**: `supabase/migrations/20260125_fix_workspace_image_view.sql`

**Qué hace**: Actualiza la vista `user_accessible_workspaces` para incluir el campo `image_url`, lo que permite que las imágenes de workspace se vean después de refrescar la página.

**Cómo aplicar**:

1. En el mismo **SQL Editor** de Supabase
2. Crea otra nueva query (o usa la misma después de la primera migración)
3. Copia y pega **TODO** el contenido del archivo `supabase/migrations/20260125_fix_workspace_image_view.sql`
4. Haz clic en **Run**
5. Verifica que no haya errores

**Verificación**: Después de aplicar, verifica que la vista funcione:

```sql
SELECT id, name, image_url, is_owner 
FROM user_accessible_workspaces 
WHERE user_id = '61f69eb5-091e-4915-9124-debc5e92d929'::uuid;
```

Deberías ver tus workspaces con el campo `image_url` incluido.

---

## ✅ Después de Aplicar las Migraciones

1. Refresca tu aplicación en el navegador
2. Verifica que puedas acceder a:
   - `/dashboard` - sin errores de "unauthorized"
   - `/products` - debe cargar correctamente
   - `/orders` - debe cargar correctamente
3. Las imágenes de workspace deben verse en el menú lateral
4. No deberías ver más errores de "Forbidden: Insufficient permissions"

---

## 🐛 Si Algo Sale Mal

Si después de aplicar las migraciones sigues viendo errores:

1. Verifica los logs del navegador (F12 → Console)
2. Revisa los logs de la API en la terminal donde corre Next.js
3. Asegúrate de que ambas migraciones se aplicaron sin errores
4. Limpia el caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

---

## 📝 Cambios Realizados en el Código

Además de las migraciones, se actualizaron los siguientes archivos:

### Archivos de API actualizados:
- ✅ `/app/api/products/route.ts` - GET y POST
- ✅ `/app/api/orders/route.ts` - GET y POST
- ✅ `/app/api/teams/route.ts` - GET y POST

### Archivos de sistema de permisos:
- ✅ `/app/lib/permissions.ts` - Funciones `hasPermission()` y `requirePermission()`
- ✅ `/middleware.ts` - Verificación de permisos a nivel de middleware
- ✅ `/app/providers/WorkspaceProvider.tsx` - Estado de permisos del usuario
- ✅ `/app/(app)/layout.tsx` - Integración de permisos en layout

Todos estos archivos ahora usan correctamente el sistema de permisos con `workspaceId`.
