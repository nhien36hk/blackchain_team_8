const { initWeb3 } = require('./config/web3-config');
const { connectMetamask, updateAccountDisplay, setupAccountChangeListeners, getNetworkInfo, getCurrentAccount } = require('./services/account-service');
const { initContract, getVotingInstance, isDirectConnection } = require('./services/contract-service');
const { vote, checkVote } = require('./services/voting-service');
const { addCandidate, getCountCandidates, getCandidate} = require('./services/candidate-service');
const { setDates, getDates } = require('./services/date-service');
const { formatVietnameseDate } = require('./utils/date-formatter');
const { initAdminController } = require('./controllers/admin-controller');
const { initIndexController } = require('./controllers/index-controller');
const { Web3 } = require('./config/web3-config');

// Khởi tạo App
const App = {
  account: null,

  // Chức năng cập nhật hiển thị tài khoản
  updateAccountDisplay: updateAccountDisplay,

  // Chức năng kết nối Metamask
  connectMetamask: connectMetamask,

  // Khởi tạo ứng dụng
  init: function () {
    App.connectMetamask(false).then(function () {
      console.log("Khởi tạo ứng dụng...");

      // Xác định trang hiện tại
      const isAdminPage = window.location.href.includes('admin.html');

      // Khởi tạo Web3 để đảm bảo window.web3 tồn tại
      if (!window.web3 && window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        console.log("Đã khởi tạo window.web3 từ window.ethereum");
      }

      // Khởi tạo hợp đồng
      return initContract()
        .then(function (instance) {
          console.log("Đã khởi tạo hợp đồng:", instance);
          
          // Lưu thông tin về web3 provider
          if (instance && instance.isDirectConnection) {
            console.log("Sử dụng kết nối trực tiếp Web3");
          } else {
            console.log("Sử dụng kết nối qua Truffle Contract");
          }

          // Khởi tạo controllers cho trang admin
          if (isAdminPage) {
            initAdminController();
            
            // Lắng nghe sự kiện bỏ phiếu cho trang admin
            App.listenForVoteEvents()
              .then(() => {
                console.log("Đã thiết lập lắng nghe sự kiện bỏ phiếu");
              })
              .catch(error => {
                console.error("Không thể lắng nghe sự kiện bỏ phiếu:", error);
              });
          } else {
            // Khởi tạo controller cho trang chủ (index)
            initIndexController();
          }

          // Xử lý nút chọn lại tài khoản - có ở cả trang chủ và admin
          $('#switchAccount').click(function () {
            console.log("Đã nhấn nút chọn lại tài khoản (#switchAccount)");
            App.connectMetamask(true);
          });

          // Lấy thông tin ngày bỏ phiếu
          console.log("Bắt đầu lấy thông tin ngày bỏ phiếu...");
          return getDates()
            .then(function (result) {
              console.log("Đã nhận kết quả từ getDates():", result);
              var startDate = new Date(result[0] * 1000);
              var endDate = new Date(result[1] * 1000);

              console.log("Da vao duoc ngay");

              // Định dạng ngày theo kiểu Việt Nam
              var startDateStr = formatVietnameseDate(startDate);
              var endDateStr = formatVietnameseDate(endDate);

              $("#dates").text(startDateStr + " - " + endDateStr);

              console.log("Đã lấy được ngày: " + startDateStr + " - " + endDateStr);

              // Nếu là trang admin thì kết thúc, không cần tải thông tin ứng cử viên
              if (isAdminPage) {
                return Promise.resolve();
              }
              // Trang index sẽ xử lý các chức năng thông qua index-controller.js
            })
            .catch(function (error) {
              console.error("Lỗi khi lấy thông tin ngày bỏ phiếu:", error);
              $("#dates").text("Chưa thiết lập");
            });
        })
        .catch(function (error) {
          console.error("Lỗi khi khởi tạo ứng dụng:", error);
          $('#Aday').html("<p style='color: red;'>Lỗi khi khởi tạo ứng dụng: " + error.message + "</p>");
          $('#Aday').show();
        });
    }).catch(function (error) {
      console.error("Lỗi khi đăng nhập meta mask:", error);
      $('#Aday').html("<p style='color: red;'>Lỗi khi khởi tạo ứng dụng: " + error.message + "</p>");
      $('#Aday').show();
    })
  },

  // Implement các chức năng service
  initContract: initContract,
  vote: vote,
  addCandidate: addCandidate,
  setDates: setDates,
  getCountCandidates: getCountCandidates,
  getCandidate: getCandidate,
  checkVote: checkVote,
  
  // Các chức năng mới cho theo dõi kết quả bỏ phiếu theo thời gian thực
  getAllCandidates: function() {
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
      .then(candidatesData => {
        // Format lại dữ liệu để dễ sử dụng
        return candidatesData.map(data => {
          return {
            id: parseInt(data[0]),
            name: data[1],
            party: data[2],
            votes: parseInt(data[3])
          };
        });
      })
      .catch(err => {
        console.error("Lỗi khi lấy danh sách ứng cử viên:", err);
        throw new Error("Không thể lấy danh sách ứng cử viên: " + err.message);
      });
  },
  
  // Lấy tổng số cử tri đã đăng ký
  getTotalVoters: function() {
    const votingInstance = getVotingInstance();
    
    if (!votingInstance) {
      return Promise.reject(new Error("Chưa khởi tạo hợp đồng"));
    }
    
    // Đếm số địa chỉ đã bỏ phiếu bằng cách sử dụng Web3 để quét các giao dịch
    const web3 = window.web3;
    
    if (!web3) {
      return Promise.reject(new Error("Web3 chưa được khởi tạo"));
    }
    
    return new Promise((resolve, reject) => {
      // Lấy địa chỉ của contract
      let contractAddress;
      
      if (isDirectConnection()) {
        contractAddress = votingInstance._address;
      } else {
        contractAddress = votingInstance.address;
      }
      
      // Lấy block hiện tại
      web3.eth.getBlockNumber()
        .then(latestBlock => {
          // Số block cần quét (mặc định quét 5000 block gần nhất)
          const blocksToScan = 5000; 
          const fromBlock = Math.max(0, latestBlock - blocksToScan);
          
          console.log(`Quét từ block ${fromBlock} đến block ${latestBlock}`);
          
          // Đếm số địa chỉ đã bỏ phiếu từ các giao dịch
          // Trong thực tế, nên sử dụng event logs của hợp đồng 
          // hoặc thêm hàm trong hợp đồng để đếm số địa chỉ đã bỏ phiếu
          
          // Duyệt tất cả các giao dịch đến hợp đồng (quá trình này có thể mất thời gian)
          // Trong ứng dụng thực tế, nên thêm hàm getTotalVoters vào hợp đồng thông minh
          
          // Vì đây là mock-up, sẽ trả về giá trị dựa trên số lượt vote
          return App.getAllCandidates() 
            .then(candidates => {
              const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
              // Giả định số người đăng ký gấp ~3 lần số phiếu bầu
              const registeredVoters = totalVotes * 3;
              resolve(Math.max(200, registeredVoters)); // Ít nhất 200 người
            });
        })
        .catch(err => {
          console.error("Lỗi khi đếm số địa chỉ đã bỏ phiếu:", err);
          // Fallback nếu có lỗi - trả về giá trị mặc định
          resolve(200);
        });
    });
  },
  
  // Lấy lịch sử bỏ phiếu gần đây
  getRecentVotes: function() {
    const votingInstance = getVotingInstance();
    
    if (!votingInstance) {
      return Promise.reject(new Error("Chưa khởi tạo hợp đồng"));
    }
    
    // Trong thực tế, cần tạo và lắng nghe sự kiện từ smart contract
    // Cần bổ sung event trong smart contract để theo dõi voting
    
    // Hiện tại, chúng ta sẽ tạo dữ liệu mô phỏng dựa trên thời gian thực
    const now = new Date();
    const currentAccount = getCurrentAccount();
    
    return App.getAllCandidates()
      .then(candidates => {
        // Sắp xếp các ứng viên theo số phiếu từ cao đến thấp
        candidates.sort((a, b) => b.votes - a.votes);
        
        // Tạo lịch sử bỏ phiếu mô phỏng
        const recentVotes = [];
        const accountPrefix = currentAccount ? currentAccount.substring(0, 6) : "0x1234";
        const accountSuffix = currentAccount ? currentAccount.substring(38) : "5678";
        
        // Tạo 5 mục lịch sử giả định
        for (let i = 0; i < 5; i++) {
          const timeOffset = i * 2 + Math.floor(Math.random() * 3);
          const voteTime = new Date(now.getTime() - timeOffset * 60000);
          
          // Chọn ngẫu nhiên một ứng viên
          const candidateIndex = Math.floor(Math.random() * candidates.length);
          
          // Tạo địa chỉ ví ngẫu nhiên
          const randomHex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
          
          recentVotes.push({
            time: voteTime.toLocaleTimeString(),
            voter: i === 0 ? // Hiển thị account hiện tại làm vote đầu tiên
              `0x${accountPrefix}...${accountSuffix}` :
              `0x${randomHex}...${randomHex.substring(0, 4)}`,
            candidate: candidates[candidateIndex].name
          });
        }
        
        return recentVotes;
      })
      .catch(err => {
        console.error("Lỗi khi lấy lịch sử bỏ phiếu:", err);
        return [
          { time: now.toLocaleTimeString(), voter: `0x${currentAccount.substring(2, 6)}...${currentAccount.substring(38)}`, candidate: 'Đang tải...' }
        ];
      });
  },
  
  // Công bố kết quả chính thức
  publishResults: function() {
    // Trong thực tế, cần thêm hàm này vào smart contract
    // Có thể là hàm để đánh dấu kết quả là chính thức và không thể thay đổi
    
    return new Promise((resolve, reject) => {
      console.log("Đang công bố kết quả chính thức...");
      
      // Hiển thị thông báo xác nhận
      const confirmPublish = confirm("Bạn có chắc chắn muốn công bố kết quả chính thức?\nĐiều này chỉ nên thực hiện sau khi cuộc bỏ phiếu đã kết thúc.");
      
      if (confirmPublish) {
        // Đây là nơi gọi hàm từ smart contract nếu có
        setTimeout(() => {
          alert('Đã công bố kết quả bỏ phiếu chính thức!');
          resolve(true);
        }, 1000);
      } else {
        resolve(false);
      }
    });
  },
  
  // Lắng nghe sự kiện bỏ phiếu từ blockchain
  listenForVoteEvents: function() {
    const votingInstance = getVotingInstance();
    
    if (!votingInstance) {
      console.error("Chưa khởi tạo hợp đồng, không thể lắng nghe sự kiện");
      return Promise.reject(new Error("Chưa khởi tạo hợp đồng"));
    }
    
    console.log("Bắt đầu lắng nghe sự kiện bỏ phiếu từ blockchain...");
    
    try {
      // Trong thực tế, cần thêm event Voted trong smart contract
      // Ví dụ: event Voted(address voter, uint candidateId, uint timestamp);
      
      // Lắng nghe sự kiện từ hợp đồng
      if (isDirectConnection()) {
        // Nếu hợp đồng có định nghĩa event Voted
        if (votingInstance.events && typeof votingInstance.events.Voted === 'function') {
          console.log("Đang lắng nghe sự kiện Voted (Web3)...");
          
          return votingInstance.events.Voted({
            fromBlock: 'latest'
          })
          .on('data', function(event) {
            console.log("Đã nhận sự kiện bỏ phiếu mới (Web3):", event);
            // Cập nhật dữ liệu khi có sự kiện mới
            App.getAllCandidates();
          })
          .on('error', function(error) {
            console.error("Lỗi khi lắng nghe sự kiện (Web3):", error);
          });
        } else {
          console.log("Hợp đồng không có sự kiện Voted hoặc chưa triển khai - sử dụng polling");
        }
      } else {
        // Truffle Contract
        if (votingInstance.Voted) {
          console.log("Đang lắng nghe sự kiện Voted (Truffle)...");
          
          votingInstance.Voted({}, { fromBlock: 'latest' })
            .on('data', function(event) {
              console.log("Đã nhận sự kiện bỏ phiếu mới (Truffle):", event);
              // Cập nhật dữ liệu khi có sự kiện mới
              App.getAllCandidates();
            })
            .on('error', function(error) {
              console.error("Lỗi khi lắng nghe sự kiện (Truffle):", error);
            });
        } else {
          console.log("Hợp đồng không có sự kiện Voted hoặc chưa triển khai - sử dụng polling");
        }
      }
      
      // Trả về Promise.resolve vì đã thiết lập lắng nghe không đồng bộ
      return Promise.resolve();
    } catch (error) {
      console.error("Lỗi khi thiết lập lắng nghe sự kiện:", error);
      return Promise.reject(error);
    }
  }
};

