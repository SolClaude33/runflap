# Variables de Entorno para Vercel - FlapRace

## 📋 Cómo Agregar Variables en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Settings** (Configuración)
3. Click en **Environment Variables** (Variables de Entorno)
4. Agrega cada variable una por una
5. Selecciona los ambientes: **Production**, **Preview**, y **Development**
6. Click en **Save**

---

## 🔴 Variables OBLIGATORIAS (Mínimas para que funcione)

### 1. Network Configuration
```
NEXT_PUBLIC_NETWORK=testnet
```
- **Valor**: `testnet` o `mainnet`
- **Descripción**: Red de BNB a usar
- **Recomendación**: Empieza con `testnet` para pruebas

### 2. Firebase Configuration (OBLIGATORIO para chat y datos)
```
NEXT_PUBLIC_APIKEY=tu_api_key_de_firebase
NEXT_PUBLIC_AUTHDOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_DATABASEURL=https://tu-proyecto-default-rtdb.firebaseio.com
NEXT_PUBLIC_PROJECTID=tu_proyecto_id
NEXT_PUBLIC_STORAGEBUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_MESSAGINGSENDERID=123456789
NEXT_PUBLIC_APPID=1:123456789:web:abcdef
```

**Cómo obtenerlas:**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Click en el ícono de ⚙️ (Settings) > **Project settings**
4. Scroll down a **Your apps** > Selecciona tu app web
5. Copia todos los valores del objeto `firebaseConfig`

---

## 🟡 Variables OPCIONALES (Para funcionalidad completa)

### 3. Contract Address (Después de deployar el contrato)
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```
- **Valor**: Dirección del contrato desplegado en BSC
- **Cuándo**: Después de deployar el contrato en Remix
- **Por ahora**: Puedes dejarlo vacío, pero la app no podrá hacer apuestas

### 4. Backend Secrets (Solo si usas el endpoint de finalizar carreras)
```
OWNER_PRIVATE_KEY=0x...
API_KEY=tu_api_key_secreta
```
- **OWNER_PRIVATE_KEY**: Clave privada de la wallet owner del contrato
- **API_KEY**: Clave secreta para autenticar peticiones al endpoint `/api/race/finalize`
- **⚠️ IMPORTANTE**: NUNCA compartas estas claves. Solo agrégalas en Vercel.

### 5. Secrets Opcionales (Para endpoints legacy)
```
ADMIN_SECRET=tu_secret_admin
CRON_SECRET=tu_secret_cron
HELIUS_WEBHOOK_SECRET=tu_webhook_secret
```
- Solo necesarios si usas endpoints específicos
- Puedes generarlos aleatoriamente (ej: `openssl rand -hex 32`)

---

## 📝 Ejemplo Completo (Mínimo para empezar)

### Variables Mínimas Necesarias:
```
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_APIKEY=AIzaSy...
NEXT_PUBLIC_AUTHDOMAIN=flaprace.firebaseapp.com
NEXT_PUBLIC_DATABASEURL=https://flaprace-default-rtdb.firebaseio.com
NEXT_PUBLIC_PROJECTID=flaprace-12345
NEXT_PUBLIC_STORAGEBUCKET=flaprace-12345.appspot.com
NEXT_PUBLIC_MESSAGINGSENDERID=123456789012
NEXT_PUBLIC_APPID=1:123456789012:web:abcdef123456
```

### Variables Adicionales (Cuando tengas el contrato):
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
OWNER_PRIVATE_KEY=0x...
API_KEY=mi_api_key_secreta_12345
```

---

## ✅ Checklist

Antes de hacer deploy, asegúrate de tener:

- [ ] `NEXT_PUBLIC_NETWORK` configurado
- [ ] Todas las variables de Firebase configuradas
- [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS` (después de deployar contrato)
- [ ] `OWNER_PRIVATE_KEY` y `API_KEY` (si usas backend para finalizar carreras)

---

## 🔄 Después de Agregar Variables

1. **Redeploy**: Vercel automáticamente hará un nuevo deploy
2. O manualmente: Ve a **Deployments** > Click en los 3 puntos > **Redeploy**

---

## 🆘 Troubleshooting

### La app no se conecta a BNB
- Verifica que `NEXT_PUBLIC_NETWORK` esté correcto
- Verifica que `NEXT_PUBLIC_CONTRACT_ADDRESS` sea la dirección correcta

### Firebase no funciona
- Verifica que todas las variables de Firebase estén correctas
- Revisa las reglas de Firestore en Firebase Console

### Errores de autenticación
- Verifica que `API_KEY` y `OWNER_PRIVATE_KEY` estén correctos
- Asegúrate de que no tengan espacios extra

---

## 📚 Recursos

- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)
