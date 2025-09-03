import { comp, expect, mapUndef, parseBool, unOpt } from './fp.js'
import fs from 'fs'
import yaml from 'yaml'
import { addKeyFile } from './keypair.js'
import {
  getOtherEndpoints,
  log,
  nodeConfFromRead,
  mkState,
  NodeConfRead,
  State,
} from './state.js'
import { runP2p } from './p2p-app.js'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

////////////////////////////////////////////////////////////////////////////////
// main

main()

async function main() {
  const args = process.argv.slice(2)
  const a0 = args[0]
  const confPath = a0 ? a0 : './p2p-rpc.yaml'
  runApp(confPath)

  // NOTE: add these lines in case of commands needed
  // program
  //   .command('run <path>', { isDefault: true })
  //   .description('run node with name')
  //   .option('-c, --confPath <path>', 'specify node config path')
  //   .action(runApp)
  // program
  //   .command('new <name>')
  //   .description('make new node with name')
  //   .action(addKeyFile)
  // program.parse()
}

async function runApp(confPath: string) {
  log.debug(`confPath: ${confPath}`)

  const read: NodeConfRead = fs.existsSync(confPath)
    ? yaml.parse(fs.readFileSync(confPath, 'utf8'))
    : (() => {
        log.info(`file ${confPath} not exsit, trying to read env vars.`)
        return nodeConfReadFromEnv()
      })()

  const nodeConf = nodeConfFromRead(read)

  log.debug('nodeConf:', nodeConf)

  await addKeyFile(nodeConf.name)

  const s: State = mkState(nodeConf)

  log.info('state:', s)

  await runP2p(s)

  runHttp(s)
}

// prettier-ignore
function nodeConfReadFromEnv(): NodeConfRead {
  return {
    name:           process.env.P2PRPC_NAME,
    httpPort:       Number(unOpt(process.env.P2PRPC_HTTP_PORT)),
    p2pPort:        Number(unOpt(process.env.P2PRPC_P2P_PORT)),
    httpEndpoint:   unOpt(process.env.P2PRPC_HTTP_ENDPOINT),
    maxConnections: mapUndef(Number, process.env.P2PRPC_MAX_CONNECTIONS),
    isBootstrap:    mapUndef(parseBool, process.env.P2PRPC_IS_BOOTSTRAP),
    localTest:      mapUndef(parseBool, process.env.P2PRPC_LOCAL_TEST),
    bootstrappers:  mapUndef((x) => x.split(','), process.env.P2PRPC_BOOTSTRAPPERS)
  }
}

////////////////////////////////////////////////////////////////////////////////
// http server

function runHttp(s: State) {
  const app = new Hono()

  app.get('/', (ctx) =>
    comp([ctx.json, Object.fromEntries, getOtherEndpoints])(s)
  )

  serve(
    {
      fetch: app.fetch,
      port: s.node.httpPort,
    },
    (info) => log.info(`HTTP listening on: http://localhost:${info.port}`)
  )
}
