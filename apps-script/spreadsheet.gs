/**
 * Helper functions to interact with Google Sheets
 */

const getSheet = (sheetName) => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

const getRecords = (sheetName) => {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      let val = row[i];
      if ((header === 'dt_kc' || header === 'dt_vk') && typeof val === 'string' && val.indexOf("'") === 0) {
        val = val.substring(1);
      }
      obj[header] = val;
    });
    return obj;
  });
}

const addRecord = (sheetName, record) => {
  const sheet = getSheet(sheetName);
  let lastCol = sheet.getLastColumn();
  
  // Auto-generate headers if sheet is completely empty
  if (lastCol === 0) {
    const newHeaders = Object.keys(record);
    if (newHeaders.length === 0) return record;
    sheet.appendRow(newHeaders);
    lastCol = newHeaders.length;
  }
  
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Check for new columns
  const recordKeys = Object.keys(record);
  const newCols = recordKeys.filter(k => headers.indexOf(k) === -1);
  if (newCols.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, newCols.length).setValues([newCols]);
    headers = headers.concat(newCols);
    lastCol = headers.length;
  }
  
  const newRow = headers.map(header => {
    let val = record[header] !== undefined ? record[header] : "";
    if ((header === 'dt_kc' || header === 'dt_vk') && val) val = "'" + val;
    return val;
  });
  sheet.appendRow(newRow);
  return record;
}

const updateRecord = (sheetName, idField, record) => {
  const sheet = getSheet(sheetName);
  let lastCol = sheet.getLastColumn();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) throw new Error("No data found to update");
  
  let headers = data[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) throw new Error(`ID field ${idField} not found in headers`);
  
  const recordId = record[idField];
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === recordId) {
      rowIndex = i + 1; // 1-based index for Google Sheets API
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error(`Record with ${idField}=${recordId} not found`);
  
  // Check for new columns
  const recordKeys = Object.keys(record);
  const newCols = recordKeys.filter(k => headers.indexOf(k) === -1);
  if (newCols.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, newCols.length).setValues([newCols]);
    headers = headers.concat(newCols);
    lastCol = headers.length;
  }
  
  // Refresh existing row in case new columns were added (though it will just be undefined/empty)
  // We need to fetch the row again from the sheet because data array doesn't have the new cols
  const existingRow = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
  
  const updatedRow = headers.map((header, i) => {
    let val = record.hasOwnProperty(header) ? record[header] : existingRow[i];
    if ((header === 'dt_kc' || header === 'dt_vk') && val && String(val).indexOf("'") !== 0) val = "'" + val;
    return val;
  });
  
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
  return record;
}

const deleteRecord = (sheetName, idField, idValue) => {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  
  const headers = data[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) throw new Error(`ID field ${idField} not found in headers`);
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === idValue) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex);
    return true;
  }
  
  return false;
}
