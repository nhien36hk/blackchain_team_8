/**
 * Voting Service - Quản lý chức năng bỏ phiếu
 * Hệ thống bầu cử phi tập trung
 */

const { getContractInstance, isDirectConnection, getVotingInstance } = require('./contract-service.js');
const { getCurrentAccount } = require('./account-service.js');

/**
 * Bỏ phiếu cho ứng cử viên trong một cuộc bầu cử cụ thể
 * @param {number} electionId ID của cuộc bầu cử
 * @param {number} candidateId ID của ứng cử viên
 * @returns {Promise<Object>} Kết quả giao dịch
 */
async function vote(electionId, candidateId) {
    try {
        if (!electionId || !candidateId) {
            throw new Error("Vui lòng chọn một cuộc bầu cử và ứng cử viên để bỏ phiếu.");
        }

        // Kiểm tra Metamask
        if (!window.ethereum) {
            throw new Error("Không tìm thấy Metamask. Vui lòng cài đặt Metamask để tiếp tục.");
        }

        // Hiển thị thông báo đang xử lý nếu có UI element
        if (document.getElementById("msg")) {
            document.getElementById("msg").innerHTML = "<p style='color: var(--accent-color);'>Đang xử lý, vui lòng chờ và xác nhận trong Metamask...</p>";
        }

        // Đảm bảo có kết nối tài khoản Metamask
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
            throw new Error("Không tìm thấy tài khoản Metamask. Vui lòng mở khóa ví Metamask.");
        }

        console.log("Tài khoản Metamask đã chọn:", accounts[0]);
        
        const votingInstance = getVotingInstance();
        
        if (!votingInstance) {
            throw new Error("Chưa khởi tạo hợp đồng");
        }
        
        // Thực hiện bỏ phiếu
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.vote === 'function') {
                const result = await votingInstance.methods.vote(
                    parseInt(electionId),
                    parseInt(candidateId)
                ).send({
                    from: accounts[0],
                    gas: 5000000
                });
                
                console.log("Kết quả bỏ phiếu thành công:", result);
                
                return {
                    success: true,
                    transactionHash: result.transactionHash
                };
            } else {
                console.warn("Hàm vote không tồn tại trong contract");
                throw new Error("Hàm bỏ phiếu không tồn tại trong hợp đồng. Vui lòng kiểm tra lại contract hoặc liên hệ quản trị viên.");
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.vote === 'function') {
                const result = await votingInstance.vote(
                    parseInt(electionId),
                    parseInt(candidateId),
                    {
                        from: accounts[0],
                        gas: 5000000
                    }
                );
                
                console.log("Kết quả bỏ phiếu thành công:", result);
                
                return {
                    success: true,
                    transactionHash: result.tx
                };
            } else {
                console.warn("Hàm vote không tồn tại trong contract");
                throw new Error("Hàm bỏ phiếu không tồn tại trong hợp đồng. Vui lòng kiểm tra lại contract hoặc liên hệ quản trị viên.");
            }
        }
    } catch (error) {
        console.error("Lỗi khi bỏ phiếu:", error);
        
        let errorMessage = "Lỗi không xác định: " + error.message;

        if (error.message.includes("gas")) {
            errorMessage = "Không đủ gas để thực hiện giao dịch. Vui lòng tăng giới hạn gas.";
        } else if (error.message.includes("rejected")) {
            errorMessage = "Giao dịch đã bị từ chối trên Metamask. Vui lòng thử lại.";
        } else if (error.message.includes("account")) {
            errorMessage = "Vấn đề về tài khoản Metamask. Vui lòng kiểm tra lại tài khoản đã được mở khóa.";
        } else if (error.message.includes("already voted")) {
            errorMessage = "Tài khoản này đã bỏ phiếu trong cuộc bầu cử này rồi.";
        } else if (error.message.includes("Returned values")) {
            errorMessage = "Lỗi khi truy vấn dữ liệu từ hợp đồng. Vui lòng kiểm tra lại kết nối mạng và cài đặt Metamask.";
        } else if (error.message.includes("cuộc bầu cử không hợp lệ")) {
            errorMessage = "Cuộc bầu cử không hợp lệ hoặc đã kết thúc.";
        } else if (error.message.includes("ứng viên không hợp lệ")) {
            errorMessage = "Ứng viên không hợp lệ hoặc không thuộc cuộc bầu cử này.";
        }

        throw new Error(errorMessage);
    }
}

/**
 * Kiểm tra xem người dùng đã bỏ phiếu trong cuộc bầu cử chưa
 * @param {number} electionId ID của cuộc bầu cử
 * @returns {Promise<boolean>} Kết quả kiểm tra (true nếu đã bỏ phiếu, false nếu chưa)
 */
