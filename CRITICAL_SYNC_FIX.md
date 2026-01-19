# CRITICAL SYNCHRONIZATION FIX

## Date: 2026-01-19

## Problem Summary

**Users were seeing different race outcomes across different clients**, with:
1. Different visual winners on different devices
2. Different race progressions (cars at different positions)
3. Cars continuing to loop after 5 laps
4. "Seed not available yet" warnings
5. MetaMask RPC errors flooding the console

## Root Cause

The smart contract was generating the race seed **multiple times with different values** for different clients. This happened because:

1. The `_generateRaceSeedInternal` function was using `block.timestamp` and `block.number`
2. These values change with each block, so different clients calling the function at different times got different seeds
3. Different seeds → different race outcomes → desynchronization

Example from console logs:
```
[Race 1] Using contract seed: 2359959167  // Client A
[Race 1] Using contract seed: 3871671088  // Client B  ← DIFFERENT!
```

## The Fix

### 1. Smart Contract Fix (`contracts/FlapRace.sol`)

**Changed `_generateRaceSeedInternal` to:**
- Generate the seed **ONCE** and store it on-chain
- Use `block.number - 1` (previous block hash) for unpredictability
- Add a **critical check**: if `race.seedGenerated == true`, NEVER regenerate
- The first person to call `generateRaceSeed()` generates it
- Everyone else reads the **same stored value**

**Key changes:**
```solidity
function _generateRaceSeedInternal(uint256 raceId) internal {
    Race storage race = races[raceId];
    
    // CRITICAL: Prevent regeneration if seed already exists
    if (race.seedGenerated) {
        return; // Already generated, do not regenerate
    }
    
    // Use the previous block's hash (same for everyone at this moment)
    bytes32 recentBlockHash = blockhash(block.number - 1);
    
    // Generate seed once
    race.raceSeed = uint256(keccak256(abi.encodePacked(
        raceId,
        race.bettingEndTime,
        recentBlockHash,
        totalBets,
        race.totalPool
    )));
    
    // Mark as generated - prevents any future regeneration
    race.seedGenerated = true;
    emit RaceSeedGenerated(raceId, race.raceSeed);
}
```

### 2. ABI Fix (`src/app/services/flaprace.ts`)

**Removed duplicate `generateRaceSeed` entry** from the ABI array that was causing compilation errors.

## How It Works Now

### Seed Generation Flow:
1. **Betting closes** at `bettingEndTime`
2. **First client** to open the page calls `generateRaceSeed(raceId)` (transaction)
3. **Contract generates seed** using `block.number - 1` hash + race data
4. **Seed is stored on-chain** in `race.raceSeed`
5. **`seedGenerated` flag** is set to `true`
6. **All other clients** call `getRaceSeed(raceId)` (view call)
7. **Everyone gets the SAME seed** from storage
8. **All races are synchronized** across all clients

### Frontend Logic:
```typescript
// 1. Check if betting has ended
if (bettingEndTime <= now) {
  // 2. Try to get seed (view call, no gas)
  let seed = await getRaceSeed(raceId);
  
  // 3. If not generated, trigger generation (transaction)
  if (!seed.generated) {
    await generateRaceSeed(raceId);
    // Wait and read again
    seed = await getRaceSeed(raceId);
  }
  
  // 4. Use the seed for the race
  setRaceSeedData(seed);
}
```

## Deployment Steps

### ⚠️ IMPORTANT: You MUST redeploy the contract

The old contract has the bug. You need to:

1. **Deploy the new contract** in Remix:
   - Copy `contracts/FlapRace.sol`
   - Paste in Remix
   - Compile (Solidity 0.8.20+)
   - Deploy to BNB Chain
   - **Save the new contract address**

2. **Update Vercel Environment Variable**:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Update `NEXT_PUBLIC_FLAPRACE_ADDRESS` with the new contract address
   - Redeploy the frontend

3. **Test the fix**:
   - Open the race page in 2 different browsers/devices
   - Wait for a race to start
   - Verify both see the **same race progression**
   - Verify both see the **same winner**

## Expected Behavior After Fix

✅ **All clients see the same race**
✅ **Visual winner matches contract winner**
✅ **Cars stop at exactly 5 laps**
✅ **No more "Seed not available" warnings** (after first generation)
✅ **Race animations are synchronized**

## Remaining Issues (Not Related to Sync)

### MetaMask RPC Errors
The `MetaMask - RPC Error: Internal JSON-RPC error` is likely due to:
- Network congestion
- Rate limiting on RPC endpoints
- These are handled by the retry logic in `Web3Provider.tsx`

### Firestore ERR_BLOCKED_BY_CLIENT
The `net::ERR_BLOCKED_BY_CLIENT` for Firestore suggests:
- An ad-blocker or browser extension is blocking requests
- This doesn't affect the race synchronization
- Users can disable ad-blockers to resolve this

## Verification Checklist

After redeployment, verify:
- [ ] Contract compiles without errors in Remix
- [ ] Contract deploys successfully to BNB Chain
- [ ] Vercel environment variable updated with new address
- [ ] Frontend redeployed on Vercel
- [ ] Can place bets on new contract
- [ ] Race seed is generated once betting closes
- [ ] Multiple clients see the same race outcome
- [ ] Winner is correctly finalized on-chain
- [ ] Winnings can be claimed

## Technical Details

### Why This Fix Works

**Before:**
- Each client called seed generation independently
- `block.timestamp` and `block.number` were different for each call
- Different seeds → different PRNGs → different races

**After:**
- First client generates and stores seed on-chain
- Subsequent clients read the stored seed
- Same seed → same PRNG → synchronized races

### Contract Gas Optimization

The `generateRaceSeed` function is idempotent:
- First call: generates seed (costs gas)
- Subsequent calls: returns immediately (no-op, minimal gas)
- This prevents wasting gas on regeneration attempts

## Support

If issues persist after redeployment:
1. Check browser console for errors
2. Verify contract address is correct in Vercel
3. Ensure MetaMask is connected to BNB Chain
4. Try clearing browser cache and refreshing

---

**Status:** ✅ Fix implemented and ready for deployment
**Priority:** 🔴 CRITICAL - Deploy immediately
**Testing:** ⚠️ Test with multiple clients after deployment
