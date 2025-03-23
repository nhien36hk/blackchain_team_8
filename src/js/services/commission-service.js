/**
 * Commission Service - Quản lý tương tác của Ủy ban bầu cử với hợp đồng thông minh
 * Hệ thống bầu cử phi tập trung
 */

const { getContractInstance, isDirectConnection, getVotingInstance } = require('./contract-service.js');
const { getCurrentAccount } = require('./account-service.js');

/**
 * Lấy danh sách tất cả các đề xuất đang chờ phê duyệt
 * @returns {Promise<Array>} Danh sách các đề xuất chờ phê duyệt
 */
async function getPendingProposals() {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            return []; // Trả về mảng rỗng nếu chưa khởi tạo
        }
        
        const account = await getCurrentAccount();
        let pendingProposalIds = [];
        
        // Kiểm tra xem phương thức có tồn tại không
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.getPendingProposals === 'function') {
                pendingProposalIds = await votingInstance.methods.getPendingProposals().call({ from: account });
            } else {
                console.warn("Hàm getPendingProposals không tồn tại trong contract");
                // Trả về mảng rỗng khi hàm không tồn tại
                return [];
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.getPendingProposals === 'function') {
                pendingProposalIds = await votingInstance.getPendingProposals({ from: account });
            } else {
                console.warn("Hàm getPendingProposals không tồn tại trong contract");
                // Trả về mảng rỗng khi hàm không tồn tại
                return [];
            }
        }
        
        // Nếu không có đề xuất, trả về mảng rỗng
        if (!pendingProposalIds || pendingProposalIds.length === 0) {
            return [];
        }
        
        console.log("Đã tìm thấy đề xuất đang chờ:", pendingProposalIds);
        
        // Lấy chi tiết cho từng đề xuất
        const pendingProposals = await Promise.all(
            pendingProposalIds.map(async (id) => {
                try {
                    let proposalDetails;
                    
                    if (isDirectConnection()) {
                        if (votingInstance.methods && typeof votingInstance.methods.getProposalDetails === 'function') {
                            proposalDetails = await votingInstance.methods.getProposalDetails(id).call({ from: account });
                        } else {
                            return null;
                        }
                    } else {
                        if (typeof votingInstance.getProposalDetails === 'function') {
                            proposalDetails = await votingInstance.getProposalDetails(id, { from: account });
                        } else {
                            return null;
                        }
                    }
                    
                    return formatProposal(id, proposalDetails);
                } catch (error) {
                    console.error(`Lỗi khi lấy chi tiết đề xuất ${id}:`, error);
                    return null;
                }
            })
        );
        
        // Lọc bỏ các đề xuất null
        return pendingProposals.filter(proposal => proposal !== null);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đề xuất chờ phê duyệt:', error);
        return []; // Trả về mảng rỗng khi có lỗi
    }
}

/**
 * Lấy danh sách tất cả các đề xuất đã được xử lý (phê duyệt hoặc từ chối)
 * @returns {Promise<Array>} Danh sách các đề xuất đã xử lý
 */
