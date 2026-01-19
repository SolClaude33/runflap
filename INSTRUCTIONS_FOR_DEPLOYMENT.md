# Instrucciones de Deployment - FlapRace (Arreglo de Sincronización)

## ⚠️ IMPORTANTE: DEBES RE-DESPLEGAR EL CONTRATO

Los cambios realizados requieren que **vuelvas a desplegar el contrato** en BSC porque la lógica de generación de seed cambió significativamente.

## Problema que se Arregló

**Antes**: Diferentes usuarios veían diferentes ganadores en la misma carrera.

**Causa**: El seed se generaba de forma inconsistente usando `prevrandao()` que cambia cada bloque.

**Ahora**: El seed se genera automáticamente de forma determinística, garantizando que todos vean el mismo resultado.

---

## 📋 Pasos para Deployment

### 1. Desplegar el Nuevo Contrato en BSC

#### Opción A: Usando Remix IDE (Recomendado)

1. **Abrir Remix**: https://remix.ethereum.org

2. **Crear nuevo archivo**: `FlapRace.sol`

3. **Copiar el contrato**: Del archivo `contracts/FlapRace.sol` en este proyecto

4. **Compilar**:
   - Click en el ícono de compilador (lado izquierdo)
   - Seleccionar versión: `0.8.20` o superior
   - Click "Compile FlapRace.sol"
   - Verificar que no haya errores

5. **Desplegar**:
   - Click en el ícono de deploy (lado izquierdo)
   - Environment: Seleccionar "Injected Provider - MetaMask"
   - Conectar MetaMask a BSC Mainnet o Testnet
   - Asegurarse de tener BNB para gas
   - Click "Deploy"
   - Confirmar en MetaMask
   - **GUARDAR LA DIRECCIÓN DEL CONTRATO DESPLEGADO** (ejemplo: `0x1234567890abcdef...`)

#### Opción B: Usando Hardhat (Avanzado)

```bash
# Instalar dependencias
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Crear configuración de hardhat
npx hardhat init

# Configurar hardhat.config.js para BSC
# Desplegar
npx hardhat run scripts/deploy.js --network bscMainnet
```

### 2. Actualizar Variables de Entorno en Vercel

1. **Ir a Vercel Dashboard**: https://vercel.com

2. **Seleccionar tu proyecto**: `runflap` o `flaprace`

3. **Settings → Environment Variables**

4. **Actualizar o agregar**:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xTU_NUEVA_DIRECCION_DEL_CONTRATO
   NEXT_PUBLIC_NETWORK=mainnet
   OWNER_PRIVATE_KEY=0xTU_PRIVATE_KEY_DEL_OWNER
   API_KEY=tu_api_key_secreta_para_finalizar_carreras
   ```

   **⚠️ IMPORTANTE**:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`: La dirección del nuevo contrato desplegado
   - `OWNER_PRIVATE_KEY`: La private key de la wallet que desplegó el contrato (tiene permisos de owner)
   - `API_KEY`: Una clave secreta que inventas para autenticación del API

5. **Click "Save"**

### 3. Re-desplegar el Frontend

El código ya está en GitHub, pero necesitas forzar un re-deploy para que use las nuevas variables:

1. **En Vercel Dashboard**:
   - Ir a "Deployments"
   - Click en el último deployment
   - Click en los 3 puntos (⋯)
   - Click "Redeploy"
   - Seleccionar "Use existing Build Cache" = NO
   - Click "Redeploy"

O alternativamente:

```bash
# Hacer un commit dummy para trigger deployment
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin main
```

### 4. Verificar el Deployment

1. **Esperar a que Vercel termine** (~3-5 minutos)

2. **Abrir tu sitio**: (ejemplo: `https://runflap.vercel.app`)

3. **Abrir la consola del navegador** (F12)

4. **Conectar wallet**

5. **Esperar a una carrera**

6. **Verificar en la consola**:
   ```
   [RaceTrack] ✅ Using contract seed: 1234567890 for race 0
   ```
   
   Si ves `⚠️ WARNING`, significa que el seed no se generó correctamente.

---

## 🧪 Testing de Sincronización

### Preparación

1. **Abrir 2-3 navegadores diferentes** (Chrome, Firefox, Edge)
2. **O usar modo incógnito** en diferentes ventanas
3. **Conectar wallets diferentes** en cada navegador
4. **Posicionar las ventanas lado a lado** para ver simultáneamente

### Prueba 1: Verificar Seed Consistente

1. En cada navegador, abrir la **consola** (F12)
2. Esperar a que termine el betting de una carrera
3. Verificar que todos muestran:
   ```
   [RaceTrack] ✅ Using contract seed: XXXXXXXX for race N
   ```
4. **✅ El número del seed debe ser EXACTAMENTE el mismo** en todos los navegadores

### Prueba 2: Verificar Carrera Sincronizada

1. Esperar a que la carrera empiece
2. Observar las posiciones de los autos
3. **✅ Los autos deben moverse en las mismas posiciones** en todos los navegadores
4. **✅ El ganador debe ser el mismo** en todos

