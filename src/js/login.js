const loginForm = document.getElementById('loginForm');
const voterIdSelect = document.getElementById('voter-id');
const passwordInput = document.getElementById('password');
const voterIdError = document.getElementById('voter-id-error');
const passwordError = document.getElementById('password-error');
const loginError = document.getElementById('login-error');
const networkStatus = document.getElementById('networkStatus');
const accountInfo = document.getElementById('account-info');
const accountAddress = document.getElementById('account-address');
const accountBalance = document.getElementById('account-balance');

// Khởi tạo Web3 và Ganache URL
let web3;
const ganacheUrl = 'http://127.0.0.1:7545';

// Danh sách private keys từ Ganache (thay thế bằng private keys thực từ Ganache của bạn)
const privateKeys = [
    "0x0618f59d0a1fff879aebbc1b5da356f8cddeade7f7822e72b43781c6421d4320", // Admin
    "0x03f18310dddb72d0933361989dc81ef6b90575213bb94f2a90e7a6d9e312b9ee",
    "0x902d0870b9bfed6ff097613302bff55b0e258aaf975bfd0389f983830d716fca",
    "0x09ff73e2de2a4621c7145bac0c7be3baee303f931a8938185f04c6dd5b7278de",
    "0x12eaa4e3462dddd476ed76fc3d1d179eac5e56fe12f9beb3847a8e3aca838fb4",
    "0x8264990af7874fbd7915f099811ae1adce5ab97b1fc9668818ba2bde3dbe3c7f",
    "0x256e470a14ee3cb88460348ad6e2fa930d9402bcfad0089acba8f3ba99178d5e",
    "0x8a3a8a243c276671187c00e157273f865c329f030037958e9ab8e68067aaa5d7",
    "0x4fed1dcca7d30238bb6bee6e2e165c31cb35485ef5b4170e1c1b046b092467b3",
    "0x62a2622e3566c1894e8329b8feea457fd788579d042ae632910b09d757d04967"
];

async function initWeb3() {
    try {
        // Kết nối trực tiếp với Ganache
        const ganacheProvider = new Web3.providers.HttpProvider(ganacheUrl);
        const ganacheWeb3 = new Web3(ganacheProvider);

        // Kiểm tra kết nối
        try {
            await ganacheWeb3.eth.net.isListening();
        } catch (error) {
            console.error('Không thể kết nối với Ganache:', error);
            updateNetworkStatus('error', 'Không thể kết nối với Ganache. Vui lòng kiểm tra Ganache đã được khởi động.');
            return false;
        }

        try {
            // Xóa các options cũ
            voterIdSelect.innerHTML = '<option value="">Chọn tài khoản...</option>';

            // Thêm 10 tài khoản với private keys vào select box
            for (let i = 0; i < privateKeys.length; i++) {
                const privateKey = privateKeys[i];
                const account = ganacheWeb3.eth.accounts.privateKeyToAccount(privateKey);
                const balance = await ganacheWeb3.eth.getBalance(account.address);
                const balanceInEth = ganacheWeb3.utils.fromWei(balance, 'ether');

                const option = document.createElement('option');
                option.value = privateKey;

                // Tài khoản đầu tiên là admin
                if (i === 0) {
                    option.textContent = `Admin: ${privateKey.substring(0, 10)}...${privateKey.substring(privateKey.length - 8)} (${parseFloat(balanceInEth).toFixed(2)} ETH)`;
                } else {
                    option.textContent = `User ${i}: ${privateKey.substring(0, 10)}...${privateKey.substring(privateKey.length - 8)} (${parseFloat(balanceInEth).toFixed(2)} ETH)`;
                }

                voterIdSelect.appendChild(option);
            }

            // Thêm event listener cho việc thay đổi tài khoản
            voterIdSelect.addEventListener('change', async function() {
                const selectedPrivateKey = this.value;
                if (selectedPrivateKey) {
                    const account = ganacheWeb3.eth.accounts.privateKeyToAccount(selectedPrivateKey);
                    const balance = await ganacheWeb3.eth.getBalance(account.address);
                    const balanceInEth = ganacheWeb3.utils.fromWei(balance, 'ether');

                } else {
                    accountInfo.style.display = 'none';
                }
            });

            web3 = ganacheWeb3;
            updateNetworkStatus('connected', 'Đã kết nối thành công với Ganache');
            return true;

        } catch (error) {
            console.error('Lỗi khi xử lý tài khoản:', error);
            updateNetworkStatus('error', 'Không thể xử lý thông tin tài khoản');
            return false;
        }
    } catch (error) {
        console.error('Lỗi khởi tạo Web3:', error);
        updateNetworkStatus('error', 'Lỗi kết nối: ' + error.message);
        return false;
    }
}

