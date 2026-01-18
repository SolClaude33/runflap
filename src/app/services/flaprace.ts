import { ethers } from 'ethers';
import FlapRaceABI from '../../contracts/FlapRace.json';

// Dirección del contrato (se debe actualizar después del deploy)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// ABI del contrato (se generará después de compilar)
// Por ahora usamos una versión simplificada
const FLAPRACE_ABI = [
  "function placeBet(uint8 carId) payable",
  "function finalizeRace(uint256 raceId, uint8 winner)",
  "function claimWinnings(uint256 raceId)",
  "function getCurrentRaceId() view returns (uint256)",
  "function getRaceInfo(uint256 raceId) view returns (uint256 startTime, uint256 bettingEndTime, uint256 raceEndTime, uint8 winner, bool finalized, uint256 totalPool, uint256 nextRacePool)",
  "function getRaceBets(uint256 raceId) view returns (tuple(address user, uint8 carId, uint256 raceId, uint256 amount, bool claimed)[])",
  "function getCarStats(uint256 raceId) view returns (uint256[4] counts, uint256[4] amounts)",
  "function getRaceStats(uint256 raceId) view returns (uint256 totalBets, uint256 totalBettors, uint256 totalPool)",
  "function getTotalBetsCount(uint256 raceId) view returns (uint256)",
  "function canBet(address user, uint256 raceId) view returns (bool)",
  "function getUserBet(address user, uint256 raceId) view returns (tuple(address user, uint8 carId, uint256 raceId, uint256 amount, bool claimed))",
  "function getValidBetAmounts() view returns (uint256[])",
  "function isValidBetAmount(uint256 amount) view returns (bool)",
  "function deposit() payable",
  "function getContractBalance() view returns (uint256)",
  "event BetPlaced(address indexed user, uint256 indexed raceId, uint8 carId, uint256 amount)",
  "event RaceStarted(uint256 indexed raceId, uint256 startTime)",
  "event RaceEnded(uint256 indexed raceId, uint8 winner)",
  "event WinningsClaimed(address indexed user, uint256 indexed raceId, uint256 amount)",
];

export interface RaceInfo {
  startTime: bigint;
  bettingEndTime: bigint;
  raceEndTime: bigint;
  winner: number;
  finalized: boolean;
  totalPool: bigint;
  nextRacePool: bigint;
}

export interface Bet {
  user: string;
  carId: number;
  raceId: bigint;
  amount: bigint;
  claimed: boolean;
}

export interface CarStats {
  counts: bigint[];
  amounts: bigint[];
}

export interface RaceStats {
  totalBets: number;
  totalBettors: number;
  totalPool: bigint;
}

/**
 * Obtener instancia del contrato
 */
export const getContract = (signer: ethers.JsonRpcSigner) => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, FLAPRACE_ABI, signer);
};

/**
 * Obtener instancia del contrato para lectura (sin signer)
 */
export const getContractReadOnly = (provider: ethers.BrowserProvider) => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, FLAPRACE_ABI, provider);
};

/**
 * Colocar una apuesta
 * @param signer Signer de la wallet
 * @param carId ID del auto (1-4)
 * @param amount Monto de apuesta en BNB (debe ser uno de los montos válidos)
 */
export const placeBet = async (
  signer: ethers.JsonRpcSigner,
  carId: number,
  amount: string // Monto en BNB como string (ej: "0.01")
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const contract = getContract(signer);
    const betAmount = ethers.parseEther(amount);
    
    // Verificar que el monto es válido
    const isValid = await contract.isValidBetAmount(betAmount);
    if (!isValid) {
      return {
        success: false,
        error: 'Monto de apuesta inválido. Use 0.01, 0.05, 0.1, o 0.5 BNB',
      };
    }
    
    const tx = await contract.placeBet(carId, { value: betAmount });
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error placing bet:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Error al colocar apuesta',
    };
  }
};

/**
 * Reclamar ganancias
 */
export const claimWinnings = async (
  signer: ethers.JsonRpcSigner,
  raceId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const contract = getContract(signer);
    const tx = await contract.claimWinnings(raceId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error claiming winnings:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Error al reclamar ganancias',
    };
  }
};

/**
 * Obtener información de una carrera
 */
export const getRaceInfo = async (
  provider: ethers.BrowserProvider,
  raceId: number
): Promise<RaceInfo | null> => {
  try {
    const contract = getContractReadOnly(provider);
    const info = await contract.getRaceInfo(raceId);
    
    return {
      startTime: info.startTime,
      bettingEndTime: info.bettingEndTime,
      raceEndTime: info.raceEndTime,
      winner: Number(info.winner),
      finalized: info.finalized,
      totalPool: info.totalPool,
      nextRacePool: info.nextRacePool,
    };
  } catch (error) {
    console.error('Error getting race info:', error);
    return null;
  }
};

/**
 * Obtener ID de carrera actual
 */
