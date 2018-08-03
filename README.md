# Wibson Tokens Distribution

## Getting Started
In order to deploy to any environment, the `deploy.json` file must be set up.

You can start by copying the `deploy.example.json` file, renaming it and editing it as suitable.

```bash
cp deploy.example.json deploy.json
vi deploy.json
```

### Configuration
* `infuraToken`: The API key supplied by [Infura](https://infura.io/) to be used on remote environments.
* `environments`: Allowed keys are `development`, `test`, `coverage`, `remoteDevelopment`, `staging`, `production`.
* Environment options:
    * `tokenAddress`: An Ethereum address of an existing `Wibcoin` contract.
    * `mnemonic`: Twelve word mnemonic to create the deployer account.
    * `owner`: Owner of the TokenPools to ve deployed.


## Testing
```bash
npm test
npm run test:coverage # To run with coverage
```

## Deployment with Truffle
### Local
```bash
npm run ganache &
npm run truffle -- migrate --reset --compile-all
npm run truffle console # To test within the console
```

### Any other environment
For example, `staging`:
```bash
npm run truffle -- migrate --reset --compile-all --network staging
npm run truffle -- console --network staging # To test within the console
```

## Deployment status

### Deployed Addresses:

#### Ropsten
-   Migrations `0x`
-   TokenVestingPool `0x`
-   TokenTimelockPool `0x`

#### Mainnet
-   Migrations `0x`
-   TokenVestingPool `0x`
-   TokenTimelockPool `0x`
