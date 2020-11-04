const EventEmitter = require('events')
const FourtwentyQuery = require('fourtwenty-query')
const fourtwentyUtil = require('fourtwentyjs-util')

// this is a really minimal shim
// not really tested, i hope it works
// sorry

module.exports = providerEngineSubproviderAsMiddle


function providerEngineSubproviderAsMiddle({ subprovider, provider, blockTracker }) {
  const fourtwentyQuery = new FourtwentyQuery(provider)
  // create a provider-engine interface
  const engine = new EventEmitter()
  // note: fourtwentyQuery fills in omitted params like id
  engine.sendAsync = fourtwentyQuery.sendAsync.bind(fourtwentyQuery)
  // forward events
  blockTracker.on('sync', engine.emit.bind(engine, 'sync'))
  blockTracker.on('latest', engine.emit.bind(engine, 'latest'))
  blockTracker.on('block', engine.emit.bind(engine, 'rawBlock'))
  blockTracker.on('block', (block) => engine.emit('block', toBufferBlock(block)))
  // set engine
  subprovider.setEngine(engine)

  // create middleware
  return (req, res, next, end) => {
    // send request to subprovider
    subprovider.handleRequest(req, subproviderNext, subproviderEnd)
    // adapter for next handler
    function subproviderNext(nextHandler) {
      if (!nextHandler) return next()
      next((done) => {
        nextHandler(res.error, res.result, done)
      })
    }
    // adapter for end handler
    function subproviderEnd(err, result) {
      if (err) return end(err)
      if (result)
      res.result = result
      end()
    }
  }
}

function toBufferBlock (jsonBlock) {
  return {
    number:           fourtwentyUtil.toBuffer(jsonBlock.number),
    hash:             fourtwentyUtil.toBuffer(jsonBlock.hash),
    parentHash:       fourtwentyUtil.toBuffer(jsonBlock.parentHash),
    nonce:            fourtwentyUtil.toBuffer(jsonBlock.nonce),
    sha3Uncles:       fourtwentyUtil.toBuffer(jsonBlock.sha3Uncles),
    logsBloom:        fourtwentyUtil.toBuffer(jsonBlock.logsBloom),
    transactionsRoot: fourtwentyUtil.toBuffer(jsonBlock.transactionsRoot),
    stateRoot:        fourtwentyUtil.toBuffer(jsonBlock.stateRoot),
    receiptsRoot:     fourtwentyUtil.toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
    miner:            fourtwentyUtil.toBuffer(jsonBlock.miner),
    difficulty:       fourtwentyUtil.toBuffer(jsonBlock.difficulty),
    totalDifficulty:  fourtwentyUtil.toBuffer(jsonBlock.totalDifficulty),
    size:             fourtwentyUtil.toBuffer(jsonBlock.size),
    extraData:        fourtwentyUtil.toBuffer(jsonBlock.extraData),
    smokeLimit:         fourtwentyUtil.toBuffer(jsonBlock.smokeLimit),
    smokeUsed:          fourtwentyUtil.toBuffer(jsonBlock.smokeUsed),
    timestamp:        fourtwentyUtil.toBuffer(jsonBlock.timestamp),
    transactions:     jsonBlock.transactions,
  }
}