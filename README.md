# FlapRace 🏎️

Plataforma de carreras y apuestas en BNB Smart Chain. Los usuarios pueden apostar BNB en carreras de autos y ganar premios basados en el sistema de distribución por porcentaje.

## 🚀 Características

- **4 Montos de Apuesta**: 0.01, 0.05, 0.1, y 0.5 BNB
- **Una Apuesta por Wallet**: Cada usuario solo puede apostar una vez por carrera
- **Distribución Justa**: Los ganadores se reparten el pozo según su porcentaje de apuesta
- **Estadísticas en Tiempo Real**: Ve cuántas personas apostaron y cuánto se agregó al pozo
- **Carreras Automáticas**: Cada 2 minutos se inicia una nueva carrera
- **Contrato Inteligente**: Todo manejado on-chain en BNB Smart Chain

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- MetaMask o wallet compatible con BNB Smart Chain
- Cuenta en Vercel (para deployment)

## 🛠️ Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/flaprace.git
   cd flaprace
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Editar `.env.local` con tus valores:
   ```env
   NEXT_PUBLIC_NETWORK=testnet
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_APIKEY=...
   NEXT_PUBLIC_AUTHDOMAIN=...
   NEXT_PUBLIC_DATABASEURL=...
   NEXT_PUBLIC_PROJECTID=...
   NEXT_PUBLIC_STORAGEBUCKET=...
   NEXT_PUBLIC_MESSAGINGSENDERID=...
   NEXT_PUBLIC_APPID=...
   ```

4. **Ejecutar servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:5000
   ```

## 🚢 Deployment en Vercel

Vercel es la plataforma recomendada para Next.js. Es gratis y muy fácil de usar.

### Pasos para Deployar:

1. **Subir a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/flaprace.git
   git push -u origin main
   ```

2. **Conectar con Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta de GitHub
   - Haz clic en "Add New Project"
   - Importa tu repositorio `flaprace`
   - Vercel detectará automáticamente que es un proyecto Next.js

3. **Configurar Variables de Entorno en Vercel**
   - En la configuración del proyecto, ve a "Environment Variables"
   - Agrega todas las variables de `.env.local`:
     - `NEXT_PUBLIC_NETWORK`
     - `NEXT_PUBLIC_CONTRACT_ADDRESS`
     - `NEXT_PUBLIC_APIKEY`
     - `NEXT_PUBLIC_AUTHDOMAIN`
     - `NEXT_PUBLIC_DATABASEURL`
     - `NEXT_PUBLIC_PROJECTID`
     - `NEXT_PUBLIC_STORAGEBUCKET`
     - `NEXT_PUBLIC_MESSAGINGSENDERID`
     - `NEXT_PUBLIC_APPID`
     - `OWNER_PRIVATE_KEY` (solo para producción, NUNCA en el código)
     - `API_KEY` (solo para producción)

4. **Deploy**
   - Haz clic en "Deploy"
   - Vercel construirá y desplegará tu proyecto automáticamente
   - Obtendrás una URL como: `https://flaprace.vercel.app`

5. **Configurar Dominio Personalizado (Opcional)**
   - En Settings > Domains puedes agregar tu propio dominio

## 📝 Configuración del Contrato

Antes de usar la aplicación, necesitas:

1. **Deployar el contrato** (ver `CONTRACT_DEPLOYMENT.md`)
2. **Actualizar la dirección del contrato** en las variables de entorno
3. **Configurar el backend** para finalizar carreras (ver `BACKEND_SETUP.md`)

## 🏗️ Estructura del Proyecto

```
flaprace/
├── contracts/          # Contrato Solidity
│   └── FlapRace.sol
├── src/
│   └── app/
│       ├── api/        # API Routes
│       ├── components/ # Componentes React
│       ├── contexts/   # Contextos (Web3Provider)
│       ├── race/       # Página de carreras
│       └── services/   # Servicios de blockchain
├── public/             # Archivos estáticos
└── README.md
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo (puerto 5000)
- `npm run build` - Construir para producción
- `npm run start` - Servidor de producción
- `npm run lint` - Ejecutar linter

## 📚 Documentación Adicional

- [CONTRACT_DEPLOYMENT.md](./CONTRACT_DEPLOYMENT.md) - Guía para deployar el contrato
- [BACKEND_SETUP.md](./BACKEND_SETUP.md) - Configuración del backend

## 🔒 Seguridad

- **NUNCA** commitees archivos `.env.local` o `.env`
- **NUNCA** subas `OWNER_PRIVATE_KEY` a GitHub
- Usa variables de entorno en Vercel para datos sensibles
- El contrato debe ser auditado antes de mainnet

## 🌐 Redes Soportadas

- **BSC Testnet** (Chain ID: 97) - Para desarrollo
- **BSC Mainnet** (Chain ID: 56) - Para producción

## 📄 Licencia

Este proyecto es privado y propietario.

## 🤝 Contribuir

Este es un proyecto privado. Para contribuciones, contacta al equipo de desarrollo.

---

**Nota**: Asegúrate de tener el contrato desplegado y configurado antes de usar la aplicación en producción.
