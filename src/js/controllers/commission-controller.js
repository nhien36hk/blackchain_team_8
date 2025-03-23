/**
 * Commission Controller - Quản lý tương tác giao diện Ủy ban bầu cử
 * Hệ thống bầu cử phi tập trung
 */

const CommissionService = require('../services/commission-service.js');
const ElectionService = require('../services/election-service.js');
const AccountService = require('../services/account-service.js');

// Biến lưu trữ trạng thái
let currentProposalId = null;

/**
 * Khởi tạo trang Ủy ban bầu cử
 */
async function initCommissionPage() {
    try {
        // Lấy địa chỉ ví và hiển thị
        const account = await AccountService.getCurrentAccount();
        document.getElementById('commission-address').textContent = account;

        // Hiển thị số lượng đề xuất chờ phê duyệt
        await updatePendingCount();

        // Hiển thị trang giới thiệu khi mới vào thay vì danh sách đề xuất
        await showIntroduction();

        // Thêm event listener cho các nút trong trang giới thiệu
        setTimeout(() => {
            const viewPendingBtn = document.getElementById('view-pending-proposals');
            const viewHistoryBtn = document.getElementById('view-proposal-history');

            if (viewPendingBtn) {
                viewPendingBtn.addEventListener('click', showPendingProposals);
            }

            if (viewHistoryBtn) {
                viewHistoryBtn.addEventListener('click', showProcessedProposals);
            }
        }, 500); // Đợi 500ms để đảm bảo DOM đã được cập nhật

    } catch (error) {
        console.error('Lỗi khởi tạo trang Ủy ban:', error);
        alert('Có lỗi xảy ra khi tải trang Ủy ban bầu cử. Vui lòng thử lại sau.');
    }
}

/**
 * Cập nhật số lượng đề xuất đang chờ
 */