function updateNetworkStatus(status, message) {
    networkStatus.className = 'network-status ' + status;
    networkStatus.textContent = message;
    networkStatus.style.display = 'block';
}

function setLoading(isLoading) {
    const loginButton = document.querySelector('.btn-login');
    if (isLoading) {
        loginButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
        loginButton.disabled = true;
    } else {
        loginButton.innerHTML = 'Đăng Nhập';
        loginButton.disabled = false;
    }
}

function validateInputs() {
    let isValid = true;
    
    voterIdError.style.display = 'none';
    passwordError.style.display = 'none';
    loginError.style.display = 'none';
    
    if (!voterIdSelect.value) {
        voterIdError.style.display = 'block';
        voterIdSelect.style.borderColor = '#ff5c5c';
        isValid = false;
    }
    
    if (!passwordInput.value.trim()) {
        passwordError.style.display = 'block';
        passwordInput.style.borderColor = '#ff5c5c';
        isValid = false;
    }
    
    return isValid;
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

// Xử lý form đăng nhập
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateInputs()) {
        return;
    }

    try {
        setLoading(true);
        loginError.style.display = 'none';

        const voter_id = voterIdSelect.value;
        const account = web3.eth.accounts.privateKeyToAccount(voter_id);
        const password = passwordInput.value;
        const token = voter_id;

        // Gọi API đăng nhập với voter_id trong cả header và query params
        fetch(`http://127.0.0.1:8000/login?voter_id=${voter_id}&password=${password}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer "${token}"`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    return response.json().then(err => {
                        throw new Error(err.detail || 'Đăng nhập không thành công');
                    });
                }
            })
            .then(data => {
                if (data.role === 'admin') {
                    console.log('Đăng nhập thành công với vai trò:', data.role);
                    localStorage.setItem('jwtTokenAdmin', data.token);
                    localStorage.setItem('selectedAccount', account.address);
                    localStorage.setItem('privateKey', voter_id);
                    localStorage.setItem('userRole', 'admin');
                    
                    // Hiển thị thông báo thành công trước khi chuyển hướng
                    loginError.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
                    loginError.style.color = '#4CAF50';
                    loginError.style.display = 'block';
                    
                    setTimeout(() => {
                        window.location.replace(`http://127.0.0.1:3000/admin.html?Authorization=Bearer ${data.token}`);
                    }, 1000);
                } else {
                    console.log('Đăng nhập thành công với vai trò:', data.role);
                    localStorage.setItem('jwtTokenVoter', data.token);
                    localStorage.setItem('selectedAccount', account.address);
                    localStorage.setItem('privateKey', voter_id);
                    localStorage.setItem('userRole', 'user');
                    
                    // Hiển thị thông báo thành công trước khi chuyển hướng
                    loginError.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
                    loginError.style.color = '#4CAF50';
                    loginError.style.display = 'block';
                    
                    setTimeout(() => {
                        window.location.replace(`http://127.0.0.1:3000/index.html?Authorization=Bearer ${data.token}`);
                    }, 1000);
                } 
            })
            .catch(error => {
                console.error('Lỗi đăng nhập:', error.message);
                loginError.textContent = error.message;
                loginError.style.display = 'block';
                loginError.style.color = '#ff5c5c';
                shakeElement(document.querySelector('.login-container'));
            })
            .finally(() => {
                setLoading(false);
            });

    } catch (error) {
        console.error('Lỗi:', error.message);
        setLoading(false);
        loginError.textContent = `Lỗi: ${error.message}`;
        loginError.style.color = '#ff5c5c';
        loginError.style.display = 'block';
        shakeElement(document.querySelector('.login-container'));
    }
});

// Khởi tạo khi trang được tải
window.addEventListener('load', async () => {
    const success = await initWeb3();
    if (!success) {
        document.querySelector('.btn-login').disabled = true;
    }
});