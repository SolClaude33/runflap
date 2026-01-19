# ✅ LISTA DE VERIFICACIÓN PARA DEPLOYMENT

## Estado Actual del Problema

Estás viendo estos errores:
- `[Race 1] ⚠️ WARNING: Contract seed not ready for race 1 (seed: 0, generated: false)`
- `MetaMask - RPC Error: Internal JSON-RPC error`
- `Winner mismatch!`

## ¿Por qué pasa esto?

El seed NO se está generando automáticamente porque:
1. El cron job NO se ejecuta en preview/development, **SOLO en producción**
2. O las variables de entorno no están configuradas correctamente

## PASOS PARA SOLUCIONAR

### 1. Verificar Variables de Entorno en Vercel

Ve a tu dashboard de Vercel:
https://vercel.com/tu-proyecto/settings/environment-variables

Debes tener estas variables configuradas para **PRODUCTION**:

```
NEXT_PUBLIC_FLAPRACE_ADDRESS = 0xTU_DIRECCION_CONTRATO
NEXT_PUBLIC_RPC_URL = https://bsc-testnet.public.blastapi.io
OWNER_PRIVATE_KEY = tu_private_key_sin_0x
```

**IMPORTANTE**: 
- `NEXT_PUBLIC_FLAPRACE_ADDRESS` debe ser la dirección del **contrato recién desplegado**
- `OWNER_PRIVATE_KEY` debe ser la clave privada de la wallet que desplegó el contrato

### 2. Re-Deploy a Producción

Después de verificar las variables, vuelve a hacer deploy:

```bash
git add .
git commit -m "Verify cron job configuration"
git push origin main
```

### 3. Verificar que el Cron Job está Activo

1. Ve al dashboard de Vercel
2. Click en tu proyecto
3. Ve a "Settings" → "Cron Jobs"
4. Deberías ver:
   ```
   Path: /api/race/generate-seed
   Schedule: */1 * * * * (Every minute)
   Status: Active
   ```

### 4. Verificar que el Contrato está Actualizado

**CRÍTICO**: Necesitas asegurarte de que el contrato desplegado tiene el código más reciente.

El contrato debe tener la versión actualizada de `_generateRaceSeedInternal` que NO usa `blockhash` y es 100% determinístico.

**¿Desplegaste el contrato actualizado?**

Si NO has desplegado el contrato con los últimos cambios, necesitas:

1. Abrir Remix IDE: https://remix.ethereum.org/
2. Cargar el archivo `contracts/FlapRace.sol`
3. Compilar con Solidity 0.8.20
4. Conectar MetaMask a BSC Testnet
5. Desplegar el contrato
6. Copiar la nueva dirección del contrato
7. Actualizar `NEXT_PUBLIC_FLAPRACE_ADDRESS` en Vercel con la nueva dirección
8. Re-deploy

### 5. Prueba Manual del Cron Job

Una vez desplegado en producción, puedes probar manualmente el cron job:

```bash
curl https://tu-dominio.vercel.app/api/race/generate-seed
```

Deberías ver una respuesta como:
```json
{
  "success": true,
  "raceId": "1",
  "message": "No seed generation needed: race not started"
}
```

O si hay una carrera activa:
```json
{
  "success": true,
  "raceId": "1",
  "txHash": "0x...",
  "message": "Seed generated for race 1"
}
```

### 6. Verificar Logs en Vercel

1. Ve a Vercel Dashboard → Tu proyecto → "Logs"
2. Filtra por "Cron Jobs"
3. Deberías ver logs cada minuto con `[CRON] Checking if seed generation is needed...`

## Flujo Correcto

Una vez todo configurado:

1. **Usuario apuesta** → La carrera se inicializa con `startTime` y `bettingEndTime`
2. **Después de 2 minutos** (fin del betting period)
3. **El cron job detecta automáticamente** que terminó el betting period
4. **El cron job llama a `generateRaceSeed()`** desde el backend (con la wallet del owner)
5. **El seed se genera en el contrato** de forma determinística
6. **Todos los clientes leen el mismo seed** del contrato
7. **La carrera se simula igual para todos** = mismo ganador

## ¿Cómo saber si está funcionando?

Cuando todo esté bien, en la consola del navegador deberías ver:

```
[Race 1] ✅ Using contract seed: 123456789012345678
```

En lugar de:

```
[Race 1] ⚠️ WARNING: Contract seed not ready for race 1 (seed: 0, generated: false)
```

## Resumen Rápido

✅ Verificar variables de entorno en Vercel (PRODUCTION)
✅ Re-deploy a producción (main branch)
✅ Verificar cron job activo en Vercel
✅ Verificar que el contrato está actualizado (desplegado con Remix)
✅ Probar manualmente el endpoint del cron job
✅ Ver logs en Vercel

---

**NOTA IMPORTANTE**: Los cron jobs de Vercel SOLO funcionan en producción. Si estás probando en `localhost` o en un deployment de preview, el cron job NO se ejecutará.

---

## Troubleshooting

Si Vercel no detecta los cambios automáticamente:
1. Ve a Settings → Git → Reconnect repository
2. O fuerza un nuevo commit y push
