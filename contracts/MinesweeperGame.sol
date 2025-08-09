// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FMHToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MinesweeperGame is ReentrancyGuard {
    using ECDSA for bytes32;
    
    FMHToken public fmhToken;
    IERC20 public monToken; // MON代币合约
    address public owner; // 主要Owner（向后兼容）
    address public serverSigner; // 服务器签名地址
    
    // 多Owner管理
    mapping(address => bool) public owners;
    uint256 public ownerCount;
    
    // 多签名和安全控制
    mapping(address => bool) public authorizedSigners; // 授权签名者
    uint256 public signerCount; // 签名者数量
    bool public paused; // 紧急暂停
    uint256 public dailyRewardLimit = 10000 ether; // 每日奖励上限 10000 FMH
    uint256 public dailyRewardUsed; // 今日已使用奖励
    uint256 public lastResetDay; // 上次重置日期
    
    // 调整经济参数 - 低成本高奖励机制
    uint256 public constant GAME_FEE_MON = 1 * 10**18; // 仅1 MON代币作为游戏费用
    uint256 public constant WIN_REWARD = 50 ether; // 大幅提高基础奖励 50 FMH
    uint256 public constant PERFECT_BONUS = 100 ether; // 大幅提高完美奖励 100 FMH
    uint256 public constant SPEED_BONUS_FAST = 50 ether; // 大幅提高速度奖励 50 FMH
    uint256 public constant SPEED_BONUS_MEDIUM = 25 ether; // 大幅提高速度奖励 25 FMH
    uint256 public constant MAX_REWARD_PER_CLAIM = 500 ether; // 单次最大奖励限制 500 FMH
    uint256 public constant MAX_GAME_DURATION = 3600; // 最大游戏时长1小时
    uint256 public constant MIN_GAME_DURATION = 1; // 最小游戏时长1秒
    
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
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event SecurityAlert(string indexed alertType, address indexed user, uint256 value);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    
    modifier onlyOwner() {
        require(owners[msg.sender] || msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorizedSigner() {
        require(authorizedSigners[msg.sender] || msg.sender == serverSigner, "Not authorized signer");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier gameExists(uint256 gameId) {
        require(gameId < gameCounter, "Game does not exist");
        _;
    }
    
    modifier checkDailyLimit(uint256 rewardAmount) {
        uint256 currentDay = block.timestamp / 86400; // 当前日期
        if (currentDay > lastResetDay) {
            dailyRewardUsed = 0; // 重置每日使用量
            lastResetDay = currentDay;
        }
        require(dailyRewardUsed + rewardAmount <= dailyRewardLimit, "Daily reward limit exceeded");
        dailyRewardUsed += rewardAmount;
        _;
    }
    
    constructor(address _fmhTokenAddress, address _monTokenAddress, address _serverSigner) {
        owner = msg.sender;
        owners[msg.sender] = true;
        ownerCount = 1;
        fmhToken = FMHToken(_fmhTokenAddress);
        monToken = IERC20(_monTokenAddress);
        serverSigner = _serverSigner;
        authorizedSigners[_serverSigner] = true;
        signerCount = 1;
        lastResetDay = block.timestamp / 86400;
    }
    
    // 安全管理函数
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
    
    function addAuthorizedSigner(address signer) external onlyOwner {
        require(signer != address(0), "Invalid signer address");
        require(!authorizedSigners[signer], "Signer already authorized");
        authorizedSigners[signer] = true;
        signerCount++;
    }
    
    function removeAuthorizedSigner(address signer) external onlyOwner {
        require(authorizedSigners[signer], "Signer not authorized");
        require(signerCount > 1, "Cannot remove last signer");
        authorizedSigners[signer] = false;
        signerCount--;
    }
    
    function updateDailyRewardLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Invalid limit");
        dailyRewardLimit = newLimit;
    }
    
    function startGame(uint8 width, uint8 height, uint8 mines) external whenNotPaused returns (uint256) {
        require(width >= 5 && width <= 30, "Invalid width");
        require(height >= 5 && height <= 30, "Invalid height");
        require(mines >= 1 && mines < (width * height), "Invalid mine count");
        
        // 收取MON代币作为游戏费用
        require(monToken.transferFrom(msg.sender, address(this), GAME_FEE_MON), "MON payment failed");
        
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
        
        return gameId;
    }
    
    function completeGame(uint256 gameId, bool won, uint256 score) external gameExists(gameId) {
        Game storage game = games[gameId];
        require(game.player == msg.sender, "Not your game");
        require(!game.isCompleted, "Game already completed");
        
        uint256 duration = block.timestamp - game.startTime;
        require(duration >= MIN_GAME_DURATION, "Game too short");
        require(duration <= MAX_GAME_DURATION, "Game too long");
        
        game.endTime = block.timestamp;
        game.isWon = won;
        game.isCompleted = true;
        game.score = score;
        
        if (won) {
            playerStats[msg.sender]++;
        }
        
        emit GameCompleted(gameId, msg.sender, won, score, game.endTime - game.startTime);
    }
    
    function claimReward(uint256 gameId) external gameExists(gameId) whenNotPaused {
        Game storage game = games[gameId];
        require(game.player == msg.sender, "Not your game");
        require(game.isCompleted, "Game not completed");
        require(game.isWon, "Game not won");
        require(!game.rewardClaimed, "Reward already claimed");
        
        game.rewardClaimed = true;
        
        uint256 reward = WIN_REWARD;
        uint256 duration = game.endTime - game.startTime;
        
        // Perfect game bonus (降低门槛：60秒内或500分以上)
        if (duration < 60 || game.score >= 500) {
            reward += PERFECT_BONUS; // 100 FMH bonus
        }
        
        // Speed bonus (更宽松的时间限制)
        if (duration < 60) {
            reward += SPEED_BONUS_FAST; // 50 FMH bonus
        } else if (duration < 180) {
            reward += SPEED_BONUS_MEDIUM; // 25 FMH bonus
        }
        
        // 新增：参与奖励（只要完成游戏就有额外奖励）
        reward += 20 ether; // 无条件参与奖励 20 FMH
        
        // 检查每日奖励限额
        uint256 currentDay = block.timestamp / 86400;
        if (currentDay > lastResetDay) {
            dailyRewardUsed = 0;
            lastResetDay = currentDay;
        }
        require(dailyRewardUsed + reward <= dailyRewardLimit, "Daily reward limit exceeded");
        dailyRewardUsed += reward;
        
        // 安全检查奖励限制
        require(reward <= MAX_REWARD_PER_CLAIM, "Reward exceeds maximum");
        
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
        
        // Perfect game bonus (降低门槛：60秒内或500分以上)
        if (duration < 60 || score >= 500) {
            reward += PERFECT_BONUS; // 100 FMH bonus
        }
        
        // Speed bonus (更宽松的时间限制)
        if (duration < 60) {
            reward += SPEED_BONUS_FAST; // 50 FMH bonus
        } else if (duration < 180) {
            reward += SPEED_BONUS_MEDIUM; // 25 FMH bonus
        }
        
        // 新增：参与奖励（只要完成游戏就有额外奖励）
        reward += 20 ether; // 无条件参与奖励 20 FMH
        
        // 安全检查奖励限制
        require(reward <= MAX_REWARD_PER_CLAIM, "Reward exceeds maximum");
        
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
        uint256 monBalance = monToken.balanceOf(address(this));
        require(monBalance > 0, "No MON fees to withdraw");
        
        require(monToken.transfer(owner, monBalance), "MON withdrawal failed");
        
        emit FeesWithdrawn(owner, monBalance);
    }
    
    // 用于销毁MON代币的功能（减少供应量）
    function burnCollectedFees(uint256 amount) external onlyOwner {
        uint256 monBalance = monToken.balanceOf(address(this));
        require(amount <= monBalance, "Insufficient MON balance to burn");
        require(amount > 0, "Amount must be greater than 0");
        
        // 如果MON代币有burn功能，可以直接销毁
        // 这里假设转移到黑洞地址实现销毁
        require(monToken.transfer(address(0), amount), "MON burn failed");
        
        emit SecurityAlert("MON_BURNED", msg.sender, amount);
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
     * @dev 更新MON代币合约地址（仅合约拥有者）
     */
    function updateMonToken(address newMonToken) external onlyOwner {
        require(newMonToken != address(0), "Invalid MON token address");
        monToken = IERC20(newMonToken);
    }
    
    /**
     * @dev 查询服务器签名地址
     */
    function getServerSigner() external view returns (address) {
        return serverSigner;
    }
    
    /**
     * @dev 查询MON代币合约地址
     */
    function getMonToken() external view returns (address) {
        return address(monToken);
    }
    
    /**
     * @dev 查询合约中的MON代币余额
     */
    function getMonBalance() external view returns (uint256) {
        return monToken.balanceOf(address(this));
    }
    
    /**
     * @dev 检查nonce是否已使用
     */
    function isNonceUsed(address player, uint256 nonce) external view returns (bool) {
        return usedNonces[player][nonce];
    }
    
    // 多Owner管理函数
    function addOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        require(!owners[newOwner], "Owner already exists");
        owners[newOwner] = true;
        ownerCount++;
        emit OwnerAdded(newOwner);
    }
    
    function removeOwner(address ownerToRemove) external onlyOwner {
        require(owners[ownerToRemove], "Owner does not exist");
        require(ownerCount > 1, "Cannot remove last owner");
        require(ownerToRemove != owner, "Cannot remove primary owner");
        owners[ownerToRemove] = false;
        ownerCount--;
        emit OwnerRemoved(ownerToRemove);
    }
    
    function isOwner(address addr) external view returns (bool) {
        return owners[addr] || addr == owner;
    }
    
    function getOwnerCount() external view returns (uint256) {
        return ownerCount;
    }
}