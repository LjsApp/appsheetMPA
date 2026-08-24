import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../services/api';
import type { Customer, Vendor, Product, Inquiry, PIC, PicVendor, Neraca, NeracaDetail, NeracaItem, VendorDiscount, NeracaQuotation, Company, PurchaseOrder, POIn } from '../types';


// ==================== Customers ====================

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => fetchApi('getCustomers'),
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
  return useQuery<Inquiry[]>({
    queryKey: ['inquiries'],
    queryFn: () => fetchApi('getInquiries'),
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
  return useQuery<Neraca[]>({
    queryKey: ['neracas'],
    queryFn: () => fetchApi('getNeracas'),
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
  return useQuery<NeracaQuotation[]>({
    queryKey: ['neraca_quotations', neracaId ?? 'all'],
    queryFn: () => neracaId
      ? fetchApi(`getNeracaQuotations&neraca_id=${neracaId}`)
      : fetchApi('getNeracaQuotations'),
  });
}

export function useSaveNeracaQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NeracaQuotation>) => fetchApi('saveNeracaQuotation', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neraca_quotations'] });
    },
  });
}

export function useDeleteNeracaQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi('deleteNeracaQuotation', 'POST', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neraca_quotations'] });
    },
  });
}

export function useGetNextQuotationNumber() {
  return useMutation({
    mutationFn: () => fetchApi('getNextQuotationNumber', 'POST', {}),
  });
}

// ==================== Purchase Orders ====================

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const data: PurchaseOrder[] = await fetchApi('getPurchaseOrders');
      return data.map((po, idx) => ({
        ...po,
        id: po.id || `fallback-po-${po.po_number?.replace(/\//g, '-')}-${idx}`
      }));
    },
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
  return useQuery<POIn[]>({
    queryKey: ['po_ins'],
    queryFn: () => fetchApi('getPoIns'),
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
