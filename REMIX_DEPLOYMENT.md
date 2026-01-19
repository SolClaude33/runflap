# 🚀 Deploy del Contrato FlapRace en Remix

## 📋 Pasos para Deploy

### 1. Abrir Remix IDE
1. Ve a [https://remix.ethereum.org/](https://remix.ethereum.org/)
2. Crea una nueva carpeta llamada `contracts` (si no existe)
3. Crea un nuevo archivo llamado `FlapRace.sol` dentro de `contracts/`

### 2. Copiar el Contrato
Copia TODO el contenido del archivo `contracts/FlapRace.sol` y pégalo en Remix.

### 3. Compilar el Contrato
1. Ve a la pestaña **"Solidity Compiler"** (icono de compilador en el menú izquierdo)
2. Selecciona el compilador: **0.8.20** o superior
3. Asegúrate de que el **Language** sea **Solidity**
4. Haz clic en **"Compile FlapRace.sol"**
5. Verifica que no haya errores (debería aparecer un check verde ✅)

### 4. Configurar MetaMask para BSC

#### Para BSC Testnet (Recomendado para pruebas):
1. Abre MetaMask
2. Ve a Settings → Networks → Add Network
3. Configura:
   - **Network Name**: BSC Testnet
   - **RPC URL**: `https://data-seed-prebsc-1-s1.binance.org:8545/`
   - **Chain ID**: 97
   - **Currency Symbol**: BNB
   - **Block Explorer**: `https://testnet.bscscan.com`

#### Para BSC Mainnet (Producción):
1. Abre MetaMask
2. Ve a Settings → Networks → Add Network
3. Configura:
   - **Network Name**: BSC Mainnet
   - **RPC URL**: `https://bsc-dataseed1.binance.org/`
   - **Chain ID**: 56
   - **Currency Symbol**: BNB
   - **Block Explorer**: `https://bscscan.com`

### 5. Conectar MetaMask a Remix
1. En Remix, ve a la pestaña **"Deploy & Run Transactions"** (icono de cohete)
2. En **Environment**, selecciona **"Injected Provider - MetaMask"**
3. Asegúrate de estar conectado a la red correcta (BSC Testnet o Mainnet)
4. Verifica que tu wallet tenga BNB suficiente para el deploy (gas fees)

### 6. Deploy del Contrato
1. En la sección **"Deploy"**, verifica que el contrato sea **"FlapRace"**
2. Haz clic en **"Deploy"**
3. MetaMask se abrirá pidiendo confirmación
4. Revisa el gas fee y haz clic en **"Confirm"**
5. Espera a que la transacción se confirme (puede tomar 1-3 minutos)

### 7. Obtener la Dirección del Contrato
1. Después del deploy, verás el contrato en la sección **"Deployed Contracts"**
2. Haz clic en el contrato desplegado
3. Copia la dirección del contrato (aparece arriba del contrato)
4. **IMPORTANTE**: Guarda esta dirección, la necesitarás para configurar el frontend

### 8. Obtener el ABI
1. En Remix, ve a la pestaña **"Solidity Compiler"**
2. Haz clic en **"ABI"** (botón debajo del código compilado)
3. Copia todo el JSON del ABI
4. **IMPORTANTE**: Guarda este ABI, lo necesitarás para el frontend

### 9. Verificar el Contrato en BSCScan (Opcional pero Recomendado)
1. Ve a [BSCScan Testnet](https://testnet.bscscan.com/) o [BSCScan Mainnet](https://bscscan.com/)
2. Busca la dirección de tu contrato
3. Haz clic en **"Contract"** → **"Verify and Publish"**
4. Completa el formulario:
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: 0.8.20
   - **License**: MIT
   - Pega el código del contrato
5. Haz clic en **"Verify and Publish"**

### 10. Configurar el Frontend
1. Actualiza la variable de entorno en Vercel:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xTuDireccionDelContrato
   ```
2. El ABI ya está en el código del frontend, no necesitas cambiarlo

## ⚙️ Configuración del Contrato

El contrato tiene las siguientes constantes:
- **Montos de apuesta**: 0.01, 0.05, 0.1, 0.5 BNB
- **Duración de apuestas**: 120 segundos (2 minutos)
- **Countdown**: 5 segundos
- **Duración de carrera**: 30 segundos

## 🔐 Funciones Importantes

### Para Usuarios:
- `placeBet(uint8 carId)`: Apostar (envía BNB con la transacción)
- `claimWinnings(uint256 raceId)`: Reclamar ganancias
- `getCurrentRaceId()`: Obtener ID de carrera actual
- `getRaceInfo(uint256 raceId)`: Obtener info de una carrera

### Para Owner (Backend):
- `finalizeRace(uint256 raceId, uint8 winner)`: Finalizar carrera con ganador
- `deposit()`: Depositar fondos al contrato
- `withdraw()`: Retirar fondos (solo emergencias)

## 📝 Notas Importantes

1. **Gas Fees**: El deploy puede costar entre 0.001 - 0.01 BNB dependiendo del precio del gas
2. **Owner**: La dirección que deploya el contrato será el owner
3. **Finalizar Carreras**: Solo el owner puede llamar `finalizeRace()`, por eso necesitas configurar `OWNER_PRIVATE_KEY` en Vercel
4. **Testing**: Recomiendo probar primero en BSC Testnet antes de deployar en Mainnet

## 🐛 Troubleshooting

### Error: "Insufficient funds"
- Asegúrate de tener suficiente BNB en tu wallet para gas fees

### Error: "Contract not verified"
- Esto es normal, puedes verificarlo después en BSCScan

### Error: "Transaction failed"
- Verifica que estés en la red correcta (BSC Testnet o Mainnet)
- Asegúrate de tener suficiente BNB para gas

## ✅ Checklist Pre-Deploy

- [ ] Contrato compilado sin errores
- [ ] MetaMask conectado a BSC (Testnet o Mainnet)
- [ ] Wallet tiene suficiente BNB
- [ ] Dirección del contrato copiada
- [ ] ABI copiado (si necesitas actualizarlo)
- [ ] Contrato verificado en BSCScan (opcional)

## 🎉 Después del Deploy

1. Actualiza `NEXT_PUBLIC_CONTRACT_ADDRESS` en Vercel
2. El frontend debería conectarse automáticamente
3. ¡Prueba hacer una apuesta!