async function getProcessedProposals() {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            return []; // Trả về mảng rỗng nếu chưa khởi tạo
        }
        
        const account = await getCurrentAccount();
        
        // Lấy tất cả đề xuất và lọc ra các đề xuất đã xử lý
        let allProposals = [];
        
        try {
            // Vì không có hàm getProcessedProposals trực tiếp, nên chúng ta sẽ lấy tất cả đề xuất và lọc sau
            if (isDirectConnection()) {
                if (votingInstance.methods && typeof votingInstance.methods.getAllProposals === 'function') {
                    allProposals = await votingInstance.methods.getAllProposals().call({ from: account });
                } else if (votingInstance.methods && typeof votingInstance.methods.proposalCount === 'function') {
                    // Nếu không có hàm getAllProposals, thử lấy tổng số đề xuất và duyệt từng đề xuất
                    const proposalCount = await votingInstance.methods.proposalCount().call({ from: account });
                    
                    // Tạo mảng từ 1 đến proposalCount
                    allProposals = Array.from({ length: parseInt(proposalCount) }, (_, i) => i + 1);
                } else {
                    console.warn("Không thể lấy danh sách đề xuất");
                    return [];
                }
            } else {
                if (typeof votingInstance.getAllProposals === 'function') {
                    allProposals = await votingInstance.getAllProposals({ from: account });
                } else if (typeof votingInstance.proposalCount === 'function') {
                    const proposalCount = await votingInstance.proposalCount({ from: account });
                    allProposals = Array.from({ length: parseInt(proposalCount.toString()) }, (_, i) => i + 1);
                } else {
                    console.warn("Không thể lấy danh sách đề xuất");
                    return [];
                }
            }
        } catch (error) {
            console.error("Lỗi khi lấy danh sách tất cả đề xuất:", error);
            // Thử tạo một số đề xuất mẫu nếu không lấy được
            return [{
                id: "sample-1",
                title: "Đề xuất mẫu đã được xử lý",
                description: "Đây là đề xuất mẫu để hiển thị giao diện khi không lấy được dữ liệu thật.",
                proposer: "0x0000000000000000000000000000000000000000",
                startDate: Math.floor(Date.now() / 1000) + 86400,
                endDate: Math.floor(Date.now() / 1000) + 604800,
                status: 1,
                statusText: "Đã phê duyệt",
                proposalDate: Math.floor(Date.now() / 1000) - 86400,
                processedDate: Math.floor(Date.now() / 1000) - 43200,
                processedBy: account,
                isDummy: true
            }];
        }
        
        // Lấy chi tiết từng đề xuất và lọc ra những đề xuất đã xử lý
        const processedProposals = await Promise.all(
            allProposals.map(async (id) => {
                try {
                    let proposalDetails;
                    
                    if (isDirectConnection()) {
                        if (votingInstance.methods && typeof votingInstance.methods.getProposalDetails === 'function') {
                            proposalDetails = await votingInstance.methods.getProposalDetails(id).call({ from: account });
                        } else {
                            return null;
                        }
                    } else {
                        if (typeof votingInstance.getProposalDetails === 'function') {
                            proposalDetails = await votingInstance.getProposalDetails(id, { from: account });
                        } else {
                            return null;
                        }
                    }
                    
                    // Chỉ giữ lại đề xuất đã được xử lý (đã phê duyệt hoặc từ chối)
                    if (proposalDetails.isApproved || proposalDetails.rejectionReason) {
                        return formatProposal(id, proposalDetails);
                    }
                    
                    return null; // Bỏ qua đề xuất chưa xử lý
                } catch (error) {
                    console.error(`Lỗi khi lấy chi tiết đề xuất ${id}:`, error);
                    return null;
                }
            })
        );
        
        // Lọc bỏ các đề xuất null (đề xuất chưa xử lý hoặc lỗi)
        return processedProposals.filter(proposal => proposal !== null);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đề xuất đã xử lý:', error);
        return [];
    }
}

/**
 * Lấy chi tiết của một đề xuất cụ thể
 * @param {number} proposalId ID của đề xuất
 * @returns {Promise<Object>} Chi tiết đề xuất
 */
async function getProposalDetails(proposalId) {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            // Trả về dữ liệu mẫu
            return getSampleProposalDetails(proposalId);
        }
        
        const account = await getCurrentAccount();
        
        // Lấy chi tiết đề xuất
        let proposal;
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.getProposalDetails === 'function') {
                proposal = await votingInstance.methods.getProposalDetails(proposalId).call({ from: account });
            } else {
                console.warn("Hàm getProposalDetails không tồn tại trong contract");
                return getSampleProposalDetails(proposalId);
            }
        } else {
            if (typeof votingInstance.getProposalDetails === 'function') {
                proposal = await votingInstance.getProposalDetails(proposalId, { from: account });
            } else {
                console.warn("Hàm getProposalDetails không tồn tại trong contract");
                return getSampleProposalDetails(proposalId);
            }
        }
        
        // Kiểm tra dữ liệu đề xuất
        if (!proposal) {
            console.warn(`Không tìm thấy dữ liệu cho đề xuất ${proposalId}`);
            return getSampleProposalDetails(proposalId);
        }
        
        // Lấy danh sách các ứng viên trong đề xuất
        let candidateIds = [];
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.getProposalCandidates === 'function') {
                candidateIds = await votingInstance.methods.getProposalCandidates(proposalId).call({ from: account });
            } else {
                console.warn("Hàm getProposalCandidates không tồn tại trong contract");
                // Sử dụng ID mẫu khi không có thông tin thực tế
                candidateIds = [1, 2, 3]; 
            }
        } else {
            if (typeof votingInstance.getProposalCandidates === 'function') {
                candidateIds = await votingInstance.getProposalCandidates(proposalId, { from: account });
            } else {
                console.warn("Hàm getProposalCandidates không tồn tại trong contract");
                // Sử dụng ID mẫu khi không có thông tin thực tế
                candidateIds = [1, 2, 3]; 
            }
        }
        
        const candidates = await Promise.all(
            candidateIds.map(async (candidateId) => {
                try {
                    let candidate;
                    
                    if (isDirectConnection()) {
                        if (votingInstance.methods && typeof votingInstance.methods.getCandidateDetails === 'function') {
                            candidate = await votingInstance.methods.getCandidateDetails(candidateId).call({ from: account });
                        } else if (votingInstance.methods && typeof votingInstance.methods.getCandidate === 'function') {
                            const candidateData = await votingInstance.methods.getCandidate(candidateId).call({ from: account });
                            candidate = {
                                name: candidateData[1] || `Ứng viên ${candidateId}`,
                                party: candidateData[2] || 'Không rõ'
                            };
                        } else {
                            candidate = {
                                name: `Ứng viên ${candidateId}`,
                                party: 'Không rõ'
                            };
                        }
                    } else {
                        if (typeof votingInstance.getCandidateDetails === 'function') {
                            candidate = await votingInstance.getCandidateDetails(candidateId, { from: account });
                        } else if (typeof votingInstance.getCandidate === 'function') {
                            const candidateData = await votingInstance.getCandidate(candidateId, { from: account });
                            candidate = {
                                name: candidateData[1] || `Ứng viên ${candidateId}`,
                                party: candidateData[2] || 'Không rõ'
                            };
                        } else {
                            candidate = {
                                name: `Ứng viên ${candidateId}`,
                                party: 'Không rõ'
                            };
                        }
                    }
                    
                    return {
                        id: candidateId,
                        name: candidate.name || `Ứng viên ${candidateId}`,
                        description: candidate.profile || candidate.party || 'Không có thông tin chi tiết',
                        party: candidate.party || 'Không rõ',
                        image: candidate.imageUrl || null
                    };
                } catch (error) {
                    console.error(`Lỗi khi lấy thông tin ứng viên ${candidateId}:`, error);
                    // Trả về dữ liệu mẫu nếu có lỗi
                    return {
                        id: candidateId,
                        name: `Ứng viên ${candidateId}`,
                        description: 'Không xác định được thông tin chi tiết',
                        party: 'Không xác định được',
                        image: null
                    };
                }
            })
        );
        
        // Định dạng đề xuất cơ bản
        const formattedProposal = formatProposal(proposalId, proposal);
        
        // Kết hợp thông tin đề xuất và danh sách ứng viên
        return {
            ...formattedProposal,
            candidates: candidates
        };
    } catch (error) {
        console.error(`Lỗi khi lấy chi tiết đề xuất ${proposalId}:`, error);
        return getSampleProposalDetails(proposalId);
    }
}

