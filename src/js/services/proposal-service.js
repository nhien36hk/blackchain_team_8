/**
 * Proposal Service - Quản lý đề xuất cuộc bầu cử
 * Hệ thống bầu cử phi tập trung
 */

const { getContractInstance, isDirectConnection, getVotingInstance } = require('./contract-service.js');
const { getCurrentAccount } = require('./account-service.js');

/**
 * Tạo một đề xuất cuộc bầu cử mới
 * @param {Object} proposalData Dữ liệu đề xuất
 * @param {string} proposalData.name Tên cuộc bầu cử
 * @param {string} proposalData.description Mô tả cuộc bầu cử
 * @param {Date} proposalData.startTime Thời gian bắt đầu
 * @param {Date} proposalData.endTime Thời gian kết thúc
 * @param {Array<number>} proposalData.candidateIds Danh sách ID ứng viên
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function createElectionProposal(proposalData) {
    try {
        const { name, description, startTime, endTime, candidateIds } = proposalData;
        
        // Chuyển đổi thời gian sang timestamp (seconds)
        const startTimestamp = Math.floor(startTime.getTime() / 1000);
        const endTimestamp = Math.floor(endTime.getTime() / 1000);
        
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            throw new Error("Chưa khởi tạo hợp đồng");
        }

        const account = await getCurrentAccount();
        let result;
        
        console.log("Đang tạo đề xuất với thông tin:");
        console.log("- Tên đề xuất:", name);
        console.log("- Mô tả:", description);
        console.log("- Thời gian bắt đầu:", new Date(startTimestamp * 1000).toLocaleString());
        console.log("- Thời gian kết thúc:", new Date(endTimestamp * 1000).toLocaleString());
        console.log("- Danh sách ứng viên:", candidateIds);
        console.log("- Tài khoản tạo đề xuất:", account);
        
        try {
            // Kiểm tra loại kết nối và gọi hàm phù hợp
            if (isDirectConnection()) {
                // Kết nối Web3 trực tiếp
                if (votingInstance.methods && typeof votingInstance.methods.createElectionProposal === 'function') {
                    result = await votingInstance.methods.createElectionProposal(
                        name,
                        description,
                        startTimestamp,
                        endTimestamp,
                        candidateIds
                    ).send({ 
                        from: account,
                        gas: 5000000,
                        gasPrice: '50000000000' // 50 Gwei, cố định thay vì sử dụng Web3.utils.toWei
                    });
                } else {
                    throw new Error("Hàm createElectionProposal không có sẵn trong hợp đồng");
                }
            } else {
                // Kết nối qua truffle-contract
                if (typeof votingInstance.createElectionProposal === 'function') {
                    result = await votingInstance.createElectionProposal(
                        name,
                        description,
                        startTimestamp,
                        endTimestamp,
                        candidateIds,
                        { 
                            from: account,
                            gas: 5000000 
                        }
                    );
                } else {
                    throw new Error("Hàm createElectionProposal không có sẵn trong hợp đồng");
                }
            }
            
            console.log("Kết quả tạo đề xuất:", result);
            
            return {
                success: true,
                transactionHash: result.tx || result.transactionHash,
                proposalId: result.logs && result.logs[0] ? result.logs[0].args.proposalId : 
                           (result.events && result.events.ProposalCreated ? result.events.ProposalCreated.returnValues.proposalId : null)
            };
        } catch (error) {
            // Xử lý lỗi quyền truy cập
            if (error.message && error.message.includes("revert")) {
                if (error.message.includes("onlyAdmin")) {
                    throw new Error("Bạn không có quyền admin để tạo đề xuất trực tiếp. Vui lòng liên hệ quản trị viên.");
                }
            }
            throw error;
        }
    } catch (error) {
        console.error('Lỗi khi tạo đề xuất cuộc bầu cử:', error);
        throw error;
    }
}

/**
 * Tạo đề xuất bầu cử (hàm wrapper cho createElectionProposal)
 * @param {string} title Tên cuộc bầu cử
 * @param {string} description Mô tả cuộc bầu cử
 * @param {number} startDate Thời gian bắt đầu (timestamp)
 * @param {number} endDate Thời gian kết thúc (timestamp)
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function createProposal(title, description, startDate, endDate) {
    try {
        // Tạo đối tượng Date từ timestamp
        const startTime = new Date(startDate * 1000);
        const endTime = new Date(endDate * 1000);
        
        console.log("Đang tạo đề xuất bầu cử với thông tin:");
        console.log("- Tiêu đề:", title);
        console.log("- Mô tả:", description);
        console.log("- Thời gian bắt đầu:", startTime.toLocaleString());
        console.log("- Thời gian kết thúc:", endTime.toLocaleString());
        
        // Lấy danh sách ứng viên đã chọn
        // Trong thực tế, danh sách ứng viên nên được chọn từ giao diện
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        const account = await getCurrentAccount();
        
        // Kiểm tra nếu người dùng là admin
        let isAdmin = false;
        
        try {
            if (isDirectConnection()) {
                if (votingInstance.methods && typeof votingInstance.methods.isAdmin === 'function') {
                    isAdmin = await votingInstance.methods.isAdmin(account).call();
                }
            } else {
                if (typeof votingInstance.isAdmin === 'function') {
                    isAdmin = await votingInstance.isAdmin(account);
                }
            }
        } catch (error) {
            console.warn("Không thể kiểm tra quyền admin:", error);
            // Tiếp tục với giả định là không phải admin
        }
        
        // if (!isAdmin) {
        //     // Nếu không phải admin, hiện thông báo và mô phỏng kết quả
        //     console.warn("Tài khoản không có quyền admin, chỉ admin mới có thể tạo đề xuất trực tiếp.");
        //     // Hiển thị thông báo cho người dùng
        //     alert("Chức năng tạo đề xuất chỉ dành cho quản trị viên. Đề xuất của bạn đã được ghi nhận và sẽ được chuyển đến quản trị viên xem xét.");
            
        //     // Trả về kết quả mô phỏng
        //     return {
        //         success: true,
        //         transactionHash: null,
        //         proposalId: null,
        //         note: "Đề xuất đã được ghi nhận và sẽ được chuyển đến quản trị viên."
        //     };
        // }
        
        // Nếu là admin, tiếp tục tạo đề xuất
        // Lấy danh sách ứng viên đã chọn (giả định là chọn tất cả)
        let candidateIds = [];
        
        // Thử lấy danh sách id của tất cả ứng viên
        try {
            let candidateCount = 0;
            
            if (isDirectConnection()) {
                if (votingInstance.methods && typeof votingInstance.methods.getCountCandidates === 'function') {
                    candidateCount = await votingInstance.methods.getCountCandidates().call({from: account});
                }
            } else {
                if (typeof votingInstance.getCountCandidates === 'function') {
                    candidateCount = await votingInstance.getCountCandidates({from: account});
                }
            }
            
            // Thêm tất cả ID ứng viên từ 1 đến candidateCount
            for (let i = 1; i <= candidateCount; i++) {
                candidateIds.push(i);
            }
        } catch (error) {
            console.warn("Không thể lấy danh sách ứng viên:", error);
            // Để mảng rỗng, sẽ hiển thị thông báo sau
        }
        
        if (candidateIds.length === 0) {
            console.warn("Không có ứng viên nào được chọn. Vui lòng thêm ít nhất một ứng viên.");
            alert("Vui lòng thêm ít nhất một ứng viên trước khi tạo đề xuất bầu cử.");
            throw new Error("Không có ứng viên nào được chọn");
        }
        
        // Gọi hàm tạo đề xuất
        return await createElectionProposal({
            name: title,
            description: description,
            startTime: startTime,
            endTime: endTime,
            candidateIds: candidateIds
        });
    } catch (error) {
        console.error('Lỗi khi tạo đề xuất bầu cử:', error);
        throw error;
    }
}

/**
 * Lấy tất cả các đề xuất được tạo bởi người dùng hiện tại
 * @returns {Promise<Array>} Danh sách các đề xuất
 */