export const getCurrentRaceId = async (
  provider: ethers.BrowserProvider
): Promise<number> => {
  try {
    const contract = getContractReadOnly(provider);
    const raceId = await contract.getCurrentRaceId();
    return Number(raceId);
  } catch (error) {
    console.error('Error getting current race ID:', error);
    return 0;
  }
};

/**
 * Obtener apuestas de una carrera
 */
export const getRaceBets = async (
  provider: ethers.BrowserProvider,
  raceId: number
): Promise<Bet[]> => {
  try {
    const contract = getContractReadOnly(provider);
    const bets = await contract.getRaceBets(raceId);
    
      return bets.map((bet: any) => ({
        user: bet.user,
        carId: Number(bet.carId),
        raceId: bet.raceId,
        amount: bet.amount,
        claimed: bet.claimed,
      }));
  } catch (error) {
    console.error('Error getting race bets:', error);
    return [];
  }
};

/**
 * Obtener estadísticas de autos
 */
export const getCarStats = async (
  provider: ethers.BrowserProvider,
  raceId: number
): Promise<CarStats | null> => {
  try {
    const contract = getContractReadOnly(provider);
    const stats = await contract.getCarStats(raceId);
    
    return {
      counts: stats.counts,
      amounts: stats.amounts,
    };
  } catch (error) {
    console.error('Error getting car stats:', error);
    return null;
  }
};

/**
 * Verificar si un usuario puede apostar
 */
export const canBet = async (
  provider: ethers.BrowserProvider,
  userAddress: string,
  raceId: number
): Promise<boolean> => {
  try {
    const contract = getContractReadOnly(provider);
    return await contract.canBet(userAddress, raceId);
  } catch (error) {
    console.error('Error checking if can bet:', error);
    return false;
  }
};

/**
 * Obtener apuesta de un usuario
 */
export const getUserBet = async (
  provider: ethers.BrowserProvider,
  userAddress: string,
  raceId: number
): Promise<Bet | null> => {
  try {
    const contract = getContractReadOnly(provider);
    const bet = await contract.getUserBet(userAddress, raceId);
    
      return {
        user: bet.user,
        carId: Number(bet.carId),
        raceId: bet.raceId,
        amount: bet.amount,
        claimed: bet.claimed,
      };
  } catch (error: any) {
    if (error.message?.includes('No bet found')) {
      return null;
    }
    console.error('Error getting user bet:', error);
    return null;
  }
};

/**
 * Obtener montos válidos de apuesta
 */
export const getValidBetAmounts = async (
  provider: ethers.BrowserProvider
): Promise<string[]> => {
  try {
    const contract = getContractReadOnly(provider);
    const amounts = await contract.getValidBetAmounts();
    return amounts.map((amount: bigint) => ethers.formatEther(amount));
  } catch (error) {
    console.error('Error getting valid bet amounts:', error);
    return ['0.01', '0.05', '0.1', '0.5']; // Default
  }
};

/**
 * Obtener estadísticas de una carrera
 */
export const getRaceStats = async (
  provider: ethers.BrowserProvider,
  raceId: number
): Promise<RaceStats | null> => {
  try {
    const contract = getContractReadOnly(provider);
    const stats = await contract.getRaceStats(raceId);
    
    return {
      totalBets: Number(stats.totalBets),
      totalBettors: Number(stats.totalBettors),
      totalPool: stats.totalPool,
    };
  } catch (error) {
    console.error('Error getting race stats:', error);
    return null;
  }
};

/**
 * Obtener cantidad total de apuestas
 */
export const getTotalBetsCount = async (
  provider: ethers.BrowserProvider,
  raceId: number
): Promise<number> => {
  try {
    const contract = getContractReadOnly(provider);
    const count = await contract.getTotalBetsCount(raceId);
    return Number(count);
  } catch (error) {
    console.error('Error getting total bets count:', error);
    return 0;
  }
};

/**
 * Depositar fondos al contrato
 */
export const depositToContract = async (
  signer: ethers.JsonRpcSigner,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const contract = getContract(signer);
    const depositAmount = ethers.parseEther(amount);
    
    const tx = await contract.deposit({ value: depositAmount });
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error depositing to contract:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Error al depositar',
    };
  }
};

/**
 * Suscribirse a eventos del contrato
 */
export const subscribeToRaceEvents = (
  provider: ethers.BrowserProvider,
  callback: (event: string, data: any) => void
) => {
  const contract = getContractReadOnly(provider);
  
  // Eventos
  contract.on('BetPlaced', (user, raceId, carId, amount, event) => {
    callback('BetPlaced', { user, raceId: Number(raceId), carId: Number(carId), amount });
  });
  
  contract.on('RaceStarted', (raceId, startTime, event) => {
    callback('RaceStarted', { raceId: Number(raceId), startTime });
  });
  
  contract.on('RaceEnded', (raceId, winner, event) => {
    callback('RaceEnded', { raceId: Number(raceId), winner: Number(winner) });
  });
  
  contract.on('WinningsClaimed', (user, raceId, amount, event) => {
    callback('WinningsClaimed', { user, raceId: Number(raceId), amount });
  });
  
  return () => {
    contract.removeAllListeners();
  };
};
