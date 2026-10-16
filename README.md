# MI STOCK — PWA multiusuario

Aplicación para celulares y computadoras: usuarios independientes, inventario, costo y precio, venta con carrito, descuento transaccional de stock, historial, anulación y comprobantes PDF. Sin correos ni SMS para los usuarios finales: ingresan con **celular y contraseña**.

## Requisitos
- Node.js 20.19+ o 22+
- Cuenta/proyecto Supabase
- Cuenta Vercel (o hosting estático equivalente)
- Supabase CLI para publicar la función de administración (se puede ejecutar con `npx supabase`)

## Instalación y despliegue — orden obligatorio

1. Descomprimí este ZIP y abrí la carpeta `mi-stock` en VS Code.
2. Ejecutá `npm install`.
3. Creá un proyecto Supabase. En **SQL Editor**, pegá y ejecutá **todo** `supabase/schema.sql`.
4. En Supabase, **Authentication → Providers → Email**, mantené habilitada la autenticación Email/Password. **Desactivá el registro público** si la interfaz de Supabase ofrece esa opción (`Allow new users to sign up` / `Allow sign ups`). No necesitás habilitar SMS ni configurar un proveedor de correo: se crean identidades internas con direcciones técnicas ficticias `CELULAR@mistock.example.com` que **nunca se piden al usuario**. No activar confirmación por correo; el servidor crea cuentas ya confirmadas.
5. Copiá `.env.example` como `.env`. Completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde **Project Settings → API** (clave `anon` / `publishable`), y `SUPABASE_SERVICE_ROLE_KEY` desde la clave privada `service_role` del mismo proyecto. Elegí `ADMIN_PHONE`, `ADMIN_PASSWORD` (8+ caracteres) y `ADMIN_NAME`.
6. Ejecutá **una sola vez** `npm run bootstrap:admin` para crear tu administrador. Guardá la contraseña. Si ya existe, no repitas el comando.
7. Publicá la función de administración:
   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase functions deploy admin-users
   ```
   Si tu proyecto utiliza claves de API modernas, comprobá en el panel Supabase que las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` estén disponibles para la Edge Function. Las claves privadas **solo** deben residir en el servidor/Edge Function.
8. Para probar localmente: `npm run dev` y abrí la URL indicada.
9. Para desplegar en Vercel: subí esta carpeta a un repositorio Git privado y creá un proyecto Vercel con framework **Vite**. Configurá en **Environment Variables** solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Build command `npm run build`, output `dist`. **Nunca subas `.env` ni configures `SUPABASE_SERVICE_ROLE_KEY` en Vercel**. Publicá.
10. Abrí la URL HTTPS publicada desde el celular e instalá la PWA mediante «Agregar a pantalla de inicio» (según navegador). Ingresá con tu celular y contraseña. Entrá a **Usuarios → Crear usuario** para regalar accesos.

## Importante sobre celulares

El celular **es el identificador de inicio de sesión**, no un método de verificación: no se envían códigos SMS ni se verifica que el número pertenezca a la persona. El administrador entrega una contraseña inicial. No existe recuperación automática por SMS: el administrador puede cambiar la contraseña desde **Usuarios**. No compartas contraseñas.

## Uso

- **Productos:** agregar, editar, cambiar stock (reposiciones/correcciones), costo, precio, categoría y stock mínimo.
- **Vender:** agregar varios productos al carrito, ajustar cantidad y precio de esa venta, confirmar. El servidor valida y descuenta stock de forma atómica; dos ventas simultáneas no pueden vender más de lo disponible.
- **Historial:** detalle, descarga PDF y anulación. Si un producto fue eliminado, no se puede reponer automáticamente al anular una venta antigua de ese producto.
- **Mi negocio:** cambia el nombre impreso en los comprobantes.
- **Usuarios (solo administrador):** crear, activar/desactivar, cambiar contraseña.
- El comprobante PDF **no es factura fiscal**.

## Seguridad y datos

- Cada usuario accede solo a sus productos, ventas y detalle mediante políticas RLS en Supabase.
- El panel de usuarios invoca una Edge Function que verifica el token y comprueba el rol admin en servidor antes de utilizar la clave privilegiada.
- La aplicación requiere conexión a internet para iniciar sesión, consultar, guardar o vender. La PWA permite instalarla, **no** habilita ventas offline.
- Los datos se almacenan en Supabase. Configurá respaldos periódicos acordes a tu uso; los planes gratuitos tienen límites y posibles pausas.
- El historial muestra las últimas **500 ventas** y hasta **3000 líneas**. Si el negocio crece, implementá paginación antes de superar esos límites.
- La aplicación no es un sistema contable ni de facturación oficial. No incluye impuestos, tickets fiscales ni multiempleado por negocio.

## Prueba de compilación

```bash
npm install
npm run build
```

## Solución de problemas

- «Configuración pendiente»: faltan variables `VITE_` en `.env` o Vercel.
- «Cuenta sin configurar»: ejecutaste la creación del usuario de Auth sin insertar su fila en `profiles`.
- Error al crear usuarios: verificar despliegue de `admin-users`, sesión del administrador y variables Supabase de la función.
- Error de stock: revisar cantidad disponible y que el SQL completo esté instalado.
- No instalar PWA: requiere HTTPS (o localhost) y navegador compatible.

## Costos

Se puede empezar con planes gratuitos dentro de sus límites y condiciones; no se garantiza costo cero para cualquier uso. Revisá las condiciones del plan Vercel elegido, especialmente si más adelante cobrás por el servicio.