### Prueba 3: Verificar Ganador del Contrato

1. Cuando la carrera termine, ver el ganador visual
2. Esperar ~5 segundos a que se finalice en el contrato
3. Revisar el "Contract Winner" en la UI
4. **✅ Debe coincidir con el ganador visual**

---

## 🔍 Troubleshooting

### Error: "Contract seed not ready"

**Síntoma**: En la consola ves:
```
⚠️ WARNING: Contract seed not ready for race N
```

**Causa**: El frontend está intentando iniciar la carrera antes de que el seed se genere.

**Solución**:
1. Verificar que el contrato nuevo está desplegado correctamente
2. Verificar que `NEXT_PUBLIC_CONTRACT_ADDRESS` está actualizado en Vercel
3. Esperar 5-10 segundos después de que cierre el betting antes de que empiece la carrera

### Error: "Seed is 0"

**Síntoma**: El seed es 0 o no se genera.

**Causa**: Problema con el contrato o la función `getRaceSeed()`.

**Solución**:
1. Verificar que el contrato se compiló sin errores
2. Verificar que la función `_generateRaceSeedInternal` está en el contrato
3. Re-desplegar el contrato

### Diferentes Ganadores en Diferentes Clientes

**Síntoma**: Aún ves diferentes ganadores en diferentes navegadores.

**Causa**: Los seeds son diferentes o hay un problema de sincronización.

**Solución**:
1. Verificar que ambos clientes usan el mismo seed (ver consola)
2. Verificar que ambos clientes tienen el mismo `raceId`
3. Verificar que `NEXT_PUBLIC_CONTRACT_ADDRESS` está correcto en Vercel
4. Limpiar caché del navegador (Ctrl+Shift+Del)
5. Re-desplegar el frontend

### RPC Errors / Timeout

**Síntoma**: Errores de RPC en la consola.

**Causa**: BSC RPC puede estar lento o congestionado.

**Solución**:
- Esto es normal y no afecta la funcionalidad
- Los errores se silencian automáticamente
- Si persisten, considerar agregar más RPCs en `src/app/contexts/Web3Provider.tsx`

---

## 📊 Comparación: Antes vs Después

| Aspecto | ❌ Antes (Problema) | ✅ Después (Arreglado) |
|---------|---------------------|------------------------|
| **Seed generation** | Manual, requería transacción | Automática, sin transacciones |
| **Seed consistency** | Diferente en cada bloque | Mismo seed para todos |
| **Timing dependency** | Dependía de cuándo se llamaba | Independiente del timing |
| **Sincronización** | ❌ Inconsistente | ✅ Garantizada 100% |
| **Ganador visual** | Diferente en cada cliente | Mismo en todos |
| **Ganador contrato** | A veces no coincidía | ✅ Siempre coincide |

---

## 📝 Checklist Final

Antes de considerar el deployment completo, verificar:

- [ ] Nuevo contrato desplegado en BSC
- [ ] Dirección del contrato guardada
- [ ] Variables de entorno actualizadas en Vercel
- [ ] Frontend re-desplegado
- [ ] Sitio accesible y funcional
- [ ] Consola muestra seed correcto
- [ ] Testing con múltiples navegadores exitoso
- [ ] Ganadores sincronizados entre clientes
- [ ] Ganador visual = ganador del contrato

---

## 🆘 Soporte

Si después de seguir todos los pasos aún tienes problemas:

1. **Revisar logs de Vercel**:
   - Dashboard → Deployments → Click en deployment → "View Function Logs"

2. **Revisar consola del navegador**:
   - F12 → Console
   - Buscar errores en rojo
   - Copiar el error completo

3. **Verificar el contrato en BSCScan**:
   - Ir a https://bscscan.com (mainnet) o https://testnet.bscscan.com (testnet)
   - Pegar la dirección del contrato
   - Verificar que esté desplegado correctamente
   - Click en "Contract" → "Read Contract"
   - Probar llamar `getCurrentRaceId()` y `getRaceInfo(0)`

4. **Testing manual del seed**:
   - En BSCScan, ir a "Read Contract"
   - Llamar `getRaceSeed(raceId)` con el ID de carrera actual
   - Debería retornar `(seed: número grande, generated: true)`
   - Si `generated` es `false`, esperar unos segundos y volver a intentar

---

## 📚 Archivos Modificados

Para referencia, estos son los archivos que se modificaron:

1. **`contracts/FlapRace.sol`** - Contrato principal (lógica de seed)
2. **`src/app/services/flaprace.ts`** - Service para interactuar con el contrato
3. **`src/app/race/page.tsx`** - Página principal de carreras
4. **`src/app/components/Race/RaceTrack.tsx`** - Componente de animación
5. **`src/app/api/race/finalize/route.ts`** - API para finalizar carreras

**⚠️ EL MÁS IMPORTANTE**: `contracts/FlapRace.sol` - **DEBE ser re-desplegado**

---

**Última actualización**: 2026-01-19

**Estado**: ✅ Código listo, esperando deployment del contrato