async function getMyProposals() {
    try {
        const contract = await getContractInstance();
        const account = await getCurrentAccount();
        
        // Lấy ID các đề xuất của người dùng hiện tại
        const proposalIds = await contract.methods.getMyProposals().call({ from: account });
        
        // Lấy chi tiết cho từng đề xuất
        const proposals = await Promise.all(
            proposalIds.map(async (id) => {
                const proposal = await contract.methods.getProposalDetails(id).call({ from: account });
                return formatProposal(id, proposal);
            })
        );
        
        return proposals;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đề xuất của tôi:', error);
        throw error;
    }
}

/**
 * Lấy chi tiết của một đề xuất cụ thể
 * @param {number} proposalId ID của đề xuất
 * @returns {Promise<Object>} Chi tiết đề xuất
 */
async function getProposalDetails(proposalId) {
    try {
        const contract = await getContractInstance();
        const account = await getCurrentAccount();
        
        const proposal = await contract.methods.getProposalDetails(proposalId).call({ from: account });
        
        // Lấy danh sách các ứng viên trong đề xuất
        const candidateIds = await contract.methods.getProposalCandidates(proposalId).call({ from: account });
        const candidates = await Promise.all(
            candidateIds.map(async (candidateId) => {
                const candidate = await contract.methods.getCandidateDetails(candidateId).call({ from: account });
                return {
                    id: candidateId,
                    name: candidate.name,
                    party: candidate.party,
                    imageUrl: candidate.imageUrl
                };
            })
        );
        
        return {
            ...formatProposal(proposalId, proposal),
            candidates: candidates
        };
    } catch (error) {
        console.error(`Lỗi khi lấy chi tiết đề xuất ${proposalId}:`, error);
        throw error;
    }
}

