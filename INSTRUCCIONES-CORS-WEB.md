# Instrucciones: Configurar CORS para Web

El error **"Not allowed by CORS"** ocurre cuando el backend no permite solicitudes desde el navegador web. Esta guía explica cómo configurar CORS en el backend para que la aplicación web funcione correctamente.

---

## 🔴 Problema

Cuando la aplicación se ejecuta en un navegador web, todas las solicitudes HTTP son **cross-origin requests** (CORS). El navegador bloquea estas solicitudes a menos que el servidor explícitamente las permita mediante headers CORS.

**Error típico:**
```
❌ Error no manejado: Error: Not allowed by CORS
```

---

## ✅ Solución: Configurar CORS en el Backend

### Opción 1: Usando `cors` (Express.js) - RECOMENDADO

Si tu backend usa Express.js, instala y configura el paquete `cors`:

#### 1. Instalar `cors`:

```bash
npm install cors
```

#### 2. Configurar en el archivo principal del servidor (ej: `server.js`, `app.js`, `index.js`):

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:8081',           // Expo web local
      'http://localhost:19006',          // Expo web alternativo
      'http://localhost:3000',           // Desarrollo local
      'https://conalep-control-app.web.app',  // Firebase Hosting (ejemplo)
      'https://conalep-control-app.netlify.app', // Netlify (ejemplo)
      'https://conalep-control-app.vercel.app',  // Vercel (ejemplo)
      // Agrega aquí tu dominio de producción cuando lo tengas
    ];

    // Permitir solicitudes sin origen (Postman, apps móviles, etc.)
    if (!origin) return callback(null, true);

    // Verificar si el origen está permitido
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, puedes permitir todos los orígenes (NO recomendado para producción)
      // callback(null, true);
      
      // En producción, rechazar orígenes no permitidos
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Permitir cookies/credenciales
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight por 24 horas
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// O si prefieres aplicarlo solo a rutas específicas:
// app.use('/api', cors(corsOptions));

// Resto de tu configuración...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tus rutas...
app.use('/api', routes);

// ...
```

#### 3. Configuración más simple (para desarrollo):

Si estás en desarrollo y quieres permitir todos los orígenes temporalmente:

```javascript
const cors = require('cors');

// Permitir todos los orígenes (SOLO PARA DESARROLLO)
app.use(cors({
  origin: '*',
  credentials: false
}));
```

**⚠️ ADVERTENCIA:** `origin: '*'` es inseguro para producción. Úsalo solo en desarrollo.

---

### Opción 2: Configuración Manual de Headers CORS

Si prefieres no usar el paquete `cors`, puedes configurar los headers manualmente:

```javascript
const express = require('express');
const app = express();

// Middleware para CORS
app.use((req, res, next) => {
  // Lista de orígenes permitidos
  const allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'https://conalep-control-app.web.app',
    'https://conalep-control-app.netlify.app',
    'https://conalep-control-app.vercel.app',
    // Agrega tu dominio de producción aquí
  ];

  const origin = req.headers.origin;
  
  // Si el origen está en la lista, permitirlo
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // Headers permitidos
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Manejar preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Resto de tu configuración...
```

---

### Opción 3: Usando Variables de Entorno

Para mayor flexibilidad, puedes usar variables de entorno:

#### 1. Crear archivo `.env`:

```env
# Orígenes permitidos (separados por comas)
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000,https://conalep-control-app.web.app
```

#### 2. Configurar en el servidor:

```javascript
require('dotenv').config();
const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:8081',
  'http://localhost:19006'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

## 🔧 Configuración Específica para Render.com

Si tu backend está en Render.com, asegúrate de:

1. **Configurar variables de entorno en Render:**
   - Ve a tu servicio en Render Dashboard
   - Settings → Environment Variables
   - Agrega `ALLOWED_ORIGINS` con tus dominios permitidos

2. **Verificar que el puerto esté correcto:**
   - Render asigna un puerto dinámico
   - Usa `process.env.PORT` en tu código

3. **Verificar que CORS esté configurado ANTES de las rutas:**
   ```javascript
   // ✅ CORRECTO: CORS antes de las rutas
   app.use(cors(corsOptions));
   app.use('/api', routes);
   
   // ❌ INCORRECTO: CORS después de las rutas
   app.use('/api', routes);
   app.use(cors(corsOptions));
   ```

---

## 🧪 Probar CORS

### 1. Desde el navegador (DevTools):

Abre la consola del navegador y ejecuta:

```javascript
fetch('https://conalep-backend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password'
  })
})
.then(res => res.json())
.then(data => console.log('✅ CORS funciona:', data))
.catch(err => console.error('❌ Error CORS:', err));
```

### 2. Verificar headers en la respuesta:

En DevTools → Network → Selecciona una petición → Headers → Response Headers

Debes ver:
```
Access-Control-Allow-Origin: http://localhost:8081
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 📋 Checklist

- [ ] Instalar `cors`: `npm install cors`
- [ ] Configurar CORS en el servidor (antes de las rutas)
- [ ] Agregar orígenes permitidos (localhost para desarrollo, dominio de producción)
- [ ] Configurar `credentials: true` si usas cookies/tokens
- [ ] Probar desde el navegador web
- [ ] Verificar que las solicitudes OPTIONS (preflight) funcionen
- [ ] (Opcional) Configurar variables de entorno para orígenes

---

## 🆘 Solución de Problemas

### Error: "Not allowed by CORS" persiste

1. **Verifica que CORS esté configurado ANTES de las rutas:**
   ```javascript
   app.use(cors(corsOptions)); // ✅ Debe ir primero
   app.use('/api', routes);
   ```

2. **Verifica que el origen esté en la lista permitida:**
   - Abre DevTools → Network → Headers
   - Revisa el header `Origin` en la petición
   - Asegúrate de que ese origen esté en `allowedOrigins`

3. **Verifica que el método HTTP esté permitido:**
   - Los métodos permitidos deben incluir: GET, POST, PUT, DELETE, PATCH, OPTIONS

4. **Limpia la caché del navegador:**
   - Los preflight requests se cachean
   - Prueba en modo incógnito

### Error: "Credentials flag is true, but Access-Control-Allow-Credentials is not 'true'"

- Asegúrate de que `credentials: true` esté configurado en CORS
- Y que `Access-Control-Allow-Origin` NO sea `*` (debe ser un origen específico)

### Las solicitudes desde móvil funcionan pero web no

- Esto es normal: las apps móviles no tienen restricciones CORS
- Solo los navegadores web aplican CORS
- Configura CORS específicamente para web

---

## 📝 Ejemplo Completo (Express.js)

```javascript
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3000',
      process.env.WEB_URL, // Variable de entorno para producción
    ].filter(Boolean); // Eliminar valores undefined

    // Permitir solicitudes sin origen (móviles, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origen no permitido: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/salas', require('./routes/salas'));
// ... más rutas

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
```

---

## ✅ Después de Configurar

1. **Reinicia el servidor** en Render.com
2. **Prueba desde el navegador web** (no desde móvil)
3. **Verifica en DevTools** que los headers CORS estén presentes
4. **Intenta iniciar sesión** desde la aplicación web

---

## 📚 Recursos

- [Documentación de cors (npm)](https://www.npmjs.com/package/cors)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express.js CORS Guide](https://expressjs.com/en/resources/middleware/cors.html)

---

**Nota:** Una vez configurado CORS, la aplicación web debería funcionar correctamente. Si el error persiste, verifica que el backend se haya reiniciado y que los orígenes estén correctamente configurados.
