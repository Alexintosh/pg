import React, { Component } from 'react';
import './App.css';
import { Metamask, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address, Button } from "dapparatus"
import Web3 from 'web3';
import Exchange from './contracts/Exchange';
import USDG from './contracts/ERC20';
import Gateway from './contracts/UnstoppablePaymentGateway';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { parse, build } from 'eth-url-parser';
import uuid from 'uuid/v4';
import queryString from 'query-string';

const rand = (min=1 , max=999999999) => {
  let random_number = Math.random() * (max-min) + min;
  return Math.floor(random_number);
};

const GlobalVar = {
  GOToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  USDGtoken: "0xd1574837a02ba934be92adbde12a62a658cd3186"
};

const paymentRequest = {
  id: rand(),
  seller: '0xd18a54f89603fe4301b29ef6a8ab11b9ba24f139',
  usdValue: "5",
  tokenValue: "0.1",
  token: GlobalVar.GOToken,
  isPaid: false,
  paymentTx: null,
}



const sentToast = () => toast.info("Transaction sent!", {position: toast.POSITION.BOTTOM_CENTER });

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: false,
      account: false,
      gwei: 4,
      doingTransaction: false,
      network: "Go",
      loading: true,
      order: {
        ...paymentRequest,
        token: paymentRequest.token,
        amout: paymentRequest.goValue,
        img: null
      },
      allowanceUSDGtoGateway: "0",
      onGoingTx: [],
      subscription: {},
    }
  }

  init = async () => {

    const parsed = queryString.parse(window.location.search);
    const orderId = parseInt(parsed.orderId) || rand();

    this.setState({
      order: {
        ...this.state.order,
        id: orderId
      }
    })
    
    const web3 = this.state.web3;
    const exchange = new this.state.web3.eth.Contract(Exchange.abi, Exchange.address);
    const usdg = new this.state.web3.eth.Contract(USDG.abi, USDG.address);
    const gateway = new this.state.web3.eth.Contract(Gateway.abi, Gateway.address);
  
    /**
     * Setup Exchange Events Listeners
     */

    const options = {
      filter: {
        buyer: this.state.account
      },
      fromBlock: 'latest'
    }

    exchange.events.EthToTokenPurchase(options)
      .on('data', function(event){
        console.log('EthToTokenPurchase', event);

        const goValue = web3.utils.fromWei(event.returnValues[1], 'ether');
        const usdgValue = web3.utils.fromWei(event.returnValues[2], 'ether');
        toast.success(`${goValue} Go swapped for ${usdgValue} USDG!`, {position: toast.POSITION.BOTTOM_CENTER, toastId: event.blockHash });
      })
      .on('error', function(error){
        console.log('ERROR', error);
      });

    exchange.events.TokenToEthPurchase(options)
      .on('data', function(event){
        console.log('TokenToEthPurchase', event);

        const usdgValue = web3.utils.fromWei(event.returnValues[1], 'ether');
        const goValue = web3.utils.fromWei(event.returnValues[2], 'ether');
        toast.success(`${usdgValue} USDG swapped for ${goValue} Go!`, {position: toast.POSITION.BOTTOM_CENTER, toastId: event.blockHash });
      })
      .on('error', function(error){
        console.log('ERROR', error);
      });

    /**
     * Setup Gateway Events Listeners
     */

    const gatewayOptions = {
      filter: {
        _payer: this.state.account
      },
      fromBlock: 'latest'
    }

    gateway.events.ProofOfPayment(gatewayOptions)
      .on('data', async (event) => {
        console.log('ProofOfPayment', event);

        const seller = event.returnValues[1];
        const amount = web3.utils.fromWei(event.returnValues[3], 'ether');
        toast.success(`You paid ${amount}`, {position: toast.POSITION.BOTTOM_CENTER, toastId: event.blockHash});

        let isThereProof = await this.checkOrderAlreadyPaid(this.state.order);
        console.log('isThereProof', isThereProof, this.state.order);
        this.setState({
          order: {
            ...this.state.order,
            isPaid: isThereProof
          }
        })
      })
      .on('error', function(error){
        console.log('ERROR', error);
      });

    this.setState({
      contracts: {
        exchange,
        usdg,
        gateway
      }
    })


    this.getAllowance();
    this.checkGoPrice();
    

    /**
     * Check if order has been already payed
     */
    const isPaid = await this.checkOrderAlreadyPaid({...this.state.order, id: orderId});
    console.log('isPaid', isPaid, this.state.order);

    if(isPaid) {
      this.setState({
        loading: false,
        order: {
          ...this.state.order,
          isPaid: true
        }
      })
    } else {
      this.genQRcode();
    }

    toast.info("Dapp Initialized!", {
      position: toast.POSITION.BOTTOM_CENTER
    });
  }

  checkTx = async (tx) => {
    console.log('checkTx', tx)
    const txObj = await this.state.web3.eth.getTransactionReceipt(tx);
    if(!txObj) {
      setTimeout( () => this.checkTx(tx), 1000 );
    } else {
      toast.success("Transaction confirmed!", {position: toast.POSITION.BOTTOM_CENTER });
    }
  }

  checkGoPrice = async () => {
    fetch(`https://api.coinmarketcap.com/v1/ticker/gochain/?convert=USD`)
      .then(res => console.log(res) )
  }

  genQRcode() {
    const url =  build({
      scheme: 'ethereum',
      prefix: 'pay',
      target_address: '0xB599Ac9d4892f44fEAc6bec3314Ef58432Ae3c79',
      function_name: 'EthToTokenPurchase',
      parameters: {
          'address': '1',
          'uint256': '1546014502'
      }
    });

    const baseImgUrl = `http://api.qrserver.com/v1/create-qr-code/?color=000000&bgcolor=FFFFFF&data=${escape(url)}&qzone=1&margin=0&size=250x250&ecc=L`;


    this.setState({
      loading: false,
      order: {
        ...this.state.order,
        img: baseImgUrl
      }
    })
  }

  exchangeGo() {
    const check = this.checkTx;
    
    this.state.contracts
      .exchange
      .methods
      .ethToTokenSwap(this.state.web3.utils.toWei('1', 'ether'))
      .send({from:this.state.account, value: this.state.web3.utils.toWei('0.01', 'ether')})
        .on('transactionHash', function(hash){
          console.log('transactionHash', hash)
          sentToast();
          check(hash);
        })
        .on('receipt', function(receipt){
          //console.log('receipt', receipt)
        })
        .on('confirmation', function(confirmationNumber, receipt){
            //console.log('confirmationNumber', confirmationNumber, receipt)
        })
        .on('error', console.error);
  }

  checkOrderAlreadyPaid = async (order) => {

    const payedWithGo = await this.state.contracts
      .gateway
      .methods
      .isOrderPaid(
        order.seller,
        order.id,
        this.state.web3.utils.toWei(order.tokenValue, 'ether'),
        order.token
      ).call()
    
    const payedWithToken = await this.state.contracts
      .gateway
      .methods
      .isOrderPaid(
        order.seller,
        order.id,
        this.state.web3.utils.toWei(order.usdValue, 'ether'),
        GlobalVar.USDGtoken
      ).call()

    return payedWithGo || payedWithToken
  }

  payWithGo(order) {
    const check = this.checkTx;
    console.log('order', order)
    this.state.contracts
      .gateway
      .methods
      .payWithGO(
        order.seller,
        order.id,
        this.state.web3.utils.toWei(order.tokenValue, 'ether').toString()
      )
      .send({from:this.state.account, value: this.state.web3.utils.toWei(order.tokenValue, 'ether')})
        .on('transactionHash', function(hash){
          console.log('transactionHash', hash)
          sentToast();
          check(hash);
        })
        .on('receipt', function(receipt){
          //console.log('receipt', receipt)
        })
        .on('confirmation', function(confirmationNumber, receipt){
            //console.log('confirmationNumber', confirmationNumber, receipt)
        })
        .on('error', console.error);
  }

  payWithToken(order) {
    const check = this.checkTx;
    console.log('order', order)
    this.state.contracts
      .gateway
      .methods
      .payWithToken(
        order.seller,
        parseInt(order.id),
        this.state.web3.utils.toWei(order.usdValue, 'ether').toString(),
        GlobalVar.USDGtoken
      )
      .send({from:this.state.account})
        .on('transactionHash', function(hash){
          console.log('transactionHash', hash)
          sentToast();
          check(hash);
        })
        .on('receipt', function(receipt){
          //console.log('receipt', receipt)
        })
        .on('confirmation', function(confirmationNumber, receipt){
            //console.log('confirmationNumber', confirmationNumber, receipt)
        })
        .on('error', console.error);
  }

  exchangeUSDG() {
    const check = this.checkTx;
    this.state.contracts
      .exchange
      .methods
      .tokenToEthSwap(
        this.state.web3.utils.toWei('10', 'ether'), // Num token
        this.state.web3.utils.toWei('0.0000000000000001', 'ether'), // Min ether
        '1546014502'
      )
      .send({from:this.state.account})
        .on('transactionHash', function(hash){
          console.log('transactionHash', hash)
          sentToast();
          check(hash);
        })
        .on('receipt', function(receipt){
          //console.log('receipt', receipt)
        })
        .on('confirmation', function(confirmationNumber, receipt){
            //console.log('confirmationNumber', confirmationNumber, receipt)
        })
        .on('error', console.error);
  }

  getAllowance = async () => {
    /**
     * Check for allowance to the Gateway
     */
    const allowanceGateway = await this.state.contracts.usdg.methods.allowance(this.state.account, Gateway.address).call()
    console.log('allowanceGateway', allowanceGateway, this.state.order);

    this.setState({
      allowanceUSDGtoGateway: this.state.web3.utils.fromWei(allowanceGateway, 'ether')
    })
  }

  requestAllowance = async () => {
    const cb = this.getAllowance;
    this.state.contracts
            .usdg
            .methods
            .approve(Gateway.address, this.state.web3.utils.toWei(this.state.order.usdValue, 'ether'))
            .send({from:this.state.account})
            .on('receipt', function(receipt){
              console.log('receipt', receipt)
              cb();
            })
    
  }

  renderPayUI() {
    let { order, tx, contracts, web3, allowanceUSDGtoGateway } = this.state;
    const allowanceNeeded = web3.utils.toWei(allowanceUSDGtoGateway) < web3.utils.toWei(order.usdValue);
    return(
      <div>
          <h1>Order id: {order.id}</h1>
          <Button color={"green"} size={"2"} onClick={()=>{ this.payWithGo(order); }}>
            Pay {order.tokenValue} GO
          </Button>

          { allowanceNeeded ?
            <Button color={"green"} disabled={true} size={"2"} onClick={()=>{ this.requestAllowance() }}>
              Approve {order.usdValue} USDG to Gateway
            </Button>
          :
            <Button color={"green"} size={"2"} onClick={()=>{ this.payWithToken(order); }}>
              Pay {order.usdValue} USDG
            </Button>
          }

          { 
            allowanceNeeded ?
              <h3>First Approve to pay with token, currently {this.state.allowanceUSDGtoGateway} 👆👆👆👆👆👆</h3>
            :
            <h3>Allowance {this.state.allowanceUSDGtoGateway}</h3>
          }

          { order.img ? <img src={order.img} /> : null}
      </div>
    )
  }

  renderExchangeUI() {
    return (
      <div>
        <Button color={"green"} size={"2"} onClick={()=>{ this.exchangeGo(); }}>
          Exchange 0.01 GO
        </Button>

        <Button color={"green"} size={"2"} onClick={()=>{ this.exchangeUSDG(); }}>
          Exchange 10 USDG
        </Button>
      </div>
    )
  }

  render() {
    let {web3, account, gwei, block, loading, etherscan, order} = this.state
    let connectedDisplay = []
    if(web3){

      connectedDisplay.push(
        <Transactions
          key="Transactions"
          config={{DEBUG:false}}
          account={account}
          gwei={gwei}
          web3={web3}
          block={block}
          avgBlockTime={2000}
          etherscan={etherscan}
          onReady={(state)=>{
            console.log("Transactions component is ready:",state)
            this.setState(state)
          }}
          onReceipt={(transaction,receipt)=>{
            console.log("Transaction Receipt",transaction,receipt)
          }}
        />
      )

    }
    return (
      <div className="App">
        <Metamask
          config={{requiredNetwork:['Unknown','Rinkeby']}}
          onUpdate={(state)=>{
           //console.log("metamask state update:",state)
           if(state.web3Provider) {
             state.web3 = new Web3(state.web3Provider)
             if( !this.state.web3 ) {
                setTimeout(this.init, 200);
             } 
             this.setState(state)
           }
          }}
        />
        {connectedDisplay}

        { loading ? <h3>Loading...</h3> :
          <div>
           { order.isPaid ? <h3>Order {order.id} paid</h3> : <div> {this.renderPayUI()}  {/*this.renderExchangeUI()*/} </div> }
          </div>
        }

        <ToastContainer />
      </div>
    );
  }
}

export default App;
