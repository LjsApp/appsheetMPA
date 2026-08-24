function routeRequest(action, method, body, params) {
  switch (action) {
    // Customers
    case 'getCustomers':
      return getRecords('customers');
    case 'saveCustomer':
      if (body.id) {
        try { return updateRecord('customers', 'id', body); }
        catch (e) { return addRecord('customers', body); }
      }
      return addRecord('customers', body);
    case 'deleteCustomer':
      return deleteRecord('customers', 'id', body.id);

    // PICs
    case 'getPics':
      return getRecords('pics');
    case 'savePic':
      if (body.id) {
        try { return updateRecord('pics', 'id', body); }
        catch (e) { return addRecord('pics', body); }
      }
      return addRecord('pics', body);
    case 'deletePic':
      return deleteRecord('pics', 'id', body.id);

    // Vendors
    case 'getVendors':
      return getRecords('vendors');
    case 'saveVendor':
      if (body.id) {
        try { return updateRecord('vendors', 'id', body); }
        catch (e) { return addRecord('vendors', body); }
      }
      return addRecord('vendors', body);
    case 'deleteVendor':
      return deleteRecord('vendors', 'id', body.id);

    // PIC Vendors
    case 'getPicVendors':
      return getRecords('pic_vendors');
    case 'savePicVendor':
      if (body.id) {
        try { return updateRecord('pic_vendors', 'id', body); }
        catch (e) { return addRecord('pic_vendors', body); }
      }
      return addRecord('pic_vendors', body);
    case 'deletePicVendor':
      return deleteRecord('pic_vendors', 'id', body.id);

    // Products
    case 'getProducts':
      return getRecords('products');
    case 'saveProduct':
      if (body.id) {
        try { return updateRecord('products', 'id', body); }
        catch (e) { return addRecord('products', body); }
      }
      return addRecord('products', body);
    case 'deleteProduct':
      return deleteRecord('products', 'id', body.id);

    // Inquiries
    case 'getInquiries':
      return getRecords('inquiries');
    case 'saveInquiry':
      if (body.id) {
        try { return updateRecord('inquiries', 'id', body); }
        catch (e) { return addRecord('inquiries', body); }
      }
      return addRecord('inquiries', body);
    case 'deleteInquiry':
      return deleteRecord('inquiries', 'id', body.id);

    // Neracas
    case 'getNeracas':
      return getRecords('neracas');
    case 'saveNeraca':
      if (body.id) {
        try { return updateRecord('neracas', 'id', body); }
        catch (e) { return addRecord('neracas', body); }
      }
      return addRecord('neracas', body);
    case 'deleteNeraca': {
      var neracaId = body.id;
      // Cascading delete — remove all related records first
      try {
        // 1. Delete neraca_items
        var items = getRecords('neraca_items').filter(function(r){ return r.neraca_id === neracaId; });
        items.forEach(function(r){ try { deleteRecord('neraca_items', 'id', r.id); } catch(e){} });
        // 2. Delete neraca_details
        var details = getRecords('neraca_details').filter(function(r){ return r.neraca_id === neracaId; });
        details.forEach(function(r){ try { deleteRecord('neraca_details', 'id', r.id); } catch(e){} });
        // 3. Delete neraca_vendor_discounts
        try {
          var vds = getRecords('neraca_vendor_discounts').filter(function(r){ return r.neraca_id === neracaId; });
          vds.forEach(function(r){ try { deleteRecord('neraca_vendor_discounts', 'id', r.id); } catch(e){} });
        } catch(e){}
        // 4. Delete purchase_orders
        try {
          var pos = getRecords('purchase_orders').filter(function(r){ return r.neraca_id === neracaId; });
          pos.forEach(function(r){ try { deleteRecord('purchase_orders', 'id', r.id); } catch(e){} });
        } catch(e){}
        // 4b. Delete po_in
        try {
          var poins = getRecords('po_in').filter(function(r){ return r.neraca_id === neracaId; });
          poins.forEach(function(r){ try { deleteRecord('po_in', 'id', r.id); } catch(e){} });
        } catch(e){}
        // 5. Delete neraca_quotations
        try {
          var quotes = getRecords('neraca_quotations').filter(function(r){ return r.neraca_id === neracaId; });
          quotes.forEach(function(r){ try { deleteRecord('neraca_quotations', 'id', r.id); } catch(e){} });
        } catch(e){}
      } catch(e){ Logger.log('Cascade delete neraca error: ' + e); }
      // Finally delete neraca itself
      return deleteRecord('neracas', 'id', neracaId);
    }

    // Neraca Details (ongkir settings per neraca)
    case 'getNeracaDetail': {
      const all = getRecords('neraca_details');
      const nid = params.neraca_id || (body && body.neraca_id);
      const found = all.find(r => r.neraca_id === nid);
      return found || null;
    }
    case 'saveNeracaDetail':
      if (body.id) {
        try { return updateRecord('neraca_details', 'id', body); }
        catch (e) { return addRecord('neraca_details', body); }
      }
      return addRecord('neraca_details', body);

    // Neraca Items
    case 'getNeracaItems': {
      const all = getRecords('neraca_items');
      const nid = params.neraca_id || (body && body.neraca_id);
      return nid ? all.filter(r => r.neraca_id === nid) : all;
    }
    case 'saveNeracaItem':
      if (body.id) {
        try { return updateRecord('neraca_items', 'id', body); }
        catch (e) { return addRecord('neraca_items', body); }
      }
      return addRecord('neraca_items', body);
    case 'deleteNeracaItem':
      return deleteRecord('neraca_items', 'id', body.id);

    // Neraca Vendor Discounts
    case 'getVendorDiscounts': {
      try {
        const all = getRecords('neraca_vendor_discounts');
        const nid = params.neraca_id || (body && body.neraca_id);
        return nid ? all.filter(r => r.neraca_id === nid) : all;
      } catch(e) { return []; }
    }
    case 'saveVendorDiscount':
      if (body.id) {
        try { return updateRecord('neraca_vendor_discounts', 'id', body); }
        catch (e) { return addRecord('neraca_vendor_discounts', body); }
      }
      return addRecord('neraca_vendor_discounts', body);
    case 'deleteVendorDiscount':
      return deleteRecord('neraca_vendor_discounts', 'id', body.id);

    // Neraca Quotations
    case 'getNeracaQuotations': {
      try {
        const all = getRecords('neraca_quotations');
        const nid = params.neraca_id || (body && body.neraca_id);
        return nid ? all.filter(r => r.neraca_id === nid) : all;
      } catch(e) { return []; }
    }
    case 'saveNeracaQuotation':
      if (body.id) {
        try { return updateRecord('neraca_quotations', 'id', body); }
        catch (e) { return addRecord('neraca_quotations', body); }
      }
      return addRecord('neraca_quotations', body);
    case 'deleteNeracaQuotation': {
      var qtId = body.id;
      // Cascading delete — remove all POs linked to this quotation
      try {
        var pos = getRecords('purchase_orders').filter(function(r){ return r.quotation_id === qtId; });
        pos.forEach(function(r){ try { deleteRecord('purchase_orders', 'id', r.id); } catch(e){} });
      } catch(e){ Logger.log('Cascade delete quotation POs error: ' + e); }
      try {
        var poins = getRecords('po_in').filter(function(r){ return r.quotation_id === qtId; });
        poins.forEach(function(r){ try { deleteRecord('po_in', 'id', r.id); } catch(e){} });
      } catch(e){ Logger.log('Cascade delete quotation PO In error: ' + e); }
      return deleteRecord('neraca_quotations', 'id', qtId);
    }

    // Get latest quotation number for auto-increment
    case 'getNextQuotationNumber': {
      try {
        const all = getRecords('neraca_quotations');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        // Count quotations for the current year to get the sequence number
        const yearQuots = all.filter(r => {
          if (!r.created_date) return false;
          return new Date(r.created_date).getFullYear() === year;
        });
        const nextNum = yearQuots.length + 1;

        let shortName = 'MPA';
        try {
          const comp = getRecords('company');
          if (comp && comp.length > 0 && comp[0].short_name) {
            shortName = comp[0].short_name;
          }
        } catch(e){}

        return nextNum + '/Q/' + shortName + '/' + month + '.' + year;
      } catch(e) { 
        const d = new Date();
        return '1/Q/MPA/' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); 
      }
    }

    // Purchase Orders
    case 'getPurchaseOrders':
      return getRecords('purchase_orders');
    case 'savePurchaseOrder':
      if (body.id) {
        try { return updateRecord('purchase_orders', 'id', body); }
        catch (e) { return addRecord('purchase_orders', body); }
      }
      return addRecord('purchase_orders', body);
    case 'deletePurchaseOrder':
      return deleteRecord('purchase_orders', 'id', body.id);

    case 'getNextPoNumber': {
      try {
        const all = getRecords('purchase_orders');
        const nextNum = all.length + 1; // "berdasarkan semua po yang perna ada"
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        let shortName = 'MPA';
        try {
          const comp = getRecords('company');
          if (comp && comp.length > 0 && comp[0].short_name) {
            shortName = comp[0].short_name;
          }
        } catch(e){}

        return nextNum + '/PO/' + shortName + '/' + month + '.' + year;
      } catch(e) { 
        const d = new Date();
        return '1/PO/MPA/' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); 
      }
    }

    // PO In
    case 'getPoIns':
      return getRecords('po_in');
    case 'savePoIn':
      if (body.id) {
        try { return updateRecord('po_in', 'id', body); }
        catch (e) { return addRecord('po_in', body); }
      }
      return addRecord('po_in', body);
    case 'deletePoIn':
      return deleteRecord('po_in', 'id', body.id);

    // Initialize Neraca Sheets (add missing columns / create new sheets)
    case 'initNeracaSheets': {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var results = [];

      // 1. Create neraca_vendor_discounts sheet if not exists
      var vdSheet = ss.getSheetByName('neraca_vendor_discounts');
      if (!vdSheet) {
        vdSheet = ss.insertSheet('neraca_vendor_discounts');
        vdSheet.appendRow(['id','neraca_id','vendor_id','vendor_name','discount_pct','discount_cash','subject','delivery_time_disc','letter_date','updated_date']);
        results.push('Created sheet: neraca_vendor_discounts');
      } else {
        var vdHeaders = vdSheet.getRange(1, 1, 1, vdSheet.getLastColumn()).getValues()[0];
        var newCols = ['subject', 'delivery_time_disc', 'letter_date'];
        newCols.forEach(function(col) {
          if (vdHeaders.indexOf(col) === -1) {
            var lastCol = vdSheet.getLastColumn();
            vdSheet.getRange(1, lastCol + 1).setValue(col);
            vdHeaders.push(col);
            results.push('Added column ' + col + ' to neraca_vendor_discounts');
          }
        });
      }

      // 1b. Add bank columns to vendors sheet if missing
      var vendSheet = ss.getSheetByName('vendors');
      if (vendSheet) {
        var vendHeaders = vendSheet.getRange(1, 1, 1, vendSheet.getLastColumn()).getValues()[0];
        var bankCols = ['bank_name', 'bank_account_name', 'bank_account_number'];
        bankCols.forEach(function(col) {
          if (vendHeaders.indexOf(col) === -1) {
            var lastCol = vendSheet.getLastColumn();
            vendSheet.getRange(1, lastCol + 1).setValue(col);
            vendHeaders.push(col);
            results.push('Added column ' + col + ' to vendors');
          }
        });
      }

      // 2. Add delivery_time column to neraca_items if missing
      var niSheet = ss.getSheetByName('neraca_items');
      if (niSheet) {
        var niHeaders = niSheet.getRange(1, 1, 1, niSheet.getLastColumn()).getValues()[0];
        if (niHeaders.indexOf('delivery_time') === -1) {
          var niLastCol = niSheet.getLastColumn();
          niSheet.getRange(1, niLastCol + 1).setValue('delivery_time');
          results.push('Added column delivery_time to neraca_items');
        }
      }

      // 3. Add un_cost column to neraca_details if missing
      var ndSheet = ss.getSheetByName('neraca_details');
      if (ndSheet) {
        var ndHeaders = ndSheet.getRange(1, 1, 1, ndSheet.getLastColumn()).getValues()[0];
        if (ndHeaders.indexOf('un_cost') === -1) {
          var ndLastCol = ndSheet.getLastColumn();
          ndSheet.getRange(1, ndLastCol + 1).setValue('un_cost');
          results.push('Added column un_cost to neraca_details');
        }
      }

      // 4. Create neraca_quotations sheet if not exists
      var nqSheet = ss.getSheetByName('neraca_quotations');
      if (!nqSheet) {
        nqSheet = ss.insertSheet('neraca_quotations');
        nqSheet.appendRow(['id','quotation_number','neraca_id','inquiry_id','customer_id','customer_name','request_title','nilai','dokumen','status','created_date','updated_date']);
        results.push('Created sheet: neraca_quotations');
      }

      // 5. Create company sheet if not exists
      var compSheet = ss.getSheetByName('company');
      if (!compSheet) {
        compSheet = ss.insertSheet('company');
        compSheet.appendRow(['id','name','short_name','logo_url','address','email','phone','leader_name','admin_position','updated_date']);
        results.push('Created sheet: company');
      } else {
        var compHeaders = compSheet.getRange(1, 1, 1, compSheet.getLastColumn()).getValues()[0];
        if (compHeaders.indexOf('leader_name') === -1) {
          var compLastCol = compSheet.getLastColumn();
          compSheet.getRange(1, compLastCol + 1).setValue('leader_name');
          results.push('Added column leader_name to company');
        }
      }

      // 6. Create purchase_orders sheet if not exists
      var poSheet = ss.getSheetByName('purchase_orders');
      if (!poSheet) {
        poSheet = ss.insertSheet('purchase_orders');
        poSheet.appendRow(['id','po_number','neraca_id','quotation_id','vendor_id','vendor_name','jumlah_item','total_nilai','dokumen','status','created_date','updated_date']);
        results.push('Created sheet: purchase_orders');
      }

      // 7. Create po_in sheet if not exists
      var poinSheet = ss.getSheetByName('po_in');
      if (!poinSheet) {
        poinSheet = ss.insertSheet('po_in');
        poinSheet.appendRow(['id','quotation_id','neraca_id','customer_id','customer_name','po_in_number','judul','tanggal','alamat_pengiriman','pic_id','pic_name','tanggal_batas','dokumen','created_date','updated_date']);
        results.push('Created sheet: po_in');
      }

      return results.length > 0 ? results.join('; ') : 'All sheets already up to date';
    }

    // Sourcing Requests
    case 'getSourcingRequests':
      return getRecords('sourcing_requests');
    case 'saveSourcingRequest':
      if (body.id) {
        try { return updateRecord('sourcing_requests', 'id', body); }
        catch (e) { return addRecord('sourcing_requests', body); }
      }
      return addRecord('sourcing_requests', body);
    case 'deleteSourcingRequest':
      return deleteRecord('sourcing_requests', 'id', body.id);

    // Vendor Quotations (responses from vendors)
    case 'getVendorQuotations':
      return getRecords('vendor_quotations');
    case 'saveVendorQuotation':
      if (body.id) {
        try { return updateRecord('vendor_quotations', 'id', body); }
        catch (e) { return addRecord('vendor_quotations', body); }
      }
      return addRecord('vendor_quotations', body);
    case 'deleteVendorQuotation':
      return deleteRecord('vendor_quotations', 'id', body.id);

    // Customer Quotations
    case 'getQuotations':
      return getRecords('quotations');
    case 'saveQuotation':
      if (body.id) {
        try { return updateRecord('quotations', 'id', body); }
        catch (e) { return addRecord('quotations', body); }
      }
      return addRecord('quotations', body);
    case 'deleteQuotation':
      return deleteRecord('quotations', 'id', body.id);

    // Dashboard Data — safely handle sheets that may not exist yet
    case 'getDashboardData': {
      var result = {};
      ['inquiries', 'quotations'].forEach(function(sheetName) {
        try {
          result[sheetName] = getRecords(sheetName);
        } catch (e) {
          result[sheetName] = [];
        }
      });
      return result;
    }

    // Company Settings
    case 'getCompany': {
      try {
        var comp = getRecords('company');
        return comp.length > 0 ? comp[0] : null;
      } catch (e) {
        return null;
      }
    }
    case 'saveCompany':
      if (body.id) {
        try { return updateRecord('company', 'id', body); }
        catch (e) { return addRecord('company', body); }
      }
      return addRecord('company', body);

    // Upload File
    case 'uploadFile': {
      var dataBytes = Utilities.base64Decode(body.base64);
      var blob = Utilities.newBlob(dataBytes, body.mimeType, body.filename);
      var file = DriveApp.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileId = file.getId();
      // Return direct preview URL (works without login)
      return 'https://drive.google.com/file/d/' + fileId + '/preview';
    }

    default:
      throw new Error("Action not found: " + action);
  }
}
