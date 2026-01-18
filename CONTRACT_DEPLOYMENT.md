# FlapRace - Contrato Solidity

## Deploy del Contrato

### 1. Compilar el Contrato

1. Abre [Remix IDE](https://remix.ethereum.org/)
2. Crea un nuevo archivo `FlapRace.sol` en la carpeta `contracts/`
3. Copia el contenido de `contracts/FlapRace.sol`
4. Selecciona el compilador: **Solidity 0.8.20** o superior
5. Compila el contrato

### 2. Configuración del Contrato

El contrato tiene las siguientes constantes configurables:

- `BET_AMOUNT`: Monto fijo de apuesta (actualmente 0.01 BNB)
- `BETTING_DURATION`: Duración del periodo de apuestas (120 segundos = 2 minutos)
- `COUNTDOWN_DURATION`: Duración del countdown (5 segundos)
- `RACE_DURATION`: Duración de la carrera (30 segundos)

### 3. Deploy

1. En Remix, ve a la pestaña "Deploy & Run Transactions"
2. Selecciona el entorno:
   - **Injected Provider - MetaMask** (para BSC Mainnet/Testnet)
   - O **Web3 Provider** con tu RPC de BSC
3. Asegúrate de estar conectado a la red correcta:
   - **BSC Mainnet**: Chain ID 56
   - **BSC Testnet**: Chain ID 97
4. Haz clic en "Deploy"
5. Confirma la transacción en MetaMask

### 4. Configurar en el Frontend

Después del deploy, actualiza las siguientes variables:

1. Copia la dirección del contrato desplegado
2. Actualiza `.env.local`:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xTuDireccionDelContrato
   NEXT_PUBLIC_NETWORK=testnet  # o 'mainnet' para producción
   ```

### 5. Obtener el ABI

1. En Remix, después de compilar, ve a la pestaña "Solidity Compiler"
2. Haz clic en "ABI" para copiar el ABI completo
3. Guarda el ABI en `src/app/services/flaprace.ts` o crea un archivo JSON separado

### 6. Funciones Importantes del Contrato

#### Para Usuarios:
- `placeBet(uint8 carId)`: Colocar una apuesta (1-4 para los autos)
- `claimWinnings(uint256 raceId)`: Reclamar ganancias después de ganar
- `getCurrentRaceId()`: Obtener el ID de la carrera actual
- `getRaceInfo(uint256 raceId)`: Obtener información de una carrera
- `getUserBet(address user, uint256 raceId)`: Obtener apuesta de un usuario

#### Para el Owner/Backend:
- `finalizeRace(uint256 raceId, uint8 winner)`: Finalizar una carrera y determinar el ganador (solo owner)
- `withdraw()`: Retirar fondos del contrato (solo owner, para emergencias)

### 7. Notas Importantes

- **Determinación del Ganador**: El contrato requiere que el owner (o un backend) llame a `finalizeRace()` para determinar el ganador. Esto se puede hacer:
  - Manualmente por el owner
  - Automáticamente por un backend que use Chainlink VRF para aleatoriedad
  - Basado en algún evento off-chain

- **Fees del Trading**: El contrato tiene una función `receive()` que permite recibir BNB directamente. Las fees del trading del token se pueden enviar directamente al contrato y se sumarán al pozo de la siguiente carrera.

- **Seguridad**: 
  - Solo el owner puede finalizar carreras
  - Los usuarios solo pueden apostar una vez por carrera
  - El monto de apuesta es fijo para todos

### 8. Testing

Antes de deployar en mainnet, prueba en testnet:

1. Obtén BNB de testnet desde [BSC Faucet](https://testnet.binance.org/faucet-smart)
2. Deploy el contrato en testnet
3. Prueba todas las funciones
4. Verifica que los tiempos funcionen correctamente
5. Prueba la distribución de ganancias

### 9. Monitoreo

Después del deploy, monitorea:
- Eventos del contrato (BetPlaced, RaceEnded, etc.)
- Balance del contrato
- Transacciones de apuestas
- Reclamaciones de ganancias
