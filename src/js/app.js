//import "../css/style.css"

const Web3 = require('web3');
const contract = require('@truffle/contract');

const votingArtifacts = require('../../build/contracts/Voting.json');
var VotingContract = contract(votingArtifacts);


window.App = {
  // Thêm phương thức để cập nhật hiển thị tài khoản
  updateAccountDisplay: function() {
    if (window.ethereum && window.ethereum.selectedAddress) {
      console.log("Đang cập nhật hiển thị tài khoản:", window.ethereum.selectedAddress);
      $("#accountAddress").html("Tài Khoản Hiện Tại: " + window.ethereum.selectedAddress);
      App.account = window.ethereum.selectedAddress;
      console.log("App.account đã được cập nhật:", App.account);
    } else {
      console.log("Không có tài khoản được chọn để hiển thị");
      $("#accountAddress").html("Chưa kết nối tài khoản Metamask");
      App.account = null;
    }
  },

  // Thêm phương thức để kết nối lại và chọn tài khoản
  connectMetamask: function(forceChooseAccount) {
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
      
      window.ethereum.request(connectMethod)
        .then(function(result) {
          console.log("Kết quả kết nối:", result);
          // Sau khi có quyền, lấy tài khoản
          return window.ethereum.request({ method: 'eth_requestAccounts' });
        })
        .then(function(accounts) {
          if (accounts.length > 0) {
            console.log("Đã kết nối Metamask với tài khoản:", accounts[0]);
            $('#Aday').html("<p style='color: white;'>Đã kết nối Metamask: " + accounts[0] + "</p>");
            
            // Thêm nút để chọn lại tài khoản
            $('#Aday').append("<button id='changeAccount' class='btn btn-secondary mt-2' style='background-color: #198a7b; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;'>Đổi tài khoản</button>");
            
            $('#changeAccount').click(function() {
              App.connectMetamask(true);
            });
            
            // Kiểm tra mạng hiện tại
            window.ethereum.request({ method: 'eth_chainId' })
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
                
                console.log("Đang kết nối với mạng: " + networkName);
                $('#Aday').append("<p style='color: white;'>Đang kết nối với mạng: " + networkName + "</p>");
                
                // Thiết lập Web3 provider
                VotingContract.setProvider(window.ethereum);
                
                // Đặt giá trị gas mặc định cao hơn
                VotingContract.defaults({
                  from: accounts[0], 
                  gas: 3000000,  // Tăng gas lên 3,000,000
                  gasPrice: Web3.utils.toWei('50', 'gwei')  // Đặt giá gas rõ ràng
                });

                // Load account data
                App.account = accounts[0];
                $("#accountAddress").html("Tài Khoản Hiện Tại: " + accounts[0]);
                
                // Gọi hàm cập nhật hiển thị tài khoản
                App.updateAccountDisplay();
                
                // Tiếp tục khởi tạo contract và các chức năng
                App.initContract();
              })
              .catch(function(err) {
                console.error("Lỗi khi lấy thông tin mạng:", err);
                $('#Aday').html("<p style='color: red;'>Lỗi khi lấy thông tin mạng blockchain: " + err.message + "</p>");
                $('#Aday').show();
              });
          } else {
            console.error("Không tìm thấy tài khoản, vui lòng đăng nhập vào Metamask");
            $('#Aday').html("<p style='color: red;'>Không tìm thấy tài khoản, vui lòng đăng nhập vào Metamask</p>");
            alert("Vui lòng đăng nhập vào Metamask để sử dụng ứng dụng");
          }
        })
        .catch(function(error) {
          console.error("Lỗi khi kết nối Metamask:", error);
          $('#Aday').html("<p style='color: red;'>Lỗi khi kết nối Metamask: " + error.message + "</p>");
          alert("Lỗi khi kết nối Metamask: " + error.message);
        });
    } else {
      console.error("Metamask chưa được cài đặt");
      $('#Aday').html("<p style='color: red;'>Metamask chưa được cài đặt</p>");
      alert("Vui lòng cài đặt Metamask để sử dụng ứng dụng");
    }
  },
  
  eventStart: function() { 
    // Gọi phương thức kết nối Metamask
    App.connectMetamask(false);
  },

  initContract: function() {
    $('#Aday').html("<p style='color: white;'>Đang khởi tạo hợp đồng, vui lòng đợi...</p>");
    $('#Aday').show();
    
    try {
      // Kiểm tra và ghi log mạng hiện tại
      window.ethereum.request({ method: 'net_version' })
        .then(function(networkId) {
          console.log("Đang kết nối đến mạng với ID:", networkId);
          
          // Hiển thị thông tin mạng
          let networkInfo = "Mạng đang kết nối: ";
          switch(networkId) {
            case '1': networkInfo += "Ethereum Mainnet"; break;
            case '3': networkInfo += "Ropsten Testnet"; break;
            case '4': networkInfo += "Rinkeby Testnet"; break;
            case '5': networkInfo += "Goerli Testnet"; break;
            case '42': networkInfo += "Kovan Testnet"; break;
            case '5777': networkInfo += "Ganache Local (5777)"; break;
            case '1337': networkInfo += "Ganache Local (1337)"; break;
            default: networkInfo += "ID: " + networkId; break;
          }
          
          $('#Aday').html("<p style='color: white;'>" + networkInfo + "</p>");
          
          // Kiểm tra xem có địa chỉ contract cho network này không
          const deployedNetworks = Object.keys(votingArtifacts.networks);
          console.log("Mạng đã triển khai hợp đồng:", deployedNetworks);
          
          if (!deployedNetworks.includes(networkId)) {
            $('#Aday').html("<p style='color: red;'>Lỗi: Hợp đồng chưa được triển khai trên mạng hiện tại (ID: " + networkId + ").<br>Các mạng đã triển khai: " + deployedNetworks.join(", ") + "<br>Vui lòng chuyển sang một trong các mạng trên hoặc triển khai hợp đồng lên mạng này.</p>");
            return;
          }
          
          // Đặt provider cho contract và thêm tùy chọn gas cao hơn
          VotingContract.setProvider(window.ethereum);
          
          // Cấu hình gas cao hơn để tránh lỗi Out of Gas
          VotingContract.defaults({
            from: App.account,
            gas: 5000000,  // Tăng gas lên cao hơn
            gasPrice: Web3.utils.toWei('50', 'gwei')
          });
          
          // Kiểm tra xem hợp đồng có tồn tại không và thử kết nối
          VotingContract.deployed()
            .then(function(instance) {
              console.log("Đã kết nối với hợp đồng tại địa chỉ:", instance.address);
              $('#Aday').html("<p style='color: white;'>Đã kết nối với hợp đồng tại địa chỉ: " + instance.address + "</p>");
              $('#Aday').show();
              
              // Thử gọi một phương thức đơn giản để kiểm tra kết nối
              return instance.getCountCandidates({ from: App.account })
                .then(function(countCandidates) {
                  console.log("Số lượng ứng cử viên hiện tại:", countCandidates.toString());
                  
                  // Hiển thị giao diện người dùng
                  $(document).ready(function() {
                    // Xử lý các sự kiện UI và các chức năng giao diện
                    // Xử lý nút chọn lại tài khoản
                    $('#switchAccount').click(function() {
                      console.log("Đã nhấn nút chọn lại tài khoản (#switchAccount)");
                      App.connectMetamask(true);
                    });
                    
                    // Tiếp tục các sự kiện khác...
                    $('#addCandidate').click(function() {
                      // Code xử lý thêm ứng cử viên...
                      console.log("Đã nhấn nút thêm ứng cử viên");
                      
                      var nameCandidate = $('#name').val();
                      var partyCandidate = $('#party').val();
                        
                      // Debug - kiểm tra giá trị đầu vào
                      console.log("Tên ứng cử viên:", nameCandidate);
                      console.log("Đảng phái:", partyCandidate);
                      console.log("Trạng thái Metamask:", !!window.ethereum);
                      console.log("Account hiện tại:", App.account);
                        
                      // Kiểm tra dữ liệu đầu vào
                      if (!nameCandidate || !partyCandidate) {
                        $('#Aday').html("<p style='color: red;'>Vui lòng nhập đầy đủ tên và đảng phái của ứng cử viên</p>");
                        $('#Aday').show();
                        return;
                      }
                        
                      // Tiếp tục chức năng thêm ứng cử viên...
                      App.addCandidate(nameCandidate, partyCandidate);
                    });
                    
                    $('#addDate').click(function() {
                      // Code xử lý thêm ngày...
                      var startDate = Date.parse(document.getElementById("startDate").value)/1000;
                      var endDate = Date.parse(document.getElementById("endDate").value)/1000;
               
                      // Debug - kiểm tra giá trị đầu vào
                      console.log("Ngày bắt đầu:", new Date(startDate*1000));
                      console.log("Ngày kết thúc:", new Date(endDate*1000));
                      console.log("Trạng thái Metamask:", !!window.ethereum);
                      console.log("Account hiện tại:", App.account);
               
                      // Kiểm tra dữ liệu đầu vào
                      if (isNaN(startDate) || isNaN(endDate)) {
                        $('#Aday').html("<p style='color: red;'>Vui lòng chọn ngày bắt đầu và kết thúc</p>");
                        $('#Aday').show();
                        return;
                      }
                      
                      // Tiếp tục chức năng thiết lập ngày...
                      App.setDates(startDate, endDate);
                    });
                  });
                  
                  // Lấy thông tin ngày bỏ phiếu
                  instance.getDates().then(function(result) {
                    var startDate = new Date(result[0]*1000);
                    var endDate = new Date(result[1]*1000);
                    
                    // Định dạng ngày theo kiểu Việt Nam
                    var startDateStr = formatVietnameseDate(startDate);
                    var endDateStr = formatVietnameseDate(endDate);
                    
                    $("#dates").text(startDateStr + " - " + endDateStr);
                  }).catch(function(err) { 
                    console.error("Lỗi khi lấy thông tin ngày bỏ phiếu:", err);
                  });
                  
                  // Kiểm tra trạng thái bỏ phiếu
                  instance.checkVote().then(function(voted) {
                    console.log("Trạng thái đã bỏ phiếu:", voted);
                    if(!voted) {
                      $("#voteButton").attr("disabled", false);
                    } else {
                      $("#msg").html("<p style='color: var(--accent-color);'>Bạn đã bỏ phiếu rồi.</p>");
                    }
                  }).catch(function(error) {
                    console.error("Lỗi khi kiểm tra trạng thái bỏ phiếu:", error);
                  });
                  
                  // Hiển thị các ứng cử viên
                  for (var i = 0; i < countCandidates; i++) {
                    (function(candidateIndex) {
                      instance.getCandidate(candidateIndex + 1).then(function(data) {
                        var id = data[0];
                        var name = data[1];
                        var party = data[2];
                        var voteCount = data[3];
                        var viewCandidates = `<tr><td> <input class="form-check-input" type="radio" name="candidate" value="${id}" id=${id}>` + name + "</td><td>" + party + "</td><td>" + voteCount + "</td></tr>";
                        $("#boxCandidate").append(viewCandidates);
                      }).catch(function(error) {
                        console.error("Lỗi khi lấy thông tin ứng cử viên:", error);
                      });
                    })(i);
                  }
                  
                  window.countCandidates = countCandidates;
                })
                .catch(function(error) {
                  console.error("Lỗi khi gọi getCountCandidates:", error);
                  $('#Aday').html("<p style='color: red;'>Lỗi khi truy vấn dữ liệu từ hợp đồng: " + error.message + "<br>Có thể gây ra bởi:<br>1. Gas không đủ<br>2. ABI không khớp với hợp đồng<br>3. Hợp đồng không tồn tại tại địa chỉ đã chỉ định</p>");
                  $('#Aday').show();
                });
            })
            .catch(function(error) {
              console.error("Lỗi kết nối với hợp đồng:", error);
              
              // Thử kết nối trực tiếp bằng địa chỉ cố định
              console.log("Đang thử kết nối trực tiếp với địa chỉ hợp đồng...");
              
              // Địa chỉ hợp đồng đã biết từ truffle networks
              const contractAddress = "0xC0E6575331c0aaFff428C335CB6b1e23d5E57fb8";
              
              try {
                // Tạo instance Web3 từ provider hiện tại
                const web3 = new Web3(window.ethereum);
                
                const instance = new web3.eth.Contract(
                  votingArtifacts.abi,
                  contractAddress
                );
                
                console.log("Đã kết nối trực tiếp với hợp đồng tại địa chỉ:", contractAddress);
                $('#Aday').html("<p style='color: white;'>Đang thử kết nối trực tiếp với hợp đồng tại địa chỉ: " + contractAddress + "</p>");
                
                // Gọi hàm getCountCandidates từ instance mới
                instance.methods.getCountCandidates().call({from: App.account})
                  .then(function(countCandidates) {
                    console.log("Kết nối trực tiếp thành công! Số lượng ứng cử viên:", countCandidates);
                    $('#Aday').html("<p style='color: white;'>Đã kết nối trực tiếp với hợp đồng tại địa chỉ: " + contractAddress + "</p>");
                    
                    // Lưu instance vào biến toàn cục để sử dụng sau này
                    App.votingInstance = instance;
                    
                    // Tiếp tục xử lý UI và các chức năng khác
                    // ...
                  })
                  .catch(function(err) {
                    console.error("Lỗi khi gọi hàm từ kết nối trực tiếp:", err);
                    $('#Aday').html("<p style='color: red;'>Lỗi khi kết nối với hợp đồng: " + err.message + "<br>Vui lòng kiểm tra lại địa chỉ hợp đồng và mạng blockchain</p>");
                  });
              } catch (err) {
                console.error("Lỗi khi tạo kết nối trực tiếp:", err);
                $('#Aday').html("<p style='color: red;'>Lỗi khi kết nối với hợp đồng: " + error.message + "<br>Vui lòng kiểm tra lại:<br>1. Địa chỉ hợp đồng trong file build/contracts/Voting.json<br>2. Mạng blockchain bạn đang kết nối<br>3. Metamask đã được cài đặt và mở khóa</p>");
                $('#Aday').show();
              }
            });
        })
        .catch(function(error) {
          console.error("Lỗi khi lấy thông tin mạng blockchain:", error);
          $('#Aday').html("<p style='color: red;'>Lỗi khi lấy thông tin mạng blockchain: " + error.message + "</p>");
          $('#Aday').show();
        });
    } catch(error) {
      console.error("Lỗi ngoại lệ khi khởi tạo hợp đồng:", error);
      $('#Aday').html("<p style='color: red;'>Lỗi ngoại lệ khi khởi tạo hợp đồng: " + error.message + "</p>");
      $('#Aday').show();
    }
  },

  vote: function() {    
    var candidateID = $("input[name='candidate']:checked").val();
    
    // Debug - kiểm tra giá trị đầu vào
    console.log("ID ứng cử viên đã chọn:", candidateID);
    console.log("Trạng thái Metamask:", !!window.ethereum);
    console.log("Account hiện tại:", App.account);
    
    if (!candidateID) {
      $("#msg").html("<p style='color: red;'>Vui lòng chọn một ứng cử viên để bỏ phiếu.</p>");
      return;
    }
    
    // Kiểm tra Metamask
    if (!window.ethereum) {
      $("#msg").html("<p style='color: red;'>Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục.</p>");
      return;
    }
    
    // Hiển thị thông báo đang xử lý
    $("#msg").html("<p style='color: var(--accent-color);'>Đang xử lý, vui lòng chờ và xác nhận trong Metamask...</p>");
    
    // Tạo hàm xử lý riêng để tránh lỗi closure và callback lồng nhau
    function voteProcess() {
      VotingContract.deployed()
        .then(function(instance) {
          console.log("Đã lấy instance hợp đồng:", instance.address);
          
          // Gọi hàm vote với gas cao hơn
          return instance.vote(parseInt(candidateID), {
            from: App.account,
            gas: 5000000,  // Tăng gas cao hơn giống các hàm khác
            gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
          });
        })
        .then(function(result) {
          console.log("Kết quả bỏ phiếu thành công:", result);
          $("#voteButton").attr("disabled", true);
          $("#msg").html("<p style='color: var(--accent-color);'>Đã bỏ phiếu thành công! Đang làm mới trang...</p>");
          
          // Làm mới trang sau 2 giây
          setTimeout(function() {
            window.location.reload();
          }, 2000);
        })
        .catch(function(err) {
          console.error("Lỗi khi bỏ phiếu:", err);
          let errorMessage = "Lỗi không xác định: " + err.message;
          
          if (err.message.includes("gas")) {
            errorMessage = "Không đủ gas để thực hiện giao dịch. Vui lòng tăng giới hạn gas.";
          } else if (err.message.includes("rejected")) {
            errorMessage = "Giao dịch đã bị từ chối trên Metamask. Vui lòng thử lại.";
          } else if (err.message.includes("account")) {
            errorMessage = "Vấn đề về tài khoản Metamask. Vui lòng kiểm tra lại tài khoản đã được mở khóa.";
          } else if (err.message.includes("already voted")) {
            errorMessage = "Tài khoản này đã bỏ phiếu rồi.";
          } else if (err.message.includes("Returned values")) {
            errorMessage = "Lỗi khi truy vấn dữ liệu từ hợp đồng. Vui lòng kiểm tra lại kết nối mạng và cài đặt Metamask.";
          }
          
          $("#msg").html("<p style='color: red;'>Lỗi: " + errorMessage + "</p>");
        });
    }
    
    // Đảm bảo có kết nối tài khoản Metamask trước khi thực hiện
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(function(accounts) {
        if (accounts && accounts.length > 0) {
          App.account = accounts[0];
          console.log("Tài khoản Metamask đã chọn:", App.account);
          voteProcess();
        } else {
          $("#msg").html("<p style='color: red;'>Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.</p>");
        }
      })
      .catch(function(err) {
        console.error("Lỗi khi yêu cầu tài khoản Metamask:", err);
        $("#msg").html("<p style='color: red;'>Lỗi khi kết nối Metamask: " + err.message + "</p>");
      });
  },

  // Thêm phương thức để xử lý việc thêm ứng cử viên
  addCandidate: function(nameCandidate, partyCandidate) {
    // Kiểm tra Metamask
    if (!window.ethereum) {
      $('#Aday').html("<p style='color: red;'>Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục.</p>");
      $('#Aday').show();
      return;
    }
    
    // Hiển thị trạng thái
    $('#Aday').html("<p style='color: white;'>Đang xử lý, vui lòng chờ và xác nhận trong Metamask...</p>");
    $('#Aday').show();
    
    // Đảm bảo có kết nối tài khoản Metamask trước khi thực hiện
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(function(accounts) {
        if (accounts && accounts.length > 0) {
          App.account = accounts[0];
          console.log("Tài khoản Metamask đã chọn:", App.account);
          
          // Lấy instance hợp đồng
          VotingContract.deployed()
            .then(function(instance) {
              console.log("Đã lấy instance hợp đồng:", instance.address);
              
              // Ghi log trạng thái hiện tại để debug
              console.log("Thông tin giao dịch:");
              console.log("- Địa chỉ gửi (from):", App.account);
              console.log("- Dữ liệu gửi:", {name: nameCandidate, party: partyCandidate});
              console.log("- Gas cấu hình:", VotingContract.defaults().gas);
              
              // Hiển thị thông báo gửi giao dịch
              $('#Aday').html("<p style='color: white;'>Đang gửi giao dịch đến blockchain, vui lòng xác nhận trong Metamask và đợi...</p>");
              $('#Aday').show();
              
              // Gọi hàm addCandidate với gas cao hơn và chỉ định rõ ràng gasPrice
              return instance.addCandidate(nameCandidate, partyCandidate, {
                from: App.account,
                gas: 5000000,  // Tăng gas cao hơn
                gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
              });
            })
            .then(function(result) {
              console.log("Kết quả thêm ứng cử viên thành công:", result);
              $('#Aday').html("<p style='color: white;'>Đã thêm ứng cử viên thành công! Đang làm mới trang...</p>");
              $('#Aday').show();
              
              // Làm mới trang sau 2 giây
              setTimeout(function() {
                window.location.reload();
              }, 2000);
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
              
              $('#Aday').html("<p style='color: red;'>Lỗi: " + errorMessage + "</p>");
              $('#Aday').show();
            });
        } else {
          $('#Aday').html("<p style='color: red;'>Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.</p>");
          $('#Aday').show();
        }
      })
      .catch(function(err) {
        console.error("Lỗi khi yêu cầu tài khoản Metamask:", err);
        $('#Aday').html("<p style='color: red;'>Lỗi khi kết nối Metamask: " + err.message + "</p>");
        $('#Aday').show();
      });
  },
  
  // Thêm phương thức để xử lý việc thiết lập ngày bỏ phiếu
  setDates: function(startDate, endDate) {
    // Kiểm tra dữ liệu đầu vào
    if (endDate <= startDate) {
      $('#Aday').html("<p style='color: red;'>Ngày kết thúc phải sau ngày bắt đầu</p>");
      $('#Aday').show();
      return;
    }
    
    // Kiểm tra Metamask
    if (!window.ethereum) {
      $('#Aday').html("<p style='color: red;'>Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục.</p>");
      $('#Aday').show();
      return;
    }
    
    // Hiển thị trạng thái
    $('#Aday').html("<p style='color: white;'>Đang xử lý, vui lòng chờ và xác nhận trong Metamask...</p>");
    $('#Aday').show();
    
    // Đảm bảo có kết nối tài khoản Metamask trước khi thực hiện
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(function(accounts) {
        if (accounts && accounts.length > 0) {
          App.account = accounts[0];
          console.log("Tài khoản Metamask đã chọn:", App.account);
          
          // Lấy instance hợp đồng
          VotingContract.deployed()
            .then(function(instance) {
              console.log("Đã lấy instance hợp đồng:", instance.address);
              
              // Gọi hàm setDates với gas cao hơn
              return instance.setDates(startDate, endDate, {
                from: App.account,
                gas: 5000000,  // Tăng gas cao hơn
                gasPrice: Web3.utils.toWei('50', 'gwei')  // Chỉ định rõ ràng gasPrice
              });
            })
            .then(function(result) {
              console.log("Kết quả thiết lập ngày bỏ phiếu thành công:", result);
              $('#Aday').html("<p style='color: white;'>Đã thiết lập ngày bỏ phiếu thành công! Đang làm mới trang...</p>");
              $('#Aday').show();
              
              // Làm mới trang sau 2 giây
              setTimeout(function() {
                window.location.reload();
              }, 2000);
            })
            .catch(function(err) {
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
              
              $('#Aday').html("<p style='color: red;'>Lỗi: " + errorMessage + "</p>");
              $('#Aday').show();
            });
        } else {
          $('#Aday').html("<p style='color: red;'>Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.</p>");
          $('#Aday').show();
        }
      })
      .catch(function(err) {
        console.error("Lỗi khi yêu cầu tài khoản Metamask:", err);
        $('#Aday').html("<p style='color: red;'>Lỗi khi kết nối Metamask: " + err.message + "</p>");
        $('#Aday').show();
      });
  }
};

