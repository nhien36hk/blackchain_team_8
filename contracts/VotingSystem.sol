pragma solidity ^0.5.15;

contract VotingSystem {
    // Cấu trúc cho ứng cử viên
    struct Candidate {
        uint id;
        string name;
        string party;
        uint voteCount;
        uint isBelong; // 0: chưa thuộc đề xuất/cuộc bầu cử nào
        // 1-999999: thuộc cuộc bầu cử có ID tương ứng
        // >=1000000: thuộc đề xuất có ID = (giá trị - 1000000)
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
        mapping(address => uint) votedCandidate; // Lưu ID ứng viên đã bỏ phiếu của mỗi cử tri
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
        uint256 createdDate;      // Thời gian tạo đề xuất
        uint256 processedDate;    // Thời gian xử lý đề xuất (chấp nhận/từ chối)
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
    function addCandidate(
        string memory name,
        string memory party
    ) public onlyAdmin returns (uint) {
        countCandidates++;
        candidates[countCandidates] = Candidate(
            countCandidates,
            name,
            party,
            0,
            0
        );
        return countCandidates;
    }

    // Cập nhật thông tin ứng viên
    function updateCandidate(uint id, string memory name, string memory party) public onlyAdmin returns(bool) {
        // Kiểm tra xem ID có tồn tại
        require(id > 0 && id <= countCandidates, "ID ứng viên không hợp lệ");
        
        // Lưu lại số phiếu bầu
        uint voteCount = candidates[id].voteCount;
        
        // Cập nhật thông tin mới
        candidates[id] = Candidate(id, name, party, voteCount, 0);
        
        emit CandidateUpdated(id, name, party, msg.sender);
        
        return true;
    }

    // Lấy thông tin ứng viên
    function getCandidate(uint candidateId) public view returns (uint, string memory, string memory, uint, uint) {
        require(candidateId > 0 && candidateId <= countCandidates, "ID ứng viên không hợp lệ");
        Candidate memory candidate = candidates[candidateId];
        return (candidate.id, candidate.name, candidate.party, candidate.voteCount, candidate.isBelong);
    }

    // Lấy số lượng ứng viên
    function getCountCandidates() public view returns(uint) {
        return countCandidates;
    }

    // Lấy số lượng phiếu bầu của 1 ứng cử viên
    function getCandidateVoteCount(uint candidateId) public view returns (uint) {
        require(candidateId > 0 && candidateId <= countCandidates, "ID ứng viên không hợp lệ");
        Candidate memory candidate = candidates[candidateId];
        return candidate.voteCount;
    }

    // QUẢN LÝ ĐỀ XUẤT BẦU CỬ
    
    // Hàm tạo đề xuất (dành cho Admin)
   function createElectionProposal(
        string memory _name,
        string memory _description,
        uint256 _startDate,
        uint256 _endDate,
        uint[] memory _candidateIds
    ) public onlyAdmin returns(uint) {
        // Kiểm tra thời gian hợp lệ
        require(_endDate > _startDate, "Thời gian kết thúc phải sau thời gian bắt đầu");
        
        // Kiểm tra danh sách ứng viên hợp lệ
        for (uint i = 0; i < _candidateIds.length; i++) {
            uint candidateId = _candidateIds[i];
            require(candidateId > 0 && candidateId <= countCandidates, "ID ứng viên không hợp lệ");
            
            // Kiểm tra ứng viên chưa thuộc cuộc bầu cử/đề xuất nào
            require(candidates[candidateId].isBelong == 0, "Ứng viên đã thuộc cuộc bầu cử hoặc đề xuất khác");
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
            candidateIds: _candidateIds,
            createdDate: block.timestamp,
            processedDate: 0
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
        
        // Cập nhật thời gian xử lý
        proposal.processedDate = block.timestamp;
        
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
        
        // Cập nhật isBelong cho các ứng viên từ đề xuất -> cuộc bầu cử
        for (uint i = 0; i < proposal.candidateIds.length; i++) {
            uint candidateId = proposal.candidateIds[i];
            // Chỉ cập nhật nếu ứng viên vẫn thuộc đề xuất này
            if (candidates[candidateId].isBelong == _proposalId + 1000000) {
                candidates[candidateId].isBelong = newElectionId;
            }
        }
        
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
        
        // Cập nhật thời gian xử lý
        proposal.processedDate = block.timestamp;
        
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
                elections[i].startDate <= block.timestamp && 
                elections[i].endDate > block.timestamp) {
                activeCount++;
            }
        }
        
        // Tạo mảng chứa các ID cuộc bầu cử đang hoạt động
        uint[] memory activeElections = new uint[](activeCount);
        uint currentIndex = 0;
        
        for (uint i = 1; i <= countElections; i++) {
            if (elections[i].isActive && 
                elections[i].startDate <= block.timestamp && 
                elections[i].endDate > block.timestamp) {
                activeElections[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return activeElections;
    }
    
    // Lấy danh sách tất cả các cuộc bầu cử (bao gồm cả đã kết thúc)
    function getAllElections() public view returns (uint[] memory) {
        // Tạo mảng chứa tất cả ID cuộc bầu cử
        uint[] memory allElections = new uint[](countElections);
        
        // Lấy tất cả ID cuộc bầu cử từ 1 đến countElections
        for (uint i = 1; i <= countElections; i++) {
            allElections[i-1] = i;
        }
        
        return allElections;
    }
    
    // Kiểm tra xem người dùng đã bỏ phiếu trong cuộc bầu cử chưa
    function hasVoted(uint _electionId) public view returns (bool) {
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        return elections[_electionId].hasVoted[msg.sender];
    }
    
    // Lấy danh sách ID các cuộc bầu cử mà người dùng đã bỏ phiếu
    function getVotedElections() public view returns (uint[] memory) {
        uint votedCount = 0;
        
        // Đếm số cuộc bầu cử đã bỏ phiếu
        for (uint i = 1; i <= countElections; i++) {
            if (elections[i].hasVoted[msg.sender]) {
                votedCount++;
            }
        }
        
        // Tạo mảng kết quả
        uint[] memory votedElections = new uint[](votedCount);
        uint currentIndex = 0;
        
        // Lấy ID các cuộc bầu cử đã bỏ phiếu
        for (uint i = 1; i <= countElections; i++) {
            if (elections[i].hasVoted[msg.sender]) {
                votedElections[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return votedElections;
    }

    // Lấy ID ứng viên mà người dùng đã bỏ phiếu trong một cuộc bầu cử
    function getVotedCandidate(uint _electionId) public view returns (uint) {
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        require(elections[_electionId].hasVoted[msg.sender], "Bạn chưa bỏ phiếu trong cuộc bầu cử này");
        
        // Trả về ID ứng viên đã bỏ phiếu
        return elections[_electionId].votedCandidate[msg.sender];
    }

    // Bỏ phiếu trong cuộc bầu cử cụ thể
    function vote(uint _electionId, uint _candidateId) public {
        // Kiểm tra cuộc bầu cử hợp lệ
        require(_electionId > 0 && _electionId <= countElections, "ID cuộc bầu cử không hợp lệ");
        Election storage election = elections[_electionId];
        
        // Kiểm tra cuộc bầu cử đang diễn ra
        require(election.isActive, "Cuộc bầu cử không hoạt động");
        require(election.startDate <= block.timestamp, "Cuộc bầu cử chưa bắt đầu");
        require(election.endDate > block.timestamp, "Cuộc bầu cử đã kết thúc");
        
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
        
        // Đánh dấu đã bỏ phiếu và lưu ID ứng viên đã chọn
        election.hasVoted[msg.sender] = true;
        election.votedCandidate[msg.sender] = _candidateId;
        
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

    // Lấy danh sách ID của các ứng cử viên có sẵn (chưa thuộc cuộc bầu cử/đề xuất nào)
    function getAvailableCandidates() public view returns (uint[] memory) {
        // Đếm số lượng ứng cử viên có sẵn
        uint availableCount = 0;
        for (uint i = 1; i <= countCandidates; i++) {
            if (candidates[i].isBelong == 0) {
                availableCount++;
            }
        }
        
        // Tạo mảng kết quả
        uint[] memory availableCandidates = new uint[](availableCount);
        uint currentIndex = 0;
        
        // Lấy ID các ứng cử viên có sẵn
        for (uint i = 1; i <= countCandidates; i++) {
            if (candidates[i].isBelong == 0) {
                availableCandidates[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return availableCandidates;
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
            // isApproved == false chưa được xử lý || rejectionReason chưa có lý do
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
        uint candidateCount,
        uint256 createdDate,
        uint256 processedDate
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
            proposal.candidateIds.length,
            proposal.createdDate,
            proposal.processedDate
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
        require((votingEnd == 0) && (votingStart == 0) && (_startDate + 1000000 > block.timestamp) && (_endDate > _startDate), 
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