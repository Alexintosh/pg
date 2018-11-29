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

interface IERC20 {

    function totalSupply() public constant returns (uint);

    function balanceOf(address tokenOwner) public constant returns (uint balance);

    function allowance(address tokenOwner, address spender) public constant returns (uint remaining);

    function transfer(address to, uint tokens) public returns (bool success);

    function approve(address spender, uint tokens) public returns (bool success);

    function transferFrom(address from, address to, uint tokens) public returns (bool success);


    event Transfer(address indexed from, address indexed to, uint tokens);

    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);

}


contract GlobalVar {
    /**
    * Address Exchanges
    */
    address public StupidExchange = 0xb6f448e57c4b01ea88fa04a92b7696871bf12c61;
    
    address public GOToken = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public Pizzatoken = 0x3553a51d08db0565fe4bf8cd4dd554f9f24a65bc;
    address public USDGtoken = 0xd1574837a02ba934be92adbde12a62a658cd3186;
}

contract UnstoppablePaymentGateway is GlobalVar, Ownable{
    
    
    struct PaymentObj {
      address _payer; 
      address seller;
      address _token;
      uint _amount; 
      bytes32 _data;
      bool isPaid;
    }
    
    event ProofOfPayment(address indexed _payer, address indexed seller, address _token, uint _amount, bytes32 _data);
    
    mapping(address => mapping(uint => PaymentObj)) public payment;
    
    /**
    * Amount is included in the check since there is a chance that people 
    * will pay with less money then expected.
    * 
    */
    function isOrderPaid(address _sellerAddress, uint _orderId, uint256 amount, address token) public constant returns(bool success){
      return payment[_sellerAddress][_orderId].isPaid && 
             payment[_sellerAddress][_orderId]._amount == amount &&
             payment[_sellerAddress][_orderId]._token == token;
    } 
    
    function payWithGO(address seller, uint _orderId, uint256 amount) public payable returns  (bool success){
      require(seller != address(0)); 
      require(msg.value > 0 && msg.value == amount);
      
      seller.transfer(msg.value);
      
      bytes32 data = keccak256(abi.encodePacked( seller,_orderId ) );
          
      payment[seller][_orderId] = PaymentObj(msg.sender, seller, GOToken, amount, data, true);
      emit ProofOfPayment(msg.sender, seller, GOToken, amount, data);
      return true;
    }
    
    function payWithToken(address seller, uint _orderId, uint256 amount, address token) public payable returns  (bool success){
      require(seller != address(0)); 
      require(token != address(0));
      
      IERC20 tokenInstance = IERC20(token);
      
      //Do we have allowance?
      require(tokenInstance.allowance(msg.sender, address(this)) >= amount);
      require(tokenInstance.transferFrom(msg.sender, seller, amount));
      
      bytes32 data = keccak256(abi.encodePacked( seller,_orderId ) );
          
      payment[seller][_orderId] = PaymentObj(msg.sender, seller, token, amount, data, true);
      emit ProofOfPayment(msg.sender, seller, token, amount, data);
      return true;
    }
    
    function kill() public onlyOwner {
        selfdestruct(msg.sender);
    }
    
}