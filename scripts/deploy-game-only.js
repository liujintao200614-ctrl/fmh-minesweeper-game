const hre = require("hardhat");

async function main() {
  console.log("Deploying MinesweeperGame contract to Monad Testnet...");

  // Check if private key is available
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Please set PRIVATE_KEY in .env.local file");
  }

  // Use existing FMH token address
  const existingFMHTokenAddress = "0x83aB028468ef2a5495Cc7964B3266437956231E2";
  console.log("Using existing FMH Token at:", existingFMHTokenAddress);

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get the ContractFactory
  const MinesweeperGame = await hre.ethers.getContractFactory("MinesweeperGame");

  console.log("\n1. Deploying MinesweeperGame...");
  const minesweeperGame = await MinesweeperGame.deploy(existingFMHTokenAddress);
  await minesweeperGame.waitForDeployment();
  const minesweeperGameAddress = await minesweeperGame.getAddress();
  console.log("MinesweeperGame deployed to:", minesweeperGameAddress);

  console.log("\n2. Verifying deployment...");
  const gameTokenAddress = await minesweeperGame.fmhToken();
  console.log("Game's token address:", gameTokenAddress);
  console.log("Matches FMH Token address:", gameTokenAddress === existingFMHTokenAddress);

  // Save deployment addresses to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: "monad-testnet",
    chainId: 10143,
    contracts: {
      FMHToken: existingFMHTokenAddress,
      MinesweeperGame: minesweeperGameAddress
    },
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    'deployment-addresses.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Deployment completed successfully!");
  console.log("Deployment info saved to deployment-addresses.json");
  console.log("\nContract addresses:");
  console.log("FMHToken:", existingFMHTokenAddress);
  console.log("MinesweeperGame:", minesweeperGameAddress);
  console.log("\nNOTE: You need to call setMinesweeperGame() on the FMH token contract");
  console.log("to authorize the game contract to mint rewards.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });