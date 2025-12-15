use cardano/transaction.{Transaction, OutputReference}
use cardano/address.{Address}
use cardano/assets.{PolicyId, AssetName, quantity_of}
use vodka_extra_signatories.{key_signed}
use vodka_value.{get_all_value_to}
use vodka_outputs.{outputs_with_policy}
use vodka_validity_range.{valid_after, valid_before}
use vodka_address.{address_pub_key}
use aiken/collection/list
use aiken/option
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite}

pub type Schedule {
    start_time: Int,
    end_time: Int,
    total: Int,
}

pub type Governance {
    dao_signature: Option<VerificationKeyHash>,
    dao_policy_id: Option<PolicyId>,
}

pub type TreasuryDatum {
    beneficiary: Option<Address>,
    gov: Governance,
    schedule: Schedule,
    claimed: Option<Int>,
    pause_until: Option<Int>, // Posix time millisec
    policy_id: PolicyId,
    asset_name: AssetName,
    version: Int
}

pub type Actions {
    UnlockFunds(Int)
    UpdateSchedule(Schedule)
    PauseUntil(Int)
    ChangeBeneficiary(Address)
}

// ----------- Helper Functions ------------

fn scale_value(total, unlocked, mul) -> Int {
     unlocked * mul / total 
}

// There are two ways to ensure a successful authorization: 
// - providing the correct signature (assigned to `dao_signature`)
// - or, by including a UTxO containing the correct asset with dao_policy_id
fn is_authorized(datum: TreasuryDatum, tx: Transaction) -> Bool {
    list.any([
        datum.gov.dao_signature
        |> option.map(fn (pkh) { key_signed(tx.extra_signatories, pkh) })
        |> option.or_else(False),

        datum.gov.dao_policy_id
        |> option.map(fn (polId) { 
            outputs_with_policy(tx.outputs, polId ) 
            })
        |> option.and_then(fn (outs) { Some(list.length(outs) > 0) })
        |> option.or_else(False)
    ], fn (val) { val == True })
}

fn pays_to_beneficiary(tx: Transaction, datum: TreasuryDatum, q: Int) {
        let TreasuryDatum { policy_id, asset_name, .. } = datum

        datum.beneficiary
        |> option.map(fn (a) { get_all_value_to(tx.outputs, a) }) 
        |> option.map(fn (v) { quantity_of(v, policy_id, asset_name) == q })
        |> option.or_else(False)
}

// ----------- Validator Script ------------

validator daoLinearVesting() {
    spend(d: Option<TreasuryDatum>, r: Actions, _utxo: OutputReference, tx: Transaction) -> Bool {
        expect Some(datum) = d
        let now = tx.validity_range

        let lower = when now.lower_bound.bound_type is {
            Finite(i) -> i
            _ -> 0
            }
        let elapsed = 
            if valid_before(now, datum.schedule.start_time) { 0 }
            else if valid_after(now, datum.schedule.end_time) {
                datum.schedule.end_time - datum.schedule.start_time
            } else {
                // this assumes that the transaction's validity range starts at the current time
                lower
            }

        let Schedule { total, end_time, start_time } = datum.schedule
        let totalLockTime = end_time - start_time
        let duration =
            if totalLockTime < 1 { 1 }
            else { totalLockTime }
        let unlocked_fraction = elapsed * 1_000_000_000 / duration
        let unlocked_value = scale_value(total, unlocked_fraction, 1_000_000_000)
        let claimed = datum.claimed 
             |> option.map(fn (v) { v })
             |> option.or_else(0)

        let claimable = unlocked_value - claimed
        let paused = datum.pause_until
             |> option.map(fn (t) { t < lower })
             |> option.or_else(False)
        
        let gov_authorized = is_authorized(datum, tx)

        let is_signed_by_beneficiary = datum.beneficiary
             |> option.and_then(fn (a) { address_pub_key(a) })
             |> option.map(fn (v_key) { list.has(tx.extra_signatories, v_key) })
             |> option.or_else(False)

        when r is {
            UnlockFunds(amount) -> {
                expect True = !paused // Vesting isn't paused
                expect True = elapsed > 0 // Vesting schedule should be started 
                expect True = amount <= claimable // Claiming only what's currently available
                expect True = is_signed_by_beneficiary // Only beneficiary can collect funds
                expect True = pays_to_beneficiary(tx, datum, amount) // Must pay to beneficiary
                True
            }
            
            UpdateSchedule(newSchedule) -> {
                expect True = newSchedule.end_time > lower // Schedule end time is in the past
                expect True = newSchedule.end_time > newSchedule.start_time // Wrong schedule time
                expect True = gov_authorized // Not permitted to update schedule
                expect True = datum.schedule == newSchedule // Provided schedule is invalid
                // Claimed value bigger than the new total value
                expect True = datum.schedule.total > claimed
                True
            }
            
            PauseUntil(t) -> {
                expect True = t > lower // Pausing schedule in the past shouldn't be possible
                expect True = gov_authorized // Not permitted to pause schedule
                expect True = datum.pause_until
                     |> option.map(fn (until) { until == t })
                     |> option.or_else(False)  // Pause time unchanged
                True
            }
            
            ChangeBeneficiary(addr) -> {
                expect True = datum.beneficiary
                     |> option.map(fn (old_addr) { old_addr == addr })
                     |> option.or_else(False) // Key hashes are equal
                expect True = gov_authorized // Not permitted to update beneficiary
                True
            }
        }
    }
}

// ----------- Test Functions ------------


