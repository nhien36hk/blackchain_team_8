// Import các dependencies cần thiết
const { setupContract } = require('../config/web3-config');

let currentAccount = null;

// Cập nhật hiển thị tài khoản
function updateAccountDisplay() {
  if (window.ethereum && window.ethereum.selectedAddress) {
    console.log("Đang cập nhật hiển thị tài khoản:", window.ethereum.selectedAddress);
    currentAccount = window.ethereum.selectedAddress;
    $("#accountAddress").html("Tài Khoản Hiện Tại: " + currentAccount);
    console.log("currentAccount đã được cập nhật:", currentAccount);
  } else {
    console.log("Không có tài khoản được chọn để hiển thị");
    $("#accountAddress").html("Chưa kết nối tài khoản Metamask");
    currentAccount = null;
  }
}

// Kết nối với Metamask
function connectMetamask(forceChooseAccount) {
  console.log("connectMetamask được gọi với forceChooseAccount =", forceChooseAccount);
  $('#Aday').html("<p style='color: white;'>Đang kết nối Metamask, vui lòng đợi...</p>");
  $('#Aday').show();
  
  if (window.ethereum) {
    console.log("Metamask đã được cài đặt, đang kết nối...");
    
    // Nếu yêu cầu chọn lại tài khoản, sử dụng wallet_requestPermissions thay vì eth_requestAccounts
    const connectMethod = forceChooseAccount 
      ? { method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }
      : { method: 'eth_requestAccounts' };
    
    console.log("Đang yêu cầu kết nối với phương thức:", connectMethod.method);
    
    return window.ethereum.request(connectMethod)
      .then(function(result) {
        console.log("Kết quả kết nối:", result);
        // Sau khi có quyền, lấy tài khoản
        return window.ethereum.request({ method: 'eth_requestAccounts' });
      })
      .then(function(accounts) {
        if (accounts.length > 0) {
          console.log("Đã kết nối Metamask với tài khoản:", accounts[0]);
          
          $('#changeAccount').click(function() {
            connectMetamask(true);
          });
          
          // Kiểm tra mạng hiện tại
          return window.ethereum.request({ method: 'eth_chainId' })
            .then(function(chainId) {
              console.log("Mạng blockchain hiện tại: " + chainId);
              
              // Kiểm tra xem đang ở mạng nào
              let networkName = '';
              switch(chainId) {
                case '0x1': networkName = 'Ethereum Mainnet'; break;
                case '0x3': networkName = 'Ropsten Testnet'; break;
                case '0x4': networkName = 'Rinkeby Testnet'; break;
                case '0x5': networkName = 'Goerli Testnet'; break;
                case '0xaa36a7': networkName = 'Sepolia Testnet'; break;
                case '0x539': networkName = 'Ganache Local (1337)'; break;
                default: networkName = 'Mạng khác (chainId: ' + chainId + ')'; break;
              }
              
              // Thiết lập contract với tài khoản hiện tại
              setupContract(accounts[0]);
              
              // Lưu tài khoản hiện tại
              currentAccount = accounts[0];
              $("#accountAddress").html("Tài Khoản Hiện Tại: " + accounts[0]);
              
              // Gọi hàm cập nhật hiển thị tài khoản
              updateAccountDisplay();
              
              return {
                account: accounts[0],
                chainId: chainId,
                networkName: networkName
              };
            });
        } else {
          console.error("Không tìm thấy tài khoản, vui lòng đăng nhập vào Metamask");
          $('#Aday').html("<p style='color: red;'>Không tìm thấy tài khoản, vui lòng đăng nhập vào Metamask</p>");
          throw new Error("Không tìm thấy tài khoản");
        }
      })
      .catch(function(error) {
        console.error("Lỗi khi kết nối Metamask:", error);
        $('#Aday').html("<p style='color: red;'>Lỗi khi kết nối Metamask: " + error.message + "</p>");
        throw error;
      });
  } else {
    console.error("Metamask chưa được cài đặt");
    $('#Aday').html("<p style='color: red;'>Metamask chưa được cài đặt</p>");
    throw new Error("Metamask chưa được cài đặt");
  }
}

// Lắng nghe sự kiện thay đổi tài khoản
function setupAccountChangeListeners(callback) {
  if (window.ethereum) {
    // Lắng nghe sự kiện thay đổi tài khoản
    window.ethereum.on('accountsChanged', function (accounts) {
      console.log('Tài khoản Metamask đã thay đổi thành:', accounts[0]);
      
      // Cập nhật currentAccount trước khi làm mới trang
      if (accounts && accounts.length > 0) {
        currentAccount = accounts[0];
        console.log("currentAccount đã được cập nhật thành:", currentAccount);
      } else {
        currentAccount = null;
        console.log("currentAccount đã được đặt lại thành null");
      }
      
      // Cập nhật hiển thị tài khoản
      updateAccountDisplay();
      
      // Gọi callback nếu có
      if (typeof callback === 'function') {
        callback('accountsChanged', accounts);
      }
    });
    
    // Lắng nghe sự kiện thay đổi mạng
    window.ethereum.on('chainChanged', function (chainId) {
      console.log('Mạng Metamask đã thay đổi thành:', chainId);
      
      // Gọi callback nếu có
      if (typeof callback === 'function') {
        callback('chainChanged', chainId);
      }
    });
  }
}

// Hàm lấy thông tin mạng
function getNetworkInfo() {
  if (!window.ethereum) {
    return Promise.reject(new Error("Metamask chưa được cài đặt"));
  }
  
  return window.ethereum.request({ method: 'net_version' })
    .then(function(networkId) {
      console.log("ID mạng blockchain hiện tại:", networkId);
      
      // Kiểm tra xem mạng có hỗ trợ không
      let isSupportedNetwork = false;
      let networkName = '';
      
      switch(networkId) {
        case '1': 
          networkName = 'Ethereum Mainnet'; 
          break;
        case '3': 
          networkName = 'Ropsten Testnet'; 
          isSupportedNetwork = true;
          break;  
        case '4': 
          networkName = 'Rinkeby Testnet'; 
          isSupportedNetwork = true;
          break;
        case '5': 
          networkName = 'Goerli Testnet'; 
          isSupportedNetwork = true;
          break;
        case '11155111': 
          networkName = 'Sepolia Testnet'; 
          isSupportedNetwork = true;
          break;
        case '1337': 
        case '5777':
          networkName = 'Local Blockchain (Ganache/Truffle)'; 
          isSupportedNetwork = true;
          break;
        default: 
          networkName = 'Mạng không xác định (ID: ' + networkId + ')'; 
          break;
      }
      
      return {
        networkId,
        networkName,
        isSupportedNetwork
      };
    });
}

module.exports = {
  connectMetamask,
  updateAccountDisplay,
  setupAccountChangeListeners,
  getNetworkInfo,
  getCurrentAccount: () => currentAccount
}; 