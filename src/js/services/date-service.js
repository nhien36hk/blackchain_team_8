const { VotingContract, Web3 } = require('../config/web3-config');
const { getCurrentAccount } = require('./account-service');
const { getContractInstance, isDirectConnection, getVotingInstance } = require('./contract-service');

// Thiết lập ngày bắt đầu và kết thúc bỏ phiếu
function setDates(startDate, endDate) {
  // Kiểm tra dữ liệu đầu vào
  if (isNaN(startDate) || isNaN(endDate)) {
    return Promise.reject(new Error("Vui lòng chọn ngày bắt đầu và kết thúc"));
  }

  if (endDate <= startDate) {
    return Promise.reject(new Error("Ngày kết thúc phải sau ngày bắt đầu"));
  }

  // Debug - kiểm tra giá trị đầu vào
  console.log("Ngày bắt đầu:", new Date(startDate * 1000));
  console.log("Ngày kết thúc:", new Date(endDate * 1000));
  console.log("Trạng thái Metamask:", !!window.ethereum);
  console.log("Account hiện tại:", getCurrentAccount());

  // Kiểm tra Metamask
  if (!window.ethereum) {
    return Promise.reject(new Error("Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục."));
  }

  // Hiển thị trạng thái
  $('#Aday').html("<p style='color: white;'>Đang xử lý, vui lòng chờ và xác nhận trong Metamask...</p>");
  $('#Aday').show();

  // Đảm bảo có kết nối tài khoản Metamask trước khi thực hiện
  return window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(function (accounts) {
      if (accounts && accounts.length > 0) {
        console.log("Tài khoản Metamask đã chọn:", accounts[0]);

        const votingInstance = getVotingInstance();

        if (!votingInstance) {
          throw new Error("Chưa khởi tạo hợp đồng");
        }

        console.log("Đã lấy instance hợp đồng");
        console.log("Loại kết nối:", isDirectConnection() ? "Trực tiếp Web3" : "Truffle Contract");

        // Kiểm tra xem đang kết nối trực tiếp hay qua truffle-contract
        if (isDirectConnection()) {
          // Kết nối Web3 trực tiếp
          return votingInstance.methods.setDates(startDate, endDate).send({
            from: accounts[0],
            gas: 5000000,  // Tăng gas cao hơn
            gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
          });
        } else {
          // Kết nối qua truffle-contract
          return votingInstance.setDates(startDate, endDate, {
            from: accounts[0],
            gas: 5000000,  // Tăng gas cao hơn
            gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
          });
        }
      } else {
        throw new Error("Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.");
      }
    })
    .then(function (result) {
      console.log("Kết quả thiết lập ngày bỏ phiếu thành công:", result);
      return result;
    })
    .catch(function (err) {
      console.error("Lỗi khi thiết lập ngày bỏ phiếu:", err);
      let errorMessage = "Lỗi không xác định: " + err.message;

      if (err.message.includes("gas")) {
        errorMessage = "Không đủ gas để thực hiện giao dịch. Vui lòng tăng giới hạn gas.";
      } else if (err.message.includes("rejected")) {
        errorMessage = "Giao dịch đã bị từ chối trên Metamask. Vui lòng thử lại.";
      } else if (err.message.includes("account")) {
        errorMessage = "Vấn đề về tài khoản Metamask. Vui lòng kiểm tra lại tài khoản đã được mở khóa.";
      } else if (err.message.includes("require")) {
        errorMessage = "Không thể thiết lập ngày bỏ phiếu. Ngày bỏ phiếu đã được thiết lập trước đó hoặc ngày không hợp lệ.";
      } else if (err.message.includes("Returned values")) {
        errorMessage = "Lỗi khi truy vấn dữ liệu từ hợp đồng. Vui lòng kiểm tra lại kết nối mạng và cài đặt Metamask.";
      }

      throw new Error(errorMessage);
    });
}

// Lấy thông tin ngày bỏ phiếu
function getDates() {
  console.log("Đang gọi hàm getDates()...");
  
  const votingInstance = getVotingInstance();
  if (!votingInstance) {
    console.error("Lỗi: Chưa khởi tạo hợp đồng (votingInstance là null)");
    return Promise.reject(new Error("Chưa khởi tạo hợp đồng"));
  }

  console.log("Loại kết nối trong getDates:", isDirectConnection() ? "Trực tiếp Web3" : "Truffle Contract");
  console.log("Tài khoản đang sử dụng:", getCurrentAccount());

  try {
    // Kiểm tra xem hàm getDates có tồn tại hay không
    if (isDirectConnection()) {
      // Kết nối trực tiếp - kiểm tra hàm có tồn tại không 
      if (votingInstance.methods && typeof votingInstance.methods.getDates === 'function') {
        console.log("Gọi hàm getDates() qua kết nối trực tiếp");
        return votingInstance.methods.getDates().call({ from: getCurrentAccount() })
          .then(function(result) {
            console.log("Kết quả getDates (trực tiếp):", result);
            return result;
          })
          .catch(function(error) {
            console.error("Lỗi khi gọi getDates() (trực tiếp):", error);
            throw error;
          });
      } else {
        console.warn("Hàm getDates không tồn tại trong contract - trả về giá trị mặc định");
        return Promise.resolve([0, 0]); // Trả về giá trị mặc định
      }
    } else {
      // Kết nối qua truffle-contract - kiểm tra hàm có tồn tại không
      if (typeof votingInstance.getDates === 'function') {
        console.log("Gọi hàm getDates() qua truffle-contract");
        return votingInstance.getDates({ from: getCurrentAccount() })
          .then(function(result) {
            console.log("Kết quả getDates (truffle):", result);
            return result;
          })
          .catch(function(error) {
            console.error("Lỗi khi gọi getDates() (truffle):", error);
            throw error;
          });
      } else {
        console.warn("Hàm getDates không tồn tại trong contract - trả về giá trị mặc định");
        return Promise.resolve([0, 0]); // Trả về giá trị mặc định
      }
    }
  } catch (error) {
    console.error("Lỗi exception khi gọi getDates():", error);
    return Promise.resolve([0, 0]); // Trả về giá trị mặc định nếu có lỗi
  }
}


module.exports = {
  setDates,
  getDates,
}; 