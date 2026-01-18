# Guía de Deployment - FlapRace

## 🚀 Opciones de Hosting

### 1. Vercel (Recomendado) ⭐

**Ventajas:**
- ✅ Gratis para proyectos personales
- ✅ Deploy automático desde GitHub
- ✅ SSL gratuito
- ✅ CDN global
- ✅ Optimizado para Next.js
- ✅ Variables de entorno fáciles de configurar
- ✅ Preview deployments para cada PR

**Pasos:**

1. **Crear cuenta en Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con GitHub

2. **Conectar repositorio**
   - Click en "Add New Project"
   - Selecciona tu repositorio `flaprace`
   - Vercel detectará automáticamente Next.js

3. **Configurar variables de entorno**
   - En "Environment Variables", agrega:
     ```
     NEXT_PUBLIC_NETWORK=testnet
     NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
     NEXT_PUBLIC_APIKEY=...
     NEXT_PUBLIC_AUTHDOMAIN=...
     NEXT_PUBLIC_DATABASEURL=...
     NEXT_PUBLIC_PROJECTID=...
     NEXT_PUBLIC_STORAGEBUCKET=...
     NEXT_PUBLIC_MESSAGINGSENDERID=...
     NEXT_PUBLIC_APPID=...
     OWNER_PRIVATE_KEY=0x... (solo producción)
     API_KEY=... (solo producción)
     ```

4. **Deploy**
   - Click en "Deploy"
   - Espera a que termine el build
   - Tu app estará en `https://flaprace.vercel.app`

### 2. Netlify

**Ventajas:**
- ✅ Gratis
- ✅ Deploy desde GitHub
- ✅ SSL gratuito
- ✅ Formularios y funciones serverless

**Pasos:**

1. Ve a [netlify.com](https://netlify.com)
2. Conecta tu repositorio de GitHub
3. Configuración:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Agrega variables de entorno en Site settings
5. Deploy

### 3. Railway

**Ventajas:**
- ✅ Fácil de usar
- ✅ Soporte para bases de datos
- ✅ $5 de crédito gratis al mes

**Pasos:**

1. Ve a [railway.app](https://railway.app)
2. "New Project" > "Deploy from GitHub repo"
3. Selecciona tu repositorio
4. Railway detectará Next.js automáticamente
5. Agrega variables de entorno
6. Deploy

### 4. Render

**Ventajas:**
- ✅ Gratis (con limitaciones)
- ✅ Auto-deploy desde GitHub
- ✅ SSL gratuito

**Pasos:**

1. Ve a [render.com](https://render.com)
2. "New" > "Web Service"
3. Conecta tu repositorio
4. Configuración:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Agrega variables de entorno
6. Deploy

## 📋 Checklist Pre-Deployment

Antes de hacer deploy, asegúrate de:

- [ ] Contrato desplegado en BSC (testnet o mainnet)
- [ ] Dirección del contrato actualizada en variables de entorno
- [ ] Firebase configurado y credenciales agregadas
- [ ] Variables de entorno configuradas en la plataforma
- [ ] `.env.local` NO está en el repositorio (verificado en `.gitignore`)
- [ ] `OWNER_PRIVATE_KEY` solo en variables de entorno de producción
- [ ] Backend configurado para finalizar carreras
- [ ] Dominio personalizado configurado (opcional)

## 🔐 Variables de Entorno Requeridas

### Públicas (NEXT_PUBLIC_*)
Estas se exponen al cliente:

- `NEXT_PUBLIC_NETWORK` - testnet o mainnet
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - Dirección del contrato
- `NEXT_PUBLIC_APIKEY` - Firebase API Key
- `NEXT_PUBLIC_AUTHDOMAIN` - Firebase Auth Domain
- `NEXT_PUBLIC_DATABASEURL` - Firebase Database URL
- `NEXT_PUBLIC_PROJECTID` - Firebase Project ID
- `NEXT_PUBLIC_STORAGEBUCKET` - Firebase Storage Bucket
- `NEXT_PUBLIC_MESSAGINGSENDERID` - Firebase Messaging Sender ID
- `NEXT_PUBLIC_APPID` - Firebase App ID

### Privadas (Solo Backend)
Estas NO se exponen al cliente:

- `OWNER_PRIVATE_KEY` - Clave privada del owner del contrato
- `API_KEY` - API key para autenticar finalización de carreras

## 🐛 Troubleshooting

### Build Falla

1. **Error de TypeScript**
   ```bash
   npm run build
   ```
   Revisa los errores y corrígelos

2. **Error de dependencias**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Error de variables de entorno**
   - Verifica que todas las variables estén configuradas
   - Asegúrate de que `NEXT_PUBLIC_*` estén en mayúsculas

### La app no se conecta a BSC

1. Verifica que `NEXT_PUBLIC_NETWORK` esté correcto
2. Verifica que `NEXT_PUBLIC_CONTRACT_ADDRESS` sea la dirección correcta
3. Asegúrate de estar en la red correcta en MetaMask

### Errores de Firebase

1. Verifica que todas las credenciales de Firebase estén correctas
2. Revisa las reglas de Firestore
3. Verifica que el proyecto de Firebase esté activo

## 🔄 Actualizaciones

Después de hacer cambios:

1. **Push a GitHub**
   ```bash
   git add .
   git commit -m "Descripción de cambios"
   git push
   ```

2. **Deploy automático**
   - Vercel/Netlify/Railway detectarán los cambios
   - Harán deploy automáticamente

3. **Verificar**
   - Revisa los logs de deployment
   - Prueba la aplicación en producción

## 📞 Soporte

Si tienes problemas con el deployment, revisa:
- Logs de la plataforma de hosting
- Console del navegador
- Network tab para errores de API

---

**Recomendación Final**: Usa **Vercel** para la mejor experiencia con Next.js. Es gratis, fácil de usar, y está optimizado específicamente para Next.js.
