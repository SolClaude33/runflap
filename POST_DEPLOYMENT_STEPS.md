# 🚀 Pasos Después de Deployar el Contrato

## ✅ Checklist Post-Deploy

### 1. Obtener Información del Contrato

#### a) Dirección del Contrato
1. En Remix, ve a **"Deploy & Run Transactions"**
2. Busca tu contrato en **"Deployed Contracts"**
3. Copia la dirección (ejemplo: `0x1234567890abcdef1234567890abcdef12345678`)
4. **Guarda esta dirección** - la necesitarás para Vercel

#### b) ABI del Contrato (Opcional)
- El frontend ya tiene un ABI básico que debería funcionar
- Si necesitas funciones adicionales, copia el ABI completo de Remix:
  1. Ve a **"Solidity Compiler"**
  2. Click en **"ABI"**
  3. Copia el JSON completo

---

### 2. Configurar Variables de Entorno en Vercel

#### Variables OBLIGATORIAS:

1. **NEXT_PUBLIC_CONTRACT_ADDRESS**
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xTuDireccionDelContrato
   ```
   - Pega la dirección que copiaste de Remix

2. **NEXT_PUBLIC_NETWORK**
   ```
   NEXT_PUBLIC_NETWORK=testnet
   ```
   - Usa `testnet` si deployaste en BSC Testnet
   - Usa `mainnet` si deployaste en BSC Mainnet

3. **Firebase Configuration** (si usas chat/perfiles)
   ```
   NEXT_PUBLIC_APIKEY=tu_api_key
   NEXT_PUBLIC_AUTHDOMAIN=tu_proyecto.firebaseapp.com
   NEXT_PUBLIC_DATABASEURL=https://tu-proyecto-default-rtdb.firebaseio.com
   NEXT_PUBLIC_PROJECTID=tu_proyecto_id
   NEXT_PUBLIC_STORAGEBUCKET=tu_proyecto.appspot.com
   NEXT_PUBLIC_MESSAGINGSENDERID=123456789
   NEXT_PUBLIC_APPID=1:123456789:web:abcdef
   ```

#### Variables OPCIONALES (Para finalizar carreras automáticamente):

4. **OWNER_PRIVATE_KEY**
   ```
   OWNER_PRIVATE_KEY=0xTuClavePrivadaDelOwner
   ```
   - Clave privada de la wallet que deployó el contrato
   - ⚠️ **NUNCA** compartas esta clave

5. **API_KEY**
   ```
   API_KEY=tu_api_key_secreta_12345
   ```
   - Clave secreta para proteger el endpoint `/api/race/finalize`
   - Puedes generar una aleatoria (ej: `openssl rand -hex 32`)

---

### 3. Cómo Agregar Variables en Vercel

1. Ve a tu proyecto en [Vercel](https://vercel.com)
2. Click en **Settings** (Configuración)
3. Click en **Environment Variables** (Variables de Entorno)
4. Para cada variable:
   - Click en **Add New**
   - Ingresa el **Name** (nombre de la variable)
   - Ingresa el **Value** (valor)
   - Selecciona los ambientes: ✅ Production, ✅ Preview, ✅ Development
   - Click en **Save**
5. Repite para todas las variables

---

### 4. Redeploy en Vercel

Después de agregar las variables:

1. Ve a **Deployments**
2. Click en los **3 puntos** (⋯) del último deployment
3. Click en **Redeploy**
4. O simplemente espera - Vercel puede hacer redeploy automático

---

### 5. Verificar que Funciona

#### a) Verificar Conexión del Contrato
1. Abre tu app en Vercel
2. Conecta tu wallet (MetaMask)
3. Asegúrate de estar en la red correcta (BSC Testnet o Mainnet)
4. Ve a la página de carrera (`/race`)
5. Deberías ver:
   - Información de la carrera actual
   - Botones para apostar
   - Pool total

#### b) Probar una Apuesta (Testnet)
1. Asegúrate de tener BNB de testnet en tu wallet
2. Selecciona un auto (1-4)
3. Selecciona un monto (0.01, 0.05, 0.1, o 0.5 BNB)
4. Click en **Place Bet**
5. Confirma en MetaMask
6. Espera la confirmación

#### c) Verificar en BSCScan
1. Ve a [BSCScan Testnet](https://testnet.bscscan.com/) o [BSCScan Mainnet](https://bscscan.com/)
2. Busca la dirección de tu contrato
3. Deberías ver las transacciones de apuestas

---

### 6. Verificar el Contrato en BSCScan (Opcional pero Recomendado)

1. Ve a BSCScan (Testnet o Mainnet según corresponda)
2. Busca la dirección de tu contrato
3. Click en **"Contract"** → **"Verify and Publish"**
4. Completa:
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: 0.8.20
   - **License**: MIT
   - Pega el código completo del contrato
5. Click en **"Verify and Publish"**

Esto permite que otros vean el código fuente del contrato y aumenta la confianza.

---

### 7. Configurar Finalización Automática de Carreras

Si quieres que las carreras se finalicen automáticamente:

1. Asegúrate de tener `OWNER_PRIVATE_KEY` y `API_KEY` en Vercel
2. El frontend automáticamente llamará a `/api/race/finalize` cuando termine una carrera
3. El endpoint verificará que la carrera realmente terminó antes de finalizarla

---

## 🐛 Troubleshooting

### "Contract address not configured"
- Verifica que `NEXT_PUBLIC_CONTRACT_ADDRESS` esté en Vercel
- Asegúrate de hacer redeploy después de agregar la variable

### "Invalid network"
- Verifica que `NEXT_PUBLIC_NETWORK` sea `testnet` o `mainnet`
- Asegúrate de estar conectado a la red correcta en MetaMask

### "Transaction failed"
- Verifica que tengas suficiente BNB para gas fees
- Verifica que estés en la red correcta (BSC Testnet/Mainnet)
- Verifica que el monto de apuesta sea uno de los válidos (0.01, 0.05, 0.1, 0.5 BNB)

### No se conecta a BNB
- Verifica que MetaMask esté instalado
- Verifica que estés en la red correcta
- Verifica que `NEXT_PUBLIC_CONTRACT_ADDRESS` sea correcta

---

## ✅ Checklist Final

- [ ] Dirección del contrato copiada de Remix
- [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS` configurada en Vercel
- [ ] `NEXT_PUBLIC_NETWORK` configurada en Vercel
- [ ] Variables de Firebase configuradas (si usas chat)
- [ ] `OWNER_PRIVATE_KEY` y `API_KEY` configuradas (opcional)
- [ ] Redeploy hecho en Vercel
- [ ] App funciona y se conecta al contrato
- [ ] Prueba de apuesta exitosa (en testnet)
- [ ] Contrato verificado en BSCScan (opcional)

---

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando. Los usuarios pueden:
- Conectar sus wallets
- Ver carreras en tiempo real
- Apostar en las carreras
- Reclamar ganancias

Si tienes problemas, revisa la consola del navegador y los logs de Vercel.
