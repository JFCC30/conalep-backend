# Backend: Cambiar contraseña del usuario actual

La app permite que cada usuario cambie su propia contraseña desde Inicio → "Cambiar contraseña". El frontend llama a:

- **Método:** `PATCH`
- **Ruta:** `/api/auth/cambiar-contraseña`
- **Headers:** `Authorization: Bearer <token>` (usuario autenticado)
- **Body (JSON):**
  ```json
  {
    "currentPassword": "contraseña actual",
    "newPassword": "nueva contraseña"
  }
  ```

## Respuesta esperada

**Éxito (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

**Error (400/401):**
```json
{
  "success": false,
  "message": "Contraseña actual incorrecta"
}
```

## Lógica en el backend

1. Obtener el ID del usuario desde el token (middleware de autenticación).
2. Buscar el usuario en BD y verificar que `currentPassword` coincida con el hash guardado (`user.compararPassword` / bcrypt).
3. Si no coincide, responder 400 con mensaje "Contraseña actual incorrecta".
4. Asignar `newPassword` al usuario y guardar; el pre-save del modelo User la hashea con bcrypt.
5. Responder 200 con `{ success: true, message: "Contraseña actualizada correctamente" }`.

## Implementación

La ruta está implementada en `routes/auth.js`:

- `PATCH /api/auth/cambiar-contraseña` — protegida con middleware `auth`.
- Validación: campos requeridos y mínimo 6 caracteres para la nueva contraseña.
- Uso de `User.compararPassword()` para la contraseña actual y del pre-save del modelo para hashear la nueva.

Asegúrate de que el modelo User tenga el campo `password` y que en login/registro se use el mismo método (bcrypt) para hashear.