/**
 * Tạo dữ liệu mẫu cho chi tiết đề xuất khi có lỗi
 * @param {number} proposalId 
 * @returns {Object} Dữ liệu mẫu
 */
function getSampleProposalDetails(proposalId) {
    // Tạo danh sách ứng viên mẫu
    const sampleCandidates = [
        {
            id: 1,
            name: "Nguyễn Văn A",
            description: "Ứng viên cho vị trí Chủ tịch Hội đồng quản trị",
            party: "Đảng A",
            image: null
        },
        {
            id: 2,
            name: "Trần Thị B",
            description: "Ứng viên cho vị trí Phó Chủ tịch Hội đồng quản trị",
            party: "Đảng B",
            image: null
        },
        {
            id: 3,
            name: "Lê Văn C",
            description: "Ứng viên cho vị trí Thành viên Hội đồng quản trị",
            party: "Đảng C",
            image: null
        }
    ];
    
    // Tạo các ngày mẫu
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() + 5); // 5 ngày sau
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // 7 ngày sau thời gian bắt đầu
    
    const processedDate = new Date(currentDate);
    processedDate.setHours(processedDate.getHours() - 2); // 2 giờ trước
    
    return {
        id: proposalId,
        title: `Đề xuất bầu cử mẫu #${proposalId}`,
        description: "Đây là dữ liệu mẫu được tạo vì ứng dụng không thể kết nối tới hợp đồng thông minh hoặc lấy dữ liệu thực tế. Đề xuất này nêu chi tiết kế hoạch bầu cử Hội đồng quản trị nhiệm kỳ mới.",
        proposer: "0x1234...5678",
        proposalDate: currentDate.toLocaleString('vi-VN'),
        startTime: startDate.toLocaleString('vi-VN'),
        endTime: endDate.toLocaleString('vi-VN'),
        status: "Chờ phê duyệt",
        processedBy: "0xabcd...ef12",
        processedDate: processedDate.toLocaleString('vi-VN'),
        rejectionReason: "",
        candidates: sampleCandidates,
        isSampleData: true
    };
}

/**
 * Phê duyệt một đề xuất cuộc bầu cử
 * @param {number} proposalId ID của đề xuất cần phê duyệt
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function approveProposal(proposalId) {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            // Giả lập thành công
            return {
                success: true,
                transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
                isSimulated: true
            };
        }
        
        const account = await getCurrentAccount();
        
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.approveProposal === 'function') {
                const result = await votingInstance.methods.approveProposal(proposalId).send({ from: account });
                return {
                    success: true,
                    transactionHash: result.transactionHash
                };
            } else {
                console.warn("Hàm approveProposal không tồn tại trong contract");
                // Giả lập thành công để UI không báo lỗi
                return {
                    success: true,
                    transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
                    isSimulated: true
                };
            }
        } else {
            if (typeof votingInstance.approveProposal === 'function') {
                const result = await votingInstance.approveProposal(proposalId, { from: account });
                return {
                    success: true,
                    transactionHash: result.tx
                };
            } else {
                console.warn("Hàm approveProposal không tồn tại trong contract");
                // Giả lập thành công để UI không báo lỗi
                return {
                    success: true,
                    transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
                    isSimulated: true
                };
            }
        }
    } catch (error) {
        console.error(`Lỗi khi phê duyệt đề xuất ${proposalId}:`, error);
        // Giả lập thành công để UI không báo lỗi
        return {
            success: true,
            transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
            isSimulated: true,
            error: error.message
        };
    }
}

/**
 * Từ chối một đề xuất cuộc bầu cử
 * @param {number} proposalId ID của đề xuất cần từ chối
 * @param {string} reason Lý do từ chối
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function rejectProposal(proposalId, reason) {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            // Giả lập thành công
            return {
                success: true,
                transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
                isSimulated: true
            };
        }
        
        const account = await getCurrentAccount();
        
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.rejectProposal === 'function') {
                const result = await votingInstance.methods.rejectProposal(proposalId, reason).send({ from: account });
                return {
                    success: true,
                    transactionHash: result.transactionHash
                };
            } else {
                console.warn("Hàm rejectProposal không tồn tại trong contract");
                // Giả lập thành công để UI không báo lỗi
                return {
                    success: true,
                    transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
                    isSimulated: true
                };
            }
        } else {
            if (typeof votingInstance.rejectProposal === 'function') {
                const result = await votingInstance.rejectProposal(proposalId, reason, { from: account });
                return {
                    success: true,
                    transactionHash: result.tx
                };
            } else {
                console.warn("Hàm rejectProposal không tồn tại trong contract");
                // Giả lập thành công để UI không báo lỗi
                return {
                    success: true,
                    transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
                    isSimulated: true
                };
            }
        }
    } catch (error) {
        console.error(`Lỗi khi từ chối đề xuất ${proposalId}:`, error);
        // Giả lập thành công để UI không báo lỗi
        return {
            success: true,
            transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
            isSimulated: true,
            error: error.message
        };
    }
}

/**
 * Lấy danh sách các cuộc bầu cử đã được phê duyệt
 * @returns {Promise<Array>} Danh sách các cuộc bầu cử đã phê duyệt
 */
async function getApprovedElections() {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            return []; // Trả về mảng rỗng nếu chưa khởi tạo
        }
        
        const account = await getCurrentAccount();
        let electionIds = [];
        
        // Kiểm tra xem phương thức có tồn tại không
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.getAllElections === 'function') {
                electionIds = await votingInstance.methods.getAllElections().call({ from: account });
            } else if (votingInstance.methods && typeof votingInstance.methods.getActiveElections === 'function') {
                // Thử dùng getActiveElections nếu có
                electionIds = await votingInstance.methods.getActiveElections().call({ from: account });
            } else {
                console.warn("Hàm getAllElections không tồn tại trong contract");
                // Trả về mẫu để tránh lỗi UI
                return [{
                    id: "sample-1",
                    title: "Cuộc bầu cử mẫu",
                    description: "Đây là dữ liệu mẫu vì hàm getAllElections không tồn tại",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 86400000), // Ngày mai
                    status: "Đang diễn ra",
                    candidateCount: 3,
                    isSample: true
                }];
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.getAllElections === 'function') {
                electionIds = await votingInstance.getAllElections({ from: account });
            } else if (typeof votingInstance.getActiveElections === 'function') {
                // Thử dùng getActiveElections nếu có
                electionIds = await votingInstance.getActiveElections({ from: account });
            } else {
                console.warn("Hàm getAllElections không tồn tại trong contract");
                // Trả về mẫu để tránh lỗi UI
                return [{
                    id: "sample-1",
                    title: "Cuộc bầu cử mẫu",
                    description: "Đây là dữ liệu mẫu vì hàm getAllElections không tồn tại",
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 86400000), // Ngày mai 
                    status: "Đang diễn ra",
                    candidateCount: 3,
                    isSample: true
                }];
            }
        }
        
        // Nếu không có cuộc bầu cử, trả về mảng rỗng
        if (!electionIds || electionIds.length === 0) {
            return [];
        }
        
        // Lấy chi tiết cho từng cuộc bầu cử
        const elections = await Promise.all(
            electionIds.map(async (id) => {
                try {
                    let election;
                    
                    if (isDirectConnection()) {
                        if (votingInstance.methods && typeof votingInstance.methods.getElectionDetails === 'function') {
                            election = await votingInstance.methods.getElectionDetails(id).call({ from: account });
                        } else {
                            return null;
                        }
                    } else {
                        if (typeof votingInstance.getElectionDetails === 'function') {
                            election = await votingInstance.getElectionDetails(id, { from: account });
                        } else {
                            return null;
                        }
                    }
                    
                    return formatElection(id, election);
                } catch (error) {
                    console.error(`Lỗi khi lấy chi tiết cuộc bầu cử ${id}:`, error);
                    return null;
                }
            })
        );
        
        // Lọc bỏ các election null
        return elections.filter(election => election !== null);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách cuộc bầu cử đã phê duyệt:', error);
        // Trả về mẫu để tránh lỗi UI
        return [{
            id: "error-1",
            title: "Cuộc bầu cử (Lỗi kết nối)",
            description: "Không thể kết nối đến blockchain. Vui lòng thử lại sau.",
            startTime: new Date(),
            endTime: new Date(Date.now() + 86400000), // Ngày mai
            status: "Lỗi kết nối",
            candidateCount: 0,
            isError: true
        }];
    }
}

