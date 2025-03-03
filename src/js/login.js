const loginForm = document.getElementById('loginForm');
const voterIdInput = document.getElementById('voter-id');
const passwordInput = document.getElementById('password');
const voterIdError = document.getElementById('voter-id-error');
const passwordError = document.getElementById('password-error');
const loginError = document.getElementById('login-error');

// Hiệu ứng loading cho nút đăng nhập
function setLoading(isLoading) {
  const loginButton = document.querySelector('.btn-login');
  if (isLoading) {
    loginButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
    loginButton.disabled = true;
    loginButton.style.opacity = '0.8';
  } else {
    loginButton.innerHTML = 'Đăng Nhập';
    loginButton.disabled = false;
    loginButton.style.opacity = '1';
  }
}

// Kiểm tra đầu vào
function validateInputs() {
  let isValid = true;
  
  // Ẩn tất cả thông báo lỗi
  voterIdError.style.display = 'none';
  passwordError.style.display = 'none';
  loginError.style.display = 'none';
  
  // Kiểm tra mã cử tri
  if (!voterIdInput.value.trim()) {
    voterIdError.style.display = 'block';
    voterIdInput.style.borderColor = '#ff5c5c';
    isValid = false;
  } else {
    voterIdInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  }
  
  // Kiểm tra mật khẩu
  if (!passwordInput.value.trim()) {
    passwordError.style.display = 'block';
    passwordInput.style.borderColor = '#ff5c5c';
    isValid = false;
  } else {
    passwordInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  }
  
  return isValid;
}

// Hiệu ứng rung khi lỗi
function shakeElement(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

// Thêm hiệu ứng CSS cho animation rung
const style = document.createElement('style');
style.innerHTML = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  .shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }
`;
document.head.appendChild(style);

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  
  // Kiểm tra đầu vào
  if (!validateInputs()) {
    shakeElement(document.querySelector('.login-container'));
    return;
  }
  
  // Hiển thị trạng thái loading
  setLoading(true);

  const voter_id = voterIdInput.value;
  const password = passwordInput.value;
  const token = voter_id;

  const headers = {
    'method': "GET",
    'Authorization': `Bearer ${token}`,
  };

  fetch(`http://127.0.0.1:8000/login?voter_id=${voter_id}&password=${password}`, { headers })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Đăng nhập không thành công');
    }
  })
  .then(data => {
    if (data.role === 'admin') {
      console.log('Đăng nhập thành công với vai trò:', data.role);
      localStorage.setItem('jwtTokenAdmin', data.token);
      
      // Hiển thị thông báo thành công trước khi chuyển hướng
      loginError.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
      loginError.style.color = '#4CAF50';
      loginError.style.display = 'block';
      
      setTimeout(() => {
        window.location.replace(`http://127.0.0.1:3000/admin.html?Authorization=Bearer ${localStorage.getItem('jwtTokenAdmin')}`);
      }, 1000);
    } else if (data.role === 'user'){
      console.log('Đăng nhập thành công với vai trò:', data.role);
      localStorage.setItem('jwtTokenVoter', data.token);
      
      // Hiển thị thông báo thành công trước khi chuyển hướng
      loginError.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
      loginError.style.color = '#4CAF50';
      loginError.style.display = 'block';
      
      setTimeout(() => {
        window.location.replace(`http://127.0.0.1:3000/index.html?Authorization=Bearer ${localStorage.getItem('jwtTokenVoter')}`);
      }, 1000);
    } else {
      throw new Error('Vai trò người dùng không hợp lệ');
    }
  })
  .catch(error => {
    console.error('Lỗi đăng nhập:', error.message);
    setLoading(false);
    
    // Hiển thị thông báo lỗi
    loginError.textContent = 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin đăng nhập.';
    loginError.style.display = 'block';
    shakeElement(document.querySelector('.login-container'));
  });
});

// Thêm hiệu ứng khi focus vào input
voterIdInput.addEventListener('focus', () => {
  voterIdInput.parentElement.style.boxShadow = 'var(--glow)';
});

voterIdInput.addEventListener('blur', () => {
  voterIdInput.parentElement.style.boxShadow = 'none';
});

passwordInput.addEventListener('focus', () => {
  passwordInput.parentElement.style.boxShadow = 'var(--glow)';
});

passwordInput.addEventListener('blur', () => {
  passwordInput.parentElement.style.boxShadow = 'none';
});

// Xóa thông báo lỗi khi người dùng bắt đầu nhập lại
voterIdInput.addEventListener('input', () => {
  voterIdError.style.display = 'none';
  voterIdInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  loginError.style.display = 'none';
});

passwordInput.addEventListener('input', () => {
  passwordError.style.display = 'none';
  passwordInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  loginError.style.display = 'none';
});
