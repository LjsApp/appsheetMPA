import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Loader2 } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import {
  useSuratJalan,
  useSaveSuratJalan,
  usePoIns,
  useNeracaItems,
  useCompany,
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
      document.title = `${cName}_${String(sj.sj_number).replace(/\//g, '_')}`;
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
      {/* Print styles â€” same pattern as QuotationDetail */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body, html, #root { margin:0; padding:0; background:white !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; height:auto !important; overflow:visible !important; }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          .no-print { display: none !important; }
          #sj-doc { background:transparent !important; box-shadow:none !important; border:none !important; border-radius:0 !important; max-width:100% !important; margin:0 !important; position:relative; z-index:1; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          input { border: none !important; padding: 0 !important; outline: none !important; box-shadow: none !important; background: transparent !important; }
          input::placeholder { color: transparent !important; }
          .print-wm-tl { position:fixed !important; opacity:0.35 !important; }
          .print-wm-br { position:fixed !important; opacity:0.35 !important; }
          .print-page-footer { position:fixed !important; background:white !important; z-index:100 !important; }
        }
        /* Screen styles (absolute to the document container) */
        .print-wm-tl { position:absolute; top:0; left:0; width:320px; opacity:0.15; transform:translate(-20%, -20%); z-index:0; pointer-events:none; }
        .print-wm-br { position:absolute; bottom:0; right:0; width:360px; opacity:0.15; transform:translate(20%, 20%); z-index:0; pointer-events:none; }
        .print-page-footer { position:absolute; bottom:0; left:0; right:0; padding:10px 40px; display:flex; justify-content:flex-end; align-items:center; background:transparent; z-index:0; pointer-events:none; }
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

      {/* Surat Jalan Document */}
      <div className="bg-white max-w-[860px] mx-auto text-[12pt] relative overflow-hidden" id="sj-doc">
        
        {/* Watermark & footer - absolute on screen, fixed on print */}
        <img className="print-wm-tl" src="/watermark.png" alt="" />
        <img className="print-wm-br" src="/watermark.png" alt="" />
        <div className="print-page-footer">
          <div className="text-right text-[7.5pt] text-gray-500 leading-relaxed">
            {company?.address && <div>{company.address}</div>}
            <div className="flex justify-end gap-4">
              {company?.phone && <span>☎ {company.phone}</span>}
              {company?.email && <span>✉ {company.email}</span>}
            </div>
          </div>
        </div>

        <table className="w-full" style={{ borderCollapse: 'collapse' }}>

          {/* ===== THEAD: kop surat — repeats on every printed page ===== */}
          <thead>
            <tr>
              <td style={{ padding: 0 }}>
                <div className="px-10 pt-8 pb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {company?.logo_url ? (
                        <div className="w-24 h-24 overflow-hidden flex items-center justify-center">
                          <img src={getDriveImageUrl(company.logo_url)} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 border border-gray-200 rounded flex items-center justify-center text-gray-300 text-xs font-medium">Logo</div>
                      )}
                      <div>
                        <h1 className="text-blue-900 font-bold tracking-wide leading-tight text-[12pt]">{companyName}</h1>
                        {company?.address && <p className="text-gray-600 mt-0.5 text-[10pt]">{company.address}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-blue-800 text-white font-bold text-[8pt] uppercase tracking-widest px-3 py-1.5 rounded">SURAT JALAN</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* ===== TBODY: all body content ===== */}
          <tbody>
            <tr>
              <td style={{ padding: 0 }}>
                <div className="px-10 py-6">

                  {/* Info Block */}
                  <div className="grid grid-cols-2 gap-6 mb-5 text-[12pt] leading-snug">
                    <div className="space-y-1">
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Customer</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <div>
                          <div className="font-semibold text-gray-900">{po?.customer_name || '-'}</div>
                          {po?.alamat_pengiriman && <div className="text-gray-600 text-[11pt]">{po.alamat_pengiriman}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">No</span><span className="text-gray-700 mr-2">:</span><span className="font-bold text-gray-900">{sj.sj_number}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{formatDate(sj.created_date)}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{po?.po_in_number || '-'}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{po?.tanggal ? formatDate(po.tanggal) : '-'}</span></div>
                    </div>
                  </div>

                  {/* Greeting / Ekspedisi */}
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

                  {/* Items Table */}
                  <table className="w-full border-collapse mb-8 text-[11pt]">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        <th className="py-2.5 px-3 text-center font-semibold border border-black" style={{ width: '5%' }}>No</th>
                        <th className="py-2.5 px-3 text-left font-semibold border border-black">Item</th>
                        <th className="py-2.5 px-3 text-center font-semibold border border-black" style={{ width: '12%' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center italic text-gray-500 border border-black">Tidak ada item dalam Surat Jalan ini.</td>
                        </tr>
                      ) : items.map((item, idx) => (
                        <tr key={item.id} className="break-inside-avoid bg-white">
                          <td className="py-3 px-3 text-center text-gray-600 align-top border border-black">{idx + 1}</td>
                          <td className="py-3 px-3 align-top text-justify border border-black">
                            <div className="text-gray-900">{item.item_customer}</div>
                            {item.item_vendor && item.item_vendor !== item.item_customer && (
                              <>
                                <div className="h-3"></div>
                                <div className="text-gray-900"><span className="font-bold">Offer to:</span><br />{item.item_vendor}</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-800 align-top border border-black">{item.qty || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Disclaimer + Signatures */}
                  <div className="break-inside-avoid">
                    <p className="text-[10pt] text-gray-600 italic mb-8 leading-relaxed">
                      Dokumen ini dikeluarkan oleh sistem integrasi data <span className="font-semibold">{companyName}</span> dan dinyatakan sah dan otentik bila disertai QR Code dan tidak memerlukan tanda tangan basah. Silahkan melakukan verifikasi dengan scan QR Code.
                    </p>
                    
                    {/* Two-column signatures */}
                    <div className="flex justify-between items-start text-[12pt]">
                      {/* Left — received by */}
                      <div className="text-left" style={{ minWidth: '200px' }}>
                        <p>Diterima,</p>
                        <p className="mt-1">Tanggal : ________________________.</p>
                        <p className="mt-6 font-semibold text-gray-900 text-center">{po?.customer_name || 'Customer'}</p>
                        <div style={{ height: '90px' }}></div>
                        <p className="text-gray-900 text-center">(__________________________)</p>
                      </div>

                      {/* Right — company with QR */}
                      <div className="text-gray-800 text-center flex flex-col items-center" style={{ minWidth: '200px' }}>
                        <p className="invisible">Diterima,</p>
                        <p className="mt-1">Hormat kami,</p>
                        <p className="mt-6 font-semibold text-gray-900">{companyName}</p>
                        <div className="w-20 h-20 border border-gray-200 p-1 bg-white overflow-hidden my-2">
                          <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-[10pt] text-gray-400 mb-2">Scan untuk verifikasi</p>
                        <p className="font-bold text-gray-900 underline">{company?.leader_name || 'Admin'}</p>
                        <p className="text-gray-700 mt-0.5">{company?.admin_position || 'Direktur'}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          </tbody>
          {/* Spacer to prevent fixed footer from overlapping content */}
          <tfoot>
            <tr>
              <td>
                <div style={{ height: '50px' }}></div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
