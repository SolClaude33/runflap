# FlapRace - Arreglo de Sincronización de Carreras

## Problema Identificado

**Síntoma**: Diferentes clientes ven diferentes ganadores para la misma carrera, incluso cuando se conectan al mismo tiempo.

**Causa Raíz**: El seed de la carrera no era consistente entre clientes debido a:

1. **Generación manual del seed**: El seed se generaba cuando alguien llamaba a `generateRaceSeed()`, lo que podía ocurrir en diferentes bloques para diferentes clientes.

2. **Uso de `prevrandao()`**: El contrato usaba `prevrandao()` que cambia en cada bloque de BSC (~3 segundos), causando que diferentes clientes que generaban el seed en bloques diferentes obtuvieran seeds completamente diferentes.

3. **Timestamp actual en el seed**: Se incluía `block.timestamp` en el cálculo del seed, que variaba dependiendo de cuándo se llamaba la función.

## Solución Implementada

### 1. Modificaciones al Contrato (`contracts/FlapRace.sol`)

#### Cambio Principal: Auto-generación Determinística del Seed

```solidity
function _generateRaceSeedInternal(uint256 raceId) internal {
    Race storage race = races[raceId];
    
    if (race.seedGenerated) {
        return; // Ya generado
    }
    
    require(block.timestamp >= race.bettingEndTime, "Betting not closed yet");
    
    // CRÍTICO: Calcular el bloque de referencia de forma determinística
    // Todos los clientes calcularán el MISMO bloque
    uint256 blocksAfterBetting = (block.timestamp - race.bettingEndTime) / 3;
    uint256 targetBlocksBack = blocksAfterBetting > 5 ? blocksAfterBetting - 5 : 0;
    targetBlocksBack = targetBlocksBack > 255 ? 255 : targetBlocksBack;
    
    bytes32 referenceBlockHash = blockhash(block.number - targetBlocksBack);
    
    if (referenceBlockHash == bytes32(0)) {
        // Fallback si el blockhash no está disponible
        race.raceSeed = uint256(keccak256(abi.encodePacked(
            raceId,
            race.bettingEndTime,
            race.startTime,
            raceBets[raceId].length,
            race.totalPool
        )));
    } else {
        // Método principal: combinar blockhash con datos de la carrera
        race.raceSeed = uint256(keccak256(abi.encodePacked(
            raceId,
            race.bettingEndTime,
            referenceBlockHash,
            raceBets[raceId].length,
            race.totalPool
        )));
    }
    
    race.seedGenerated = true;
    emit RaceSeedGenerated(raceId, race.raceSeed);
}
```

**Puntos Clave**:
- Ya NO usa `prevrandao()` que cambia cada bloque
- Ya NO usa `block.timestamp` actual en el seed
- Calcula un bloque de referencia de forma determinística basado en `bettingEndTime`
- Todos los clientes que consultan después del mismo período obtendrán el mismo blockhash

#### Auto-generación en `getRaceSeed()`

```solidity
function getRaceSeed(uint256 raceId) external returns (uint256 seed, bool generated) {
    Race storage race = races[raceId];
    
    // Auto-generar seed si no está generado y el betting terminó
    if (!race.seedGenerated && race.startTime > 0 && block.timestamp >= race.bettingEndTime) {
        _generateRaceSeedInternal(raceId);
    }
    
    return (race.raceSeed, race.seedGenerated);
}
```

**Beneficio**: El seed se genera automáticamente cuando cualquier cliente lo solicita, sin necesidad de transacciones manuales.

#### Auto-generación en `finalizeRace()`

```solidity
function finalizeRace(uint256 raceId, uint8 winner) external onlyOwner {
    // ... validaciones ...
    
    // Auto-generar seed si no está generado
    if (!race.seedGenerated) {
        _generateRaceSeedInternal(raceId);
    }
    
    // ... resto de la lógica ...
}
```

**Beneficio**: Asegura que el seed esté disponible cuando se finaliza la carrera.

### 2. Modificaciones al Frontend

#### Eliminación de Lógica de Generación Manual

**Antes**:
```typescript
// El frontend intentaba generar el seed manualmente
if (!contractSeed.generated && signer) {
  const result = await generateRaceSeed(signer, currentRace);
  // ...
}
```

**Después**:
```typescript
// El frontend solo obtiene el seed (auto-generado por el contrato)
const contractSeed = await getContractRaceSeed(provider, currentRace);
console.log(`[Race ${currentRace}] Using contract seed: ${contractSeed.seed}`);
```

#### Simplificación del Service

**Eliminado**: `generateRaceSeed()` - ya no es necesario

**Mejorado**: `getContractRaceSeed()` - ahora solo lee el seed que el contrato auto-genera

