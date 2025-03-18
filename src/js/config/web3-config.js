const Web3 = require('web3');
const contract = require('@truffle/contract');
const votingArtifacts = require('../../../build/contracts/VotingSystem.json');

// Khởi tạo contract từ artifacts
const VotingContract = contract(votingArtifacts);

// Thiết lập Web3 instance
let web3Instance = null;

// Hàm khởi tạo Web3
function initWeb3() {
  if (typeof window.ethereum !== "undefined") {
    console.log("Đã phát hiện Metamask, đang khởi tạo Web3...");
    web3Instance = new Web3(window.ethereum);
    return true;
  } else {
    console.warn("Không phát hiện Metamask. Vui lòng cài đặt Metamask để sử dụng ứng dụng.");
    return false;
  }
}

// Thiết lập provider và các thông số mặc định cho contract
function setupContract(account) {
  if (!web3Instance) {
    console.error("Chưa khởi tạo Web3 instance");
    return false;
  }
  
  VotingContract.setProvider(window.ethereum);
  
  // Đặt giá trị gas mặc định cao hơn
  VotingContract.defaults({
    from: account, 
    gas: 3000000,  // Tăng gas lên 3,000,000
    gasPrice: Web3.utils.toWei('50', 'gwei')  // Đặt giá gas rõ ràng
  });
  
  return true;
}

module.exports = {
  Web3,
  VotingContract,
  initWeb3,
  setupContract,
  getWeb3Instance: () => web3Instance
}; 