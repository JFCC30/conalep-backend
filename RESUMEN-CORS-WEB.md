# Resumen Rápido: CORS para Web

## 🔴 Problema
Error: **"Not allowed by CORS"** cuando se accede desde navegador web.

## ✅ Solución Rápida

### 1. Instalar `cors`:
```bash
npm install cors
```

### 2. Configurar en el servidor (ANTES de las rutas):

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:8081',      // Expo web local
    'http://localhost:19006',     // Expo web alternativo
    'http://localhost:3000',       // Desarrollo local
    // Agrega tu dominio de producción aquí
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Para desarrollo rápido (permitir todos):
```javascript
app.use(cors({ origin: '*' })); // ⚠️ SOLO DESARROLLO
```

### 4. Reiniciar el servidor en Render.com

---

## 📋 Orden Correcto en el Código

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// ✅ CORS PRIMERO
app.use(cors(corsOptions));

// ✅ Luego el resto
app.use(express.json());
app.use('/api', routes);
```

---

## 🧪 Probar

Abre la consola del navegador y ejecuta:
```javascript
fetch('https://conalep-backend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test', password: 'test' })
})
.then(r => r.json())
.then(d => console.log('✅ Funciona:', d))
.catch(e => console.error('❌ Error:', e));
```

---

Ver `INSTRUCCIONES-CORS-WEB.md` para más detalles.
