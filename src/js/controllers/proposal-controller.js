/**
 * Controller quản lý hiển thị và tương tác với phần đề xuất bầu cử
 */

const { createProposal, getAllProposals, withdrawProposal } = require('../services/proposal-service');

// Khởi tạo controller
function initProposalController() {
  console.log("Khởi tạo proposal controller");
  
  // Gắn sự kiện cho nút tạo đề xuất bầu cử
  $('#createProposal').click(function() {
    console.log("Đã nhấn nút tạo đề xuất");
    
    var title = $('#proposal-title').val();
    var description = $('#proposal-description').val();
    var startDate = Date.parse($('#proposal-start-date').val())/1000;
    var endDate = Date.parse($('#proposal-end-date').val())/1000;
    
    if (!title || !description || isNaN(startDate) || isNaN(endDate)) {
      $('#proposalStatus').html("<p style='color: var(--warning-color);'>Vui lòng nhập đầy đủ thông tin!</p>");
      $('#proposalStatus').show();
      return;
    }
    
    if (startDate >= endDate) {
      $('#proposalStatus').html("<p style='color: var(--warning-color);'>Thời gian kết thúc phải sau thời gian bắt đầu!</p>");
      $('#proposalStatus').show();
      return;
    }
    
    $('#proposalStatus').html("<p style='color: white;'>Đang gửi đề xuất, vui lòng đợi...</p>");
    $('#proposalStatus').show();
    
    createProposal(title, description, startDate, endDate)
      .then(function() {
        $('#proposalStatus').html("<p style='color: var(--success-color);'>Đã gửi đề xuất thành công!</p>");
        
        // Reset form
        $('#proposal-title').val('');
        $('#proposal-description').val('');
        $('#proposal-start-date').val('');
        $('#proposal-end-date').val('');
        
        // Làm mới danh sách đề xuất sau 1 giây
        setTimeout(function() {
          loadProposalList();
        }, 1000);
      })
      .catch(function(error) {
        $('#proposalStatus').html("<p style='color: var(--error-color);'>Lỗi: " + error.message + "</p>");
      });
  });
  
  // Tự động load danh sách đề xuất khi tab được hiển thị
  $('.admin-nav-item[data-section="proposals-section"]').click(function() {
    loadProposalList();
  });
  
  // Navigation giữa các tab
  $('.admin-nav-item').click(function() {
    const targetSection = $(this).data('section');
    
    // Ẩn tất cả các section
    $('.content-section').hide();
    
    // Hiển thị section được chọn
    $('#' + targetSection).show();
    
    // Đánh dấu tab hiện tại
    $('.admin-nav-item').removeClass('active');
    $(this).addClass('active');
  });
  
  // Mặc định hiển thị tab ứng viên khi load trang
  $('#candidates-section').show();
  $('.admin-nav-item[data-section="candidates-section"]').addClass('active');
}

// Hàm load danh sách đề xuất
function loadProposalList() {
  console.log("Đang tải danh sách đề xuất...");
  
  // Hiển thị trạng thái đang tải
  $('#proposal-list').html("<tr><td colspan='5' class='text-center'><i class='fas fa-spinner fa-spin'></i> Đang tải dữ liệu...</td></tr>");
  
  getAllProposals()
    .then(function(proposals) {
      console.log("Đã lấy danh sách đề xuất:", proposals);
      
      if (proposals.length === 0) {
        $('#proposal-list').html("<tr><td colspan='5' class='text-center'>Chưa có đề xuất nào</td></tr>");
        return;
      }
      
      // Xóa nội dung cũ
      $('#proposal-list').empty();
      
      // Hiển thị từng đề xuất
      proposals.forEach(function(proposal) {
        const id = proposal.id;
        const title = proposal.title;
        const startDate = new Date(proposal.startDate * 1000).toLocaleString('vi-VN');
        const endDate = new Date(proposal.endDate * 1000).toLocaleString('vi-VN');
        const status = getStatusText(proposal.status);
        const statusClass = getStatusClass(proposal.status);
        
        const row = `
          <tr data-id="${id}">
            <td>${id}</td>
            <td>${title}</td>
            <td>${startDate} - ${endDate}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td class="actions">
              ${proposal.status === 0 ? `
                <button class="btn-withdraw btn-outline btn" data-id="${id}">
                  <i class="fas fa-undo"></i> Rút lại
                </button>
                <button class="btn-view btn-outline btn" data-id="${id}">
                  <i class="fas fa-eye"></i> Chi tiết
                </button>
              ` : `
                <button class="btn-view btn-outline btn" data-id="${id}">
                  <i class="fas fa-eye"></i> Chi tiết
                </button>
              `}
            </td>
          </tr>
        `;
        
        $('#proposal-list').append(row);
      });
      
      // Gắn sự kiện cho các nút
      attachEventHandlers();
    })
    .catch(function(error) {
      console.error("Lỗi khi tải danh sách đề xuất:", error);
      $('#proposal-list').html(`<tr><td colspan='5' class='text-center text-danger'>
        <i class='fas fa-exclamation-triangle'></i> Lỗi: ${error.message}</td></tr>`);
    });
}

// Hàm lấy text trạng thái
function getStatusText(status) {
  switch(status) {
    case 0: return "Đang chờ phê duyệt";
    case 1: return "Đã phê duyệt";
    case 2: return "Đã từ chối";
    case 3: return "Đã rút lại";
    default: return "Không xác định";
  }
}

// Hàm lấy class CSS cho trạng thái
function getStatusClass(status) {
  switch(status) {
    case 0: return "status-pending";
    case 1: return "status-approved";
    case 2: return "status-rejected";
    case 3: return "status-withdrawn";
    default: return "status-unknown";
  }
}

// Gắn sự kiện cho các nút trong danh sách
function attachEventHandlers() {
  // Nút rút lại đề xuất
  $('.btn-withdraw').click(function() {
    const id = $(this).data('id');
    
    if (confirm('Bạn có chắc chắn muốn rút lại đề xuất này?')) {
      // Thêm dòng hiển thị trạng thái
      $(this).closest('tr').after(`
        <tr id="withdraw-status-row-${id}">
          <td colspan="5">
            <div id="withdraw-status-${id}" class="status-message">
              <p style='color: white;'>Đang rút lại đề xuất, vui lòng đợi...</p>
            </div>
          </td>
        </tr>
      `);
      
      withdrawProposal(id)
        .then(function() {
          $(`#withdraw-status-${id}`).html("<p style='color: var(--success-color);'>Đã rút lại đề xuất thành công!</p>");
          
          // Làm mới danh sách sau 1 giây
          setTimeout(function() {
            loadProposalList();
          }, 1000);
        })
        .catch(function(error) {
          $(`#withdraw-status-${id}`).html(`<p style='color: var(--error-color);'>Lỗi: ${error.message}</p>`);
          
          // Xóa dòng thông báo sau 3 giây
          setTimeout(function() {
            $(`#withdraw-status-row-${id}`).remove();
          }, 3000);
        });
    }
  });
  
  // Nút xem chi tiết
  $('.btn-view').click(function() {
    const id = $(this).data('id');
    alert("Chức năng xem chi tiết đề xuất sẽ được phát triển sau.");
    // TODO: Implement proposal detail view
  });
}

// Xuất module
module.exports = {
  initProposalController,
  loadProposalList
}; 