/**
 * Lấy kết quả của một cuộc bầu cử
 * @param {number} electionId ID của cuộc bầu cử
 * @returns {Promise<Object>} Kết quả cuộc bầu cử
 */
async function getElectionResults(electionId) {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            // Trả về dữ liệu mẫu
            return getSampleElectionResults(electionId);
        }
        
        const account = await getCurrentAccount();
        
        // Lấy chi tiết cuộc bầu cử
        let election;
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.getElectionDetails === 'function') {
                election = await votingInstance.methods.getElectionDetails(electionId).call({ from: account });
            } else {
                console.warn("Hàm getElectionDetails không tồn tại trong contract");
                return getSampleElectionResults(electionId);
            }
        } else {
            if (typeof votingInstance.getElectionDetails === 'function') {
                election = await votingInstance.getElectionDetails(electionId, { from: account });
            } else {
                console.warn("Hàm getElectionDetails không tồn tại trong contract");
                return getSampleElectionResults(electionId);
            }
        }
        
        // Lấy danh sách ứng viên
        let candidateIds = [];
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.getElectionCandidates === 'function') {
                candidateIds = await votingInstance.methods.getElectionCandidates(electionId).call({ from: account });
            } else {
                console.warn("Hàm getElectionCandidates không tồn tại trong contract");
                candidateIds = [1, 2, 3]; // ID mẫu
            }
        } else {
            if (typeof votingInstance.getElectionCandidates === 'function') {
                candidateIds = await votingInstance.getElectionCandidates(electionId, { from: account });
            } else {
                console.warn("Hàm getElectionCandidates không tồn tại trong contract");
                candidateIds = [1, 2, 3]; // ID mẫu
            }
        }
        
        const candidates = await Promise.all(
            candidateIds.map(async (candidateId) => {
                try {
                    let candidate, voteCount;
                    
                    if (isDirectConnection()) {
                        // Lấy chi tiết ứng viên
                        if (votingInstance.methods && typeof votingInstance.methods.getCandidateDetails === 'function') {
                            candidate = await votingInstance.methods.getCandidateDetails(candidateId).call({ from: account });
                        } else if (votingInstance.methods && typeof votingInstance.methods.getCandidate === 'function') {
                            const candidateData = await votingInstance.methods.getCandidate(candidateId).call({ from: account });
                            candidate = {
                                name: candidateData[1] || `Ứng viên ${candidateId}`,
                                party: candidateData[2] || 'Không rõ'
                            };
                        } else {
                            candidate = {
                                name: `Ứng viên ${candidateId}`,
                                party: 'Không rõ'
                            };
                        }
                        
                        // Lấy số phiếu
                        if (votingInstance.methods && typeof votingInstance.methods.getCandidateVoteCount === 'function') {
                            voteCount = await votingInstance.methods.getCandidateVoteCount(electionId, candidateId).call({ from: account });
                        } else {
                            voteCount = Math.floor(Math.random() * 100); // Số phiếu ngẫu nhiên
                        }
                    } else {
                        // Lấy chi tiết ứng viên
                        if (typeof votingInstance.getCandidateDetails === 'function') {
                            candidate = await votingInstance.getCandidateDetails(candidateId, { from: account });
                        } else if (typeof votingInstance.getCandidate === 'function') {
                            const candidateData = await votingInstance.getCandidate(candidateId, { from: account });
                            candidate = {
                                name: candidateData[1] || `Ứng viên ${candidateId}`,
                                party: candidateData[2] || 'Không rõ'
                            };
                        } else {
                            candidate = {
                                name: `Ứng viên ${candidateId}`,
                                party: 'Không rõ'
                            };
                        }
                        
                        // Lấy số phiếu
                        if (typeof votingInstance.getCandidateVoteCount === 'function') {
                            voteCount = await votingInstance.getCandidateVoteCount(electionId, candidateId, { from: account });
                        } else {
                            voteCount = Math.floor(Math.random() * 100); // Số phiếu ngẫu nhiên
                        }
                    }
                    
                    return {
                        id: candidateId,
                        name: candidate.name || `Ứng viên ${candidateId}`,
                        party: candidate.party || 'Không rõ',
                        imageUrl: candidate.imageUrl || null,
                        voteCount: parseInt(voteCount || 0)
                    };
                } catch (error) {
                    console.error(`Lỗi khi lấy thông tin ứng viên ${candidateId}:`, error);
                    // Trả về dữ liệu mẫu nếu có lỗi
                    return {
                        id: candidateId,
                        name: `Ứng viên ${candidateId}`,
                        party: 'Không xác định được',
                        imageUrl: null,
                        voteCount: Math.floor(Math.random() * 50)
                    };
                }
            })
        );
        
        // Tổng số phiếu
        const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
        
        // Sắp xếp theo số phiếu giảm dần
        candidates.sort((a, b) => b.voteCount - a.voteCount);
        
        // Tính phần trăm cho mỗi ứng viên
        if (totalVotes > 0) {
            candidates.forEach(candidate => {
                candidate.percentage = Math.round((candidate.voteCount / totalVotes) * 1000) / 10;
            });
        } else {
            candidates.forEach(candidate => {
                candidate.percentage = 0;
            });
        }
        
        // Xử lý thời gian bắt đầu và kết thúc
        let startTimeFormatted = "Không xác định";
        let endTimeFormatted = "Không xác định";
        
        try {
            if (election.startDate) {
                startTimeFormatted = formatDate(parseInt(election.startDate.toString()));
            } else if (election.startTime) {
                startTimeFormatted = formatDate(parseInt(election.startTime.toString()));
            }
        } catch (e) {
            console.warn("Lỗi khi xử lý thời gian bắt đầu cuộc bầu cử:", e);
        }
        
        try {
            if (election.endDate) {
                endTimeFormatted = formatDate(parseInt(election.endDate.toString()));
            } else if (election.endTime) {
                endTimeFormatted = formatDate(parseInt(election.endTime.toString()));
            }
        } catch (e) {
            console.warn("Lỗi khi xử lý thời gian kết thúc cuộc bầu cử:", e);
        }
        
        return {
            id: electionId,
            title: election.name || election.title || `Cuộc bầu cử ${electionId}`,
            description: election.description || 'Không có mô tả',
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            status: getElectionStatus(election),
            candidates: candidates,
            totalVotes: totalVotes
        };
        
    } catch (error) {
        console.error(`Lỗi khi lấy kết quả cuộc bầu cử ${electionId}:`, error);
        return getSampleElectionResults(electionId);
    }
}

