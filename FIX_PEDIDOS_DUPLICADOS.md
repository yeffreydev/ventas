# Fix de Números de Pedido Duplicados

## 🎯 Problema Resuelto

Este fix resuelve **todos** los escenarios posibles de números de pedido duplicados:

1. ✅ **Conflictos entre workspaces** - Cada workspace tiene su propia secuencia
2. ✅ **Race conditions** - Generación atómica con bloqueo a nivel de fila
3. ✅ **Pedidos existentes** - La migración inicializa secuencias correctamente
4. ✅ **Concurrencia** - Múltiples usuarios pueden crear pedidos simultáneamente

## 📦 Archivos Modificados

### Migración de Base de Datos
- `supabase/migrations/20260121_fix_order_duplicates_final.sql` - Migración completa

### Código de Aplicación
- `app/api/orders/route.ts` - Añadido retry logic con exponential backoff

### Scripts de Ayuda
- `apply-order-fix.js` - Script para aplicar y verificar la migración

## 🚀 Cómo Aplicar el Fix

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a tu [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia el contenido de `supabase/migrations/20260121_fix_order_duplicates_final.sql`
5. Pega y ejecuta el SQL
6. Verifica que no haya errores

### Opción 2: Supabase CLI

```bash
cd /Users/yeffreyespinoza/projects/CRM-botia/CRM-IA
supabase db push
```

## ✅ Verificación

### 1. Verificar Constraints

Ejecuta en SQL Editor:

```sql
-- Debe mostrar 'orders_workspace_order_number_key' (composite)
-- NO debe mostrar 'orders_order_number_key' (global)
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname LIKE '%order_number%';
```

### 2. Verificar Secuencias Inicializadas

```sql
-- Debe mostrar una fila por cada workspace con pedidos existentes
SELECT workspace_id, entity_type, last_number, year 
FROM workspace_sequences 
ORDER BY workspace_id, year;
```

### 3. Probar Generación de Números

Reemplaza `'tu-workspace-uuid'` con un UUID real de workspace:

```sql
-- Debe generar: ORD-2026-00001, ORD-2026-00002, ORD-2026-00003
SELECT generate_order_number('tu-workspace-uuid');
SELECT generate_order_number('tu-workspace-uuid');
SELECT generate_order_number('tu-workspace-uuid');
```

### 4. Probar en la Aplicación

1. Ve a la página de Pedidos
2. Crea 3 pedidos rápidamente (uno tras otro)
3. Verifica que los números sean secuenciales
4. Cambia de workspace y crea otro pedido
5. Verifica que el nuevo workspace empiece desde `ORD-2026-00001`

## 🔧 Detalles Técnicos

### Formato de Números de Pedido

```
ORD-YYYY-XXXXX
│   │    │
│   │    └─ Número secuencial (5 dígitos, hasta 99,999)
│   └────── Año actual
└────────── Prefijo fijo
```

**Ejemplos:**
- `ORD-2026-00001` - Primer pedido del workspace en 2026
- `ORD-2026-00042` - Pedido número 42 del workspace en 2026
- `ORD-2027-00001` - Primer pedido del workspace en 2027 (resetea)

### Características de Seguridad

1. **Atomic Operations**: Usa `INSERT...ON CONFLICT...RETURNING` para operaciones atómicas
2. **Row-Level Locking**: Previene race conditions en escrituras concurrentes
3. **Retry Logic**: El API reintenta hasta 3 veces con exponential backoff
4. **Workspace Isolation**: Cada workspace tiene secuencias completamente independientes
5. **Year-Based Reset**: Las secuencias se resetean cada año automáticamente

### Manejo de Edge Cases

- ✅ **Nuevo workspace**: Se crea automáticamente la secuencia en 0
- ✅ **Cambio de año**: Se resetea automáticamente a 1
- ✅ **Pedidos existentes**: Se inicializan secuencias con el conteo actual
- ✅ **Concurrencia alta**: Retry logic con exponential backoff
- ✅ **Errores transitorios**: Hasta 3 reintentos automáticos

## 🐛 Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Causa**: La migración no se aplicó correctamente o hay un problema con las secuencias.

**Solución**:
1. Verifica que la migración se aplicó: `SELECT * FROM workspace_sequences;`
2. Si está vacía, ejecuta manualmente la sección de inicialización
3. Si persiste, contacta soporte

### Error: "Failed to generate order number"

**Causa**: Problema de permisos o función no existe.

**Solución**:
1. Verifica que la función existe: `\df generate_order_number`
2. Verifica permisos: La función debe tener GRANT para authenticated/anon
3. Revisa logs de Supabase para más detalles

## 📊 Monitoreo

Para monitorear el estado de las secuencias:

```sql
-- Ver estado actual de todas las secuencias
SELECT 
  w.name as workspace_name,
  ws.entity_type,
  ws.last_number,
  ws.year,
  ws.updated_at
FROM workspace_sequences ws
JOIN workspaces w ON w.id = ws.workspace_id
ORDER BY ws.updated_at DESC;
```

## ✨ Próximos Pasos

Una vez aplicada la migración:

1. ✅ Crear algunos pedidos de prueba
2. ✅ Verificar que los números sean secuenciales
3. ✅ Probar en múltiples workspaces
4. ✅ Verificar que no haya errores en logs
5. ✅ Monitorear durante 24-48 horas

---

**Autor**: Antigravity AI  
**Fecha**: 2026-01-21  
**Versión**: 1.0.0