// Hàm định dạng ngày theo kiểu Việt Nam
function formatVietnameseDate(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  
  // Thêm số 0 phía trước nếu cần
  day = (day < 10) ? '0' + day : day;
  month = (month < 10) ? '0' + month : month;
  
  return day + '/' + month + '/' + year;
}

window.addEventListener("load", function() {
  console.log("Đang khởi tạo ứng dụng...");
  
  // Thêm sự kiện click cho nút chọn lại tài khoản khi trang đã tải
  $(document).ready(function() {
    console.log("Document ready, gắn sự kiện cho #switchAccount");
    $('#switchAccount').click(function() {
      console.log("Đã nhấn nút #switchAccount trong sidebar");
      App.connectMetamask(true);
      return false; // Ngăn chặn hành vi mặc định
    });
  });
  
  if (typeof window.ethereum !== "undefined") {
    console.log("Đã phát hiện Metamask, đang khởi tạo Web3...");
    
    // Thử kết nối Metamask nhẹ nhàng mà không yêu cầu tài khoản để kiểm tra trạng thái
    console.log("Đang kiểm tra trạng thái Metamask trước khi kết nối...");
    
    try {
      // Tạo instance Web3 mới với Metamask provider
      window.eth = new Web3(window.ethereum);
      
      // Kết nối với Metamask một cách rõ ràng
      window.ethereum.enable()
        .then(function() {
          console.log("Metamask đã được kết nối thành công");
          
          // Kiểm tra kết nối mạng blockchain
          window.ethereum.request({ method: 'net_version' })
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
              
              console.log("Đang kết nối tới mạng:", networkName);
              
              if (!isSupportedNetwork) {
                console.warn("Mạng blockchain hiện tại có thể không được hỗ trợ bởi ứng dụng.");
                alert("Cảnh báo: Bạn đang kết nối với mạng " + networkName + " có thể không được hỗ trợ bởi ứng dụng. Hợp đồng có thể không tồn tại trên mạng này.");
              }
              
              // Lắng nghe sự kiện thay đổi tài khoản
              window.ethereum.on('accountsChanged', function (accounts) {
                console.log('Tài khoản Metamask đã thay đổi thành:', accounts[0]);
                
                // Cập nhật App.account trước khi làm mới trang
                if (accounts && accounts.length > 0) {
                  App.account = accounts[0];
                  console.log("App.account đã được cập nhật thành:", App.account);
                } else {
                  App.account = null;
                  console.log("App.account đã được đặt lại thành null");
                }
                
                // Cập nhật hiển thị tài khoản
                App.updateAccountDisplay();
                
                alert('Tài khoản Metamask đã thay đổi. Đang làm mới trang...');
                window.location.reload();
              });
              
              // Lắng nghe sự kiện thay đổi mạng
              window.ethereum.on('chainChanged', function (chainId) {
                console.log('Mạng Metamask đã thay đổi thành:', chainId);
                alert('Mạng Metamask đã thay đổi. Đang làm mới trang...');
                window.location.reload();
              });
              
              window.App.eventStart();
            })
            .catch(function(error) {
              console.error("Lỗi khi lấy thông tin mạng blockchain:", error);
              alert("Lỗi khi lấy thông tin mạng blockchain: " + error.message);
            });
        })
        .catch(function(error) {
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
