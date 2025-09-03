import { addressesDir, log, NodeConfig, State } from './state.js'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { identify, identifyPush } from '@libp2p/identify'
import { tcp } from '@libp2p/tcp'
import { createLibp2p } from 'libp2p'
import { privateKeyFromRaw } from '@libp2p/crypto/keys'
import { readKeyFile } from './keypair.js'
import * as fs from 'fs'
import { concatPath } from './fp.js'
import {
  kadDHT,
  removePrivateAddressesMapper,
  removePublicAddressesMapper,
} from '@libp2p/kad-dht'
import { ping } from '@libp2p/ping'

export async function runP2p(s: State) {
  const node = await mkNode(s.node)

  log.info('Node started with id:', node.peerId.toString())
  const multiaddrs = node.getMultiaddrs().map((a) => a.toString())
  multiaddrs.forEach((addr) => log.info(`P2P listening on: ${addr.toString()}`))
  if (!fs.existsSync(addressesDir))
    fs.mkdirSync(addressesDir, { recursive: true })
  const multiaddrs_ = multiaddrs.join('\n')
  fs.writeFileSync(concatPath([addressesDir, s.node.name]), multiaddrs_)

  node.addEventListener('peer:discovery', (evt) =>
    log.info('Discovered', evt.detail.id.toString())
  )

  node.addEventListener('peer:connect', (evt) =>
    log.info('Connected to', evt.detail.toString())
  )

  node.addEventListener('peer:disconnect', (evt) =>
    log.info('Disconnected from', evt.detail.toString())
  )

  node.services.pubsub.addEventListener('message', (evt) =>
    pubsubEventHandler(evt, s)
  )

  node.services.pubsub.addEventListener('subscription-change', (evt) => {
    log.debug('evt', evt)
    const subs = node.services.pubsub.getSubscribers(newNodeAnnTopic)
    log.debug(`subscribers: ${subs}`)
  })

  node.services.pubsub.subscribe(newNodeAnnTopic)
  log.info(`subscribed to: ${newNodeAnnTopic}`)

  setInterval(() => {
    log.debug('📤 Sending:', s.node.httpEndpoint)
    node.services.pubsub
      .publish(newNodeAnnTopic, new TextEncoder().encode(s.node.httpEndpoint))
      // TODO:
      .catch((_err) => {})
  }, s.pingInterval * 1000)
}

function pubsubEventHandler(evt: CustomEvent, s: State) {
  const topic = evt.detail.topic
  const data = new TextDecoder().decode(evt.detail.data)
  log.info(`${topic}: ${data}`)

  if (topic == newNodeAnnTopic) s.otherNodesEndpoints.set(data, new Date())

  log.debug(
    "other nodes' endpoints: ",
    s.otherNodesEndpoints.entries().toArray()
  )
}

const newNodeAnnTopic = 'new-node-announcement'

// prettier-ignore
const mkNode = async (conf: NodeConfig) =>
  await createLibp2p({
    transports:           [tcp()],
    streamMuxers:         [yamux()],
    connectionEncrypters: [noise()],
    addresses: {
      listen:             [`/ip4/0.0.0.0/tcp/${conf.p2pPort}`],
    },
    privateKey:           getPrivateKey(conf.name),
    peerDiscovery:        [ ...mkBootstrapList(conf.bootstrappers)
                          // , mdns()
                          ],
    connectionManager: {
      maxConnections:     conf.maxConnections,
    },
    services: {
      pubsub:             gossipsub({ doPX: conf.isBootstrap }),
      identify:           identify(),
      identifyPush:       identifyPush(),
      dht:                kadDHT(conf.localTest ? dhtTestOpt : dhtProdOpt),
      ping:               ping(),
    },
  })

const dhtTestOpt = {
  protocol: '/ipfs/lan/kad/1.0.0',
  peerInfoMapper: removePublicAddressesMapper,
  clientMode: false,
}

const dhtProdOpt = {
  protocol: '/ipfs/lan/1.0.0',
  peerInfoMapper: removePrivateAddressesMapper,
  clientMode: false,
}

const mkBootstrapList = (b: string[]) =>
  b.length != 0 ? [bootstrap({ list: b })] : []

const getPrivateKey = (nodeName: string) =>
  privateKeyFromRaw(readKeyFile(nodeName))
