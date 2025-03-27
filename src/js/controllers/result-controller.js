/**
 * Controller quản lý hiển thị và tương tác với phần kết quả bầu cử
 */

const { getAllElections, getElectionResults, finalizeElection, publishElectionResults } = require('../services/election-service');

// Biến lưu trữ trạng thái
let currentElectionId = null;
let resultsChart = null;

// Khởi tạo controller cho trang kết quả bầu cử
function initResultController() {
  console.log("Khởi tạo result controller");
  
  // Kiểm tra xem các phần tử DOM có tồn tại không
  const electionsContainer = document.getElementById('elections-container');
  
  if (!electionsContainer) {
    console.warn('Không tìm thấy phần tử DOM cần thiết cho trang kết quả');
    return;
  }
  
  // Tải danh sách cuộc bầu cử
  loadElectionList();
}

/**
 * Tải danh sách cuộc bầu cử và hiển thị dạng grid
 */
async function loadElectionList() {
  try {
    const electionsContainer = document.getElementById('elections-container');
    const loadingElement = document.getElementById('elections-loading');
    const noElectionsElement = document.getElementById('no-elections');
    
    if (!electionsContainer) return;
    
    // Hiển thị loading
    if (loadingElement) loadingElement.style.display = 'block';
    if (noElectionsElement) noElectionsElement.style.display = 'none';
    electionsContainer.innerHTML = '';
    
    // Lấy danh sách cuộc bầu cử
    const elections = await getAllElections();
    
    // Ẩn loading
    if (loadingElement) loadingElement.style.display = 'none';
    
    // Kiểm tra kết quả
    if (!elections || elections.length === 0) {
      if (noElectionsElement) noElectionsElement.style.display = 'block';
      return;
    }
    
    // Tạo HTML cho mỗi cuộc bầu cử
    let html = '';
    
    elections.forEach(election => {
      // Xác định class cho badge trạng thái
      let statusClass = '';
      if (election.status === 'Đang diễn ra') {
        statusClass = 'status-active';
      } else if (election.status === 'Sắp diễn ra') {
        statusClass = 'status-upcoming';
      } else {
        statusClass = 'status-ended';
      }
      
      // Format ngày và thời gian
      
      // Tạo card cho cuộc bầu cử
      html += `
        <div class="election-card" data-election-id="${election.id}">
          <div class="election-card-header">
            <h3>${election.name}</h3>
            <span class="election-status-badge ${statusClass}">${election.status}</span>
          </div>
          <div class="election-card-content">
            <div class="election-info-item">
              <span class="election-info-icon"><i class="fas fa-calendar-alt"></i></span>
              <span>Bắt đầu: ${election.startTime}</span>
            </div>
            <div class="election-info-item">
              <span class="election-info-icon"><i class="fas fa-calendar-check"></i></span>
              <span>Kết thúc: ${election.endTime}</span>
            </div>
            <div class="election-description">${election.description}</div>
          </div>
          <div class="election-card-footer">
            <button class="btn btn-sm" onclick="event.stopPropagation(); viewElectionResults('${election.id}')">
              <i class="fas fa-chart-pie"></i> Xem kết quả
            </button>
          </div>
        </div>
      `;
    });
    
    // Cập nhật container
    electionsContainer.innerHTML = html;
    
    // Thêm sự kiện click cho mỗi card
    document.querySelectorAll('.election-card').forEach(card => {
      card.addEventListener('click', function() {
        const electionId = this.getAttribute('data-election-id');
        viewElectionResults(electionId);
      });
    });
    
  } catch (error) {
    console.error('Lỗi khi tải danh sách cuộc bầu cử:', error);
    const loadingElement = document.getElementById('elections-loading');
    const noElectionsElement = document.getElementById('no-elections');
    const electionsContainer = document.getElementById('elections-container');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (noElectionsElement) {
      noElectionsElement.style.display = 'block';
      // Cập nhật thông báo lỗi
      const messageElement = noElectionsElement.querySelector('p');
      if (messageElement) {
        messageElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Lỗi khi tải danh sách cuộc bầu cử: ${error.message}`;
      }
    }
  }
}

/**
 * Hiển thị kết quả của một cuộc bầu cử
 * @param {string} electionId ID của cuộc bầu cử cần xem
 */
async function viewElectionResults(electionId) {
  try {
    currentElectionId = electionId;
    
    // Hiển thị container kết quả
    const resultsContainer = document.getElementById('election-results-container');
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
    }
    
    // Lấy dữ liệu kết quả bầu cử
    const electionResults = await getElectionResults(electionId);
    
    // Cập nhật thông tin cuộc bầu cử
    updateElectionInfo(electionResults);
    
    // Hiển thị top 3 ứng cử viên
    displayTopCandidates(electionResults.candidates);
    
    // Hiển thị bảng kết quả chi tiết
    displayResultsTable(electionResults.candidates);
    
    // Hiển thị biểu đồ kết quả
    displayResultsChart(electionResults.candidates);
    
    // Cập nhật thống kê
    updateStatistics(electionResults.statistics);
    
    // Cập nhật thời gian cập nhật cuối cùng
    updateLastUpdateTime();
    
    // Cuộn trang xuống để hiển thị kết quả
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('Lỗi khi hiển thị kết quả bầu cử:', error);
    alert(`Có lỗi xảy ra khi tải kết quả bầu cử: ${error.message}`);
  }
}

/**
 * Cập nhật thông tin cuộc bầu cử
 * @param {Object} electionResults Kết quả bầu cử
 */
function updateElectionInfo(electionResults) {
  // Cập nhật tiêu đề
  const electionTitle = document.getElementById('election-title');
  if (electionTitle) {
    electionTitle.textContent = electionResults.title;
  }
  
  // Cập nhật trạng thái
  const electionStatus = document.getElementById('election-status');
  if (electionStatus) {
    electionStatus.textContent = electionResults.status;
    
    // Thiết lập class dựa trên trạng thái
    electionStatus.className = 'status-badge';
    if (electionResults.status === 'Đang diễn ra') {
      electionStatus.classList.add('status-active');
    } else if (electionResults.status === 'Sắp diễn ra') {
      electionStatus.classList.add('status-upcoming');
    } else {
      electionStatus.classList.add('status-ended');
    }
  }
  
  // Cập nhật thời gian bắt đầu
  const startTime = document.getElementById('election-start-time');
  if (startTime) {
    startTime.textContent = electionResults.startTime;
  }
  
  // Cập nhật thời gian kết thúc
  const endTime = document.getElementById('election-end-time');
  if (endTime) {
    endTime.textContent = electionResults.endTime;
  }
  
  // Cập nhật mô tả
  const description = document.getElementById('election-description');
  if (description) {
    description.textContent = electionResults.description;
  }
}

/**
 * Hiển thị top 3 ứng cử viên dẫn đầu
 * @param {Array} candidates Danh sách ứng cử viên
 */
function displayTopCandidates(candidates) {
  const topCandidatesContainer = document.getElementById('top-candidates');
  if (!topCandidatesContainer) return;
  
  // Sắp xếp ứng cử viên theo số phiếu giảm dần
  const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  
  // Lấy top 3 ứng cử viên
  const topCandidates = sortedCandidates.slice(0, 3);
  
  // Tạo HTML cho top 3
  let html = '';
  
  if (topCandidates.length === 0) {
    html = '<div class="no-data">Chưa có dữ liệu ứng cử viên</div>';
  } else {
    html = '<div class="top-candidates-grid">';
    
    // Thêm các ứng cử viên top
    topCandidates.forEach((candidate, index) => {
      const rank = index + 1;
      const medalClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
      
      html += `
        <div class="top-candidate-card rank-${rank}">
          <div class="candidate-rank ${medalClass}">
            <i class="fas fa-medal"></i>
            <span>${rank}</span>
          </div>
          <div class="candidate-info">
            <h3>${candidate.name}</h3>
            <p>${candidate.party}</p>
            <div class="vote-count">
              <i class="fas fa-vote-yea"></i> ${candidate.voteCount} phiếu
            </div>
            <div class="vote-percentage">
              ${candidate.percentage}%
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  topCandidatesContainer.innerHTML = html;
}

/**
 * Hiển thị bảng kết quả chi tiết
 * @param {Array} candidates Danh sách ứng cử viên
 */
function displayResultsTable(candidates) {
  const tableBody = document.getElementById('results-table-body');
  if (!tableBody) return;
  
  // Sắp xếp ứng cử viên theo số phiếu giảm dần
  const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  
  // Tạo HTML cho bảng
  let html = '';
  
  if (sortedCandidates.length === 0) {
    html = '<tr><td colspan="5" class="text-center">Chưa có dữ liệu ứng cử viên</td></tr>';
  } else {
    sortedCandidates.forEach((candidate, index) => {
      const rank = index + 1;
      const rowClass = rank <= 3 ? `top-${rank}` : '';
      
      html += `
        <tr class="${rowClass}">
          <td>${rank}</td>
          <td>${candidate.name}</td>
          <td>${candidate.party}</td>
          <td>${candidate.voteCount}</td>
          <td>${candidate.percentage}%</td>
        </tr>
      `;
    });
  }
  
  tableBody.innerHTML = html;
}

/**
 * Hiển thị biểu đồ kết quả
 * @param {Array} candidates Danh sách ứng cử viên
 */
function displayResultsChart(candidates) {
  const chartCanvas = document.getElementById('results-chart');
  if (!chartCanvas) return;
  
  // Kiểm tra xem Chart đã được định nghĩa chưa
  if (typeof Chart === 'undefined') {
    console.error('Thư viện Chart.js chưa được tải. Không thể hiển thị biểu đồ.');
    
    // Hiển thị thông báo lỗi trên canvas
    const ctx = chartCanvas.getContext('2d');
    ctx.font = '14px Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('Không thể tải biểu đồ - Thư viện Chart.js không có sẵn', chartCanvas.width / 2, chartCanvas.height / 2);
    return;
  }
  
  // Sắp xếp ứng cử viên theo số phiếu giảm dần
  const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  
  // Tạo dữ liệu cho biểu đồ
  const labels = sortedCandidates.map(c => c.name);
  const data = sortedCandidates.map(c => c.voteCount);
  
  // Hủy biểu đồ cũ nếu có
  if (resultsChart) {
    try {
      resultsChart.destroy();
    } catch (error) {
      console.warn('Không thể hủy biểu đồ cũ:', error);
    }
  }
  
  try {
    // Tạo biểu đồ mới
    const ctx = chartCanvas.getContext('2d');
    resultsChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(40, 159, 64, 0.8)',
            'rgba(210, 199, 199, 0.8)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
            'rgba(40, 159, 64, 1)',
            'rgba(210, 199, 199, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const candidate = sortedCandidates[context.dataIndex];
                return `${candidate.name}: ${candidate.voteCount} phiếu (${candidate.percentage}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo biểu đồ:', error);
    
    // Hiển thị thông báo lỗi
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText(`Lỗi khi tạo biểu đồ: ${error.message}`, chartCanvas.width / 2, chartCanvas.height / 2);
  }
}

/**
 * Cập nhật thống kê
 * @param {Object} statistics Thống kê cuộc bầu cử
 */
function updateStatistics(statistics) {
  // Cập nhật tổng số cử tri
  const totalVoters = document.getElementById('total-voters');
  if (totalVoters) {
    totalVoters.textContent = statistics.totalVoters;
  }
  
  // Cập nhật tổng số phiếu bầu
  const totalVotes = document.getElementById('total-votes');
  if (totalVotes) {
    totalVotes.textContent = statistics.totalVotes;
  }
  
  // Cập nhật tỷ lệ tham gia
  const turnoutPercentage = document.getElementById('turnout-percentage');
  if (turnoutPercentage) {
    turnoutPercentage.textContent = `${statistics.turnoutPercentage}%`;
  }
}

/**
 * Cập nhật thời gian cập nhật cuối cùng
 */
function updateLastUpdateTime() {
  const lastUpdateTime = document.getElementById('last-update-time');
  if (!lastUpdateTime) return;
  
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  lastUpdateTime.textContent = `${hours}:${minutes}:${seconds}`;
}

/**
 * Định dạng ngày tháng
 * @param {Date|string} date Ngày cần định dạng
 * @returns {string} Chuỗi ngày tháng đã định dạng
 */
function formatDateTime(date) {
  if (!date) return 'N/A';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Xuất module
module.exports = {
  initResultController,
  viewElectionResults,
  loadElectionList,
  updateElectionInfo,
  displayTopCandidates,
  displayResultsTable,
  displayResultsChart,
  updateStatistics,
  updateLastUpdateTime,
  formatDateTime
}; 