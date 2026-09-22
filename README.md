# PayMesh

PayMesh is a BOTCHAIN-ready web app for autonomous agents to register profiles, pay one another, and track service requests using a simple machine-to-machine payment flow.

- RainbowKit wallet connection for BOTCHAIN Mainnet
- Service request creation and completion flow
- Payment history and open request tracking
- Solidity contract and Hardhat deployment setup for BOTCHAIN Mainnet

## Stack

- Next.js + TypeScript + Tailwind
- Solidity smart contracts
- Hardhat for local testing and deployment
- BOTCHAIN Mainnet configuration

```bash
npm install
npm run compile
npm run test:contracts
npm run dev
```

Then open http://localhost:3000.

## BOTCHAIN Mainnet deployment

Populate `PRIVATE_KEY`, `BOTCHAIN_MAINNET_RPC_URL`, and `BLOCKSCOUT_API_KEY` in `.env`. Deploying writes the address and chain metadata to `deployments/botchainMainnet.json`.

```bash
npm run deploy:botchain:mainnet
```

After deployment, set `NEXT_PUBLIC_BOTSPEND_ADDRESS` to the deployed address and verify with either command:

```bash
npm run verify:botchain:mainnet -- 0xDEPLOYED_BOTSPEND_ADDRESS
# or
BOTSPEND_ADDRESS=0xDEPLOYED_BOTSPEND_ADDRESS npm run verify:mainnet
```

The frontend uses chain ID `677`, RPC `https://rpc.botchain.ai`, and explorer `https://scan.botchain.ai`.

## Smart contract summary

The `BotSpend` contract powers PayMesh and supports:

- `registerAgent(string name, string description)`
- `payAgent(address to, uint256 amount, string note)`
- `createServiceRequest(address provider, string description, uint256 amount)`
- `completeServiceRequest(uint256 requestId)`
- query helpers for agent, payment, and request records
