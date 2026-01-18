# FlapRace - Configuración del Backend

## Endpoint para Finalizar Carreras

El backend necesita llamar al endpoint `/api/race/finalize` para determinar el ganador de cada carrera después de que termine.

### Configuración

1. **Variables de Entorno Requeridas:**
   ```env
   OWNER_PRIVATE_KEY=tu_private_key_del_owner
   API_KEY=tu_api_key_secreta
   NEXT_PUBLIC_CONTRACT_ADDRESS=direccion_del_contrato
   NEXT_PUBLIC_NETWORK=testnet  # o 'mainnet'
   ```

2. **Seguridad:**
   - `OWNER_PRIVATE_KEY`: La clave privada de la wallet que es owner del contrato
   - `API_KEY`: Una clave secreta para autenticar las peticiones
   - **NUNCA** commitees estas variables a git

### Uso del Endpoint

#### Finalizar una Carrera

```bash
POST /api/race/finalize
Headers:
  x-api-key: tu_api_key_secreta
  Content-Type: application/json

Body:
{
  "raceId": 1,
  "winner": 2  // 1, 2, 3, o 4
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "txHash": "0x...",
  "raceId": 1,
  "winner": 2
}
```

**Errores posibles:**
- `401 Unauthorized`: API key incorrecta
- `400 Bad Request`: Parámetros faltantes o inválidos
- `400 Race already finalized`: La carrera ya fue finalizada
- `400 Race not finished yet`: La carrera aún no ha terminado

#### Obtener Información de una Carrera

```bash
GET /api/race/finalize?raceId=1
```

**Respuesta:**
```json
{
  "success": true,
  "raceInfo": {
    "startTime": "1234567890",
    "bettingEndTime": "1234568010",
    "raceEndTime": "1234568045",
    "winner": 0,
    "finalized": false,
    "totalPool": "1000000000000000000",
    "nextRacePool": "0"
  }
}
```

### Implementación del Backend

El backend debe:

1. **Monitorear las carreras:**
   - Verificar periódicamente (cada 30 segundos) qué carreras han terminado
   - Usar `GET /api/race/finalize?raceId=X` para verificar el estado

2. **Determinar el ganador:**
   - Usar tu lógica off-chain (puede ser random, basado en eventos, etc.)
   - El ganador debe ser un número entre 1 y 4

3. **Finalizar la carrera:**
   - Llamar a `POST /api/race/finalize` con el `raceId` y `winner`
   - Esperar confirmación de la transacción

### Ejemplo de Script Backend (Node.js)

```javascript
const axios = require('axios');

const API_URL = 'https://tu-dominio.com/api/race/finalize';
const API_KEY = process.env.API_KEY;

async function checkAndFinalizeRaces() {
  // Obtener carrera actual
  const currentRaceId = await getCurrentRaceId();
  
  // Verificar si la carrera ha terminado
  const raceInfo = await axios.get(`${API_URL}?raceId=${currentRaceId}`, {
    headers: { 'x-api-key': API_KEY }
  });
  
  if (raceInfo.data.raceInfo.finalized) {
    console.log(`Race ${currentRaceId} already finalized`);
    return;
  }
  
  const raceEndTime = parseInt(raceInfo.data.raceInfo.raceEndTime);
  const now = Math.floor(Date.now() / 1000);
  
  if (now >= raceEndTime) {
    // Determinar ganador (tu lógica aquí)
    const winner = determineWinner(); // 1, 2, 3, o 4
    
    // Finalizar carrera
    try {
      const result = await axios.post(API_URL, {
        raceId: currentRaceId,
        winner: winner
      }, {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Race ${currentRaceId} finalized. Winner: ${winner}. TX: ${result.data.txHash}`);
    } catch (error) {
      console.error(`Error finalizing race ${currentRaceId}:`, error.response?.data || error.message);
    }
  }
}

// Ejecutar cada 30 segundos
setInterval(checkAndFinalizeRaces, 30000);
```

### Depósito de Fondos al Contrato

El contrato tiene una función `deposit()` que permite depositar BNB directamente. Esto es útil para:

- Agregar fees del trading del token
- Agregar fondos del jackpot
- Cualquier otro depósito

**Ejemplo de depósito desde el backend:**

```javascript
const { ethers } = require('ethers');

async function depositToContract(amount) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  
  const tx = await contract.deposit({ value: ethers.parseEther(amount.toString()) });
  await tx.wait();
  
  console.log(`Deposited ${amount} BNB to contract`);
}
```

### Notas Importantes

1. **Timing:** El backend debe finalizar las carreras lo más rápido posible después de que terminen para que los usuarios puedan reclamar sus ganancias.

2. **Determinación del Ganador:** Puedes usar cualquier método:
   - Random (Math.random())
   - Basado en eventos off-chain
   - Basado en datos externos
   - Chainlink VRF (para aleatoriedad on-chain verificable)

3. **Seguridad:** 
   - Mantén la `OWNER_PRIVATE_KEY` segura
   - Usa un API key fuerte
   - Considera usar un servicio de cron job (Vercel Cron, AWS Lambda, etc.)

4. **Monitoreo:**
   - Monitorea las transacciones de finalización
   - Verifica que las carreras se finalicen correctamente
   - Ten logs de todas las operaciones
