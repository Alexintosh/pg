import React, { Component } from 'react';
import './App.css';
import { Metamask, Gas, ContractLoader, Transactions, Events, Scaler, Blockie, Address, Button } from "dapparatus"
import Web3 from 'web3';
import Exchange from './contracts/Exchange';
import USDG from './contracts/ERC20';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: false,
      account: false,
      gwei: 4,
      doingTransaction: false,
      network: "Go",
      order: {
        id: 1,
        token: 'GO',
        amout: 10
      },
      onGoingTx: [],
      subscription: {},
    }
  }

  init = async () => {
    
    const web3 = this.state.web3;
    const exchange = new this.state.web3.eth.Contract(Exchange.abi, Exchange.address);
    const usdg = new this.state.web3.eth.Contract(USDG.abi, USDG.address);
    
    // Works
    // console.log('contract', contract)
    // const res = await contract.methods.ethPool().call()
    // console.log('res', res)

    // Doesn't Works
    // this.state.subscription.pendingTransactions = this.state.web3.eth.subscribe('pendingTransactions', (error, result) => {
    //     if (!error)
    //         console.log(result);
    // })
    // .on("data", function(transaction){
    //     console.log('transaction', transaction);
    // });

    const options = {
      filter: {
        buyer: this.state.account
      },
      fromBlock: 'latest'
    }
  
    // // Subscribe to Transfer events matching filter criteria
    exchange.events.EthToTokenPurchase(options)
    .on('data', function(event){
      console.log('EthToTokenPurchase', event);

      const goValue = web3.utils.fromWei(event.returnValues[1], 'ether');
      const usdgValue = web3.utils.fromWei(event.returnValues[2], 'ether');
      toast.success(`${goValue} Go swapped for ${usdgValue} USDG!`, {position: toast.POSITION.BOTTOM_CENTER });
    }).on('error', function(error){
      console.log('ERROR', error);
    });

    // exchange.getPastEvents('EthToTokenPurchase', {
    //     fromBlock: 0,
    //     toBlock: 'latest'
    // }, function(error, events){ console.log(events); })
    // .then(function(events){
    //     console.log('events', events) // same results as the optional callback above
    // });
  

    // exchange.events.allEvents(null, async (error, event ) => {
    //   console.log('event', event);
    //   console.log('event', error);
    // })

    toast.info("Dapp Initialized!", {
      position: toast.POSITION.BOTTOM_CENTER
    });

    this.setState({
      contracts: {
        exchange,
        usdg
      }
    })
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



  handleInput(e){
    let update = {}
    update[e.target.name] = e.target.value
    this.setState(update)
  }

  exchange() {
    const check = this.checkTx;
    const sentToast = () => toast.info("Transaction sent!", {position: toast.POSITION.BOTTOM_CENTER });


    this.state.contracts
      .exchange
      .methods
      .ethToTokenSwap(this.state.web3.utils.toWei('1', 'ether'), "1546014502")
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

  render() {
    let {web3,account,contracts,tx,gwei,block,avgBlockTime,etherscan} = this.state
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

        <Button color={"green"} size={"2"} onClick={()=>{
          //do some transaction on button click
          tx( contracts
                .usdg
                .methods
                .approve("0xb6f448e57c4b01ea88fa04a92b7696871bf12c61", 1000000),
                (receipt)=>{
                  console.log('receipt', receipt)
                  //when the transaction goes through you'll have a receipt here
                })
        }}>
          Approve
        </Button>

        <Button color={"green"} size={"2"} onClick={()=>{ this.exchange(); }}>
          Exchange 0.01
        </Button>

        <ToastContainer />
      </div>
    );
  }
}

export default App;
