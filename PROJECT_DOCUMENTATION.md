# FlapRace - Documentación Completa del Proyecto

## 📋 Resumen del Proyecto

**FlapRace** es una plataforma de apuestas de carreras en BNB Smart Chain (BSC) donde los usuarios pueden apostar BNB en una de 4 carreras diferentes. El ganador se determina visualmente mediante una animación sincronizada, y los fondos se distribuyen proporcionalmente entre los ganadores.

### Características Principales
- **4 montos de apuesta fijos**: 0.01, 0.05, 0.1, 0.5 BNB
- **Una apuesta por wallet por carrera**
- **Ciclo de carrera**: 2 minutos de apuestas → 5 segundos de countdown → 30 segundos de carrera
- **Sincronización global**: Todas las carreras están sincronizadas usando timestamps del contrato
- **Determinismo**: El resultado de la carrera es determinístico usando un seed basado en `raceId`, `bettingEndTime`, `blockHash`, y `totalBets`

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: Next.js 13 (App Router), React, TypeScript, Tailwind CSS
- **Blockchain**: BNB Smart Chain (BSC)
- **Web3**: ethers.js v6
- **Contrato**: Solidity 0.8.20+
- **Deployment**: Vercel
- **Chat**: Firebase Firestore

### Estructura de Archivos Clave

```
flaprace/
├── contracts/
│   └── FlapRace.sol              # Contrato inteligente principal
├── src/
│   ├── app/
│   │   ├── race/
│   │   │   └── page.tsx          # Página principal de carreras
│   │   ├── components/
│   │   │   └── Race/
│   │   │       ├── RaceTrack.tsx # Animación de la carrera
│   │   │       ├── BettingPanel.tsx
│   │   │       └── ...
│   │   ├── services/
│   │   │   └── flaprace.ts       # Servicio para interactuar con el contrato
│   │   ├── api/
│   │   │   └── race/
│   │   │       └── finalize/
│   │   │           └── route.ts  # API para finalizar carreras
│   │   └── contexts/
│   │       └── Web3Provider.tsx  # Contexto Web3 para BSC
└── public/
    └── race/                      # Assets de carreras (videos, imágenes)
```

---

## 🔐 Contrato Inteligente (`FlapRace.sol`)

### Variables Principales

```solidity
struct Race {
    uint256 raceId;
    uint256 startTime;          // Timestamp cuando empezó la carrera
    uint256 bettingEndTime;      // Timestamp cuando se cierran apuestas
    uint256 raceEndTime;         // Timestamp cuando termina la carrera
    uint256 totalPool;           // Pool total de la carrera actual
    uint256 nextRacePool;        // Pool que se transfiere a la siguiente carrera
    uint8 winner;                // ID del ganador (1-4)
    bool finalized;              // Si la carrera fue finalizada
}

mapping(uint256 => Race) public races;           // raceId => Race
mapping(uint256 => mapping(address => Bet)) public bets;  // raceId => user => Bet
mapping(uint256 => mapping(uint8 => uint256)) public carBetsAmount;  // raceId => carId => total amount
```

### Constantes de Tiempo

```solidity
uint256 public constant BETTING_DURATION = 120;      // 2 minutos
uint256 public constant COUNTDOWN_DURATION = 5;      // 5 segundos
uint256 public constant RACE_DURATION = 30;          // 30 segundos
```

### Funciones Principales

#### `placeBet(uint8 carId)`
- Valida que el usuario no haya apostado ya en esta carrera
- Valida que el monto de apuesta sea válido (0.01, 0.05, 0.1, 0.5 BNB)
- Si es la primera apuesta de la carrera, inicializa la carrera con timestamps
- Agrega la apuesta al pool total
- **IMPORTANTE**: Si `nextRaceStartTime` está en el pasado, usa `block.timestamp` como `actualStartTime`

