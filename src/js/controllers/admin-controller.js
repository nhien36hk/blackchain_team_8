/**
 * Controller quản lý trang admin
 */

const { setDates } = require('../services/date-service');
const { vote } = require('../services/voting-service');
const { initCandidateController } = require('./candidate-controller');
const { initProposalController } = require('./proposal-controller');
const { initResultController } = require('./result-controller');

// Khởi tạo controller cho trang admin
function initAdminController() {
  console.log("Khởi tạo admin controller");
  
  // Khởi tạo controller cho ứng cử viên
  initCandidateController();
  
  // Khởi tạo controller cho đề xuất bầu cử
  initProposalController();
  
  // Khởi tạo controller cho kết quả bầu cử
  initResultController();
  
  // Xử lý thiết lập ngày
  $('#addDate').click(function() {
    var startDate = Date.parse(document.getElementById("startDate").value)/1000;
    var endDate = Date.parse(document.getElementById("endDate").value)/1000;
    
    setDates(startDate, endDate)
      .then(function() {
        $('#Aday').html("<p style='color: white;'>Đã thiết lập ngày bỏ phiếu thành công! Đang làm mới trang...</p>");
        $('#Aday').show();
        
        // Làm mới trang sau 2 giây
        setTimeout(function() {
          window.location.reload();
        }, 2000);
      })
      .catch(function(error) {
        $('#Aday').html("<p style='color: red;'>Lỗi: " + error.message + "</p>");
        $('#Aday').show();
      });
  });
  
  // Xử lý bỏ phiếu
  $('#voteButton').click(function() {
    var candidateID = $("input[name='candidate']:checked").val();
    
    vote(candidateID)
      .then(function() {
        $("#voteButton").attr("disabled", true);
        $("#msg").html("<p style='color: var(--accent-color);'>Đã bỏ phiếu thành công! Đang làm mới trang...</p>");
        
        // Làm mới trang sau 2 giây
        setTimeout(function() {
          window.location.reload();
        }, 2000);
      })
      .catch(function(error) {
        $("#msg").html("<p style='color: red;'>Lỗi: " + error.message + "</p>");
      });
  });
}

// Xuất module
module.exports = {
  initAdminController
}; 