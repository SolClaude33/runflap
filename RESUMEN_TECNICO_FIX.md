# 🔧 Resumen Técnico - Problema de Sincronización de Seed

## 📋 Problema Original

**Síntoma**: Diferentes clientes veían diferentes ganadores en la misma carrera.

**Causa Raíz**: El seed de la carrera se generaba de forma **no determinística** usando:
- `block.timestamp` (diferente según cuándo cada cliente llamaba)
- `block.number` (diferente según el bloque en que se ejecutaba la transacción)
- `blockhash(block.number - 1)` (diferente según el bloque de referencia)

Esto significaba que:
- Cliente A genera seed en el bloque 12345 → seed = 87362847...
- Cliente B genera seed en el bloque 12346 → seed = 92847362...
- Resultado: **Ganadores diferentes**

## ✅ Solución Implementada

### 1. Seed 100% Determinístico

El nuevo algoritmo de seed SOLO usa datos **inmutables** una vez que comienza la carrera:

```solidity
race.raceSeed = uint256(keccak256(abi.encodePacked(
    raceId,              // Nunca cambia para esta carrera
    race.bettingEndTime, // Fijado al iniciar la carrera
    race.startTime,      // Fijado al iniciar la carrera
    totalBets,           // Fijado al cerrar las apuestas
    race.totalPool,      // Fijado al cerrar las apuestas
    address(this)        // Dirección del contrato (nunca cambia)
)));
```

**Resultado**: No importa quién o cuándo genere el seed, siempre será el mismo.

### 2. Generación Automática en placeBet

```solidity
function placeBet(uint8 racer) external payable nonReentrant {
    // ... lógica de apuestas ...
    
    // Si es la primera apuesta de la Race N+1, generar seed de Race N
    if (getCurrentRaceId() > 0) {
        uint256 previousRaceId = getCurrentRaceId() - 1;
        Race storage previousRace = races[previousRaceId];
        
        if (!previousRace.seedGenerated && 
            block.timestamp >= previousRace.bettingEndTime) {
            _generateRaceSeedInternal(previousRaceId);
        }
    }
}
```

**Resultado**: El seed se genera automáticamente cuando alguien apuesta en la siguiente carrera.

### 3. Cron Job de Backup (Vercel)

Endpoint: `/api/race/generate-seed`
Frecuencia: Cada 1 minuto
Función: Verifica si el período de apuestas terminó y genera el seed automáticamente.

```typescript
// Simplificado
const currentRaceId = await contract.getCurrentRaceId();
const raceInfo = await contract.getRaceInfo(currentRaceId);
const now = Math.floor(Date.now() / 1000);

if (now >= bettingEndTime && !seedGenerated && startTime > 0) {
  await contract.generateRaceSeed(currentRaceId);
}
```

**Resultado**: Garantiza que el seed se genere incluso si nadie apuesta en la siguiente carrera.

## 🔄 Flujo Completo

```
1. Usuario apuesta en Race 1
   └─> Race 1 se inicializa (startTime, bettingEndTime)
   
2. Período de apuestas termina (2 min)
   └─> Cron job detecta y genera seed para Race 1
   
3. Race 1 comienza (5 seg después)
   └─> Todos los clientes leen el MISMO seed del contrato
   └─> Todos calculan el MISMO ganador
   
4. Race 1 termina
   └─> Ganador es detectado por todos los clientes
   └─> Frontend envía finalización al backend
   └─> Backend finaliza Race 1 en el contrato
   
5. Usuario apuesta en Race 2
   └─> El contrato genera automáticamente el seed para Race 1 (por si acaso)
   └─> El ciclo se repite
```

## 🔧 Archivos Modificados

### Contrato (contracts/FlapRace.sol)
- `_generateRaceSeedInternal()`: Seed 100% determinístico
- `placeBet()`: Genera seed de carrera anterior al apostar
- Validaciones adicionales para evitar errores

### Frontend (src/app/race/page.tsx)
- `fetchRaceData()`: Solo LEE el seed (no intenta generarlo)
- Removed client-side seed generation
- Eliminados pop-ups de MetaMask para generación

### Backend APIs
- `src/app/api/race/finalize/route.ts`: Variable de entorno corregida
- `src/app/api/race/generate-seed/route.ts`: Cron job para generar seed

### Configuración
- `vercel.json`: Cron job cada 1 minuto

## 🎯 Ventajas de Esta Solución

1. **Determinismo Total**: El seed es calculable por cualquier cliente con los mismos inputs
2. **Sin Dependencia del Tiempo**: No depende de cuándo se genera el seed
3. **Generación Automática**: Triple capa de seguridad (placeBet + cron + finalize)
4. **Sin Transacciones del Usuario**: Los usuarios no necesitan generar el seed
5. **Inmutable**: Una vez generado, no puede cambiar
6. **Verificable On-Chain**: Cualquiera puede verificar que el seed es correcto

## 🔐 Seguridad

- El seed se genera DESPUÉS del período de apuestas
- Usa datos que no pueden ser manipulados después de cerrar las apuestas
- No usa datos que el owner pueda controlar
- El owner solo puede finalizar, no alterar el seed

## 📊 Testing

Para probar que funciona:

1. Abrir 2 navegadores/tabs con el mismo sitio
2. Hacer apuestas en ambos
3. Esperar a que termine el período de apuestas
4. Verificar en la consola de ambos navegadores:
   - `[Race X] Using contract seed: [mismo número]`
   - `[Race X] ✅ Winner detected: [mismo auto]`
5. Confirmar que ambos clientes ven el mismo ganador

## 🐛 Debugging

Si el problema persiste:

1. Verificar que `NEXT_PUBLIC_FLAPRACE_ADDRESS` apunta al nuevo contrato
2. Verificar en la consola que se esté usando el contract seed (no fallback)
3. Verificar en BSCScan que el seed se generó en el contrato
4. Verificar que el cron job está ejecutándose en Vercel

## 📝 Notas Adicionales

- Los contratos son **inmutables**: no se pueden modificar después de desplegarlos
- Fue necesario desplegar un **nuevo contrato** con las correcciones
- El contrato antiguo NO funcionará correctamente
- Los usuarios deben conectarse al nuevo contrato

---

**Nuevo Contrato**: `0x7d8B82E0B9905F8148A9a4b8a16617fF2C30afdC`
**Red**: BSC Testnet
**Fecha de Fix**: 2026-01-19