#### `finalizeRace(uint256 raceId, uint8 winner)`
- Solo puede ser llamada después de `raceEndTime`
- Establece el ganador y marca la carrera como finalizada
- Calcula `loserPool` (fondos de perdedores)
- Si nadie apostó al ganador, todo el pool se transfiere a la siguiente carrera
- Si hay ganadores, solo los fondos de perdedores se transfieren
- Agrega `loserPool` a `nextRace.nextRacePool`

#### `claimWinnings(uint256 raceId)`
- Valida que el usuario apostó y ganó
- Calcula el porcentaje del usuario: `(bet.amount * totalPool) / winnerPool`
- Retorna: `bet.amount + userPercentageOfPool`
- Marca la apuesta como reclamada

### Flujo de Fondos

1. **Usuario apuesta** → BNB va a `race.totalPool`
2. **Carrera termina** → `finalizeRace` determina ganadores y perdedores
3. **Fondos de perdedores** → Se agregan a `nextRace.nextRacePool`
4. **Nueva carrera inicia** → `placeBet` inicializa `race.totalPool = race.nextRacePool`
5. **Ganadores reclaman** → Reciben su apuesta original + porcentaje del pool

---

## 🎮 Frontend - Lógica de Carreras

### Estados de Carrera (`RaceState`)

```typescript
type RaceState = 'betting' | 'pre_countdown' | 'countdown' | 'racing' | 'finished';
```

- **`betting`**: Período de 2 minutos para apostar
- **`pre_countdown`**: 5 segundos antes de que empiece la carrera visual
- **`countdown`**: Countdown visual (3, 2, 1, GO!)
- **`racing`**: La carrera está en progreso (30 segundos)
- **`finished`**: La carrera terminó, esperando finalización del contrato

### Sincronización Global

El frontend usa **timestamps del contrato como fuente de verdad**:

```typescript
// En fetchRaceData()
const now = Math.floor(Date.now() / 1000);
const bettingEndTime = Number(info.bettingEndTime);
const raceStartTime = bettingEndTime + PRE_COUNTDOWN_DURATION;
const raceEndTime = Number(info.raceEndTime);

// Determinar estado basado en tiempos del contrato
if (now < bettingEndTime) {
  setRaceState('betting');
} else if (now < raceStartTime) {
  setRaceState('pre_countdown');
} else if (now < raceEndTime) {
  setRaceState('racing');
} else if (info.finalized) {
  setRaceState('finished');
}
```

### Timer Local Suave

Para mostrar countdowns suaves (no saltos de 5 segundos), se usa un timer local que se actualiza cada segundo:

```typescript
useEffect(() => {
  const updateTimers = () => {
    const timestamps = contractTimestampsRef.current;
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (timestamps.bettingEndTime && currentTime < timestamps.bettingEndTime) {
      const remaining = Math.max(0, timestamps.bettingEndTime - currentTime);
      setBettingTimer(remaining);
    }
    // ... más lógica
  };
  
  updateTimers();
  const timerInterval = setInterval(updateTimers, 1000);
  return () => clearInterval(timerInterval);
}, [raceState, raceInfo]);
```

---

## 🏁 Animación de Carrera (`RaceTrack.tsx`)

### Determinismo y Sincronización

La carrera es **completamente determinística** usando un seed combinado:

```typescript
// Seed determinístico
const seed = raceSeed.raceId 
  ^ raceSeed.bettingEndTime 
  ^ blockHashValue 
  ^ raceSeed.totalBets;

// Normalizado a 32-bit unsigned integer
const normalizedSeed = (seed >>> 0);
```

### PRNG (Pseudo-Random Number Generator)

```typescript
function createPRNG(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return (state >>> 0) / 2147483648;
  };
}
```

### Sincronización Basada en Tiempo

**CRÍTICO**: El RNG se consume basado en el tiempo del contrato, no en frames:

```typescript
// Usar tiempo del contrato como fuente de verdad
const contractRaceTime = Math.max(0, now - actualRaceStartTime);

// Consumir RNG basado en tiempo (10 ticks por segundo)
const timeBasedTick = Math.floor(contractRaceTime * 10);

// Pre-consumir RNG para clientes que se conectan tarde
const initialTimeBasedTick = Math.floor(initialContractRaceTime * 10);
for (let i = 0; i < Math.min(initialTimeBasedTick, 300); i++) {
  rngRef.current(); // Consumir sin usar
}
```

