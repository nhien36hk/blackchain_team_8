/**
 * Controller quản lý hiển thị và tương tác với phần ứng cử viên
 */

const { getAllCandidates, addCandidate, updateCandidate, deleteCandidate } = require('../services/candidate-service');

// Khởi tạo controller
function initCandidateController() {
  console.log("Khởi tạo candidate controller");
  
  // Gắn sự kiện cho nút thêm ứng cử viên
  $('#addCandidate').click(function() {
    console.log("Đã nhấn nút thêm ứng cử viên");
    
    var nameCandidate = $('#name').val();
    var partyCandidate = $('#party').val();
    
    if (!nameCandidate || !partyCandidate) {
      $('#Aday').html("<p style='color: var(--warning-color);'>Vui lòng nhập đầy đủ tên và đảng phái</p>");
      $('#Aday').show();
      return;
    }
    
    addCandidate(nameCandidate, partyCandidate)
      .then(function() {
        $('#Aday').html("<p style='color: var(--success-color);'>Đã thêm ứng cử viên thành công!</p>");
        $('#Aday').show();
        
        // Reset form
        $('#name').val('');
        $('#party').val('');
        
        // Làm mới danh sách ứng cử viên sau 1 giây
        setTimeout(function() {
          loadCandidateList();
        }, 1000);
      })
      .catch(function(error) {
        $('#Aday').html("<p style='color: var(--error-color);'>Lỗi: " + error.message + "</p>");
        $('#Aday').show();
      });
  });
  
  // Tự động load danh sách ứng cử viên khi tab được hiển thị
  $('.admin-nav-item[data-section="candidates-section"]').click(function() {
    loadCandidateList();
  });
  
  // Luôn tải danh sách ứng cử viên khi khởi tạo controller
  loadCandidateList();
}

// Hàm load danh sách ứng cử viên
function loadCandidateList() {
  console.log("Đang tải danh sách ứng cử viên...");
  
  // Hiển thị trạng thái đang tải
  $('#candidate-list').html("<tr><td colspan='5' class='text-center'><i class='fas fa-spinner fa-spin'></i> Đang tải dữ liệu...</td></tr>");
  
  getAllCandidates()
    .then(function(candidates) {
      console.log("Đã lấy danh sách ứng cử viên:", candidates);
      
      if (candidates.length === 0) {
        $('#candidate-list').html("<tr><td colspan='5' class='text-center'>Chưa có ứng cử viên nào</td></tr>");
        return;
      }
      
      // Xóa nội dung cũ
      $('#candidate-list').empty();
      
      // Hiển thị từng ứng cử viên
      candidates.forEach(function(candidate) {
        const id = candidate[0];
        const name = candidate[1];
        const party = candidate[2];
        const voteCount = candidate[3];
        
        const row = `
          <tr data-id="${id}">
            <td>${id}</td>
            <td class="candidate-name">${name}</td>
            <td class="candidate-party">${party}</td>
            <td>${voteCount}</td>
            <td class="actions">
              <button class="btn-edit btn-outline btn" data-id="${id}" data-name="${name}" data-party="${party}">
                <i class="fas fa-edit"></i> Sửa
              </button>
              <button class="btn-delete btn-danger btn" data-id="${id}">
                <i class="fas fa-trash"></i> Xóa
              </button>
            </td>
          </tr>
          <tr class="edit-row" id="edit-form-${id}" style="display: none;">
            <td colspan="5">
              <div class="edit-form">
                <h3>Chỉnh sửa ứng cử viên</h3>
                <div class="form-row">
                  <div class="form-col">
                    <div class="form-group">
                      <label class="form-label" for="edit-name-${id}">Họ và tên</label>
                      <input id="edit-name-${id}" type="text" class="form-control" value="${name}">
                    </div>
                  </div>
                  <div class="form-col">
                    <div class="form-group">
                      <label class="form-label" for="edit-party-${id}">Đảng phái</label>
                      <input id="edit-party-${id}" type="text" class="form-control" value="${party}">
                    </div>
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn-save btn-success btn" data-id="${id}">
                    <i class="fas fa-save"></i> Lưu
                  </button>
                  <button class="btn-cancel btn-outline btn" data-id="${id}">
                    <i class="fas fa-times"></i> Hủy
                  </button>
                </div>
                <div id="update-status-${id}" class="status-message" style="display: none;"></div>
              </div>
            </td>
          </tr>
        `;
        
        $('#candidate-list').append(row);
      });
      
      // Gắn sự kiện cho các nút sửa và xóa
      attachEventHandlers();
    })
    .catch(function(error) {
      console.error("Lỗi khi tải danh sách ứng cử viên:", error);
      $('#candidate-list').html(`<tr><td colspan='5' class='text-center text-danger'>
        <i class='fas fa-exclamation-triangle'></i> Lỗi: ${error.message}</td></tr>`);
    });
}

