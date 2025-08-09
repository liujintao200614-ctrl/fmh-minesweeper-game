require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: ".env.local" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
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
    "monad-testnet": {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143, // 实际验证的Chain ID
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: 100000000000, // 100 gwei
      gas: 8000000,
    },
  },
  etherscan: {
    apiKey: {
      "monad-testnet": "placeholder", // Monad testnet doesn't require API key
    },
    customChains: [
      {
        network: "monad-testnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet-explorer.monad.xyz/api",
          browserURL: "https://testnet-explorer.monad.xyz",
        },
      },
    ],
  },
  sourcify: {
    enabled: true
  },
};