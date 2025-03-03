from web3 import Web3

# Kết nối với Ganache
ganache_url = "http://127.0.0.1:7545"  # RPC của Ganache
web3 = Web3(Web3.HTTPProvider(ganache_url))

# Kiểm tra kết nối
if web3.is_connected():
    print("✅ Đã kết nối với Ganache!")
else:
    print("❌ Kết nối thất bại!")
    exit()

# Lấy danh sách tài khoản từ Ganache
accounts = web3.eth.accounts  # <<--- Thêm dòng này để định nghĩa biến accounts

# Chọn 2 tài khoản trong danh sách
sender = accounts[0]  # Người gửi
receiver = accounts[1]  # Người nhận

# Kiểm tra số dư trước khi gửi
print(f"Số dư ban đầu của {sender}: {web3.eth.get_balance(sender)} wei")
print(f"Số dư ban đầu của {receiver}: {web3.eth.get_balance(receiver)} wei")

# Tạo giao dịch
tx = {
    'from': sender,
    'to': receiver,
    'value': web3.to_wei(0.1, 'ether'),  # Chuyển 0.1 ETH
    'gas': 21000,
    'gasPrice': web3.to_wei(50, 'gwei'),
    'nonce': web3.eth.get_transaction_count(sender)
}

# Ký giao dịch (Vì Ganache có sẵn private key, không cần nhập tay)
tx_hash = web3.eth.send_transaction(tx)

# Hiển thị kết quả
print(f"✅ Giao dịch đã gửi, hash: {tx_hash.hex()}")
