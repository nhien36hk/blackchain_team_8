# Hệ Thống Bỏ Phiếu Phi Tập Trung Sử Dụng Blockchain Ethereum

#### Hệ thống bỏ phiếu phi tập trung sử dụng Blockchain Ethereum là một giải pháp an toàn và minh bạch để tổ chức các cuộc bầu cử. Tận dụng công nghệ blockchain của Ethereum, hệ thống này đảm bảo hồ sơ bỏ phiếu không thể bị giả mạo, cho phép người dùng bỏ phiếu từ xa trong khi vẫn duy trì tính ẩn danh và ngăn chặn gian lận. Khám phá dự án sáng tạo này để có quy trình bỏ phiếu đáng tin cậy và phi tập trung.
#### For a cool demo of this project watch this [YouTube video](https://www.youtube.com/watch?v=a5CJ70D2P-E).
#### For more details checkout [Project Report](https://github.com/Krish-Depani/Decentralized-Voting-System-Using-Ethereum-Blockchain/blob/main/Project%20Report%20github.pdf).
#### PS: This project is not maintained anymore.

## Tính năng
- Triển khai JWT để xác thực và ủy quyền cử tri an toàn.
- Sử dụng blockchain Ethereum để lưu trữ kết quả bỏ phiếu minh bạch và không thể giả mạo.
- Loại bỏ nhu cầu về trung gian, đảm bảo quy trình bỏ phiếu đáng tin cậy.
- Bảng điều khiển quản trị để quản lý ứng cử viên, thiết lập ngày bỏ phiếu và theo dõi kết quả.
- Giao diện người dùng trực quan để cử tri bỏ phiếu và xem thông tin ứng cử viên.

## Yêu cầu
- Node.js (phiên bản – 18.14.0)
- Metamask
- Python (phiên bản – 3.9)
- FastAPI
- XAMPP với MySQL (cổng – 3306)
- Ganache (môi trường blockchain cục bộ)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge)

## Screenshots

