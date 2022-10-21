import { BigNumber } from "bignumber.js";
import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  TokenId,
  AccountBalanceQuery,
  Hbar,
  AccountId,
  ContractId
} from "@hashgraph/sdk";

import ClientManagement from "./utils/utils";
import { ContractService } from "../deployment/service/ContractService";

const clientManagement = new ClientManagement();
//const client = clientManagement.createClientAsAdmin();
const client = clientManagement.createOperatorClient();
const {treasureId, treasureKey} = clientManagement.getTreasure();
const contractService = new ContractService();
const adminId = AccountId.fromString(process.env.ADMIN_ID!);

const tokenA = TokenId.fromString("0.0.48289687").toSolidityAddress();
let tokenB = TokenId.fromString("0.0.48289686").toSolidityAddress();
const tokenC = TokenId.fromString("0.0.48301281").toSolidityAddress();
let tokenD = TokenId.fromString("0.0.48301282").toSolidityAddress();
const tokenE = TokenId.fromString("0.0.48301300").toSolidityAddress();
let tokenF = TokenId.fromString("0.0.48301322").toSolidityAddress();

const pairContractIds = contractService.getContract(contractService.pairContractName);
const lpContractIds = contractService.getLast3Contracts(contractService.lpTokenContractName);
const baseContract = contractService.getContract(contractService.baseContractName);
const contractId = contractService.getContractWithProxy(contractService.factoryContractName).transparentProxyId!; 

let precision = 10000000;

const withPrecision = (value: number): BigNumber => {
  return new BigNumber(value).multipliedBy(precision);
}

const getPrecisionValue = async (contractId: string) => {
  const getPrecisionValueTx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(1000000)
    .setFunction("getPrecisionValue",
      new ContractFunctionParameters())
    .freezeWith(client);
  const getPrecisionValueTxRes = await getPrecisionValueTx.execute(client);
  const response = await getPrecisionValueTxRes.getRecord(client);
  const precisionLocal = response.contractFunctionResult!.getInt256(0);

  precision = Number(precisionLocal);

  console.log(` getPrecisionValue ${precision}`);
};

const initialize = async (contractId: string, htsServiceAddress: string, lpTokenContractAddress: string ) => {
  const initialize = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(2000000)
    .setFunction(
      "initialize",
      new ContractFunctionParameters()
        .addAddress(htsServiceAddress)
        .addAddress(lpTokenContractAddress)
    )
    .freezeWith(client)
    .sign(treasureKey);
  const initializeTx = await initialize.execute(client);
  const initializeTxRx = await initializeTx.getReceipt(client);
  console.log(`Initialized status : ${initializeTxRx.status}`);
};

const setupFactory = async () => {

    console.log(`\n STEP 1 - Set Static Pairs for now in Contract`);
    let contractFunctionParameters = new ContractFunctionParameters()
                                          .addAddress(baseContract.address)
    const contractSetPairsTx = await new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunction("setUpFactory", contractFunctionParameters)
      .setGas(9000000)
      .execute(client);
    const contractSetPairRx = await contractSetPairsTx.getReceipt(client);
    const response = await contractSetPairsTx.getRecord(client);
    const status = contractSetPairRx.status;
    console.log(`\n setupFactory Result ${status} code: ${response.contractFunctionResult!.getAddress()}`);
};

const createPair = async (contractId: string, token0: string, token1: string) => {
  
  console.log(
    `createPair TokenA TokenB`
  );
  const addLiquidityTx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(9000000)
    .setFunction(
      "createPair",
      new ContractFunctionParameters()
        .addAddress(tokenA)
        .addAddress(tokenB)
    )
    .setMaxTransactionFee(new Hbar(100))
    .setPayableAmount(new Hbar(100))
    .freezeWith(client)
    .sign(treasureKey);

  const addLiquidityTxRes = await addLiquidityTx.execute(client);
  const transferTokenRx = await addLiquidityTxRes.getReceipt(client);
  const transferTokenRecord = await addLiquidityTxRes.getRecord(client);
  const contractAddress = transferTokenRecord.contractFunctionResult!.getAddress(0);
  console.log(`CreatePair address: ${contractAddress}`);
  console.log(`CreatePair status: ${transferTokenRx.status}`);
  return contractAddress;
  //return `0x${contractAddress}`;
};

const getAllPairs = async (contractId: string, token0: string, token1: string) => {
  console.log(
    `getAllPairs`
  );
  const liquidityPool = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(9999999)
    .setFunction(
      "getPair",
      new ContractFunctionParameters()
      .addAddress(token0)
      .addAddress(token1)
    )
    .freezeWith(client)
  const liquidityPoolTx = await liquidityPool.execute(client);
  const response = await liquidityPoolTx.getRecord(client);
   console.log(`getPairs: ${response.contractFunctionResult!.getAddress(0)}`);
  const transferTokenRx = await liquidityPoolTx.getReceipt(client);
  console.log(`getPairs: ${transferTokenRx.status}`);
};

