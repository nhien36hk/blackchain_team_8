/**
 * Controller quản lý hiển thị và tương tác với phần kết quả bầu cử
 */

const { getAllElections, getElectionResults, finalizeElection, publishElectionResults } = require('../services/election-service');

// Khởi tạo controller
function initResultController() {
  console.log("Khởi tạo result controller");
  
  // Tự động load danh sách cuộc bầu cử khi tab được hiển thị
  $('.admin-nav-item[data-section="results-section"]').click(function() {
    loadElectionList();
  });
  
  // Nút tải kết quả bầu cử
  $('#load-election-results').click(function() {
    const electionId = $('#election-select').val();
    
    if (!electionId) {
      alert('Vui lòng chọn một cuộc bầu cử');
      return;
    }
    
    loadElectionResults(electionId);
  });
  
  // Nút cập nhật kết quả
  $('#refreshResults').click(function() {
    const electionId = $('#election-select').val();
    
    if (!electionId) {
      alert('Vui lòng chọn một cuộc bầu cử');
      return;
    }
    
    loadElectionResults(electionId);
  });
  
  // Nút kết thúc cuộc bầu cử
  $('#finalizeElection').click(function() {
    const electionId = $('#election-select').val();
    
    if (!electionId) {
      alert('Vui lòng chọn một cuộc bầu cử');
      return;
    }
    
    if (confirm('Bạn có chắc chắn muốn kết thúc cuộc bầu cử này? Hành động này không thể hoàn tác.')) {
      finalizeElection(electionId)
        .then(function() {
          alert('Đã kết thúc cuộc bầu cử thành công!');
          loadElectionResults(electionId);
        })
        .catch(function(error) {
          alert('Lỗi khi kết thúc cuộc bầu cử: ' + error.message);
        });
    }
  });
  
  // Nút công bố kết quả
  $('#publishResults').click(function() {
    const electionId = $('#election-select').val();
    
    if (!electionId) {
      alert('Vui lòng chọn một cuộc bầu cử');
      return;
    }
    
    if (confirm('Bạn có chắc chắn muốn công bố kết quả chính thức của cuộc bầu cử này?')) {
      publishElectionResults(electionId)
        .then(function() {
          alert('Đã công bố kết quả thành công!');
        })
        .catch(function(error) {
          alert('Lỗi khi công bố kết quả: ' + error.message);
        });
    }
  });
  
  // Xử lý auto refresh
  let refreshInterval = null;
  let timerSeconds = 30;
  
  $('#autoRefreshToggle').change(function() {
    if ($(this).is(':checked')) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
  
  // Hàm bắt đầu auto refresh
  function startAutoRefresh() {
    timerSeconds = 30;
    updateTimerDisplay();
    
    refreshInterval = setInterval(function() {
      timerSeconds--;
      updateTimerDisplay();
      
      if (timerSeconds <= 0) {
        const electionId = $('#election-select').val();
        if (electionId) {
          loadElectionResults(electionId);
        }
        timerSeconds = 30;
      }
    }, 1000);
  }
  
  // Hàm dừng auto refresh
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
  
  // Hàm cập nhật hiển thị đếm ngược
  function updateTimerDisplay() {
    $('#refreshTimer').text(timerSeconds);
  }
  
  // Khởi động auto refresh nếu toggle được bật
  if ($('#autoRefreshToggle').is(':checked')) {
    startAutoRefresh();
  }
}

// Hàm load danh sách cuộc bầu cử
function loadElectionList() {
  console.log("Đang tải danh sách cuộc bầu cử...");
  
  getAllElections()
    .then(function(elections) {
      console.log("Đã lấy danh sách cuộc bầu cử:", elections);
      
      // Xóa options cũ (giữ lại option mặc định)
      $('#election-select option:not(:first-child)').remove();
      
      if (elections.length === 0) {
        $('#election-select').append('<option disabled>Không có cuộc bầu cử nào</option>');
        return;
      }
      
      // Thêm từng cuộc bầu cử vào select
      elections.forEach(function(election) {
        const id = election.id;
        const title = election.title;
        const status = getStatusText(election.status);
        
        $('#election-select').append(`
          <option value="${id}" data-status="${election.status}">${title} (${status})</option>
        `);
      });
    })
    .catch(function(error) {
      console.error("Lỗi khi tải danh sách cuộc bầu cử:", error);
      $('#election-select').append(`<option disabled>Lỗi: ${error.message}</option>`);
    });
}

// Hàm load kết quả của một cuộc bầu cử
function loadElectionResults(electionId) {
  console.log("Đang tải kết quả cuộc bầu cử:", electionId);
  
  // Hiển thị trạng thái đang tải
  $('#results-list').html("<tr><td colspan='5' class='text-center'><i class='fas fa-spinner fa-spin'></i> Đang tải dữ liệu...</td></tr>");
  
  getElectionResults(electionId)
    .then(function(results) {
      console.log("Đã lấy kết quả bầu cử:", results);
      
      // Hiển thị tiêu đề cuộc bầu cử
      const electionTitle = $('#election-select option:selected').text();
      $('#election-title').text(` - ${electionTitle}`);
      
      // Cập nhật thời gian cập nhật
      const now = new Date();
      $('#lastUpdateTime').text(now.toLocaleTimeString('vi-VN'));
      
      // Cập nhật thống kê
      $('#totalVotersCount').text(results.statistics.totalVoters);
      $('#totalVotesCount').text(results.statistics.totalVotes);
      $('#voterTurnout').text(`${results.statistics.turnoutPercentage}%`);
      
      // Xóa kết quả cũ
      $('#results-list').empty();
      
      // Hiển thị danh sách kết quả
      if (results.candidates.length === 0) {
        $('#results-list').html("<tr><td colspan='5' class='text-center'>Chưa có dữ liệu kết quả</td></tr>");
        return;
      }
      
      // Sắp xếp ứng viên theo số phiếu (giảm dần)
      results.candidates.sort((a, b) => b.voteCount - a.voteCount);
      
      // Tính tổng số phiếu
      const totalVotes = results.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
      
      // Hiển thị từng ứng viên
      results.candidates.forEach(function(candidate, index) {
        const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : '0.00';
        
        const row = `
          <tr class="${index === 0 ? 'winner-row' : ''}">
            <td>${index + 1}</td>
            <td>${candidate.name}</td>
            <td>${candidate.party}</td>
            <td>${candidate.voteCount}</td>
            <td>
              <div class="percentage-bar">
                <div class="percentage-value">${percentage}%</div>
                <div class="percentage-fill" style="width: ${percentage}%"></div>
              </div>
            </td>
          </tr>
        `;
        
        $('#results-list').append(row);
      });
      
      // Cập nhật lịch sử bỏ phiếu gần đây
      $('#recent-votes').empty();
      
      if (results.recentVotes && results.recentVotes.length > 0) {
        results.recentVotes.forEach(function(vote) {
          const row = `
            <tr>
              <td>${new Date(vote.timestamp * 1000).toLocaleString('vi-VN')}</td>
              <td>${formatAddress(vote.voter)}</td>
              <td>${vote.candidateName}</td>
            </tr>
          `;
          
          $('#recent-votes').append(row);
        });
      } else {
        $('#recent-votes').html("<tr><td colspan='3' class='text-center'>Chưa có lịch sử bỏ phiếu nào</td></tr>");
      }
      
      // TODO: Render biểu đồ kết quả
      renderResultsChart(results.candidates);
    })
    .catch(function(error) {
      console.error("Lỗi khi tải kết quả bầu cử:", error);
      $('#results-list').html(`<tr><td colspan='5' class='text-center text-danger'>
        <i class='fas fa-exclamation-triangle'></i> Lỗi: ${error.message}</td></tr>`);
    });
}

// Hàm render biểu đồ kết quả
function renderResultsChart(candidates) {
  // TODO: Implement chart rendering
  console.log("Rendering chart for candidates:", candidates);
}

// Hàm lấy text trạng thái cuộc bầu cử
function getStatusText(status) {
  switch(status) {
    case 0: return "Chưa bắt đầu";
    case 1: return "Đang diễn ra";
    case 2: return "Đã kết thúc";
    case 3: return "Đã công bố";
    default: return "Không xác định";
  }
}

// Hàm định dạng địa chỉ ví
function formatAddress(address) {
  if (!address) return "";
  return address.substring(0, 6) + "..." + address.substring(address.length - 4);
}

// Xuất module
module.exports = {
  initResultController,
  loadElectionList,
  loadElectionResults
}; 