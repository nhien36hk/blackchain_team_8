/**
 * Controller quản lý trang chủ (index) cho cử tri
 */

const { vote, hasVoted, getVotingHistory } = require('../services/voting-service');
const { getActiveElections, getElectionDetails, getElectionCandidates } = require('../services/election-service');

// Khởi tạo controller cho trang chủ
function initIndexController() {
  console.log("Khởi tạo index controller");
  
  // Biến lưu trữ cuộc bầu cử hiện tại được chọn
  let currentElection = null;
  
  // Các thành phần DOM
  const $electionsSection = $('.elections-section');
  const $electionsGrid = $('#elections-container');
  const $selectedElectionSection = $('#selected-election-section');
  const $candidatesSection = $('#candidates-section');
  const $voteSection = $('#vote-section');
  const $historySection = $('#history-section');
  const $loadingElections = $('#elections-loading');
  const $noElectionsMessage = $('#no-elections');
  
  // Khởi tạo khi tải trang
  function initialize() {
    // Ẩn tất cả các section trừ elections section
    $selectedElectionSection.hide();
    $candidatesSection.hide();
    $voteSection.hide();
    $historySection.hide();
    $electionsSection.show();
    
    // Hiển thị loading khi tải danh sách cuộc bầu cử
    $loadingElections.show();
    $noElectionsMessage.hide();
    $electionsGrid.hide();
    
    // Tải danh sách cuộc bầu cử
    loadElections();
    
    // Tải lịch sử bỏ phiếu của cử tri
    loadVotingHistory();
    
    // Đăng ký các sự kiện
    registerEvents();
  }
  
  // Tải danh sách cuộc bầu cử
  async function loadElections() {
    try {
      // Lấy danh sách cuộc bầu cử từ service
      const activeElections = await getActiveElections();
      
      // Nếu không có cuộc bầu cử nào
      if (activeElections.length === 0) {
        $loadingElections.hide();
        $noElectionsMessage.show();
        return;
      }
      
      // Xóa nội dung cũ
      $electionsGrid.empty();
      
      // Hiển thị từng cuộc bầu cử
      for (const election of activeElections) {
        renderElectionCard(election.id, election);
      }
      
      // Hiển thị grid, ẩn loading và no elections message
      $loadingElections.hide();
      $noElectionsMessage.hide();
      $electionsGrid.show();
    } catch (error) {
      console.error("Lỗi khi tải danh sách cuộc bầu cử:", error);
      $loadingElections.hide();
      $noElectionsMessage.find('p').text('Đã xảy ra lỗi khi tải danh sách cuộc bầu cử!');
      $noElectionsMessage.show();
    }
  }
  
  // Hiển thị thẻ cuộc bầu cử
  function renderElectionCard(id, electionData) {
    // Lấy thời gian hiện tại dưới dạng UNIX timestamp (giây)
    const now = Math.floor(Date.now() / 1000);
    
    // Xử lý startTime và endTime
    let startTime, endTime;
    
    // Kiểm tra nếu startTime và endTime là chuỗi đã được định dạng (không phải số)
    if (typeof electionData.startTime === 'string' && isNaN(Date.parse(electionData.startTime))) {
      // Nếu đã là chuỗi định dạng theo locale, giữ nguyên để hiển thị
      console.log("startTime là chuỗi đã định dạng:", electionData.startTime);
      // Cố gắng trích xuất timestamp từ đối tượng gốc nếu có
      startTime = electionData._startTime || 0;
    } else {
      // Nếu là timestamp hoặc chuỗi có thể chuyển thành Date
      startTime = typeof electionData.startTime === 'string' ? 
        (electionData.startTime.match(/^\d+$/) ? parseInt(electionData.startTime) : Math.floor(new Date(electionData.startTime).getTime() / 1000)) : 
        parseInt(electionData.startTime || 0);
    }
    
    if (typeof electionData.endTime === 'string' && isNaN(Date.parse(electionData.endTime))) {
      // Nếu đã là chuỗi định dạng theo locale, giữ nguyên để hiển thị
      console.log("endTime là chuỗi đã định dạng:", electionData.endTime);
      // Cố gắng trích xuất timestamp từ đối tượng gốc nếu có
      endTime = electionData._endTime || 0;
    } else {
      // Nếu là timestamp hoặc chuỗi có thể chuyển thành Date
      endTime = typeof electionData.endTime === 'string' ? 
        (electionData.endTime.match(/^\d+$/) ? parseInt(electionData.endTime) : Math.floor(new Date(electionData.endTime).getTime() / 1000)) : 
        parseInt(electionData.endTime || 0);
    }
    
    // Log để debug
    console.log("Thời gian hiện tại (timestamp):", now);
    console.log("Thời gian hiện tại:", new Date(now * 1000).toLocaleString('vi-VN'));
    console.log("Thời gian bắt đầu (timestamp):", startTime);
    console.log("Thời gian bắt đầu hiển thị:", electionData.startTime);
    console.log("Thời gian kết thúc (timestamp):", endTime);
    console.log("Thời gian kết thúc hiển thị:", electionData.endTime);
    
    // Xác định trạng thái cuộc bầu cử
    let statusClass, statusText;
    
    // Sử dụng timestamp để so sánh
    if (now < startTime) {
      statusClass = 'status-pending';
      statusText = 'Sắp diễn ra';
    } else if (now >= startTime && now <= endTime) {
      statusClass = 'status-active';
      statusText = 'Đang diễn ra';
    } else {
      statusClass = 'status-ended';
      statusText = 'Đã kết thúc';
    }
    
    // Tạo thẻ HTML cho cuộc bầu cử
    const electionCard = `
      <div class="election-card" data-id="${id}">
        <div class="election-card-header">
          <h3 class="election-card-title">${electionData.name}</h3>
          <span class="election-card-status ${statusClass}">${statusText}</span>
        </div>
        <div class="election-card-content">
          <p class="election-card-description">${electionData.description}</p>
          <div class="election-card-time">
            <i class="fas fa-calendar-alt"></i>
            <span>Thời gian: ${electionData.startTime} - ${electionData.endTime}</span>
          </div>
        </div>
        <div class="election-card-footer">
          <div class="election-card-participants">
            <i class="fas fa-users"></i>
            <span>${electionData.candidateCount} ứng cử viên</span>
          </div>
          <div class="election-card-action">
            <span>Tham gia</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>
      </div>
    `;
    
    // Thêm vào grid
    $electionsGrid.append(electionCard);
  }
  
  // Đăng ký các sự kiện
  function registerEvents() {
    // Sự kiện khi chọn một cuộc bầu cử
    $(document).on('click', '.election-card', function() {
      const electionId = $(this).data('id');
      selectElection(electionId);
    });
    
    // Sự kiện khi chọn ứng cử viên
    $(document).on('change', 'input[name="candidate"]', function() {
      const candidateId = $('input[name="candidate"]:checked').val();
      if (candidateId) {
        updateSelectedCandidate(candidateId);
        $('#voteButton').prop('disabled', false);
      } else {
        $('#voteButton').prop('disabled', true);
      }
    });
    
    // Sự kiện khi nhấn nút bỏ phiếu
    $('#voteButton').click(function() {
      const candidateId = $('input[name="candidate"]:checked').val();
      if (candidateId && currentElection) {
        castVote(currentElection, candidateId);
      }
    });
    
    // Sự kiện khi nhấn nút chọn cuộc bầu cử khác
    $('#change-election').click(function() {
      // Ẩn các section hiện tại
      $selectedElectionSection.hide();
      $candidatesSection.hide();
      $voteSection.hide();
      
      // Hiển thị lại danh sách cuộc bầu cử
      $electionsSection.show();
      
      // Reset cuộc bầu cử hiện tại
      currentElection = null;
    });
  }
  
  // Chọn một cuộc bầu cử
  async function selectElection(electionId) {
    try {
      // Lưu ID cuộc bầu cử hiện tại
      currentElection = electionId;
      
      // Lấy thông tin chi tiết về cuộc bầu cử
      const electionDetails = await getElectionDetails(electionId);
      
      // Kiểm tra xem người dùng đã bỏ phiếu chưa
      const hasVotedResult = await hasVoted(electionId);
      
      // Cập nhật thông tin cuộc bầu cử đã chọn
      updateSelectedElectionInfo(electionId, electionDetails);
      
      // Tải danh sách ứng cử viên của cuộc bầu cử
      await loadCandidates(electionId, electionDetails.candidates);
      
      // Ẩn danh sách cuộc bầu cử
      $electionsSection.hide();
      
      // Hiển thị thông tin cuộc bầu cử đã chọn
      $selectedElectionSection.show();
      $candidatesSection.show();
      
      // Nếu người dùng chưa bỏ phiếu, hiển thị phần bỏ phiếu
      if (!hasVotedResult) {
        $voteSection.show();
        $('#msg').empty();
      } else {
        $voteSection.hide();
        $('#msg').html("<p style='color: var(--accent-color);'>Bạn đã bỏ phiếu trong cuộc bầu cử này.</p>");
        $('#msg').show();
      }
    } catch (error) {
      console.error("Lỗi khi chọn cuộc bầu cử:", error);
      alert("Đã xảy ra lỗi khi tải thông tin cuộc bầu cử!");
    }
  }
  
  // Cập nhật thông tin cuộc bầu cử đã chọn
  function updateSelectedElectionInfo(id, electionData) {
    const now = Math.floor(Date.now() / 1000);
    
    // Xử lý startTime và endTime
    let startTime, endTime;
    
    // Nếu có timestamp gốc, sử dụng nó
    if (electionData._startTime) {
        startTime = parseInt(electionData._startTime);
    } else if (typeof electionData.startTime === 'string' && electionData.startTime.match(/^\d+$/)) {
        // Nếu là chuỗi số nguyên
        startTime = parseInt(electionData.startTime);
    } else {
        // Cố gắng chuyển đổi từ chuỗi định dạng
        try {
            startTime = Math.floor(new Date(electionData.startTime).getTime() / 1000);
        } catch (e) {
            console.error("Lỗi khi chuyển đổi startTime:", e);
            startTime = 0;
        }
    }
    
    if (electionData._endTime) {
        endTime = parseInt(electionData._endTime);
    } else if (typeof electionData.endTime === 'string' && electionData.endTime.match(/^\d+$/)) {
        // Nếu là chuỗi số nguyên
        endTime = parseInt(electionData.endTime);
    } else {
        // Cố gắng chuyển đổi từ chuỗi định dạng
        try {
            endTime = Math.floor(new Date(electionData.endTime).getTime() / 1000);
        } catch (e) {
            console.error("Lỗi khi chuyển đổi endTime:", e);
            endTime = 0;
        }
    }
    
    // Log để debug
    console.log("updateSelectedElectionInfo - now:", now);
    console.log("updateSelectedElectionInfo - startTime:", startTime);
    console.log("updateSelectedElectionInfo - endTime:", endTime);
    
    let statusClass, statusText;
    if (now < startTime) {
        statusClass = 'status-pending';
        statusText = 'Sắp diễn ra';
    } else if (now >= startTime && now <= endTime) {
        statusClass = 'status-active';
        statusText = 'Đang diễn ra';
    } else {
        statusClass = 'status-ended';
        statusText = 'Đã kết thúc';
    }
    
    // Cập nhật tiêu đề
    $('#selected-election-title').text(electionData.title || electionData.name);
    
    // Cập nhật thời gian - hiển thị định dạng đã được format
    $('#selected-election-time').text(`Thời gian: ${electionData.startTime} đến ${electionData.endTime}`);
    
    // Cập nhật trạng thái
    $('#selected-election-status').html(`Trạng thái: <span class="${statusClass}">${statusText}</span>`);
    
    // Cập nhật mô tả
    $('#selected-election-description').text(electionData.description);
  }
  
  // Tải danh sách ứng cử viên của cuộc bầu cử
  async function loadCandidates(electionId, candidates) {
    try {
      // Xóa danh sách cũ
      $('#boxCandidate').empty();
      
      // Lấy thông tin chi tiết về từng ứng cử viên
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        renderCandidateRow(candidate.id, candidate);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách ứng cử viên:", error);
    }
  }
  
  // Hiển thị thông tin ứng cử viên
  function renderCandidateRow(index, candidateData) {
    const candidateRow = `
      <tr>
        <td>${candidateData.name}</td>
        <td>${candidateData.party}</td>
        <td>${candidateData.voteCount}</td>
        <td><input class="form-check-input" type="radio" name="candidate" value="${index}" id="candidate-${index}"></td>
      </tr>
    `;
    
    // Thêm vào bảng
    $('#boxCandidate').append(candidateRow);
  }
  
  // Cập nhật thông tin ứng cử viên đã chọn
  async function updateSelectedCandidate(candidateId) {
    try {
      if (!currentElection) return;
      
      // Lấy thông tin chi tiết về cuộc bầu cử
      const electionDetails = await getElectionDetails(currentElection);
      
      // Tìm ứng cử viên theo ID
      const candidate = electionDetails.candidates.find(c => c.id == candidateId);
      
      if (!candidate) {
        console.error("Không tìm thấy ứng cử viên với ID:", candidateId);
        return;
      }
      
      // Cập nhật thông tin hiển thị
      $('#selected-candidate-info').remove();
      
      const selectedCandidateInfo = `
        <div id="selected-candidate-info" class="selected-candidate-info">
          <div class="selected-candidate-header">Ứng cử viên bạn đã chọn:</div>
          <div class="selected-candidate-name">${candidate.name}</div>
          <div class="selected-candidate-party">${candidate.party}</div>
        </div>
      `;
      
      // Thêm vào DOM
      $('#vote').prepend(selectedCandidateInfo);
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin ứng cử viên đã chọn:", error);
    }
  }
  
  // Bỏ phiếu
  async function castVote(electionId, candidateId) {
    try {
      // Hiển thị thông báo đang xử lý
      $('#voteButton').prop('disabled', true);
      $('#msg').html("<p>Đang xử lý bỏ phiếu, vui lòng đợi...</p>");
      
      // Gọi hàm bỏ phiếu
      await vote(electionId, candidateId);
      
      // Hiển thị thông báo thành công
      $('#msg').html("<p style='color: var(--accent-color);'>Đã bỏ phiếu thành công! Đang làm mới dữ liệu...</p>");
      
      // Tải lại lịch sử bỏ phiếu
      await loadVotingHistory();
      
      // Ẩn phần bỏ phiếu
      $voteSection.hide();
      
      // Làm mới dữ liệu sau 2 giây
      setTimeout(async function() {
        // Lấy thông tin chi tiết về cuộc bầu cử
        try {
          const electionDetails = await getElectionDetails(electionId);
          // Tải lại danh sách ứng cử viên để cập nhật số phiếu
          loadCandidates(electionId, electionDetails.candidates);
        } catch (error) {
          console.error("Lỗi khi làm mới danh sách ứng cử viên:", error);
        }
      }, 2000);
    } catch (error) {
      console.error("Lỗi khi bỏ phiếu:", error);
      $('#msg').html(`<p style='color: red;'>Lỗi khi bỏ phiếu: ${error.message}</p>`);
      $('#voteButton').prop('disabled', false);
    }
  }
  
  // Tải lịch sử bỏ phiếu của cử tri
  async function loadVotingHistory() {
    try {
      // Hiển thị thông báo đang tải
      $('#history-loading').show();
      $('#no-history').hide();
      $('#history-container').hide();
      $('#history-list').empty();
      
      // Lấy lịch sử bỏ phiếu từ service
      const votingHistory = await getVotingHistory();
      
      // Nếu không có lịch sử
      if (votingHistory.length === 0) {
        $('#history-loading').hide();
        $('#no-history').show();
        return;
      }
      
      // Xóa nội dung cũ
      $('#history-list').empty();
      
      // Hiển thị từng mục lịch sử
      for (const historyItem of votingHistory) {
        renderHistoryItem(historyItem);
      }
      
      // Hiển thị danh sách, ẩn loading
      $('#history-loading').hide();
      $('#history-container').show();
    } catch (error) {
      console.error("Lỗi khi tải lịch sử bỏ phiếu:", error);
      $('#history-loading').hide();
      $('#no-history').find('p').text('Đã xảy ra lỗi khi tải lịch sử bỏ phiếu!');
      $('#no-history').show();
    }
  }
  
  // Hiển thị một mục trong lịch sử bỏ phiếu
  function renderHistoryItem(historyData) {
    try {
      // Tạo HTML cho mục lịch sử
      const historyItem = `
        <tr>
          <td>${formatDate(historyData.votedAt)}</td>
          <td>${historyData.electionName}</td>
          <td>${historyData.candidateName} (${historyData.candidateParty})</td>
          <td><span class="history-status status-success">Đã bỏ phiếu</span></td>
        </tr>
      `;
      
      // Thêm vào danh sách
      $('#history-list').append(historyItem);
    } catch (error) {
      console.error("Lỗi khi hiển thị mục lịch sử:", error);
    }
  }
  
  // Hàm định dạng ngày tháng
  function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Khởi tạo controller
  initialize();
}

module.exports = {
  initIndexController
}; 