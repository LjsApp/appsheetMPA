import { useState, useEffect } from 'react';
import { Building2, Save, Upload, Loader2, X } from 'lucide-react';
import { PageHeader, Button, FormField } from '@/components/ui';
import { useCompany, useSaveCompany, useUploadFile } from '@/hooks/useData';
import { useForm, Controller } from 'react-hook-form';
import { getDriveImageUrl } from '@/lib/utils';
interface CompanyForm {
  name: string;
  short_name: string;
  address: string;
  email: string;
  phone: string;
  leader_name: string;
  admin_position: string;
}

export default function CompanySettings() {
  const { data: company, isLoading } = useCompany();
  const saveCompany = useSaveCompany();
  const uploadFile = useUploadFile();

  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, reset } = useForm<CompanyForm>({
    defaultValues: {
      name: '',
      short_name: '',
      address: '',
      email: '',
      phone: '',
      leader_name: '',
      admin_position: ''
    }
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name || '',
        short_name: company.short_name || '',
        address: company.address || '',
        email: company.email || '',
        phone: company.phone || '',
        leader_name: company.leader_name || '',
        admin_position: company.admin_position || ''
      });
      setLogoUrl(company.logo_url || '');
    }
  }, [company, reset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        const res = await uploadFile.mutateAsync({
          filename: `logo_${Date.now()}_${file.name}`,
          mimeType: file.type,
          base64: base64Str
        });
        setLogoUrl(res);
      };
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Gagal mengupload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: CompanyForm) => {
    await saveCompany.mutateAsync({
      id: company?.id || `CMP-${Date.now()}`,
      ...data,
      logo_url: logoUrl,
      updated_date: new Date().toISOString()
    });
    alert('Pengaturan perusahaan berhasil disimpan!');
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengaturan Perusahaan"
        subtitle="Kelola profil perusahaan, logo, dan informasi kontak untuk dokumen quotation."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* Logo Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Logo Perusahaan</h3>
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0 relative">
                {logoUrl ? (
                  <>
                    <img src={getDriveImageUrl(logoUrl)} alt="Company Logo" className="w-full h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={() => setLogoUrl('')}
                      className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-600 hover:bg-red-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Building2 className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium cursor-pointer transition-colors">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Mengupload...' : 'Upload Logo Baru'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Format yang didukung: PNG, JPG, JPEG.<br/>
                  Logo ini akan ditampilkan di pojok kiri atas dokumen Quotation.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Profile Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Profil Perusahaan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Nama Lengkap Perusahaan" required>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => <input {...field} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="PT. SourceQuo Indonesia" />}
                />
              </FormField>

              <FormField label="Singkatan Perusahaan" required>
                <Controller
                  name="short_name"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => <input {...field} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="SQ" />}
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Alamat Kantor" required>
                  <Controller
                    name="address"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => <textarea {...field} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Jl. Jend. Sudirman No. 10..." />}
                  />
                </FormField>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Contact Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Kontak & Admin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Email" required>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => <input {...field} type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="info@sourcequo.co.id" />}
                />
              </FormField>

              <FormField label="Telepon" required>
                <Controller
                  name="phone"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => <input {...field} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="021-1234567" />}
                />
              </FormField>

              <FormField label="Nama Pimpinan (Penandatangan Quotation)" required>
                <Controller
                  name="leader_name"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => <input {...field} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Budi Santoso" />}
                />
              </FormField>

              <FormField label="Posisi Pimpinan / Admin" required>
                <Controller
                  name="admin_position"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => <input {...field} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Staff Operasional" />}
                />
              </FormField>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button type="submit" loading={saveCompany.isPending}>
            <Save className="w-4 h-4" />
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  );
}
