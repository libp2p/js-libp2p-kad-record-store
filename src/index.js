var MerkleDAGStore = require('merkledag-store')
var iprs = require('ipfs-record')
var ipld = require('ipld')
var multihashing = require('multihashing')

exports = module.exports = kadRS

function kadRS (mdagStore, options) {
  var self = this

  if (!(self instanceof kadRS)) {
    throw new Error('DRS must be called with new')
  }

  self.mdagStore = mdagStore || new MerkleDAGStore()
  self.mapping = {} // {key: [recordSignatureHash]}

  self.get = function (key, callback) {
    // find peers
    // ask everyone for that given key
    // store every tripplet in the mdagStore
    // return all the recordSignatures
  }

  self.put = function (key, recordSignature, callback) {
    // 1. find the peers to put the Record into
    // 2. store in those peers and us too
  }

  // add a network handler to swarm for kadRS /kad-record-store/1.0.0/
  // check validity before sending
}
