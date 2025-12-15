use cardano/assets.{PolicyId}
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}
 
validator justMint {
  mint(_redeemer: Data, _policy_id: PolicyId, _: Transaction) {
      True
   }
}


pub type Datum {
  owner: VerificationKeyHash,
}
 
pub type Redeemer {
  msg: ByteArray,
}
 
validator hello_world {
  spend(
    _datum: Option<Datum>,
    redeemer: Redeemer,
    _own_ref: OutputReference,
    _self: Transaction,
  ) {
    let must_say_hello = redeemer.msg == "Hello, World!"
    must_say_hello 
  }
}
