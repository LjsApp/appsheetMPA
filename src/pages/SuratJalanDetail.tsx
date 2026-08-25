import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Loader2 } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { 
  useSuratJalan, 
  useSaveSuratJalan, 
  usePoIns, 
  useNeracaItems, 
  useCompany 
} from '@/hooks/useData';
import { getDriveImageUrl, formatDate } from '@/lib/utils';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'pagi';
  if (hour >= 12 && hour < 18) return 'siang';
  return 'malam';
}

export default function SuratJalanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: suratJalanList = [], isLoading: loadingSJ } = useSuratJalan();
  const saveSJ = useSaveSuratJalan();
  
  const { data: poIns = [], isLoading: loadingPo } = usePoIns();
  const { data: company, isLoading: loadingCompany } = useCompany();

  const sj = suratJalanList.find(s => s.id === id);
  const po = poIns.find(p => p.id === sj?.po_in_id);

  const { data: items = [], isLoading: loadingItems } = useNeracaItems(po?.neraca_id || '');

  const [ekspedisi, setEkspedisi] = useState('');

  useEffect(() => {
    if (sj) setEkspedisi(sj.ekspedisi || '');
  }, [sj]);

  useEffect(() => {
    if (sj && company) {
      const cName = company.name || 'SourceQuo';
      document.title = `${cName}_${sj.sj_number.replace(/\//g, '_')}`;
      return () => { document.title = 'Vite + React + TS'; };
    }
  }, [company?.name, sj?.sj_number]);

  const handleEkspedisiBlur = () => {
    if (sj && ekspedisi !== (sj.ekspedisi || '')) {
      saveSJ.mutate({ ...sj, ekspedisi });
    }
  };

  const isLoading = loadingSJ || loadingPo || loadingCompany || loadingItems;

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!sj) {
    return <div className="p-8 text-center text-red-600 font-medium">Surat Jalan tidak ditemukan.</div>;
  }

  const companyName = company?.name || 'PT. Morgan Powerindo Amerta';
  const waPhone = String(company?.phone || '6281328213968');
  const waMessage = `Halo selamat ${getGreeting()}, izin bertanya terkait Surat Jalan ${sj.sj_number} untuk ${po?.customer_name || ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://wa.me/${waPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`)}`;

  return (
    <div className="space-y-5 pb-20">
      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          body, html, #root {
            margin: 0; padding: 0;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: auto !important;
            overflow: visible !important;
          }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          .no-print { display: none !important; }
          #sj-doc {
            box-shadow: none !important; border: none !important;
            border-radius: 0 !important; max-width: 100% !important; margin: 0 !important;
          }
          input { border: none !important; padding: 0 !important; outline: none !important; box-shadow: none !important; background: transparent !important; }
          input::placeholder { color: transparent !important; }
          thead { display: table-header-group; }
          tfoot { display: table-row-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={`Surat Jalan ${sj.sj_number}`}
          subtitle={`${po?.customer_name || '-'}`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}><RotateCcw className="w-4 h-4" /> Kembali</Button>
              <Button variant="secondary" onClick={() => window.print()}><Download className="w-4 h-4" /> Export PDF</Button>
            </div>
          }
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-[860px] mx-auto text-[12pt]" id="sj-doc">
        <table className="w-full" style={{borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 pt-8 pb-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {company?.logo_url ? (
                        <div className="w-24 h-24 overflow-hidden flex items-center justify-center">
                          <img src={getDriveImageUrl(company.logo_url)} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 border border-gray-200 rounded flex items-center justify-center text-gray-300 text-xs font-medium">Logo</div>
                      )}
                      <div>
                        <h1 className="text-blue-900 font-bold tracking-wide leading-tight text-[12pt]">{companyName}</h1>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-blue-900 font-extrabold tracking-widest text-[16pt] uppercase">Delivery Order</h2>
                    </div>
                  </div>
                  
                  <div className="text-center mt-6">
                    <h3 className="font-bold underline text-lg tracking-wider">SURAT JALAN</h3>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 py-4">
                  <div className="flex justify-between mb-8 text-[12pt] leading-snug">
                    <div className="space-y-1.5 w-1/2 pr-4">
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Customer</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="font-semibold text-gray-900">{po?.customer_name || '-'}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Address</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="text-gray-900 whitespace-pre-wrap">{po?.alamat_pengiriman || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 w-1/2 pl-4">
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">No</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="text-gray-900">{sj.sj_number}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Date</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="text-gray-900">{formatDate(sj.created_date)}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Ref</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="text-gray-900">{po?.po_in_number || '-'}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Ref Date</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="text-gray-900">{po?.tanggal ? formatDate(po.tanggal) : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-gray-900">Kami kirimkan barang-barang tersebut dibawah ini dengan menggunakan ekspedisi </span>
                    <input 
                      type="text" 
                      value={ekspedisi} 
                      onChange={e => setEkspedisi(e.target.value)} 
                      onBlur={handleEkspedisiBlur}
                      placeholder="pilih ekspedisi (mis. JNT, JNE)..." 
                      className="border-b border-gray-300 font-semibold focus:border-blue-500 focus:outline-none px-1 w-64 inline-block text-gray-900 placeholder:font-normal placeholder:text-gray-400 no-print" 
                    />
                    <span className="font-semibold hidden print:inline-block">{ekspedisi || '_________________'}</span>
                    <span className="text-gray-900"> :</span>
                  </div>

                  <table className="w-full border-collapse mb-8 text-[11pt]">
                    <thead>
                      <tr className="bg-[#8CB0CE] border border-black">
                        <th className="border-r border-black py-2 px-3 text-center w-12 font-bold text-black">No</th>
                        <th className="border-r border-black py-2 px-3 text-center font-bold text-black">Item</th>
                        <th className="py-2 px-3 text-center w-24 font-bold text-black">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} className="border border-black">
                          <td className="border-r border-black py-3 px-3 text-center text-gray-600 align-top">{idx + 1}</td>
                          <td className="border-r border-black py-3 px-3 align-top text-justify">
                            <div className="text-gray-900">{item.item_customer}</div>
                            {item.item_vendor && item.item_vendor !== item.item_customer && (
                              <>
                                <div className="h-3"></div>
                                <div className="text-gray-900"><span className="font-bold">Offer to:</span><br/>{item.item_vendor}</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-800 align-top">{item.qty || 1}</td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr className="border border-black">
                          <td colSpan={3} className="py-4 text-center italic text-gray-500">Tidak ada item dalam Surat Jalan ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <p className="text-[10pt] text-gray-600 italic mb-8 break-inside-avoid leading-relaxed">
                    Dokumen ini dikeluarkan oleh sistem integrasi data <span className="font-semibold">{companyName}</span> dan dinyatakan sah dan otentik bila disertai QR Code dan tidak memerlukan tanda tangan basah. Silahkan melakukan verifikasi dengan scan QR Code.
                  </p>

                  <div className="flex justify-between items-end break-inside-avoid text-[12pt]">
                    <div className="w-64 text-center">
                      <div className="text-left mb-1">Diterima,</div>
                      <div className="text-left mb-2">Tanggal : ______________________ .</div>
                      <div className="mb-20">{po?.customer_name || 'Customer'}</div>
                      <div>(__________________________)</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-28 h-28 border border-gray-200 p-1 bg-white overflow-hidden">
                        <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10pt] text-gray-400">Scan untuk verifikasi</p>
                    </div>
                    <div className="text-gray-800 text-center" style={{ minWidth: '200px' }}>
                      <p>Hormat kami,</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{companyName}</p>
                      <div style={{ height: '110px' }}></div>
                      <p className="font-bold text-gray-900 underline">{company?.leader_name || 'Admin'}</p>
                      <p className="text-gray-700 mt-0.5">{company?.admin_position || 'Staff'}</p>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
