const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy FMH Token
    const FMHToken = await ethers.getContractFactory("FMHToken");
    const fmhToken = await FMHToken.deploy();
    await fmhToken.waitForDeployment();
    
    console.log("FMH Token deployed to:", await fmhToken.getAddress());

    // Deploy Minesweeper Game
    const MinesweeperGame = await ethers.getContractFactory("MinesweeperGame");
    const serverSigner = deployer.address; // 使用部署者作为服务器签名者
    const minesweeperGame = await MinesweeperGame.deploy(
        await fmhToken.getAddress(),
        serverSigner
    );
    await minesweeperGame.waitForDeployment();
    
    console.log("Minesweeper Game deployed to:", await minesweeperGame.getAddress());

    // Set game contract in token
    await fmhToken.setMinesweeperGame(await minesweeperGame.getAddress());
    console.log("Game contract set in token contract");

    // Save deployment addresses
    const deploymentInfo = {
        FMHToken: await fmhToken.getAddress(),
        MinesweeperGame: await minesweeperGame.getAddress(),
        deployer: deployer.address,
        serverSigner: serverSigner,
        network: "monad-testnet",
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        "deployment-addresses.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Deployment addresses saved to deployment-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });