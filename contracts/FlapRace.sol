// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlapRace
 * @dev Simplified smart contract for race betting on BNB
 * - Users can bet during 120 seconds from first bet
 * - After betting closes, 10 second countdown
 * - Winner is automatically determined using blockhash + deterministic data
 * - Winners share pool proportionally based on bet percentage
 * - Losers' bets automatically go to next race pool
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
        uint256 startTime; // When first bet was placed (starts the 120s betting period)
        uint256 bettingEndTime; // startTime + 120 seconds
        uint256 winnerDeterminedTime; // bettingEndTime + 10 seconds (countdown)
        uint256 claimingStartTime; // winnerDeterminedTime + 30 seconds (after visual race ends)
        uint8 winner; // 0 = not determined, 1-4 = winning car
        bool finalized;
        uint256 totalPool;
        uint256 nextRacePool; // Losers' funds that go to the next race pool
    }

    // Configuration
    uint256[] public validBetAmounts; // Valid bet amounts: [0.01, 0.05, 0.1, 0.5] BNB
    uint256 public constant BETTING_DURATION = 120 seconds; // 2 minutes
    uint256 public constant COUNTDOWN_DURATION = 10 seconds; // 10 seconds countdown after betting closes
    uint256 public constant RACE_VISUAL_DURATION = 30 seconds; // 30 seconds for frontend to show the race
    
    address public owner;
    uint256 public currentRaceId;
    
    // Mappings
    mapping(uint256 => Race) public races;
    mapping(uint256 => Bet[]) public raceBets; // raceId => bets
    mapping(address => mapping(uint256 => uint256)) public userBetIndex; // user => raceId => bet index
    mapping(uint256 => mapping(uint8 => uint256)) public carBetsCount; // raceId => carId => count
    mapping(uint256 => mapping(uint8 => uint256)) public carBetsAmount; // raceId => carId => total amount
    
    // Events
    event BetPlaced(address indexed user, uint256 indexed raceId, uint8 carId, uint256 amount);
    event RaceStarted(uint256 indexed raceId, uint256 startTime);
    event WinnerDetermined(uint256 indexed raceId, uint8 winner);
    event RaceFinalized(uint256 indexed raceId, uint8 winner);
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
     * First bet starts the race timer (120 seconds betting period)
     */
    function placeBet(uint8 carId) external payable {
        require(carId >= 1 && carId <= 4, "Invalid car ID");
        require(isValidBetAmount(msg.value), "Invalid bet amount. Use 0.01, 0.05, 0.1, or 0.5 BNB");
        
        uint256 raceId = getCurrentRaceId();
        Race storage race = races[raceId];
        
        // Initialize race if it doesn't exist (first bet starts the race)
        if (race.startTime == 0) {
            race.raceId = raceId;
            race.startTime = block.timestamp; // Start timer from first bet
            race.bettingEndTime = block.timestamp + BETTING_DURATION;
            race.winnerDeterminedTime = race.bettingEndTime + COUNTDOWN_DURATION;
            race.claimingStartTime = race.winnerDeterminedTime + RACE_VISUAL_DURATION;
            // Include pool from previous race if exists
            race.totalPool = race.nextRacePool;
            race.nextRacePool = 0; // Reset since it's now in totalPool
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
     * @dev Determine winner automatically using blockhash + deterministic data
     * Can be called by anyone after winnerDeterminedTime
     * Uses blockhash of the block when betting ended + race data for randomness
     * This ensures randomness while being verifiable
     */
    function determineWinner(uint256 raceId) external {
        Race storage race = races[raceId];
        require(race.startTime > 0, "Race does not exist");
        require(race.winner == 0, "Winner already determined");
        require(block.timestamp >= race.winnerDeterminedTime, "Countdown not finished yet");
        
        // Get blockhash of the block when betting ended (or closest available)
        // Use block.number - 1 to get a finalized block (blockhash is only available for last 256 blocks)
        uint256 bettingEndBlock = _getBlockNumberAtTime(race.bettingEndTime);
        bytes32 blockHash = blockhash(bettingEndBlock);
        
        // If blockhash is not available (too old), use current blockhash + race data
        // This is a fallback but still provides randomness
        if (uint256(blockHash) == 0) {
            blockHash = keccak256(abi.encodePacked(
                blockhash(block.number - 1),
                raceId,
                race.bettingEndTime,
                race.totalPool
            ));
        }
        
        // Combine blockhash with deterministic race data for additional entropy
        bytes32 randomSeed = keccak256(abi.encodePacked(
            blockHash,
            raceId,
            race.bettingEndTime,
            race.startTime,
            race.totalPool,
            raceBets[raceId].length,
            address(this)
        ));
        
        // Determine winner (1-4) using modulo
        uint8 winner = uint8((uint256(randomSeed) % 4) + 1);
        race.winner = winner;
        
        emit WinnerDetermined(raceId, winner);
        
        // Automatically finalize the race
        _finalizeRace(raceId);
    }

    /**
     * @dev Internal function to finalize race and distribute funds
     */
    function _finalizeRace(uint256 raceId) internal {
        Race storage race = races[raceId];
        require(race.winner > 0, "Winner not determined");
        require(!race.finalized, "Race already finalized");
        
        race.finalized = true;
        
        uint256 winnerPool = carBetsAmount[raceId][race.winner];
        uint256 loserPool = race.totalPool - winnerPool;
        
        // If no one bet on the winner, keep the entire pool for the next race
        if (winnerPool == 0) {
            uint256 nextRaceId = raceId + 1;
            Race storage nextRace = races[nextRaceId];
            if (nextRace.startTime == 0) {
                nextRace.raceId = nextRaceId;
                nextRace.startTime = race.claimingStartTime; // Next race starts when claiming begins
                nextRace.bettingEndTime = race.claimingStartTime + BETTING_DURATION;
                nextRace.winnerDeterminedTime = nextRace.bettingEndTime + COUNTDOWN_DURATION;
                nextRace.claimingStartTime = nextRace.winnerDeterminedTime + RACE_VISUAL_DURATION;
                nextRace.totalPool = 0;
                nextRace.nextRacePool = 0;
            }
            nextRace.nextRacePool += race.totalPool;
            race.nextRacePool = race.totalPool;
            emit NextRacePoolUpdated(nextRaceId, race.totalPool);
        } else {
            // Winners exist, losers' bets are added to the next race pool
            if (loserPool > 0) {
                uint256 nextRaceId = raceId + 1;
                Race storage nextRace = races[nextRaceId];
                if (nextRace.startTime == 0) {
                    nextRace.raceId = nextRaceId;
                    nextRace.startTime = race.winnerDeterminedTime;
                    nextRace.bettingEndTime = race.winnerDeterminedTime + BETTING_DURATION;
                    nextRace.winnerDeterminedTime = nextRace.bettingEndTime + COUNTDOWN_DURATION;
                    nextRace.totalPool = 0;
                    nextRace.nextRacePool = 0;
                }
                nextRace.nextRacePool += loserPool;
                race.nextRacePool = loserPool;
                emit NextRacePoolUpdated(nextRaceId, loserPool);
            }
        }
        
        currentRaceId = raceId;
        emit RaceFinalized(raceId, race.winner);
    }

    /**
     * @dev Helper function to estimate block number at a given timestamp
     * BSC has ~3 seconds per block
     */
    function _getBlockNumberAtTime(uint256 timestamp) internal view returns (uint256) {
        if (timestamp >= block.timestamp) {
            return block.number;
        }
        // Estimate: BSC has ~3 seconds per block
        uint256 blocksAgo = (block.timestamp - timestamp) / 3;
        if (blocksAgo > 256) {
            return block.number - 256; // blockhash only available for last 256 blocks
        }
        return block.number - blocksAgo;
    }

    /**
     * @dev Claim winnings
     * @param raceId Race ID
     * Can only be called 30 seconds after winner is determined (after visual race ends)
     */
    function claimWinnings(uint256 raceId) external nonReentrant {
        Race storage race = races[raceId];
        require(race.finalized, "Race not finalized");
        require(race.winner > 0, "No winner determined");
        require(block.timestamp >= race.claimingStartTime, "Race visual not finished yet. Wait 30 seconds after winner is determined.");
        
        uint256 betIdx = userBetIndex[msg.sender][raceId];
        require(betIdx > 0, "No bet found");
        
        Bet storage bet = raceBets[raceId][betIdx - 1];
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
        
        // Transfer winnings
        (bool success, ) = payable(msg.sender).call{value: userShare}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(msg.sender, raceId, userShare);
    }

    /**
     * @dev Get current race ID
     */
    function getCurrentRaceId() public view returns (uint256) {
        // If no races exist, return 0
        if (currentRaceId == 0 && races[0].startTime == 0) {
            return 0;
        }
        
        // If current race has been finalized, return next ID
        Race memory currentRace = races[currentRaceId];
        if (currentRace.finalized) {
            return currentRaceId + 1;
        }
        
        // If current race exists and is not finalized, return it
        if (currentRace.startTime > 0) {
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
        uint256 winnerDeterminedTime,
        uint256 claimingStartTime,
        uint8 winner,
        bool finalized,
        uint256 totalPool,
        uint256 nextRacePool
    ) {
        Race memory race = races[raceId];
        return (
            race.startTime,
            race.bettingEndTime,
            race.winnerDeterminedTime,
            race.claimingStartTime,
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
        
        // Only allow withdrawing non-committed funds
        uint256 availableFunds = balance > committedFunds ? balance - committedFunds : 0;
        require(availableFunds > 0, "All funds are committed to active races");
        
        (bool success, ) = payable(owner).call{value: availableFunds}("");
        require(success, "Withdraw failed");
        
        emit FundsWithdrawn(owner, availableFunds);
    }
    
    /**
     * @dev Withdraw all funds (owner only, for extreme emergencies)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Emergency withdraw failed");
        
        emit FundsWithdrawn(owner, balance);
    }

    /**
     * @dev Deposit funds to contract
     * Deposited BNB is added to current race pool if in betting period,
     * otherwise added to next race pool
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
                uint256 nextStartTime = currentRace.claimingStartTime > 0 
                    ? currentRace.claimingStartTime 
                    : block.timestamp;
                nextRace.raceId = nextRaceId;
                nextRace.startTime = nextStartTime;
                nextRace.bettingEndTime = nextStartTime + BETTING_DURATION;
                nextRace.winnerDeterminedTime = nextRace.bettingEndTime + COUNTDOWN_DURATION;
                nextRace.claimingStartTime = nextRace.winnerDeterminedTime + RACE_VISUAL_DURATION;
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
        deposit();
    }
}
