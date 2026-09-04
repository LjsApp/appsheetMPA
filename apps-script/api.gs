function routeRequest(action, method, body, params) {
  switch (action) {
    // Setup & Init
    case 'checkSetup': {
      var roles = getRecords('roles');
      var users = getRecords('users');
      // Anggap sistem sudah di-setup jika ada minimal 1 user
      var isSetupComplete = users.length > 0;
      return { isSetupComplete: isSetupComplete };
    }
    case 'setupSystem': {
      var roles = getRecords('roles');
      var users = getRecords('users');
      if (users.length > 0) throw new Error('Sistem sudah di-setup. Tidak bisa setup ulang.');
      
      // 1. Buat Role Super Admin
      var superAdminRole = {
        id: 'ROLE-SUPERADMIN',
        role_name: 'Super Admin',
        permissions: '[]',
        is_super_admin: true,
        created_date: new Date().toISOString()
      };
      addRecord('roles', superAdminRole);
      
      // 2. Buat User Super Admin
      var superAdminUser = {
        id: 'USR-SUPERADMIN',
        name: body.name || 'Administrator',
        email: body.email,
        password: body.password,
        role_id: superAdminRole.id,
        role_name: superAdminRole.role_name,
        status: 'Active',
        created_date: new Date().toISOString()
      };
      addRecord('users', superAdminUser);
      
      var safeUser = { id: superAdminUser.id, name: superAdminUser.name, email: superAdminUser.email, role_id: superAdminUser.role_id, status: superAdminUser.status };
      return safeUser;
    }

    // Auth & Users
    case 'login': {
      var users = getRecords('users');
      var email = body.email;
      var password = body.password;
      var user = users.find(function(u) { return u.email === email && String(u.password) === String(password); });
      if (!user) throw new Error('Email atau password salah');
      if (user.status === 'Inactive') throw new Error('Akun tidak aktif');
      // Get role to determine is_super_admin
      var roles = getRecords('roles');
      var userRole = roles.find(function(r) { return r.id === user.role_id; });
      var isSuperAdmin = userRole ? (userRole.is_super_admin === true || userRole.is_super_admin === 'TRUE' || userRole.is_super_admin === 'true') : false;
      // Return user without password
      var safeUser = { id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_name: userRole ? userRole.name : '', status: user.status, is_super_admin: isSuperAdmin };
      return safeUser;
    }
    case 'getUsers':
      return getRecords('users');
    case 'saveUser':
      if (body.id) {
        try { return updateRecord('users', 'id', body); }
        catch (e) { return addRecord('users', body); }
      }
      return addRecord('users', body);
    case 'deleteUser':
      return deleteRecord('users', 'id', body.id);

    // Roles
    case 'getRoles':
      return getRecords('roles');
    case 'saveRole':
      if (body.id) {
        try { return updateRecord('roles', 'id', body); }
        catch (e) { return addRecord('roles', body); }
      }
      return addRecord('roles', body);
    case 'deleteRole':
      return deleteRecord('roles', 'id', body.id);

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

    // Invoices
    case 'getInvoices':
      return getRecords('invoices');
    case 'saveInvoice':
      if (body.id) {
        try { return updateRecord('invoices', 'id', body); }
        catch (e) { return addRecord('invoices', body); }
      }
      return addRecord('invoices', body);
    case 'deleteInvoice':
      return deleteRecord('invoices', 'id', body.id);

    // Neracas
    case 'getNeracas':
      return getRecords('neracas');
    case 'saveNeraca':
      if (body.id) {
        try { return updateRecord('neracas', 'id', body); }
        catch (e) { return addRecord('neracas', body); }
      }
      return addRecord('neracas', body);
    case 'duplicateNeraca': {
      var sourceId = body.source_neraca_id;
      if (!sourceId) throw new Error('Missing source_neraca_id');
      
      var neracas = getRecords('neracas');
      var sourceNeraca = null;
      for (var i = 0; i < neracas.length; i++) {
        if (neracas[i].id === sourceId) { sourceNeraca = neracas[i]; break; }
      }
      if (!sourceNeraca) throw new Error('Source neraca not found');

      var newNeracaId = 'NER-' + Date.now() + Math.floor(Math.random()*1000);
      var newDate = new Date().toISOString().split('T')[0];
      
      var newNeraca = {
        id: newNeracaId,
        inquiry_id: sourceNeraca.inquiry_id,
        name: 'Duplikat ' + (sourceNeraca.name || 'Neraca'),
        created_date: newDate,
        updated_date: newDate
      };
      addRecord('neracas', newNeraca);

      // Copy Details
      var details = getRecords('neraca_details');
      for (var i = 0; i < details.length; i++) {
        if (details[i].neraca_id === sourceId) {
          var newDetail = JSON.parse(JSON.stringify(details[i]));
          newDetail.id = 'DET-' + Date.now() + Math.floor(Math.random()*1000);
          newDetail.neraca_id = newNeracaId;
          addRecord('neraca_details', newDetail);
          break; // only 1 detail per neraca
        }
      }

      // Copy Items
      var items = getRecords('neraca_items');
      for (var i = 0; i < items.length; i++) {
        if (items[i].neraca_id === sourceId) {
          var newItem = JSON.parse(JSON.stringify(items[i]));
          newItem.id = 'ITM-' + Date.now() + Math.floor(Math.random()*10000);
          newItem.neraca_id = newNeracaId;
          newItem.created_date = newDate;
          newItem.updated_date = newDate;
          addRecord('neraca_items', newItem);
        }
      }

      // Copy Vendor Discounts
      try {
        var vds = getRecords('neraca_vendor_discounts');
        for (var i = 0; i < vds.length; i++) {
          if (vds[i].neraca_id === sourceId) {
            var newVd = JSON.parse(JSON.stringify(vds[i]));
            newVd.id = 'VD-' + Date.now() + Math.floor(Math.random()*10000);
            newVd.neraca_id = newNeracaId;
            newVd.updated_date = newDate;
            addRecord('neraca_vendor_discounts', newVd);
          }
        }
      } catch(e) {}

      return newNeraca;
    }
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
        // 4. Delete po_out
        try {
          var pos = getRecords('po_out').filter(function(r){ return r.neraca_id === neracaId; });
          pos.forEach(function(r){ try { deleteRecord('po_out', 'id', r.id); } catch(e){} });
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
      if (!nid) return all;
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
      // Cascading delete - remove all POs linked to this quotation
      try {
        var pos = getRecords('po_out').filter(function(r){ return r.quotation_id === qtId; });
        pos.forEach(function(r){ try { deleteRecord('po_out', 'id', r.id); } catch(e){} });
      } catch(e){ Logger.log('Cascade delete quotation POs error: ' + e); }
      try {
        var poins = getRecords('po_in').filter(function(r){ return r.quotation_id === qtId; });
        poins.forEach(function(r){ 
          try { 
            // Cascade delete Surat Jalan connected to this PO In
            var sjs = getRecords('surat_jalan').filter(function(sj){ return sj.po_in_id === r.id; });
            sjs.forEach(function(sj){ try { deleteRecord('surat_jalan', 'id', sj.id); } catch(e){} });
            
            deleteRecord('po_in', 'id', r.id); 
          } catch(e){} 
        });
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
      return getRecords('po_out');
    case 'savePurchaseOrder':
      if (body.id) {
        try { return updateRecord('po_out', 'id', body); }
        catch (e) { return addRecord('po_out', body); }
      }
      return addRecord('po_out', body);
    case 'deletePurchaseOrder':
      return deleteRecord('po_out', 'id', body.id);

    case 'getNextPoNumber': {
      try {
        const all = getRecords('po_out');
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
    case 'deletePoIn': {
      var poInId = body.id;
      try {
        var poIns = getRecords('po_in');
        var poIn = null;
        for (var i = 0; i < poIns.length; i++) {
          if (poIns[i].id === poInId) { poIn = poIns[i]; break; }
        }
        if (poIn && poIn.quotation_id) {
          var poOuts = getRecords('po_out').filter(function(r){ return r.quotation_id === poIn.quotation_id; });
          poOuts.forEach(function(r){ try { deleteRecord('po_out', 'id', r.id); } catch(e){} });
        }
        // Cascade delete Surat Jalan
        var sjs = getRecords('surat_jalan').filter(function(sj){ return sj.po_in_id === poInId; });
        sjs.forEach(function(sj){ try { deleteRecord('surat_jalan', 'id', sj.id); } catch(e){} });
      } catch(e) { Logger.log('Cascade delete PO In error: ' + e); }
      return deleteRecord('po_in', 'id', poInId);
    }
    case 'getSuratJalan':
      return getRecords('surat_jalan');
    case 'saveSuratJalan':
      if (body.id) {
        try { return updateRecord('surat_jalan', 'id', body); }
        catch (e) { return addRecord('surat_jalan', body); }
      }
      return addRecord('surat_jalan', body);
    case 'deleteSuratJalan':
      return deleteRecord('surat_jalan', 'id', body.id);
    
    case 'getNextSuratJalanNumber': {
      try {
        const all = getRecords('surat_jalan');
        const nextNum = all.length + 1;
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

        return nextNum + '/SJ/' + shortName + '/' + month + '.' + year;
      } catch(e) { 
        const d = new Date();
        return '1/SJ/MPA/' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); 
      }
    }

    case 'getNextInvoiceNumber': {
      try {
        const allInv = getRecords('invoices');
        const nextInvNum = allInv.length + 1;
        const dInv = new Date();
        const monthInv = String(dInv.getMonth() + 1).padStart(2, '0');
        const yearInv = dInv.getFullYear();
        let shortNameInv = 'MPA';
        try {
          const compInv = getRecords('company');
          if (compInv && compInv.length > 0 && compInv[0].short_name) {
            shortNameInv = compInv[0].short_name;
          }
        } catch(e){}
        return nextInvNum + '/INV/' + shortNameInv + '/' + monthInv + '.' + yearInv;
      } catch(e) {
        const d = new Date();
        return '1/INV/MPA/' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
      }
    }

    // Initialize Neraca Sheets (add missing columns / create new sheets)
    case 'initNeracaSheets': {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var results = [];

      // 1. Create neraca_vendor_discounts sheet if not exists
      var vdSheet = ss.getSheetByName('neraca_vendor_discounts');
      if (!vdSheet) {
        vdSheet = ss.insertSheet('neraca_vendor_discounts');
        vdSheet.appendRow(['id','neraca_id','vendor_id','vendor_name','discount_pct','discount_cash','dp_pct','dp_nominal','ppn_pct','updated_date']);
        results.push('Created sheet: neraca_vendor_discounts');
      } else {
        var vdHeaders = vdSheet.getRange(1, 1, 1, vdSheet.getLastColumn()).getValues()[0];
        var newCols = ['dp_pct', 'dp_nominal', 'ppn_pct'];
        newCols.forEach(function(col) {
          if (vdHeaders.indexOf(col) === -1) {
            var lastCol = vdSheet.getLastColumn();
            vdSheet.getRange(1, lastCol + 1).setValue(col);
            vdHeaders.push(col);
            results.push('Added column ' + col + ' to neraca_vendor_discounts');
          }
        });
      }

      // 1b. Create surat_jalan sheet if not exists
      var sjSheet = ss.getSheetByName('surat_jalan');
      if (!sjSheet) {
        sjSheet = ss.insertSheet('surat_jalan');
        sjSheet.appendRow(['id','po_in_id','sj_number','ekspedisi','created_date','updated_date']);
        results.push('Created sheet: surat_jalan');
      }

      // 1c. Add bank columns to vendors sheet if missing
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

      // 2. Rename delivery_time to dt_kc, delivery_time_vk to dt_vk, delete documents, and ensure new cols exist
      var niSheet = ss.getSheetByName('neraca_items');
      if (niSheet) {
        var niHeaders = niSheet.getRange(1, 1, 1, niSheet.getLastColumn()).getValues()[0];
        var dtIndex = niHeaders.indexOf('delivery_time');
        if (dtIndex !== -1) {
          niSheet.getRange(1, dtIndex + 1).setValue('dt_kc');
          niHeaders[dtIndex] = 'dt_kc';
          results.push('Renamed delivery_time to dt_kc in neraca_items');
        }
        var dtVkIndex = niHeaders.indexOf('delivery_time_vk');
        if (dtVkIndex !== -1) {
          niSheet.getRange(1, dtVkIndex + 1).setValue('dt_vk');
          niHeaders[dtVkIndex] = 'dt_vk';
          results.push('Renamed delivery_time_vk to dt_vk in neraca_items');
        }
        var docIndex = niHeaders.indexOf('documents');
        if (docIndex !== -1) {
          niSheet.deleteColumn(docIndex + 1);
          niHeaders.splice(docIndex, 1);
          results.push('Deleted documents column from neraca_items');
        }

        ['dt_kc', 'dt_vk'].forEach(function(col) {
          if (niHeaders.indexOf(col) === -1) {
            var niLastCol = niSheet.getLastColumn();
            niSheet.getRange(1, niLastCol + 1).setValue(col);
            results.push('Added column ' + col + ' to neraca_items');
          }
        });
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
        nqSheet.appendRow(['id','quotation_number','neraca_id','inquiry_id','customer_id','customer_name','nilai','dokumen','created_by','follow_up_count','last_follow_up_date','created_date','updated_date']);
        results.push('Created sheet: neraca_quotations');
      }


      // 5. Create company sheet if not exists
      var compSheet = ss.getSheetByName('company');
      if (!compSheet) {
        compSheet = ss.insertSheet('company');
        compSheet.appendRow(['id','name','short_name','logo_url','address','email','phone','leader_name','admin_position','bank_name','bank_account_name','bank_account_number','updated_date']);
        results.push('Created sheet: company');
      } else {
        var compHeaders = compSheet.getRange(1, 1, 1, compSheet.getLastColumn()).getValues()[0];
        ['leader_name', 'bank_name', 'bank_account_name', 'bank_account_number'].forEach(function(col) {
          if (compHeaders.indexOf(col) === -1) {
            var compLastCol = compSheet.getLastColumn();
            compSheet.getRange(1, compLastCol + 1).setValue(col);
            compHeaders.push(col);
            results.push('Added column ' + col + ' to company');
          }
        });
      }

      // 6. Create po_out sheet if not exists (or rename from purchase_orders)
      var poSheet = ss.getSheetByName('po_out');
      var oldPoSheet = ss.getSheetByName('purchase_orders');
      
      if (!poSheet && oldPoSheet) {
        oldPoSheet.setName('po_out');
        poSheet = oldPoSheet;
        results.push('Renamed sheet: purchase_orders to po_out');
      } else if (!poSheet) {
        poSheet = ss.insertSheet('po_out');
        poSheet.appendRow(['id','po_number','neraca_id','quotation_id','vendor_id','vendor_name','jumlah_item','total_nilai','dokumen','status','due_date','subject','ref_date','created_date','updated_date']);
        results.push('Created sheet: po_out');
      } else {
        // Migrate: add new columns if missing
        var poHeaders = poSheet.getRange(1, 1, 1, poSheet.getLastColumn()).getValues()[0];
        ['due_date', 'subject', 'ref_date', 'ref', 'type', 'dp_reference_id', 'franco', 'created_by', 'verification_status', 'verification_note', 'verified_by', 'verified_date'].forEach(function(col) {
          if (poHeaders.indexOf(col) === -1) {
            var lastCol = poSheet.getLastColumn();
            poSheet.getRange(1, lastCol + 1).setValue(col);
            poHeaders.push(col);
            results.push('Added column ' + col + ' to po_out');
          }
        });
      }

      // 7. Create po_in sheet if not exists
      var poinSheet = ss.getSheetByName('po_in');
      if (!poinSheet) {
        poinSheet = ss.insertSheet('po_in');
        poinSheet.appendRow(['id','quotation_id','neraca_id','customer_id','customer_name','po_in_number','judul','tanggal','alamat_pengiriman','pic_id','pic_name','tanggal_batas','dokumen','created_date','updated_date']);
        results.push('Created sheet: po_in');
      }

      // 8. Create invoices sheet if not exists, or migrate columns
      var invSheet = ss.getSheetByName('invoices');
      if (!invSheet) {
        invSheet = ss.insertSheet('invoices');
        invSheet.appendRow(['id','po_in_id','invoice_number','invoice_date','customer_id','delivery_address','created_by','verification_status','verification_note','verified_by','verified_date','created_date','updated_date']);
        results.push('Created sheet: invoices');
      } else {
        var invHeaders = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0];
        ['created_by', 'verification_status', 'verification_note', 'verified_by', 'verified_date'].forEach(function(col) {
          if (invHeaders.indexOf(col) === -1) {
            var lastCol = invSheet.getLastColumn();
            invSheet.getRange(1, lastCol + 1).setValue(col);
            invHeaders.push(col);
            results.push('Added column ' + col + ' to invoices');
          }
        });
      }

      // 9. Create notifications sheet if not exists
      var notifSheet = ss.getSheetByName('notifications');
      if (!notifSheet) {
        notifSheet = ss.insertSheet('notifications');
        notifSheet.appendRow(['id','from_user_id','from_user_name','to_user_id','type','ref_type','ref_id','ref_number','message','is_read','created_date']);
        results.push('Created sheet: notifications');
      }

      // 10. Create Belanja sheets
      var bdInSheet = ss.getSheetByName('belanja_dapur_in');
      if (!bdInSheet) {
        bdInSheet = ss.insertSheet('belanja_dapur_in');
        bdInSheet.appendRow(['id', 'tanggal', 'nominal', 'keterangan', 'bukti_tf', 'created_date', 'updated_date']);
        results.push('Created sheet: belanja_dapur_in');
      }

      var bdOutSheet = ss.getSheetByName('belanja_dapur_out');
      if (!bdOutSheet) {
        bdOutSheet = ss.insertSheet('belanja_dapur_out');
        bdOutSheet.appendRow(['id', 'tanggal', 'nominal', 'keterangan', 'bukti_foto', 'created_date', 'updated_date']);
        results.push('Created sheet: belanja_dapur_out');
      }

      var bpInSheet = ss.getSheetByName('belanja_proyek_in');
      if (!bpInSheet) {
        bpInSheet = ss.insertSheet('belanja_proyek_in');
        bpInSheet.appendRow(['id', 'tanggal', 'nominal', 'keterangan', 'bukti_tf', 'created_date', 'updated_date']);
        results.push('Created sheet: belanja_proyek_in');
      }

      var bpOutSheet = ss.getSheetByName('belanja_proyek_out');
      if (!bpOutSheet) {
        bpOutSheet = ss.insertSheet('belanja_proyek_out');
        bpOutSheet.appendRow(['id', 'po_out_id', 'tanggal', 'nominal', 'keterangan', 'bukti_foto', 'created_date', 'updated_date']);
        results.push('Created sheet: belanja_proyek_out');
      }

      // 11. Create internal_letters sheet if not exists, or migrate new verification columns
      var ilSheet = ss.getSheetByName('internal_letters');
      if (!ilSheet) {
        ilSheet = ss.insertSheet('internal_letters');
        ilSheet.appendRow(['id','po_in_id','po_out_id','quotation_id','neraca_id','vendor_id','vendor_name','customer_id','customer_name','internal_letter_number','tanggal','perihal','franco','jumlah_item','total_nilai','type','dp_reference_id','dokumen','created_by','verification_status','verification_note','verified_by','verified_date','bukti_tf_url','created_date','updated_date']);
        results.push('Created sheet: internal_letters');
      } else {
        var ilHeaders = ilSheet.getRange(1, 1, 1, ilSheet.getLastColumn()).getValues()[0];
        ['verification_status', 'verification_note', 'verified_by', 'verified_date', 'bukti_tf_url'].forEach(function(col) {
          if (ilHeaders.indexOf(col) === -1) {
            var lastCol = ilSheet.getLastColumn();
            ilSheet.getRange(1, lastCol + 1).setValue(col);
            ilHeaders.push(col);
            results.push('Added column ' + col + ' to internal_letters');
          }
        });
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

    // Internal Letters
    case 'getInternalLetters':
      try { return getRecords('internal_letters'); } catch(e) { return []; }
    case 'saveInternalLetter':
      if (body.id) {
        try { return updateRecord('internal_letters', 'id', body); }
        catch (e) { return addRecord('internal_letters', body); }
      }
      return addRecord('internal_letters', body);
    case 'deleteInternalLetter':
      return deleteRecord('internal_letters', 'id', body.id);

    case 'getNextInternalLetterNumber': {
      try {
        var allIL = getRecords('internal_letters');
        var nextILNum = allIL.length + 1;
        var ilDate = new Date();
        var ilYear = ilDate.getFullYear();
        var ilMonth = String(ilDate.getMonth() + 1).padStart(2, '0');
        var ilShort = 'MPA';
        try {
          var compRec = getRecords('company');
          if (compRec && compRec.length > 0 && compRec[0].short_name) {
            ilShort = compRec[0].short_name;
          }
        } catch(e) {}
        return nextILNum + '/In/' + ilShort + '/' + ilMonth + '.' + ilYear;
      } catch(e) {
        var d2 = new Date();
        return '1/In/MPA/' + String(d2.getMonth() + 1).padStart(2, '0') + '.' + d2.getFullYear();
      }
    }

    // Notifications
    case 'getNotifications':
      return getRecords('notifications');
    case 'saveNotification':
      if (body.id) {
        try { return updateRecord('notifications', 'id', body); }
        catch (e) { return addRecord('notifications', body); }
      }
      return addRecord('notifications', body);
    case 'deleteNotification':
      return deleteRecord('notifications', 'id', body.id);

    // Belanja Dapur In (Pemasukan)
    case 'getBelanjaDapurIn':
      return getRecords('belanja_dapur_in');
    case 'saveBelanjaDapurIn':
      if (body.id) {
        try { return updateRecord('belanja_dapur_in', 'id', body); }
        catch (e) { return addRecord('belanja_dapur_in', body); }
      }
      return addRecord('belanja_dapur_in', body);
    case 'deleteBelanjaDapurIn':
      return deleteRecord('belanja_dapur_in', 'id', body.id);

    // Belanja Dapur Out (Pengeluaran)
    case 'getBelanjaDapurOut':
      return getRecords('belanja_dapur_out');
    case 'saveBelanjaDapurOut':
      if (body.id) {
        try { return updateRecord('belanja_dapur_out', 'id', body); }
        catch (e) { return addRecord('belanja_dapur_out', body); }
      }
      return addRecord('belanja_dapur_out', body);
    case 'deleteBelanjaDapurOut':
      return deleteRecord('belanja_dapur_out', 'id', body.id);

    // Belanja Proyek In (Pemasukan)
    case 'getBelanjaProyekIn':
      return getRecords('belanja_proyek_in');
    case 'saveBelanjaProyekIn':
      if (body.id) {
        try { return updateRecord('belanja_proyek_in', 'id', body); }
        catch (e) { return addRecord('belanja_proyek_in', body); }
      }
      return addRecord('belanja_proyek_in', body);
    case 'deleteBelanjaProyekIn':
      return deleteRecord('belanja_proyek_in', 'id', body.id);

    // Belanja Proyek Out (Pengeluaran)
    case 'getBelanjaProyekOut':
      return getRecords('belanja_proyek_out');
    case 'saveBelanjaProyekOut':
      if (body.id) {
        try { return updateRecord('belanja_proyek_out', 'id', body); }
        catch (e) { return addRecord('belanja_proyek_out', body); }
      }
      return addRecord('belanja_proyek_out', body);
    case 'deleteBelanjaProyekOut':
      return deleteRecord('belanja_proyek_out', 'id', body.id);

    default:
      throw new Error("Action not found: " + action);
  }
}
