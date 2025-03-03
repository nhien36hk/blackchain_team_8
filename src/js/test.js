// Địa chỉ hợp đồng
const contractAddress = "0xC0E6575331c0aaFff428C335CB6b1e23d5E57fb8";

// ABI của hợp đồng (chỉ bao gồm các hàm cần thiết)
const contractABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "getCountCandidates",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "countCandidates",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

// Biến toàn cục
let web3;
let contract;
let account;

// Hàm khởi tạo
async function init() {
    try {
        updateStatus("Đang khởi tạo kết nối...");
        
        // Kiểm tra xem Metamask có được cài đặt không
        if (window.ethereum) {
            try {
                // Khởi tạo Web3 trước khi yêu cầu tài khoản
                web3 = new Web3(window.ethereum);
                
                // Kiểm tra kết nối mạng trước
                try {
                    const networkId = await web3.eth.net.getId();
                    updateStatus(`Đã kết nối với mạng blockchain. Mạng ID: ${networkId}`);
                    
                    // Sau khi xác nhận kết nối mạng, yêu cầu quyền truy cập tài khoản
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts',
                        params: []
                    });
                    
                    if (accounts && accounts.length > 0) {
                        account = accounts[0];
                        updateStatus(`Đã kết nối với Metamask. Tài khoản: ${account}. Mạng ID: ${networkId}`);
                        
                        // Khởi tạo hợp đồng
                        contract = new web3.eth.Contract(contractABI, contractAddress);
                        
                        // Tự động kiểm tra hợp đồng
                        checkContract();
                        
                        // Lắng nghe sự kiện thay đổi tài khoản
                        window.ethereum.on('accountsChanged', (accounts) => {
                            if (accounts && accounts.length > 0) {
                                account = accounts[0];
                                updateStatus(`Tài khoản đã thay đổi: ${account}`);
                            } else {
                                updateStatus("Không có tài khoản nào được chọn trong Metamask");
                            }
                        });
                        
                        // Lắng nghe sự kiện thay đổi mạng
                        window.ethereum.on('chainChanged', (chainId) => {
                            updateStatus(`Mạng đã thay đổi. Đang tải lại trang...`);
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        });
                    } else {
                        updateStatus("Không có tài khoản nào được chọn trong Metamask");
                    }
                } catch (networkError) {
                    console.error("Lỗi khi kiểm tra mạng:", networkError);
                    updateStatus(`Lỗi khi kết nối với mạng blockchain: ${networkError.message}`);
                    appendResult("Vui lòng kiểm tra xem Ganache có đang chạy không và Metamask đã được cấu hình đúng với mạng Ganache (http://127.0.0.1:7545)");
                }
            } catch (error) {
                console.error("Lỗi khi khởi tạo Web3 hoặc yêu cầu tài khoản:", error);
                updateStatus(`Lỗi khi kết nối với Metamask: ${error.message}`);
                appendResult("Vui lòng mở khóa Metamask và làm mới trang. Đảm bảo rằng bạn đã cấu hình Metamask để kết nối với Ganache (http://127.0.0.1:7545)");
            }
        } else {
            updateStatus("Metamask chưa được cài đặt! Vui lòng cài đặt Metamask để sử dụng ứng dụng này.");
            appendResult("Bạn có thể cài đặt Metamask từ trang web: https://metamask.io/download/");
        }
    } catch (error) {
        updateStatus(`Lỗi khi khởi tạo: ${error.message}`);
        console.error(error);
    }
}

// Hàm kiểm tra hợp đồng
async function checkContract() {
    try {
        updateResult("Đang kiểm tra hợp đồng...");
        
        if (!web3) {
            updateResult("Web3 chưa được khởi tạo. Vui lòng kết nối Metamask trước.");
            return;
        }
        
        if (!account) {
            updateResult("Chưa có tài khoản được kết nối. Vui lòng kết nối Metamask trước.");
            return;
        }
        
        // Kiểm tra xem hợp đồng có tồn tại không
        try {
            const code = await web3.eth.getCode(contractAddress);
            if (code === '0x' || code === '0x0') {
                updateResult(`Không tìm thấy hợp đồng tại địa chỉ: ${contractAddress}`);
                appendResult("Vui lòng kiểm tra lại địa chỉ hợp đồng và đảm bảo rằng hợp đồng đã được triển khai trên mạng hiện tại.");
                return;
            }
            
            updateResult(`Đã tìm thấy hợp đồng tại địa chỉ: ${contractAddress}`);
            appendResult(`Mã bytecode: ${code.substring(0, 50)}...`);
            
            // Gọi hàm countCandidates (biến public)
            try {
                const countCandidates = await contract.methods.countCandidates().call({from: account});
                appendResult(`Số lượng ứng cử viên (từ biến public): ${countCandidates}`);
            } catch (error) {
                appendResult(`Lỗi khi gọi biến countCandidates: ${error.message}`);
                console.error("Lỗi countCandidates:", error);
            }
            
            // Gọi hàm getCountCandidates
            try {
                const count = await contract.methods.getCountCandidates().call({from: account});
                appendResult(`Số lượng ứng cử viên (từ hàm getCountCandidates): ${count}`);
            } catch (error) {
                appendResult(`Lỗi khi gọi hàm getCountCandidates: ${error.message}`);
                console.error("Lỗi getCountCandidates:", error);
            }
        } catch (error) {
            updateResult(`Lỗi khi kiểm tra mã hợp đồng: ${error.message}`);
            console.error("Lỗi getCode:", error);
            appendResult("Vui lòng kiểm tra kết nối mạng và địa chỉ hợp đồng.");
        }
    } catch (error) {
        updateResult(`Lỗi khi kiểm tra hợp đồng: ${error.message}`);
        console.error("Lỗi chung:", error);
    }
}

// Hàm cập nhật trạng thái
function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

// Hàm cập nhật kết quả
function updateResult(message) {
    document.getElementById('result').textContent = message;
}

// Hàm thêm kết quả
function appendResult(message) {
    document.getElementById('result').textContent += "\n" + message;
}

// Khởi tạo khi trang tải xong
window.addEventListener('load', init); 