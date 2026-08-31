import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../services/api';
export { fetchApi };
import type { Customer, Vendor, Product, Inquiry, PIC, PicVendor, Neraca, NeracaDetail, NeracaItem, VendorDiscount, NeracaQuotation, Company, PurchaseOrder, POIn, SuratJalan, Invoice, InternalLetter, AppUser, Role } from '../types';
import { useAuthStore } from '../store/authStore';

// ─── Row-level filter helper ───────────────────────────────────────────────────
// Returns a selector that keeps all rows for super-admin, or only the rows
// whose `created_by` matches the current user's name for regular users.
function useOwnerSelector<T extends { created_by?: string }>() {
  const user = useAuthStore(state => state.user);
  return (data: T[]) => {
    if (!user) return [];
    if (user.is_super_admin) return data; // super admin sees everything
    return data.filter(row => !row.created_by || row.created_by === user.name);
  };
}

// ==================== Customers ====================

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => fetchApi('getCustomers'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useSaveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => fetchApi('saveCustomer', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteCustomer', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ==================== Vendors ====================

export function useVendors() {
  return useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => fetchApi('getVendors'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useSaveVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vendor>) => fetchApi('saveVendor', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteVendor', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

// ==================== PIC Vendors ====================

export function usePicVendors() {
  return useQuery<PicVendor[]>({
    queryKey: ['pic_vendors'],
    queryFn: () => fetchApi('getPicVendors'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSavePicVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PicVendor>) => fetchApi('savePicVendor', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pic_vendors'] });
    },
  });
}

export function useDeletePicVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deletePicVendor', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pic_vendors'] });
    },
  });
}

// ==================== Products ====================

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => fetchApi('getProducts'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => fetchApi('saveProduct', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteProduct', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ==================== Inquiries ====================

export function useInquiries() {
  const select = useOwnerSelector<Inquiry>();
  return useQuery<Inquiry[]>({
    queryKey: ['inquiries'],
    queryFn: () => fetchApi('getInquiries'),
    select,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Inquiry>) => fetchApi('saveInquiry', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}

export function useDeleteInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteInquiry', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}

// ==================== Neraca ====================

export function useNeracas() {
  const select = useOwnerSelector<Neraca>();
  return useQuery<Neraca[]>({
    queryKey: ['neracas'],
    queryFn: () => fetchApi('getNeracas'),
    select,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveNeraca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Neraca>) => fetchApi('saveNeraca', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neracas'] });
    },
  });
}

export function useDuplicateNeraca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceNeracaId: string) => fetchApi('duplicateNeraca', 'POST', { source_neraca_id: sourceNeracaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neracas'] });
    },
  });
}

export function useDeleteNeraca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteNeraca', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neracas'] });
    },
  });
}

// ==================== Neraca Detail ====================

export function useNeracaDetail(neracaId: string) {
  return useQuery<NeracaDetail | null>({
    queryKey: ['neraca_detail', neracaId],
    queryFn: () => fetchApi(`getNeracaDetail&neraca_id=${neracaId}`),
    enabled: !!neracaId,
    staleTime: 30 * 1000,
  });
}

export function useSaveNeracaDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NeracaDetail>) => fetchApi('saveNeracaDetail', 'POST', data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['neraca_detail', vars.neraca_id] });
    },
  });
}

export function useNeracaItems(neracaId: string) {
  return useQuery<NeracaItem[]>({
    queryKey: ['neraca_items', neracaId],
    queryFn: () => fetchApi(`getNeracaItems&neraca_id=${neracaId}`),
    enabled: !!neracaId,
    staleTime: 30 * 1000,
  });
}

export function useSaveNeracaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NeracaItem>) => fetchApi('saveNeracaItem', 'POST', data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['neraca_items', vars.neraca_id] });
    },
  });
}

export function useDeleteNeracaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { id: string; neraca_id: string }) => fetchApi('deleteNeracaItem', 'POST', { id: item.id }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['neraca_items', vars.neraca_id] });
    },
  });
}

export function useVendorDiscounts(neracaId: string) {
  return useQuery<VendorDiscount[]>({
    queryKey: ['vendor_discounts', neracaId],
    queryFn: () => fetchApi(`getVendorDiscounts&neraca_id=${neracaId}`),
    enabled: !!neracaId,
    staleTime: 30 * 1000,
  });
}

export function useSaveVendorDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<VendorDiscount>) => fetchApi('saveVendorDiscount', 'POST', data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_discounts', vars.neraca_id] });
    },
  });
}

export function useDeleteVendorDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { id: string; neraca_id: string }) => fetchApi('deleteVendorDiscount', 'POST', { id: item.id }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_discounts', vars.neraca_id] });
    },
  });
}

export function useInitNeracaSheets() {
  return useMutation({
    mutationFn: () => fetchApi('initNeracaSheets', 'POST', {}),
  });
}

