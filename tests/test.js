var tape = require('tape')
var tests = require('abstract-record-store/tests')
var KadRS = require('../src')
var MerkleDAGStore = require('merkledag-store')
var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Peer = require('peer-info')
var Swarm = require('libp2p-swarm')
var KadRouter = require('libp2p-kad-routing')
var tcp = require('libp2p-tcp')
var Spdy = require('libp2p-spdy')

var common = {
  setup: function (t, cb) {
    // Set up two peers full peer, pass one of the kadRS to the tests

    var mh1 = multiaddr('/ip4/127.0.0.1/tcp/8081')
    var p1 = new Peer(Id.create(), [])
    var sw1 = new Swarm(p1)
    sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8081}, ready)

    var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8082')
    var p2 = new Peer(Id.create(), [])
    var sw2 = new Swarm(p2)
    sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8082}, ready)

    var counter = 0

    function ready () {
      counter++
      if (counter < 2) {
        return
      }
      sw1.addStreamMuxer('spdy', Spdy, {})
      sw1.enableIdentify()
      sw2.addStreamMuxer('spdy', Spdy, {})
      sw2.enableIdentify()

      var krOne = new KadRouter(p1, sw1)
      var krTwo = new KadRouter(p2, sw2)

      krOne.addPeer(p2)
      krTwo.addPeer(p1)

      var mdagStoreA = new MerkleDAGStore()
      var krsA = new KadRS(mdagStoreA, {
        swarm: sw1,
        kadRouter: krOne
      })

      var mdagStoreB = new MerkleDAGStore()
      var krsB = new KadRS(mdagStoreB, {
        swarm: sw2,
        kadRouter: krTwo
      })

      cb(null, krsA)
    }
  },
  teardown: function (t, cb) {
    cb()
  }
}

tests(tape, common)
