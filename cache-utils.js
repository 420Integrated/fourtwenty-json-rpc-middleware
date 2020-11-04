const stringify = require('json-stable-stringify')

module.exports = {
  cacheIdentifierForPayload: cacheIdentifierForPayload,
  canCache: canCache,
  blockTagForPayload: blockTagForPayload,
  paramsWithoutBlockTag: paramsWithoutBlockTag,
  blockTagParamIndex: blockTagParamIndex,
  cacheTypeForPayload: cacheTypeForPayload
}

function cacheIdentifierForPayload (payload, skipBlockRef) {
  const simpleParams = skipBlockRef ? paramsWithoutBlockTag(payload) : payload.params
  if (canCache(payload)) {
    return payload.method + ':' + stringify(simpleParams)
  } else {
    return null
  }
}

function canCache (payload) {
  return cacheTypeForPayload(payload) !== 'never'
}

function blockTagForPayload (payload) {
  let index = blockTagParamIndex(payload)

  // Block tag param not passed.
  if (index >= payload.params.length) {
    return null
  }

  return payload.params[index]
}

function paramsWithoutBlockTag (payload) {
  const index = blockTagParamIndex(payload)

  // Block tag param not passed.
  if (index >= payload.params.length) {
    return payload.params
  }

  // fourtwenty_getBlockByNumber has the block tag first, then the optional includeTx? param
  if (payload.method === 'fourtwenty_getBlockByNumber') {
    return payload.params.slice(1)
  }

  return payload.params.slice(0, index)
}

function blockTagParamIndex (payload) {
  switch (payload.method) {
    // blockTag is at index 2
    case 'fourtwenty_getStorageAt':
      return 2
    // blockTag is at index 1
    case 'fourtwenty_getBalance':
    case 'fourtwenty_getCode':
    case 'fourtwenty_getTransactionCount':
    case 'fourtwenty_call':
      return 1
    // blockTag is at index 0
    case 'fourtwenty_getBlockByNumber':
      return 0
    // there is no blockTag
    default:
      return undefined
  }
}

function cacheTypeForPayload (payload) {
  switch (payload.method) {
    // cache permanently
    case 'web3_clientVersion':
    case 'web3_sha3':
    case 'fourtwenty_protocolVersion':
    case 'fourtwenty_getBlockTransactionCountByHash':
    case 'fourtwenty_getUncleCountByBlockHash':
    case 'fourtwenty_getCode':
    case 'fourtwenty_getBlockByHash':
    case 'fourtwenty_getTransactionByHash':
    case 'fourtwenty_getTransactionByBlockHashAndIndex':
    case 'fourtwenty_getTransactionReceipt':
    case 'fourtwenty_getUncleByBlockHashAndIndex':
    case 'fourtwenty_getCompilers':
    case 'fourtwenty_compileLLL':
    case 'fourtwenty_compileSolidity':
    case 'fourtwenty_compileSerpent':
    case 'shh_version':
    case 'test_permaCache':
      return 'perma'

    // cache until fork
    case 'fourtwenty_getBlockByNumber':
    case 'fourtwenty_getBlockTransactionCountByNumber':
    case 'fourtwenty_getUncleCountByBlockNumber':
    case 'fourtwenty_getTransactionByBlockNumberAndIndex':
    case 'fourtwenty_getUncleByBlockNumberAndIndex':
    case 'test_forkCache':
      return 'fork'

    // cache for block
    case 'fourtwenty_smokePrice':
    case 'fourtwenty_blockNumber':
    case 'fourtwenty_getBalance':
    case 'fourtwenty_getStorageAt':
    case 'fourtwenty_getTransactionCount':
    case 'fourtwenty_call':
    case 'fourtwenty_estimateGas':
    case 'fourtwenty_getFilterLogs':
    case 'fourtwenty_getLogs':
    case 'test_blockCache':
      return 'block'

    // never cache
    case 'net_version':
    case 'net_peerCount':
    case 'net_listening':
    case 'fourtwenty_syncing':
    case 'fourtwenty_sign':
    case 'fourtwenty_coinbase':
    case 'fourtwenty_mining':
    case 'fourtwenty_hashrate':
    case 'fourtwenty_accounts':
    case 'fourtwenty_sendTransaction':
    case 'fourtwenty_sendRawTransaction':
    case 'fourtwenty_newFilter':
    case 'fourtwenty_newBlockFilter':
    case 'fourtwenty_newPendingTransactionFilter':
    case 'fourtwenty_uninstallFilter':
    case 'fourtwenty_getFilterChanges':
    case 'fourtwenty_getWork':
    case 'fourtwenty_submitWork':
    case 'fourtwenty_submitHashrate':
    case 'db_putString':
    case 'db_getString':
    case 'db_putHex':
    case 'db_getHex':
    case 'shh_post':
    case 'shh_newIdentity':
    case 'shh_hasIdentity':
    case 'shh_newGroup':
    case 'shh_addToGroup':
    case 'shh_newFilter':
    case 'shh_uninstallFilter':
    case 'shh_getFilterChanges':
    case 'shh_getMessages':
    case 'test_neverCache':
      return 'never'
  }
}