// ==================== Neraca Quotations ====================

export function useNeracaQuotations(neracaId?: string) {
  const select = useOwnerSelector<NeracaQuotation>();
  return useQuery<NeracaQuotation[]>({
    queryKey: ['neraca_quotations', neracaId ?? 'all'],
    queryFn: () => neracaId
      ? fetchApi(`getNeracaQuotations&neraca_id=${neracaId}`)
      : fetchApi('getNeracaQuotations'),
    select,
    staleTime: 60 * 1000,
  });
}

export function useSaveNeracaQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NeracaQuotation>) => fetchApi('saveNeracaQuotation', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neraca_quotations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useDeleteNeracaQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteNeracaQuotation', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neraca_quotations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useGetNextQuotationNumber() {
  return useMutation({
    mutationFn: () => fetchApi('getNextQuotationNumber', 'POST', {}),
  });
}

// ==================== PO Out ====================

export function usePurchaseOrders() {
  const select = useOwnerSelector<PurchaseOrder>();
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const data: PurchaseOrder[] = await fetchApi('getPurchaseOrders');
      return data.filter(po => po.status !== 'Deleted').map((po, idx) => ({
        ...po,
        id: po.id || `fallback-po-${po.po_number?.replace(/\//g, '-')}-${idx}`
      }));
    },
    select,
    staleTime: 60 * 1000,
  });
}

export function useSavePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PurchaseOrder>) => fetchApi('savePurchaseOrder', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deletePurchaseOrder', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useGetNextPoNumber() {
  return useMutation({
    mutationFn: () => fetchApi('getNextPoNumber', 'POST', {}),
  });
}

// ==================== PICs ====================

export function usePics() {
  return useQuery<PIC[]>({
    queryKey: ['pics'],
    queryFn: () => fetchApi('getPics'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSavePic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PIC>) => fetchApi('savePic', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pics'] });
    },
  });
}

export function useDeletePic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deletePic', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pics'] });
    },
  });
}

// ==================== Common ====================

export function useUploadFile() {
  return useMutation({
    mutationFn: (data: { filename: string, mimeType: string, base64: string }) => 
      fetchApi('uploadFile', 'POST', data),
  });
}

// ==================== Company ====================

export function useCompany() {
  return useQuery<Company | null>({
    queryKey: ['company'],
    queryFn: () => fetchApi('getCompany'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useSaveCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => fetchApi('saveCompany', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}

// ==================== PO In ====================

export function usePoIns() {
  const select = useOwnerSelector<POIn>();
  return useQuery<POIn[]>({
    queryKey: ['po_ins'],
    queryFn: () => fetchApi('getPoIns'),
    select,
    staleTime: 60 * 1000,
  });
}

export function useSavePoIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<POIn>) => fetchApi('savePoIn', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po_ins'] });
    },
  });
}

export function useDeletePoIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deletePoIn', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po_ins'] });
    },
  });
}

// ==================== SURAT JALAN ====================

export const useSuratJalan = () => {
  const select = useOwnerSelector<SuratJalan>();
  return useQuery<SuratJalan[]>({
    queryKey: ['suratJalan'],
    queryFn: () => fetchApi('getSuratJalan'),
    select,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveSuratJalan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SuratJalan>) => fetchApi('saveSuratJalan', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suratJalan'] });
    },
  });
};

export const useDeleteSuratJalan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteSuratJalan', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suratJalan'] });
    },
  });
};

// ==================== INVOICES ====================

export const useInvoices = () => {
  const select = useOwnerSelector<Invoice>();
  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => fetchApi('getInvoices'),
    select,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Invoice>) => fetchApi('saveInvoice', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteInvoice', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// ==================== INTERNAL LETTERS ====================

export function useInternalLetters() {
  const select = useOwnerSelector<InternalLetter>();
  return useQuery<InternalLetter[]>({
    queryKey: ['internal_letters'],
    queryFn: () => fetchApi('getInternalLetters'),
    select,
    staleTime: 60 * 1000,
  });
}

export function useSaveInternalLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InternalLetter>) => fetchApi('saveInternalLetter', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_letters'] });
    },
  });
}

export function useDeleteInternalLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteInternalLetter', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_letters'] });
    },
  });
}

export function useGetNextInternalLetterNumber() {
  return useMutation({
    mutationFn: () => fetchApi('getNextInternalLetterNumber', 'POST', {}),
  });
}

// ==================== Users ====================

export function useUsers() {
  return useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: () => fetchApi('getUsers', 'GET', {}),
  });
}

export function useSaveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: Partial<AppUser>) => fetchApi('saveUser', 'POST', user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteUser', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ==================== Roles ====================

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => fetchApi('getRoles', 'GET', {}),
  });
}

export function useSaveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: Partial<Role>) => fetchApi('saveRole', 'POST', role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteRole', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