// Gắn sự kiện cho các nút trong danh sách
function attachEventHandlers() {
  // Nút sửa - hiển thị form sửa
  $('.btn-edit').click(function() {
    const id = $(this).data('id');
    $(`#edit-form-${id}`).toggle();
  });
  
  // Nút hủy - ẩn form sửa
  $('.btn-cancel').click(function() {
    const id = $(this).data('id');
    $(`#edit-form-${id}`).hide();
  });
  
  // Nút lưu - cập nhật thông tin
  $('.btn-save').click(function() {
    const id = $(this).data('id');
    const newName = $(`#edit-name-${id}`).val();
    const newParty = $(`#edit-party-${id}`).val();
    
    if (!newName || !newParty) {
      $(`#update-status-${id}`).html("<p style='color: var(--warning-color);'>Vui lòng nhập đầy đủ thông tin</p>");
      $(`#update-status-${id}`).show();
      return;
    }
    
    $(`#update-status-${id}`).html("<p style='color: white;'>Đang cập nhật thông tin ứng cử viên, vui lòng đợi...</p>");
    $(`#update-status-${id}`).show();
    
    updateCandidate(id, newName, newParty)
      .then(function() {
        $(`#update-status-${id}`).html("<p style='color: var(--success-color);'>Cập nhật thành công!</p>");
        
        // Ẩn form sau 1 giây
        setTimeout(function() {
          $(`#edit-form-${id}`).hide();
          // Làm mới danh sách
          loadCandidateList();
        }, 1000);
      })
      .catch(function(error) {
        $(`#update-status-${id}`).html(`<p style='color: var(--error-color);'>Lỗi: ${error.message}</p>`);
      });
  });
  
  // Nút xóa - xóa ứng cử viên
  $('.btn-delete').click(function() {
    const id = $(this).data('id');
    
    if (confirm('Bạn có chắc chắn muốn xóa ứng cử viên này?')) {
      // Thêm dòng hiển thị trạng thái xóa
      $(this).closest('tr').after(`
        <tr id="delete-status-row-${id}">
          <td colspan="5">
            <div id="delete-status-${id}" class="status-message">
              <p style='color: white;'>Đang xóa ứng cử viên, vui lòng đợi...</p>
            </div>
          </td>
        </tr>
      `);
      
      deleteCandidate(id)
        .then(function() {
          $(`#delete-status-${id}`).html("<p style='color: var(--success-color);'>Xóa thành công!</p>");
          
          // Làm mới danh sách sau 1 giây
          setTimeout(function() {
            loadCandidateList();
          }, 1000);
        })
        .catch(function(error) {
          $(`#delete-status-${id}`).html(`<p style='color: var(--error-color);'>Lỗi: ${error.message}</p>`);
          
          // Xóa dòng thông báo sau 3 giây
          setTimeout(function() {
            $(`#delete-status-row-${id}`).remove();
          }, 3000);
        });
    }
  });
}

// Xuất module
module.exports = {
  initCandidateController,
  loadCandidateList
}; 