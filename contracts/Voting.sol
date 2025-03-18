pragma solidity ^0.5.15;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        string party; 
        uint voteCount;
    }

    // Danh sách ứng cử viên 
    mapping (uint => Candidate) public candidates;

    // Danh sách bỏ phiếu đã bỏ => true ngược lại false
    mapping (address => bool) public voters;

    // Số lượng ứng cử viên uint
    uint public countCandidates;

    // Thời điểm kết thúc bỏ phiếu
    uint256 public votingEnd;

    // Thời điểm bắt đầu bỏ phiếu
    uint256 public votingStart;
    
    // Địa chỉ người quản trị
    address public admin;
    
    // Constructor để thiết lập người quản trị
    constructor() public {
        admin = msg.sender;
    }
    
    // Modifier để giới hạn quyền quản trị
    modifier onlyAdmin() {
        require(msg.sender == admin, "Chỉ quản trị viên mới có quyền thực hiện thao tác này");
        _;
    }

    // Thêm ứng cử viên
    function addCandidate(string memory name, string memory party) public onlyAdmin returns(uint) {
        countCandidates++;
        candidates[countCandidates] = Candidate(countCandidates, name, party, 0);
        return countCandidates;
    }
    
    // Cập nhật thông tin ứng cử viên
    function updateCandidate(uint id, string memory name, string memory party) public onlyAdmin returns(bool) {
        // Kiểm tra xem ID có tồn tại
        require(id > 0 && id <= countCandidates, "ID ứng cử viên không hợp lệ");
        
        // Lưu lại số phiếu bầu
        uint voteCount = candidates[id].voteCount;
        
        // Cập nhật thông tin mới
        candidates[id] = Candidate(id, name, party, voteCount);
        
        return true;
    }
    
    // Xóa ứng cử viên
    function deleteCandidate(uint id) public onlyAdmin returns(bool) {
        // Kiểm tra xem ID có tồn tại
        require(id > 0 && id <= countCandidates, "ID ứng cử viên không hợp lệ");
        
        // Không thể xóa ứng cử viên đã có người bỏ phiếu
        require(candidates[id].voteCount == 0, "Không thể xóa ứng cử viên đã có người bỏ phiếu");
        
        // Nếu xóa ID cuối cùng, chỉ cần giảm bộ đếm
        if (id == countCandidates) {
            delete candidates[id];
            countCandidates--;
            return true;
        }
        
        // Nếu xóa ID ở giữa, cần dịch chuyển tất cả ứng cử viên phía sau lên
        for (uint i = id; i < countCandidates; i++) {
            candidates[i] = candidates[i+1];
            candidates[i].id = i; // Cập nhật lại ID
        }
        
        // Xóa ứng cử viên cuối cùng và giảm bộ đếm
        delete candidates[countCandidates];
        countCandidates--;
        
        return true;
    }
   
    // Vote ứng cử viên
    function vote(uint candidateID) public {
       // Kiểm tra thời gian bỏ phiếu hợp lệ
       require((votingStart <= now) && (votingEnd > now));
       
       // Kiểm tra ID ứng cử viên hợp lệ
       require(candidateID > 0 && candidateID <= countCandidates);

       // Kiểm tra người dùng chưa bỏ phiếu
       require(!voters[msg.sender]);
              
       // Đánh dấu người dùng đã bỏ phiếu
       voters[msg.sender] = true;
       
       // Tăng số phiếu cho ứng cử viên
       candidates[candidateID].voteCount ++;      
    }
    
    function checkVote() public view returns(bool){
        return voters[msg.sender];
    }
       
    // Lấy số lượng ứng cử viên
    function getCountCandidates() public view returns(uint) {
        return countCandidates;
    }

    // Lấy thông tin chi tiết 1 ứng cử viên
    function getCandidate(uint candidateID) public view returns (uint,string memory, string memory,uint) {
        return (candidateID,candidates[candidateID].name,candidates[candidateID].party,candidates[candidateID].voteCount);
    }

    function setDates(uint256 _startDate, uint256 _endDate) public onlyAdmin {
        require((votingEnd == 0) && (votingStart == 0) && (_startDate + 1000000 > now) && (_endDate > _startDate));
        votingEnd = _endDate;
        votingStart = _startDate;
    }

    function getDates() public view returns (uint256,uint256) {
      return (votingStart,votingEnd);
    }
}
