pragma solidity ^0.5.15;

contract VotingSystem {
    // Cấu trúc cho ứng cử viên
    struct Candidate {
        uint id;
        string name;
        string party; 
        uint voteCount;
        uint isBelong;// 0: chưa thuộc đề xuất/cuộc bầu cử nào
                   // 1-999999: thuộc cuộc bầu cử có ID tương ứng
                   // >=1000000: thuộc đề xuất có ID = (giá trị - 1000000)
        uint electionId; // ID của cuộc bầu cử mà ứng viên tham gia, 0 nếu chưa tham gia cuộc bầu cử nào
    }

    // Cấu trúc cho một cuộc bầu cử
    struct Election {
        uint id;
        string name;
        string description;
        address creator;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
        uint[] candidateIds; // Danh sách ID các ứng viên trong cuộc bầu cử này
        mapping(address => bool) hasVoted; // Lưu trạng thái đã bỏ phiếu của cử tri
    }

    // Cấu trúc cho đề xuất bầu cử
    struct ElectionProposal {
        uint id;
        string name;
        string description;
        address proposer;
        uint256 proposedStartDate;
        uint256 proposedEndDate;
        bool isApproved;
        string rejectionReason;
        uint[] candidateIds;
    }

        // Các biến lưu trữ
        mapping(uint => Candidate) public candidates;
        uint public countCandidates;

    mapping(uint => Election) public elections;
    uint public countElections;

    mapping(uint => ElectionProposal) public proposals;
    uint public proposalCount;

    // Địa chỉ của Admin và Ủy ban bầu cử
    address public admin;
    address public electionCommission;
    
    // Biến lưu trữ thời gian bỏ phiếu chung (cho tương thích với Voting.sol cũ)
    uint256 public votingStart;
    uint256 public votingEnd;

    // Sự kiện
    event ProposalCreated(uint proposalId, address proposer);
    event ProposalApproved(uint proposalId, address approver);
    event ProposalRejected(uint proposalId, address rejector, string reason);
    event ElectionCreated(uint electionId, string name, uint256 startDate, uint256 endDate);
    event VoteCast(uint electionId, address voter, uint candidateId);
    event CandidateUpdated(uint candidateId, string name, string party, address updater);

    // Constructor
    constructor() public {
        admin = msg.sender;
        electionCommission = msg.sender; // Ban đầu có thể set là admin, sau đó thay đổi
    }

    // Modifier
    modifier onlyAdmin() {
        require(msg.sender == admin, "Chỉ quản trị viên mới có quyền thực hiện thao tác này");
        _;
    }

    modifier onlyCommission() {
        require(msg.sender == electionCommission, "Chỉ Ủy ban bầu cử mới có quyền thực hiện thao tác này");
        _;
    }

    // Hàm thay đổi địa chỉ Ủy ban bầu cử
    function setElectionCommission(address _newCommission) public onlyAdmin {
        electionCommission = _newCommission;
    }

    // QUẢN LÝ ỨNG VIÊN
    
    // Thêm ứng viên
    function addCandidate(string memory name, string memory party) public onlyAdmin returns(uint) {
        countCandidates++;
        candidates[countCandidates] = Candidate(countCandidates, name, party, 0);
        return countCandidates;
    }

    // Lấy thông tin ứng viên
    function getCandidate(uint candidateId) public view returns (uint, string memory, string memory, uint, uint) {
        require(candidateId > 0 && candidateId <= countCandidates, "ID ứng viên không hợp lệ");
        Candidate memory candidate = candidates[candidateId];
        return (candidate.id, candidate.name, candidate.party, candidate.voteCount, candidate.electionId);
    }

    // Lấy số lượng ứng viên
    function getCountCandidates() public view returns(uint) {
        return countCandidates;
    }

    // QUẢN LÝ ĐỀ XUẤT BẦU CỬ
    
    // Hàm tạo đề xuất (dành cho Admin)
    // Lấy danh sách ứng viên chưa thuộc cuộc bầu cử nào
    function getAvailableCandidates() public view returns(uint[] memory) {
        uint count = 0;
        for(uint i = 1; i <= countCandidates; i++) {
            if(candidates[i].electionId == 0) {
                count++;
            }
        }
        
        uint[] memory availableCandidates = new uint[](count);
        uint index = 0;
        for(uint i = 1; i <= countCandidates; i++) {
            if(candidates[i].electionId == 0) {
                availableCandidates[index] = i;
                index++;
            }
        }
        return availableCandidates;
    }

    function createElectionProposal(
    string memory _name,
    string memory _description,
    uint256 _startDate,
    uint256 _endDate,
    uint[] memory _candidateIds
    ) public onlyAdmin returns(uint) {
        // Kiểm tra thời gian hợp lệ
        require(_endDate > _startDate, "Thời gian kết thúc phải sau thời gian bắt đầu");
        
        // Kiểm tra danh sách ứng viên hợp lệ và chưa thuộc cuộc bầu cử nào
        for (uint i = 0; i < _candidateIds.length; i++) {
            require(_candidateIds[i] > 0 && _candidateIds[i] <= countCandidates, "ID ứng viên không hợp lệ");
        }
        
        proposalCount++;
        proposals[proposalCount] = ElectionProposal({
            id: proposalCount,
            name: _name,
            description: _description,
            proposer: msg.sender,
            proposedStartDate: _startDate,
            proposedEndDate: _endDate,
            isApproved: false,
            rejectionReason: "",
            candidateIds: _candidateIds
        });
        
        // Đánh dấu ứng viên đang trong đề xuất (ID đề xuất + 1000000)
        for (uint i = 0; i < _candidateIds.length; i++) {
           uint candidateId = _candidateIds[i];
           candidates[candidateId].isBelong = proposalCount + 1000000;
        }
        
        emit ProposalCreated(proposalCount, msg.sender);
        return proposalCount;
    }

    // Hàm phê duyệt đề xuất (dành cho Ủy ban)
    function approveProposal(uint _proposalId) public onlyCommission {
        require(_proposalId > 0 && _proposalId <= proposalCount, "ID đề xuất không hợp lệ");
        ElectionProposal storage proposal = proposals[_proposalId];
        require(!proposal.isApproved, "Đề xuất đã được phê duyệt trước đó");
        
        proposal.isApproved = true;
        
        // Tạo cuộc bầu cử mới từ đề xuất đã được phê duyệt
        countElections++;
        uint newElectionId = countElections;
        
        elections[newElectionId].id = newElectionId;
        elections[newElectionId].name = proposal.name;
        elections[newElectionId].description = proposal.description;
        elections[newElectionId].creator = proposal.proposer;
        elections[newElectionId].startDate = proposal.proposedStartDate;
        elections[newElectionId].endDate = proposal.proposedEndDate;
        elections[newElectionId].isActive = true;
        elections[newElectionId].candidateIds = proposal.candidateIds;
        
        emit ProposalApproved(_proposalId, msg.sender);
        emit ElectionCreated(
            newElectionId, 
            proposal.name, 
            proposal.proposedStartDate, 
            proposal.proposedEndDate
        );
    }

    // Hàm từ chối đề xuất (dành cho Ủy ban)
    function rejectProposal(uint _proposalId, string memory _reason) public onlyCommission {
        require(_proposalId > 0 && _proposalId <= proposalCount, "ID đề xuất không hợp lệ");
        ElectionProposal storage proposal = proposals[_proposalId];
        require(!proposal.isApproved, "Đề xuất đã được phê duyệt trước đó");
        
        proposal.rejectionReason = _reason;
        
        // Giải phóng các ứng viên thuộc đề xuất bị từ chối
        for (uint i = 0; i < proposal.candidateIds.length; i++) {
            uint candidateId = proposal.candidateIds[i];
            // Chỉ giải phóng nếu ứng viên vẫn thuộc đề xuất này
            if (candidates[candidateId].isBelong == _proposalId + 1000000) {
                candidates[candidateId].isBelong = 0;
            }
        }
        
        emit ProposalRejected(_proposalId, msg.sender, _reason);
    }

    // QUẢN LÝ BẦU CỬ & BỎ PHIẾU
    
    // Lấy danh sách tất cả các cuộc bầu cử hiện tại
    function getActiveElections() public view returns (uint[] memory) {
        // Đếm số lượng cuộc bầu cử đang hoạt động
        uint activeCount = 0;
        for (uint i = 1; i <= countElections; i++) {
            if (elections[i].isActive && 
                elections[i].startDate <= now && 
                elections[i].endDate > now) {
                activeCount++;
            }
        }
        
        // Tạo mảng chứa các ID cuộc bầu cử đang hoạt động
        uint[] memory activeElections = new uint[](activeCount);
        uint currentIndex = 0;
        
        for (uint i = 1; i <= countElections; i++) {
            if (elections[i].isActive && 
                elections[i].startDate <= now && 
                elections[i].endDate > now) {
                activeElections[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return activeElections;
    }
    
    // Kiểm tra xem người dùng đã bỏ phiếu trong cuộc bầu cử chưa
    function hasVoted(uint _electionId) public view returns (bool) {
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        return elections[_electionId].hasVoted[msg.sender];
    }
    
    // Bỏ phiếu trong cuộc bầu cử cụ thể
    function vote(uint _electionId, uint _candidateId) public {
        // Kiểm tra cuộc bầu cử hợp lệ
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        Election storage election = elections[_electionId];
        
        // Kiểm tra cuộc bầu cử đang diễn ra
        require(election.isActive, "Cuộc bầu cử không hoạt động");
        require(election.startDate <= now, "Cuộc bầu cử chưa bắt đầu");
        require(election.endDate > now, "Cuộc bầu cử đã kết thúc");
        
        // Kiểm tra người dùng chưa bỏ phiếu
        require(!election.hasVoted[msg.sender], "Bạn đã bỏ phiếu trong cuộc bầu cử này");
        
        // Kiểm tra ứng viên hợp lệ và thuộc cuộc bầu cử này
        bool isValidCandidate = false;
        for (uint i = 0; i < election.candidateIds.length; i++) {
            if (election.candidateIds[i] == _candidateId) {
                isValidCandidate = true;
                break;
            }
        }
        require(isValidCandidate, "Ứng viên không thuộc cuộc bầu cử này");
        
        // Đánh dấu đã bỏ phiếu
        election.hasVoted[msg.sender] = true;
        
        // Tăng số phiếu cho ứng viên
        candidates[_candidateId].voteCount++;
        
        emit VoteCast(_electionId, msg.sender, _candidateId);
    }
    
    // Lấy thông tin chi tiết về cuộc bầu cử
    function getElectionDetails(uint _electionId) public view returns (
        uint id,
        string memory name,
        string memory description,
        uint256 startDate,
        uint256 endDate,
        bool isActive,
        uint candidateCount
    ) {
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        Election storage election = elections[_electionId];
        
        return (
            election.id,
            election.name,
            election.description,
            election.startDate,
            election.endDate,
            election.isActive,
            election.candidateIds.length
        );
    }
    
    // Lấy danh sách ứng viên trong cuộc bầu cử
    function getElectionCandidates(uint _electionId) public view returns (uint[] memory) {
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        return elections[_electionId].candidateIds;
    }

    // Kết thúc cuộc bầu cử (có thể thực hiện thủ công nếu cần)
    function endElection(uint _electionId) public onlyAdmin {
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        elections[_electionId].isActive = false;
        
        // Giải phóng các ứng viên sau khi cuộc bầu cử kết thúc
        uint[] memory electionCandidates = elections[_electionId].candidateIds;
        for (uint i = 0; i < electionCandidates.length; i++) {
            uint candidateId = electionCandidates[i];
            // Chỉ giải phóng nếu ứng viên vẫn thuộc cuộc bầu cử này
            if (candidates[candidateId].isBelong == _electionId) {
                candidates[candidateId].isBelong = 0;
            }
        }
    }
    
    // Lấy tất cả đề xuất chờ phê duyệt
    function getPendingProposals() public view returns (uint[] memory) {
        uint pendingCount = 0;
        
        // Đếm số đề xuất đang chờ
        for (uint i = 1; i <= proposalCount; i++) {
            if (!proposals[i].isApproved && bytes(proposals[i].rejectionReason).length == 0) {
                pendingCount++;
            }
        }
        
        // Tạo mảng kết quả
        uint[] memory pendingProposals = new uint[](pendingCount);
        uint currentIndex = 0;
        
        // Lấy các ID đề xuất đang chờ
        for (uint i = 1; i <= proposalCount; i++) {
            if (!proposals[i].isApproved && bytes(proposals[i].rejectionReason).length == 0) {
                pendingProposals[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return pendingProposals;
    }
    
    // Lấy chi tiết đề xuất
    function getProposalDetails(uint _proposalId) public view returns (
        uint id,
        string memory name,
        string memory description,
        address proposer,
        uint256 startDate,
        uint256 endDate,
        bool isApproved,
        string memory rejectionReason,
        uint candidateCount
    ) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "ID đề xuất không hợp lệ");
        ElectionProposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.id,
            proposal.name,
            proposal.description,
            proposal.proposer,
            proposal.proposedStartDate,
            proposal.proposedEndDate,
            proposal.isApproved,
            proposal.rejectionReason,
            proposal.candidateIds.length
        );
    }
    
    // Lấy danh sách ứng viên trong đề xuất
    function getProposalCandidates(uint _proposalId) public view returns (uint[] memory) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "ID đề xuất không hợp lệ");
        return proposals[_proposalId].candidateIds;
    }

    // Lấy ngày bắt đầu và kết thúc bỏ phiếu (cho tương thích với Voting.sol cũ)
    function getDates() public view returns (uint256,uint256) {
        return (votingStart, votingEnd);
    }

    // Thiết lập ngày bắt đầu và kết thúc bỏ phiếu (cho tương thích với Voting.sol cũ)
    function setDates(uint256 _startDate, uint256 _endDate) public onlyAdmin {
        require((votingEnd == 0) && (votingStart == 0) && (_startDate + 1000000 > now) && (_endDate > _startDate), 
                "Điều kiện cài đặt ngày không hợp lệ");
        votingEnd = _endDate;
        votingStart = _startDate;
    }
    
    // Xóa ứng viên (cho tương thích với Voting.sol cũ)
    function deleteCandidate(uint id) public onlyAdmin returns(bool) {
        // Kiểm tra xem ID có tồn tại
        require(id > 0 && id <= countCandidates, "ID ứng viên không hợp lệ");
        
        // Không thể xóa ứng viên đã có người bỏ phiếu
        require(candidates[id].voteCount == 0, "Không thể xóa ứng viên đã có người bỏ phiếu");
        
        // Nếu xóa ID cuối cùng, chỉ cần giảm bộ đếm
        if (id == countCandidates) {
            delete candidates[id];
            countCandidates--;
            return true;
        }
        
        // Nếu xóa ID ở giữa, cần dịch chuyển tất cả ứng viên phía sau lên
        for (uint i = id; i < countCandidates; i++) {
            candidates[i] = candidates[i+1];
            candidates[i].id = i; // Cập nhật lại ID
        }
        
        // Xóa ứng viên cuối cùng và giảm bộ đếm
        delete candidates[countCandidates];
        countCandidates--;
        
        return true;
    }
} 