### Detección de Ganador

El ganador se determina cuando:
1. Un racer cruza la línea de meta (completa 5 vueltas)
2. O cuando `contractRaceTime >= RACE_DURATION` (30 segundos)

```typescript
// Calcular distancia total
const totalDist = (racer.lap - 1) * totalLength + racer.distance;

// Si alguien completó 5 vueltas
if (racer.lap > TOTAL_LAPS) {
  raceWinner = racer;
}

// O si el tiempo terminó, usar el que tiene mayor distancia
if (contractRaceTime >= RACE_DURATION_SECONDS && !winnerFoundRef.current) {
  const currentRacerDistances = updated.map(r => ({
    id: r.id,
    totalDist: (r.lap - 1) * totalLength + r.distance
  })).sort((a, b) => b.totalDist - a.totalDist);
  
  const winnerId = currentRacerDistances[0].id;
}
```

---

## 🔄 Flujo de Finalización de Carrera

### 1. La Carrera Visual Termina

```typescript
// En RaceTrack.tsx
onRaceEnd(raceWinner.id); // Llama a handleRaceEnd en page.tsx
```

### 2. `handleRaceEnd` en `page.tsx`

```typescript
const handleRaceEnd = useCallback(async (winnerId: number) => {
  // CRITICAL: Almacenar el primer ganador detectado
  if (!winnerDetectedRef.current.has(raceNumber)) {
    winnerDetectedRef.current.set(raceNumber, winnerId);
  } else {
    const firstWinner = winnerDetectedRef.current.get(raceNumber);
    if (firstWinner !== winnerId) {
      // Ignorar ganadores diferentes, usar el primero
      return;
    }
  }
  
  setRaceState('finished');
  setLastWinner(winnerId);
  
  // Esperar hasta que el contrato termine
  const raceEndTime = Number(raceInfo.raceEndTime);
  const now = Math.floor(Date.now() / 1000);
  const timeUntilEnd = raceEndTime - now;
  
  if (timeUntilEnd > 0) {
    setTimeout(finalizeRace, (timeUntilEnd + 1) * 1000);
  } else {
    finalizeRace();
  }
}, []);
```

### 3. Llamada a API `/api/race/finalize`

```typescript
const finalizeRace = async () => {
  const response = await fetch('/api/race/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raceId: raceNumber,
      winner: finalWinner, // Usar el ganador almacenado
    }),
  });
};
```

### 4. API Route (`/api/race/finalize/route.ts`)

```typescript
// Validaciones
- Verificar que la carrera haya terminado (raceEndTime <= now + 2 segundos de margen)
- Si no hay API_KEY, solo permitir si la carrera terminó
- Si hay API_KEY, permitir finalización manual

// Llamar al contrato
const tx = await contract.finalizeRace(raceId, winner);
await tx.wait();
```

### 5. Contrato Finaliza

```solidity
function finalizeRace(uint256 raceId, uint8 winner) external {
    Race storage race = races[raceId];
    require(block.timestamp >= race.raceEndTime, "Race not finished");
    require(!race.finalized, "Race already finalized");
    
    race.winner = winner;
    race.finalized = true;
    
    uint256 winnerPool = carBetsAmount[raceId][winner];
    uint256 loserPool = race.totalPool - winnerPool;
    
    // Si nadie apostó al ganador, todo el pool se transfiere
    if (winnerPool == 0) {
        loserPool = race.totalPool;
    }
    
    // Agregar fondos de perdedores a la siguiente carrera
    if (loserPool > 0) {
        uint256 nextRaceId = raceId + 1;
        Race storage nextRace = races[nextRaceId];
        // Inicializar nextRace si no existe
        nextRace.nextRacePool += loserPool;
    }
}
```

---

## 🐛 Problemas Conocidos y Soluciones Implementadas

