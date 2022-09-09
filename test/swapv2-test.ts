// Commenting test as contract has dependency on HTS service which we need to mock somehow.
import {  expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, upgrades } from "hardhat";


describe("Swap", function () {
  const tokenBAddress = "0x0000000000000000000000000000000000010001";
  const tokenAAddress = "0x0000000000000000000000000000000000020002";
  const tokenWrongAddress = "0x0000000000000000000000000000000000020003";
  const zeroAddress = "0x1111111000000000000000000000000000000000";

  describe("Swap Upgradeable", function () {
    it("Verify if the Swap contract is upgradeable safe ", async function () {
      const Swap = await ethers.getContractFactory("Swap");
      const instance = await upgrades.deployProxy(Swap, [zeroAddress], {unsafeAllow: ['delegatecall']});
      await instance.deployed();
    });
  });

  async function deployFixture() {
    const MockBaseHTS = await ethers.getContractFactory("MockBaseHTS");
    const mockBaseHTS = await MockBaseHTS.deploy(true);
    mockBaseHTS.setFailType(0);
    const SwapV2 = await ethers.getContractFactory("SwapTest");
    const swapV2 = await SwapV2.deploy(mockBaseHTS.address);

    await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 100, 100);

    return { swapV2 , mockBaseHTS };
  }

  async function deployFailureFixture() {
    const MockBaseHTS = await ethers.getContractFactory("MockBaseHTS");
    const mockBaseHTS = await MockBaseHTS.deploy(false);
    await mockBaseHTS.setFailType(0);

    const SwapV2 = await ethers.getContractFactory("SwapTest");
    const swapV2 = await SwapV2.deploy(mockBaseHTS.address);
    
    await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 100, 100);

    return { swapV2, mockBaseHTS };
  }

  it("Create a token pair with 100 unit each ", async function () {
    const { swapV2 } = await loadFixture(deployFixture);
    const qtys = await swapV2.getPairQty();
    expect(qtys[0]).to.be.equals(100);
    expect(qtys[1]).to.be.equals(100);
  });

  it("Swap 30 units of token A  ", async function () {
    const { swapV2 } = await loadFixture(deployFixture);
    const tokenBeforeQty = await swapV2.getPairQty();
    expect(tokenBeforeQty[0]).to.be.equals(100);
    const tx = await swapV2.swapToken(zeroAddress, tokenAAddress, zeroAddress, 30, 0);
    await tx.wait();
    
    const tokenQty = await swapV2.getPairQty();
    expect(tokenQty[0]).to.be.equals(130);
    expect(tokenQty[1]).to.be.equals(77);
  });

  it("Swap 30 units of token B  ", async function () {
    const { swapV2 } = await loadFixture(deployFixture);
    const tokenBeforeQty = await swapV2.getPairQty();
    expect(tokenBeforeQty[1]).to.be.equals(100);
    const tx = await swapV2.swapToken(zeroAddress, zeroAddress, tokenBAddress, 0, 30);
    await tx.wait();
    const tokenQty = await swapV2.getPairQty();
    expect(tokenQty[0]).to.be.equals(77);
    expect(tokenQty[1]).to.be.equals(130);
  });

  it("Add liquidity to the pool by adding 50 units of token and 50 units of token B  ", async function () {
    const { swapV2 } = await loadFixture(deployFixture);
    const tokenBeforeQty = await swapV2.getPairQty();
    expect(tokenBeforeQty[0]).to.be.equals(100);
    expect(tokenBeforeQty[1]).to.be.equals(100);
    const tx = await swapV2.addLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 50, 50);
    await tx.wait();
    const tokenQty =  await swapV2.getPairQty();
    expect(tokenQty[0]).to.be.equals(150);
    expect(tokenQty[1]).to.be.equals(150);
  });

  it("Remove liquidity to the pool by removing 50 units of token and 50 units of token B  ", async function () {
    const { swapV2 } = await loadFixture(deployFixture);
    const tokenBeforeQty = await swapV2.getPairQty();
    expect(tokenBeforeQty[0]).to.be.equals(100);
    expect(tokenBeforeQty[1]).to.be.equals(100);
    const tx = await swapV2.removeLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 50, 50);
    await tx.wait();

    const tokenQty =  await swapV2.getPairQty();
    expect(tokenQty[0]).to.be.equals(50);
    expect(tokenQty[1]).to.be.equals(50);
  });

  it("Verfiy liquidity contribution is correct ", async function () {
    const { swapV2 } = await loadFixture(deployFixture);
    const result = await swapV2.getContributorTokenShare(zeroAddress);
    expect(result[0]).to.be.equals(100);
    expect(result[1]).to.be.equals(100);
    const tx = await swapV2.addLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 50, 80);
    await tx.wait();
    const resultAfter = await swapV2.getContributorTokenShare(zeroAddress);
    expect(resultAfter[0]).to.be.equals(150);
    expect(resultAfter[1]).to.be.equals(180);
  });

  describe("When HTS gives failure repsonse",  async () => {
  
    it("Create a token pair fails with revert exception Transfer A", async function () {
      const { swapV2, mockBaseHTS } = await loadFixture(deployFailureFixture);
      mockBaseHTS.setFailType(7);
      await expect(swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 100, 100)).to.revertedWith("Creating contract: Transfering token A to contract failed with status code");
    });
  
    it("Create a token pair fails with revert exception Transfer B ", async function () {
      const { swapV2 , mockBaseHTS} = await loadFixture(deployFailureFixture);
      mockBaseHTS.setFailType(8);
      await expect(swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 100, 100)).to.revertedWith("Creating contract: Transfering token B to contract failed with status code");
    });
  
    it("Contract gives 100 as qty for tokens ", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const qtys = await swapV2.getPairQty();
      expect(qtys[0]).to.be.equals(100);
      expect(qtys[1]).to.be.equals(100);
    });

    it("Passing unknown A token to swap", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, zeroAddress, zeroAddress, 30, 0)).to.revertedWith("Pls pass correct token to swap.");
    });

    it("Passing unknown B token to swap", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, zeroAddress, zeroAddress, 30, 0)).to.revertedWith("Pls pass correct token to swap.");
    });

    //----------------------------------------------------------------------
    it("Swap Token A with Fail A transfer", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, tokenAAddress, zeroAddress, 30, 0)).to.revertedWith("swapTokenA: Transfering token A to contract failed with status code");
    });

    it("Swap Token A with Fail passing Both Addresses", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, tokenAAddress, tokenBAddress, 30, 0)).to.revertedWith("Token A should have correct address and token B address will be ignored.");
    });

    //----------------------------------------------------------------------
  
    it("Swap Token A with Fail B transfer", async function () {
      const { swapV2, mockBaseHTS } = await loadFixture(deployFailureFixture);
      mockBaseHTS.setFailType(2);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, tokenAAddress, zeroAddress, 30, 0)).to.revertedWith("swapTokenA: Transfering token B to contract failed with status code");
    });

    //----------------------------------------------------------------------
    it("Swap Token B with Fail B transfer", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, zeroAddress, tokenBAddress, 30, 0)).to.revertedWith("swapTokenB: Transfering token B to contract failed with status code");
    });

    it("Swap Token B with Fail A transfer", async function () {
      
      const { swapV2, mockBaseHTS } = await loadFixture(deployFailureFixture);
      mockBaseHTS.setFailType(9);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.swapToken(zeroAddress, zeroAddress, tokenBAddress, 30, 0)).to.revertedWith("swapTokenB: Transfering token A to contract failed with status code");
    });

    //----------------------------------------------------------------------
    it("Add liquidity Fail A Transfer", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.addLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 30, 30)).to.revertedWith("Add liquidity: Transfering token A to contract failed with status code");
    });

    it("Add liquidity Fail B Transfer", async function () {
      const { swapV2, mockBaseHTS } = await loadFixture(deployFailureFixture);
      mockBaseHTS.setFailType(4);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.addLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 30, 30)).to.revertedWith("Add liquidity: Transfering token B to contract failed with status code");
    });

    //----------------------------------------------------------------------
    it("Remove liquidity Fail A Transfer", async function () {
      const { swapV2 } = await loadFixture(deployFailureFixture);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.removeLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 30, 30)).to.revertedWith("Remove liquidity: Transfering token A to contract failed with status code");
    });

    it("Add liquidity Fail B Transfer", async function () {
      const { swapV2, mockBaseHTS } = await loadFixture(deployFailureFixture);
      mockBaseHTS.setFailType(5);
      const tokenBeforeQty = await swapV2.getPairQty();
      expect(tokenBeforeQty[0]).to.be.equals(100);
      await expect(swapV2.removeLiquidity(zeroAddress, tokenAAddress, tokenBAddress, 30, 30)).to.revertedWith("Remove liquidity: Transfering token B to contract failed with status code");
    });
  });

  describe("Swap Base Constant Product Algorithm Tests",  async () => {
    it("check spot price for tokens A", async function () {
      const { swapV2 } = await loadFixture(deployFixture);
      await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 100, 50);
      const value = await swapV2.getSpotPrice();

      expect(value).to.be.equals(20000000);
    });

    it("check spot price for tokens B", async function () {
      const { swapV2 } = await loadFixture(deployFixture);
      await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 50, 100);
      const value = await swapV2.getSpotPrice();

      expect(value).to.be.equals(5000000);
    });

    it("check spot price for zero denominator", async function () {
      const { swapV2 } = await loadFixture(deployFixture);
      await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 50, 0);
      
      await expect(swapV2.getSpotPrice()).to.be.revertedWith("spot price: No token B in the pool");
    });

    it("check spot price for tokens with reverse", async function () {
      const { swapV2 } = await loadFixture(deployFixture);
      await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 100, 200);
      const value = await swapV2.getSpotPrice();

      expect(value).to.be.equals(5000000);
    });

    it("check get out given In price value", async function () {
      const { swapV2 } = await loadFixture(deployFixture);
      await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 24, 16);
      const value = await swapV2.getOutGivenIn(10);

      expect(value).to.be.equals(47058824);
    });

    it("check get in given out price value", async function () {
      const { swapV2 } = await loadFixture(deployFixture);
      await swapV2.initializeContract(zeroAddress, tokenAAddress, tokenBAddress, 24, 16);
      const value = await swapV2.getInGivenOut(11);

      expect(value).to.be.equals(528000000);
    });
  });
});