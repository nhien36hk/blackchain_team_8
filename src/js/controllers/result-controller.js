/**
 * Controller quản lý hiển thị và tương tác với phần kết quả bầu cử
 */

const { getAllElections, getElectionResults, finalizeElection, publishElectionResults } = require('../services/election-service');

// Khởi tạo controller
function initResultController() {
}

// Xuất module
module.exports = {
  initResultController,
}; 