/**
 * Hủy một đề xuất đang chờ phê duyệt
 * @param {number} proposalId ID của đề xuất cần hủy
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function cancelProposal(proposalId) {
    try {
        const contract = await getContractInstance();
        const account = await getCurrentAccount();
        
        const result = await contract.methods.cancelProposal(proposalId).send({ from: account });
        
        return {
            success: true,
            transactionHash: result.transactionHash
        };
    } catch (error) {
        console.error(`Lỗi khi hủy đề xuất ${proposalId}:`, error);
        throw error;
    }
}

/**
 * Chuyển đổi dữ liệu đề xuất từ hợp đồng thành định dạng dễ sử dụng
 * @param {number} id ID của đề xuất
 * @param {Object} proposal Dữ liệu đề xuất từ hợp đồng
 * @returns {Object} Đề xuất đã định dạng
 */
function formatProposal(id, proposal) {
    return {
        id: id,
        name: proposal.name,
        description: proposal.description,
        startTime: new Date(parseInt(proposal.startTime) * 1000),
        endTime: new Date(parseInt(proposal.endTime) * 1000),
        status: parseInt(proposal.status),
        statusText: getProposalStatusText(parseInt(proposal.status)),
        proposer: proposal.proposer,
        proposedAt: new Date(parseInt(proposal.proposedAt) * 1000),
        isApproved: proposal.isApproved,
        rejectionReason: proposal.rejectionReason || ''
    };
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

/**
 * Lấy tất cả các đề xuất bầu cử
 * @returns {Promise<Array>} Danh sách các đề xuất
 */
async function getAllProposals() {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        const account = await getCurrentAccount();
        let proposalIds = [];
        
        // Kiểm tra xem phương thức getPendingProposals có tồn tại không
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.getPendingProposals === 'function') {
                proposalIds = await votingInstance.methods.getPendingProposals().call({from: account});
            } else {
                console.warn("Hàm getPendingProposals không tồn tại trong contract");
                return []; // Trả về mảng rỗng
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.getPendingProposals === 'function') {
                proposalIds = await votingInstance.getPendingProposals({from: account});
            } else {
                console.warn("Hàm getPendingProposals không tồn tại trong contract");
                return []; // Trả về mảng rỗng
            }
        }

        // Chuyển đổi từ mảng thành danh sách các proposal
        const proposals = await Promise.all(
            proposalIds.map(async (id) => {
                try {
                    let proposalDetails;
                    
                    if (isDirectConnection()) {
                        if (votingInstance.methods && typeof votingInstance.methods.getProposalDetails === 'function') {
                            proposalDetails = await votingInstance.methods.getProposalDetails(id).call({from: account});
                        } else {
                            return null;
                        }
                    } else {
                        if (typeof votingInstance.getProposalDetails === 'function') {
                            proposalDetails = await votingInstance.getProposalDetails(id, {from: account});
                        } else {
                            return null;
                        }
                    }
                    
                    // Chuyển đổi dữ liệu từ hợp đồng sang định dạng dễ đọc
                    return {
                        id: id,
                        title: proposalDetails.name,
                        description: proposalDetails.description,
                        proposer: proposalDetails.proposer,
                        startDate: proposalDetails.startDate,
                        endDate: proposalDetails.endDate,
                        status: proposalDetails.isApproved ? 1 : 0,
                        rejectionReason: proposalDetails.rejectionReason
                    };
                } catch (error) {
                    console.error(`Lỗi khi lấy chi tiết đề xuất ${id}:`, error);
                    return null;
                }
            })
        );
        
        // Lọc bỏ các proposal null
        return proposals.filter(proposal => proposal !== null);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đề xuất:', error);
        throw error;
    }
}

/**
 * Rút lại đề xuất
 * @param {number} proposalId ID của đề xuất cần rút lại
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function withdrawProposal(proposalId) {
    try {
        // Kiểm tra xem hàm này có tồn tại không
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        const account = await getCurrentAccount();
        
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.withdrawProposal === 'function') {
                const result = await votingInstance.methods.withdrawProposal(proposalId).send({from: account});
                return {
                    success: true,
                    transactionHash: result.transactionHash
                };
            } else {
                console.warn("Hàm withdrawProposal không tồn tại trong contract");
                throw new Error("Chức năng rút lại đề xuất không được hỗ trợ trong phiên bản hiện tại");
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.withdrawProposal === 'function') {
                const result = await votingInstance.withdrawProposal(proposalId, {from: account});
                return {
                    success: true,
                    transactionHash: result.transactionHash
                };
            } else {
                console.warn("Hàm withdrawProposal không tồn tại trong contract");
                throw new Error("Chức năng rút lại đề xuất không được hỗ trợ trong phiên bản hiện tại");
            }
        }
    } catch (error) {
        console.error(`Lỗi khi rút lại đề xuất ${proposalId}:`, error);
        throw error;
    }
}

module.exports = {
    createElectionProposal,
    createProposal,
    getMyProposals,
    getProposalDetails,
    cancelProposal,
    getAllProposals,
    withdrawProposal
}; 