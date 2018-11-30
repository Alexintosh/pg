import React, { Component } from 'react';
import './App.css';
import {Dapparatus, Metamask, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address } from "dapparatus"
import Web3 from 'web3';
import Exchange from './contracts/Exchange';
import USDG from './contracts/ERC20';
import Gateway from './contracts/UnstoppablePaymentGateway';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { parse, build } from 'eth-url-parser';
import queryString from 'query-string';
import { Container, Column, Panel, Button, PanelBlock, PanelHeading, Icon, PanelTab, Checkbox, PanelTabs, PanelIcon, Notification, Tag,
Media, MediaLeft, Image, Content, MediaContent } from 'bloomer';

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
  shopName: "Crypto Swag",
  itemName: "Mastering Bitcoin"
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
      toggleAccountView: false,
      toggleExchangeView: false,
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

    const params = queryString.parse(window.location.search);
    const orderId = parseInt(params.orderId) || rand();

    this.setState({
      order: {
        ...this.state.order,
        id: orderId,
        shopName: params.shopname || false,
        itemName: params.itemname || false,
        tokenValue: params.pricego || paymentRequest.tokenValue,
        usdValue: params.usd || paymentRequest.usdValue,
        img: params.img || false,
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
        qrCode: baseImgUrl
      }
    })
  }

  exchangeGo() {
    const check = this.checkTx;
    
    this.state.contracts
      .exchange
      .methods
      .ethToTokenSwap(this.state.web3.utils.toWei('1', 'ether'), this.state.account)
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
      .payWithGoReceiveToken(
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
        this.state.account
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
          {
            this.state.metaAccount ?
              <PanelBlock>
                  <h3>Use your phone or install metamask.</h3>
              </PanelBlock>
            :
              <PanelBlock style={{ padding: "0px"}}>
                <Column isSize="1/2" onClick={()=>{ this.payWithGo(order); }} style={{ borderRight: "1px", cursor: "pointer", backgroundColor: "#5167FF", color: "#fff"}}>
                  PAY {order.tokenValue}GO
                </Column>

                { allowanceNeeded ?
                  <Column isSize="1/2" onClick={()=>{ this.requestAllowance() }} style={{ borderRight: "1px", cursor: "pointer", backgroundColor: "#1BCDFF", color: "#fff"}}>
                    <Icon isSize="small" className="fa fa-lock" /> {order.usdValue} USDG
                  </Column>
                  :
                  <Column isSize="1/2" onClick={()=>{ this.payWithToken(order) }} style={{ borderRight: "1px", cursor: "pointer", backgroundColor: "#1BCDFF", color: "#fff"}}>
                    PAY {order.usdValue} USDG
                  </Column>
                }

                      
              </PanelBlock>
          }
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
    let {web3, account, gwei, block, loading, etherscan, order, metaAccount} = this.state
    console.log('this.state', this.state)
    let connectedDisplay = []
    if(web3 && !metaAccount){

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
      <Container style={{margin: '20px auto'}}>
      <ToastContainer />
      <div isSize="12" isCentered className="columns is-centered">
      <Column isSize={{mobile: 12, desktop:"1/3"}} isOffset={1} className="has-text-centered">
        <Panel>
          <PanelHeading>Unipay 🦄</PanelHeading>
          { loading ? <h3>Loading...</h3> : this.renderPayUI() }
          <PanelBlock>            
            <Media>
                <MediaLeft>
                    <Image isSize='64x64' src={order.img} />
                </MediaLeft>
                <MediaContent>
                    <Content>
                        <p>
                            <strong>{order.itemName}</strong> <small>@{order.shopName}</small> <small>#{order.id}</small>
                            <br />
                            {order.tokenValue}GO / {order.usdValue}$  <Tag isColor='warning'>TESTNET</Tag>
                        </p>
                    </Content>
                </MediaContent>
            </Media>
          </PanelBlock>
          <PanelBlock >
            <Column isSize={12} className="has-text-centered">
              { order.qrCode ? <img src={order.qrCode} /> : null}
            </Column>
          </PanelBlock>
          <PanelBlock >
            <Column isSize={12} className="has-text-centered">
              <Button isColor='info' isSize="large">open in wallet</Button>
            </Column>
          </PanelBlock>
      </Panel>
      </Column>
      </div>        
      <Column>
      <Dapparatus
          config={{requiredNetwork:['Unknown','Rinkeby', 'GO (testnet)'], DEBUG:false, hide:this.state.toggleAccountView}}
          fallbackWeb3Provider={new Web3.providers.HttpProvider('https://testnet-rpc.gochain.io')}
          onUpdate={(state)=>{
           //console.log("metamask state update:",state)
           if(state.web3Provider) {
             state.web3 = new Web3(state.web3Provider)
             state.network = 'GO (testnet)'
             state.toggleAccountView = state.metaAccount ? true : true;
             if( !this.state.web3 ) {
              setTimeout(this.init, 200);
             } 
             this.setState(state)
           }
          }}
        />
      </Column>
        {/*connectedDisplay*/}
      </Container>
    </div>
    );
  }
}

export default App;
