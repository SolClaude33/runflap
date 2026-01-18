// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlapRace
 * @dev Contrato para apuestas de carreras en BNB
 * - Los usuarios pueden elegir entre 4 montos de apuesta
 * - Los ganadores se reparten el pozo según su porcentaje de apuesta
 * - Los perdedores se suman al siguiente pozo
 */
contract FlapRace {
    // Estructura para una apuesta
    struct Bet {
        address user;
        uint8 carId; // 1, 2, 3, o 4
        uint256 raceId;
        uint256 amount; // Monto apostado
        bool claimed;
    }

    // Estructura para una carrera
    struct Race {
        uint256 raceId;
        uint256 startTime;
        uint256 bettingEndTime;
        uint256 raceEndTime;
        uint8 winner; // 0 = no determinado, 1-4 = auto ganador
        bool finalized;
        uint256 totalPool;
        uint256 nextRacePool; // Dinero de perdedores que va al siguiente pozo
    }

    // Configuración
    uint256[] public validBetAmounts; // Montos válidos de apuesta: [0.01, 0.05, 0.1, 0.5] BNB
    uint256 public constant BETTING_DURATION = 120 seconds; // 2 minutos
    uint256 public constant COUNTDOWN_DURATION = 5 seconds; // 5 segundos
    uint256 public constant RACE_DURATION = 30 seconds; // 30 segundos
    uint256 public constant TOTAL_ROUND_DURATION = BETTING_DURATION + COUNTDOWN_DURATION + RACE_DURATION; // ~2.5 minutos
    
    address public owner;
    uint256 public currentRaceId;
    uint256 public nextRaceStartTime;
    
    // Mapeos
    mapping(uint256 => Race) public races;
    mapping(uint256 => Bet[]) public raceBets; // raceId => bets
    mapping(address => mapping(uint256 => uint256)) public userBetIndex; // user => raceId => bet index
    mapping(uint256 => mapping(uint8 => uint256)) public carBetsCount; // raceId => carId => count
    mapping(uint256 => mapping(uint8 => uint256)) public carBetsAmount; // raceId => carId => total amount
    
    // Eventos
    event BetPlaced(address indexed user, uint256 indexed raceId, uint8 carId, uint256 amount);
    event RaceStarted(uint256 indexed raceId, uint256 startTime);
    event RaceEnded(uint256 indexed raceId, uint8 winner);
    event WinningsClaimed(address indexed user, uint256 indexed raceId, uint256 amount);
    event NextRacePoolUpdated(uint256 indexed raceId, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentRaceId = 0;
        nextRaceStartTime = block.timestamp;
        // Inicializar montos válidos de apuesta: 0.01, 0.05, 0.1, 0.5 BNB
        validBetAmounts.push(0.01 ether);
        validBetAmounts.push(0.05 ether);
        validBetAmounts.push(0.1 ether);
        validBetAmounts.push(0.5 ether);
    }

    /**
     * @dev Verificar si un monto de apuesta es válido
     */
    function isValidBetAmount(uint256 amount) public view returns (bool) {
        for (uint256 i = 0; i < validBetAmounts.length; i++) {
            if (validBetAmounts[i] == amount) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Colocar una apuesta
     * @param carId ID del auto (1-4)
     */
    function placeBet(uint8 carId) external payable {
        require(carId >= 1 && carId <= 4, "Invalid car ID");
        require(isValidBetAmount(msg.value), "Invalid bet amount. Use 0.01, 0.05, 0.1, or 0.5 BNB");
        
        uint256 raceId = getCurrentRaceId();
        Race storage race = races[raceId];
        
        // Inicializar carrera si no existe
        if (race.startTime == 0) {
            race.raceId = raceId;
            race.startTime = nextRaceStartTime;
            race.bettingEndTime = nextRaceStartTime + BETTING_DURATION;
            race.raceEndTime = race.bettingEndTime + COUNTDOWN_DURATION + RACE_DURATION;
            race.totalPool = 0;
            race.nextRacePool = 0;
            emit RaceStarted(raceId, race.startTime);
        }
        
        // Verificar que estamos en periodo de apuestas
        require(block.timestamp < race.bettingEndTime, "Betting period ended");
        
        // Verificar que el usuario no haya apostado ya en esta carrera
        require(userBetIndex[msg.sender][raceId] == 0, "Already bet in this race");
        
        // Registrar apuesta
        Bet memory newBet = Bet({
            user: msg.sender,
            carId: carId,
            raceId: raceId,
            amount: msg.value,
            claimed: false
        });
        
        raceBets[raceId].push(newBet);
        uint256 betIndex = raceBets[raceId].length;
        userBetIndex[msg.sender][raceId] = betIndex;
        
        // Actualizar contadores
        carBetsCount[raceId][carId]++;
        carBetsAmount[raceId][carId] += msg.value;
        race.totalPool += msg.value;
        
        emit BetPlaced(msg.sender, raceId, carId, msg.value);
    }

    /**
     * @dev Finalizar carrera y determinar ganador (solo owner o backend)
     * @param raceId ID de la carrera
     * @param winner ID del auto ganador (1-4)
     */
    function finalizeRace(uint256 raceId, uint8 winner) external onlyOwner {
        require(winner >= 1 && winner <= 4, "Invalid winner");
        Race storage race = races[raceId];
        require(!race.finalized, "Race already finalized");
        require(block.timestamp >= race.raceEndTime, "Race not finished yet");
        
        race.winner = winner;
        race.finalized = true;
        
        uint256 winnerPool = carBetsAmount[raceId][winner];
        uint256 loserPool = race.totalPool - winnerPool;
        
        // Los perdedores se suman al siguiente pozo
        if (loserPool > 0) {
            uint256 nextRaceId = raceId + 1;
            Race storage nextRace = races[nextRaceId];
            if (nextRace.startTime == 0) {
                // Inicializar siguiente carrera
                nextRace.raceId = nextRaceId;
                nextRace.startTime = race.raceEndTime;
                nextRace.bettingEndTime = race.raceEndTime + BETTING_DURATION;
                nextRace.raceEndTime = nextRace.bettingEndTime + COUNTDOWN_DURATION + RACE_DURATION;
                nextRace.totalPool = 0;
                nextRace.nextRacePool = 0;
            }
            nextRace.nextRacePool += loserPool;
            race.nextRacePool = loserPool;
            emit NextRacePoolUpdated(nextRaceId, loserPool);
        }
        
        // Actualizar tiempo de inicio de siguiente carrera
        nextRaceStartTime = race.raceEndTime;
        currentRaceId = raceId;
        
        emit RaceEnded(raceId, winner);
    }

    /**
     * @dev Reclamar ganancias
     * @param raceId ID de la carrera
     */
    function claimWinnings(uint256 raceId) external {
        Race storage race = races[raceId];
        require(race.finalized, "Race not finalized");
        require(race.winner > 0, "No winner determined");
        
        uint256 betIdx = userBetIndex[msg.sender][raceId];
        require(betIdx > 0, "No bet found");
        
        Bet storage bet = raceBets[raceId][betIdx - 1]; // -1 porque el índice es 1-based
        require(bet.user == msg.sender, "Not your bet");
        require(bet.carId == race.winner, "You didn't win");
        require(!bet.claimed, "Already claimed");
        
        // Calcular ganancias según porcentaje
        uint256 winnerPool = carBetsAmount[raceId][race.winner];
        uint256 totalPool = race.totalPool + race.nextRacePool; // Incluir pozo del siguiente si existe
        // El usuario recibe su porcentaje del pozo total basado en su apuesta
        uint256 userShare = (bet.amount * totalPool) / winnerPool;
        
        bet.claimed = true;
        
        // Transferir ganancias
        (bool success, ) = msg.sender.call{value: userShare}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(msg.sender, raceId, userShare);
    }

    /**
     * @dev Obtener ID de carrera actual
     */
    function getCurrentRaceId() public view returns (uint256) {
        if (races[currentRaceId].raceEndTime > 0 && block.timestamp >= races[currentRaceId].raceEndTime) {
            return currentRaceId + 1;
        }
        return currentRaceId;
    }

    /**
     * @dev Obtener información de una carrera
     */
    function getRaceInfo(uint256 raceId) external view returns (
        uint256 startTime,
        uint256 bettingEndTime,
        uint256 raceEndTime,
        uint8 winner,
        bool finalized,
        uint256 totalPool,
        uint256 nextRacePool
    ) {
        Race memory race = races[raceId];
        return (
            race.startTime,
            race.bettingEndTime,
            race.raceEndTime,
            race.winner,
            race.finalized,
            race.totalPool,
            race.nextRacePool
        );
    }

    /**
     * @dev Obtener apuestas de una carrera
     */
    function getRaceBets(uint256 raceId) external view returns (Bet[] memory) {
        return raceBets[raceId];
    }

    /**
     * @dev Obtener estadísticas de apuestas por auto
     */
    function getCarStats(uint256 raceId) external view returns (
        uint256[4] memory counts,
        uint256[4] memory amounts
    ) {
        for (uint8 i = 1; i <= 4; i++) {
            counts[i-1] = carBetsCount[raceId][i];
            amounts[i-1] = carBetsAmount[raceId][i];
        }
    }

    /**
     * @dev Verificar si un usuario puede apostar
     */
    function canBet(address user, uint256 raceId) external view returns (bool) {
        return userBetIndex[user][raceId] == 0;
    }

    /**
     * @dev Obtener apuesta de un usuario
     */
    function getUserBet(address user, uint256 raceId) external view returns (Bet memory) {
        uint256 betIdx = userBetIndex[user][raceId];
        if (betIdx == 0) {
            revert("No bet found");
        }
        return raceBets[raceId][betIdx - 1];
    }

    /**
     * @dev Obtener montos válidos de apuesta
     */
    function getValidBetAmounts() external view returns (uint256[] memory) {
        return validBetAmounts;
    }

    /**
     * @dev Obtener balance del contrato
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Obtener estadísticas de una carrera
     * @return totalBets Cantidad total de apuestas
     * @return totalBettors Cantidad de personas que apostaron
     * @return totalPool Monto total del pozo
     */
    function getRaceStats(uint256 raceId) external view returns (
        uint256 totalBets,
        uint256 totalBettors,
        uint256 totalPool
    ) {
        Race memory race = races[raceId];
        totalBets = raceBets[raceId].length;
        totalBettors = totalBets; // Cada apuesta es de una persona diferente (1 apuesta por wallet)
        totalPool = race.totalPool + race.nextRacePool;
    }

    /**
     * @dev Obtener cantidad de apuestas por auto
     */
    function getTotalBetsCount(uint256 raceId) external view returns (uint256) {
        return raceBets[raceId].length;
    }

    /**
     * @dev Cambiar monto de apuesta (solo owner, para ajustes futuros)
     */
    function setBetAmount(uint256 newAmount) external onlyOwner {
        // Esta función requeriría cambiar BET_AMOUNT a una variable
        // Por ahora la dejamos comentada, se puede implementar si es necesario
        revert("Not implemented - use constant BET_AMOUNT");
    }

    /**
     * @dev Retirar fondos del contrato (solo owner, para emergencias)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev Depositar fondos al contrato (para fees del trading o depósitos manuales)
     * El BNB depositado se suma al pozo de la carrera actual si está en periodo de apuestas,
     * de lo contrario se suma al siguiente pozo
     */
    function deposit() external payable {
        require(msg.value > 0, "Must send BNB");
        
        uint256 currentRaceId = getCurrentRaceId();
        Race storage currentRace = races[currentRaceId];
        
        // Si hay una carrera activa y está en periodo de apuestas, sumar al pozo actual
        if (currentRace.startTime > 0 && block.timestamp < currentRace.bettingEndTime) {
            currentRace.totalPool += msg.value;
        } else {
            // Si no hay carrera activa o ya terminó, sumar al siguiente pozo
            uint256 nextRaceId = currentRaceId + 1;
            Race storage nextRace = races[nextRaceId];
            if (nextRace.startTime == 0) {
                // Inicializar si no existe
                uint256 currentRaceEnd = currentRace.raceEndTime;
                if (currentRaceEnd == 0) {
                    currentRaceEnd = block.timestamp;
                }
                nextRace.raceId = nextRaceId;
                nextRace.startTime = currentRaceEnd;
                nextRace.bettingEndTime = currentRaceEnd + BETTING_DURATION;
                nextRace.raceEndTime = nextRace.bettingEndTime + COUNTDOWN_DURATION + RACE_DURATION;
                nextRace.totalPool = 0;
                nextRace.nextRacePool = 0;
            }
            nextRace.nextRacePool += msg.value;
        }
    }

    /**
     * @dev Recibir BNB (para fees del trading que se agregarán automáticamente)
     */
    receive() external payable {
        // Llamar a deposit() para manejar el depósito
        deposit();
    }
}