async function hasVoted(electionId) {
    try {
        if (!electionId) {
            console.warn("ID cuộc bầu cử không được cung cấp");
            return false;
        }
        
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            return false;
        }
        
        const account = await getCurrentAccount();
        
        // Kiểm tra xem phương thức có tồn tại không
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.hasVoted === 'function') {
                return await votingInstance.methods.hasVoted(parseInt(electionId)).call({ from: account });
            } else {
                console.warn("Hàm hasVoted không tồn tại trong contract");
                return false;
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.hasVoted === 'function') {
                return await votingInstance.hasVoted(parseInt(electionId), { from: account });
            } else {
                console.warn("Hàm hasVoted không tồn tại trong contract");
                return false;
            }
        }
    } catch (error) {
        console.error(`Lỗi khi kiểm tra trạng thái bỏ phiếu cho cuộc bầu cử ${electionId}:`, error);
        return false;
    }
}

/**
 * Lấy lịch sử bỏ phiếu của người dùng hiện tại
 * @returns {Promise<Array>} Lịch sử bỏ phiếu
 */
async function getVotingHistory() {
    try {
        const votingInstance = getVotingInstance();
        if (!votingInstance) {
            console.warn("Chưa khởi tạo hợp đồng");
            return []; // Trả về mảng rỗng nếu chưa khởi tạo
        }
        
        const account = await getCurrentAccount();
        let votedElectionIds = [];
        
        // Kiểm tra xem phương thức có tồn tại không
        if (isDirectConnection()) {
            // Web3 trực tiếp
            if (votingInstance.methods && typeof votingInstance.methods.getVotedElections === 'function') {
                votedElectionIds = await votingInstance.methods.getVotedElections().call({ from: account });
            } else {
                console.warn("Hàm getVotedElections không tồn tại trong contract");
                // Trả về mảng rỗng khi hàm không tồn tại
                return [];
            }
        } else {
            // Truffle contract
            if (typeof votingInstance.getVotedElections === 'function') {
                votedElectionIds = await votingInstance.getVotedElections({ from: account });
            } else {
                console.warn("Hàm getVotedElections không tồn tại trong contract");
                // Trả về mảng rỗng khi hàm không tồn tại
                return [];
            }
        }
        
        // Nếu không có cuộc bầu cử đã bỏ phiếu, trả về mảng rỗng
        if (!votedElectionIds || votedElectionIds.length === 0) {
            return [];
        }
        
        // Lấy chi tiết cho từng cuộc bầu cử đã bỏ phiếu
        const votingHistory = await Promise.all(
            votedElectionIds.map(async (electionId) => {
                try {
                    let election, votedFor, candidate;
                    
                    if (isDirectConnection()) {
                        if (votingInstance.methods && typeof votingInstance.methods.getElectionDetails === 'function') {
                            election = await votingInstance.methods.getElectionDetails(electionId).call({ from: account });
                            
                            if (typeof votingInstance.methods.getVotedCandidate === 'function') {
                                votedFor = await votingInstance.methods.getVotedCandidate(electionId).call({ from: account });
                                
                                if (typeof votingInstance.methods.getCandidate === 'function') {
                                    candidate = await votingInstance.methods.getCandidate(votedFor).call({ from: account });
                                } else {
                                    candidate = ["0", "Không tìm thấy thông tin", ""];
                                }
                            } else {
                                votedFor = "0";
                                candidate = ["0", "Không tìm thấy thông tin", ""];
                            }
                        } else {
                            return null;
                        }
                    } else {
                        if (typeof votingInstance.getElectionDetails === 'function') {
                            election = await votingInstance.getElectionDetails(electionId, { from: account });
                            
                            if (typeof votingInstance.getVotedCandidate === 'function') {
                                votedFor = await votingInstance.getVotedCandidate(electionId, { from: account });
                                
                                if (typeof votingInstance.getCandidate === 'function') {
                                    candidate = await votingInstance.getCandidate(votedFor, { from: account });
                                } else {
                                    candidate = ["0", "Không tìm thấy thông tin", ""];
                                }
                            } else {
                                votedFor = "0";
                                candidate = ["0", "Không tìm thấy thông tin", ""];
                            }
                        } else {
                            return null;
                        }
                    }
                    
                    return {
                        electionId: parseInt(electionId),
                        electionName: election.name || "Cuộc bầu cử #" + electionId,
                        votedAt: election.voteTime ? new Date(parseInt(election.voteTime) * 1000) : new Date(),
                        candidateId: parseInt(votedFor),
                        candidateName: candidate[1],
                        candidateParty: candidate[2] || "Không có thông tin"
                    };
                } catch (error) {
                    console.error(`Lỗi khi lấy chi tiết cuộc bầu cử đã bỏ phiếu ${electionId}:`, error);
                    return null;
                }
            })
        );
        
        // Lọc bỏ các phần tử null
        return votingHistory.filter(vote => vote !== null);
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử bỏ phiếu:', error);
        return []; // Trả về mảng rỗng khi có lỗi
    }
}

module.exports = {
    vote,
    hasVoted,
    getVotingHistory,
    checkVote: hasVoted
}; 