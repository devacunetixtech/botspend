# BotSpend

BotSpend is a BOTCHAIN-ready web app for autonomous agents to register profiles, pay one another, and track service requests using a simple machine-to-machine payment flow.
 RainbowKit wallet connection for BOTCHAIN Testnet
- Service request creation and completion flow
- Payment history and open request tracking
- Solidity contract and Hardhat deployment setup for BOTCHAIN testnet

## Stack

- Next.js + TypeScript + Tailwind
- Solidity smart contracts
- Hardhat for local testing and deployment
- BOTCHAIN testnet configuration

## Local development

npm run compile
npm run test:contracts
npm run deploy:botchain:testnet
```

Then open http://localhost:3000.

The deploy command writes the address and chain metadata to `deployments/botchainTestnet.json` and prints the frontend environment variable.
```bash
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network botchainTestnet
Populate `PRIVATE_KEY`, `BOTCHAIN_RPC_URL`, and `BOTCHAIN_API_KEY` in `.env`.
After deployment, verify the contract with either command:

```bash
npm run verify:botchain:testnet -- 0xDEPLOYED_BOTSPEND_ADDRESS
# or
BOTSPEND_ADDRESS=0xDEPLOYED_BOTSPEND_ADDRESS npm run verify:botchain:testnet
```

The frontend uses chain ID `968`, RPC `https://rpc.bohr.life`, and explorer `https://scan.bohr.life`.
```

## BOTCHAIN deployment

Populate the environment variables in `.env` using `.env.example` and set a private key for deployment.

## Smart contract summary

The `BotSpend` contract supports:

- `registerAgent(string name, string description)`
- `payAgent(address to, uint256 amount, string note)`
- `createServiceRequest(address provider, string description, uint256 amount)`
- `completeServiceRequest(uint256 requestId)`
- query helpers for agent, payment, and request records
