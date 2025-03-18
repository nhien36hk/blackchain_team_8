/**
 * Contract Service - Quản lý kết nối với smart contract
 * Hệ thống bầu cử phi tập trung
 */

const { Web3, VotingContract } = require('../config/web3-config.js');
const { getCurrentAccount } = require('./account-service.js');
const TruffleContract = require('@truffle/contract');

// Importing contract artifacts
const VotingSystemArtifact = require('../../../build/contracts/VotingSystem.json');

// Biến lưu trữ instance của contract
let contractInstance = null;
// Biến lưu trữ loại kết nối (true nếu là kết nối trực tiếp qua địa chỉ hardcode)
let isDirectConnectionUsed = false;

/**
 * Khởi tạo và kết nối đến smart contract
 * @returns {Promise<Object>} Contract instance
 */
async function initContract() {
    // Hiển thị thông báo nếu có phần tử UI
    if (document.getElementById('Aday')) {
        document.getElementById('Aday').innerHTML = "<p style='color: white;'>Đang khởi tạo hợp đồng, vui lòng đợi...</p>";
        document.getElementById('Aday').style.display = 'block';
    }

    try {
        // Kiểm tra Metamask
        if (!window.ethereum) {
            const errorMsg = "Không phát hiện MetaMask. Vui lòng cài đặt MetaMask để sử dụng ứng dụng.";
            console.error(errorMsg);
            if (document.getElementById('Aday')) {
                document.getElementById('Aday').innerHTML = `<p style='color: red;'>${errorMsg}</p>`;
            }
            throw new Error(errorMsg);
        }

        // Lấy ID mạng hiện tại
        const networkId = await window.ethereum.request({ method: 'net_version' });
        console.log("Đang kết nối đến mạng với ID:", networkId);

        // Hiển thị thông tin mạng
        let networkInfo = "Mạng đang kết nối: ";
        switch (networkId) {
            case '1': networkInfo += "Ethereum Mainnet"; break;
            case '3': networkInfo += "Ropsten Testnet"; break;
            case '4': networkInfo += "Rinkeby Testnet"; break;
            case '5': networkInfo += "Goerli Testnet"; break;
            case '42': networkInfo += "Kovan Testnet"; break;
            case '5777': networkInfo += "Ganache Local (5777)"; break;
            case '1337': networkInfo += "Ganache Local (1337)"; break;
            default: networkInfo += "ID: " + networkId; break;
        }

        if (document.getElementById('Aday')) {
            document.getElementById('Aday').innerHTML = `<p style='color: white;'>${networkInfo}</p>`;
        }

        // Thử các cách kết nối khác nhau
        let instance = null;
        
        // 1. Thử kết nối bằng TruffleContract
        instance = await tryConnectViaTruffleContract();
        
        // 2. Nếu không thành công, thử kết nối qua Web3 artifact
        if (!instance) {
            instance = await tryConnectViaWeb3Artifact(networkId);
        }
        
        // Nếu vẫn không thành công, thông báo lỗi
        if (!instance) {
            throw new Error("Không thể kết nối với hợp đồng thông minh. Vui lòng kiểm tra lại cấu hình mạng và địa chỉ hợp đồng.");
        }
        
        return instance;
    } catch (error) {
        console.error("Lỗi khi khởi tạo hợp đồng:", error);
        
        if (document.getElementById('Aday')) {
            document.getElementById('Aday').innerHTML = `<p style='color: red;'>Lỗi khi khởi tạo hợp đồng: ${error.message}</p>`;
        }
        
        throw error;
    }
}

/**
 * Thử kết nối với hợp đồng qua TruffleContract
 * @returns {Promise<Object|null>} Contract instance hoặc null nếu thất bại
 */
async function tryConnectViaTruffleContract() {
    try {
        console.log("Thử kết nối bằng TruffleContract...");
        
        // Sử dụng VotingContract đã được import từ web3-config
        // Đặt provider
        VotingContract.setProvider(window.ethereum);
        
        // Đặt tài khoản mặc định và gas
        const account = getCurrentAccount();
        VotingContract.defaults({
            from: account,
            gas: 3000000,
            gasPrice: Web3.utils.toWei('50', 'gwei')
        });
        
        // Lấy instance đã triển khai
        const instance = await VotingContract.deployed();
        
        // Kiểm tra kết nối
        const countCandidates = await instance.getCountCandidates();
        console.log("Kết nối bằng TruffleContract thành công! Số lượng ứng cử viên:", countCandidates.toString());
        
        if (document.getElementById('Aday')) {
            document.getElementById('Aday').innerHTML = `<p style='color: white;'>Đã kết nối với hợp đồng tại địa chỉ: ${instance.address}</p>`;
        }
        
        // Lưu instance để sử dụng sau này
        contractInstance = instance;
        isDirectConnectionUsed = false;
        
        return instance;
    } catch (error) {
        console.warn("Lỗi khi kết nối bằng TruffleContract:", error);
        return null;
    }
}

