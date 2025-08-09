// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract FMHToken is IERC20 {
    string public name = "FMH Token";
    string public symbol = "FMH";
    uint8 public decimals = 18;
    uint256 private _totalSupply;
    
    // 安全限制
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 1亿代币上限
    uint256 public constant SINGLE_MINT_LIMIT = 10_000 * 10**18; // 单次铸币上限 10K
    uint256 public constant DAILY_MINT_LIMIT = 50_000 * 10**18; // 每日铸币上限 50K
    
    // 每日铸币跟踪
    mapping(uint256 => uint256) public dailyMintAmount; // 日期 => 铸币量
    uint256 private constant SECONDS_PER_DAY = 86400;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    address public owner; // 主要Owner（向后兼容）
    address public minesweeperGame;
    
    // 多Owner管理
    mapping(address => bool) public owners;
    uint256 public ownerCount;
    
    // 授权铸币者管理
    mapping(address => bool) public authorizedMinters;
    uint256 public minterCount;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event DailyMintLimitReset(uint256 indexed day);
    event TokensBurned(address indexed from, uint256 amount, address indexed burner);
    
    modifier onlyOwner() {
        require(owners[msg.sender] || msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGame() {
        require(msg.sender == minesweeperGame, "Not authorized game");
        _;
    }
    
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == minesweeperGame, "Not authorized minter");
        _;
    }
    
    modifier onlyBurner() {
        require(owners[msg.sender] || msg.sender == owner || msg.sender == minesweeperGame, "Not authorized to burn");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        owners[msg.sender] = true;
        ownerCount = 1;
        
        // 给Owner默认铸币权限
        authorizedMinters[msg.sender] = true;
        minterCount = 1;
        
        uint256 initialSupply = 1000000 * 10**decimals;
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds maximum");
        _totalSupply = initialSupply;
        _balances[owner] = _totalSupply;
        emit Transfer(address(0), owner, _totalSupply);
        emit MinterAdded(msg.sender);
    }
    
    function setMinesweeperGame(address _game) external onlyOwner {
        minesweeperGame = _game;
    }
    
    function mint(address to, uint256 amount) external onlyAuthorizedMinter {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= SINGLE_MINT_LIMIT, "Exceeds single mint limit");
        require(_totalSupply + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        
        // 检查每日铸币限制
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        require(dailyMintAmount[currentDay] + amount <= DAILY_MINT_LIMIT, "Exceeds daily mint limit");
        
        _totalSupply += amount;
        _balances[to] += amount;
        dailyMintAmount[currentDay] += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    // 授权铸币者管理函数
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!authorizedMinters[minter], "Minter already authorized");
        authorizedMinters[minter] = true;
        minterCount++;
        emit MinterAdded(minter);
    }
    
    function removeAuthorizedMinter(address minter) external onlyOwner {
        require(authorizedMinters[minter], "Minter not authorized");
        authorizedMinters[minter] = false;
        minterCount--;
        emit MinterRemoved(minter);
    }
    
    function isAuthorizedMinter(address minter) external view returns (bool) {
        return authorizedMinters[minter] || minter == minesweeperGame;
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
    
    // 实用查询函数
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - _totalSupply;
    }
    
    function getDailyMintRemaining() external view returns (uint256) {
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        uint256 used = dailyMintAmount[currentDay];
        return used >= DAILY_MINT_LIMIT ? 0 : DAILY_MINT_LIMIT - used;
    }
    
    function getCurrentDay() external view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }
    
    // 查询总销毁量（最大供应量 - 当前供应量）
    function getTotalBurned() external view returns (uint256) {
        // 这里假设初始供应量是1000000，可以根据实际情况调整
        uint256 initialSupply = 1000000 * 10**decimals;
        if (_totalSupply < initialSupply) {
            return initialSupply - _totalSupply;
        }
        return 0;
    }
    
    // 查询销毁比例
    function getBurnRate() external view returns (uint256) {
        uint256 initialSupply = 1000000 * 10**decimals;
        if (initialSupply == 0) return 0;
        uint256 burned = initialSupply > _totalSupply ? initialSupply - _totalSupply : 0;
        return (burned * 10000) / initialSupply; // 返回万分比
    }
    
    // 批量销毁功能（用于特殊活动或回收）
    function batchBurn(address[] calldata accounts, uint256[] calldata amounts) external onlyBurner {
        require(accounts.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalBurned = 0;
        for (uint256 i = 0; i < accounts.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(_balances[accounts[i]] >= amounts[i], "Insufficient balance");
            
            _balances[accounts[i]] -= amounts[i];
            totalBurned += amounts[i];
            
            emit Transfer(accounts[i], address(0), amounts[i]);
            emit TokensBurned(accounts[i], amounts[i], msg.sender);
        }
        
        _totalSupply -= totalBurned;
    }
    
    // 销毁代币功能
    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance to burn");
        
        _balances[msg.sender] -= amount;
        _totalSupply -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
        emit TokensBurned(msg.sender, amount, msg.sender);
    }
    
    function burnFrom(address from, uint256 amount) external onlyBurner {
        require(amount > 0, "Amount must be greater than 0");
        require(_balances[from] >= amount, "Insufficient balance to burn");
        
        _balances[from] -= amount;
        _totalSupply -= amount;
        
        emit Transfer(from, address(0), amount);
        emit TokensBurned(from, amount, msg.sender);
    }
    
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) external override returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address tokenOwner, address spender) external view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
        require(_balances[from] >= amount, "Insufficient balance");
        
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}