use cardano/address.{Credential, Address}
use cardano/transaction.{Transaction, Output, OutputReference, InlineDatum}
use cardano/assets.{Value, PolicyId, AssetName, quantity_of}
use vodka_extra_signatories.{key_signed}
use vodka_value.{value_policy_info, get_all_value_to}
use vodka_outputs.{outputs_with_policy, output_inline_datum}
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

validator foo {
    spend(d: Option<TreasuryDatum>, r: Data, _utxo: OutputReference, _tx: Transaction) {
        expect Some(datum) = d
        let TreasuryDatum { beneficiary, gov, schedule, claimed, pause_until, policy_id, asset_name, version } = datum
        True
    }
}
