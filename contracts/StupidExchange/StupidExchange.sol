pragma solidity 0.4.25;

contract Ownable {
    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
    * @dev The Ownable constructor sets the original `owner` of the contract to the sender
    * account.
    */
    constructor() public {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
    * @return the address of the owner.
    */
    function owner() public view returns(address) {
        return _owner;
    }

    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    /**
    * @return true if `msg.sender` is the owner of the contract.
    */
    function isOwner() public view returns(bool) {
        return msg.sender == _owner;
    }

    /**
    * @dev Allows the current owner to relinquish control of the contract.
    * @notice Renouncing to ownership will leave the contract without an owner.
    * It will not be possible to call the functions with the `onlyOwner`
    * modifier anymore.
    */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
    * @dev Allows the current owner to transfer control of the contract to a newOwner.
    * @param newOwner The address to transfer ownership to.
    */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
    * @dev Transfers control of the contract to a newOwner.
    * @param newOwner The address to transfer ownership to.
    */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}

interface ERC20Interface {
    function totalSupply() public constant returns (uint);
    function balanceOf(address tokenOwner) public constant returns (uint balance);
    function allowance(address tokenOwner, address spender) public constant returns (uint remaining);
    function transfer(address to, uint tokens) public returns (bool success);
    function approve(address spender, uint tokens) public returns (bool success);
    function transferFrom(address from, address to, uint tokens) public returns (bool success);
    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract StupidExchange is Ownable {
    using SafeMath for uint256;
    address public owner;

    /// EVENTS
    event EthToTokenPurchase(address indexed buyer, uint256 indexed ethIn, uint256 indexed tokensOut);
    event TokenToEthPurchase(address indexed buyer, uint256 indexed tokensIn, uint256 indexed ethOut);

    /// CONSTANTS
    uint256 public constant FEE_RATE = 500;        //fee = 1/feeRate = 0.2%

    /// STORAGE
    uint256 public ethPool;
    uint256 public tokenPool;
    uint256 public invariant;
    address public tokenAddress;
    
    ERC20Interface token;

    /// MODIFIERS
    modifier exchangeInitialized() {
        require(invariant > 0);
        _;
    }

    /// CONSTRUCTOR
    constructor (address _tokenAddress) public {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
        token = ERC20Interface(tokenAddress);
    }

    /// FALLBACK FUNCTION
    function() public payable {
        require(msg.value != 0);
        ethToToken(msg.sender, msg.sender, msg.value);
    }

    /// EXTERNAL FUNCTIONS
    function init(uint256 _tokenAmount) external payable {
        require(invariant == 0);
        
        ethPool = msg.value;
        tokenPool = _tokenAmount;
        invariant = ethPool.mul(tokenPool);
        require(token.transferFrom(msg.sender, address(this), _tokenAmount));
    }
    
    function kill() public onlyOwner {
        selfdestruct(msg.sender);
    }
    
    function withdraw() public onlyOwner returns (bool success) {
        require(address(this).balance > 0);
        owner.transfer(address(this).balance);
        return true;
    }
    
    function withdrawTokens() public onlyOwner returns (bool success) {
        uint256 balance = token.balanceOf(this);

        // Double checking
        require(balance > 0);
        require(token.transfer(msg.sender, balance));
        return true;
    }

    // Buyer swaps ETH for Tokens
    function ethToTokenSwap(
        uint256 _minTokens
        // uint256 _timeout
    )
        external
        payable
    {
        require(msg.value > 0 && _minTokens > 0);
        ethToToken(msg.sender, msg.sender, msg.value,  _minTokens);
    }


    // Buyer swaps Tokens for ETH
    function tokenToEthSwap(
        uint256 _tokenAmount,
        uint256 _minEth,
        uint256 _timeout
    )
        external
    {
        require(_tokenAmount > 0 && _minEth > 0 && now < _timeout);
        tokenToEth(msg.sender, msg.sender, _tokenAmount, _minEth);
    }

    /// INTERNAL FUNCTIONS
    function ethToToken(
        address buyer,
        address recipient,
        uint256 ethIn,
        uint256 minTokensOut
    )
        internal
        exchangeInitialized
    {
        uint256 fee = ethIn.div(FEE_RATE);
        uint256 newEthPool = ethPool.add(ethIn);
        uint256 tempEthPool = newEthPool.sub(fee);
        uint256 newTokenPool = invariant.div(tempEthPool);
        uint256 tokensOut = tokenPool.sub(newTokenPool);
        require(tokensOut >= minTokensOut && tokensOut <= tokenPool);
        ethPool = newEthPool;
        tokenPool = newTokenPool;
        invariant = newEthPool.mul(newTokenPool);
        emit EthToTokenPurchase(buyer, ethIn, tokensOut);
        require(token.transfer(recipient, tokensOut));
    }

    function tokenToEth(
        address buyer,
        address recipient,
        uint256 tokensIn,
        uint256 minEthOut
    )
        internal
        exchangeInitialized
    {
        uint256 fee = tokensIn.div(FEE_RATE);
        uint256 newTokenPool = tokenPool.add(tokensIn);
        uint256 tempTokenPool = newTokenPool.sub(fee);
        uint256 newEthPool = invariant.div(tempTokenPool);
        uint256 ethOut = ethPool.sub(newEthPool);
        require(ethOut >= minEthOut && ethOut <= ethPool);
        tokenPool = newTokenPool;
        ethPool = newEthPool;
        invariant = newEthPool.mul(newTokenPool);
        emit TokenToEthPurchase(buyer, tokensIn, ethOut);
        require(token.transferFrom(buyer, address(this), tokensIn));
        recipient.transfer(ethOut);
    }
}