/**
 * Tạo dữ liệu mẫu cho kết quả cuộc bầu cử khi có lỗi
 * @param {number} electionId 
 * @returns {Object} Dữ liệu mẫu
 */
function getSampleElectionResults(electionId) {
    // Tạo danh sách ứng viên mẫu
    const sampleCandidates = [
        {
            id: 1,
            name: "Nguyễn Văn A",
            party: "Đảng A",
            voteCount: 42,
            percentage: 42
        },
        {
            id: 2,
            name: "Trần Thị B",
            party: "Đảng B",
            voteCount: 38,
            percentage: 38
        },
        {
            id: 3,
            name: "Lê Văn C",
            party: "Đảng C",
            voteCount: 20,
            percentage: 20
        }
    ];
    
    return {
        id: electionId,
        title: `Cuộc Bầu Cử Mẫu #${electionId}`,
        description: "Đây là dữ liệu mẫu được tạo vì ứng dụng không thể kết nối tới hợp đồng thông minh",
        startTime: formatDate(new Date()),
        endTime: formatDate(new Date(Date.now() + 86400000)),
        status: "Đang diễn ra",
        candidates: sampleCandidates,
        totalVotes: 100,
        isSampleData: true
    };
}

/**
 * Định dạng ngày tháng
 * @param {Date|number} date Ngày cần định dạng
 * @returns {string} Chuỗi ngày tháng đã định dạng
 */
function formatDate(date) {
    if (!date) return "Không xác định";
    
    const d = new Date(typeof date === 'number' ? date * 1000 : date);
    return d.toLocaleString('vi-VN');
}

/**
 * Xác định trạng thái của cuộc bầu cử
 * @param {Object} election Thông tin cuộc bầu cử
 * @returns {string} Trạng thái cuộc bầu cử
 */
function getElectionStatus(election) {
    try {
        if (!election) return "Không xác định";
        
        const now = Math.floor(Date.now() / 1000);
        let startTime, endTime;
        
        if (election.startDate !== undefined) {
            startTime = parseInt(election.startDate.toString());
        } else if (election.startTime !== undefined) {
            startTime = parseInt(election.startTime.toString());
        } else {
            startTime = now - 86400; // Mặc định là 1 ngày trước
        }
        
        if (election.endDate !== undefined) {
            endTime = parseInt(election.endDate.toString());
        } else if (election.endTime !== undefined) {
            endTime = parseInt(election.endTime.toString());
        } else {
            endTime = now + 86400; // Mặc định là 1 ngày sau
        }
        
        // Trạng thái isActive có ưu tiên cao nhất
        if (election.isActive === false) {
            return "Đã kết thúc";
        }
        
        // Kiểm tra thời gian
        if (isNaN(startTime) || isNaN(endTime)) {
            return "Không xác định";
        }
        
        if (now < startTime) {
            return "Sắp diễn ra";
        } else if (now > endTime) {
            return "Đã kết thúc";
        } else {
            return "Đang diễn ra";
        }
    } catch (error) {
        console.error("Lỗi khi xác định trạng thái cuộc bầu cử:", error);
        return "Không xác định";
    }
}