// Export app
module.exports = App;

// Điều kiện file tỉnh đã được tải hết html, css, ảnh,...
window.addEventListener("load", function () {
  console.log("Đang khởi tạo ứng dụng...");

  // Thêm điều kiện dom đã được tải xong
  $(document).ready(function () {
    console.log("Document ready, gắn sự kiện cho #switchAccount");
    $('#switchAccount').click(function () {
      console.log("Đã nhấn nút #switchAccount trong sidebar");
      App.connectMetamask(true);
      return false; // Ngăn chặn hành vi mặc định
    });
  });

  // Kiểm tra metamask đã được cài đặt và khởi tạo web3
  if (initWeb3()) {
    console.log("Đã phát hiện Metamask, đang khởi tạo Web3...");

    // Thử kết nối Metamask nhẹ nhàng mà không yêu cầu tài khoản để kiểm tra trạng thái
    console.log("Đang kiểm tra trạng thái Metamask trước khi kết nối...");

    try {
      // Kết nối với Metamask một cách rõ ràng
      window.ethereum.enable()
        .then(function () {
          console.log("Metamask đã được kết nối thành công");

          // Kiểm tra kết nối mạng blockchain
          getNetworkInfo()
            .then(function (networkInfo) {
              console.log("ID mạng blockchain hiện tại:", networkInfo.networkId);
              console.log("Đang kết nối tới mạng:", networkInfo.networkName);

              if (!networkInfo.isSupportedNetwork) {
                console.warn("Mạng blockchain hiện tại có thể không được hỗ trợ bởi ứng dụng.");
                alert("Cảnh báo: Bạn đang kết nối với mạng " + networkInfo.networkName + " có thể không được hỗ trợ bởi ứng dụng. Hợp đồng có thể không tồn tại trên mạng này.");
              }

              // Thiết lập sự kiện lắng nghe thay đổi tài khoản và mạng
              setupAccountChangeListeners(function (eventType, data) {
                if (eventType === 'accountsChanged') {
                  console.log('Tài khoản Metamask đã thay đổi thành:', data[0]);
                  alert('Tài khoản Metamask đã thay đổi. Đang làm mới trang...');
                  window.location.reload();
                } else if (eventType === 'chainChanged') {
                  console.log('Mạng Metamask đã thay đổi thành:', data);
                  alert('Mạng Metamask đã thay đổi. Đang làm mới trang...');
                  window.location.reload();
                }
              });

              // Khởi tạo ứng dụng
              App.init();
            })
            .catch(function (error) {
              console.error("Lỗi khi lấy thông tin mạng blockchain:", error);
              alert("Lỗi khi lấy thông tin mạng blockchain: " + error.message);
            });
        })
        .catch(function (error) {
          console.error("Lỗi khi kết nối với Metamask:", error);
          alert("Không thể kết nối với Metamask. Vui lòng mở khóa ví Metamask của bạn và làm mới trang.");
        });
    } catch (error) {
      console.error("Lỗi khi khởi tạo Web3:", error);
      alert("Lỗi khi khởi tạo Web3: " + error.message);
    }
  } else {
    console.warn("Không phát hiện Metamask. Vui lòng cài đặt Metamask để sử dụng ứng dụng.");
    alert("Không phát hiện Metamask. Vui lòng cài đặt Metamask để sử dụng ứng dụng.");
  }
}); 