/**
 * Thử kết nối với hợp đồng qua Web3 và artifact
 * @param {string} networkId ID mạng blockchain hiện tại
 * @returns {Promise<Object|null>} Contract instance hoặc null nếu thất bại
 */
async function tryConnectViaWeb3Artifact(networkId) {
    try {
        console.log("Thử kết nối qua Web3 và artifact...");
        
        // Kiểm tra xem hợp đồng đã được triển khai trên mạng này chưa
        const deployedNetworks = VotingSystemArtifact.networks || {};
        
        if (Object.keys(deployedNetworks).length === 0) {
            console.warn("Không tìm thấy thông tin triển khai hợp đồng trong artifact");
            return null;
        }

        let deployedNetwork = deployedNetworks[networkId];
        if (!deployedNetwork) {
            // Thử tìm bất kỳ mạng nào đã triển khai
            const networkIds = Object.keys(deployedNetworks);
            if (networkIds.length > 0) {
                // Sắp xếp các mạng theo thời gian triển khai (nếu có)
                // Thông thường artifact cuối cùng sẽ là triển khai mới nhất
                networkIds.sort((a, b) => {
                    const timeA = deployedNetworks[a].updatedAt || 0;
                    const timeB = deployedNetworks[b].updatedAt || 0;
                    return timeB - timeA; // Sắp xếp giảm dần
                });
                
                console.warn(`Hợp đồng chưa được triển khai trên mạng hiện tại (ID: ${networkId}), thử mạng ${networkIds[0]}`);
                deployedNetwork = deployedNetworks[networkIds[0]];
            } else {
                return null;
            }
        }

        // Tạo web3 instance
        const web3 = new Web3(window.ethereum);
        
        // Lấy địa chỉ hợp đồng từ artifact
        const deployedAddress = deployedNetwork.address;
        
        console.log(`Thử kết nối với địa chỉ hợp đồng từ artifact: ${deployedAddress}`);
        
        // Tạo contract instance
        const instance = new web3.eth.Contract(
            VotingSystemArtifact.abi,
            deployedAddress
        );
        
        // Kiểm tra kết nối bằng cách gọi một hàm đơn giản
        const countCandidates = await instance.methods.getCountCandidates().call({ from: getCurrentAccount() });
        console.log("Kết nối qua Web3 Artifact thành công! Số lượng ứng cử viên:", countCandidates);
        
        if (document.getElementById('Aday')) {
            document.getElementById('Aday').innerHTML = `<p style='color: white;'>Đã kết nối với hợp đồng tại địa chỉ: ${deployedAddress}</p>`;
        }
        
        // Lưu instance để sử dụng sau này
        contractInstance = instance;
        isDirectConnectionUsed = true;
        
        return instance;
    } catch (error) {
        console.warn("Lỗi khi kết nối qua Web3 Artifact:", error);
        return null;
    }
}

/**
 * Kiểm tra xem người dùng hiện tại có phải là admin không
 * @returns {Promise<boolean>} True nếu là admin
 */
async function isAdmin() {
    try {
        const instance = await getContractInstance();
        const account = await getCurrentAccount();
        
        const admin = await instance.methods.admin().call();
        return admin.toLowerCase() === account.toLowerCase();
    } catch (error) {
        console.error("Lỗi khi kiểm tra quyền admin:", error);
        return false;
    }
}

/**
 * Kiểm tra xem người dùng hiện tại có phải là thành viên ủy ban bầu cử không
 * @returns {Promise<boolean>} True nếu là thành viên ủy ban
 */
async function isCommissionMember() {
    try {
        const instance = await getContractInstance();
        const account = await getCurrentAccount();
        
        const commission = await instance.methods.electionCommission().call();
        return commission.toLowerCase() === account.toLowerCase();
    } catch (error) {
        console.error("Lỗi khi kiểm tra quyền ủy ban:", error);
        return false;
    }
}

/**
 * Lấy instance của contract đã được khởi tạo
 * @returns {Promise<Object>} Contract instance
 */
async function getContractInstance() {
    if (!contractInstance) {
        return initContract();
    }
    return contractInstance;
}

/**
 * Lấy instance của contract cho các thao tác bỏ phiếu
 * (alias của getContractInstance để tương thích với các phần khác của code)
 * @returns {Object} Contract instance
 */
function getVotingInstance() {
    // Trả về instance đã có hoặc null nếu chưa khởi tạo
    // Không chờ đợi khởi tạo mới vì một số chỗ sử dụng hàm này không dùng async/await
    if (contractInstance) {
        // Thêm thuộc tính để App.js có thể kiểm tra
        contractInstance.isDirectConnection = isDirectConnectionUsed;
    }
    return contractInstance;
}

/**
 * Kiểm tra xem đang sử dụng kết nối trực tiếp (hardcode address) hay không
 * @returns {boolean} True nếu đang sử dụng kết nối trực tiếp
 */
function isDirectConnection() {
    return isDirectConnectionUsed;
}

module.exports = {
    initContract,
    getContractInstance,
    getVotingInstance,
    isAdmin,
    isCommissionMember,
    isDirectConnection
}; 