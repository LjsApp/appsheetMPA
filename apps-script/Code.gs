function doGet(e) {
  // CORS handled by GAS automatically for Web Apps if deployed correctly, 
  // but we return JSON for GET requests.
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  try {
    let action = e.parameter.action;
    let data = e.postData ? JSON.parse(e.postData.contents) : {};
    
    // Pass to router
    let response = routeRequest(action, method, data, e.parameter);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: response
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Jalankan fungsi ini SEKALI di GAS Editor untuk mengotorisasi akses Google Drive
// Setelah berhasil diotorisasi, fungsi ini bisa dihapus
function testDriveAccess() {
  DriveApp.getRootFolder();
  Logger.log("✅ Drive access berhasil diotorisasi!");
}
