import { ethers } from 'ethers';

// Contract address (must be updated after deployment)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Complete ABI of the FlapRace contract
const FLAPRACE_ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "carId",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "BetPlaced",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "claimWinnings",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "deposit",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "emergencyWithdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "winner",
				"type": "uint8"
			}
		],
		"name": "finalizeRace",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "determineWinner",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "depositor",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "FundsDeposited",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "FundsWithdrawn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "NextRacePoolUpdated",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint8",
				"name": "carId",
				"type": "uint8"
			}
		],
		"name": "placeBet",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "winner",
				"type": "uint8"
			}
		],
		"name": "RaceEnded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			}
		],
		"name": "RaceStarted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "WinningsClaimed",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "BETTING_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "canBet",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"name": "carBetsAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"name": "carBetsCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "COUNTDOWN_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "currentRaceId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "getCarStats",
		"outputs": [
			{
				"internalType": "uint256[4]",
				"name": "counts",
				"type": "uint256[4]"
			},
			{
				"internalType": "uint256[4]",
				"name": "amounts",
				"type": "uint256[4]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCurrentRaceId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "getRaceBets",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "user",
						"type": "address"
					},
					{
						"internalType": "uint8",
						"name": "carId",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "raceId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "claimed",
						"type": "bool"
					}
				],
				"internalType": "struct FlapRace.Bet[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "getRaceInfo",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "bettingEndTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "winnerDeterminedTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "claimingStartTime",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "winner",
				"type": "uint8"
			},
			{
				"internalType": "bool",
				"name": "finalized",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "totalPool",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "nextRacePool",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "determineWinner",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "getRaceStats",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "totalBets",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalBettors",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalPool",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "getTotalBetsCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			}
		],
		"name": "getUserBet",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "user",
						"type": "address"
					},
					{
						"internalType": "uint8",
						"name": "carId",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "raceId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "claimed",
						"type": "bool"
					}
				],
				"internalType": "struct FlapRace.Bet",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getValidBetAmounts",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "isValidBetAmount",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextRaceStartTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "RACE_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "raceBets",
		"outputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint8",
				"name": "carId",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "claimed",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "races",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "raceId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "startTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "bettingEndTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "raceEndTime",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "winner",
				"type": "uint8"
			},
			{
				"internalType": "bool",
				"name": "finalized",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "totalPool",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "nextRacePool",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "setBetAmount",
		"outputs": [],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOTAL_ROUND_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userBetIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "validBetAmounts",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
] as const;

export interface RaceInfo {
  startTime: bigint;
  bettingEndTime: bigint;
  winnerDeterminedTime: bigint;
  claimingStartTime: bigint;
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
      winnerDeterminedTime: info.winnerDeterminedTime,
      claimingStartTime: info.claimingStartTime,
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
 * Determine winner for a race (calls the contract)
 * CRITICAL: This should be called by anyone once countdown finishes (10 seconds after betting closes)
 * The contract will determine the winner using blockhash + deterministic data
 */
export const determineWinner = async (
  signer: ethers.JsonRpcSigner,
  raceId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const contract = getContract(signer);
    const tx = await contract.determineWinner(raceId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error determining winner:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Error al determinar ganador',
    };
  }
};

/**
 * Calcular el seed de una carrera localmente usando la misma fórmula que el contrato
 * Esto permite que todos los clientes calculen el seed sin esperar por la transacción on-chain
 * CRITICAL: This matches the contract's seed generation exactly
 */
