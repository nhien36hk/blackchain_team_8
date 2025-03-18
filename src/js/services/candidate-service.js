const { VotingContract, Web3 } = require('../config/web3-config');
const { getCurrentAccount } = require('./account-service');
const { getContractInstance, isDirectConnection, getVotingInstance } = require('./contract-service');

// Thêm ứng cử viên mới
function addCandidate(nameCandidate, partyCandidate) {
  // Kiểm tra dữ liệu đầu vào
  if (!nameCandidate || !partyCandidate) {
    return Promise.reject(new Error("Vui lòng nhập đầy đủ tên và đảng phái của ứng cử viên"));
  }
  
  // Debug - kiểm tra giá trị đầu vào
  console.log("Tên ứng cử viên:", nameCandidate);
  console.log("Đảng phái:", partyCandidate);
  console.log("Trạng thái Metamask:", !!window.ethereum);
  console.log("Account hiện tại:", getCurrentAccount());
  
  // Kiểm tra Metamask
  if (!window.ethereum) {
    return Promise.reject(new Error("Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục."));
  }
  
  // Hiển thị thông báo gửi giao dịch
  $('#Aday').html("<p style='color: white;'>Đang gửi giao dịch đến blockchain, vui lòng xác nhận trong Metamask và đợi...</p>");
  $('#Aday').show();
  
  // Đảm bảo có kết nối tài khoản Metamask trước khi thực hiện
  return window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(function(accounts) {
      if (accounts && accounts.length > 0) {
        console.log("Tài khoản Metamask đã chọn:", accounts[0]);
        
        const votingInstance = getVotingInstance();
        
        if (!votingInstance) {
          throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        console.log("Đã lấy instance hợp đồng");
        
        // Ghi log trạng thái hiện tại để debug
        console.log("Thông tin giao dịch:");
        console.log("- Địa chỉ gửi (from):", accounts[0]);
        console.log("- Dữ liệu gửi:", {name: nameCandidate, party: partyCandidate});
        console.log("- Loại kết nối:", isDirectConnection() ? "Trực tiếp Web3" : "Truffle Contract");
        
        // Kiểm tra xem đang kết nối trực tiếp hay qua truffle-contract
        if (isDirectConnection()) {
          // Kết nối Web3 trực tiếp
          return votingInstance.methods.addCandidate(nameCandidate, partyCandidate).send({
            from: accounts[0],
            gas: 5000000,  // Tăng gas cao hơn
            gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
          });
        } else {
          // Kết nối qua truffle-contract
          return votingInstance.addCandidate(nameCandidate, partyCandidate, {
            from: accounts[0],
            gas: 5000000,  // Tăng gas cao hơn
            gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
          });
        }
      } else {
        throw new Error("Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.");
      }
    })
    .then(function(result) {
      console.log("Kết quả thêm ứng cử viên thành công:", result);
      return result;
    })
    .catch(function(err) {
      console.error("Lỗi khi thêm ứng cử viên:", err);
      let errorMessage = "Lỗi không xác định: " + err.message;
      
      if (err.message.includes("gas")) {
        errorMessage = "Không đủ gas để thực hiện giao dịch. Vui lòng tăng giới hạn gas.";
      } else if (err.message.includes("rejected")) {
        errorMessage = "Giao dịch đã bị từ chối trên Metamask. Vui lòng thử lại.";
      } else if (err.message.includes("account")) {
        errorMessage = "Vấn đề về tài khoản Metamask. Vui lòng kiểm tra lại tài khoản đã được mở khóa.";
      } else if (err.message.includes("Returned values")) {
        errorMessage = "Lỗi khi truy vấn dữ liệu từ hợp đồng. Vui lòng kiểm tra lại kết nối mạng và cài đặt Metamask.";
      }
      
      throw new Error(errorMessage);
    });
}

// Lấy thông tin ứng cử viên
function getCandidate(id) {
  if (!id ) {
    return Promise.reject(new Error("Vui lòng nhập đầy đủ ID để lấy thông tin ứng cử viên"));
  }

  const votingInstance = getVotingInstance();
        
  if (!votingInstance) {
      return Promise.reject(new Error("Chưa khởi tạo hợp đồng"));
  }

  if (isDirectConnection()) {
      // Kết nối trực tiếp
      return votingInstance.methods.getCandidate(id).call({ from: getCurrentAccount() });
  } else {
      // Kết nối qua truffle-contract
      return votingInstance.getCandidate(id, { from: getCurrentAccount() });
  }
}

// Lấy số lượng ứng cử viên
function getCountCandidates() {
  const votingInstance = getVotingInstance();

  if (!votingInstance) {
      return Promise.reject(new Error("Chưa khởi tạo hợp đồng"));
  }

  if (isDirectConnection()) {
      // Kết nối trực tiếp
      return votingInstance.methods.getCountCandidates().call({ from: getCurrentAccount() })
          .then(count => parseInt(count));
  } else {
      // Kết nối qua truffle-contract
      return votingInstance.getCountCandidates({ from: getCurrentAccount() })
          .then(count => parseInt(count.toString()));
  }
}

// Lấy tất cả ứng cử viên
function getAllCandidates() {
  return getCountCandidates()
    .then(count => {
      console.log("Số lượng ứng cử viên:", count);
      
      // Tạo array để lưu các promises
      const promises = [];
      
      // Lặp qua từng ứng cử viên và lấy thông tin
      for (let i = 1; i <= count; i++) {
        promises.push(getCandidate(i));
      }
      
      // Chờ tất cả promises hoàn thành
      return Promise.all(promises);
    })
    .then(candidates => {
      console.log("Đã lấy thông tin tất cả ứng cử viên:", candidates);
      return candidates;
    })
    .catch(err => {
      console.error("Lỗi khi lấy danh sách ứng cử viên:", err);
      throw new Error("Không thể lấy danh sách ứng cử viên: " + err.message);
    });
}

// Cập nhật thông tin ứng cử viên
function updateCandidate(id, newName, newParty) {
  // Kiểm tra dữ liệu đầu vào
  if (!id || !newName || !newParty) {
    return Promise.reject(new Error("Vui lòng nhập đầy đủ ID, tên và đảng phái để cập nhật"));
  }
  
  // Kiểm tra Metamask
  if (!window.ethereum) {
    return Promise.reject(new Error("Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục."));
  }
  
  // Hiển thị thông báo đang cập nhật
  $('#update-status').html("<p style='color: white;'>Đang cập nhật thông tin ứng cử viên, vui lòng đợi...</p>");
  $('#update-status').show();
  
  return window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(function(accounts) {
      if (accounts && accounts.length > 0) {
        console.log("Tài khoản Metamask đã chọn:", accounts[0]);
        
        const votingInstance = getVotingInstance();
        
        if (!votingInstance) {
          throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        // Lưu ý: Cần thêm hàm updateCandidate trong smart contract
        if (isDirectConnection()) {
          // Kết nối Web3 trực tiếp
          return votingInstance.methods.updateCandidate(id, newName, newParty).send({
            from: accounts[0],
            gas: 5000000,
            gasPrice: Web3.utils.toWei('50', 'gwei')
          });
        } else {
          // Kết nối qua truffle-contract
          return votingInstance.updateCandidate(id, newName, newParty, {
            from: accounts[0],
            gas: 5000000,
            gasPrice: Web3.utils.toWei('50', 'gwei')
          });
        }
      } else {
        throw new Error("Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.");
      }
    })
    .then(function(result) {
      console.log("Kết quả cập nhật ứng cử viên thành công:", result);
      return result;
    })
    .catch(function(err) {
      console.error("Lỗi khi cập nhật ứng cử viên:", err);
      let errorMessage = "Lỗi không xác định: " + err.message;
      
      if (err.message.includes("gas")) {
        errorMessage = "Không đủ gas để thực hiện giao dịch. Vui lòng tăng giới hạn gas.";
      } else if (err.message.includes("rejected")) {
        errorMessage = "Giao dịch đã bị từ chối trên Metamask. Vui lòng thử lại.";
      } else if (err.message.includes("account")) {
        errorMessage = "Vấn đề về tài khoản Metamask. Vui lòng kiểm tra lại tài khoản đã được mở khóa.";
      }
      
      throw new Error(errorMessage);
    });
}

// Xóa ứng cử viên
function deleteCandidate(id) {
  // Kiểm tra dữ liệu đầu vào
  if (!id) {
    return Promise.reject(new Error("Vui lòng cung cấp ID ứng cử viên cần xóa"));
  }
  
  // Kiểm tra Metamask
  if (!window.ethereum) {
    return Promise.reject(new Error("Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục."));
  }
  
  // Hiển thị thông báo đang xóa
  $('#delete-status').html("<p style='color: white;'>Đang xóa ứng cử viên, vui lòng đợi...</p>");
  $('#delete-status').show();
  
  return window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(function(accounts) {
      if (accounts && accounts.length > 0) {
        console.log("Tài khoản Metamask đã chọn:", accounts[0]);
        
        const votingInstance = getVotingInstance();
        
        if (!votingInstance) {
          throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        // Kiểm tra xem hàm deleteCandidate có tồn tại không
        if (isDirectConnection()) {
          // Kết nối Web3 trực tiếp
          if (votingInstance.methods && typeof votingInstance.methods.deleteCandidate === 'function') {
            return votingInstance.methods.deleteCandidate(id).send({
              from: accounts[0],
              gas: 5000000,
              gasPrice: Web3.utils.toWei('50', 'gwei')
            });
          } else {
            console.warn("Hàm deleteCandidate không tồn tại trong contract");
            throw new Error("Hàm xóa ứng cử viên không được hỗ trợ trong phiên bản hợp đồng hiện tại");
          }
        } else {
          // Kết nối qua truffle-contract
          if (typeof votingInstance.deleteCandidate === 'function') {
            return votingInstance.deleteCandidate(id, {
              from: accounts[0],
              gas: 5000000,
              gasPrice: Web3.utils.toWei('50', 'gwei')
            });
          } else {
            console.warn("Hàm deleteCandidate không tồn tại trong contract");
            throw new Error("Hàm xóa ứng cử viên không được hỗ trợ trong phiên bản hợp đồng hiện tại");
          }
        }
      } else {
        throw new Error("Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.");
      }
    })
    .then(function(result) {
      console.log("Kết quả xóa ứng cử viên thành công:", result);
      return result;
    })
    .catch(function(err) {
      console.error("Lỗi khi xóa ứng cử viên:", err);
      let errorMessage = "Lỗi không xác định: " + err.message;
      
      if (err.message.includes("gas")) {
        errorMessage = "Không đủ gas để thực hiện giao dịch. Vui lòng tăng giới hạn gas.";
      } else if (err.message.includes("rejected")) {
        errorMessage = "Giao dịch đã bị từ chối trên Metamask. Vui lòng thử lại.";
      } else if (err.message.includes("account")) {
        errorMessage = "Vấn đề về tài khoản Metamask. Vui lòng kiểm tra lại tài khoản đã được mở khóa.";
      }
      
      throw new Error(errorMessage);
    });
}

module.exports = {
  addCandidate,
  getAllCandidates,
  updateCandidate,
  deleteCandidate,
  getCountCandidates, 
  getCandidate
}; 