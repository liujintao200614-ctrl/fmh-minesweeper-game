// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FMHToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MinesweeperGame is ReentrancyGuard {
    using ECDSA for bytes32;
    
    FMHToken public fmhToken;
    address public owner;
    address public serverSigner; // 服务器签名地址
    
    uint256 public constant GAME_FEE = 0.001 ether;
    uint256 public constant WIN_REWARD = 10 ether; // 10 FMH tokens (gas优化)
    uint256 public constant PERFECT_BONUS = 50 ether; // 50 FMH tokens for perfect game (gas优化)
    
    // EIP-712 类型哈希
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(address player,uint256 gameId,uint256 score,uint256 duration,uint256 nonce,uint256 deadline)"
    );
    
    // 用于防重放攻击的nonce存储
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    
    struct Game {
        address player;
        uint8 width;
        uint8 height;
        uint8 mines;
        uint256 startTime;
        uint256 endTime;
        bool isWon;
        bool isCompleted;
        bool rewardClaimed;
        uint256 score;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    mapping(address => uint256) public playerStats; // Total games won
    
    uint256 public gameCounter;
    
    event GameStarted(uint256 indexed gameId, address indexed player, uint8 width, uint8 height, uint8 mines);
    event GameCompleted(uint256 indexed gameId, address indexed player, bool won, uint256 score, uint256 duration);
    event RewardClaimed(uint256 indexed gameId, address indexed player, uint256 reward);
    event RewardClaimedWithSignature(uint256 indexed gameId, address indexed player, uint256 reward, uint256 nonce);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier gameExists(uint256 gameId) {
        require(gameId < gameCounter, "Game does not exist");
        _;
    }
    
    constructor(address _tokenAddress, address _serverSigner) {
        owner = msg.sender;
        fmhToken = FMHToken(_tokenAddress);
        serverSigner = _serverSigner;
    }
    
    function startGame(uint8 width, uint8 height, uint8 mines) external payable returns (uint256) {
        require(msg.value >= GAME_FEE, "Insufficient fee");
        require(width >= 5 && width <= 30, "Invalid width");
        require(height >= 5 && height <= 30, "Invalid height");
        require(mines >= 1 && mines < (width * height), "Invalid mine count");
        
        uint256 gameId = gameCounter++;
        
        games[gameId] = Game({
            player: msg.sender,
            width: width,
            height: height,
            mines: mines,
            startTime: block.timestamp,
            endTime: 0,
            isWon: false,
            isCompleted: false,
            rewardClaimed: false,
            score: 0
        });
        
        playerGames[msg.sender].push(gameId);
        
        emit GameStarted(gameId, msg.sender, width, height, mines);
        
        // Refund excess payment
        if (msg.value > GAME_FEE) {
            payable(msg.sender).transfer(msg.value - GAME_FEE);
        }
        
        return gameId;
    }
    
    function completeGame(uint256 gameId, bool won, uint256 score) external gameExists(gameId) {
        Game storage game = games[gameId];
        require(game.player == msg.sender, "Not your game");
        require(!game.isCompleted, "Game already completed");
        
        game.endTime = block.timestamp;
        game.isWon = won;
        game.isCompleted = true;
        game.score = score;
        
        if (won) {
            playerStats[msg.sender]++;
        }
        
        emit GameCompleted(gameId, msg.sender, won, score, game.endTime - game.startTime);
    }
    
    function claimReward(uint256 gameId) external gameExists(gameId) {
        Game storage game = games[gameId];
        require(game.player == msg.sender, "Not your game");
        require(game.isCompleted, "Game not completed");
        require(game.isWon, "Game not won");
        require(!game.rewardClaimed, "Reward already claimed");
        
        game.rewardClaimed = true;
        
        uint256 reward = WIN_REWARD;
        uint256 duration = game.endTime - game.startTime;
        
        // Perfect game bonus (completed in under 60 seconds with high score)
        if (duration < 60 && game.score >= 1000) {
            reward += PERFECT_BONUS;
        }
        
        // Speed bonus
        if (duration < 30) {
            reward += 20 ether; // 20 FMH bonus
        } else if (duration < 120) {
            reward += 5 ether; // 5 FMH bonus
        }
        
        fmhToken.mint(msg.sender, reward);
        
        emit RewardClaimed(gameId, msg.sender, reward);
    }
    
    /**
     * @dev 使用服务器签名申请奖励（防重放攻击版本）
     * @param player 玩家地址
     * @param gameId 游戏ID
     * @param score 游戏分数
     * @param duration 游戏时长（秒）
     * @param nonce 防重放随机数
     * @param deadline 签名截止时间
     * @param signature 服务器EIP-712签名
     */
    function claimWithSignature(
        address player,
        uint256 gameId,
        uint256 score,
        uint256 duration,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant gameExists(gameId) {
        require(player == msg.sender, "Not your claim");
        require(block.timestamp <= deadline, "Signature expired");
        require(!usedNonces[player][nonce], "Nonce already used");
        
        Game storage game = games[gameId];
        require(game.player == player, "Not your game");
        require(game.isCompleted, "Game not completed");
        require(game.isWon, "Game not won");
        require(!game.rewardClaimed, "Reward already claimed");
        
        // 验证EIP-712签名
        bytes32 structHash = keccak256(abi.encode(
            CLAIM_TYPEHASH,
            player,
            gameId,
            score,
            duration,
            nonce,
            deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == serverSigner, "Invalid signature");
        
        // 防重放：标记nonce已使用
        usedNonces[player][nonce] = true;
        
        // 标记奖励已申请
        game.rewardClaimed = true;
        
        // 计算奖励
        uint256 reward = WIN_REWARD;
        
        // Perfect game bonus (completed in under 60 seconds with high score)
        if (duration < 60 && score >= 1000) {
            reward += PERFECT_BONUS;
        }
        
        // Speed bonus
        if (duration < 30) {
            reward += 20 ether; // 20 FMH bonus
        } else if (duration < 120) {
            reward += 5 ether; // 5 FMH bonus
        }
        
        // 铸造代币奖励
        fmhToken.mint(player, reward);
        
        emit RewardClaimedWithSignature(gameId, player, reward, nonce);
    }
    
    /**
     * @dev 构建EIP-712域分隔符
     */
    function _domainSeparatorV4() internal view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256("MinesweeperGame"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }
    
    /**
     * @dev 构建完整的EIP-712哈希
     */
    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\\x19\\x01", _domainSeparatorV4(), structHash));
    }
    
    function getPlayerGames(address player) external view returns (uint256[] memory) {
        return playerGames[player];
    }
    
    function getGameDetails(uint256 gameId) external view gameExists(gameId) returns (
        address player,
        uint8 width,
        uint8 height,
        uint8 mines,
        uint256 startTime,
        uint256 endTime,
        bool isWon,
        bool isCompleted,
        bool rewardClaimed,
        uint256 score
    ) {
        Game memory game = games[gameId];
        return (
            game.player,
            game.width,
            game.height,
            game.mines,
            game.startTime,
            game.endTime,
            game.isWon,
            game.isCompleted,
            game.rewardClaimed,
            game.score
        );
    }
    
    function getPlayerStats(address player) external view returns (uint256 gamesWon, uint256 totalGames) {
        return (playerStats[player], playerGames[player].length);
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function updateGameFee(uint256 newFee) external onlyOwner {
        // Implementation for updating game fee if needed
    }
    
    /**
     * @dev 更新服务器签名地址（仅合约拥有者）
     */
    function updateServerSigner(address newServerSigner) external onlyOwner {
        require(newServerSigner != address(0), "Invalid server signer");
        serverSigner = newServerSigner;
    }
    
    /**
     * @dev 查询服务器签名地址
     */
    function getServerSigner() external view returns (address) {
        return serverSigner;
    }
    
    /**
     * @dev 检查nonce是否已使用
     */
    function isNonceUsed(address player, uint256 nonce) external view returns (bool) {
        return usedNonces[player][nonce];
    }
}