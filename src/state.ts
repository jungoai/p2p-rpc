import { Logger } from 'tslog'
import * as os from 'os'
import { concatPath } from './fp.js'

function isLogLevel(s: string): boolean {
  return ['silly', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(
    s
  )
}

export enum LogLevel {
  Silly = 0,
  Trace,
  Debug,
  Info,
  Warn,
  Error,
  Fatal,
}

function logLevelFromStr(s: string): number | null {
  switch (s) {
    case 'fatal':
      return LogLevel.Fatal
    case 'error':
      return LogLevel.Error
    case 'warn':
      return LogLevel.Warn
    case 'info':
      return LogLevel.Info
    case 'debug':
      return LogLevel.Debug
    case 'trace':
      return LogLevel.Trace
    case 'silly':
      return LogLevel.Silly
    default:
      return null
  }
}

function logLevelFromEnv(): number {
  const logLvlEnv = process.env.LOG_LEVEL
  return logLvlEnv ? logLevelFromStr(logLvlEnv) || LogLevel.Info : LogLevel.Info
}

export const log = new Logger({
  stylePrettyLogs: false,
  prettyLogTemplate: '{{hh}}:{{MM}}:{{ss}} {{logLevelName}} ',
  minLevel: logLevelFromEnv(),
})

export const homeDir = os.homedir()
export const p2pRpcDir = concatPath([homeDir, '.p2pRpc'])
export const keysDir = concatPath([p2pRpcDir, 'keys'])
export const addressesDir = concatPath([p2pRpcDir, 'addresses'])

// prettier-ignore
export type NodeConfRead = {
  name:                 string   | undefined
  httpPort:             number
  p2pPort:              number
  httpEndpoint:         string                // Endpoint to be used by client (e.g SDK, ...)
  maxConnections:       number   | undefined  // Connection limit to save resources
  isBootstrap:          boolean  | undefined
  localTest:            boolean  | undefined
  bootstrappers:        string[] | undefined
}

// prettier-ignore
export type NodeConfig = {
  name:                 string
  httpPort:             number
  p2pPort:              number
  httpEndpoint:         string
  maxConnections:       number
  isBootstrap:          boolean
  localTest:            boolean
  bootstrappers:        string[]
}

// prettier-ignore
export const nodeDefs = {
  name:           'default',
  isBootstrap:    false,
  localTest:      false,
  bootstrappers:  [],
}

// prettier-ignore
/**
 * `NodeConfig` from `NodeConfRead` and defaults
 */
export function nodeConfFromRead(r: NodeConfRead): NodeConfig {
  return {
    name:           r.name || nodeDefs.name,
    httpPort:       r.httpPort,
    p2pPort:        r.p2pPort,
    httpEndpoint:   r.httpEndpoint,
    maxConnections: r.maxConnections || nodeDefs.isBootstrap ? 100 : 20,
    isBootstrap:    r.isBootstrap || nodeDefs.isBootstrap,
    localTest:      r.localTest || nodeDefs.localTest,
    bootstrappers:  r.bootstrappers || nodeDefs.bootstrappers,
  }
}

// prettier-ignore
export type State = {
  // node options
  node:                 NodeConfig
  // network options
  pingInterval:         Second
  failureN:             number    // i.e: now - last_ping_of_node > n * pingInterval => failure
  // runtime state
  lastSeen:             Date      // last other nodes endpoints requested
  otherNodesEndpoints:  Map<string, Date>
}

const PING_INTERVAL_TEST = 5
const PING_INTERVAL_MAIN = 30

// prettier-ignore
export function mkState(node: NodeConfig): State {
  return {
    node,
    pingInterval:         node.localTest ? PING_INTERVAL_TEST : PING_INTERVAL_MAIN,
    failureN:             2,
    lastSeen:             new Date(),
    otherNodesEndpoints:  new Map(),
  }
}

export type Second = number

const failureThreshold = (s: State) => s.failureN * s.pingInterval

export function updateOtherEndpoints(s: State) {
  const now = new Date().getTime()
  const threshold = failureThreshold(s)
  if ((now - s.lastSeen.getTime()) / 1000 > threshold) {
    for (const [endpoint, expire] of s.otherNodesEndpoints.entries()) {
      if ((now - expire.getTime()) / 1000 > threshold)
        s.otherNodesEndpoints.delete(endpoint)
    }
  }
}

export function getOtherEndpoints(s: State): Map<string, Date> {
  updateOtherEndpoints(s)
  return s.otherNodesEndpoints
}