const initializeContract = async (contId: string) => {
  const tokenAQty = withPrecision(200);
  const tokenBQty = withPrecision(220);
  console.log(
    ` Creating a pool of ${tokenAQty} units of token A and ${tokenBQty} units of token B.`
  );
  const tx = await new ContractExecuteTransaction()
    .setContractId(contId)
    .setGas(9000000)
    .setFunction(
      "initializeContract",
      new ContractFunctionParameters()
        .addAddress(treasureId.toSolidityAddress())
        .addAddress(tokenA)
        .addAddress(tokenB)
        .addInt256(tokenAQty)
        .addInt256(tokenBQty)
        .addInt256(new BigNumber(10))//fee
    )
    .freezeWith(client)
    .sign(treasureKey);
  const liquidityPoolTx = await tx.execute(client);
  const transferTokenRx = await liquidityPoolTx.getReceipt(client);
  console.log(` Liquidity pool created: ${transferTokenRx.status}`);
};

const addLiquidity = async (contId: string) => {
  const tokenAQty = withPrecision(10);
  const tokenBQty = withPrecision(10);
  console.log(
    ` Adding ${tokenAQty} units of token A and ${tokenBQty} units of token B to the pool.`
  );
  const addLiquidityTx = await new ContractExecuteTransaction()
    .setContractId(contId)
    .setGas(9000000)
    .setFunction(
      "addLiquidity",
      new ContractFunctionParameters()
        .addAddress(treasureId.toSolidityAddress())
        .addAddress(tokenA)
        .addAddress(tokenB)
        .addInt256(tokenAQty)
        .addInt256(tokenBQty)
    )
    .freezeWith(client)
    .sign(treasureKey);
  const addLiquidityTxRes = await addLiquidityTx.execute(client);
  const transferTokenRx = await addLiquidityTxRes.getReceipt(client);

  console.log(` Liquidity added status: ${transferTokenRx.status}`);
};

const removeLiquidity = async (contId: string) => {
  const lpToken = withPrecision(5);
  console.log(
    ` Removing ${lpToken} units of LPToken from the pool.`
  );
  const removeLiquidity = await new ContractExecuteTransaction()
    .setContractId(contId)
    .setGas(9000000)
    .setFunction(
      "removeLiquidity",
      new ContractFunctionParameters()
        .addAddress(treasureId.toSolidityAddress())
        .addAddress(tokenA)
        .addAddress(tokenB)
        .addInt256(lpToken)
    )
    .freezeWith(client)
    .sign(treasureKey);
  const removeLiquidityTx = await removeLiquidity.execute(client);
  const transferTokenRx = await removeLiquidityTx.getReceipt(client);

  console.log(` Liquidity remove status: ${transferTokenRx.status}`);
};

const swapTokenA = async (contId: string) => {
  const tokenAQty = withPrecision(1);
  const tokenBQty = withPrecision(0);
  console.log(` Swapping a ${tokenAQty} units of token A from the pool.`);
  // Need to pass different token B address so that only swap of token A is considered.
  const swapToken = await new ContractExecuteTransaction()
    .setContractId(contId)
    .setGas(2000000)
    .setFunction(
      "swapToken",
      new ContractFunctionParameters()
        .addAddress(treasureId.toSolidityAddress())
        .addAddress(tokenA)
        .addAddress(tokenB)
        .addInt256(tokenAQty)
        .addInt256(tokenBQty)
    )
    .freezeWith(client)
    .sign(treasureKey);
  const swapTokenTx = await swapToken.execute(client);
  const transferTokenRx = await swapTokenTx.getReceipt(client);

  console.log(` Swap status: ${transferTokenRx.status}`);
};

const getTreaserBalance = async () => {
  const treasureBalance1 = await new AccountBalanceQuery()
      .setAccountId(treasureId)
      .execute(client);
  console.log(`Treasure LP Token Balance: ${treasureBalance1.tokens}`); //2 Sep 01:02 pm
}

const createTestPairFronFactory = async (contId: string) => {
  const tokenAQty = withPrecision(200);
  const tokenBQty = withPrecision(220);
  console.log(
    ` createTestPairFronFactory pool of ${tokenAQty}`
  );
  const tx = await new ContractExecuteTransaction()
    .setContractId(contId)
    .setGas(9999999)
    .setFunction(
      "createPairNew",
      new ContractFunctionParameters()
        .addAddress(treasureId.toSolidityAddress())
        .addAddress(tokenA)
        .addInt256(tokenAQty)
    )
    .freezeWith(client)
    .sign(treasureKey);
  const liquidityPoolTx = await tx.execute(client);
  const transferTokenRx = await liquidityPoolTx.getReceipt(client);
  console.log(` createTestPairFronFactory pool created: ${transferTokenRx.status}`);
};

async function main() {

    await setupFactory();
    await testForSinglePair(contractId, tokenA, tokenB);
  
}

async function testForSinglePair(contractId: string, token0: string, token1: string) {

    await createPair(contractId, token0, token1);
    await initializeContract(contractId);
    await addLiquidity(contractId);
    await removeLiquidity(contractId);
    await swapTokenA(contractId);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

