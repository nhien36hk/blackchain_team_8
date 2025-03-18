// Hàm định dạng ngày theo kiểu Việt Nam
function formatVietnameseDate(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  
  // Thêm số 0 phía trước nếu cần
  day = (day < 10) ? '0' + day : day;
  month = (month < 10) ? '0' + month : month;
  
  return day + '/' + month + '/' + year;
}

module.exports = {
  formatVietnameseDate
}; 