### Problema 1: Ganador Visual vs Ganador del Contrato No Coinciden

**Síntoma**: El ganador visual es diferente al ganador finalizado en el contrato.

**Causa**: Múltiples llamadas a `handleRaceEnd` con diferentes ganadores, o desincronización del RNG.

**Solución Implementada**:
- `winnerDetectedRef` almacena el primer ganador detectado
- Si se detecta un ganador diferente, se ignora y se usa el primero
- El RNG se consume basado en tiempo del contrato, no en frames

### Problema 2: Timer Saltando en Intervalos de 5 Segundos

**Síntoma**: El countdown no es suave, salta de 120 a 115 a 110...

**Causa**: Solo se actualizaba cuando `fetchRaceData` corría (cada 5 segundos).

**Solución Implementada**:
- Timer local que se actualiza cada segundo
- Sincronizado con timestamps del contrato guardados en `contractTimestampsRef`

### Problema 3: Carreras No Sincronizadas Entre Clientes

**Síntoma**: Diferentes usuarios ven diferentes ganadores para la misma carrera.

**Causa**: RNG consumido basado en frames, no en tiempo.

**Solución Implementada**:
- RNG consumido basado en `timeBasedTick = Math.floor(contractRaceTime * 10)`
- Pre-consumición de RNG para clientes que se conectan tarde
- Uso de `contractRaceTime` como fuente de verdad absoluta

### Problema 4: Fondos de Perdedores No Se Transfieren

**Síntoma**: Cuando una carrera termina, los fondos de perdedores no aparecen en la siguiente carrera.

**Causa**: `placeBet` no inicializaba `race.totalPool` con `race.nextRacePool`.

**Solución Implementada**:
```solidity
// En placeBet, cuando se inicializa una nueva carrera
if (race.startTime == 0) {
    race.totalPool = race.nextRacePool; // Incluir fondos de perdedores
}
```

### Problema 5: RPC Errors Spamming Console

**Síntoma**: Muchos errores de RPC en la consola.

**Solución Implementada**:
- Múltiples RPC endpoints para redundancia
- Timeouts y retry logic
- Silenciar errores no críticos en `updateBalance`

---

## 📊 Variables de Estado Importantes

### En `page.tsx`

```typescript
const [raceNumber, setRaceNumber] = useState(0);              // ID de carrera actual
const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(); // Info del contrato
const [previousRaceInfo, setPreviousRaceInfo] = useState();  // Info carrera anterior
const [raceState, setRaceState] = useState<RaceState>();     // Estado actual
const [lastWinner, setLastWinner] = useState<number>();     // Ganador visual
const [raceSeedData, setRaceSeedData] = useState();         // Seed para animación
const finalizingRaceRef = useRef<Set<number>>();             // Races siendo finalizadas
const winnerDetectedRef = useRef<Map<number, number>>();    // Primer ganador detectado
```

### En `RaceTrack.tsx`

```typescript
const [racers, setRacers] = useState<Racer[]>();            // Estado de los 4 racers
const [winner, setWinner] = useState<Racer | null>();       // Ganador visual
const raceTimeRef = useRef<number>(0);                      // Tiempo de carrera (sincronizado)
const tickCounterRef = useRef<number>(0);                   // Contador de ticks RNG
const rngRef = useRef<() => number>();                      // Función PRNG
const winnerFoundRef = useRef<boolean>(false);              // Si ya se encontró ganador
```

---

## 🔑 Funciones Críticas

### `fetchRaceData()` en `page.tsx`

**Propósito**: Obtener y actualizar toda la información de la carrera desde el contrato.

**Frecuencia**:
- Durante carrera activa: Cada 1 segundo
- Fuera de carrera: Cada 5 segundos

**Qué obtiene**:
1. `currentRaceId` - ID de la carrera actual
2. `raceInfo` - Información de la carrera (timestamps, winner, finalized)
3. `raceBets` - Lista de apuestas
4. `carStats` - Estadísticas por auto
5. `raceStats` - Estadísticas totales (totalBettors, totalBets, totalPool)
6. `raceSeedData` - Seed para animación (incluye blockHash)
7. `userBet` - Apuesta del usuario actual
8. `previousRaceInfo` - Información de la carrera anterior (si está en betting)

