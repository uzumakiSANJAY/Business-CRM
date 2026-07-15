import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/shared/Layout.jsx';
import {
  Package, PackageOpen, ArrowDownCircle, ArrowUpCircle,
  Plus, Trash2, ChevronDown, ChevronUp, X, Loader2, AlertCircle, Pencil,
} from 'lucide-react';
import {
  getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getItemLedger, addTransaction, updateTransaction, deleteTransaction,
} from '../../api/inventory.api';
import { getItems } from '../../api/items.api';
import { getItemCompanies } from '../../api/itemCompanies.api';
import { getItemTypes } from '../../api/itemTypes.api';

const today = () => new Date().toISOString().slice(0, 10);
const fmt   = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

/* ─── small reusable modal shell ─── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Edit ledger entry modal ─── */
function EditTxnModal({ txn, unit, onClose, onSave, loading }) {
  const [direction, setDirection] = useState(txn.direction);
  const [qty, setQty]             = useState(String(parseFloat(txn.quantity)));
  const [date, setDate]           = useState(txn.txn_date);
  const [notes, setNotes]         = useState(txn.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(txn.id, { direction, quantity: parseFloat(qty), txn_date: date, notes });
  };

  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <div className="flex gap-2">
            {['INWARD', 'OUTWARD'].map((d) => (
              <button
                key={d} type="button"
                onClick={() => setDirection(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  direction === d
                    ? d === 'INWARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {d === 'INWARD' ? '↓ Inward' : '↑ Outward'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantity ({unit})</label>
          <input type="number" step="0.001" min="0.001" value={qty} onChange={(e) => setQty(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── ledger history row (expandable) ─── */
function LedgerPanel({ itemId, unit, onDeleteTxn, onEditTxn }) {
  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ['ledger', itemId],
    queryFn: () => getItemLedger(itemId),
  });

  if (isLoading) return <div className="py-4 text-center text-sm text-slate-400">Loading...</div>;
  if (!ledger.length) return <div className="py-4 text-center text-sm text-slate-400">No transactions yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-100">
            <th className="py-2 px-3 text-left">Date</th>
            <th className="py-2 px-3 text-left">Type</th>
            <th className="py-2 px-3 text-right">Qty</th>
            <th className="py-2 px-3 text-left">Notes</th>
            <th className="py-2 px-3 text-left">By</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {ledger.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="py-2 px-3 whitespace-nowrap">{row.txn_date}</td>
              <td className="py-2 px-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  row.direction === 'INWARD'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {row.direction === 'INWARD' ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
                  {row.direction}
                </span>
              </td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.quantity)} {unit}</td>
              <td className="py-2 px-3 text-slate-500 max-w-[180px] truncate">{row.notes || '—'}</td>
              <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.created_by_name}</td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditTxn(row)}
                    className="p-1 rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    title="Edit entry"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteTxn(row.id)}
                    className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Edit inventory item modal (name + unit only) ─── */
function EditItemModal({ item, onClose, onSave, loading }) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(item.id, { name: name.trim(), unit: unit.trim() });
  };

  return (
    <Modal title="Edit Product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !name.trim()} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── single inventory row in the stock table ─── */
function StockRow({ item, onInward, onOutward, onEdit, onDelete, onDeleteTxn, onEditTxn }) {
  const [expanded, setExpanded] = useState(false);
  const stockZero = item.current_stock <= 0;

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : ''}`}>
        <td className="table-td">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {item.name}
          </button>
          {item.type === 'PACKED' && (
            <div className="ml-5 mt-0.5 text-xs text-slate-400">
              {[item.item_name, item.item_company_name, item.item_type_name].filter(Boolean).join(' › ')}
            </div>
          )}
        </td>
        <td className="table-td text-slate-500 text-sm">{item.unit}</td>
        <td className="table-td text-right font-mono text-emerald-700">{fmt(item.total_inward)}</td>
        <td className="table-td text-right font-mono text-red-600">{fmt(item.total_outward)}</td>
        <td className="table-td text-right">
          <span className={`font-bold font-mono text-base ${stockZero ? 'text-red-500' : 'text-slate-900'}`}>
            {fmt(item.current_stock)}
          </span>
        </td>
        <td className="table-td">
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={() => onInward(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
            >
              <ArrowDownCircle size={13} /> In
            </button>
            <button
              onClick={() => onOutward(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
            >
              <ArrowUpCircle size={13} /> Out
            </button>
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
              title="Edit product"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete product"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 py-2 bg-slate-50 border-b border-slate-100">
            <LedgerPanel itemId={item.id} unit={item.unit} onDeleteTxn={onDeleteTxn} onEditTxn={onEditTxn} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Add Packed Product modal ─── */
function AddPackedModal({ onClose, onSave, loading }) {
  const [itemId, setItemId]         = useState('');
  const [companyId, setCompanyId]   = useState('');
  const [typeId, setTypeId]         = useState('');
  const [unit, setUnit]             = useState('');

  const { data: items = [] }     = useQuery({ queryKey: ['items'],                   queryFn: () => getItems() });
  const { data: companies = [] } = useQuery({ queryKey: ['item-companies', itemId],  queryFn: () => getItemCompanies(itemId || null), enabled: !!itemId });
  const { data: types = [] }     = useQuery({ queryKey: ['item-types', companyId],   queryFn: () => getItemTypes(companyId || null),   enabled: !!companyId });

  const selectedType = types.find((t) => String(t.id) === String(typeId));
  useEffect(() => { if (selectedType) setUnit(selectedType.name); }, [selectedType]);
  useEffect(() => { setCompanyId(''); setTypeId(''); setUnit(''); }, [itemId]);
  useEffect(() => { setTypeId(''); setUnit(''); }, [companyId]);

  const selectedItem    = items.find((i) => String(i.id) === String(itemId));
  const selectedCompany = companies.find((c) => String(c.id) === String(companyId));
  const autoName = [selectedItem?.name, selectedCompany?.name, selectedType?.name].filter(Boolean).join(' - ');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId || !companyId || !typeId) return;
    onSave({
      name: autoName,
      type: 'PACKED',
      unit: unit.trim() || selectedType?.name || 'pcs',
      item_id: parseInt(itemId),
      item_company_id: parseInt(companyId),
      item_type_id: parseInt(typeId),
    });
  };

  return (
    <Modal title="Add Packed Product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select item…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required disabled={!itemId} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">Select company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Item Type (Pack)</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required disabled={!companyId} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">Select type…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit (auto-filled, editable)</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 15kg tin, bag, pcs" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {autoName && (
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            Will be saved as: <span className="font-medium text-slate-600">{autoName}</span>
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !typeId} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Add Product
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Add Loose Product modal ─── */
function AddLooseModal({ onClose, onSave, loading }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), type: 'LOOSE', unit: unit.trim() || 'pcs' });
  };

  return (
    <Modal title="Add Loose Product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Sugar, Palm Oil, Rice" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, litre, bag, pcs…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !name.trim()} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Add Product
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Add Inward / Outward modal ─── */
function TxnModal({ direction, items, onClose, onSave, loading, preselectedItem }) {
  const [itemId, setItemId] = useState(preselectedItem ? String(preselectedItem.id) : '');
  const [qty, setQty]       = useState('');
  const [date, setDate]     = useState(today());
  const [notes, setNotes]   = useState('');

  const locked       = !!preselectedItem;
  const selectedItem = preselectedItem || items.find((i) => String(i.id) === itemId);
  const isInward     = direction === 'INWARD';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId || !qty) return;
    onSave({ item_id: parseInt(itemId), direction, quantity: parseFloat(qty), txn_date: date, notes });
  };

  return (
    <Modal title={isInward ? '↓ Add Inward Stock' : '↑ Add Outward Stock'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product — locked label when coming from a row button, dropdown when from header */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
          {locked ? (
            <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700 font-medium">
              {preselectedItem.name}
              <span className="ml-2 text-xs font-normal text-slate-400">({preselectedItem.unit})</span>
            </div>
          ) : (
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select product…</option>
              {items.map((i) => (
                <option key={i.id} value={String(i.id)}>{i.name} ({i.unit})</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Quantity{selectedItem ? ` (${selectedItem.unit})` : ''}
          </label>
          <input
            type="number" step="0.001" min="0.001" value={qty}
            onChange={(e) => setQty(e.target.value)} required
            placeholder="0" autoFocus={locked}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Supplier, vehicle, reason…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            type="submit" disabled={loading || !itemId || !qty}
            className={`flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${
              isInward ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isInward ? 'Add Inward' : 'Add Outward'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── KPI card ─── */
function KpiCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

/* ─── main page ─── */
export default function InventoryPage() {
  const qc = useQueryClient();
  const [tab, setTab]               = useState('PACKED');
  const [modal, setModal]           = useState(null);     // null | 'addPacked' | 'addLoose' | 'inward' | 'outward'
  const [txnItem, setTxnItem]       = useState(null);     // pre-selected item for txn modal
  const [editItem, setEditItem]     = useState(null);     // item being edited
  const [editTxn, setEditTxn]       = useState(null);     // ledger row being edited

  const { data: allItems = [], isLoading, isError } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => getInventoryItems(),
  });

  const items = allItems.filter((i) => i.type === tab);

  const totalInward  = items.reduce((s, i) => s + parseFloat(i.total_inward),  0);
  const totalOutward = items.reduce((s, i) => s + parseFloat(i.total_outward), 0);
  const totalStock   = items.reduce((s, i) => s + parseFloat(i.current_stock), 0);

  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-items'] }); setModal(null); },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => updateInventoryItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-items'] }); setEditItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-items'] }),
  });

  const txnMutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      setModal(null);
      setTxnItem(null);
    },
  });

  const updateTxnMutation = useMutation({
    mutationFn: ({ id, data }) => updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      setEditTxn(null);
    },
  });

  const deleteTxnMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
    },
  });

  const openInward  = (item) => { setTxnItem(item || null); setModal('inward'); };
  const openOutward = (item) => { setTxnItem(item || null); setModal('outward'); };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.name}" from inventory? All ledger entries will remain.`)) return;
    deleteMutation.mutate(item.id);
  };

  const handleDeleteTxn = (id) => {
    if (!window.confirm('Delete this ledger entry? Stock will be recalculated.')) return;
    deleteTxnMutation.mutate(id);
  };

  return (
    <Layout title="Inventory">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="text-xs text-slate-500 mt-0.5">Inward · Outward · Stock</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openInward(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm"
          >
            <ArrowDownCircle size={15} /> Add Inward
          </button>
          <button
            onClick={() => openOutward(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-sm"
          >
            <ArrowUpCircle size={15} /> Add Outward
          </button>
          {tab === 'LOOSE' && (
            <button
              onClick={() => setModal('addLoose')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
            >
              <Plus size={15} /> Add Product
            </button>
          )}
          {tab === 'PACKED' && (
            <button
              onClick={() => setModal('addPacked')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
            >
              <Plus size={15} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'PACKED', label: 'Packed',  icon: Package },
          { key: 'LOOSE',  label: 'Loose',   icon: PackageOpen },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Products"      value={items.length}   />
        <KpiCard label="Total Inward"  value={fmt(totalInward)}  color="text-emerald-700" />
        <KpiCard label="Total Outward" value={fmt(totalOutward)} color="text-red-600" />
        <KpiCard label="Current Stock" value={fmt(totalStock)}   color={totalStock <= 0 ? 'text-red-600' : 'text-slate-900'} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Loading inventory…
          </div>
        ) : isError ? (
          <div className="py-16 flex items-center justify-center gap-2 text-red-500">
            <AlertCircle size={18} /> Failed to load inventory
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">No {tab.toLowerCase()} products yet.</p>
            <button
              onClick={() => setModal(tab === 'PACKED' ? 'addPacked' : 'addLoose')}
              className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
            >
              + Add your first product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="table-th text-left">Product</th>
                  <th className="table-th text-left">Unit</th>
                  <th className="table-th text-right">Total In</th>
                  <th className="table-th text-right">Total Out</th>
                  <th className="table-th text-right">Stock</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <StockRow
                    key={item.id}
                    item={item}
                    onInward={openInward}
                    onOutward={openOutward}
                    onEdit={(i) => setEditItem(i)}
                    onDelete={handleDelete}
                    onDeleteTxn={handleDeleteTxn}
                    onEditTxn={(row) => setEditTxn(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'addPacked' && (
        <AddPackedModal
          onClose={() => setModal(null)}
          onSave={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
      {modal === 'addLoose' && (
        <AddLooseModal
          onClose={() => setModal(null)}
          onSave={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
      {(modal === 'inward' || modal === 'outward') && (
        <TxnModal
          direction={modal === 'inward' ? 'INWARD' : 'OUTWARD'}
          items={items}
          preselectedItem={txnItem}
          onClose={() => { setModal(null); setTxnItem(null); }}
          onSave={(data) => txnMutation.mutate(data)}
          loading={txnMutation.isPending}
        />
      )}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(id, data) => updateItemMutation.mutate({ id, data })}
          loading={updateItemMutation.isPending}
        />
      )}
      {editTxn && (
        <EditTxnModal
          txn={editTxn}
          unit={allItems.find((i) => i.id === editTxn.item_id)?.unit || ''}
          onClose={() => setEditTxn(null)}
          onSave={(id, data) => updateTxnMutation.mutate({ id, data })}
          loading={updateTxnMutation.isPending}
        />
      )}
    </div>
    </Layout>
  );
}