async function updatePendingCount() {
    try {
        // Lấy danh sách chưa được xử lý 
        const pendingProposals = await CommissionService.getPendingProposals();
        const pendingCount = pendingProposals.length;

        // Cập nhật badge hiển thị số lượng
        const pendingBadge = document.getElementById('pending-count');
        if (pendingBadge) {
            pendingBadge.textContent = pendingCount;
            pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật số lượng đề xuất chờ xử lý:', error);
    }
}

/**
 * Hiển thị danh sách đề xuất đang chờ phê duyệt
 */
async function showPendingProposals() {
    try {
        // Thay đổi UI hiển thị đang chọn mục này
        setActiveMenu('pending-proposals');

        const pendingProposals = await CommissionService.getPendingProposals();
        const contentArea = document.getElementById('content-area');

        if (pendingProposals.length === 0) {
            contentArea.innerHTML = `
                <div class="no-data-container">
                    <div class="no-data-icon">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <h4>Không có đề xuất nào chờ xử lý</h4>
                    <p>Hiện tại không có đề xuất bầu cử nào đang chờ phê duyệt.</p>
                </div>
            `;
            return;
        }

        // Hiển thị danh sách đề xuất
        let html = `
            <div class="content-header">
                <h2><i class="fas fa-hourglass-half"></i> Đề Xuất Chờ Phê Duyệt</h2>
                <p>Danh sách các đề xuất bầu cử đang chờ xem xét phê duyệt.</p>
            </div>
            <div class="proposal-list">
        `;

        pendingProposals.forEach(proposal => {
            html += `
                <div class="proposal-card" onclick="viewProposalDetails('${proposal.id}')">
                    <div class="proposal-header">
                        <h4>${proposal.title}</h4>
                        <span class="proposal-status status-pending">Chờ phê duyệt</span>
                    </div>
                    <div class="proposal-details">
                        <p><strong>Người đề xuất:</strong> ${proposal.proposer}</p>
                        <p><strong>Ngày đề xuất:</strong> ${proposal.createdDate}</p>
                        <p><strong>Mô tả:</strong> ${proposal.description.substring(0, 100)}${proposal.description.length > 100 ? '...' : ''}</p>
                    </div>
                    <div class="proposal-footer">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewProposalDetails('${proposal.id}')">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        contentArea.innerHTML = html;
    } catch (error) {
        console.error('Lỗi khi hiển thị đề xuất chờ phê duyệt:', error);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Đã xảy ra lỗi</h4>
                <p>Không thể tải danh sách đề xuất. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

/**
 * Hiển thị danh sách đề xuất đã xử lý
 */
async function showProcessedProposals() {
    try {
        // Thay đổi UI hiển thị đang chọn mục này
        setActiveMenu('processed-proposals');

        const processedProposals = await CommissionService.getProcessedProposals();
        const contentArea = document.getElementById('content-area');

        if (processedProposals.length === 0) {
            contentArea.innerHTML = `
                <div class="no-data-container">
                    <div class="no-data-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h4>Không có đề xuất nào đã xử lý</h4>
                    <p>Hiện tại chưa có đề xuất bầu cử nào đã được xử lý.</p>
                </div>
            `;
            return;
        }

        // Hiển thị danh sách đề xuất đã xử lý
        let html = `
            <div class="content-header">
                <h2><i class="fas fa-history"></i> Đề Xuất Đã Xử Lý</h2>
                <p>Lịch sử các đề xuất đã được phê duyệt hoặc từ chối.</p>
            </div>
            <div class="proposal-list">
        `;

        processedProposals.forEach(proposal => {
            const statusClass = proposal.status === 'Đã phê duyệt' ? 'status-approved' : 'status-rejected';
            const statusIcon = proposal.status === 'Đã phê duyệt' ? 'fa-check-circle' : 'fa-times-circle';

            html += `
                <div class="proposal-card" onclick="viewProposalDetails('${proposal.id}')">
                    <div class="proposal-header">
                        <h4>${proposal.title}</h4>
                        <span class="proposal-status ${statusClass}">
                            <i class="fas ${statusIcon}"></i> ${proposal.status}
                        </span>
                    </div>
                    <div class="proposal-details">
                        <p><strong>Người đề xuất:</strong> ${proposal.proposer}</p>
                        <p><strong>Ngày đề xuất:</strong> ${proposal.createdDate}</p>
                        <p><strong>Ngày xử lý:</strong> ${proposal.processedDate || 'Không có thông tin'}</p>
                    </div>
                    <div class="proposal-footer">
                        <button class="btn btn-info btn-sm" onclick="event.stopPropagation(); viewProposalDetails('${proposal.id}')">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        contentArea.innerHTML = html;
    } catch (error) {
        console.error('Lỗi khi hiển thị đề xuất đã xử lý:', error);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Đã xảy ra lỗi</h4>
                <p>Không thể tải danh sách đề xuất đã xử lý. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

/**
 * Xem chi tiết đề xuất
 * @param {string} proposalId ID của đề xuất cần xem
 */
async function viewProposalDetails(proposalId) {
    try {
        currentProposalId = proposalId;
        const proposal = await CommissionService.getProposalDetails(proposalId);
        const contentArea = document.getElementById('content-area');

        // Kiểm tra trạng thái để hiển thị nút thích hợp
        const isPending = proposal.status === 'Chờ phê duyệt';

        const createdDate = proposal.createdDate || "N/A";

        let html = `
            <div class="content-header">
                <button class="btn btn-secondary btn-sm back-button" onclick="goBack()">
                    <i class="fas fa-arrow-left"></i> Quay lại
                </button>
                <h2><i class="fas fa-clipboard-list"></i> Chi Tiết Đề Xuất</h2>
            </div>
            <div class="proposal-detail-card">
                <div class="proposal-detail-header">
                    <h3>${proposal.title}</h3>
                    <span class="proposal-status ${isPending ? 'status-pending' : proposal.status === 'Đã phê duyệt' ? 'status-approved' : 'status-rejected'}">
                        ${proposal.status}
                    </span>
                </div>
                
                <div class="proposal-detail-content">
                    <div class="detail-row">
                        <div class="detail-label">ID Đề xuất:</div>
                        <div class="detail-value">${proposal.id}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Người đề xuất:</div>
                        <div class="detail-value">${proposal.proposer}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Ngày đề xuất:</div>
                        <div class="detail-value">${createdDate}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Mô tả cuộc bầu cử:</div>
                        <div class="detail-value proposal-description">${proposal.description}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Thời gian bắt đầu:</div>
                        <div class="detail-value">${proposal.startTime}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Thời gian kết thúc:</div>
                        <div class="detail-value">${proposal.endTime}</div>
                    </div>
                    
                    ${!isPending ? `
                    <div class="detail-row">
                        <div class="detail-label">Ngày xử lý:</div>
                        <div class="detail-value">${proposal.processedDate || 'Không có thông tin'}</div>
                    </div>
                    ${proposal.status === 'Đã từ chối' ? `
                    <div class="detail-row">
                        <div class="detail-label">Lý do từ chối:</div>
                        <div class="detail-value">${proposal.rejectionReason || 'Không có thông tin'}</div>
                    </div>
                    ` : ''}
                    ` : ''}
                </div>
                
                <div class="candidates-section">
                    <h4>Danh sách ứng viên</h4>
                    <div class="candidate-list">
                        ${proposal.candidates.map(candidate => `
                            <div class="candidate-card">
                                <div class="candidate-avatar">
                                    <img src="${candidate.image || '../assets/default-avatar.png'}" alt="${candidate.name}">
                                </div>
                                <div class="candidate-info">
                                    <h5>${candidate.name}</h5>
                                    <p>${candidate.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${isPending ? `
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="approveProposal('${proposalId}')">
                        <i class="fas fa-check-circle"></i> Phê duyệt
                    </button>
                    <button class="btn btn-danger" onclick="showRejectDialog('${proposalId}')">
                        <i class="fas fa-times-circle"></i> Từ chối
                    </button>
                </div>
                ` : ''}
            </div>
            
            ${isPending ? `
            <div id="reject-modal" class="custom-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5>Từ chối đề xuất</h5>
                        <span class="close-modal" onclick="closeRejectDialog()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p>Vui lòng nhập lý do từ chối đề xuất này:</p>
                        <textarea id="rejection-reason" class="form-control" rows="4" placeholder="Nhập lý do từ chối..."></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeRejectDialog()">Hủy</button>
                        <button class="btn btn-danger" onclick="rejectProposal()">Xác nhận từ chối</button>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        contentArea.innerHTML = html;
    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết đề xuất:', error);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Đã xảy ra lỗi</h4>
                <p>Không thể tải chi tiết đề xuất. Vui lòng thử lại sau.</p>
                <button class="btn btn-secondary" onclick="goBack()">Quay lại</button>
            </div>
        `;
    }
}

/**
 * Hiển thị danh sách cuộc bầu cử đã được phê duyệt
 */
async function showApprovedElections() {
    try {
        // Thay đổi UI hiển thị đang chọn mục này
        setActiveMenu('approved-elections');

        const approvedElections = await CommissionService.getApprovedElections();
        const contentArea = document.getElementById('content-area');

        if (approvedElections.length === 0) {
            contentArea.innerHTML = `
                <div class="no-data-container">
                    <div class="no-data-icon">
                        <i class="fas fa-vote-yea"></i>
                    </div>
                    <h4>Không có cuộc bầu cử nào</h4>
                    <p>Hiện tại chưa có cuộc bầu cử nào được phê duyệt.</p>
                </div>
            `;
            return;
        }

        // Hiển thị danh sách cuộc bầu cử
        let html = `
            <div class="content-header">
                <h2><i class="fas fa-vote-yea"></i> Cuộc Bầu Cử Đã Phê Duyệt</h2>
                <p>Danh sách các cuộc bầu cử đã được phê duyệt và đang/sẽ diễn ra.</p>
            </div>
            <div class="election-list">
        `;

        approvedElections.forEach(election => {
            const now = new Date().getTime();
            const startTime = new Date(election.startTime).getTime();
            const endTime = new Date(election.endTime).getTime();

            let statusClass, statusText;
            if (now < startTime) {
                statusClass = 'status-upcoming';
                statusText = 'Sắp diễn ra';
            } else if (now >= startTime && now <= endTime) {
                statusClass = 'status-active';
                statusText = 'Đang diễn ra';
            } else {
                statusClass = 'status-ended';
                statusText = 'Đã kết thúc';
            }

            html += `
                <div class="election-card" onclick="viewElectionDetails('${election.id}')">
                    <div class="election-header">
                        <h4>${election.name}</h4>
                        <span class="election-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="election-details">
                        <p><strong>ID:</strong> ${election.id}</p>
                        <p><strong>Thời gian bắt đầu:</strong> ${election.startTime}</p>
                        <p><strong>Thời gian kết thúc:</strong> ${election.endTime}</p>
                        <p><strong>Số ứng viên:</strong> ${election.candidateCount}</p>
                    </div>
                    <div class="election-footer">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewElectionDetails('${election.id}')">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        contentArea.innerHTML = html;
    } catch (error) {
        console.error('Lỗi khi hiển thị cuộc bầu cử đã phê duyệt:', error);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Đã xảy ra lỗi</h4>
                <p>Không thể tải danh sách cuộc bầu cử. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

/**
 * Đặt menu đang active
 * @param {string} menuId ID của menu cần active
 */
function setActiveMenu(menuId) {
    try {
        // Bỏ active tất cả menu item
        const menuItems = document.querySelectorAll('#sidebar .list-unstyled li');
        if (menuItems && menuItems.length > 0) {
            menuItems.forEach(item => {
                item.classList.remove('active');
            });
        }

        // Active menu item hiện tại dựa trên menuId
        if (menuId === 'pending-proposals') {
            // Kích hoạt menu cha (proposals-menu-item)
            const parentMenu = document.getElementById('proposals-menu-item');
            if (parentMenu) {
                parentMenu.classList.add('active');
            }

            // Kích hoạt menu con (pending-proposals-menu-item)
            const pendingItem = document.getElementById('pending-proposals-menu-item');
            if (pendingItem) {
                pendingItem.classList.add('active');
            }
        } else if (menuId == 'intro-menu-item') {
            const parentMenu = document.getElementById('intro-menu-item');
            if (parentMenu) {
                parentMenu.classList.add('active');
            }
        } else if (menuId === 'processed-proposals') {
            // Kích hoạt menu cha (proposals-menu-item)
            const parentMenu = document.getElementById('proposals-menu-item');
            if (parentMenu) {
                parentMenu.classList.add('active');
            }

            // Kích hoạt menu con (processed-proposals-menu-item)
            const processedItem = document.getElementById('processed-proposals-menu-item');
            if (processedItem) {
                processedItem.classList.add('active');
            }
        } else if (menuId === 'approved-elections') {
            // Kích hoạt menu cuộc bầu cử đã phê duyệt
            const approvedItem = document.getElementById('approved-elections-menu-item');
            if (approvedItem) {
                approvedItem.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Lỗi khi thiết lập menu active:', error);
    }
}

/**
 * Quay lại trang danh sách trước đó
 */
function goBack() {
    try {
        // Kiểm tra menu active hiện tại và quay lại trang tương ứng
        const pendingItem = document.getElementById('pending-proposals-menu-item');
        if (pendingItem && pendingItem.classList.contains('active')) {
            showPendingProposals();
            return;
        }

        const processedItem = document.getElementById('processed-proposals-menu-item');
        if (processedItem && processedItem.classList.contains('active')) {
            showProcessedProposals();
            return;
        }

        // Mặc định quay về danh sách cuộc bầu cử đã phê duyệt
        showApprovedElections();
    } catch (error) {
        console.error('Lỗi khi quay lại trang trước:', error);
        // Mặc định quay về danh sách cuộc bầu cử đã phê duyệt
        showApprovedElections();
    }
}

/**
 * Hiển thị dialog từ chối đề xuất
 */
function showRejectDialog() {
    document.getElementById('reject-modal').style.display = 'block';
}

/**
 * Đóng dialog từ chối đề xuất
 */
function closeRejectDialog() {
    document.getElementById('reject-modal').style.display = 'none';
}

/**
 * Phê duyệt đề xuất
 * @param {string} proposalId ID của đề xuất cần phê duyệt
 */
async function approveProposal(proposalId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn phê duyệt đề xuất này không?')) {
            return;
        }

        await CommissionService.approveProposal(proposalId);
        alert('Đề xuất đã được phê duyệt thành công!');

        // Cập nhật UI
        await updatePendingCount();
        await showPendingProposals();
    } catch (error) {
        console.error('Lỗi khi phê duyệt đề xuất:', error);
        alert('Có lỗi xảy ra khi phê duyệt đề xuất. Vui lòng thử lại sau.');
    }
}

/**
 * Từ chối đề xuất
 */
async function rejectProposal() {
    try {
        const rejectionReason = document.getElementById('rejection-reason').value.trim();

        if (!rejectionReason) {
            alert('Vui lòng nhập lý do từ chối!');
            return;
        }

        await CommissionService.rejectProposal(currentProposalId, rejectionReason);
        closeRejectDialog();
        alert('Đề xuất đã bị từ chối thành công!');

        // Cập nhật UI
        await updatePendingCount();
        await showPendingProposals();
    } catch (error) {
        console.error('Lỗi khi từ chối đề xuất:', error);
        alert('Có lỗi xảy ra khi từ chối đề xuất. Vui lòng thử lại sau.');
        closeRejectDialog();
    }
}

/**
 * Xem chi tiết cuộc bầu cử và kết quả
 * @param {string} electionId ID của cuộc bầu cử cần xem
 */
async function viewElectionDetails(electionId) {
    try {
        const electionResults = await CommissionService.getElectionResults(electionId);
        const contentArea = document.getElementById('content-area');

        let html = `
            <div class="content-header">
                <button class="btn btn-secondary btn-sm back-button" onclick="goBack()">
                    <i class="fas fa-arrow-left"></i> Quay lại
                </button>
                <h2><i class="fas fa-chart-pie"></i> Chi Tiết Cuộc Bầu Cử</h2>
            </div>
            <div class="election-detail-card">
                <div class="election-detail-header">
                    <h3>${electionResults.title}</h3>
                    <span class="election-status ${electionResults.status === 'Đang diễn ra' ? 'status-active' : electionResults.status === 'Sắp diễn ra' ? 'status-upcoming' : 'status-ended'}">
                        ${electionResults.status}
                    </span>
                </div>
                
                <div class="election-detail-content">
                    <div class="detail-row">
                        <div class="detail-label">ID cuộc bầu cử:</div>
                        <div class="detail-value">${electionResults.id}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Mô tả:</div>
                        <div class="detail-value election-description">${electionResults.description}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Thời gian bắt đầu:</div>
                        <div class="detail-value">${electionResults.startTime}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Thời gian kết thúc:</div>
                        <div class="detail-value">${electionResults.endTime}</div>
                    </div>
                    
                </div>
                

            </div>
        `;

        contentArea.innerHTML = html;

        // Tạo biểu đồ kết quả
        setTimeout(() => {
            const ctx = document.getElementById('resultsChart').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: electionResults.candidates.map(c => c.name),
                    datasets: [{
                        data: electionResults.candidates.map(c => c.voteCount),
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
                                label: function (context) {
                                    const candidate = electionResults.candidates[context.dataIndex];
                                    return `${candidate.name}: ${candidate.voteCount} phiếu (${candidate.percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết cuộc bầu cử:', error);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Đã xảy ra lỗi</h4>
                <p>Không thể tải chi tiết cuộc bầu cử. Vui lòng thử lại sau.</p>
                <button class="btn btn-secondary" onclick="goBack()">Quay lại</button>
            </div>
        `;
    }
}

/**
 * Hiển thị trang giới thiệu Ủy ban bầu cử
 */
async function showIntroduction() {
    try {
        // Không đánh dấu mục menu nào là active
        clearActiveMenu();

        setActiveMenu('intro-menu-item');

        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading-container"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';

        try {
            // Tải nội dung từ file HTML riêng - Sửa đường dẫn phù hợp với route mới
            const response = await fetch('/html/components/commission-intro.html');
            if (!response.ok) {
                throw new Error(`Không thể tải trang giới thiệu: ${response.status}`);
            }

            const html = await response.text();
            contentArea.innerHTML = html;
        } catch (error) {
            // Nếu không tải được file HTML, hiển thị nội dung trực tiếp
            console.warn('Không thể tải file HTML, hiển thị nội dung trực tiếp:', error);
            contentArea.innerHTML = `
            <!-- Giới thiệu về Ủy ban Bầu cử -->
            <div class="commission-intro-container">
              <!-- Header -->
              <div class="intro-header">
                <div class="intro-header-icon">
                  <i class="fas fa-balance-scale"></i>
                </div>
                <h1>Ủy Ban Bầu Cử</h1>
                <div class="intro-subtitle">Đảm bảo tính minh bạch và công bằng cho hệ thống bầu cử blockchain</div>
              </div>

              <div class="intro-card">
                <div class="card-header">
                  <i class="fas fa-info-circle"></i>
                  <h2>Giới Thiệu Chung</h2>
                </div>
                <div class="card-content">
                  <p>Ủy ban Bầu cử là cơ quan có trách nhiệm đảm bảo các cuộc bầu cử được tổ chức minh bạch, công bằng và đúng quy định trên nền tảng blockchain.</p>
                  
                  <div class="start-actions">
                    <button id="view-pending-proposals" class="btn btn-primary">
                      <i class="fas fa-list-alt"></i> Xem đề xuất chờ phê duyệt
                    </button>
                    <button id="view-proposal-history" class="btn btn-secondary">
                      <i class="fas fa-history"></i> Xem lịch sử phê duyệt
                    </button>
                  </div>
                </div>
              </div>
            </div>
            `;

            // Thêm event listener cho các nút
            setTimeout(() => {
                const viewPendingBtn = document.getElementById('view-pending-proposals');
                const viewHistoryBtn = document.getElementById('view-proposal-history');

                if (viewPendingBtn) {
                    viewPendingBtn.addEventListener('click', showPendingProposals);
                }

                if (viewHistoryBtn) {
                    viewHistoryBtn.addEventListener('click', showProcessedProposals);
                }
            }, 100);
        }
    } catch (error) {
        console.error('Lỗi khi hiển thị trang giới thiệu:', error);
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Đã xảy ra lỗi</h4>
                <p>Không thể tải trang giới thiệu. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="showPendingProposals()">Xem danh sách đề xuất</button>
            </div>
        `;
    }
}

/**
 * Xóa trạng thái active của tất cả các mục menu
 */
function clearActiveMenu() {
    const menuItems = document.querySelectorAll('.nav-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
}

// Export các hàm cần thiết
module.exports = {
    initCommissionPage,
    updatePendingCount,
    showIntroduction,
    showPendingProposals,
    showProcessedProposals,
    viewProposalDetails,
    showApprovedElections,
    approveProposal,
    rejectProposal,
    viewElectionDetails,
    showRejectDialog,
    closeRejectDialog,
    clearActiveMenu,
    goBack
}; 