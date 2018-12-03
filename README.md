# The Unstoppable Payment Gateway - Unipay
---------------------------------

Project for the Go Chain Hackathon

Idea Name: UnstoppablePaymentGateway
Idea Summary:  Blockchain software solution which enables Merchants to accept payments in GO and ERC20 tokens without being exposed to the volatility of the specific currency used during the transaction, in a completely decentralized matter.

- [Hosted Demo](https://unipay.now.sh/?shopname=Go%20Coffebar&usd=60&itemname=Espresso%20x8&pricego=1578.95&img=http://storage.googleapis.com/main-course-images/Test%20folderName/medium_e9/3f1a20f56c11e8805e87df60985b4c.png)
- [Restaurant POS used in the demo](https://github.com/Lambda-School-Labs/CS10-restaurant-pos)
- Exchange contract inspired by the work of [Uniswap](https://uniswap.io/)


### Motivations

##### Zero volatility exposure for merchants
For merchants, Dexlab offers Unipay. Which, unlike other payment gateways, provides the ability to receive crypto payments with 0-volatility risk in a completely decentralized manner.

Unipay decreases the merchant risk associated with accepting volatile cryptocurrencies for commerce.

The problem is important for merchants because their current value reference system is based on the exchange rate of such currencies versus dollar. Therefore, by enabling those parties to always receive a stable coin (USDG) regardless of the currency used for payment, the volatility risk connected to holding such currencies get close to zero.

Furthermore, merchants may benefit from reduced fees when compared to the current digital payments offered, that would directly translate to higher margins for their business.

##### Centralized payment gateways
All cryptocurrency payment gateways today leverage on a centralized custodian architecture to keep track of GO/Ether and other ERC20 token payments. On the other end, The Unstoppable Payment Gateway leverages on an innovative payment gateway solely operated by smart contracts on the go blockchain: this new approach removes the central point of failure of existing gateways, while delivering a truly permissionless and decentralized solution to accept payment in Go and ERC20 token.

The implications are extremely important: Unipay cannot be stopped. No external company will have the chance to reject or censor any transaction and, furthermore, the Merchant won’t be required to self-host any software to archive a decentralized setup (like btcpayserver for instance).

Feature of UnstoppablePaymentGateway:
- [x] Removes the need of centralized architecture to keep track of payments
- [x] Enables payments in GO and ERC20 tokens
- [x] Instants decentralized exchange of GO to a (fake) stablecoin.
- [x] Implements proof of payment EIP1257
- [x] Inject a web3-provider-engine to avoid metamask dependency
- [x] Decent UI

Current Team Count: Alexintosh
