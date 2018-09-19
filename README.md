# <img src="logo.png" alt="Wibson" width="400px">

**tokens-distribution** enables the user to set a pool of ERC-20 tokens to distribute among beneficiaries providing a lock-up and vesting mechanism through smart contracts. The amount of tokens for the pool is defined at creation and can not be changed.

## Getting Started
In order to **deploy** to any environment, the `deploy.json` file must be set up.

You can start by copying the `deploy.example.json` file, renaming it and editing it as suitable.

```bash
cp deploy.example.json deploy.json
vi deploy.json
```

### Configuration
* `infuraToken`: The API key supplied by [Infura](https://infura.io/) to be used on remote environments.
* `environments`: Allowed keys are `development`, `test`, `coverage`, `remoteDevelopment`, `staging`, `production`.
* Environment options:
    * `tokenAddress`: An Ethereum address of an existing ERC-20 contract.
    * `deployPrivateKey`: Private key for the deployer account only used in remote environments.
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

### Ropsten
| Contract          | Address                                         |
| ----------------- | ----------------------------------------------- |
| Migrations        | `0xff7413f8cf53affb9535b211011d8d99553bf477`    |
| TokenVestingPool  | `0xb270ad513260f87d1b471860f8287eaf0599e2b9`    |
| TokenTimelockPool | `0x5183bbb25a55601998abb48fe4ef16dc46eb1b98`    |

### Mainnet
| Contract          | Address |
| ----------------- | ------- |
| Migrations        | `0x`    |
| TokenVestingPool  | `0x`    |
| TokenTimelockPool | `0x`    |

## Reporting Security Vulnerabilities
If you think that you have found a security issue in this repository, please **DO NOT** post it as a Github issue and don't publish it publicly. Instead, all security issues must be sent to developers@wibson.org.
Although we are working on setting up a bug bounty program to improve this, we appreciate your discretion and will give the corresponding credit to the reporter(s).

## Contribute
Thank you for thinking about contributing to the Tokens Distribution repository. There are many ways you can participate and help build high quality software. Check out the [contribution guide]!

## License
Tokens Distribution is released under the [LGPL-3.0](LICENSE).

[contribution guide]: CONTRIBUTING.md
