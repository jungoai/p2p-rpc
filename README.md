## Build

```bash
npm run build
```

## Run

If it's first node:

Change config appropriately:
```bash
nvim ./examples/n1.yaml
```

Then run:
```bash
node dist/main.js ./examples/n1.yaml
```

If it's not first node:

Change config appropriately:

```bash
nvim ./examples/n2.yaml
```

Run nodes:

```bash
node dist/main.js ./examples/n2.yaml
```

After run, you can find node address in `$HOME/.p2pRpc/addresses/<node-name>`

## Build docker image

```bash
docker build . --tag ghcr.io/mohsennz/p2prpc:latest
```

## Push docker image

```bash
docker push ghcr.io/mohsennz/p2prpc:latest
```