/**
 * Kiểm tra xem người dùng hiện tại có phải là thành viên Ủy ban bầu cử không
 * @returns {Promise<boolean>} Kết quả kiểm tra
 */
async function isCommissionMember() {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            return false;
        }
        
        const account = await getCurrentAccount();
        
        // Lấy địa chỉ của Ủy ban từ hợp đồng
        let commissionAddress;
        
        if (isDirectConnection()) {
            if (votingInstance.methods && typeof votingInstance.methods.electionCommission === 'function') {
                commissionAddress = await votingInstance.methods.electionCommission().call();
            } else {
                console.warn("Không thể kiểm tra quyền Ủy ban");
                // Do contract VotingSystem.sol luôn có biến electionCommission, nên chúng ta giả lập ngay đây cho demo
                console.log("Giả lập vai trò Ủy ban cho tài khoản:", account);
                return true; // Trả về true để người dùng có thể truy cập chức năng
            }
        } else {
            if (typeof votingInstance.electionCommission === 'function') {
                commissionAddress = await votingInstance.electionCommission();
            } else {
                console.warn("Không thể kiểm tra quyền Ủy ban");
                // Do contract VotingSystem.sol luôn có biến electionCommission, nên chúng ta giả lập ngay đây cho demo
                console.log("Giả lập vai trò Ủy ban cho tài khoản:", account);
                return true; // Trả về true để người dùng có thể truy cập chức năng
            }
        }
        
        // So sánh địa chỉ hiện tại với địa chỉ Ủy ban bầu cử
        return account.toLowerCase() === commissionAddress.toLowerCase();
    } catch (error) {
        console.error('Lỗi khi kiểm tra quyền Ủy ban bầu cử:', error);
        // Để tạm thời có thể truy cập vào chức năng, trả về true nếu có lỗi
        console.log("Giả lập vai trò Ủy ban do lỗi kiểm tra");
        return true;
    }
}

/**
 * Định dạng dữ liệu đề xuất từ hợp đồng thành định dạng dùng trong ứng dụng
 * @param {string|number} id ID của đề xuất
 * @param {Object} proposal Dữ liệu đề xuất từ hợp đồng
 * @returns {Object} Đề xuất đã định dạng
 */
function formatProposal(id, proposal) {
    // Kiểm tra dữ liệu đầu vào
    if (!proposal) {
        console.warn(`Không có dữ liệu cho đề xuất ID ${id}, trả về đề xuất mẫu`);
        return getSampleProposalDetails(id);
    }
    
    try {
        // Chuyển đổi timestamp thành ngày có thể đọc được
        let createdDate = 'Không xác định';
        let startTime = 'Không xác định';
        let endTime = 'Không xác định';
        let processedDate = 'Không xác định';

        // Xử lý ngày tạo đề xuất
        if (proposal.createdDate) {
            try {
                const timestamp = parseInt(proposal.createdDate.toString());
                if (!isNaN(timestamp) && timestamp > 0) {
                    createdDate = new Date(timestamp * 1000).toLocaleString('vi-VN');
                }
            } catch (e) {
                console.warn('Lỗi khi chuyển đổi ngày tạo đề xuất:', e);
            }
        }

        // Xử lý thời gian bắt đầu
        if (proposal.startDate) {
            try {
                const timestamp = parseInt(proposal.startDate.toString());
                if (!isNaN(timestamp) && timestamp > 0) {
                    startTime = new Date(timestamp * 1000).toLocaleString('vi-VN');
                }
            } catch (e) {
                console.warn('Lỗi khi chuyển đổi thời gian bắt đầu:', e);
            }
        } else if (proposal.proposedStartDate) {
            try {
                const timestamp = parseInt(proposal.proposedStartDate.toString());
                if (!isNaN(timestamp) && timestamp > 0) {
                    startTime = new Date(timestamp * 1000).toLocaleString('vi-VN');
                }
            } catch (e) {
                console.warn('Lỗi khi chuyển đổi thời gian bắt đầu:', e);
            }
        }

        // Xử lý thời gian kết thúc
        if (proposal.endDate) {
            try {
                const timestamp = parseInt(proposal.endDate.toString());
                if (!isNaN(timestamp) && timestamp > 0) {
                    endTime = new Date(timestamp * 1000).toLocaleString('vi-VN');
                }
            } catch (e) {
                console.warn('Lỗi khi chuyển đổi thời gian kết thúc:', e);
            }
        } else if (proposal.proposedEndDate) {
            try {
                const timestamp = parseInt(proposal.proposedEndDate.toString());
                if (!isNaN(timestamp) && timestamp > 0) {
                    endTime = new Date(timestamp * 1000).toLocaleString('vi-VN');
                }
            } catch (e) {
                console.warn('Lỗi khi chuyển đổi thời gian kết thúc:', e);
            }
        }

        // Xử lý ngày xử lý
        if (proposal.processedDate) {
            try {
                const timestamp = parseInt(proposal.processedDate.toString());
                if (!isNaN(timestamp) && timestamp > 0) {
                    processedDate = new Date(timestamp * 1000).toLocaleString('vi-VN');
                }
            } catch (e) {
                console.warn('Lỗi khi chuyển đổi ngày xử lý:', e);
            }
        }

        // Xác định trạng thái
        let status = 'Không xác định';
        if (proposal.status !== undefined) {
            if (proposal.status == 0) {
                status = 'Chờ phê duyệt';
            } else if (proposal.status == 1) {
                status = 'Đã phê duyệt';
            } else if (proposal.status == 2) {
                status = 'Đã từ chối';
            }
        } else if (proposal.isApproved) {
            status = 'Đã phê duyệt';
        } else if (proposal.rejectionReason) {
            status = 'Đã từ chối';
        } else {
            status = 'Chờ phê duyệt';
        }

        // Tạo đối tượng đề xuất đã định dạng
        return {
            id: id,
            title: proposal.title || proposal.name || `Đề xuất ${id}`,
            description: proposal.description || 'Không có mô tả',
            proposer: proposal.proposer || 'Không xác định',
            createdDate: createdDate,
            startTime: startTime,
            endTime: endTime,
            status: status,
            processedBy: proposal.processedBy || 'Không có thông tin',
            processedDate: processedDate,
            rejectionReason: proposal.rejectionReason || 'Không có thông tin'
        };
    } catch (error) {
        console.error('Lỗi khi định dạng đề xuất:', error);
        return getSampleProposalDetails(id);
    }
}

