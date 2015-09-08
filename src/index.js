var iprs = require('ipfs-record')
var ipld = require('ipld')
var multihashing = require('multihashing')

exports = module.exports = KadRS

// note: kad-record-store doesn't get and put on the local MerkleDAGStore
// as that is reserved to be done by distributed-record-store itself
function KadRS (mdagStore, options) {
  var self = this

  if (!(self instanceof KadRS)) {
    throw new Error('KadRS must be called with new')
  }

  if (!mdagStore) {
    throw new Error('KadRS must be instantiated with a MerkleDAGStore')
  }

  if (!options.swarm) {
    throw new Error('KadRS must be instantiated with a Swarm')
  }

  if (!options.kadRouter) {
    throw new Error('KadRS must be instantiated with a kad-router ')
  }

  self.mdagStore = mdagStore
  self.swarm = options.swarm
  self.kadRouter = options.kadRouter
  self.mapping = {} // {key: [recordSignatureHash]}

  self.get = function (key, callback) {
    // find peers
    // ask everyone for that given key
    // store every tripplet in the mdagStore (remember to hash everything)
    // return all the recordSignatures
    self.kadRouter.findPeers(key, function (err, queue) {
      if (err) {
        callback(err)
      }
      for (var i = 0; i < queue.length; i++) {
        var peer = queue.dequeue() // take the top item
        self.swarm.openStream(peer, '/ipfs/kad-record-store/1.0.0/get',
            function (err, stream) {
          if (err) {
            return callback(err)
          }

          var encoded = new Buffer(0)

          stream.on('data', function (chunk) {
            encoded = Buffer.concat([encoded, chunk])
          })

          stream.on('end', function () {
            ipld.unmarshal(encoded, function (err, objs) {
              if (err) {
                return callback(err)
              }

              // cbor puts decoded objs always inside an array
              if (objs[0].length === 0) {
                return callback(null, [])
              }

              var sigHashes = []
              objs[0].forEach(function (obj) {
                var objEncoded = ipld.marshal(obj)
                var objEncodedMh = multihashing(objEncoded, 'sha2-256')
                self.mdagStore.put(obj, objEncodedMh)
                if (obj.pubKey && obj.algorithm) { // duck typing
                  sigHashes.push(objEncodedMh)
                }
              })

              callback(null, sigHashes)
            })
          })

          stream.write(key)
          stream.end()
        })
      }
    })

  }

  self.put = function (key, recordSignatureObj, callback) {
    // 1. find the peers to put the Record into
    // 2. store in those peers *only*
    self.kadRouter.findPeers(key, function (err, queue) {
      if (err) {
        callback(err)
      }
      for (var i = 0; i < queue.length; i++) {
        var peer = queue.dequeue() // take the top item
        self.swarm.openStream(peer, '/ipfs/kad-record-store/1.0.0/put',
            function (err, stream) {
          if (err) {
            callback(err)
          }

          var recSigObjExpanded = ipld.expand(recordSignatureObj)

          var recObj = self.mdagStore
                           .get(recSigObjExpanded.signee[ipld.type.mlink])

          var pubKeyObj = self.mdagStore
                           .get(recSigObjExpanded.pubKey[ipld.type.mlink])

          var encoded = ipld.marshal({
            key: key,
            objs: [recordSignatureObj, recObj, pubKeyObj]
          })

          stream.write(encoded)
          stream.end()
        })
      }
      // TODO call this cb after all streams.end()
      setTimeout(callback, 2000)
    })
  }

  self.swarm
      .registerHandler('/ipfs/kad-record-store/1.0.0/get', function (stream) {
    // 1. receive requested key (process .on('end')
    // 2. look in our table
    // 3. send back the objs
    var key = new Buffer(0)
    stream.on('data', function (chunk) {
      key = Buffer.concat([key, chunk])
    })
    stream.on('end', function () {

      if (!self.mapping[key]) {
        stream.write(ipld.marshal([])) // simplier for the receiver
        return stream.end()
      }

      var mdagObjToSend = []

      self.mapping[key.toString()].forEach(function (sigHash) {
        // 1. check validity for sig
        // 2. get from mdagstore sig+rec+pkey
        // 3. push each to mdagObjToSend

        // TODO understand why validator breaks here (objs are the same!)
        // if (iprs.validator(sigHash, self.mdagStore)) {
        var sigObj = self.mdagStore.get(sigHash)
        var recObj = self
          .mdagStore.get(ipld.expand(sigObj).signee[ipld.type.mlink])
        var pKeyObj = self
          .mdagStore.get(ipld.expand(sigObj).pubKey[ipld.type.mlink])

        mdagObjToSend.push(sigObj)
        mdagObjToSend.push(recObj)
        mdagObjToSend.push(pKeyObj)
        // }
      })

      var encoded = ipld.marshal(mdagObjToSend)
      stream.write(encoded)
      stream.end()
    })
  })

  self.swarm
      .registerHandler('/ipfs/kad-record-store/1.0.0/put', function (stream) {
    // 1. stream.end()
    // 2. decode
    // 3. hash
    // 4. store
    stream.end()

    var encoded = new Buffer(0)

    stream.on('data', function (chunk) {
      encoded = Buffer.concat([encoded, chunk])
    })

    stream.on('end', function () {
      ipld.unmarshal(encoded, function (err, decoded) {
        if (err) {
          return console.log('objs received were mal formed')
        }

        decoded[0].objs.forEach(function (obj) {
          var objEncoded = ipld.marshal(obj)
          var objEncodedMh = multihashing(objEncoded, 'sha2-256')
          self.mdagStore.put(obj, objEncodedMh)
          if (obj.pubKey && obj.algorithm) {
            self.mapping[decoded[0].key] ?
              self.mapping[decoded[0].key].push(objEncodedMh) :
              self.mapping[decoded[0].key] = [objEncodedMh]
          }
        })

      })
    })

  })
}
