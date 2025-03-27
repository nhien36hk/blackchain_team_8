const Web3 = require('web3');
const contract = require('@truffle/contract');
const votingArtifacts = require('../../../build/contracts/VotingSystem.json');

// Khởi tạo contract từ artifacts
const VotingContract = contract(votingArtifacts);

// Thiết lập Web3 instance
let web3Instance = null;

// Hàm khởi tạo Web3
function initWeb3() {
  // Kiểm tra nếu đã có web3 instance
  if (web3Instance) {
    console.log("Đã có web3 instance, trả về instance hiện tại");
    return true;
  }

  // Modern dapp browsers...
  if (typeof window.ethereum !== "undefined") {
    console.log("Đã phát hiện Metamask/window.ethereum, đang khởi tạo Web3...");
    web3Instance = new Web3(window.ethereum);
    
    // Đảm bảo window.web3 luôn tồn tại cho các module cũ
    window.web3 = web3Instance;
    
    console.log("Đã khởi tạo Web3 instance và gán window.web3");
    return true;
  } 
  // Legacy dapp browsers...
  else if (typeof window.web3 !== "undefined") {
    console.warn("Đang sử dụng web3 cũ, khuyến nghị nâng cấp MetaMask");
    web3Instance = new Web3(window.web3.currentProvider);
    
    // Đảm bảo window.web3 luôn được cập nhật
    window.web3 = web3Instance;
    
    return true;
  } 
  // Fallback - sử dụng provider cục bộ nếu không phát hiện MetaMask
  else {
    console.warn("Không phát hiện Metamask. Vui lòng cài đặt MetaMask để sử dụng ứng dụng.");
    
    // Có thể thử kết nối đến Ganache
    try {
      const localProvider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
      web3Instance = new Web3(localProvider);
      window.web3 = web3Instance;
      console.log("Đã kết nối đến local provider thành công");
      return true;
    } catch (error) {
      console.error("Không thể kết nối đến local provider:", error);
      return false;
    }
  }
}

// Thiết lập provider và các thông số mặc định cho contract
function setupContract(account) {
  if (!web3Instance) {
    console.error("Chưa khởi tạo Web3 instance");
    return false;
  }
  
  // Trước khi thiết lập provider, kiểm tra và khởi tạo lại nếu cần
  if (window.ethereum) {
    VotingContract.setProvider(window.ethereum);
  } else if (web3Instance.currentProvider) {
    VotingContract.setProvider(web3Instance.currentProvider);
  } else {
    console.error("Không có provider hợp lệ");
    return false;
  }
  
  // Đặt giá trị gas mặc định cao hơn
  VotingContract.defaults({
    from: account, 
    gas: 3000000,  // Tăng gas lên 3,000,000
    gasPrice: Web3.utils.toWei('50', 'gwei')  // Đặt giá gas rõ ràng
  });
  
  return true;
}

// Kiểm tra và gán Web3 và window.web3
function ensureWeb3Exists() {
  if (!web3Instance && window.ethereum) {
    web3Instance = new Web3(window.ethereum);
    window.web3 = web3Instance;
    return true;
  } else if (!web3Instance && window.web3) {
    web3Instance = new Web3(window.web3.currentProvider);
    window.web3 = web3Instance;
    return true;
  }
  return !!web3Instance;
}

module.exports = {
  Web3,
  VotingContract,
  initWeb3,
  setupContract,
  ensureWeb3Exists,
  getWeb3Instance: () => web3Instance
}; 