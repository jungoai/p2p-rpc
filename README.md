# P2P RPC

p2prpc is a peer-to-peer RPC (Remote Procedure Call) network layer designed for blockchain infrastructure.

It links blockchain RPC nodes together using libp2p and provides a client SDK for seamless and fault-tolerant interaction with the network.

Instead of relying on a single RPC endpoint, clients maintain an updated list of node addresses and use them for load balancing, redundancy, and failover—ensuring more reliable blockchain requests and transactions.

✨ **Features**

- **Peer-to-Peer RPC Node Network**
  Nodes discover and connect to each other through libp2p, forming a decentralized mesh of RPC providers.

- **Dynamic Address Sharing**
  Each node shares its address with peers and clients. Clients continuously keep their list of node addresses updated.

- **Client SDK**
  Applications connect through the SDK, which automatically:
  - Keeps track of available RPC nodes.
  - Chooses healthy nodes for requests.
  - Falls back to other nodes if one becomes unavailable.

- **Fault-Tolerant RPC Access**
  Clients use the distributed node list to avoid single points of failure.

- **Blockchain Agnostic**
  Designed to work with any blockchain that exposes an RPC interface.

🚀 **How It Works**

1. Nodes join the p2prpc network via libp2p.
2. Peers exchange their addresses and propagate them throughout the network.
3. Clients connect to the SDK, which fetches and maintains the latest peer addresses.
4. When a blockchain request or transaction is made:
  - The SDK routes it to an available node.
  - If one node fails, it retries with another.

📦 **Use Cases**

- Running redundant blockchain infrastructure without load balancers.
- Building resilient dApps that don’t break when a single RPC provider fails.

🛠️ Roadmap

- [x] Support for multiple blockchains out-of-the-box
- [ ] SDKs in multiple languages
  - [x] JS/TS
  - [ ] Python
  - [ ] Rust
- [ ] Advanced node selection strategies (latency, region, capacity)
- [ ] Node reputation and health monitoring.

## Example

To see the use case example visit ...(todo)

## Development

### Build

```bash
npm run build
```

### Run

**First node:**

Configure node appropriately:
```bash
nvim ./examples/n1.yaml
```

Configuration example:
```bash
name:           "myNode" # Arbitrary name, it would be show on dashboard and logs
httpEndpoint:   "http://127.0.0.1:5001" # NOTE: a reverse proxy needed
                                        # to map @httpEndpoint/<chain-id>
                                        # to the running chain address
httpPort:       4001  # NOTE: a reverse proxy needed to map @httpPort to `@httpEndpoint/`
p2pPort:        3101  # port for connection to other nodes through libp2p
isBootstrap:    true  # (default: false)
localTest:      true  # (default: false)
bootstrappers:  []
```

Then run:
```bash
node dist/main.js ./examples/n1.yaml
```

**Other nodes**:

Configure node appropriately:

```bash
nvim ./examples/n2.yaml # the same for n3.yaml and n4.yaml
```

Run nodes:

```bash
node dist/main.js ./examples/n2.yaml
```

After run, you can find node address in `$HOME/.p2pRpc/addresses/<node-name>`