export const calculateRaceSeedLocally = (
  raceId: number,
  bettingEndTime: number,
  startTime: number,
  totalBets: number,
  totalPool: bigint,
  contractAddress: string
): number => {
  try {
    // Use the same formula as the contract:
    // race.raceSeed = uint256(keccak256(abi.encodePacked(
    //     raceId,
    //     race.bettingEndTime,
    //     race.startTime,
    //     totalBets,
    //     race.totalPool,
    //     address(this)
    // )));
    
    // Encode packed data (same as abi.encodePacked in Solidity)
    // In ethers v6, we use solidityPacked if available, otherwise construct manually
    let packedData: string;
    try {
      // Try using solidityPacked (ethers v6)
      packedData = ethers.solidityPacked(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
        [raceId, bettingEndTime, startTime, totalBets, totalPool, contractAddress]
      );
    } catch {
      // Fallback: manually pack data (same as abi.encodePacked)
      // Convert each value to hex and concatenate
      const raceIdHex = ethers.toBeHex(BigInt(raceId), 32).slice(2);
      const bettingEndTimeHex = ethers.toBeHex(BigInt(bettingEndTime), 32).slice(2);
      const startTimeHex = ethers.toBeHex(BigInt(startTime), 32).slice(2);
      const totalBetsHex = ethers.toBeHex(BigInt(totalBets), 32).slice(2);
      const totalPoolHex = ethers.toBeHex(totalPool, 32).slice(2);
      const addressHex = contractAddress.slice(2).toLowerCase().padStart(64, '0');
      packedData = '0x' + raceIdHex + bettingEndTimeHex + startTimeHex + totalBetsHex + totalPoolHex + addressHex;
    }
    
    // Calculate keccak256 hash
    const hash = ethers.keccak256(packedData);
    
    // Convert to uint256 (BigInt) and then to 32-bit number for PRNG
    const seedBigInt = BigInt(hash);
    const seed = Number(seedBigInt & BigInt(0xFFFFFFFF)); // Use lower 32 bits for PRNG
    
    return seed;
  } catch (error) {
    console.error('Error calculating race seed locally:', error);
    // Fallback to simple deterministic seed
    return (raceId * 7919 + bettingEndTime * 3571) >>> 0;
  }
};

/**
 * Obtener seed de una carrera directamente del contrato
 * CRITICAL: All clients MUST use this seed for synchronization
 * 
 * If seed is not generated on-chain yet, calculates it locally using race data
 */
export const getContractRaceSeed = async (
  provider: ethers.BrowserProvider,
  raceId: number
): Promise<{ seed: number; generated: boolean } | null> => {
  try {
    const contract = getContractReadOnly(provider);
    const result = await contract.getRaceSeed(raceId);
    
    // Convert BigInt to number safely (32-bit)
    const seed = Number(result.seed & BigInt(0xFFFFFFFF));
    
    // If seed is generated on-chain, use it
    if (result.generated && seed !== 0) {
      return {
        seed,
        generated: true,
      };
    }
    
    // If seed is not generated yet, calculate it locally using race data
    // This ensures the race can start immediately without waiting for the on-chain transaction
    try {
      const raceInfo = await getRaceInfo(provider, raceId);
      if (!raceInfo || Number(raceInfo.startTime) === 0) {
        return null; // Race doesn't exist yet
      }
      
      // Get total bets count
      const bets = await getRaceBets(provider, raceId);
      const totalBets = bets.length;
      
      // Calculate seed locally using the same formula as the contract
      const localSeed = calculateRaceSeedLocally(
        raceId,
        Number(raceInfo.bettingEndTime),
        Number(raceInfo.startTime),
        totalBets,
        raceInfo.totalPool,
        CONTRACT_ADDRESS
      );
      
      console.log(`[getContractRaceSeed] Calculated local seed for race ${raceId}: ${localSeed} (on-chain not generated yet)`);
      
      return {
        seed: localSeed,
        generated: false, // Mark as not generated on-chain yet
      };
    } catch (localCalcError) {
      console.error('Error calculating seed locally:', localCalcError);
      return null;
    }
  } catch (error) {
    console.error('Error getting contract race seed:', error);
    return null;
  }
};

/**
 * @deprecated Use getContractRaceSeed instead
 * Obtener seed impredecible para la carrera (OLD METHOD - NO LONGER USED)
 * Combina múltiples factores que no se conocen hasta que se cierran las apuestas:
 * 1. raceId (determinístico pero necesario para sincronización)
 * 2. bettingEndTime (timestamp cuando se cierran apuestas)
 * 3. Hash del bloque cuando se cierran las apuestas (impredecible antes de ese momento)
 * 4. Total de apuestas (impredecible antes de que se cierren)
 * 
 * Esto hace que sea prácticamente imposible predecir el resultado antes de que se cierren las apuestas
 */
