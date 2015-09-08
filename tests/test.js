var tape = require('tape')
var tests = require('abstract-record-store/tests')
var KadRS = require('../src')
var MerkleDAGStore = require('merkledag-store')
var multiaddr = require('multiaddr')
var Id = require('ipfs-peer-id')
var Peer = require('ipfs-peer')
var Swarm = require('ipfs-swarm')


var common = {
  setup: function (t, cb) {
    // Set up two peers full peer, pass one of the kadRS to the tests

    var mdagStoreA = new MerkleDAGStore()
    var krsA = new KadRS(mdagStoreA)

    var mdagStoreB = new MerkleDAGStore()
    var krsB = new KadRS(mdagStoreB)

    cb(null, krsA)
  },
  teardown: function (t, cb) {
    cb()
  }
}

tests(tape, common)