### `getRaceSeed()` en `flaprace.ts`

**Propósito**: Generar un seed determinístico para la animación.

**Componentes del seed**:
1. `raceId` - ID de la carrera
2. `bettingEndTime` - Timestamp cuando se cerraron apuestas
3. `blockHash` - Hash del bloque cuando se cerraron apuestas (impredecible)
4. `totalBets` - Cantidad total de apuestas

**Lógica de búsqueda del bloque**:
```typescript
// Estimar el bloque basado en bettingEndTime
const estimatedBlock = Math.floor((bettingEndTime - deploymentTime) / avgBlockTime);

// Buscar hacia atrás para encontrar el bloque exacto
for (let i = 0; i < 10; i++) {
  const block = await provider.getBlock(estimatedBlock - i);
  if (block.timestamp <= bettingEndTime) {
    return block.hash;
  }
}
```

---

## 🎯 Lógica de Velocidad de Carreras

### Parámetros de Velocidad

```typescript
const AVG_SPEED = 450;                    // Velocidad base
const SPEED_VARIATION = 0.75 + rng() * 0.50;  // ±25% variación
const SURGE_CHANCE = 0.15;                // 15% chance de aceleración
const STUMBLE_CHANCE = 0.15;              // 15% chance de desaceleración
```

### Rubber-Banding

Los autos que van atrás reciben un boost, los que van adelante una penalización:

```typescript
// Boost para últimos lugares
if (position > 2) {
  const catchUpBoost = (leaderDist - racerTotalDist) * 0.0003;
  newTargetSpeed += catchUpBoost;
}

// Penalización para líder
if (position === 1) {
  const leadPenalty = (leaderDist - lastPlaceDist) * 0.0001;
  newTargetSpeed -= leadPenalty;
}

// DESHABILITADO en últimos 5 segundos para mayor separación
if (contractRaceTime < RACE_DURATION_SECONDS - 5) {
  // Aplicar rubber-banding
} else {
  // Sin rubber-banding, velocidad natural
}
```

### Ajuste de Velocidad

```typescript
// Clamp de velocidad para asegurar que la carrera termine en ~30 segundos
const adjustedSpeed = Math.max(350, Math.min(700, newTargetSpeed));
```

---

## 🔍 Problemas Pendientes / Áreas de Mejora

### 1. Ganador Visual vs Contrato

**Estado**: Parcialmente resuelto
- Se almacena el primer ganador detectado
- Pero aún puede haber discrepancias si el RNG no está perfectamente sincronizado

**Posible causa**:
- El `blockHash` puede no estar disponible inmediatamente
- La pre-consumición de RNG puede no ser suficiente para clientes muy tardíos
- Diferencias en FPS entre clientes pueden causar pequeñas discrepancias

### 2. Finalización Automática

**Estado**: Implementado pero puede fallar
- Si el frontend no llama a `/api/race/finalize`, la carrera no se finaliza
- No hay cron job o mecanismo de respaldo

**Solución sugerida**:
- Implementar un cron job que finalice carreras automáticamente
- O permitir que cualquier usuario finalice una carrera pasada (con recompensa)

### 3. Sincronización de RNG

**Estado**: Mejorado pero puede mejorar más
- Actualmente se pre-consume RNG hasta 300 ticks (30 segundos)
- Si un cliente se conecta después de 30 segundos, puede estar desincronizado

**Solución sugerida**:
- Aumentar el límite de pre-consumición
- O calcular el estado del RNG directamente sin consumir todos los ticks

### 4. Visualización del Ganador Anterior

**Estado**: Implementado pero puede no mostrarse
- Solo se muestra cuando `raceState === 'betting'`
- Si el usuario se conecta durante la carrera, no verá el ganador anterior

---

## 🛠️ Comandos Útiles

