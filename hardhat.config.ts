import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    botchainTestnet: {
      url: process.env.BOTCHAIN_RPC_URL || "https://rpc.bohr.life",
      chainId: 968,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    botchainMainnet: {
      url: process.env.BOTCHAIN_MAINNET_RPC_URL || "https://rpc.botchain.ai",
      chainId: 677,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      botchainTestnet: process.env.BOTCHAIN_API_KEY || process.env.BLOCKSCOUT_API_KEY || "",
      botchainMainnet: process.env.BOTCHAIN_API_KEY || "",
    },
    customChains: [
      {
        network: "botchainTestnet",
        chainId: 968,
        urls: {
          apiURL: process.env.BOTCHAIN_EXPLORER_API || "https://scan.bohr.life/api",
          browserURL: "https://scan.bohr.life",
        },
      },
      {
        network: "botchainMainnet",
        chainId: 677,
        urls: {
          apiURL: process.env.BOTCHAIN_MAINNET_EXPLORER_API || "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
    ],
  },
};

export default config;