![Login Page](https://github.com/Krish-Depani/Decentralized-Voting-System-Using-Ethereum-Blockchain/blob/main/public/login%20ss.png)

![Admin Page](https://github.com/Krish-Depani/Decentralized-Voting-System-Using-Ethereum-Blockchain/blob/main/public/admin%20ss.png)

![Voter Page](https://github.com/Krish-Depani/Decentralized-Voting-System-Using-Ethereum-Blockchain/blob/main/public/index%20ss.png)

## Cài đặt

1. Mở terminal.

2. Clone repository bằng lệnh
        
        git clone https://github.com/Krish-Depani/Decentralized-Voting-System-Using-Ethereum-Blockchain.git

3. Tải và cài đặt [Ganache](https://trufflesuite.com/ganache/).

4. Tạo workspace có tên <b>developement</b>, trong phần truffle projects, thêm `truffle-config.js` bằng cách nhấp vào nút `ADD PROJECT`.

5. Tải extension [Metamask](https://metamask.io/download/) cho trình duyệt.

6. Tạo ví (nếu bạn chưa có), sau đó nhập tài khoản từ Ganache.

7. Thêm mạng vào Metamask. (Tên mạng - Localhost 7575, RPC URl - http://localhost:7545, Chain ID - 1337, Ký hiệu tiền tệ - ETH)

8. Cài đặt và cấu hình XAMPP:
   - Tải và cài đặt [XAMPP](https://www.apachefriends.org/download.html)
   - Khởi động XAMPP Control Panel
   - Bắt đầu các dịch vụ Apache và MySQL
   - Mở phpMyAdmin bằng cách truy cập http://localhost/phpmyadmin

9. Tạo cơ sở dữ liệu trong phpMyAdmin:
   - Tạo cơ sở dữ liệu mới có tên <b>voter_db</b>
   - Trong cơ sở dữ liệu đã tạo, tạo bảng mới có tên <b>voters</b> với định dạng sau:

           CREATE TABLE voters (
           voter_id VARCHAR(36) PRIMARY KEY NOT NULL,
           role ENUM('admin', 'user') NOT NULL,
           password VARCHAR(255) NOT NULL
           );

10. Thêm dữ liệu mẫu vào bảng voters:
    - Thêm tài khoản admin:
      ```sql
      INSERT INTO voters (voter_id, role, password) VALUES ('admin123', 'admin', 'admin123');
      ```
    - Thêm tài khoản người dùng:
      ```sql
      INSERT INTO voters (voter_id, role, password) VALUES ('user123', 'user', 'user123');
      ```

11. Cập nhật thông tin kết nối cơ sở dữ liệu trong file `./Database_API/.env`:
    ```
        MYSQL_USER="root"
        MYSQL_PASSWORD=""
        MYSQL_HOST="localhost"
        MYSQL_DB="voter_db"
        SECRET_KEY="d2b861a623b1d0e89f7c91c313bce1db34fbce8356ca80cf38b72e4c5a832ed5f0fa7136ef0ed5c32641308daa88c29c108d85835afcf37e5385c8e2c4cacee6"
    ```

12. Cài đặt truffle toàn cục
    
        npm install -g truffle

13. Đi đến thư mục gốc của repo và cài đặt các module node

        npm install

14. Cài đặt các thư viện phụ thuộc của Python

        pip install fastapi mysql-connector-python pydantic python-dotenv uvicorn uvicorn[standard] PyJWT

15. Cài đặt http-server (nếu chưa có)

        npm install --save-dev http-server

## Sử dụng

1. Mở terminal tại thư mục dự án

2. Mở Ganache và workspace <b>development</b>.

3. Mở terminal trong thư mục gốc của dự án và chạy lệnh

        truffle console
   sau đó biên dịch các hợp đồng thông minh với lệnh

        compile
   thoát khỏi truffle console

4. Đóng gói app.js với browserify
    
        browserify ./src/js/app.js -o ./src/dist/app.bundle.js

5. Khởi động máy chủ node
    
        node index.js

6. Điều hướng đến thư mục `Database_API` trong một terminal khác
    
        cd Database_API
    sau đó khởi động máy chủ cơ sở dữ liệu bằng lệnh sau

        uvicorn main:app --reload --host 127.0.0.1

7. Trong một terminal mới, triển khai hợp đồng truffle vào blockchain cục bộ
    
        truffle migrate --reset

8. Đảm bảo XAMPP đang chạy với các dịch vụ Apache và MySQL hoạt động

Bạn đã hoàn tất! Ứng dụng Bỏ phiếu sẽ hoạt động tại http://localhost:3000/.

## Xử lý sự cố

1. **Lỗi kết nối Metamask**:
   - Đảm bảo Metamask đã được cài đặt và mở khóa
   - Kiểm tra cấu hình mạng trong Metamask (RPC URL: http://localhost:7545, Chain ID: 1337)
   - Làm mới trang và thử lại

2. **Lỗi kết nối cơ sở dữ liệu**:
   - Kiểm tra XAMPP đang chạy và dịch vụ MySQL đang hoạt động
   - Xác minh thông tin kết nối trong file `.env` là chính xác
   - Kiểm tra cơ sở dữ liệu và bảng đã được tạo đúng cách

3. **Lỗi hợp đồng thông minh**:
   - Đảm bảo Ganache đang chạy và có sẵn các tài khoản
   - Thử triển khai lại hợp đồng với `truffle migrate --reset`
   - Kiểm tra địa chỉ hợp đồng trong file `app.js` đã được cập nhật

4. **Lỗi "Out of Gas"**:
   - Kiểm tra tài khoản Metamask có đủ ETH
   - Đảm bảo mạng được cấu hình đúng
   - Thử lại với một tài khoản khác từ Ganache

## Cấu trúc mã

    ├── blockchain-voting-dapp            # Thư mục gốc của dự án.
        ├── build                         # Thư mục chứa các artifact hợp đồng đã biên dịch.
        |   └── contracts                 
        |       ├── Migrations.json       
        |       └── Voting.json           
        ├── contracts                     # Thư mục chứa mã nguồn hợp đồng thông minh.
        |   ├── 2_deploy_contracts.js     
        |   ├── Migrations.sol            
        |   └── Voting.sol                
        ├── Database_API                  # Mã API cho giao tiếp cơ sở dữ liệu.
        |   └── main.py                   
        ├── migrations                    # Script triển khai hợp đồng Ethereum.
        |   └── 1_initial_migration.js    
        ├── node_modules                  # Module và phụ thuộc Node.js.
        ├── public                        # Tài sản công khai như favicon.
        |   └── favicon.ico               
        ├── src                           
        |   ├── assets                    # Hình ảnh dự án.
        |   |   └── eth5.jpg              
        |   ├── css                       # Stylesheet CSS.
        |   |   ├── admin.css             
        |   |   ├── index.css             
        |   |   └── login.css             
        |   ├── dist                      # Bundle JavaScript đã biên dịch.
        |   |   ├── app.bundle.js         
        |   |   └── login.bundle.js       
        |   ├── html                      # Template HTML.
        |   |   ├── admin.html            
        |   |   ├── index.html            
        |   |   └── login.html            
        |   └── js                        # File logic JavaScript.
        |       ├── app.js                
        |       └── login.js              
        ├── index.js                      # Điểm vào chính cho ứng dụng Node.js.
        ├── package.json                  # Cấu hình gói Node.js.
        ├── package-lock.json             # Lockfile cho phụ thuộc gói.
        ├── README.md                     # Tài liệu dự án.
        └── truffle-config.js             # File cấu hình Truffle.

## Giấy phép

Mã trong repository này được cấp phép theo Giấy phép MIT. Điều này có nghĩa là bạn được tự do sử dụng, sửa đổi và phân phối mã, miễn là bạn bao gồm thông báo bản quyền và giấy phép gốc.

## Nếu bạn thích dự án này, hãy cho nó một 🌟.
## Cảm ơn bạn 😊.