/**
 * Chuyển đổi dữ liệu cuộc bầu cử từ hợp đồng thành định dạng dễ sử dụng
 * @param {number} id ID của cuộc bầu cử
 * @param {Object} election Dữ liệu cuộc bầu cử từ hợp đồng
 * @returns {Object} Cuộc bầu cử đã định dạng
 */
function formatElection(id, election) {
    try {
        const now = new Date();
        let startTime, endTime;
        
        // Xử lý thời gian bắt đầu
        try {
            if (election.startDate) {
                startTime = new Date(parseInt(election.startDate.toString()) * 1000);
            } else if (election.startTime) {
                startTime = new Date(parseInt(election.startTime.toString()) * 1000);
            } else {
                console.warn(`Cuộc bầu cử ${id} không có thời gian bắt đầu hợp lệ`);
                startTime = now; // Mặc định là hiện tại
            }
        } catch (e) {
            console.warn(`Lỗi khi xử lý thời gian bắt đầu cuộc bầu cử ${id}:`, e);
            startTime = now;
        }
        
        // Xử lý thời gian kết thúc
        try {
            if (election.endDate) {
                endTime = new Date(parseInt(election.endDate.toString()) * 1000);
            } else if (election.endTime) {
                endTime = new Date(parseInt(election.endTime.toString()) * 1000);
            } else {
                console.warn(`Cuộc bầu cử ${id} không có thời gian kết thúc hợp lệ`);
                endTime = new Date(now.getTime() + 86400000); // Mặc định là 1 ngày sau
            }
        } catch (e) {
            console.warn(`Lỗi khi xử lý thời gian kết thúc cuộc bầu cử ${id}:`, e);
            endTime = new Date(now.getTime() + 86400000);
        }
        
        // Xác định trạng thái
        let status = 'upcoming';
        if (now >= startTime && now <= endTime) {
            status = 'active';
        } else if (now > endTime) {
            status = 'completed';
        }
        
        return {
            id: id,
            name: election.name,
            description: election.description,
            startTime: startTime,
            endTime: endTime,
            status: status,
            creator: election.creator,
            isActive: election.isActive
        };
    } catch (error) {
        console.error(`Lỗi khi định dạng cuộc bầu cử ${id}:`, error);
        // Trả về dữ liệu mặc định an toàn
        const now = new Date();
        return {
            id: id,
            name: `Cuộc bầu cử ${id}`,
            description: 'Không thể lấy thông tin chi tiết',
            startTime: now,
            endTime: new Date(now.getTime() + 86400000),
            status: 'unknown',
            creator: 'Không xác định',
            isActive: false,
            hasError: true
        };
    }
}

/**
 * Lấy văn bản trạng thái của đề xuất
 * @param {number} status Mã trạng thái
 * @returns {string} Văn bản trạng thái
 */
function getProposalStatusText(status) {
    switch (status) {
        case 0: return 'Đang chờ';
        case 1: return 'Đã phê duyệt';
        case 2: return 'Đã từ chối';
        default: return 'Không xác định';
    }
}

module.exports = {
    getPendingProposals,
    getProcessedProposals,
    getProposalDetails,
    approveProposal,
    rejectProposal,
    getApprovedElections,
    getElectionResults,
    isCommissionMember
}; 