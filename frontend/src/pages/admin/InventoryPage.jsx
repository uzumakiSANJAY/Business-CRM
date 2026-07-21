import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/shared/Layout.jsx';
import {
  Package, PackageOpen, Archive, ArrowDownCircle, ArrowUpCircle,
  Plus, Trash2, ChevronDown, ChevronUp, X, Loader2, AlertCircle,
  Pencil, Truck, FlaskConical,
} from 'lucide-react';
import {
  getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getItemLedger, addTransaction, updateTransaction, deleteTransaction,
} from '../../api/inventory.api';
import {
  getContainerTypes, createContainerType, updateContainerType, deleteContainerType,
  getContainerLedger, containerise, sellContainers,
} from '../../api/containers.api.js';
import { getItems }        from '../../api/items.api';
import { getItemCompanies } from '../../api/itemCompanies.api';
import { getItemTypes }    from '../../api/itemTypes.api';
import { getVendors }      from '../../api/vendors.api';

const today    = () => new Date().toISOString().slice(0, 10);
const fmt      = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtRate  = (n) => n != null ? '₹' + parseFloat(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
const fmtDT    = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const TXN_TYPE_LABELS = {
  PURCHASE:         { label: 'Purchase',        color: 'bg-emerald-100 text-emerald-700' },
  VENDOR_DISPATCH:  { label: 'Vendor Dispatch',  color: 'bg-blue-100 text-blue-700' },
  CONTAINERISE:     { label: 'Containerise',     color: 'bg-violet-100 text-violet-700' },
  MANUAL:           { label: 'Manual',           color: 'bg-slate-100 text-slate-600' },
  FILL:             { label: 'Fill',             color: 'bg-teal-100 text-teal-700' },
  SALE:             { label: 'Sale',             color: 'bg-orange-100 text-orange-700' },
};

/* ─── Generic modal shell ─── */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Ledger panel (bulk items) ─── */
function LedgerPanel({ itemId, unit, isLoose, onDeleteTxn, onEditTxn }) {
  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ['ledger', itemId],
    queryFn: () => getItemLedger(itemId),
  });

  if (isLoading) return <div className="py-4 text-center text-sm text-slate-400">Loading…</div>;
  if (!ledger.length) return <div className="py-4 text-center text-sm text-slate-400">No transactions yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="py-2 px-3 text-left">Date</th>
            <th className="py-2 px-3 text-left">Recorded At</th>
            <th className="py-2 px-3 text-left">Type</th>
            {isLoose && <th className="py-2 px-3 text-right">Rate</th>}
            {isLoose && <th className="py-2 px-3 text-left">Vendor</th>}
            <th className="py-2 px-3 text-right">Qty</th>
            <th className="py-2 px-3 text-left">Notes</th>
            <th className="py-2 px-3 text-left">By</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {ledger.map((row) => {
            const tt = TXN_TYPE_LABELS[row.txn_type] || TXN_TYPE_LABELS.MANUAL;
            return (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 whitespace-nowrap">{row.txn_date}</td>
                <td className="py-2 px-3 whitespace-nowrap text-slate-400">{fmtDT(row.created_at)}</td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      row.direction === 'INWARD' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.direction === 'INWARD' ? <ArrowDownCircle size={10} /> : <ArrowUpCircle size={10} />}
                      {row.direction}
                    </span>
                    {row.txn_type && row.txn_type !== 'MANUAL' && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tt.color}`}>{tt.label}</span>
                    )}
                  </div>
                </td>
                {isLoose && <td className="py-2 px-3 text-right font-mono text-slate-600">{fmtRate(row.rate)}</td>}
                {isLoose && <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.vendor_name || '—'}</td>}
                <td className="py-2 px-3 text-right font-mono">{fmt(row.quantity)} {unit}</td>
                <td className="py-2 px-3 text-slate-500 max-w-[140px] truncate">{row.notes || '—'}</td>
                <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.created_by_name}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEditTxn(row)} className="p-1 rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50" title="Edit">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => onDeleteTxn(row.id)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Container ledger panel ─── */
function ContainerLedgerPanel({ typeId, typeName }) {
  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ['container-ledger', typeId],
    queryFn: () => getContainerLedger(typeId),
  });

  if (isLoading) return <div className="py-4 text-center text-sm text-slate-400">Loading…</div>;
  if (!ledger.length) return <div className="py-4 text-center text-sm text-slate-400">No transactions yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="py-2 px-3 text-left">Date</th>
            <th className="py-2 px-3 text-left">Recorded At</th>
            <th className="py-2 px-3 text-left">Type</th>
            <th className="py-2 px-3 text-right">Qty (pcs)</th>
            <th className="py-2 px-3 text-right">Rate</th>
            <th className="py-2 px-3 text-left">Vendor / Source</th>
            <th className="py-2 px-3 text-left">Notes</th>
            <th className="py-2 px-3 text-left">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {ledger.map((row) => {
            const tt = TXN_TYPE_LABELS[row.txn_type] || {};
            return (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 whitespace-nowrap">{row.txn_date}</td>
                <td className="py-2 px-3 whitespace-nowrap text-slate-400">{fmtDT(row.created_at)}</td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      row.direction === 'INWARD' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.direction === 'INWARD' ? <ArrowDownCircle size={10} /> : <ArrowUpCircle size={10} />}
                      {row.direction}
                    </span>
                    {tt.label && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tt.color}`}>{tt.label}</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-mono">{fmt(row.quantity)}</td>
                <td className="py-2 px-3 text-right font-mono">{fmtRate(row.rate)}</td>
                <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                  {row.vendor_name || row.source_item_name || '—'}
                </td>
                <td className="py-2 px-3 text-slate-500 max-w-[140px] truncate">{row.notes || '—'}</td>
                <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.created_by_name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Edit ledger entry modal ─── */
function EditTxnModal({ txn, unit, isLoose, onClose, onSave, loading }) {
  const [direction, setDirection] = useState(txn.direction);
  const [qty,       setQty]       = useState(String(parseFloat(txn.quantity)));
  const [date,      setDate]      = useState(txn.txn_date);
  const [rate,      setRate]      = useState(txn.rate != null ? String(txn.rate) : '');
  const [notes,     setNotes]     = useState(txn.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(txn.id, { direction, quantity: parseFloat(qty), txn_date: date, notes,
      rate: rate ? parseFloat(rate) : null });
  };

  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <div className="flex gap-2">
            {['INWARD', 'OUTWARD'].map((d) => (
              <button key={d} type="button" onClick={() => setDirection(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  direction === d
                    ? d === 'INWARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                }`}>
                {d === 'INWARD' ? '↓ Inward' : '↑ Outward'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantity ({unit})</label>
          <input type="number" step="0.001" min="0.001" value={qty} onChange={(e) => setQty(e.target.value)} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {isLoose && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rate per unit (₹)</label>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
              placeholder="Optional"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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

/* ─── Edit item name/unit modal ─── */
function EditItemModal({ item, onClose, onSave, loading }) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);

  return (
    <Modal title="Edit Product" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(item.id, { name: name.trim(), unit: unit.trim() }); }} className="space-y-4">
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
            {loading && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Add Packed Product modal ─── */
function AddPackedModal({ onClose, onSave, loading }) {
  const [itemId, setItemId]       = useState('');
  const [companyId, setCompanyId] = useState('');
  const [typeId, setTypeId]       = useState('');
  const [unit, setUnit]           = useState('');

  const { data: items = [] }     = useQuery({ queryKey: ['items'],                  queryFn: () => getItems() });
  const { data: companies = [] } = useQuery({ queryKey: ['item-companies', itemId], queryFn: () => getItemCompanies(itemId || null), enabled: !!itemId });
  const { data: types = [] }     = useQuery({ queryKey: ['item-types', companyId],  queryFn: () => getItemTypes(companyId || null),  enabled: !!companyId });

  const selectedType    = types.find((t) => String(t.id) === String(typeId));
  const selectedItem    = items.find((i) => String(i.id) === String(itemId));
  const selectedCompany = companies.find((c) => String(c.id) === String(companyId));
  const autoName = [selectedItem?.name, selectedCompany?.name, selectedType?.name].filter(Boolean).join(' - ');

  useEffect(() => { if (selectedType) setUnit(selectedType.name); }, [selectedType]);
  useEffect(() => { setCompanyId(''); setTypeId(''); setUnit(''); }, [itemId]);
  useEffect(() => { setTypeId(''); setUnit(''); }, [companyId]);

  return (
    <Modal title="Add Packed Product" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!typeId) return; onSave({ name: autoName, type: 'PACKED', unit: unit.trim() || selectedType?.name || 'pcs', item_id: parseInt(itemId), item_company_id: parseInt(companyId), item_type_id: parseInt(typeId) }); }} className="space-y-4">
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 15kg tin, bag, pcs" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {autoName && <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">Saved as: <span className="font-medium text-slate-600">{autoName}</span></p>}
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

  return (
    <Modal title="Add Loose Product" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim(), type: 'LOOSE', unit: unit.trim() || 'litre' }); }} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. RBD Palm Oil, Sugar" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="litre, kg, ton…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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

/* ─── Generic Inward/Outward modal (packed items, or manual loose) ─── */
function TxnModal({ direction, items, onClose, onSave, loading, preselectedItem, showRate }) {
  const [itemId, setItemId] = useState(preselectedItem ? String(preselectedItem.id) : '');
  const [qty,    setQty]    = useState('');
  const [date,   setDate]   = useState(today());
  const [rate,   setRate]   = useState('');
  const [notes,  setNotes]  = useState('');

  const locked       = !!preselectedItem;
  const selectedItem = preselectedItem || items.find((i) => String(i.id) === itemId);
  const isInward     = direction === 'INWARD';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId || !qty) return;
    onSave({
      item_id: parseInt(itemId), direction, quantity: parseFloat(qty), txn_date: date, notes,
      rate: rate ? parseFloat(rate) : null,
      txn_type: isInward ? 'PURCHASE' : 'MANUAL',
    });
  };

  return (
    <Modal title={isInward ? '↓ Add Inward Stock' : '↑ Add Outward Stock'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
          {locked ? (
            <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700 font-medium">
              {preselectedItem.name} <span className="text-xs font-normal text-slate-400">({preselectedItem.unit})</span>
            </div>
          ) : (
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select product…</option>
              {items.map((i) => <option key={i.id} value={String(i.id)}>{i.name} ({i.unit})</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Quantity{selectedItem ? ` (${selectedItem.unit})` : ''}
          </label>
          <input type="number" step="0.001" min="0.001" value={qty} onChange={(e) => setQty(e.target.value)}
            required placeholder="0" autoFocus={locked}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {showRate && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {isInward ? 'Purchase Rate per unit (₹)' : 'Rate per unit (₹)'}
            </label>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 90.50"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Supplier, vehicle, reason…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !itemId || !qty}
            className={`flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${isInward ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isInward ? 'Add Inward' : 'Add Outward'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Vendor Dispatch modal (Loose only) ─── */
function VendorDispatchModal({ item, onClose, onSave, loading }) {
  const [qty,      setQty]      = useState('');
  const [rate,     setRate]     = useState('');
  const [vendorId, setVendorId] = useState('');
  const [date,     setDate]     = useState(today());
  const [notes,    setNotes]    = useState('');

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });

  return (
    <Modal title={`🚚 Dispatch to Vendor — ${item.name}`} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ item_id: item.id, direction: 'OUTWARD', quantity: parseFloat(qty), txn_date: date, rate: rate ? parseFloat(rate) : null, vendor_id: vendorId ? parseInt(vendorId) : null, notes, txn_type: 'VENDOR_DISPATCH' }); }} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendor (Party) *</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Qty ({item.unit}) *</label>
            <input type="number" step="0.001" min="0.001" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus
              placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Selling Rate (₹) *</label>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required
              placeholder="e.g. 95.00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vehicle, remarks…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !qty || !rate || !vendorId}
            className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Dispatch
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Containerise modal ─── */
function ContaineriseModal({ item, containerTypes, onClose, onSave, loading }) {
  const [ctId,  setCtId]  = useState('');
  const [num,   setNum]   = useState('');
  const [date,  setDate]  = useState(today());
  const [notes, setNotes] = useState('');

  const ct = containerTypes.find((c) => String(c.id) === ctId);
  const litresNeeded = ct && num ? parseFloat(num) * parseFloat(ct.capacity_litres) : null;
  const stockOk = litresNeeded != null && litresNeeded <= parseFloat(item.current_stock || 0);

  return (
    <Modal title={`📦 Containerise — ${item.name}`} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ item_id: item.id, container_type_id: parseInt(ctId), num_containers: parseFloat(num), txn_date: date, notes }); }} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Container Type *</label>
          <select value={ctId} onChange={(e) => setCtId(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select container…</option>
            {containerTypes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.capacity_litres} {item.unit}/container)</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Number of Containers to Fill *</label>
          <input type="number" step="1" min="1" value={num} onChange={(e) => setNum(e.target.value)} required autoFocus
            placeholder="e.g. 10" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Live preview */}
        {litresNeeded != null && (
          <div className={`rounded-xl px-4 py-3 text-sm ${stockOk ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            <p className="font-semibold">
              {num} containers × {ct.capacity_litres} {item.unit} = <span className="font-bold">{litresNeeded.toFixed(3)} {item.unit}</span>
            </p>
            <p className="text-xs mt-0.5">
              Available stock: {fmt(item.current_stock)} {item.unit}
              {stockOk ? ' ✓ Sufficient' : ' ✗ Insufficient stock!'}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batch, remarks…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !ctId || !num || !stockOk}
            className="flex-1 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Containerise
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Sell Containers modal ─── */
function SellContainersModal({ preselectedType, containerTypes, onClose, onSave, loading }) {
  const [ctId,     setCtId]     = useState(preselectedType ? String(preselectedType.id) : '');
  const [qty,      setQty]      = useState('');
  const [rate,     setRate]     = useState('');
  const [vendorId, setVendorId] = useState('');
  const [date,     setDate]     = useState(today());
  const [notes,    setNotes]    = useState('');

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const locked = !!preselectedType;
  const ct = containerTypes.find((c) => String(c.id) === ctId);

  return (
    <Modal title="Sell Containers" onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ container_type_id: parseInt(ctId), quantity: parseFloat(qty), rate: rate ? parseFloat(rate) : null, txn_date: date, vendor_id: vendorId ? parseInt(vendorId) : null, notes }); }} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Container Type *</label>
          {locked ? (
            <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700 font-medium">
              {preselectedType.name}
              <span className="ml-2 text-xs font-normal text-slate-400">Stock: {fmt(preselectedType.current_stock)} pcs</span>
            </div>
          ) : (
            <select value={ctId} onChange={(e) => setCtId(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select container…</option>
              {containerTypes.map((c) => <option key={c.id} value={c.id}>{c.name} (stock: {fmt(c.current_stock)})</option>)}
            </select>
          )}
        </div>
        {ct && <p className="text-xs text-slate-400">Available: <span className="font-semibold text-slate-600">{fmt(ct.current_stock)} pcs</span></p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Qty (pcs) *</label>
            <input type="number" step="1" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus
              placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rate per container (₹)</label>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 1500" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendor / Buyer</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">— None —</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
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
          <button type="submit" disabled={loading || !ctId || !qty}
            className="flex-1 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Record Sale
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Add / Edit Container Type modal ─── */
function ContainerTypeModal({ existing, onClose, onSave, loading }) {
  const [name,     setName]     = useState(existing?.name || '');
  const [capacity, setCapacity] = useState(existing ? String(existing.capacity_litres) : '');

  return (
    <Modal title={existing ? 'Edit Container Type' : 'Add Container Type'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), capacity_litres: parseFloat(capacity) }); }} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. 15 Lit Tin Jar" autoFocus
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Capacity (litres per container) *</label>
          <input type="number" step="0.001" min="0.001" value={capacity} onChange={(e) => setCapacity(e.target.value)} required placeholder="e.g. 15"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !name.trim() || !capacity}
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} {existing ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Container type row ─── */
function ContainerRow({ ct, onSell, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const stockZero = ct.current_stock <= 0;

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : ''}`}>
        <td className="table-td">
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {ct.name}
          </button>
        </td>
        <td className="table-td text-slate-500 font-mono text-sm">{ct.capacity_litres} lit</td>
        <td className="table-td text-right font-mono text-emerald-700">{fmt(ct.total_filled)}</td>
        <td className="table-td text-right font-mono text-red-600">{fmt(ct.total_sold)}</td>
        <td className="table-td text-right">
          <span className={`font-bold font-mono text-base ${stockZero ? 'text-red-500' : 'text-slate-900'}`}>
            {fmt(ct.current_stock)}
          </span>
        </td>
        <td className="table-td">
          <div className="flex items-center gap-1.5 justify-end">
            <button onClick={() => onSell(ct)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-medium">
              <ArrowUpCircle size={13} /> Sell
            </button>
            <button onClick={() => onEdit(ct)} className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(ct)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 py-2 bg-slate-50 border-b border-slate-100">
            <ContainerLedgerPanel typeId={ct.id} typeName={ct.name} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Bulk stock row ─── */
function StockRow({ item, isLoose, containerTypes, onInward, onOutward, onDispatch, onContainerise, onEdit, onDelete, onDeleteTxn, onEditTxn }) {
  const [expanded, setExpanded] = useState(false);
  const stockZero = item.current_stock <= 0;

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : ''}`}>
        <td className="table-td">
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium">
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
          <div className="flex items-center gap-1 justify-end flex-wrap">
            <button onClick={() => onInward(item)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium">
              <ArrowDownCircle size={12} /> In
            </button>
            <button onClick={() => onOutward(item)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium">
              <ArrowUpCircle size={12} /> Out
            </button>
            {isLoose && (
              <>
                <button onClick={() => onDispatch(item)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                  title="Dispatch to vendor">
                  <Truck size={12} /> Dispatch
                </button>
                {containerTypes.length > 0 && (
                  <button onClick={() => onContainerise(item)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-medium"
                    title="Containerise">
                    <FlaskConical size={12} /> Fill Jars
                  </button>
                )}
              </>
            )}
            <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 py-2 bg-slate-50 border-b border-slate-100">
            <LedgerPanel itemId={item.id} unit={item.unit} isLoose={isLoose} onDeleteTxn={onDeleteTxn} onEditTxn={onEditTxn} />
          </td>
        </tr>
      )}
    </>
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

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function InventoryPage() {
  const qc = useQueryClient();

  const [tab,        setTab]        = useState('PACKED');
  const [modal,      setModal]      = useState(null);
  const [txnItem,    setTxnItem]    = useState(null);
  const [editItem,   setEditItem]   = useState(null);
  const [editTxn,    setEditTxn]    = useState(null);
  const [dispatchItem,     setDispatchItem]     = useState(null);
  const [containeriseItem, setContaineriseItem] = useState(null);
  const [sellType,         setSellType]         = useState(null);
  const [editCtType,       setEditCtType]       = useState(null);

  /* ── Data queries ── */
  const { data: allItems = [], isLoading, isError } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => getInventoryItems(),
  });
  const { data: containerTypes = [] } = useQuery({
    queryKey: ['container-types'],
    queryFn: getContainerTypes,
  });

  const items      = allItems.filter((i) => i.type === tab);
  const looseItems = allItems.filter((i) => i.type === 'LOOSE');

  const totalInward  = items.reduce((s, i) => s + parseFloat(i.total_inward),  0);
  const totalOutward = items.reduce((s, i) => s + parseFloat(i.total_outward), 0);
  const totalStock   = items.reduce((s, i) => s + parseFloat(i.current_stock), 0);

  const ctTotalFilled = containerTypes.reduce((s, c) => s + parseFloat(c.total_filled), 0);
  const ctTotalSold   = containerTypes.reduce((s, c) => s + parseFloat(c.total_sold),   0);
  const ctTotalStock  = containerTypes.reduce((s, c) => s + parseFloat(c.current_stock), 0);

  /* ── Mutations — bulk items ── */
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
      setModal(null); setTxnItem(null);
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

  /* ── Mutations — dispatch & containerise ── */
  const dispatchMutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      setDispatchItem(null);
    },
  });
  const containeriseMutation = useMutation({
    mutationFn: containerise,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      qc.invalidateQueries({ queryKey: ['container-types'] });
      qc.invalidateQueries({ queryKey: ['container-ledger'] });
      setContaineriseItem(null);
    },
  });

  /* ── Mutations — containers ── */
  const createCtMutation = useMutation({
    mutationFn: createContainerType,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['container-types'] }); setModal(null); },
  });
  const updateCtMutation = useMutation({
    mutationFn: ({ id, data }) => updateContainerType(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['container-types'] }); setEditCtType(null); },
  });
  const deleteCtMutation = useMutation({
    mutationFn: deleteContainerType,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['container-types'] }),
  });
  const sellMutation = useMutation({
    mutationFn: sellContainers,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['container-types'] });
      qc.invalidateQueries({ queryKey: ['container-ledger'] });
      setSellType(null);
    },
  });

  /* ── Helpers ── */
  const openInward  = (item) => { setTxnItem(item || null); setModal('inward'); };
  const openOutward = (item) => { setTxnItem(item || null); setModal('outward'); };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.name}"? All ledger entries will remain.`)) return;
    deleteMutation.mutate(item.id);
  };
  const handleDeleteTxn = (id) => {
    if (!window.confirm('Delete this ledger entry? Stock will be recalculated.')) return;
    deleteTxnMutation.mutate(id);
  };
  const handleDeleteCt = (ct) => {
    if (!window.confirm(`Delete container type "${ct.name}"?`)) return;
    deleteCtMutation.mutate(ct.id);
  };

  const isLooseTab = tab === 'LOOSE';

  return (
    <Layout title="Inventory">
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="page-title">Inventory</h1>
              <p className="text-xs text-slate-500 mt-0.5">Inward · Outward · Dispatch · Containers</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tab !== 'CONTAINERS' && (
              <>
                <button onClick={() => openInward(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm">
                  <ArrowDownCircle size={15} /> Add Inward
                </button>
                <button onClick={() => openOutward(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-sm">
                  <ArrowUpCircle size={15} /> Add Outward
                </button>
                <button
                  onClick={() => setModal(tab === 'PACKED' ? 'addPacked' : 'addLoose')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm">
                  <Plus size={15} /> Add Product
                </button>
              </>
            )}
            {tab === 'CONTAINERS' && (
              <>
                <button onClick={() => setSellType(null) || setModal('sell')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 shadow-sm">
                  <ArrowUpCircle size={15} /> Sell Containers
                </button>
                <button onClick={() => setModal('addContainer')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm">
                  <Plus size={15} /> Add Container Type
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { key: 'PACKED',     label: 'Packed',     icon: Package },
            { key: 'LOOSE',      label: 'Loose',      icon: PackageOpen },
            { key: 'CONTAINERS', label: 'Containers', icon: Archive },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── KPI row ── */}
        {tab === 'CONTAINERS' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Types"        value={containerTypes.length} />
            <KpiCard label="Total Filled" value={fmt(ctTotalFilled)}    color="text-emerald-700" />
            <KpiCard label="Total Sold"   value={fmt(ctTotalSold)}      color="text-red-600" />
            <KpiCard label="In Stock"     value={fmt(ctTotalStock)}      color={ctTotalStock <= 0 ? 'text-red-600' : 'text-slate-900'} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Products"      value={items.length} />
            <KpiCard label="Total Inward"  value={fmt(totalInward)}  color="text-emerald-700" />
            <KpiCard label="Total Outward" value={fmt(totalOutward)} color="text-red-600" />
            <KpiCard label="Current Stock" value={fmt(totalStock)}   color={totalStock <= 0 ? 'text-red-600' : 'text-slate-900'} />
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {tab === 'CONTAINERS' ? (
            // Containers tab
            containerTypes.length === 0 ? (
              <div className="py-16 text-center">
                <Archive size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">No container types yet.</p>
                <button onClick={() => setModal('addContainer')} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                  + Add first container type (e.g. 15 Lit Tin Jar)
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="table-th text-left">Container Type</th>
                      <th className="table-th text-left">Capacity</th>
                      <th className="table-th text-right">Total Filled</th>
                      <th className="table-th text-right">Total Sold</th>
                      <th className="table-th text-right">In Stock (pcs)</th>
                      <th className="table-th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {containerTypes.map((ct) => (
                      <ContainerRow
                        key={ct.id} ct={ct}
                        onSell={(c) => setSellType(c)}
                        onEdit={(c) => setEditCtType(c)}
                        onDelete={handleDeleteCt}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // Packed / Loose tab
            isLoading ? (
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
                <button onClick={() => setModal(tab === 'PACKED' ? 'addPacked' : 'addLoose')} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
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
                        key={item.id} item={item}
                        isLoose={isLooseTab}
                        containerTypes={containerTypes}
                        onInward={openInward}
                        onOutward={openOutward}
                        onDispatch={(i) => setDispatchItem(i)}
                        onContainerise={(i) => setContaineriseItem(i)}
                        onEdit={(i) => setEditItem(i)}
                        onDelete={handleDelete}
                        onDeleteTxn={handleDeleteTxn}
                        onEditTxn={(row) => setEditTxn(row)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ══ Modals ══ */}
      {modal === 'addPacked' && (
        <AddPackedModal onClose={() => setModal(null)} onSave={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
      )}
      {modal === 'addLoose' && (
        <AddLooseModal onClose={() => setModal(null)} onSave={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
      )}
      {(modal === 'inward' || modal === 'outward') && (
        <TxnModal
          direction={modal === 'inward' ? 'INWARD' : 'OUTWARD'}
          items={items}
          preselectedItem={txnItem}
          showRate={isLooseTab || (txnItem?.type === 'LOOSE')}
          onClose={() => { setModal(null); setTxnItem(null); }}
          onSave={(d) => txnMutation.mutate(d)}
          loading={txnMutation.isPending}
        />
      )}
      {editItem && (
        <EditItemModal item={editItem} onClose={() => setEditItem(null)}
          onSave={(id, data) => updateItemMutation.mutate({ id, data })}
          loading={updateItemMutation.isPending} />
      )}
      {editTxn && (
        <EditTxnModal
          txn={editTxn}
          unit={allItems.find((i) => i.id === editTxn.item_id)?.unit || ''}
          isLoose={allItems.find((i) => i.id === editTxn.item_id)?.type === 'LOOSE'}
          onClose={() => setEditTxn(null)}
          onSave={(id, data) => updateTxnMutation.mutate({ id, data })}
          loading={updateTxnMutation.isPending} />
      )}
      {dispatchItem && (
        <VendorDispatchModal item={dispatchItem} onClose={() => setDispatchItem(null)}
          onSave={(d) => dispatchMutation.mutate(d)} loading={dispatchMutation.isPending} />
      )}
      {containeriseItem && (
        <ContaineriseModal
          item={containeriseItem}
          containerTypes={containerTypes}
          onClose={() => setContaineriseItem(null)}
          onSave={(d) => containeriseMutation.mutate(d)}
          loading={containeriseMutation.isPending} />
      )}
      {modal === 'addContainer' && (
        <ContainerTypeModal onClose={() => setModal(null)}
          onSave={(d) => createCtMutation.mutate(d)} loading={createCtMutation.isPending} />
      )}
      {editCtType && (
        <ContainerTypeModal existing={editCtType} onClose={() => setEditCtType(null)}
          onSave={(d) => updateCtMutation.mutate({ id: editCtType.id, data: d })}
          loading={updateCtMutation.isPending} />
      )}
      {(sellType !== undefined && sellType !== null) || modal === 'sell' ? (
        <SellContainersModal
          preselectedType={sellType || null}
          containerTypes={containerTypes}
          onClose={() => { setSellType(undefined); setModal(null); }}
          onSave={(d) => sellMutation.mutate(d)}
          loading={sellMutation.isPending} />
      ) : null}
    </Layout>
  );
}