### Desarrollo Local
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Deploy a Vercel
```bash
git push origin main
# Vercel despliega automáticamente
```

### Variables de Entorno Necesarias

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...  # Para finalizar carreras
API_KEY=...              # Para autenticación en API
NEXT_PUBLIC_API_KEY=...  # Para frontend (opcional)
```

---

## 📝 Notas Importantes para el Próximo Modelo

### 1. Sincronización es CRÍTICA

El sistema depende completamente de que todos los clientes vean la misma carrera. Cualquier cambio que afecte el determinismo puede romper esto.

### 2. El Contrato es la Fuente de Verdad

Los timestamps del contrato (`bettingEndTime`, `raceEndTime`) son la única fuente de verdad para sincronización. El frontend debe seguir estos tiempos, no usar `Date.now()` directamente.

### 3. RNG Debe Ser Determinístico

El PRNG debe:
- Usar el mismo seed para todos los clientes
- Consumirse en el mismo orden
- Basarse en tiempo del contrato, no en frames

### 4. Ganador Visual vs Contrato

El ganador visual (determinado por la animación) debe coincidir con el ganador del contrato. Si no coincide, hay un bug en la sincronización.

### 5. Flujo de Fondos

- Los fondos de perdedores se transfieren a `nextRace.nextRacePool`
- Cuando una nueva carrera inicia, `placeBet` debe inicializar `race.totalPool = race.nextRacePool`
- Los ganadores reciben: `bet.amount + (bet.amount * totalPool) / winnerPool`

---

## 🎨 Componentes UI Principales

### `RaceTrack.tsx`
- Renderiza la animación SVG de la carrera
- Maneja la lógica de movimiento de los 4 autos
- Detecta el ganador y llama a `onRaceEnd`
- Muestra countdown, posiciones, y celebración

### `BettingPanel.tsx`
- Muestra los 4 botones de apuesta (0.01, 0.05, 0.1, 0.5 BNB)
- Permite seleccionar un auto
- Valida que el usuario no haya apostado ya

### `page.tsx` (Principal)
- Orquesta todos los componentes
- Maneja el estado de la carrera
- Sincroniza con el contrato
- Maneja finalización de carreras

---

## 🔗 Endpoints API

### `POST /api/race/finalize`
- Finaliza una carrera en el contrato
- Requiere: `raceId`, `winner` (1-4)
- Opcional: `x-api-key` para finalización manual
- Retorna: `{ success: boolean, txHash?: string, error?: string }`

### `GET /api/race/finalize`
- Obtiene información de una carrera sin autenticación
- Útil para verificar estado

---

## 📚 Recursos Adicionales

- **Contrato Deployment**: Ver `CONTRACT_DEPLOYMENT.md` y `REMIX_DEPLOYMENT.md`
- **Post-Deployment**: Ver `POST_DEPLOYMENT_STEPS.md`
- **GitHub**: https://github.com/SolClaude33/runflap
- **Deployment**: Vercel (automático desde GitHub)

---

## ⚠️ Advertencias Importantes

1. **NO modificar el seed calculation** sin entender completamente el impacto en sincronización
2. **NO cambiar el consumo de RNG** a basado en frames
3. **NO usar `Date.now()` directamente** para determinar estados de carrera
4. **SIEMPRE usar timestamps del contrato** como fuente de verdad
5. **VERIFICAR** que el ganador visual coincide con el ganador del contrato después de cada cambio

---

## 🎯 Objetivos del Sistema

1. ✅ Carreras sincronizadas globalmente
2. ✅ Determinismo en resultados
3. ✅ Distribución justa de premios
4. ✅ Rollover de fondos de perdedores
5. ✅ Finalización automática de carreras
6. ⚠️ Visualización clara del ganador del contrato (implementado pero puede mejorar)
7. ⚠️ Visualización del ganador anterior (implementado pero puede mejorar)

---

**Última actualización**: Diciembre 2024
**Versión del contrato**: Solidity 0.8.20+
**Versión de Next.js**: 13.4.12
