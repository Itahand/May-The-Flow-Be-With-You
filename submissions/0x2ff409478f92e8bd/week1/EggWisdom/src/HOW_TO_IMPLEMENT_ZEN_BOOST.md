# Zen Token Distribution and Boost System Implementation

This document outlines how to implement the Zen token distribution and boost mechanism in the EggWisdom ecosystem based on the existing codebase.

## 1. Distribution Based on Zen Total Supply

The distribution of Flow rewards should change dynamically based on the total Zen token supply according to this table:

| Zen Total Supply | Platform % | Uploader % |
|------------------|------------|------------|
| 0 - 10,000       | 50%        | 50%        |
| 10,001 - 50,000  | 45%        | 55%        |
| 50,001 - 100,000 | 40%        | 60%        |
| 100,001 - 250,000| 35%        | 65%        |
| 250,001 - 500,000| 30%        | 70%        |
| 500,001 - 1M     | 25%        | 75%        |
| 1M+              | 20%        | 80%        |

## 2. Boost Mechanism

Users can burn Zen tokens to receive a temporary boost that doubles their rewards for a set period of time:

| Zen Burned | Boost Duration | Flow reward % |
|------------|----------------| ------------- |
| 5,000 Zen  | 3 days         | 1.4x
| 15,000 Zen  | 10 days        | 1.5x
| 30,000 Zen | 20 days        | 1.6x

## 3. Implementation Details

### 3.1 Add to EggWisdom Contract

The following structures and fields need to be added to the EggWisdom contract:

```cadence
// User boost tracking - maps user addresses to expiration timestamps
access(self) let userBoosts: {Address: UFix64}

// Distribution struct for managing reward distribution
access(all)
struct RewardDistribution {
    access(all) let platformPercentage: UFix64
    access(all) let uploaderPercentage: UFix64

    init(platformPercentage: UFix64, uploaderPercentage: UFix64) {
        self.platformPercentage = platformPercentage
        self.uploaderPercentage = uploaderPercentage
    }
}

// Add new event for boost tracking
access(all) event ZenBurnedForBoost(amount: UFix64, user: Address, boostDuration: UFix64)
```

### 3.2 Add Helper Functions

Add these helper functions to determine distribution and check boost status:

```cadence
// Calculate reward distribution based on current Zen total supply
access(all) 
fun getRewardDistribution(): RewardDistribution {
    let supply = Zen.totalSupply

    if supply <= 10000.0 {
        return RewardDistribution(platformPercentage: 0.7, uploaderPercentage: 0.3)
    } else if supply <= 50000.0 {
        return RewardDistribution(platformPercentage: 0.65, uploaderPercentage: 0.35)
    } else if supply <= 100000.0 {
        return RewardDistribution(platformPercentage: 0.6, uploaderPercentage: 0.4)
    } else if supply <= 250000.0 {
        return RewardDistribution(platformPercentage: 0.5, uploaderPercentage: 0.5)
    } else if supply <= 500000.0 {
        return RewardDistribution(platformPercentage: 0.4, uploaderPercentage: 0.6)
    } else if supply <= 1000000.0 {
        return RewardDistribution(platformPercentage: 0.3, uploaderPercentage: 0.7)
    } else {
        return RewardDistribution(platformPercentage: 0.2, uploaderPercentage: 0.8)
    }
}

// Check if a user has an active boost
access(all)
fun userHasActiveBoost(user: Address): Bool {
    if let expirationTime = self.userBoosts[user] {
        return expirationTime > getCurrentBlock().timestamp
    }
    return false
}

// Get boost multiplier for a user (2.0 if boosted, 1.0 if not)
access(all)
fun getUserBoostMultiplier(user: Address): UFix64 {
    return self.userHasActiveBoost(user: user) ? 2.0 : 1.0
}
```

### 3.3 Create a Transaction for Burning Zen Tokens

Create a transaction that allows users to burn Zen tokens for boosts:

```cadence
import "EggWisdom"
import "Zen"
import "FungibleToken"

transaction(amount: UFix64) {
    prepare(signer: auth(BorrowValue, WithdrawValue) &Account) {
        // Check that the amount is at least 1000 Zen
        pre {
            amount >= 1000.0: "Must burn at least 1000 Zen for a boost"
        }
        
        // Get the user's Zen vault
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &Zen.Vault>(from: Zen.TokenStoragePath)
            ?? panic("Could not borrow reference to Zen vault")
            
        // Get a Zen Burner reference
        let zenBurner = EggWisdom.account.storage.borrow<auth(Zen.BurnerEntitlement) &Zen.Burner>(from: /storage/ZenBurner)
            ?? panic("Could not borrow Zen Burner")
            
        // Calculate the boost duration based on amount
        var boostDuration: UFix64 = 0.0
        
        if amount >= 10000.0 {
            boostDuration = 7776000.0 // 90 days
        } else if amount >= 5000.0 {
            boostDuration = 2592000.0 // 30 days
        } else {
            boostDuration = 604800.0 // 7 days
        }
        
        // Set the user's boost expiration time
        let currentTimestamp = getCurrentBlock().timestamp
        EggWisdom.userBoosts[signer.address] = currentTimestamp + boostDuration
        
        // Withdraw and burn the Zen tokens
        let zenVault <- vaultRef.withdraw(amount: amount)
        zenBurner.burnTokens(from: <-zenVault)
        
        // Emit the boost event
        emit EggWisdom.ZenBurnedForBoost(
            amount: amount, 
            user: signer.address, 
            boostDuration: boostDuration
        )
    }
}
```

### 3.4 Update Reward Functions

Modify the existing reward functions in EggWisdom.cdc to use the distribution logic and apply boost multipliers:

1. In `petEgg`:
   - Calculate distribution using `getRewardDistribution()`
   - Apply boost multiplier to Zen rewards using `getUserBoostMultiplier()`
   - Distribute Flow based on percentages

2. In `mintWisdomEgg`:
   - Split payments based on distribution percentages
   - Apply boost multipliers to Zen rewards

3. In `revealPhrase`:
   - Apply distribution percentages to pool royalties
   - Apply boost multiplier to Zen rewards

## 4. Initialize in Contract Constructor

Add to the EggWisdom contract's constructor:

```cadence
init() {
    // ... existing initialization code ...
    
    // Initialize user boosts dictionary
    self.userBoosts = {}
    
    // ... rest of the init function ...
}
```

## 5. Benefits of This Implementation

1. **Dynamic Distribution**: As the Zen ecosystem matures, more rewards go to content creators
2. **Incentivized Burning**: Users can burn Zen for temporary boosts, creating token scarcity
3. **Fair Rewards**: Higher rewards for active participants through the boost system
4. **Economic Balance**: As Zen supply increases, distribution shifts from platform to community 