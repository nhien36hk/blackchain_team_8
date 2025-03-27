// Import ứng dụng đã được tách module
console.log("Bắt đầu tải app.js - Chuẩn bị khởi tạo App");
try {
  window.App = require('./app-init');
  console.log("Đã khởi tạo App thành công:", window.App ? "OK" : "NULL");

  // Import và export CommissionController cho trang commission.html
  window.CommissionController = require('./controllers/commission-controller');
  console.log("Đã export CommissionController:", window.CommissionController ? "OK" : "NULL");
  
  // Import và export ResultController cho trang admin.html
  const ResultController = require('./controllers/result-controller');
  window.viewElectionResults = ResultController.viewElectionResults;
  window.initResultController = ResultController.initResultController;
  window.loadElectionList = ResultController.loadElectionList;
  console.log("Đã export ResultController functions:", window.viewElectionResults ? "OK" : "NULL");
  
  // Kiểm tra các hàm quan trọng đã được export
  console.log("Kiểm tra các hàm đã export:");
  console.log("- getCountCandidates:", typeof window.App.getCountCandidates === 'function' ? "OK" : "MISSING");
  console.log("- getCandidate:", typeof window.App.getCandidate === 'function' ? "OK" : "MISSING");
  console.log("- checkVote:", typeof window.App.checkVote === 'function' ? "OK" : "MISSING");
  console.log("- vote:", typeof window.App.vote === 'function' ? "OK" : "MISSING");
  
  // Thêm global error handler để bắt lỗi Promise không được xử lý
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Hiển thị thông báo lỗi thân thiện cho người dùng (nếu cần)
    if (document.getElementById('msg')) {
      document.getElementById('msg').innerHTML = "<p style='color: red;'>Đã xảy ra lỗi: " + event.reason.message + "</p>";
    }
  });
  
  console.log("Đã thiết lập xử lý lỗi global");
} catch (error) {
  console.error("Lỗi khi import app-init.js:", error);
  
  // Hiển thị thông báo lỗi cho người dùng
  document.addEventListener('DOMContentLoaded', function() {
    document.body.innerHTML = "<div style='text-align: center; margin-top: 50px;'>" +
      "<h2 style='color: red;'>Lỗi khi tải ứng dụng</h2>" +
      "<p>Đã xảy ra lỗi khi tải ứng dụng: " + error.message + "</p>" +
      "<p>Vui lòng làm mới trang hoặc liên hệ với quản trị viên.</p>" +
      "<button onclick='location.reload()'>Làm mới trang</button>" +
      "</div>";
  });
}