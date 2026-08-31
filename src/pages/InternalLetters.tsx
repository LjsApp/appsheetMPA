import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Printer, Plus, Pencil, Trash2, FileText, Upload, X } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { useInternalLetters, useSaveInternalLetter, useDeleteInternalLetter, useUploadFile, usePoIns, useVendors, useCompany } from "@/hooks/useData";
import { formatCurrency, formatDate } from "@/lib/utils";
import AddInternalLetterModal from "@/components/AddInternalLetterModal";
import TableToolbar from "@/components/TableToolbar";
import type { InternalLetter } from "@/types";

const toDateInput = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

function TypeBadge({ type }: { type?: string }) {
  if (!type || type === "Full") return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${type === "DP" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
      {type}
    </span>
  );
}

export default function InternalLetters() {
  const navigate = useNavigate();
  const { data: letters = [], isLoading, refetch } = useInternalLetters();
  const { data: poIns = [] } = usePoIns();
  const { data: vendors = [] } = useVendors();
  const { data: company } = useCompany();
  const saveIL = useSaveInternalLetter();
  const deleteIL = useDeleteInternalLetter();
  const uploadFile = useUploadFile();

  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [editModal, setEditModal] = useState<{ isOpen: boolean; letter: InternalLetter | null }>({ isOpen: false, letter: null });
  const [editNumber, setEditNumber] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editPerihal, setEditPerihal] = useState("");
  const [editFranco, setEditFranco] = useState("");
  const [editType, setEditType] = useState("Full");
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEdit = (letter: InternalLetter) => {
    setEditNumber(letter.internal_letter_number || "");
    setEditTanggal(toDateInput(letter.tanggal));
    setEditPerihal(letter.perihal || "");
    setEditFranco(letter.franco || "");
    setEditType(letter.type || "Full");
    let docs: any[] = [];
    try { docs = JSON.parse(letter.dokumen || "[]"); } catch {}
    setExistingDocs(docs);
    setNewFiles([]);
    setEditModal({ isOpen: true, letter });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
  };

  const handleSaveEdit = async () => {
    if (!editModal.letter) return;
    setIsSaving(true);
    try {
      let finalDocs = [...existingDocs];
      for (const file of newFiles) {
        const base64 = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
        const res = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
        const fileUrl = typeof res === "string" ? res : (res as any)?.url;
        if (fileUrl) finalDocs.push({ name: file.name, url: fileUrl });
      }
      await saveIL.mutateAsync({
        ...editModal.letter,
        internal_letter_number: editNumber,
        tanggal: editTanggal,
        perihal: editPerihal,
        franco: editFranco,
        type: editType,
        dokumen: JSON.stringify(finalDocs),
        updated_date: new Date().toISOString(),
      });
      setEditModal({ isOpen: false, letter: null });
      refetch();
    } catch { alert("Gagal menyimpan"); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus Internal Letter ini?")) return;
    await deleteIL.mutateAsync(id);
    refetch();
  };

  // Group by po_in_id — same pattern as PO Out groups by quotation_id
  const groupedLetters = useMemo(() => {
    const groups = new Map<string, InternalLetter[]>();
    letters.forEach(l => {
      const key = l.po_in_id || l.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(l);
    });
    return Array.from(groups.values());
  }, [letters]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groupedLetters;
    return groupedLetters.filter(group =>
      group.some(l =>
        l.customer_name?.toLowerCase().includes(q) ||
        l.internal_letter_number?.toLowerCase().includes(q) ||
        l.vendor_name?.toLowerCase().includes(q)
      )
    );
  }, [groupedLetters, search]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / rowsPerPage));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Internal Letter"
          subtitle={`${letters.length} Surat Pengajuan RAB`}
        />
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Internal Letter
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <TableToolbar
          search={search}
          onSearchChange={s => { setSearch(s); setCurrentPage(1); }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={n => { setRowsPerPage(n); setCurrentPage(1); }}
          totalRows={filteredGroups.reduce((acc, g) => acc + g.length, 0)}
          searchPlaceholder="Cari customer, vendor, no. IL..."
        />

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : letters.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            Belum ada data Internal Letter
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs uppercase tracking-wide">CUSTOMER</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wide">NO. INTERNAL LETTER</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wide">VENDOR</th>
                  <th className="px-6 py-4 text-center text-xs uppercase tracking-wide">JML ITEM</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-wide">TOTAL NILAI</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wide">DOKUMEN</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-wide">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedGroups.map((group) => {
                  return group.map((letter, index) => {
                    let docs: any[] = [];
                    try { docs = JSON.parse(letter.dokumen || "[]"); } catch {}
                    let itemsCount = letter.jumlah_item || 0;
                    const poIn = poIns.find(p => p.id === letter.po_in_id);

                    return (
                      <tr key={letter.id} className="hover:bg-gray-50/50 transition-colors">
                        {index === 0 && (
                          <td rowSpan={group.length} className="px-6 py-4 align-top border-r border-gray-100 bg-white">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{letter.customer_name || "—"}</span>
                              {poIn?.judul && (
                                <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]" title={poIn.judul}>{poIn.judul}</span>
                              )}
                              <span className="text-[11px] text-gray-400 font-mono mt-0.5">{poIn?.po_in_number || "—"}</span>
                            </div>
                          </td>
                        )}

                        <td className="px-6 py-4 font-mono text-xs font-semibold text-violet-700">
                          <div className="flex items-center gap-2">
                            <span>{letter.internal_letter_number}</span>
                            <TypeBadge type={letter.type} />
                          </div>
                          {letter.tanggal && (
                            <div className="text-[11px] text-gray-400 font-sans mt-0.5">{formatDate(letter.tanggal)}</div>
                          )}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900">{letter.vendor_name}</td>

                        <td className="px-6 py-4 text-center text-gray-600">{itemsCount}</td>

                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          Rp {formatCurrency(Number(letter.total_nilai))}
                        </td>

                        <td className="px-6 py-4">
                          {docs.length > 0 ? (
                            <div className="flex gap-2 flex-wrap">
                              {docs.map((d: any, idx: number) => (
                                <a
                                  key={`${letter.id}-doc-${idx}`}
                                  href={d.url || d}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                >
                                  Dok.{idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Tidak ada dokumen</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openEdit(letter)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Edit Internal Letter"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/internal-letters/${letter.id}`)}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              title="Cetak / Detail"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
            <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      <AddInternalLetterModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); refetch(); }}
      />

      {editModal.isOpen && editModal.letter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">Edit Internal Letter</h2>
              <button onClick={() => setEditModal({ isOpen: false, letter: null })} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-600 mb-4">
                Vendor: <span className="font-semibold text-gray-800">{editModal.letter.vendor_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Kolom Kiri */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">No. Internal Letter</label>
                    <input type="text" value={editNumber} onChange={e => setEditNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal</label>
                    <input type="date" value={editTanggal} onChange={e => setEditTanggal(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Perihal</label>
                    <input type="text" value={editPerihal} onChange={e => setEditPerihal(e.target.value)}
                      placeholder="mis. Pengadaan Filter Element"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Franco</label>
                    <div className="space-y-2">
                      <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${editFranco === company?.address ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                        <div className="mt-0.5">
                          <input 
                            type="radio" 
                            name="franco"
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            checked={editFranco === company?.address}
                            onChange={() => setEditFranco(company?.address || "")}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Alamat Perusahaan</div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{company?.address || "-"}</div>
                        </div>
                      </label>

                      {editModal.letter?.vendor_id && (
                        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${editFranco === vendors.find(v => v.id === editModal.letter?.vendor_id)?.address ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <div className="mt-0.5">
                            <input 
                              type="radio" 
                              name="franco"
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              checked={editFranco === vendors.find(v => v.id === editModal.letter?.vendor_id)?.address}
                              onChange={() => setEditFranco(vendors.find(v => v.id === editModal.letter?.vendor_id)?.address || "")}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">Alamat Vendor</div>
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{vendors.find(v => v.id === editModal.letter?.vendor_id)?.address || "-"}</div>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Dokumen Internal Letter</label>
                    {existingDocs.length > 0 && (
                      <ul className="mb-2 space-y-1">
                        {existingDocs.map((doc, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">{doc.name}</a>
                            <button onClick={() => setExistingDocs(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Klik untuk unggah</p>
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>

                    {newFiles.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {newFiles.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="flex-1 truncate">{f.name}</span>
                            <button onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditModal({ isOpen: false, letter: null })}>Batal</Button>
              <Button onClick={handleSaveEdit} loading={isSaving}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}