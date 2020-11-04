const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createScaffoldMiddleware = require('json-rpc-engine/src/createScaffoldMiddleware')
const sigUtil = require('fourtwenty-sig-util')
const { fourtwentyErrors } = require('fourtwenty-rpc-errors')

module.exports = function createWalletMiddleware(opts = {}) {
  // parse + validate options
  const getAccounts = opts.getAccounts
  const processTypedMessage = opts.processTypedMessage
  const processTypedMessageV3 = opts.processTypedMessageV3
  const processTypedMessageV4 = opts.processTypedMessageV4
  const processPersonalMessage = opts.processPersonalMessage
  const processFourtwentySignMessage = opts.processFourtwentySignMessage
  const processTransaction = opts.processTransaction
  const processDecryptMessage = opts.processDecryptMessage
  const processEncryptionPublicKey = opts.processEncryptionPublicKey

  if (!getAccounts) {
    throw new Error('opts.getAccounts is required')
  }

  return createScaffoldMiddleware({
    // account lookups
    'fourtwenty_accounts': createAsyncMiddleware(lookupAccounts),
    'fourtwenty_coinbase': createAsyncMiddleware(lookupDefaultAccount),
    // tx signatures
    'fourtwenty_sendTransaction': createAsyncMiddleware(sendTransaction),
    // message signatures
    'fourtwenty_sign': createAsyncMiddleware(fourtwentySign),
    'fourtwenty_signTypedData': createAsyncMiddleware(signTypedData),
    'fourtwenty_signTypedData_v3': createAsyncMiddleware(signTypedDataV3),
    'fourtwenty_signTypedData_v4': createAsyncMiddleware(signTypedDataV4),
    'personal_sign': createAsyncMiddleware(personalSign),
    'fourtwenty_getEncryptionPublicKey': createAsyncMiddleware(encryptionPublicKey),
    'fourtwenty_decrypt': createAsyncMiddleware(decryptMessage),
    'personal_ecRecover': createAsyncMiddleware(personalRecover),
  })

  //
  // account lookups
  //

  async function lookupAccounts(req, res) {
    res.result = await getAccounts(req)
  }

  async function lookupDefaultAccount(req, res) {
    const accounts = await getAccounts(req)
    res.result = accounts[0] || null
  }

  //
  // transaction signatures
  //

  async function sendTransaction(req, res) {

    if (!processTransaction) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const txParams = req.params[0] || {}
    txParams.from = await validateAndNormalizeKeyholder(txParams.from, req)
    res.result = await processTransaction(txParams, req)
  }

  //
  // message signatures
  //

  async function fourtwentySign(req, res) {

    if (!processFourtwentySignMessage) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const address = await validateAndNormalizeKeyholder(req.params[0], req)
    const message = req.params[1]
    const extraParams = req.params[2] || {}
    const msgParams = Object.assign({}, extraParams, {
      from: address,
      data: message,
    })

    res.result = await processFourtwentySignMessage(msgParams, req)
  }

  async function signTypedData (req, res) {

    if (!processTypedMessage) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const message = req.params[0]
    const address = await validateAndNormalizeKeyholder(req.params[1], req)
    const version = 'V1'
    const extraParams = req.params[2] || {}
    const msgParams = Object.assign({}, extraParams, {
      from: address,
      data: message,
    })

    res.result = await processTypedMessage(msgParams, req, version)
  }

  async function signTypedDataV3 (req, res) {

    if (!processTypedMessageV3) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const address = await validateAndNormalizeKeyholder(req.params[0], req)
    const message = req.params[1]
    const version = 'V3'
    const msgParams = {
      data: message,
      from: address,
      version
    }

    res.result = await processTypedMessageV3(msgParams, req, version)
  }

  async function signTypedDataV4 (req, res) {

    if (!processTypedMessageV4) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const address = await validateAndNormalizeKeyholder(req.params[0], req)
    const message = req.params[1]
    const version = 'V4'
    const msgParams = {
      data: message,
      from: address,
      version
    }

    res.result = await processTypedMessageV4(msgParams, req, version)
  }

  async function personalSign (req, res) {

    if (!processPersonalMessage) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    // process normally
    const firstParam = req.params[0]
    const secondParam = req.params[1]
    // non-standard "extraParams" to be appended to our "msgParams" obj
    const extraParams = req.params[2] || {}

    // We initially incorrectly ordered these parameters.
    // To gracefully respect users who adopted this API early,
    // we are currently gracefully recovering from the wrong param order
    // when it is clearly identifiable.
    //
    // That means when the first param is definitely an address,
    // and the second param is definitely not, but is hex.
    let address, message
    if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
      let warning = `The fourtwenty_personalSign method requires params ordered `
      warning += `[message, address]. This was previously handled incorrectly, `
      warning += `and has been corrected automatically. `
      warning += `Please switch this param order for smooth behavior in the future.`
      res.warning = warning

      address = firstParam
      message = secondParam
    } else {
      message = firstParam
      address = secondParam
    }
    address = await validateAndNormalizeKeyholder(address, req)

    const msgParams = Object.assign({}, extraParams, {
      from: address,
      data: message,
    })
    
    res.result = await processPersonalMessage(msgParams, req)
  }

  async function personalRecover(req, res) {

    const message = req.params[0]
    const signature = req.params[1]
    const extraParams = req.params[2] || {}
    const msgParams = Object.assign({}, extraParams, {
      sig: signature,
      data: message,
    })
    const signerAddress = sigUtil.recoverPersonalSignature(msgParams)

    res.result = signerAddress
  }

  async function encryptionPublicKey (req, res) {

    if (!processEncryptionPublicKey) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const address = await validateAndNormalizeKeyholder(req.params[0], req)

    res.result = await processEncryptionPublicKey(address, req)
  }
	
  async function decryptMessage (req, res) {

    if (!processDecryptMessage) {
      throw fourtwentyErrors.rpc.methodNotSupported()
    }

    const ciphertext = req.params[0]
    const address = await validateAndNormalizeKeyholder(req.params[1], req)
    const extraParams = req.params[2] || {}
    const msgParams = Object.assign({}, extraParams, {
      from: address,
      data: ciphertext,
    })

    res.result = await processDecryptMessage(msgParams, req)
  }

  //
  // utility
  //

  /**
   * Validates the keyholder address, and returns a normalized (i.e. lowercase)
   * copy of it.
   * 
   * @param {string} address - The address to validate and normalize.
   * @param {Object} req - The request object.
   * @returns {string} - The normalized address, if valid. Otherwise, throws
   * an error
   */
  async function validateAndNormalizeKeyholder(address, req) {

    if (typeof address === 'string' && address.length > 0) {

      // ensure address is included in provided accounts
      const accounts = await getAccounts(req)
      const normalizedAccounts = accounts.map(_address => _address.toLowerCase())
      const normalizedAddress =  address.toLowerCase()

      if (normalizedAccounts.includes(normalizedAddress)) {
        return normalizedAddress
      }
    }
    throw fourtwentyErrors.rpc.invalidParams({
      message: `Invalid parameters: must provide an 420coin address.`
    })
  }
}

function resemblesAddress (string) {
  // hex prefix 2 + 20 bytes
  return string.length === (2 + (20 * 2))
}
