# Deployment Checklist - Race Synchronization Fix

## Pre-Deployment

- [ ] Review all changes in `contracts/FlapRace.sol`
- [ ] Review all changes in `src/app/race/page.tsx`
- [ ] Review all changes in `src/app/services/flaprace.ts`
- [ ] Review all changes in `src/app/components/Race/RaceTrack.tsx`
- [ ] Read `RACE_SYNCHRONIZATION_FIX.md` thoroughly

## Contract Deployment

### Step 1: Compile Contract

1. [ ] Open [Remix IDE](https://remix.ethereum.org/)
2. [ ] Create new file `FlapRace.sol`
3. [ ] Copy contents from `contracts/FlapRace.sol`
4. [ ] Set compiler to **Solidity 0.8.19**
5. [ ] Enable optimization: **200 runs**
6. [ ] Click **Compile FlapRace.sol**
7. [ ] Verify no errors (warnings are OK)

### Step 2: Deploy Contract

1. [ ] Go to **Deploy & Run Transactions** tab
2. [ ] Set Environment to **Injected Provider - MetaMask**
3. [ ] Connect to **BSC Mainnet** (or Testnet for testing)
4. [ ] Ensure MetaMask has enough BNB for gas (~0.01 BNB)
5. [ ] Select **FlapRace** contract
6. [ ] Click **Deploy**
7. [ ] Confirm transaction in MetaMask
8. [ ] Wait for deployment confirmation
9. [ ] **Copy the contract address** (very important!)

Example: `0x1234567890abcdef1234567890abcdef12345678`

### Step 3: Verify Contract (Optional but Recommended)

1. [ ] Go to [BSCScan](https://bscscan.com/)
2. [ ] Search for your contract address
3. [ ] Click **Verify and Publish**
4. [ ] Select **Solidity (Single file)**
5. [ ] Compiler: **v0.8.19**
6. [ ] Optimization: **Yes, 200 runs**
7. [ ] Paste contract code
8. [ ] Submit verification

## Frontend Deployment

### Step 4: Update Environment Variables

1. [ ] Log into [Vercel Dashboard](https://vercel.com/dashboard)
2. [ ] Select your project
3. [ ] Go to **Settings** > **Environment Variables**
4. [ ] Find `NEXT_PUBLIC_FLAPRACE_CONTRACT_ADDRESS`
5. [ ] Update with new contract address
6. [ ] Click **Save**

### Step 5: Commit and Deploy

```bash
# Commit changes
git add .
git commit -m "fix: implement deterministic seed generation for race synchronization"
git push origin main
```

1. [ ] Push changes to GitHub
2. [ ] Vercel will automatically deploy
3. [ ] Wait for deployment to complete (2-3 minutes)
4. [ ] Check deployment status in Vercel dashboard

## Post-Deployment Testing

### Step 6: Basic Functionality Test

1. [ ] Open your deployed site
2. [ ] Connect MetaMask
3. [ ] Check that race page loads
4. [ ] Verify betting panel shows correct amounts (0.01, 0.05, 0.1, 0.5 BNB)
5. [ ] Test placing a bet (use Testnet first!)

### Step 7: Synchronization Test (CRITICAL)

1. [ ] Open race page in **Chrome**
2. [ ] Open race page in **Firefox** (or incognito Chrome)
3. [ ] Connect different wallets in each browser
4. [ ] Wait for a new race to start
5. [ ] **Check console logs in both browsers**:
   - Should see: `[Race X] ✅ Using contract seed: XXXXXXXX`
   - **Seed number must be identical in both browsers**
6. [ ] Watch the race animation in both browsers side-by-side
7. [ ] Verify:
   - [ ] Cars move in the same pattern
   - [ ] Same car is in the lead
   - [ ] Same car wins
   - [ ] Race stops at exactly 5 laps
   - [ ] No infinite looping

### Step 8: Winner Consistency Test

1. [ ] After race finishes, check both browsers
2. [ ] Verify **Visual Winner** matches **Contract Winner**
3. [ ] Check that the same car number is shown as winner in both browsers
4. [ ] If they don't match, **DO NOT PROCEED** - investigate logs

### Step 9: Console Log Check

Open browser console (F12) and verify you see:

```
✅ Good Logs:
[Race 1] ✅ Using contract seed: 1234567890
[RaceTrack] ✅ Using contract seed: 1234567890 for race 1
🏁 Race finished! Winner: Pepe (Car 3)
Race 1 finalized. Winner: Car 3. TX: 0x...

❌ Bad Logs (indicates issues):
[Race 1] Seed not available yet (seed: 0, generated: false)
[Race 1] Using contract seed: 2359959167 (then different seed later)
[Race 1] Winner mismatch! First detected: Car 3, New: Car 2
MetaMask - RPC Error: Internal JSON-RPC error.
```

### Step 10: Multiple Race Test

1. [ ] Wait for 3-4 races to complete
2. [ ] Verify each race uses a **different seed**
3. [ ] Verify all races are synchronized across browsers
4. [ ] Check previous race winner is displayed correctly

## Rollback Procedure (If Issues Found)

### If Synchronization Still Broken:

1. **Immediate Rollback**:
   ```bash
   # In Vercel, Environment Variables
   NEXT_PUBLIC_FLAPRACE_CONTRACT_ADDRESS=<OLD_CONTRACT_ADDRESS>
   ```

2. **Git Rollback**:
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Investigate**:
   - Check browser console logs
   - Check contract on BSCScan
   - Verify environment variables are correct
   - Test contract functions directly in Remix

## Success Criteria

✅ Deployment is successful if:

1. **Seed Generation**
   - Seed is generated when betting ends
   - Same seed appears in all clients
   - Seed is different for each race

2. **Race Animation**
   - Identical race progression in all browsers
   - Cars stop at exactly 5 laps
   - No infinite looping

3. **Winner Consistency**
   - Same car wins in all browsers
   - Visual winner matches contract winner
   - Winner can claim winnings successfully

4. **No Console Errors**
   - No "Seed not available yet" warnings after betting ends
   - No "Winner mismatch" warnings
   - RPC errors are minimal and don't affect functionality

## Common Issues and Solutions

### Issue: "Seed not available yet" persists

**Solution**:
- Wait 30 seconds after betting ends
- Manually call `generateRaceSeed()` from Remix
- Check MetaMask is connected
- Verify contract address is correct

### Issue: Different winners in different browsers

**Solution**:
- Clear browser cache in both browsers
- Hard refresh (Ctrl+Shift+R)
- Check console logs for seed values
- Verify both browsers are viewing the same race number

### Issue: Cars continue looping beyond 5 laps

**Solution**:
- Verify `RaceTrack.tsx` changes were deployed
- Check `TOTAL_LAPS` constant is set to 5
- Clear browser cache
- Check for JavaScript errors in console

### Issue: MetaMask RPC errors

**Solution**:
- These are often temporary network issues
- The app has retry logic built-in
- If persistent, try changing MetaMask RPC in settings
- Consider using a different RPC endpoint

### Issue: Firestore blocked (net::ERR_BLOCKED_BY_CLIENT)

**Solution**:
- Disable ad-blockers
- Add site to ad-blocker whitelist
- This doesn't affect race synchronization, only chat

## Monitoring

After deployment, monitor for:
- Contract transactions on BSCScan
- Vercel deployment logs
- User reports of desynchronization
- Console error patterns

## Support Contacts

If critical issues arise:
1. Check GitHub Issues
2. Review Vercel deployment logs
3. Inspect contract on BSCScan
4. Test in Remix IDE

---

**Remember**: The most critical test is **Step 7** - synchronization across multiple browsers. If that passes, the fix is working!

**Last Updated**: 2026-01-19
