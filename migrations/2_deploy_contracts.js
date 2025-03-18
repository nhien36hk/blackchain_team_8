// Migration script để triển khai hợp đồng thông minh VotingSystem.sol
const Voting = artifacts.require("./Voting.sol");
const VotingSystem = artifacts.require("./VotingSystem.sol");

module.exports = function(deployer, network, accounts) {
  // Bỏ qua triển khai Voting.sol (phiên bản cũ)
  // deployer.deploy(Voting);
  
  // Triển khai VotingSystem.sol (phiên bản mới)
  deployer.deploy(VotingSystem)
    .then(async (instance) => {
      console.log(`VotingSystem đã được triển khai tại địa chỉ: ${instance.address}`);

      // Thiết lập ủy ban bầu cử (mặc định là người triển khai hợp đồng)
      if (network !== 'test') {
        // Trong môi trường không phải test, admin cũng là ủy ban bầu cử ban đầu
        console.log(`Admin (người triển khai): ${accounts[0]}`);
        console.log(`Ủy ban bầu cử ban đầu: ${accounts[0]}`);
      } else {
        // Trong môi trường test, thiết lập tài khoản thứ hai là ủy ban bầu cử
        if (accounts.length > 1) {
          await instance.setElectionCommission(accounts[1], { from: accounts[0] });
          console.log(`Admin (người triển khai): ${accounts[0]}`);
          console.log(`Ủy ban bầu cử: ${accounts[1]}`);
        }
      }
    })
    .catch(error => {
      console.error("Lỗi trong quá trình triển khai VotingSystem:", error);
    });
};
