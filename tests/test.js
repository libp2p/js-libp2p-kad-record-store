var tape = require('tape')
var tests = require('abstract-record-store/tests')
var KadRS = require('../src')
var MerkleDAGStore = require('merkledag-store')
var multiaddr = require('multiaddr')
var Id = require('ipfs-peer-id')
var Peer = require('ipfs-peer')
var Swarm = require('ipfs-swarm')
var KadRouter = require('ipfs-kad-router')

var common = {
  setup: function (t, cb) {
    // Set up two peers full peer, pass one of the kadRS to the tests

    var peerOne = new Peer(Id.create(),
        [multiaddr('/ip4/127.0.0.1/tcp/8081')])
    var swarmOne = new Swarm()
    swarmOne.listen(8081)

    var peerTwo = new Peer(Id.create(),
        [multiaddr('/ip4/127.0.0.1/tcp/8082')])

    var swarmTwo = new Swarm()
    swarmTwo.listen(8082)

    var krOne = new KadRouter(peerOne, swarmOne)
    var krTwo = new KadRouter(peerTwo, swarmTwo)

    krOne.addPeer(peerTwo)
    krTwo.addPeer(peerOne)

    var mdagStoreA = new MerkleDAGStore()
    var krsA = new KadRS(mdagStoreA, {
      swarm: swarmOne,
      kadRouter: krOne
    })

    var mdagStoreB = new MerkleDAGStore()
    var krsB = new KadRS(mdagStoreB, {
      swarm: swarmTwo,
      kadRouter: krTwo
    })

    cb(null, krsA)
  },
  teardown: function (t, cb) {
    cb()
  }
}

tests(tape, common)
