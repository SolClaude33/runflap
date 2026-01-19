// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlapRace
 * @dev Smart contract for race betting on BNB
 * - Users can choose from 4 bet amounts
 * - Winners share the pool proportionally based on their bet percentage
 * - Losers' bets are added to the next race pool
 * 
 * Security improvements:
 * - ReentrancyGuard to protect claimWinnings()
 * - Enhanced validations in finalizeRace()
 * - Protections in withdraw()
 * - Improvements in getCurrentRaceId()
 */
contract FlapRace {
    // Simple ReentrancyGuard
    bool private locked;
    
    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    // Bet structure
    struct Bet {
        address user;
        uint8 carId; // 1, 2, 3, or 4
        uint256 raceId;
        uint256 amount; // Bet amount
        bool claimed;
    }

    // Race structure
    struct Race {
        uint256 raceId;
        uint256 startTime;
        uint256 bettingEndTime;
        uint256 raceEndTime;
        uint8 winner; // 0 = not determined, 1-4 = winning car
        bool finalized;
        uint256 totalPool;
        uint256 nextRacePool; // Losers' funds that go to the next race pool
    }

    // Configuration
    uint256[] public validBetAmounts; // Valid bet amounts: [0.01, 0.05, 0.1, 0.5] BNB
    uint256 public constant BETTING_DURATION = 120 seconds; // 2 minutes
    uint256 public constant COUNTDOWN_DURATION = 5 seconds; // 5 seconds
    uint256 public constant RACE_DURATION = 30 seconds; // 30 seconds
    uint256 public constant TOTAL_ROUND_DURATION = BETTING_DURATION + COUNTDOWN_DURATION + RACE_DURATION; // ~2.5 minutes
    
    address public owner;
    uint256 public currentRaceId;
    uint256 public nextRaceStartTime;
    
    // Mappings
    mapping(uint256 => Race) public races;
    mapping(uint256 => Bet[]) public raceBets; // raceId => bets
    mapping(address => mapping(uint256 => uint256)) public userBetIndex; // user => raceId => bet index
    mapping(uint256 => mapping(uint8 => uint256)) public carBetsCount; // raceId => carId => count
    mapping(uint256 => mapping(uint8 => uint256)) public carBetsAmount; // raceId => carId => total amount
    
    // Events
    event BetPlaced(address indexed user, uint256 indexed raceId, uint8 carId, uint256 amount);
    event RaceStarted(uint256 indexed raceId, uint256 startTime);
    event RaceEnded(uint256 indexed raceId, uint8 winner);
    event WinningsClaimed(address indexed user, uint256 indexed raceId, uint256 amount);
    event NextRacePoolUpdated(uint256 indexed raceId, uint256 amount);
    event FundsDeposited(address indexed depositor, uint256 amount, uint256 raceId);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentRaceId = 0;
        nextRaceStartTime = block.timestamp;
        // Initialize valid bet amounts: 0.01, 0.05, 0.1, 0.5 BNB
        validBetAmounts.push(0.01 ether);
        validBetAmounts.push(0.05 ether);
        validBetAmounts.push(0.1 ether);
        validBetAmounts.push(0.5 ether);
    }

    /**
     * @dev Check if a bet amount is valid
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
     * @dev Place a bet
     * @param carId Car ID (1-4)
     */
    function placeBet(uint8 carId) external payable {
        require(carId >= 1 && carId <= 4, "Invalid car ID");
        require(isValidBetAmount(msg.value), "Invalid bet amount. Use 0.01, 0.05, 0.1, or 0.5 BNB");
        
        uint256 raceId = getCurrentRaceId();
        Race storage race = races[raceId];
        
        // Initialize race if it doesn't exist
        if (race.startTime == 0) {
            race.raceId = raceId;
            // Use current timestamp if nextRaceStartTime is in the past
            // This ensures the race can start immediately if the contract was deployed a while ago
            uint256 actualStartTime = nextRaceStartTime >= block.timestamp ? nextRaceStartTime : block.timestamp;
            race.startTime = actualStartTime;
            race.bettingEndTime = actualStartTime + BETTING_DURATION;
            race.raceEndTime = race.bettingEndTime + COUNTDOWN_DURATION + RACE_DURATION;
            race.totalPool = 0;
            race.nextRacePool = 0;
            emit RaceStarted(raceId, race.startTime);
        }
        
        // Verify we are in betting period
        require(block.timestamp < race.bettingEndTime, "Betting period ended");
        
        // Verify user hasn't already bet in this race
        require(userBetIndex[msg.sender][raceId] == 0, "Already bet in this race");
        
        // Register bet
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
        
        // Update counters
        carBetsCount[raceId][carId]++;
        carBetsAmount[raceId][carId] += msg.value;
        race.totalPool += msg.value;
        
        emit BetPlaced(msg.sender, raceId, carId, msg.value);
    }

    /**
     * @dev Finalize race and determine winner (owner or backend only)
     * @param raceId Race ID
     * @param winner Winning car ID (1-4)
     */
    function finalizeRace(uint256 raceId, uint8 winner) external onlyOwner {
        require(winner >= 1 && winner <= 4, "Invalid winner");
        Race storage race = races[raceId];
        require(race.startTime > 0, "Race does not exist");
        require(!race.finalized, "Race already finalized");
        require(block.timestamp >= race.raceEndTime, "Race not finished yet");
        
        // Validate that the winner has bets (prevent manipulation)
        require(carBetsAmount[raceId][winner] > 0, "Winner has no bets");
        
        race.winner = winner;
        race.finalized = true;
        
        uint256 winnerPool = carBetsAmount[raceId][winner];
        uint256 loserPool = race.totalPool - winnerPool;
        
        // Losers' bets are added to the next race pool
        if (loserPool > 0) {
            uint256 nextRaceId = raceId + 1;
            Race storage nextRace = races[nextRaceId];
            if (nextRace.startTime == 0) {
                // Initialize next race
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
        
        // Update next race start time
        nextRaceStartTime = race.raceEndTime;
        currentRaceId = raceId;
        
        emit RaceEnded(raceId, winner);
    }

    /**
     * @dev Claim winnings
     * @param raceId Race ID
     */
    function claimWinnings(uint256 raceId) external nonReentrant {
        Race storage race = races[raceId];
        require(race.finalized, "Race not finalized");
        require(race.winner > 0, "No winner determined");
        
        uint256 betIdx = userBetIndex[msg.sender][raceId];
        require(betIdx > 0, "No bet found");
        
        Bet storage bet = raceBets[raceId][betIdx - 1]; // -1 because index is 1-based
        require(bet.user == msg.sender, "Not your bet");
        require(bet.carId == race.winner, "You didn't win");
        require(!bet.claimed, "Already claimed");
        
        // Calculate winnings based on percentage
        uint256 winnerPool = carBetsAmount[raceId][race.winner];
        require(winnerPool > 0, "No winner pool");
        
        uint256 totalPool = race.totalPool + race.nextRacePool; // Include next race pool if exists
        require(totalPool > 0, "No pool available");
        
        // User receives:
        // 1. Their original bet amount back
        // 2. Plus their percentage of the prize pool based on their bet percentage of the winner pool
        // Example: If user bet 0.1 BNB and winner pool is 0.5 BNB, they get 20% of prize pool
        uint256 userPercentageOfPool = (bet.amount * totalPool) / winnerPool;
        uint256 userShare = bet.amount + userPercentageOfPool;
        require(userShare > 0, "Share is zero");
        require(address(this).balance >= userShare, "Insufficient contract balance");
        
        // Mark as claimed BEFORE transferring (Checks-Effects-Interactions pattern)
        bet.claimed = true;
        
        // Transfer winnings using sendValue pattern (safer than call)
        (bool success, ) = payable(msg.sender).call{value: userShare}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(msg.sender, raceId, userShare);
    }

    /**
     * @dev Get current race ID
     * Handles edge cases where races may not be sequential
     */
    function getCurrentRaceId() public view returns (uint256) {
        // If no races exist, return 0
        if (currentRaceId == 0 && races[0].startTime == 0) {
            return 0;
        }
        
        // If current race has ended, look for the next one
        Race memory currentRace = races[currentRaceId];
        if (currentRace.raceEndTime > 0 && block.timestamp >= currentRace.raceEndTime) {
            // Check if next race exists and is active
            uint256 nextId = currentRaceId + 1;
            Race memory nextRace = races[nextId];
            if (nextRace.startTime > 0 && block.timestamp < nextRace.raceEndTime) {
                return nextId;
            }
            // If it doesn't exist, return next ID (will be created in placeBet)
            return nextId;
        }
        
        // If current race is active, return it
        if (currentRace.startTime > 0 && block.timestamp < currentRace.raceEndTime) {
            return currentRaceId;
        }
        
        // Fallback: return currentRaceId
        return currentRaceId;
    }

    /**
     * @dev Get race information
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
     * @dev Get bets for a race
     */
    function getRaceBets(uint256 raceId) external view returns (Bet[] memory) {
        return raceBets[raceId];
    }

    /**
     * @dev Get betting statistics per car
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
     * @dev Check if a user can bet
     */
    function canBet(address user, uint256 raceId) external view returns (bool) {
        return userBetIndex[user][raceId] == 0;
    }

    /**
     * @dev Get user's bet
     */
    function getUserBet(address user, uint256 raceId) external view returns (Bet memory) {
        uint256 betIdx = userBetIndex[user][raceId];
        if (betIdx == 0) {
            revert("No bet found");
        }
        return raceBets[raceId][betIdx - 1];
    }

    /**
     * @dev Get valid bet amounts
     */
    function getValidBetAmounts() external view returns (uint256[] memory) {
        return validBetAmounts;
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get race statistics
     * @return totalBets Total number of bets
     * @return totalBettors Total number of bettors
     * @return totalPool Total pool amount
     */
    function getRaceStats(uint256 raceId) external view returns (
        uint256 totalBets,
        uint256 totalBettors,
        uint256 totalPool
    ) {
        Race memory race = races[raceId];
        totalBets = raceBets[raceId].length;
        totalBettors = totalBets; // Each bet is from a different person (1 bet per wallet)
        totalPool = race.totalPool + race.nextRacePool;
    }

    /**
     * @dev Get total number of bets for a race
     */
    function getTotalBetsCount(uint256 raceId) external view returns (uint256) {
        return raceBets[raceId].length;
    }

    /**
     * @dev Change bet amount (owner only, for future adjustments)
     */
    function setBetAmount(uint256 /* newAmount */) external view onlyOwner {
        // This function would require changing BET_AMOUNT to a variable
        // For now it's commented, can be implemented if needed
        revert("Not implemented - use constant BET_AMOUNT");
    }

    /**
     * @dev Withdraw funds from contract (owner only, for emergencies)
     * Only allows withdrawing funds that are not assigned to active races
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // Calculate committed funds in non-finalized races
        uint256 committedFunds = 0;
        uint256 currentId = getCurrentRaceId();
        
        // Sum funds from non-finalized races
        for (uint256 i = 0; i <= currentId; i++) {
            Race memory race = races[i];
            if (race.startTime > 0 && !race.finalized) {
                committedFunds += race.totalPool + race.nextRacePool;
            }
        }
        
        // Only allow withdrawing non-committed funds (with small buffer for gas)
        uint256 availableFunds = balance > committedFunds ? balance - committedFunds : 0;
        require(availableFunds > 0, "All funds are committed to active races");
        
        (bool success, ) = payable(owner).call{value: availableFunds}("");
        require(success, "Withdraw failed");
        
        emit FundsWithdrawn(owner, availableFunds);
    }
    
    /**
     * @dev Withdraw all funds (owner only, for extreme emergencies)
     * Use with caution - may affect active races
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Emergency withdraw failed");
        
        emit FundsWithdrawn(owner, balance);
    }

    /**
     * @dev Deposit funds to contract (for trading fees or manual deposits)
     * Deposited BNB is added to current race pool if in betting period,
     * otherwise added to next race pool
     * 
     * Note: Anyone can deposit (including automatic trading fees)
     * This is intentional to allow fees to be added automatically
     */
    function deposit() public payable {
        require(msg.value > 0, "Must send BNB");
        
        uint256 raceId = getCurrentRaceId();
        Race storage currentRace = races[raceId];
        
        // If there's an active race in betting period, add to current pool
        if (currentRace.startTime > 0 && block.timestamp < currentRace.bettingEndTime) {
            currentRace.totalPool += msg.value;
        } else {
            // If no active race or it ended, add to next race pool
            uint256 nextRaceId = raceId + 1;
            Race storage nextRace = races[nextRaceId];
            if (nextRace.startTime == 0) {
                // Initialize if it doesn't exist
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
        
        emit FundsDeposited(msg.sender, msg.value, raceId);
    }

    /**
     * @dev Receive BNB (for trading fees that will be added automatically)
     */
    receive() external payable {
        // Call deposit() to handle the deposit
        deposit();
    }
}
