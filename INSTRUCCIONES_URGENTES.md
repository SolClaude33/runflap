# 🚨 INSTRUCCIONES URGENTES - PROBLEMA DE SEED NO GENERADO

## 🔴 PROBLEMA ACTUAL

El seed de las carreras NO se está generando automáticamente, causando que:
- Los clientes vean "Using fallback seed: 123456"
- Los ganadores no coincidan entre diferentes usuarios
- Aparezcan errores de MetaMask intentando generar el seed

## ✅ SOLUCIÓN IMPLEMENTADA

Hemos implementado una solución de 3 capas:

1. **Seed 100% Determinístico**: El contrato ahora genera el seed basado ÚNICAMENTE en datos inmutables (raceId, timestamps, totalBets, totalPool, dirección del contrato)
2. **Generación Automática en Apuesta**: Cuando alguien apuesta en la carrera N+1, el contrato genera automáticamente el seed de la carrera N
3. **Cron Job de Backup**: Un endpoint de API (`/api/race/generate-seed`) que Vercel ejecuta cada minuto para garantizar que el seed se genere incluso si nadie apuesta

## 🔧 PASOS PARA RESOLVER EL PROBLEMA

### PASO 1: Subir los cambios a GitHub ✅ (YA HECHO)

Los cambios ya están en GitHub con el comando:
```bash
git push origin main
```

### PASO 2: Actualizar la dirección del contrato en Vercel

**IMPORTANTE**: El contrato nuevo está en:
```
0x7d8B82E0B9905F8148A9a4b8a16617fF2C30afdC
```

Necesitas actualizar estas variables de entorno en Vercel:

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Click en **Settings** → **Environment Variables**
4. Actualiza TODAS las siguientes variables (o crea las que falten):

```
NEXT_PUBLIC_FLAPRACE_ADDRESS=0x7d8B82E0B9905F8148A9a4b8a16617fF2C30afdC
NEXT_PUBLIC_RPC_URL=https://bsc-testnet.public.blastapi.io
OWNER_PRIVATE_KEY=(tu clave privada del owner)
API_KEY=(una clave secreta que tú elijas, por ejemplo: secret123)
NEXT_PUBLIC_NETWORK=testnet
```

5. **IMPORTANTE**: Después de actualizar las variables, debes hacer un **REDEPLOY** del proyecto:
   - Ve a **Deployments** (en la parte superior)
   - En el último deployment, click en los **3 puntos** → **"Redeploy"**
   - Confirma y espera 1-2 minutos

### PASO 3: Verificar que el Cron Job está activo

1. En la configuración de tu proyecto de Vercel, ve a **Settings** → **Cron Jobs**
2. Deberías ver un cron job que llama a `/api/race/generate-seed` cada minuto
3. Si no lo ves, el archivo `vercel.json` ya tiene la configuración correcta, solo asegúrate de hacer el redeploy

### PASO 4: Probar el nuevo contrato

Después del redeploy:

1. Abre tu sitio en el navegador
2. Abre la consola del navegador (F12 → Console)
3. **Haz una apuesta** para inicializar la carrera
4. Después de que termine el período de apuestas (2 minutos), deberías ver en los logs:
   - ✅ `[Race X] Using contract seed: [número grande]`
   - ❌ NO debería decir "Using fallback seed: 123456"
   - ❌ NO debería pedir transacciones de MetaMask para generar el seed

## 🔍 CÓMO VERIFICAR QUE FUNCIONA

### En el navegador (Consola):
```
[Race 1] Using contract seed: 87624529534095...
[Race 1] ✅ Winner detected: Car 3
```

### Lo que NO deberías ver:
```
❌ [Race 1] Using fallback seed: 123456
❌ [Race 1] Seed not generated, attempting to generate...
❌ MetaMask pop-ups pidiendo transacciones
```

## 📊 DETALLES TÉCNICOS

### ¿Cómo funciona ahora el seed?

1. **Al apostar en Race N+1**: El contrato intenta generar el seed para Race N (si no está generado)
2. **Cada minuto (Cron Job)**: Vercel llama a `/api/race/generate-seed` que verifica si el período de apuestas terminó y genera el seed automáticamente
3. **Al finalizar**: Si por alguna razón el seed no se generó, el endpoint `/api/race/finalize` también intenta generarlo antes de finalizar

### ¿Por qué es determinístico ahora?

El seed se calcula con:
```solidity
keccak256(abi.encodePacked(
    raceId,
    bettingEndTime,
    startTime,
    totalBets,
    totalPool,
    address(this)
))
```

Todos estos valores son **inmutables** una vez que comienza la carrera, por lo que el seed será **idéntico** sin importar cuándo o quién lo calcule.

## ⚠️ IMPORTANTE

**NO puedes usar el contrato antiguo**. Debes usar el nuevo contrato desplegado:
`0x7d8B82E0B9905F8148A9a4b8a16617fF2C30afdC`

Los contratos en blockchain son **inmutables**. No se pueden modificar después de desplegarlos. Por eso tuvimos que desplegar un nuevo contrato con las correcciones.

## 🆘 SI SIGUE SIN FUNCIONAR

1. Verifica en Vercel → Settings → Environment Variables que `NEXT_PUBLIC_FLAPRACE_ADDRESS` tiene el valor correcto
2. Verifica que hiciste el **Redeploy** después de cambiar las variables
3. Limpia la caché del navegador (Ctrl+Shift+Delete) y recarga
4. Verifica en la consola del navegador que no hay errores de conexión al RPC
5. Si ves "Contract address not configured", significa que las variables de entorno no se aplicaron - haz otro redeploy

## 📝 ARCHIVOS MODIFICADOS

- `contracts/FlapRace.sol` - Seed 100% determinístico + generación en placeBet
- `src/app/api/race/finalize/route.ts` - Genera seed antes de finalizar
- `src/app/api/race/generate-seed/route.ts` - Cron job para generar seed automáticamente
- `vercel.json` - Configuración del cron job (cada minuto)

---

**Última actualización**: 2026-01-19
**Contrato desplegado**: 0x7d8B82E0B9905F8148A9a4b8a16617fF2C30afdC
