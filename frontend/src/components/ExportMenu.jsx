import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileDown, ChevronDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRANDING } from '../config/branding';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount) {
  return parseFloat(amount).toFixed(2);
}

function fmtDate(iso) {
  try { return format(new Date(iso), 'dd/MM/yyyy HH:mm'); }
  catch { return iso; }
}

// ─── CSV Builder ──────────────────────────────────────────────────────────────

function buildCSV(transactions, sources, categories, currencySymbol) {
  const header = ['Date', 'Type', 'Category', 'Account', 'Notes', `Amount (${currencySymbol})`];

  const rows = transactions.map(tx => {
    const cat  = categories.find(c => c.id === tx.category_id)?.name ?? 'Unknown';
    const src  = sources.find(s => s.id === tx.source_id)?.name ?? 'Unknown';
    const sign = tx.type === 'income' ? '' : '-';
    return [
      fmtDate(tx.timestamp),
      tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      cat,
      src,
      tx.notes || '',
      `${sign}${fmt(tx.amount)}`,
    ];
  });

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines  = [header, ...rows].map(row => row.map(escape).join(','));
  return lines.join('\r\n');
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────

function buildPDF(transactions, sources, categories, currencySymbol, filterLabel) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW  = doc.internal.pageSize.getWidth();
  const today  = format(new Date(), 'dd MMM yyyy');
  const PRIMARY = [59, 130, 246];   // blue-500
  const DARK    = [11, 23, 54];     // --surface dark

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(BRANDING.EXPORT_BRAND_TEXT, 12, 13);


  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Transaction Export', 12, 18.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Exported: ${today}`, pageW - 12, 11, { align: 'right' });
  doc.setTextColor(148, 163, 184);
  doc.text(`Filter: ${filterLabel}`, pageW - 12, 16.5, { align: 'right' });

  // ── Totals summary row ─────────────────────────────────────────────────────
  const totalIncome   = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
  const netFlow       = totalIncome - totalExpenses;

  doc.setFillColor(245, 247, 250);
  doc.rect(0, 22, pageW, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  const col1 = 12, col2 = pageW / 3, col3 = (pageW * 2) / 3;

  doc.setTextColor(...PRIMARY);
  doc.text('Total Income', col1, 27.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`${currencySymbol}${fmt(totalIncome)}`, col1, 31.5);

  doc.setTextColor(239, 68, 68); // red-500
  doc.text('Total Expenses', col2, 27.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`${currencySymbol}${fmt(totalExpenses)}`, col2, 31.5);

  doc.setTextColor(netFlow >= 0 ? 16 : 239, netFlow >= 0 ? 185 : 68, netFlow >= 0 ? 129 : 68);
  doc.text('Net Cash Flow', col3, 27.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`${netFlow >= 0 ? '+' : '-'}${currencySymbol}${fmt(Math.abs(netFlow))}`, col3, 31.5);

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`, pageW - 12, 29.5, { align: 'right' });

  // ── Table ──────────────────────────────────────────────────────────────────
  const rows = transactions.map(tx => {
    const cat  = categories.find(c => c.id === tx.category_id)?.name ?? 'Unknown';
    const src  = sources.find(s => s.id === tx.source_id)?.name ?? 'Unknown';
    const sign = tx.type === 'income' ? '+' : '-';
    return [
      fmtDate(tx.timestamp),
      tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      cat,
      src,
      tx.notes || '—',
      `${sign}${currencySymbol}${fmt(tx.amount)}`,
    ];
  });

  autoTable(doc, {
    startY: 36,
    head: [['Date', 'Type', 'Category', 'Account', 'Notes', 'Amount']],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 30, 30],
      lineColor: [220, 225, 235],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22 },
      2: { cellWidth: 38 },
      3: { cellWidth: 40 },
      4: { minCellWidth: 40 },
      5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      // Colour-code the Amount column
      if (data.section === 'body' && data.column.index === 5) {
        const isIncome = data.row.raw[1] === 'Income';
        doc.setTextColor(isIncome ? 16 : 239, isIncome ? 185 : 68, isIncome ? 129 : 68);
      }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const isIncome = data.cell.text[0] === 'Income';
        data.cell.styles.textColor = isIncome ? [16, 185, 129] : [239, 68, 68];
      }
    },
    margin: { left: 12, right: 12 },
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `${BRANDING.EXPORT_BRAND_TEXT}  •  Page ${i} of ${pageCount}  •  Generated ${today}`,

      pageW / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  return doc;
}

// ─── Export Menu Component ────────────────────────────────────────────────────

export default function ExportMenu({
  transactions = [],
  sources       = [],
  categories    = [],
  currencySymbol = '₹',
  filterLabel   = 'All Time',
}) {
  const [open,      setOpen]      = useState(false);
  const [exporting, setExporting] = useState(null); // 'csv' | 'pdf' | null
  const menuRef = useRef(null);

  const disabled = transactions.length === 0;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCSV = async () => {
    setExporting('csv');
    setOpen(false);
    try {
      const csv  = buildCSV(transactions, sources, categories, currencySymbol);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${BRANDING.EXPORT_PREFIX}-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;

      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const handlePDF = async () => {
    setExporting('pdf');
    setOpen(false);
    try {
      const doc = buildPDF(transactions, sources, categories, currencySymbol, filterLabel);
      doc.save(`${BRANDING.EXPORT_PREFIX}-transactions-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`h-11 flex items-center gap-2 px-4 rounded-xl border font-medium text-sm transition-all whitespace-nowrap
          ${disabled
            ? 'opacity-40 cursor-not-allowed border-white/10 text-muted'
            : 'border-white/10 text-main hover:border-primary/50 hover:bg-primary/8 cursor-pointer'
          }`}
        style={{ background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)' }}
        title={disabled ? 'No transactions to export' : 'Export transactions'}
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Export</span>
        <ChevronDown
          className="w-3.5 h-3.5 text-muted transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 rounded-xl border overflow-hidden z-50 animate-fade-in"
          style={{
            background: 'var(--surface)',
            borderColor: 'rgba(255,255,255,0.10)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            minWidth: '180px',
          }}
        >
          {/* CSV */}
          <button
            onClick={handleCSV}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)' }}>
              <FileText className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="font-medium text-main">Export CSV</p>
              <p className="text-[11px] text-muted">Open in Excel / Sheets</p>
            </div>
          </button>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 12px' }} />

          {/* PDF */}
          <button
            onClick={handlePDF}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,130,246,0.12)' }}>
              <FileDown className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <p className="font-medium text-main">Export PDF</p>
              <p className="text-[11px] text-muted">Formatted report with totals</p>
            </div>
          </button>

          {/* Info footer */}
          <div className="px-4 py-2 border-t text-[10px] text-muted"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · {filterLabel}
          </div>
        </div>
      )}
    </div>
  );
}