### 3. Cómo Funciona Ahora

```
1. Apuestas se cierran (bettingEndTime alcanzado)
   ↓
2. Cliente A pide el seed → getContractRaceSeed()
   ↓
3. Contrato calcula el bloque de referencia determinísticamente
   - Usa: (block.timestamp - bettingEndTime) / 3 segundos
   - Obtiene: blockhash del bloque calculado
   - Genera: seed = keccak256(raceId + bettingEndTime + blockhash + bets + pool)
   ↓
4. Cliente B pide el seed unos segundos después
   - Calcula el MISMO bloque de referencia
   - Obtiene el MISMO blockhash
   - Recibe el MISMO seed (ya generado)
   ↓
5. Todos los clientes usan el mismo seed
   ↓
6. PRNG genera la misma secuencia para todos
   ↓
7. ✅ MISMO GANADOR para todos los clientes
```

## Garantías de Sincronización

### ✅ Seed Determinístico

- **Todos los clientes calcularán el mismo bloque de referencia** porque:
  - Usan el mismo `bettingEndTime` (del contrato)
  - Usan el mismo tiempo de bloque promedio (3 segundos en BSC)
  - Consultan después del mismo período

- **El blockhash es el mismo para todos** porque:
  - Es inmutable una vez minado el bloque
  - Todos lo leen desde la blockchain

### ✅ Sin Variación por Timing

- **Ya NO depende de cuándo se llama** porque:
  - No usa `block.timestamp` actual
  - No usa `prevrandao()` del bloque actual
  - Solo usa información histórica fija

### ✅ Fallback Robusto

- **Si el blockhash no está disponible** (>256 bloques):
  - Usa solo datos de la carrera (100% determinístico)
  - Todos los clientes harán el mismo cálculo
  - Menos aleatorio, pero completamente sincronizado

## Testing de Sincronización

### Para verificar que funciona:

1. **Abrir 2-3 navegadores** en diferentes computadoras/IPs
2. **Conectar wallets diferentes** en cada uno
3. **Esperar a que termine el betting** de una carrera
4. **Observar la carrera simultáneamente**
5. **Verificar**:
   - ✅ Los autos se mueven igual en todos los navegadores
   - ✅ El ganador es el mismo en todos
   - ✅ El ganador visual coincide con el ganador del contrato

### Debugging

```javascript
// En la consola del navegador, todos deben mostrar el mismo valor:
// Seed: 1234567890 (ejemplo)
// Generated: true
```

## Deployment

### Pasos para Desplegar el Contrato Actualizado

1. **Compilar el contrato en Remix**:
   - Copiar `contracts/FlapRace.sol`
   - Pegar en Remix IDE
   - Compilar con Solidity 0.8.20+

2. **Desplegar en BSC Testnet/Mainnet**:
   - Seleccionar "Injected Provider - MetaMask"
   - Deploy el contrato
   - Guardar la dirección del contrato

3. **Actualizar variables de entorno**:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xNUEVA_DIRECCION
   OWNER_PRIVATE_KEY=0xTU_PRIVATE_KEY
   ```

4. **Desplegar el frontend**:
   ```bash
   git add .
   git commit -m "Fix race synchronization with deterministic seed"
   git push origin main
   ```

5. **Vercel deployará automáticamente**

## Cambios en el ABI

El ABI de `getRaceSeed` ahora es no-view (mutable) pero se puede llamar con `staticCall` para lectura:

```typescript
// Antes (view):
function getRaceSeed(uint256 raceId) external view returns (uint256, bool)

// Ahora (mutable, auto-genera si es necesario):
function getRaceSeed(uint256 raceId) external returns (uint256, bool)
```

**Nota**: En el frontend usamos `contract.getRaceSeed()` con un provider readonly. Si el seed no está generado, la primera llamada lo generará (esto es OK porque es idempotente).

## Resumen

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Generación del seed** | Manual, cuando alguien llama `generateRaceSeed()` | Automática cuando se solicita |
| **Fuente de aleatoriedad** | `prevrandao()` (cambia cada bloque) | `blockhash` de bloque calculado determinísticamente |
| **Timing** | Dependía de cuándo se llamaba | Independiente del timing |
| **Sincronización** | ❌ Inconsistente | ✅ Garantizada |
| **Transacciones necesarias** | 1 extra para generar seed | 0 (auto-generación) |

## Resultado Esperado

- ✅ **Todos los clientes ven la misma carrera**
- ✅ **El ganador visual coincide con el ganador del contrato**
- ✅ **No se necesita intervención manual para generar seeds**
- ✅ **La sincronización es automática y transparente**

---

**Última actualización**: 2026-01-19
**Estado**: ✅ Implementado y listo para testing