export const getRaceSeed = async (
  provider: ethers.BrowserProvider,
  raceId: number,
  bettingEndTime: number,
  totalBets: number
): Promise<{ seed: number; blockHash: string }> => {
  try {
    // CRITICAL: Use deterministic block selection for all clients
    // Calculate expected block number based on bettingEndTime
    // BSC has ~3 seconds per block, so we can estimate the block number
    const currentBlock = await provider.getBlockNumber();
    const currentBlockData = await provider.getBlock(currentBlock);
    if (!currentBlockData) {
      throw new Error('Could not get current block');
    }
    
    // Calculate time difference and estimate block number
    const timeDiff = currentBlockData.timestamp - bettingEndTime;
    const estimatedBlocksAgo = Math.floor(timeDiff / 3); // ~3 seconds per block on BSC
    const targetBlockNumber = Math.max(0, currentBlock - estimatedBlocksAgo);
    
    // Get the block at the estimated position
    // This ensures all clients get the same block (or very close)
    let targetBlock = currentBlock;
    let blockHash = '';
    
    // Try to get the exact block, or the closest one before bettingEndTime
    try {
      const block = await provider.getBlock(targetBlockNumber);
      if (block && block.timestamp <= bettingEndTime) {
        targetBlock = block.number;
        blockHash = block.hash || '';
      } else {
        // If estimated block is after bettingEndTime, search backwards
        for (let i = 0; i < 20; i++) {
          const checkBlock = await provider.getBlock(targetBlockNumber - i);
          if (checkBlock && checkBlock.timestamp <= bettingEndTime) {
            targetBlock = checkBlock.number;
            blockHash = checkBlock.hash || '';
            break;
          }
        }
      }
    } catch {
      // Fallback: use current block if we can't find the target
      const block = await provider.getBlock(currentBlock);
      if (block && block.hash) {
        blockHash = block.hash;
      }
    }
    
    // CRITICAL: Convert blockHash to number using same method as RaceTrack
    // This ensures exact same conversion for all clients
    let blockHashValue = 0;
    if (blockHash) {
      const hashString = blockHash.slice(2); // Remover '0x'
      const seedString = hashString.slice(0, 16); // Primeros 16 caracteres (8 bytes)
      try {
        // Use BigInt for precision, then convert to Number
        blockHashValue = Number(BigInt('0x' + seedString) & BigInt(0xFFFFFFFF));
      } catch {
        // Fallback to parseInt if BigInt fails
        blockHashValue = parseInt(seedString, 16) & 0xFFFFFFFF;
      }
    }
    
    // CRITICAL: Combine factors in exact same order as RaceTrack
    // Order: raceId, bettingEndTime, blockHashValue, totalBets
    const seed = raceId ^ bettingEndTime ^ blockHashValue ^ totalBets;
    
    // CRITICAL: Normalize to 32-bit unsigned integer for consistent PRNG
    const normalizedSeed = (seed >>> 0);
    
    return { seed: normalizedSeed, blockHash };
  } catch (error) {
    console.error('Error getting race seed:', error);
    // Fallback: usar combinación simple si falla
    const fallbackSeed = (raceId ^ bettingEndTime ^ totalBets) >>> 0;
    return { 
      seed: fallbackSeed,
      blockHash: ''
    };
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
 * Withdraw funds from contract (owner only)
 * Only allows withdrawing funds that are not assigned to active races
 */
export const withdraw = async (
  signer: ethers.JsonRpcSigner
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const contract = getContract(signer);
    const tx = await contract.withdraw();
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error withdrawing funds:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Error al retirar fondos',
    };
  }
};

/**
 * Emergency withdraw all funds (owner only, for extreme emergencies)
 * Use with caution - may affect active races
 */
export const emergencyWithdraw = async (
  signer: ethers.JsonRpcSigner
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const contract = getContract(signer);
    const tx = await contract.emergencyWithdraw();
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error('Error emergency withdrawing funds:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Error al retirar fondos de emergencia',
    };
  }
};

/**
 * Get contract owner address
 */
export const getContractOwner = async (
  provider: ethers.BrowserProvider
): Promise<string | null> => {
  try {
    const contract = getContractReadOnly(provider);
    const owner = await contract.owner();
    return owner;
  } catch (error) {
    console.error('Error getting contract owner:', error);
    return null;
  }
};

/**
 * Get contract balance
 */
export const getContractBalance = async (
  provider: ethers.BrowserProvider
): Promise<bigint> => {
  try {
    const contract = getContractReadOnly(provider);
    const balance = await contract.getContractBalance();
    return balance;
  } catch (error) {
    console.error('Error getting contract balance:', error);
    return BigInt(0);
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
