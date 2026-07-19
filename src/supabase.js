import React, { useState, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  fetchAll,
  fetchLiderler,
  insertLider,
  updateLider,
  deleteLider,
  fetchHastalar,
  insertHasta,
  updateHasta,
  deleteHasta,
  fetchGiderler,
  insertGider,
  deleteGider,
  insertAjans,
  uploadPhoto,
  deletePhoto,
  insertKullanici,
  updateKullanici,
  deleteKullanici,
  insertLog,
  fetchLogs,
  fetchReceivables,
  insertReceivable,
  updateReceivable,
  deleteReceivable,
  uploadReceipt,
  fetchPatientPayments,
  insertPatientPayment,
  updatePatientPayment,
  deletePatientPayment,
  fetchMedikalUrunler,
  insertMedikalUrun,
  updateMedikalUrun,
  deleteMedikalUrun,
  fetchMedikalMusteriler,
  insertMedikalMusteri,
  deleteMedikalMusteri,
  fetchMedikalTedarikciler,
  insertMedikalTedarikci,
  deleteMedikalTedarikci,
  fetchMedikalAlimlar,
  insertMedikalAlim,
  updateMedikalAlim,
  deleteMedikalAlim,
  fetchMedikalSatislar,
  insertMedikalSatis,
  updateMedikalSatis,
  deleteMedikalSatis,
  fetchMedikalGiderler,
  fetchPremiumHairLedger,
  insertPremiumHairLedger,
  updatePremiumHairLedger,
  deletePremiumHairLedger,
  insertMedikalGider,
  deleteMedikalGider,
  fetchMedikalTeklifler,
  insertMedikalTeklif,
  deleteMedikalTeklif,
} from './supabase';
import {
  initDrive,
  isDriveConnected,
  connectDrive,
  disconnectDrive,
  uploadToDrive,
  getPatientFolderLink,
} from './drive';

const APP_PASSWORD = 'add1402';
const REGION_PASSWORDS = { istanbul: 'add1402', suudi: '1402add' };
const LOGO_URL =
  'https://ejbxxfbszdwggswzgzni.supabase.co/storage/v1/object/public/brand-assets/IMG_1406.PNG';

const REGIONS = {
  istanbul: { lbl: 'İstanbul', flag: '🇹🇷', clr: '#e30a17', currency: '₺' },
  suudi: { lbl: 'Suudi Arabistan', flag: '🇸🇦', clr: '#006c35', currency: '$' },
};

const ROLES = {
  admin: {
    lbl: 'Admin', clr: '#A79B88', badge: '👑',
    perms: ['view_dashboard','view_leads','view_patients','view_finance','view_settings','edit_finance','edit_leads','edit_patients','manage_users','manage_drive','view_logs','view_market'],
  },
  manager: {
    lbl: 'Yonetici', clr: '#7E9A89', badge: '🏢',
    perms: ['view_dashboard','view_leads','view_patients','view_finance','edit_leads','edit_patients'],
  },
  sales: {
    lbl: 'Temsilci', clr: '#6B8F5E', badge: '📞',
    perms: ['view_dashboard','view_leads','edit_leads'],
  },
  operation: {
    lbl: 'Operasyon', clr: '#C68A3D', badge: '🏥',
    perms: ['view_dashboard','view_patients','edit_patients','view_market'],
  },
  finance: {
    lbl: 'Muhasebe', clr: '#B8952E', badge: '💰',
    perms: ['view_dashboard','view_finance','edit_finance'],
  },
};

const can = (u, perm) => {
  if (!u) return false;
  return ROLES[u.role]?.perms?.includes(perm) ?? false;
};

const LS = [
  { id: 'yeni', lbl: 'Yeni', clr: '#7E9A89', ico: '🆕' },
  { id: 'cevaplandi', lbl: 'Cevaplandi', clr: '#7CA89B', ico: '💬' },
  { id: 'foto_alindi', lbl: 'Fotograf Alindi', clr: '#A8C0B0', ico: '📸' },
  { id: 'konsultasyon', lbl: 'Konsultasyon', clr: '#9B7B8C', ico: '🔬' },
  { id: 'fiyat_verildi', lbl: 'Fiyat Verildi', clr: '#B8952E', ico: '💰' },
  { id: 'takipte', lbl: 'Takipte', clr: '#C68A3D', ico: '🔁' },
  { id: 'kapora_alindi', lbl: 'Kapora Alindi', clr: '#6B8F5E', ico: '✅' },
  { id: 'op_planlandi', lbl: 'Op. Planlandi', clr: '#7BA8A6', ico: '🗓' },
  { id: 'iptal', lbl: 'Iptal', clr: '#C1554A', ico: '❌' },
  { id: 'kara_liste', lbl: 'Kara Liste', clr: '#A83A32', ico: '🚫' },
];
const lsCfg = (id) => LS.find((s) => s.id === id) || { lbl: id, clr: '#7A7062', ico: '.' };

const PHOTO_CATS = [
  { id: 'onGun', lbl: 'Ön Gün' },
  { id: 'konsultasyon', lbl: 'Konsültasyon' },
  { id: 'ameliyat', lbl: 'Ameliyat' },
  { id: 'birGun', lbl: '1. Gün' },
  { id: 'onGunSonra', lbl: '10. Gün' },
  { id: 'birAy', lbl: '1. Ay' },
  { id: 'ucAy', lbl: '3. Ay' },
  { id: 'altiAy', lbl: '6. Ay' },
  { id: 'yillik', lbl: '1. Yıl' },
];

const dd = (off = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + off);
  return x.toISOString().split('T')[0];
};
const fmt = (dt) => { if (!dt) return '-'; return new Date(dt).toLocaleDateString('tr-TR'); };
const fmtDateTime = (dt) => { if (!dt) return '-'; return new Date(dt).toLocaleString('tr-TR'); };
const fmtM = (n, c = '₺') => n >= 1000 ? c + (n / 1000).toFixed(1) + 'K' : c + (n || 0);

const logAction = async (user, region, action, targetType, targetName, details = '') => {
  if (!user) return;
  try {
    await insertLog({ user_id: user.id, user_name: user.name, action, target_type: targetType, target_name: targetName, details, region });
  } catch (e) { console.error('Log hatasi:', e); }
};

function Logo({ size = 60 }) {
  return (
    <img src={LOGO_URL} alt="Hair International" style={{ height: size, width: 'auto', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(139,129,113,0.15))' }} />
  );
}

function Av({ name, size = 34, clr }) {
  const ini = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${clr || '#7E9A89'},${(clr || '#7E9A89') + '22'})`, border: `1px solid ${(clr || '#7E9A89') + '33'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 800, color: '#33302A' }}>
      {ini}
    </div>
  );
}

function Btn({ onClick, children, v = 'p', sm, full, disabled }) {
  const m = {
    p: { bg: '#7E9A89', c: '#fff', b: 'none' },
    s: { bg: 'transparent', c: '#A79B88', b: '1px solid #D4C7AE' },
    d: { bg: 'rgba(193,85,74,0.1)', c: '#C1554A', b: '1px solid #C1554A33' },
  };
  const s = m[v] || m.p;
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: sm ? '5px 12px' : '9px 18px', background: s.bg, color: s.c, border: s.b, borderRadius: 8, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: sm ? 11 : 13, opacity: disabled ? 0.5 : 1, width: full ? '100%' : 'auto' }}>
      {children}
    </button>
  );
}

function Inp({ ph, val, set, type = 'text', style = {}, rows }) {
  const b = { width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box', outline: 'none', ...style };
  if (rows) return <textarea placeholder={ph} value={val} onChange={(e) => set(e.target.value)} rows={rows} style={{ ...b, resize: 'vertical' }} />;
  return <input type={type} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} style={b} />;
}

function Sel({ val, set, opts, style = {} }) {
  return (
    <select value={val} onChange={(e) => set(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, ...style }}>
      {opts.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Lightbox({ urls, index, onClose, onIndex }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < urls.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, urls.length, onClose, onIndex]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff', fontSize: 13, fontWeight: 700, background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 6 }}>{index + 1} / {urls.length}</div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'absolute', top: 20, right: 20, padding: '10px 16px', background: 'rgba(193,85,74,0.9)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✕ Kapat</button>
      {index > 0 && <button onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', fontWeight: 700 }}>‹</button>}
      {index < urls.length - 1 && <button onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', fontWeight: 700 }}>›</button>}
      <img src={urls[index]} alt="" style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 16, padding: 28, width: wide ? 820 : 440, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ color: '#33302A', margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7A7062', fontSize: 22, cursor: 'pointer' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Dashboard({ user, region, leads, patients }) {
  const reg = REGIONS[region];
  const [medikalAlert, setMedikalAlert] = useState(null);
  const [premiumHairBalance, setPremiumHairBalance] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [urunler, satislar] = await Promise.all([fetchMedikalUrunler(), fetchMedikalSatislar()]);
        const lowStock = (urunler || []).filter((u) => Number(u.stok_miktari) <= Number(u.kritik_stok));
        const acikHesap = (satislar || []).filter((s) => s.payment_type === 'Açık Hesap' && !s.paid);
        const acikTotal = acikHesap.reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
        const tomorrow = dd(1);
        const urgentCount = acikHesap.filter((s) => s.due_date && s.due_date <= tomorrow).length;
        if (lowStock.length > 0 || acikHesap.length > 0) {
          setMedikalAlert({ lowStockCount: lowStock.length, acikCount: acikHesap.length, acikTotal, urgentCount });
        }
      } catch (e) {}
      if (region === 'suudi') {
        try {
          const [ledgerData, paymentsData] = await Promise.all([fetchPremiumHairLedger(), fetchPatientPayments('suudi')]);
          const opening = (ledgerData || []).find(e => e.type === 'acilis');
          if (opening) {
            const hastaGeliri = (paymentsData || [])
              .filter(p => (p.kaynak || 'Premium Hair') === 'Premium Hair' && p.surgery_date && p.surgery_date >= opening.date)
              .reduce((s, p) => s + Number(p.total_price || 0), 0);
            const odemeAlinan = (ledgerData || []).filter(e => e.type === 'odeme').reduce((s, e) => s + Number(e.amount || 0), 0);
            const balance = Number(opening.amount || 0) + hastaGeliri - odemeAlinan;
            setPremiumHairBalance(balance);
          }
        } catch (e) {}
      }
    })();
  }, [region]);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: '#33302A', fontSize: 20, fontWeight: 900 }}>Merhaba, {user.name.split(' ')[0]} 👋</div>
        <div style={{ color: reg.clr, fontSize: 13, marginTop: 3, fontWeight: 700 }}>{reg.flag} {reg.lbl} Şubesi</div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { ico: '📋', lbl: 'Lead', val: leads.length, clr: '#7E9A89' },
          { ico: '💎', lbl: 'Hasta', val: patients.length, clr: '#9B7B8C' },
        ].map((k) => (
          <div key={k.lbl} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{k.ico}</div>
            <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 24, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
        {premiumHairBalance !== null && (
          <div style={{ background: '#FFFFFF', border: '2px solid #7E9A89', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>🏢</div>
            <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>Premium Hair'den Alacak</div>
            <div style={{ color: '#7E9A89', fontSize: 24, fontWeight: 900 }}>${premiumHairBalance.toLocaleString()}</div>
          </div>
        )}
      </div>
      {medikalAlert && (
        <div style={{ background: 'rgba(193,85,74,0.08)', border: '1px solid #C1554A44', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 8 }}>💊 Medikal Uyarıları</div>
          {medikalAlert.lowStockCount > 0 && <div style={{ color: '#C1554A', fontSize: 12, marginBottom: 4 }}>⚠️ {medikalAlert.lowStockCount} ürün kritik stok seviyesinde</div>}
          {medikalAlert.acikCount > 0 && <div style={{ color: '#B8952E', fontSize: 12, marginBottom: 4 }}>📒 {medikalAlert.acikCount} bekleyen açık hesap · Toplam ₺{medikalAlert.acikTotal.toLocaleString()}</div>}
          {medikalAlert.urgentCount > 0 && <div style={{ color: '#C1554A', fontSize: 12, fontWeight: 700 }}>⏰ {medikalAlert.urgentCount} ödemenin vadesi bugün/yarın!</div>}
        </div>
      )}
    </div>
  );
}

function Leads({ user, region, leads, setLeads }) {
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', country: 'Turkiye', status: 'yeni', notes: '', quotedPrice: '' });

  const saveLead = async () => {
    if (!form.name) return;
    const row = { name: form.name, phone: form.phone, country: form.country, status: form.status, notes: form.notes, quoted_price: Number(form.quotedPrice) || 0, photos: JSON.stringify([]), region };
    const saved = await insertLider(row);
    setLeads((ls) => [saved ?? { ...row, id: Date.now() }, ...ls]);
    await logAction(user, region, 'Lead eklendi', 'Lead', form.name);
    setShowAdd(false);
    setForm({ name: '', phone: '', country: 'Turkiye', status: 'yeni', notes: '', quotedPrice: '' });
  };

  const filtered = leads.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone || '').includes(search));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900 }}>📋 Leadler</div>
        {can(user, 'edit_leads') && <Btn onClick={() => setShowAdd(true)} sm>+ Yeni Lead</Btn>}
      </div>
      <Inp ph="Ara..." val={search} set={setSearch} style={{ marginBottom: 12 }} />
      {filtered.map((l) => {
        const s = lsCfg(l.status);
        return (
          <div key={l.id} onClick={() => setSel(l)} style={{ background: '#FFFFFF', border: `1px solid #E3D9C7`, borderLeft: `4px solid ${s.clr}`, borderRadius: 11, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 7 }}>
            <Av name={l.name} size={40} clr={s.clr} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14 }}>{l.name}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>📞 {l.phone} · {s.ico} {s.lbl}</div>
            </div>
          </div>
        );
      })}
      {showAdd && (
        <Modal title="Yeni Lead" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Inp ph="Ad Soyad *" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Inp ph="Telefon" val={form.phone} set={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <Sel val={form.status} set={(v) => setForm((f) => ({ ...f, status: v }))} opts={LS.map((s) => ({ v: s.id, l: s.ico + ' ' + s.lbl }))} />
            <Inp ph="Notlar" val={form.notes} set={(v) => setForm((f) => ({ ...f, notes: v }))} rows={3} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setShowAdd(false)}>Iptal</Btn>
              <Btn onClick={saveLead}>Kaydet</Btn>
            </div>
          </div>
        </Modal>
      )}
      {sel && (
        <Modal title={sel.name} onClose={() => setSel(null)} wide>
          <div style={{ color: '#7A7062', fontSize: 12, marginBottom: 10 }}>📞 {sel.phone} · {lsCfg(sel.status).ico} {lsCfg(sel.status).lbl}</div>
          {sel.notes && <div style={{ background: '#F1EBDE', borderRadius: 8, padding: 12, color: '#33302A', fontSize: 12 }}>{sel.notes}</div>}
        </Modal>
      )}
    </div>
  );
}

function Patients({ user, region, patients, setPatients, driveConnected }) {
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('onGun');
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [lastUpload, setLastUpload] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', alim_kisi: '', kanal_kisi: '', ekim_kisi: '', feeRows: [{ name: '', amount: '' }] });
  const addFeeRow = () => setForm(f => ({ ...f, feeRows: [...f.feeRows, { name: '', amount: '' }] }));
  const quickAddFeePerson = (name) => setForm(f => {
    if (f.feeRows.some(r => r.name === name)) return f;
    const rows = (f.feeRows.length === 1 && !f.feeRows[0].name) ? [{ name, amount: '' }] : [...f.feeRows, { name, amount: '' }];
    return { ...f, feeRows: rows };
  });
  const removeFeeRow = (idx) => setForm(f => ({ ...f, feeRows: f.feeRows.filter((_, i) => i !== idx) }));
  const updateFeeRow = (idx, field, val) => setForm(f => ({ ...f, feeRows: f.feeRows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)) }));
  const feeTotal = form.feeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const getPhotos = (p) => { try { return typeof p.photos === 'string' ? JSON.parse(p.photos) : p.photos || {}; } catch { return {}; } };

  const save = async () => {
    if (!form.name) return;
    if (!editingPatient) {
      const dup = patients.find(p => p.name.trim().toLowerCase() === form.name.trim().toLowerCase() && p.surgeryDate === form.surgeryDate);
      if (dup) {
        const proceed = window.confirm(`"${form.name}" isimli ve ${fmt(form.surgeryDate)} tarihli bir hasta zaten kayıtlı. Yine de eklensin mi?`);
        if (!proceed) return;
      }
    }
    const tp = Number(form.totalPrice) || 0, dep = Number(form.deposit) || 0;
    const validFees = form.feeRows.filter(r => r.name && Number(r.amount) > 0);
    const feeSummary = validFees.map(r => `${r.name}: $${r.amount}`).join(', ');
    const findFee = (nm) => validFees.filter(r => r.name.toLowerCase() === nm.toLowerCase()).reduce((s, r) => s + Number(r.amount), 0);
    const obj = { name: form.name, phone: form.phone, country: form.country, surgeryDate: form.surgeryDate, technique: form.technique, grafts: Number(form.grafts) || 0, totalPrice: tp, deposit: dep, remaining: Math.max(0, tp - dep), totalPaid: dep, source_type: form.sourceType, source_name: form.sourceType === 'acenta' ? form.sourceName : null, alim_kisi: form.alim_kisi || null, kanal_kisi: form.kanal_kisi || null, ekim_kisi: form.ekim_kisi || null };

    if (editingPatient) {
      await updateHasta(editingPatient.id, obj);
      setPatients((ps) => ps.map((p) => (p.id === editingPatient.id ? { ...p, ...obj } : p)));
      await logAction(user, region, 'Hasta güncellendi', 'Hasta', form.name, `Alım: ${form.alim_kisi || '-'} · Kanal: ${form.kanal_kisi || '-'} · Ekim: ${form.ekim_kisi || '-'}`);
      try {
        const linked = await fetchPatientPayments('suudi');
        const match = (linked || []).find((p) => p.patient_name === editingPatient.name);
        if (match) {
          await updatePatientPayment(match.id, {
            patient_name: form.name, surgery_date: form.surgeryDate || null, technique: form.technique, total_price: tp,
            fee_distribution: JSON.stringify(validFees),
            ali_haydar_fee: findFee('Ali Haydar'), yusuf_fee: findFee('Yusuf'), mete_fee: findFee('Mete'), seyit_fee: findFee('Seyit'),
            notes: feeSummary ? `Ücret dağılımı: ${feeSummary}` : '',
          });
        }
      } catch (e) {}
      setEditingPatient(null);
      setShowAdd(false);
      setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', alim_kisi: '', kanal_kisi: '', ekim_kisi: '', feeRows: [{ name: '', amount: '' }] });
      return;
    }

    const fullObj = { ...obj, status: 'planli', photos: JSON.stringify({}), region };
    const saved = await insertHasta(fullObj);
    setPatients((ps) => [saved ?? { ...fullObj, id: Date.now() }, ...ps]);
    await logAction(user, region, 'Hasta eklendi', 'Hasta', form.name, `Alım: ${form.alim_kisi || '-'} · Kanal: ${form.kanal_kisi || '-'} · Ekim: ${form.ekim_kisi || '-'}`);
    if (region === 'suudi') {
      try {
        const graftNum = Number(form.grafts) || 0;
        const notesParts = [];
        let finalAliHaydarFee = findFee('Ali Haydar');
        let finalSeyitFee = findFee('Seyit');
        let finalTotalPrice = tp;
        let finalOtherFees = [...validFees.filter(r => !['ali haydar', 'seyit'].includes(r.name.toLowerCase()))];

        if (graftNum > 0) {
          const isHighTier = graftNum >= 3000;
          const autoAli = isHighTier ? 150 : 75;
          const autoMuhammedAli = isHighTier ? 130 : 100;
          const autoSergenEmir = isHighTier ? 80 : 50;
          const autoFurkanCan = isHighTier ? 80 : 50;
          const autoSeyit = isHighTier ? 140 : 200;
          finalAliHaydarFee = autoAli;
          finalSeyitFee = autoSeyit;
          finalTotalPrice = 500;
          // Otomatik kişiler dışındaki manuel eklenen kişileri koru
          const AUTO_NAMES = ['muhammed ali', 'sergen emir', 'furkan can'];
          finalOtherFees = [
            { name: 'Muhammed Ali', amount: autoMuhammedAli },
            { name: 'Sergen Emir', amount: autoSergenEmir },
            { name: 'Furkan Can', amount: autoFurkanCan },
            ...finalOtherFees.filter(r => !AUTO_NAMES.includes(r.name.toLowerCase())),
          ];
          notesParts.push(`Otomatik uygulandı: ${graftNum} greft (${isHighTier ? '3000+' : '2999 ve altı'}) — Gelir $500, Ali Haydar $${autoAli}, Muhammed Ali $${autoMuhammedAli}, Sergen Emir $${autoSergenEmir}, Furkan Can $${autoFurkanCan}, Seyit $${autoSeyit}`);
        }
        if (feeSummary) notesParts.push(`Manuel ücret dağılımı: ${feeSummary}`);

        await insertPatientPayment({
          region: 'suudi',
          patient_name: form.name,
          surgery_date: form.surgeryDate || null,
          technique: form.technique,
          total_price: finalTotalPrice,
          fee_distribution: JSON.stringify(finalOtherFees),
          ali_haydar_fee: finalAliHaydarFee,
          yusuf_fee: findFee('Yusuf'),
          mete_fee: findFee('Mete'),
          seyit_fee: finalSeyitFee,
          notes: notesParts.join(' · '),
        });
      } catch (e) {}
    }
    setShowAdd(false);
    setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', alim_kisi: '', kanal_kisi: '', ekim_kisi: '', feeRows: [{ name: '', amount: '' }] });
  };

  const startEditPatient = async (p) => {
    let feeRows = [{ name: '', amount: '' }];
    if (region === 'suudi') {
      try {
        const linked = await fetchPatientPayments('suudi');
        const match = (linked || []).find((x) => x.patient_name === p.name);
        if (match) {
          if (match.fee_distribution) {
            try {
              const parsed = typeof match.fee_distribution === 'string' ? JSON.parse(match.fee_distribution) : match.fee_distribution;
              if (Array.isArray(parsed) && parsed.length > 0) feeRows = parsed;
            } catch (e) {}
          }
          if (feeRows.length === 1 && !feeRows[0].name) {
            const legacy = [];
            if (Number(match.ali_haydar_fee) > 0) legacy.push({ name: 'Ali Haydar', amount: match.ali_haydar_fee });
            if (Number(match.yusuf_fee) > 0) legacy.push({ name: 'Yusuf', amount: match.yusuf_fee });
            if (Number(match.mete_fee) > 0) legacy.push({ name: 'Mete', amount: match.mete_fee });
            if (Number(match.seyit_fee) > 0) legacy.push({ name: 'Seyit', amount: match.seyit_fee });
            if (legacy.length > 0) feeRows = legacy;
          }
        }
      } catch (e) {}
    }
    setForm({
      name: p.name || '',
      phone: p.phone || '',
      country: p.country || '',
      surgeryDate: p.surgeryDate || '',
      technique: p.technique || 'DHI',
      grafts: p.grafts || '',
      totalPrice: p.totalPrice || '',
      deposit: p.deposit || '',
      sourceType: p.source_type || 'hair_international',
      sourceName: p.source_name || '',
      alim_kisi: p.alim_kisi || '',
      kanal_kisi: p.kanal_kisi || '',
      ekim_kisi: p.ekim_kisi || '',
      feeRows,
    });
    setEditingPatient(p);
    setShowAdd(true);
  };

  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`"${patient.name}" silinsin mi?`)) return;
    await deleteHasta(patient.id);
    setPatients((ps) => ps.filter((x) => x.id !== patient.id));
    await logAction(user, region, 'Hasta silindi', 'Hasta', patient.name);
    if (region === 'suudi') {
      try {
        const linked = await fetchPatientPayments('suudi');
        const match = (linked || []).find(p => p.patient_name === patient.name);
        if (match) await deletePatientPayment(match.id);
      } catch (e) {}
    }
    if (sel?.id === patient.id) setSel(null);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !sel) return;
    setUploading(true);
    setLastUpload(null);
    const catLbl = PHOTO_CATS.find((c) => c.id === activeTab)?.lbl || activeTab;
    let photoCount = 0, videoCount = 0, driveLinks = [];
    const currentPhotos = getPhotos(sel);
    let allUrls = [...(currentPhotos[activeTab] || [])];
    let allVideos = [...(currentPhotos[`${activeTab}_videos`] || [])];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      try {
        let driveLink = null;
        if (driveConnected) {
          try {
            const regionPrefix = REGIONS[region]?.lbl || region;
            const driveRes = await uploadToDrive(`${regionPrefix} - ${sel.name}`, catLbl, file);
            driveLink = driveRes.link;
            driveLinks.push(driveLink);
          } catch (err) {}
        }
        if (isImage) {
          const url = await uploadPhoto(sel.id, activeTab, file);
          if (url) { allUrls.push(url); photoCount++; }
        } else if (isVideo && driveLink) {
          allVideos.push({ name: file.name, link: driveLink });
          videoCount++;
        }
      } catch (err) { alert(`${file.name} yuklenemedi`); }
    }
    const newPhotos = { ...currentPhotos, [activeTab]: allUrls, [`${activeTab}_videos`]: allVideos };
    const photosStr = JSON.stringify(newPhotos);
    await updateHasta(sel.id, { photos: photosStr });
    const updated = { ...sel, photos: photosStr };
    setPatients((ps) => ps.map((p) => (p.id === sel.id ? updated : p)));
    setSel(updated);
    setLastUpload({ photoCount, videoCount, driveLinks });
    if (photoCount > 0 || videoCount > 0) await logAction(user, region, 'Medya yuklendi', 'Hasta', sel.name, `${catLbl}`);
    setUploading(false);
    e.target.value = '';
  };

  const handleDeletePhoto = async (url) => {
    if (!sel) return;
    await deletePhoto(url);
    const photos = getPhotos(sel);
    const newPhotos = { ...photos, [activeTab]: (photos[activeTab] || []).filter((u) => u !== url) };
    const photosStr = JSON.stringify(newPhotos);
    await updateHasta(sel.id, { photos: photosStr });
    const updated = { ...sel, photos: photosStr };
    setPatients((ps) => ps.map((p) => (p.id === sel.id ? updated : p)));
    setSel(updated);
  };

  const openDriveFolder = async () => {
    if (!sel || !driveConnected) return;
    try {
      const regionPrefix = REGIONS[region]?.lbl || region;
      const link = await getPatientFolderLink(`${regionPrefix} - ${sel.name}`);
      window.open(link, '_blank');
    } catch (err) {}
  };

  const shareWhatsApp = async () => {
    if (!sel) return;
    const catLbl = PHOTO_CATS.find((c) => c.id === activeTab)?.lbl || activeTab;
    const reg = REGIONS[region];
    let msg = `${reg.flag} *${reg.lbl}*\n👤 *${sel.name}*\n📅 *${catLbl}*\n📆 ${new Date().toLocaleDateString('tr-TR')}\n`;
    if (lastUpload?.driveLinks?.length) {
      msg += `\n🔗 *Drive:*\n`;
      lastUpload.driveLinks.forEach((l, i) => { msg += `${i + 1}. ${l}\n`; });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const currentPhotos = sel ? getPhotos(sel)[activeTab] || [] : [];
  const currentVideos = sel ? getPhotos(sel)[`${activeTab}_videos`] || [] : [];
  

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900 }}>💎 Hastalar</div>
        {can(user, 'edit_patients') && <Btn onClick={() => setShowAdd(true)} sm>+ Hasta Ekle</Btn>}
      </div>
      <Inp ph="🔍 İsim veya tarih ile ara (örn: Ahmet veya 2026-07-15)..." val={search} set={setSearch} style={{ marginBottom: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
        {patients.filter(p => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (p.name || '').toLowerCase().includes(q) || (p.surgeryDate || '').includes(q) || fmt(p.surgeryDate).includes(q);
        }).map((p) => (
          <div key={p.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, position: 'relative' }}>
            {can(user, 'edit_patients') && (
              <>
                <button onClick={(e) => { e.stopPropagation(); startEditPatient(p); }} style={{ position: 'absolute', top: 8, right: 40, width: 26, height: 26, borderRadius: '50%', background: 'rgba(126,154,137,0.2)', border: '1px solid #7E9A89', color: '#7E9A89', fontSize: 13, cursor: 'pointer', zIndex: 2 }}>✏️</button>
                <button onClick={(e) => { e.stopPropagation(); handleDeletePatient(p); }} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(193,85,74,0.2)', border: '1px solid #C1554A', color: '#C1554A', fontSize: 16, cursor: 'pointer', zIndex: 2 }}>×</button>
              </>
            )}
            <div onClick={() => { setSel(p); setActiveTab('onGun'); setLastUpload(null); }} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11, paddingRight: 30 }}>
                <Av name={p.name} size={42} clr="#7CA89B" />
                <div>
                  <div style={{ color: '#33302A', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: '#7A7062', fontSize: 11 }}>{p.phone}</div>
                </div>
              </div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>📅 {fmt(p.surgeryDate)} · {p.technique}</div>
              {(p.alim_kisi || p.kanal_kisi || p.ekim_kisi) && (
                <div style={{ color: '#A8C0B0', fontSize: 11, marginTop: 3 }}>
                  {p.alim_kisi && <>🔹 Alım: {p.alim_kisi} </>}
                  {p.kanal_kisi && <>🔹 Kanal: {p.kanal_kisi} </>}
                  {p.ekim_kisi && <>🔹 Ekim: {p.ekim_kisi}</>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <Modal title={editingPatient ? `${editingPatient.name} - Düzenle` : 'Yeni Hasta'} onClose={() => { setShowAdd(false); setEditingPatient(null); setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', alim_kisi: '', kanal_kisi: '', ekim_kisi: '', feeRows: [{ name: '', amount: '' }] }); }} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>AD SOYAD *</div><Inp ph="Ad" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} /></div>
            <div><div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TELEFON</div><Inp ph="Tel" val={form.phone} set={(v) => setForm((f) => ({ ...f, phone: v }))} /></div>
            <div><div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>OP. TARIHI</div><Inp type="date" ph="" val={form.surgeryDate} set={(v) => setForm((f) => ({ ...f, surgeryDate: v }))} /></div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>GREFT SAYISI</div>
              <Inp type="number" ph="Örn: 3200" val={form.grafts} set={(v) => setForm((f) => ({ ...f, grafts: v }))} />
              {form.grafts && (
                <div style={{ color: '#6B8F5E', fontSize: 11, marginTop: 5, fontWeight: 700, lineHeight: 1.6 }}>
                  💡 Otomatik uygulanacak ({Number(form.grafts) >= 3000 ? '3000 ve üstü' : '2999 ve altı'}):<br />
                  Gelir: $500 · Ali Haydar: ${Number(form.grafts) >= 3000 ? '150' : '75'} · Muhammed Ali (Kanal): ${Number(form.grafts) >= 3000 ? '130' : '100'} · Sergen Emir (Ekim): ${Number(form.grafts) >= 3000 ? '80' : '50'} · Furkan Can (Ekim): ${Number(form.grafts) >= 3000 ? '80' : '50'} · Seyit: ${Number(form.grafts) >= 3000 ? '140' : '200'}
                </div>
              )}
            </div>
            <div><div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TEKNIK</div><Sel val={form.technique} set={(v) => setForm((f) => ({ ...f, technique: v }))} opts={['FUE', 'DHI', 'Safir FUE', 'PRP']} /></div>
            {region === 'suudi' && (
              <>
                <div>
                  <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>ALIM</div>
                  <input list="alim-list" value={form.alim_kisi} onChange={(e) => setForm((f) => ({ ...f, alim_kisi: e.target.value }))} placeholder="Kim yaptı?" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
                  <datalist id="alim-list">{[...new Set(patients.filter(p => p.alim_kisi).map(p => p.alim_kisi))].map((v) => <option key={v} value={v} />)}</datalist>
                </div>
                <div>
                  <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>KANAL</div>
                  <input list="kanal-list" value={form.kanal_kisi} onChange={(e) => setForm((f) => ({ ...f, kanal_kisi: e.target.value }))} placeholder="Kim yaptı?" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
                  <datalist id="kanal-list">{[...new Set(patients.filter(p => p.kanal_kisi).map(p => p.kanal_kisi))].map((v) => <option key={v} value={v} />)}</datalist>
                </div>
                <div>
                  <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>EKİM</div>
                  <input list="ekim-list" value={form.ekim_kisi} onChange={(e) => setForm((f) => ({ ...f, ekim_kisi: e.target.value }))} placeholder="Kim yaptı?" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
                  <datalist id="ekim-list">{[...new Set(patients.filter(p => p.ekim_kisi).map(p => p.ekim_kisi))].map((v) => <option key={v} value={v} />)}</datalist>
                </div>
              </>
            )}
            {region === 'suudi' && user?.name?.toLowerCase().includes('seyit') && (
              <div style={{ gridColumn: '1/-1', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: 12, marginTop: 6 }}>
                <div style={{ color: '#B8952E', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>💰 EKİP ÜCRETİ DAĞILIMI ($)</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['Ali', 'Muhammet', 'Furkan'].map((name) => (
                    <button key={name} type="button" onClick={() => quickAddFeePerson(name)} style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid #B8952E44', background: 'rgba(184,149,46,0.1)', color: '#B8952E', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {name}</button>
                  ))}
                </div>
                {form.feeRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 6 }}>
                    <input value={row.name} onChange={(e) => updateFeeRow(idx, 'name', e.target.value)} placeholder="Kişi adı" style={{ padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12, boxSizing: 'border-box' }} />
                    <input type="number" value={row.amount} onChange={(e) => updateFeeRow(idx, 'amount', e.target.value)} placeholder="Tutar" style={{ padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12, boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => removeFeeRow(idx)} style={{ padding: '4px 10px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 12, cursor: 'pointer' }}>×</button>
                  </div>
                ))}
                <div style={{ marginTop: 6, marginBottom: 10 }}>
                  <Btn v="s" sm onClick={addFeeRow}>+ Kişi Ekle</Btn>
                </div>
                <div style={{ borderTop: '1px solid #E3D9C7', paddingTop: 8, textAlign: 'right', color: '#6B8F5E', fontWeight: 900, fontSize: 15 }}>
                  Toplam Ekip Ücreti: ${feeTotal.toLocaleString()}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn v="s" onClick={() => { setShowAdd(false); setEditingPatient(null); setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', alim_kisi: '', kanal_kisi: '', ekim_kisi: '', feeRows: [{ name: '', amount: '' }] }); }}>Iptal</Btn>
            <Btn onClick={save}>{editingPatient ? 'Güncelle' : 'Kaydet'}</Btn>
          </div>
        </Modal>
      )}
      {sel && (
        <Modal title={sel.name} onClose={() => setSel(null)} wide>
          {can(user, 'edit_patients') && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => startEditPatient(sel)} style={{ flex: 1, padding: '10px 18px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 8, color: '#7E9A89', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✏️ Bilgileri Düzenle</button>
              <button onClick={() => handleDeletePatient(sel)} style={{ flex: 1, padding: '10px 18px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 8, color: '#C1554A', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🗑 Hastayi Sil</button>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#7A7062', fontSize: 11 }}>📞 {sel.phone}</div>
            <div style={{ color: '#7A7062', fontSize: 11 }}>⚗️ {sel.technique} · {sel.grafts} greft</div>
            {(sel.alim_kisi || sel.kanal_kisi || sel.ekim_kisi) && (
              <div style={{ color: '#A8C0B0', fontSize: 12, marginTop: 6, fontWeight: 700 }}>
                {sel.alim_kisi && <div>🔹 Alım: {sel.alim_kisi}</div>}
                {sel.kanal_kisi && <div>🔹 Kanal: {sel.kanal_kisi}</div>}
                {sel.ekim_kisi && <div>🔹 Ekim: {sel.ekim_kisi}</div>}
              </div>
            )}
            {driveConnected && (
              <button onClick={openDriveFolder} style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(66,133,244,0.15)', border: '1px solid #4285f4', borderRadius: 6, color: '#4285f4', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📁 Drive</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {PHOTO_CATS.map((c) => {
              const photos = getPhotos(sel);
              const cnt = (photos[c.id] || []).length + (photos[`${c.id}_videos`] || []).length;
              return (
                <button key={c.id} onClick={() => { setActiveTab(c.id); setLastUpload(null); }} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${activeTab === c.id ? '#7E9A89' : '#E3D9C7'}`, background: activeTab === c.id ? 'rgba(126,154,137,0.15)' : 'transparent', color: activeTab === c.id ? '#7E9A89' : '#7A7062', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {c.lbl}{cnt > 0 && <span style={{ background: '#7E9A89', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, marginLeft: 4 }}>{cnt}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(126,154,137,0.12)', border: '1px solid #7E9A8944', borderRadius: 8, color: '#7E9A89', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {uploading ? 'Yükleniyor...' : '📤 Foto/Video Ekle'}
              <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
            {(currentPhotos.length > 0 || currentVideos.length > 0) && (
              <button onClick={shareWhatsApp} style={{ padding: '8px 16px', background: '#25d366', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📱 WhatsApp</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
            {currentPhotos.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1' }}>
                <img src={url} alt="" onClick={() => setLightboxIdx(i)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                <button onClick={() => handleDeletePhoto(url)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(193,85,74,0.85)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
            {currentPhotos.length === 0 && currentVideos.length === 0 && <div style={{ color: '#7A7062', fontSize: 12, gridColumn: '1/-1', padding: '20px 0' }}>Medya yok.</div>}
          </div>
          {lightboxIdx !== null && currentPhotos[lightboxIdx] && (
            <Lightbox urls={currentPhotos} index={lightboxIdx} onClose={() => setLightboxIdx(null)} onIndex={setLightboxIdx} />
          )}
        </Modal>
      )}
    </div>
  );
}

function SuudiFinance({ user, region, patients, receivables, setReceivables }) {
  const [payments, setPayments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAddRec, setShowAddRec] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [recForm, setRecForm] = useState({ description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null, person: 'Genel', date: dd(0) });
  const [form, setForm] = useState({ patient_name: '', surgery_date: '', technique: 'DHI', total_price: '', ali_haydar_fee: '', seyit_fee: '', notes: '', kaynak: 'Premium Hair', otherFees: [{ name: '', amount: '' }] });
  const addOtherFeeRow = () => setForm(f => ({ ...f, otherFees: [...f.otherFees, { name: '', amount: '' }] }));
  const removeOtherFeeRow = (idx) => setForm(f => ({ ...f, otherFees: f.otherFees.filter((_, i) => i !== idx) }));
  const updateOtherFeeRow = (idx, field, val) => setForm(f => ({ ...f, otherFees: f.otherFees.map((r, i) => (i === idx ? { ...r, [field]: val } : r)) }));
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    let year = d.getFullYear();
    let month = d.getMonth();
    if (d.getDate() < 13) {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  });
  const [usdTryRate, setUsdTryRate] = useState(null);
  const [rateSource, setRateSource] = useState('yükleniyor');
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data && data.rates && data.rates.TRY) {
          setUsdTryRate(Math.round(data.rates.TRY * 100) / 100);
          setRateSource('otomatik');
        } else {
          setRateSource('bulunamadı — elle girin');
        }
      } catch (e) {
        setRateSource('bulunamadı — elle girin');
      }
    })();
  }, []);
  const SAR_USD_RATE = 3.75;
  const [kisiselGiderler, setKisiselGiderler] = useState([]);
  // 13'ünden 13'üne dönem mantığı - hasta hesabıyla aynı sistem
  const getPeriodKeyFromDateStr = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    let year = d.getFullYear();
    let month = d.getMonth();
    if (d.getDate() < 13) {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };
  const [showAddGider, setShowAddGider] = useState(false);
  const [uploadingGider, setUploadingGider] = useState(false);
  const [giderForm, setGiderForm] = useState({ desc: '', amount: '', currency: 'TRY', cat: 'Uçak Bileti', date: dd(0), receiptFile: null, person: 'Seyit' });

  const loadKisiselGiderler = async () => {
    const data = await fetchGiderler('suudi');
    setKisiselGiderler(data || []);
  };

  const saveKisiselGider = async () => {
    if (!giderForm.desc || !giderForm.amount) return;
    setUploadingGider(true);
    let receiptUrl = null;
    if (giderForm.receiptFile) receiptUrl = await uploadReceipt(giderForm.receiptFile);
    const row = { cat: giderForm.cat, desc: giderForm.desc, amount: Number(giderForm.amount), currency: giderForm.currency, date: giderForm.date, receipt_url: receiptUrl, region: 'suudi', person: giderForm.person || 'Seyit' };
    const saved = await insertGider(row);
    if (saved) setKisiselGiderler(gs => [saved, ...gs]);
    setShowAddGider(false);
    setGiderForm({ desc: '', amount: '', currency: 'TRY', cat: 'Uçak Bileti', date: dd(0), receiptFile: null, person: 'Seyit' });
    setUploadingGider(false);
  };

  const removeKisiselGider = async (id) => {
    if (!window.confirm('Silinsin mi?')) return;
    await deleteGider(id);
    setKisiselGiderler(gs => gs.filter(g => g.id !== id));
  };

  const AY_ISIMLERI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const getMonthLabel = (monthKey) => {
    const [y, m] = monthKey.split('-').map(Number);
    const startMonth = AY_ISIMLERI[m - 1];
    const endMonth = AY_ISIMLERI[m % 12];
    const endYear = m === 12 ? y + 1 : y;
    return `13 ${startMonth} — 12 ${endMonth} ${endYear}`;
  };
  const shiftMonth = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  // Hesap dönemi her ayın 13'ünden bir sonraki ayın 12'sine kadardır (takvim ayı değil)
  const getRecordMonth = (p) => {
    const dateStr = p.surgery_date || p.created_at || '';
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    let year = d.getFullYear();
    let month = d.getMonth(); // 0-indexed
    if (d.getDate() < 13) {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };
  const monthlyPayments = payments.filter((p) => getRecordMonth(p) === selectedMonth);

  const trendData = (() => {
    const byPeriod = {};
    payments.forEach(p => {
      const key = getRecordMonth(p);
      if (!key) return;
      if (!byPeriod[key]) byPeriod[key] = { revenue: 0, cost: 0, count: 0 };
      byPeriod[key].revenue += Number(p.total_price || 0) + Number(p.seyit_fee || 0);
      byPeriod[key].cost += Number(p.ali_haydar_fee || 0) + Number(p.seyit_fee || 0) + Number(p.yusuf_fee || 0) + Number(p.mete_fee || 0);
      byPeriod[key].count += 1;
    });
    const sortedKeys = Object.keys(byPeriod).sort();
    const lastKeys = sortedKeys.slice(-6);
    return lastKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      return {
        period: `${AY_ISIMLERI[m - 1].slice(0, 3)} ${String(y).slice(2)}`,
        Gelir: Math.round(byPeriod[key].revenue),
        Kâr: Math.round(byPeriod[key].revenue - byPeriod[key].cost),
        Hasta: byPeriod[key].count,
      };
    });
  })();

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [showLedgerAdd, setShowLedgerAdd] = useState(false);
  const [showLedgerOpening, setShowLedgerOpening] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({ amount: '', currency: 'USD', date: dd(0), notes: '' });
  const [ledgerOpeningForm, setLedgerOpeningForm] = useState({ amount: '', currency: 'USD', date: dd(0), notes: '' });

  useEffect(() => {
    (async () => {
      const data = await fetchPatientPayments('suudi');
      setPayments(data || []);
      await loadKisiselGiderler();
      const ledgerData = await fetchPremiumHairLedger();
      setLedgerEntries(ledgerData || []);
    })();
  }, []);

  const openingEntry = ledgerEntries.find(e => e.type === 'acilis');
  const paymentEntries = ledgerEntries.filter(e => e.type === 'odeme');
  const ledgerHastaGeliri = openingEntry
    ? payments.filter(p => (p.kaynak || 'Premium Hair') === 'Premium Hair' && p.surgery_date && p.surgery_date >= openingEntry.date)
        .reduce((s, p) => s + Number(p.total_price || 0), 0)
    : 0;
  const ledgerOdemeAlinan = paymentEntries.reduce((s, e) => s + toUSD(e), 0);
  const ledgerNetBorc = (openingEntry ? Number(openingEntry.amount || 0) : 0) + ledgerHastaGeliri - ledgerOdemeAlinan;

  const saveLedgerOpening = async () => {
    if (ledgerOpeningForm.amount === '') return;
    const row = { type: 'acilis', amount: Number(ledgerOpeningForm.amount) || 0, currency: ledgerOpeningForm.currency, date: ledgerOpeningForm.date, notes: ledgerOpeningForm.notes };
    if (openingEntry) {
      const updated = await updatePremiumHairLedger(openingEntry.id, row);
      if (updated) setLedgerEntries(es => es.map(e => e.id === openingEntry.id ? updated : e));
    } else {
      const saved = await insertPremiumHairLedger(row);
      if (saved) setLedgerEntries(es => [...es, saved]);
    }
    setShowLedgerOpening(false);
  };

  const [editingLedgerPayment, setEditingLedgerPayment] = useState(null);

  const saveLedgerPayment = async () => {
    if (!ledgerForm.amount) return;
    const row = { type: 'odeme', amount: Number(ledgerForm.amount) || 0, currency: ledgerForm.currency, date: ledgerForm.date, notes: ledgerForm.notes };
    if (editingLedgerPayment) {
      const updated = await updatePremiumHairLedger(editingLedgerPayment.id, row);
      if (updated) setLedgerEntries(es => es.map(e => e.id === editingLedgerPayment.id ? updated : e));
      setEditingLedgerPayment(null);
    } else {
      const saved = await insertPremiumHairLedger(row);
      if (saved) setLedgerEntries(es => [...es, saved]);
    }
    setShowLedgerAdd(false);
    setLedgerForm({ amount: '', currency: 'USD', date: dd(0), notes: '' });
  };

  const startEditLedgerPayment = (e) => {
    setLedgerForm({ amount: e.amount, currency: e.currency || 'USD', date: e.date || dd(0), notes: e.notes || '' });
    setEditingLedgerPayment(e);
    setShowLedgerAdd(true);
  };

  const removeLedgerPayment = async (id) => {
    if (!window.confirm('Bu ödeme kaydı silinsin mi?')) return;
    await deletePremiumHairLedger(id);
    setLedgerEntries(es => es.filter(e => e.id !== id));
  };

  const resetForm = () => setForm({ patient_name: '', surgery_date: '', technique: 'DHI', total_price: '', ali_haydar_fee: '', seyit_fee: '', notes: '', kaynak: 'Premium Hair', otherFees: [{ name: '', amount: '' }] });

  const savePayment = async () => {
    if (!form.patient_name) return;
    const validOther = form.otherFees.filter(r => r.name && Number(r.amount) > 0);
    const findOtherFee = (nm) => validOther.filter(r => r.name.toLowerCase() === nm.toLowerCase()).reduce((s, r) => s + Number(r.amount), 0);
    const row = {
      region: 'suudi', patient_name: form.patient_name, surgery_date: form.surgery_date || null, technique: form.technique,
      total_price: Number(form.total_price) || 0, ali_haydar_fee: Number(form.ali_haydar_fee) || 0, seyit_fee: Number(form.seyit_fee) || 0,
      yusuf_fee: findOtherFee('Yusuf'), mete_fee: findOtherFee('Mete'),
      fee_distribution: JSON.stringify(validOther), notes: form.notes, kaynak: form.kaynak,
    };
    if (editItem) {
      const updated = await updatePatientPayment(editItem.id, row);
      if (updated) setPayments(ps => ps.map(p => p.id === editItem.id ? updated : p));
      setEditItem(null);
    } else {
      const saved = await insertPatientPayment(row);
      if (saved) setPayments(ps => [saved, ...ps]);
    }
    resetForm();
    setShowAdd(false);
  };

  const deletePayment = async (id) => {
    if (!window.confirm('Bu kayıt silinsin mi?')) return;
    await deletePatientPayment(id);
    setPayments(ps => ps.filter(p => p.id !== id));
  };

  const startEdit = (p) => {
    let otherFees = [{ name: '', amount: '' }];
    if (p.fee_distribution) {
      try {
        const parsed = typeof p.fee_distribution === 'string' ? JSON.parse(p.fee_distribution) : p.fee_distribution;
        if (Array.isArray(parsed) && parsed.length > 0) otherFees = parsed;
      } catch (e) {}
    }
    if (otherFees.length === 1 && !otherFees[0].name) {
      const legacy = [];
      if (Number(p.yusuf_fee) > 0) legacy.push({ name: 'Yusuf', amount: p.yusuf_fee });
      if (Number(p.mete_fee) > 0) legacy.push({ name: 'Mete', amount: p.mete_fee });
      if (legacy.length > 0) otherFees = legacy;
    }
    setForm({ patient_name: p.patient_name, surgery_date: p.surgery_date || '', technique: p.technique || 'DHI', total_price: p.total_price || '', ali_haydar_fee: p.ali_haydar_fee || '', seyit_fee: p.seyit_fee || '', notes: p.notes || '', kaynak: p.kaynak || 'Premium Hair', otherFees });
    setEditItem(p);
    setShowAdd(true);
  };

  const totalRevenue = monthlyPayments.reduce((s, p) => s + Number(p.total_price || 0), 0) + monthlyPayments.reduce((s, p) => s + Number(p.seyit_fee || 0), 0);
  const totalAli = monthlyPayments.reduce((s, p) => s + Number(p.ali_haydar_fee || 0), 0);
  const totalSeyit = monthlyPayments.reduce((s, p) => s + Number(p.seyit_fee || 0), 0);
  const caseCountAli = monthlyPayments.filter(p => Number(p.ali_haydar_fee) > 0).length;
  const caseCountSeyit = monthlyPayments.filter(p => Number(p.seyit_fee) > 0).length;

  const normKey = (s) => (s || '').trim().toLowerCase();
  const otherFeeByName = {}; // normalized-key -> { display, total, count }
  monthlyPayments.forEach(p => {
    let arr = [];
    try { arr = typeof p.fee_distribution === 'string' ? JSON.parse(p.fee_distribution || '[]') : (p.fee_distribution || []); } catch (e) {}
    if ((!arr || arr.length === 0)) {
      if (Number(p.yusuf_fee) > 0) arr.push({ name: 'Yusuf', amount: p.yusuf_fee });
      if (Number(p.mete_fee) > 0) arr.push({ name: 'Mete', amount: p.mete_fee });
    }
    arr.forEach(r => {
      const nm = normKey(r.name);
      if (!nm || !Number(r.amount)) return;
      if (nm === 'ali haydar' || nm === 'seyit') return; // bunlar kendi sabit alanlarından girilmeli
      if (!otherFeeByName[nm]) otherFeeByName[nm] = { display: r.name.trim(), total: 0, count: 0 };
      otherFeeByName[nm].total += Number(r.amount);
      otherFeeByName[nm].count += 1;
    });
  });
  const totalOtherTeam = Object.values(otherFeeByName).reduce((s, v) => s + v.total, 0);
  const totalTeam = totalAli + totalSeyit + totalOtherTeam;
  const netProfit = totalRevenue - totalTeam;

  const premiumHairPayments = monthlyPayments.filter(p => (p.kaynak || 'Premium Hair') === 'Premium Hair');
  const hairIntlPayments = monthlyPayments.filter(p => p.kaynak === 'Hair International');
  const premiumHairRevenue = premiumHairPayments.reduce((s, p) => s + Number(p.total_price || 0), 0);
  const hairIntlRevenue = hairIntlPayments.reduce((s, p) => s + Number(p.total_price || 0), 0);

  const getReceivableDateStr = (r) => r.date_added || r.created_at;
  const periodReceivables = receivables.filter(r => getPeriodKeyFromDateStr(getReceivableDateStr(r)) === selectedMonth);
  const pendingRec = periodReceivables.filter(r => !r.paid);
  const paidRec = periodReceivables.filter(r => r.paid);
  const totalPending = pendingRec.reduce((s, r) => s + Number(r.amount || 0), 0);

  const toUSD = (r) => {
    const amt = Number(r.amount || 0);
    const cur = r.currency || 'TRY';
    if (cur === 'USD') return amt;
    if (cur === 'SAR') return amt / SAR_USD_RATE;
    if (cur === 'TRY') return usdTryRate ? amt / usdTryRate : amt;
    return amt;
  };
  const giderFor = (name) => kisiselGiderler
    .filter(g => getPeriodKeyFromDateStr(g.date) === selectedMonth && normKey(g.person) === normKey(name))
    .reduce((s, g) => s + toUSD(g), 0);

  // Bir kişiye verilen avans/harcama, tahsil edilse de edilmese de o kişinin hesabından
  // kalıcı olarak düşülür (eksi bakiye gibi işler).
  const receivablesOnlyFor = (name) => periodReceivables
    .filter(r => normKey(r.person) === normKey(name))
    .reduce((s, r) => s + toUSD(r), 0);
  const teamDeductionFor = (name) => receivablesOnlyFor(name) + giderFor(name);

  const pendingAli = teamDeductionFor('Ali Haydar');
  const pendingSeyitDirect = teamDeductionFor('Seyit');
  const pendingPremiumHair = pendingRec.filter(r => r.person === 'Premium Hair (Market)').reduce((s, r) => s + toUSD(r), 0);
  const pendingGenel = pendingRec.filter(r => !r.person || r.person === 'Genel').reduce((s, r) => s + toUSD(r), 0);

  // Ekip üyelerine verilen avanslar tahsil edildiğinde (✓ Tahsil), o tutar Seyit'e geri
  // yansır — çünkü avansı cepten Seyit vermiştir.
  const seyitReimbursement = paidRec
    .filter(r => {
      const p = normKey(r.person);
      return p && p !== 'genel' && p !== 'premium hair (market)' && p !== 'seyit';
    })
    .reduce((s, r) => s + toUSD(r), 0);

  const netAli = totalAli - pendingAli;
  const netSeyit = totalSeyit - pendingSeyitDirect + seyitReimbursement;
  const otherTeamRows = Object.values(otherFeeByName).map(({ display, total, count }) => {
    const pending = teamDeductionFor(display);
    return { name: display, earned: total, count, pending, net: total - pending };
  });

  const generateMonthlyReportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(42, 157, 178);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('HAIR INTERNATIONAL - SUUDİ ARABİSTAN', 14, 16);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(13);
    doc.text(`Aylık Rapor: ${getMonthLabel(selectedMonth)}`, 14, 36);

    let y = 48;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Toplam Gelir: $${totalRevenue.toLocaleString()}`, 14, y); y += 7;
    doc.text(`Ali Haydar: $${totalAli.toLocaleString()} (${caseCountAli} vaka)`, 14, y); y += 7;
    otherTeamRows.forEach(row => {
      doc.text(`${row.name}: $${row.earned.toLocaleString()} (${row.count} vaka) — Net: $${row.net.toLocaleString()}`, 14, y); y += 7;
    });
    doc.text(`Seyit: $${totalSeyit.toLocaleString()} (${caseCountSeyit} vaka)`, 14, y); y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`NET KÂR: $${netProfit.toLocaleString()}`, 14, y); y += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Premium Hair: ${premiumHairPayments.length} hasta — $${premiumHairRevenue.toLocaleString()}`, 14, y); y += 7;
    doc.text(`Hair International: ${hairIntlPayments.length} hasta — $${hairIntlRevenue.toLocaleString()}`, 14, y); y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Hasta Listesi:', 14, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    monthlyPayments.forEach(p => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${fmt(p.surgery_date)} — ${p.patient_name} — $${Number(p.total_price || 0).toLocaleString()}`, 14, y);
      y += 6;
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, 14, 290);
    doc.save(`Aylik_Rapor_${selectedMonth}.pdf`);
  };

  const [editingRec, setEditingRec] = useState(null);

  const saveReceivable = async () => {
    if (!recForm.description || !recForm.amount) return;
    setUploadingReceipt(true);
    let receiptUrl = editingRec ? editingRec.receipt_url : null;
    if (recForm.receiptFile) receiptUrl = await uploadReceipt(recForm.receiptFile);
    const row = { region, description: recForm.description, amount: Number(recForm.amount), currency: recForm.currency, notes: recForm.notes, receipt_url: receiptUrl, person: recForm.person || 'Genel', date_added: recForm.date || dd(0) };
    if (editingRec) {
      const updated = await updateReceivable(editingRec.id, row);
      if (updated) setReceivables(rs => rs.map(r => r.id === editingRec.id ? updated : r));
      setEditingRec(null);
    } else {
      const saved = await insertReceivable({ ...row, paid: false });
      if (saved) setReceivables(rs => [saved, ...rs]);
    }
    setShowAddRec(false);
    setRecForm({ description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null, person: 'Genel', date: dd(0) });
    setUploadingReceipt(false);
  };

  const startEditRec = (r) => {
    setRecForm({
      description: r.description || '', amount: r.amount || '', currency: r.currency || 'TRY',
      notes: r.notes || '', receiptFile: null, person: r.person || 'Genel', date: r.date_added || dd(0),
    });
    setEditingRec(r);
    setShowAddRec(true);
  };

  const markPaid = async (rec) => {
    if (!window.confirm(`"${rec.description}" tahsil edildi mi?`)) return;
    await updateReceivable(rec.id, { paid: true, paid_date: dd(0) });
    setReceivables(rs => rs.map(r => r.id === rec.id ? { ...r, paid: true, paid_date: dd(0) } : r));
  };

  const removeRec = async (rec) => {
    if (!window.confirm('Silinsin mi?')) return;
    await deleteReceivable(rec.id);
    setReceivables(rs => rs.filter(r => r.id !== rec.id));
  };

  return (
    <div>
      <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900, marginBottom: 18 }}>💰 Muhasebe - 🇸🇦 Suudi Arabistan</div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#7A7062', fontSize: 12 }}>💱 Güncel Kur: 1$ =</span>
        <input
          type="number"
          value={usdTryRate ?? ''}
          onChange={(e) => setUsdTryRate(Number(e.target.value) || null)}
          style={{ width: 80, padding: '5px 8px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 6, color: '#33302A', fontSize: 12 }}
        />
        <span style={{ color: '#7A7062', fontSize: 12 }}>₺ ({rateSource}) · 1$ = {SAR_USD_RATE} SAR (sabit)</span>
      </div>

      {/* PREMIUM HAIR GENEL HESABI (kümülatif, dönemden bağımsız) */}
      <div style={{ background: 'rgba(126,154,137,0.08)', border: '1px solid #7E9A8944', borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ color: '#7E9A89', fontWeight: 900, fontSize: 15 }}>🏢 Premium Hair Genel Hesabı (Tüm Zamanlar)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn v="s" sm onClick={() => { setLedgerOpeningForm(openingEntry ? { amount: openingEntry.amount, currency: openingEntry.currency, date: openingEntry.date, notes: openingEntry.notes || '' } : { amount: '', currency: 'USD', date: dd(0), notes: '' }); setShowLedgerOpening(true); }}>
              {openingEntry ? '✏️ Açılışı Düzenle' : '+ Açılış Bakiyesi Gir'}
            </Btn>
            <Btn sm onClick={() => setShowLedgerAdd(true)}>+ Ödeme Aldım</Btn>
          </div>
        </div>

        {!openingEntry ? (
          <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 10 }}>Önce "Açılış Bakiyesi Gir" ile eski hesaptan kalan borcu ve tarihini girin.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700 }}>AÇILIŞ BAKİYESİ ({fmt(openingEntry.date)}'den)</div>
                <div style={{ color: '#33302A', fontWeight: 800, fontSize: 16 }}>{openingEntry.currency === 'USD' ? '$' : openingEntry.currency === 'SAR' ? 'SAR ' : '₺'}{Number(openingEntry.amount).toLocaleString()}</div>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700 }}>HASTA GELİRİ ({fmt(openingEntry.date)}'den bugüne)</div>
                <div style={{ color: '#6B8F5E', fontWeight: 800, fontSize: 16 }}>+${ledgerHastaGeliri.toLocaleString()}</div>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700 }}>ALINAN ÖDEME (TOPLAM)</div>
                <div style={{ color: '#C1554A', fontWeight: 800, fontSize: 16 }}>-${ledgerOdemeAlinan.toLocaleString()}</div>
              </div>
              <div style={{ background: '#FFFFFF', border: '2px solid #7E9A89', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700 }}>GÜNCEL NET BORÇ</div>
                <div style={{ color: ledgerNetBorc >= 0 ? '#7E9A89' : '#C1554A', fontWeight: 900, fontSize: 18 }}>${ledgerNetBorc.toLocaleString()}</div>
              </div>
            </div>

            {paymentEntries.length > 0 && (
              <details>
                <summary style={{ color: '#7A7062', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💵 Alınan Ödemeler ({paymentEntries.length})</summary>
                {paymentEntries.slice().reverse().map(e => (
                  <div key={e.id} style={{ background: '#FFFFFF', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, border: '1px solid #E3D9C7' }}>
                    <div>
                      <div style={{ color: '#33302A', fontSize: 12, fontWeight: 700 }}>{fmt(e.date)} {e.notes && `· ${e.notes}`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 13 }}>{e.currency === 'USD' ? '$' : e.currency === 'SAR' ? 'SAR ' : '₺'}{Number(e.amount).toLocaleString()}</div>
                      <button onClick={() => startEditLedgerPayment(e)} style={{ padding: '3px 7px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 10, cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => removeLedgerPayment(e.id)} style={{ padding: '3px 7px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 10, cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                ))}
              </details>
            )}
          </>
        )}
      </div>

      {showLedgerOpening && (
        <Modal title="Açılış Bakiyesi" onClose={() => setShowLedgerOpening(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ color: '#7A7062', fontSize: 11 }}>Bu tarihten önceki tüm eski hesap kapanır, bu tarihten sonraki Premium Hair hastaları otomatik eklenir.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Inp ph="Tutar *" type="number" val={ledgerOpeningForm.amount} set={v => setLedgerOpeningForm(f => ({ ...f, amount: v }))} />
              <Sel val={ledgerOpeningForm.currency} set={v => setLedgerOpeningForm(f => ({ ...f, currency: v }))} opts={[{ v: 'USD', l: '$ USD' }, { v: 'TRY', l: '₺ TL' }, { v: 'SAR', l: 'SAR' }]} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TARİH (bu tarihten itibaren hasta gelirleri sayılır)</div>
              <Inp type="date" ph="" val={ledgerOpeningForm.date} set={v => setLedgerOpeningForm(f => ({ ...f, date: v }))} />
            </div>
            <Inp ph="Not (opsiyonel)" val={ledgerOpeningForm.notes} set={v => setLedgerOpeningForm(f => ({ ...f, notes: v }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setShowLedgerOpening(false)}>İptal</Btn>
              <Btn onClick={saveLedgerOpening}>Kaydet</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showLedgerAdd && (
        <Modal title={editingLedgerPayment ? 'Ödeme Kaydını Düzenle' : "Premium Hair'den Ödeme Aldım"} onClose={() => { setShowLedgerAdd(false); setEditingLedgerPayment(null); setLedgerForm({ amount: '', currency: 'USD', date: dd(0), notes: '' }); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Inp ph="Tutar *" type="number" val={ledgerForm.amount} set={v => setLedgerForm(f => ({ ...f, amount: v }))} />
              <Sel val={ledgerForm.currency} set={v => setLedgerForm(f => ({ ...f, currency: v }))} opts={[{ v: 'USD', l: '$ USD' }, { v: 'TRY', l: '₺ TL' }, { v: 'SAR', l: 'SAR' }]} />
            </div>
            <Inp type="date" ph="" val={ledgerForm.date} set={v => setLedgerForm(f => ({ ...f, date: v }))} />
            <Inp ph="Not (opsiyonel)" val={ledgerForm.notes} set={v => setLedgerForm(f => ({ ...f, notes: v }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => { setShowLedgerAdd(false); setEditingLedgerPayment(null); setLedgerForm({ amount: '', currency: 'USD', date: dd(0), notes: '' }); }}>İptal</Btn>
              <Btn onClick={saveLedgerPayment}>{editingLedgerPayment ? 'Güncelle' : 'Kaydet'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ÖZET KARTLAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { lbl: 'Toplam Gelir', val: `$${totalRevenue.toLocaleString()}`, clr: '#6B8F5E' },
          { lbl: 'Ali Haydar', val: `$${totalAli.toLocaleString()}`, clr: '#C68A3D' },
          { lbl: 'Diğer Ekip', val: `$${totalOtherTeam.toLocaleString()}`, clr: '#C68A3D' },
          { lbl: 'Seyit', val: `$${totalSeyit.toLocaleString()}`, clr: '#C68A3D' },
          { lbl: 'Net Kâr', val: `$${netProfit.toLocaleString()}`, clr: netProfit >= 0 ? '#6B8F5E' : '#C1554A' },
        ].map(k => (
          <div key={k.lbl} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 20, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* KAYNAK DAĞILIMI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div style={{ background: 'rgba(126,154,137,0.08)', border: '1px solid #7E9A8944', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#7E9A89', fontWeight: 800, fontSize: 12, marginBottom: 6 }}>🏢 Premium Hair</div>
          <div style={{ color: '#33302A', fontSize: 12, marginBottom: 4 }}>{premiumHairPayments.length} hasta</div>
          <div style={{ color: '#6B8F5E', fontWeight: 900, fontSize: 18 }}>${premiumHairRevenue.toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(107,143,94,0.08)', border: '1px solid #6B8F5E44', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#6B8F5E', fontWeight: 800, fontSize: 12, marginBottom: 6 }}>✈️ Hair International (Kendi Hastalarım)</div>
          <div style={{ color: '#33302A', fontSize: 12, marginBottom: 4 }}>{hairIntlPayments.length} hasta</div>
          <div style={{ color: '#6B8F5E', fontWeight: 900, fontSize: 18 }}>${hairIntlRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* AY SEÇİMİ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18, background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
        <button onClick={() => shiftMonth(-1)} style={{ padding: '8px 14px', background: '#F1EBDE', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>◀</button>
        <div style={{ color: '#7E9A89', fontWeight: 900, fontSize: 16, minWidth: 160, textAlign: 'center' }}>📅 {getMonthLabel(selectedMonth)}</div>
        <button onClick={() => shiftMonth(1)} style={{ padding: '8px 14px', background: '#F1EBDE', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>▶</button>
        <Btn sm v="s" onClick={generateMonthlyReportPDF}>📄 Aylık Rapor PDF</Btn>
      </div>

      {/* TREND GRAFİĞİ */}
      {trendData.length > 1 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📈 Son {trendData.length} Dönem Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3D9C7" />
              <XAxis dataKey="period" stroke="#7A7062" fontSize={11} />
              <YAxis stroke="#7A7062" fontSize={11} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 8, color: '#33302A' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Gelir" stroke="#6B8F5E" strokeWidth={2} />
              <Line type="monotone" dataKey="Kâr" stroke="#7E9A89" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HASTA LİSTESİ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14 }}>👥 Hasta Ücret Kayıtları — {getMonthLabel(selectedMonth)}</div>
            <div style={{ color: '#7A7062', fontSize: 11, marginTop: 2 }}>{monthlyPayments.length} hasta bu ay</div>
          </div>
          <Btn sm onClick={() => { resetForm(); setEditItem(null); setShowAdd(true); }}>+ Hasta Ekle</Btn>
        </div>
        {monthlyPayments.length === 0 ? (
          <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 30 }}>{getMonthLabel(selectedMonth)} ayında kayıt yok.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E3D9C7' }}>
                  {['Hasta', 'Kaynak', 'Tarih', 'Teknik', 'Gelir', 'Ali Haydar', 'Diğer Ekip', 'Seyit', 'İşlem'].map(h => (
                    <th key={h} style={{ color: '#7A7062', fontWeight: 700, padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyPayments.map(p => {
                  let otherArr = [];
                  try { otherArr = typeof p.fee_distribution === 'string' ? JSON.parse(p.fee_distribution || '[]') : (p.fee_distribution || []); } catch (e) {}
                  if ((!otherArr || otherArr.length === 0)) {
                    if (Number(p.yusuf_fee) > 0) otherArr.push({ name: 'Yusuf', amount: p.yusuf_fee });
                    if (Number(p.mete_fee) > 0) otherArr.push({ name: 'Mete', amount: p.mete_fee });
                  }
                  const otherTotal = otherArr.reduce((s, r) => s + Number(r.amount || 0), 0);
                  const otherNames = otherArr.map(r => `${r.name}: $${r.amount}`).join(', ');
                  return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #E3D9C7' }}>
                    <td style={{ color: '#33302A', fontWeight: 700, padding: '10px 10px' }}>{p.patient_name}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: (p.kaynak || 'Premium Hair') === 'Premium Hair' ? 'rgba(126,154,137,0.15)' : 'rgba(107,143,94,0.15)', color: (p.kaynak || 'Premium Hair') === 'Premium Hair' ? '#7E9A89' : '#6B8F5E' }}>
                        {(p.kaynak || 'Premium Hair') === 'Premium Hair' ? '🏢 Premium Hair' : '✈️ Hair Intl'}
                      </span>
                    </td>
                    <td style={{ color: '#7A7062', padding: '10px 10px', whiteSpace: 'nowrap' }}>{fmt(p.surgery_date)}</td>
                    <td style={{ color: '#7A7062', padding: '10px 10px' }}>{p.technique}</td>
                    <td style={{ color: '#6B8F5E', fontWeight: 700, padding: '10px 10px' }}>${Number(p.total_price || 0).toLocaleString()}</td>
                    <td style={{ color: '#C68A3D', padding: '10px 10px' }}>${Number(p.ali_haydar_fee || 0).toLocaleString()}</td>
                    <td style={{ color: '#C68A3D', padding: '10px 10px' }} title={otherNames}>${otherTotal.toLocaleString()} {otherNames && <div style={{ color: '#7A7062', fontSize: 9 }}>{otherNames}</div>}</td>
                    <td style={{ color: '#C68A3D', padding: '10px 10px' }}>${Number(p.seyit_fee || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(p)} style={{ padding: '4px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => deletePayment(p.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <details style={{ marginTop: 14 }}>
          <summary style={{ color: '#7A7062', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>📦 Arşiv — Tüm Ayların Toplamı ({payments.length} hasta, tüm zamanlar)</summary>
          <div style={{ color: '#7A7062', fontSize: 11, marginTop: 8 }}>Diğer ayları görmek için yukarıdaki ◀ ▶ ok butonlarını kullanın.</div>
        </details>
      </div>

      {/* NET ÖDEME ÖZETİ (Kişisel Alacaklar Düşülmüş) */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14, marginBottom: 14 }}>💵 Net Ödenecek (Kişisel Alacaklar Düşülmüş) — {getMonthLabel(selectedMonth)}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E3D9C7' }}>
                {['Kişi', 'Vaka Sayısı', 'Hak Ediş', 'Alacak/Verecek (Avans, Market, Kişisel Gider vs.)', 'Net Ödenecek'].map(h => (
                  <th key={h} style={{ color: '#7A7062', fontWeight: 700, padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Ali Haydar', earned: totalAli, count: caseCountAli, pending: pendingAli, net: netAli },
                ...otherTeamRows,
                { name: 'Seyit', earned: totalSeyit, count: caseCountSeyit, pending: pendingSeyitDirect - seyitReimbursement, net: netSeyit },
              ].map(row => (
                <tr key={row.name} style={{ borderBottom: '1px solid #E3D9C7' }}>
                  <td style={{ color: '#33302A', fontWeight: 700, padding: '10px 10px' }}>{row.name}</td>
                  <td style={{ color: '#7A7062', padding: '10px 10px', textAlign: 'center' }}>{row.count}</td>
                  <td style={{ color: '#6B8F5E', padding: '10px 10px' }}>${row.earned.toLocaleString()}</td>
                  <td style={{ color: row.pending > 0 ? '#C1554A' : row.pending < 0 ? '#6B8F5E' : '#7A7062', padding: '10px 10px', fontWeight: row.pending !== 0 ? 700 : 400 }}>{row.pending > 0 ? `-$${row.pending.toLocaleString()}` : row.pending < 0 ? `+$${Math.abs(row.pending).toLocaleString()}` : '-'}</td>
                  <td style={{ color: row.net >= 0 ? '#6B8F5E' : '#C1554A', fontWeight: 900, padding: '10px 10px' }}>${row.net.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendingGenel > 0 && (
          <div style={{ marginTop: 12, color: '#C68A3D', fontSize: 11, fontWeight: 700 }}>
            🏢 Genel/Şirket bekleyen: ${pendingGenel.toLocaleString()} (kişiye bağlı değil, ayrı takip edilir)
          </div>
        )}
        {pendingPremiumHair > 0 && (
          <div style={{ marginTop: 8, color: '#6B8F5E', fontSize: 12, fontWeight: 800, background: 'rgba(107,143,94,0.1)', border: '1px solid #6B8F5E44', borderRadius: 8, padding: '8px 12px' }}>
            🛒 Premium Hair'den Alacağımız: ${pendingPremiumHair.toLocaleString()} (market giderleri, ay sonu hesaplaşmada netleşir)
          </div>
        )}
      </div>

      {/* SEYİT'İN AYLIK HESAP ÖZETİ */}
      <div style={{ background: 'rgba(155,123,140,0.08)', border: '1px solid #9B7B8C44', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ color: '#9B7B8C', fontWeight: 900, fontSize: 15, marginBottom: 14 }}>👑 Seyit'in Aylık Hesap Özeti — {getMonthLabel(selectedMonth)}</div>
        {(() => {
          const seyitGiderTotal = giderFor('Seyit');
          const seyitAlacakTotal = receivablesOnlyFor('Seyit');
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #9B7B8C22' }}>
                <span style={{ color: '#33302A', fontSize: 13 }}>Hak Ediş ({caseCountSeyit} vaka)</span>
                <span style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 13 }}>+${totalSeyit.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #9B7B8C22' }}>
                <span style={{ color: '#33302A', fontSize: 13 }}>Kişisel Giderler (uçak bileti vb.)</span>
                <span style={{ color: seyitGiderTotal > 0 ? '#C1554A' : '#7A7062', fontWeight: 700, fontSize: 13 }}>{seyitGiderTotal > 0 ? `-$${seyitGiderTotal.toLocaleString()}` : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #9B7B8C22' }}>
                <span style={{ color: '#33302A', fontSize: 13 }}>Diğer Alacaklar (Kendi avansı vb.)</span>
                <span style={{ color: seyitAlacakTotal > 0 ? '#C1554A' : '#7A7062', fontWeight: 700, fontSize: 13 }}>{seyitAlacakTotal > 0 ? `-$${seyitAlacakTotal.toLocaleString()}` : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #9B7B8C22' }}>
                <span style={{ color: '#33302A', fontSize: 13 }}>Ekip Avans Tahsilatı (Ali/Muhammed Ali/Sergen/Furkan'a verilip ✓ Tahsil edilenler)</span>
                <span style={{ color: seyitReimbursement > 0 ? '#6B8F5E' : '#7A7062', fontWeight: 700, fontSize: 13 }}>{seyitReimbursement > 0 ? `+$${seyitReimbursement.toLocaleString()}` : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0 0' }}>
                <span style={{ color: '#33302A', fontWeight: 900, fontSize: 15 }}>NET TOPLAM</span>
                <span style={{ color: netSeyit >= 0 ? '#6B8F5E' : '#C1554A', fontWeight: 900, fontSize: 20 }}>${netSeyit.toLocaleString()}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ALACAKLAR */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14 }}>📋 Alacaklar — {getMonthLabel(selectedMonth)}</div>
            <div style={{ color: '#C68A3D', fontSize: 11, marginTop: 2 }}>Bekleyen: ₺{totalPending.toLocaleString()}</div>
          </div>
          <Btn sm onClick={() => setShowAddRec(true)}>+ Alacak</Btn>
        </div>
        {pendingRec.length === 0 ? (
          <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 20 }}>Bekleyen alacak yok.</div>
        ) : pendingRec.map(r => (
          <div key={r.id} style={{ background: '#F1EBDE', border: '1px solid #C68A3D33', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ color: '#33302A', fontSize: 13, fontWeight: 700 }}>
                {r.description}
                <span style={{ marginLeft: 8, padding: '2px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A8944', borderRadius: 10, color: '#7E9A89', fontSize: 10, fontWeight: 700 }}>
                  {r.person || 'Genel'}
                </span>
              </div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{fmt(r.date_added)} {r.notes && `· ${r.notes}`}</div>
              {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#7E9A89', fontSize: 11 }}>📷 Fiş</a>}
            </div>
            <div style={{ color: '#C68A3D', fontWeight: 800, fontSize: 14 }}>{r.currency === 'USD' ? '$' : r.currency === 'SAR' ? 'SAR ' : r.currency === 'EUR' ? '€' : '₺'}{Number(r.amount).toLocaleString()}</div>
            <button onClick={() => markPaid(r)} style={{ padding: '5px 10px', background: '#6B8F5E', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Tahsil</button>
            <button onClick={() => startEditRec(r)} style={{ padding: '5px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>✏️</button>
            <button onClick={() => removeRec(r)} style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>Sil</button>
          </div>
        ))}
        {paidRec.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ color: '#6B8F5E', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✅ Tahsil Edilenler ({paidRec.length})</summary>
            {paidRec.map(r => (
              <div key={r.id} style={{ background: '#F1EBDE', borderLeft: '3px solid #6B8F5E', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#33302A', fontSize: 12 }}>{r.description}</div>
                  <div style={{ color: '#7A7062', fontSize: 10 }}>Tahsil: {fmt(r.paid_date)}</div>
                </div>
                <div style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 13 }}>{r.currency === 'USD' ? '$' : r.currency === 'SAR' ? 'SAR ' : '₺'}{Number(r.amount).toLocaleString()}</div>
              </div>
            ))}
          </details>
        )}
      </div>

      {/* AYLIK MASRAF ÖZETİ (Tüm Zamanlar - Analiz için) */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📅 Aylık Masraf Özeti (Tüm Zamanlar)</div>
        <div style={{ color: '#7A7062', fontSize: 11, marginBottom: 14 }}>Kişisel harcamalar, avanslar ve tüm alacak kayıtlarının 13'ünden 13'üne dönem dökümü — geriye dönük analiz için</div>
        {(() => {
          const byMonth = {};
          receivables.forEach(r => {
            const key = getPeriodKeyFromDateStr(r.date_added || r.created_at);
            if (!key) return;
            if (!byMonth[key]) byMonth[key] = { total: 0, items: [] };
            byMonth[key].total += Number(r.amount || 0);
            byMonth[key].items.push(r);
          });
          const months = Object.keys(byMonth).sort().reverse();
          if (months.length === 0) return <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 10 }}>Henüz kayıt yok.</div>;
          return months.map(mk => {
            const label = getMonthLabel(mk);
            return (
              <details key={mk} style={{ marginBottom: 8 }}>
                <summary style={{ color: '#33302A', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '8px 0' }}>
                  {label} — <span style={{ color: '#B8952E' }}>${byMonth[mk].total.toLocaleString()}</span> ({byMonth[mk].items.length} kayıt)
                </summary>
                {byMonth[mk].items.map(r => (
                  <div key={r.id} style={{ background: '#F1EBDE', borderRadius: 6, padding: '8px 12px', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#33302A', fontSize: 12 }}>{r.description} <span style={{ color: '#7A7062', fontSize: 10 }}>({r.person || 'Genel'})</span></div>
                      {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#7E9A89', fontSize: 10 }}>📷 Fiş</a>}
                    </div>
                    <div style={{ color: r.paid ? '#6B8F5E' : '#B8952E', fontWeight: 700, fontSize: 12 }}>{r.currency === 'USD' ? '$' : r.currency === 'SAR' ? 'SAR ' : '₺'}{Number(r.amount).toLocaleString()} {r.paid ? '✓' : '⏳'}</div>
                  </div>
                ))}
              </details>
            );
          });
        })()}
      </div>

      {/* KİŞİSEL GİDERLER (KARŞILIKSIZ) - Bu bölüm ameliyat gelir/gider hesaplarını ETKİLEMEZ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #9B7B8C44', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14 }}>✈️ Kişisel Giderler (Karşılıksız) — {getMonthLabel(selectedMonth)}</div>
            <div style={{ color: '#7A7062', fontSize: 11, marginTop: 2 }}>Uçak bileti vb. — geri alınmayan masraflar. Bu tutarlar hasta gelir/kâr hesabına dahil edilmez, sadece kayıt/analiz amaçlıdır. Yukarıdaki ana dönem seçimine (13'ünden 13'üne) göre gruplanır.</div>
          </div>
          <Btn sm v="s" onClick={() => setShowAddGider(true)}>+ Gider Ekle</Btn>
        </div>

        {(() => {
          const monthlyGiderler = kisiselGiderler.filter(g => getPeriodKeyFromDateStr(g.date) === selectedMonth);
          const totalTRY = monthlyGiderler.filter(g => (g.currency || 'TRY') === 'TRY').reduce((s, g) => s + Number(g.amount || 0), 0);
          const totalUSD = monthlyGiderler.filter(g => g.currency === 'USD').reduce((s, g) => s + Number(g.amount || 0), 0);
          const totalSAR = monthlyGiderler.filter(g => g.currency === 'SAR').reduce((s, g) => s + Number(g.amount || 0), 0);
          return (
            <>
              <div style={{ color: '#9B7B8C', fontWeight: 900, fontSize: 16, margin: '12px 0' }}>
                Bu Dönem Toplam: ₺{totalTRY.toLocaleString()} {' + '} ${totalUSD.toLocaleString()} {' + '} SAR {totalSAR.toLocaleString()}
              </div>
              {monthlyGiderler.length === 0 ? (
                <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 16 }}>{getMonthLabel(selectedMonth)} döneminde kayıt yok.</div>
              ) : monthlyGiderler.map(g => (
                <div key={g.id} style={{ background: '#F1EBDE', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ color: '#33302A', fontSize: 13, fontWeight: 700 }}>{g.desc} <span style={{ color: '#7A7062', fontSize: 10 }}>({g.cat})</span></div>
                    <div style={{ color: '#7A7062', fontSize: 11 }}>{fmt(g.date)}</div>
                    {g.receipt_url && <a href={g.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#7E9A89', fontSize: 11 }}>📷 Fiş</a>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: '#9B7B8C', fontWeight: 800 }}>{g.currency === 'USD' ? '$' : g.currency === 'SAR' ? 'SAR ' : '₺'}{Number(g.amount).toLocaleString()}</div>
                    <button onClick={() => removeKisiselGider(g.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              ))}
            </>
          );
        })()}
      </div>

      {showAddGider && (
        <Modal title="Kişisel Gider Ekle" onClose={() => setShowAddGider(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>KİME AİT? (hesabından düşülecek kişi)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {['Seyit', 'Ali Haydar', ...Object.values(otherFeeByName).map(v => v.display)].map(p => (
                  <button key={p} type="button" onClick={() => setGiderForm(f => ({ ...f, person: p }))} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${giderForm.person === p ? '#9B7B8C' : '#E3D9C7'}`, background: giderForm.person === p ? 'rgba(155,123,140,0.15)' : '#FFFFFF', color: giderForm.person === p ? '#9B7B8C' : '#A79B88', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{p}</button>
                ))}
              </div>
              <input
                value={giderForm.person}
                onChange={(e) => setGiderForm(f => ({ ...f, person: e.target.value }))}
                placeholder="Ya da başka bir isim yazın"
                style={{ width: '100%', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
            <Sel val={giderForm.cat} set={v => setGiderForm(f => ({ ...f, cat: v }))} opts={['Uçak Bileti', 'Konaklama', 'Ulaşım', 'Yemek', 'Diğer']} />
            <Inp ph="Açıklama * (örn: Mete'ye uçak bileti)" val={giderForm.desc} set={v => setGiderForm(f => ({ ...f, desc: v }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Inp ph="Tutar *" type="number" val={giderForm.amount} set={v => setGiderForm(f => ({ ...f, amount: v }))} />
              <Sel val={giderForm.currency} set={v => setGiderForm(f => ({ ...f, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }, { v: 'SAR', l: 'SAR ﷼' }]} />
            </div>
            <Inp type="date" ph="" val={giderForm.date} set={v => setGiderForm(f => ({ ...f, date: v }))} />
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>FİŞ FOTOĞRAFI</div>
              <input type="file" accept="image/*" onChange={e => setGiderForm(f => ({ ...f, receiptFile: e.target.files[0] }))} style={{ width: '100%', padding: 8, background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setShowAddGider(false)}>İptal</Btn>
              <Btn onClick={saveKisiselGider} disabled={uploadingGider}>{uploadingGider ? 'Yükleniyor...' : 'Kaydet'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* HASTA EKLE/DÜZENLE MODAL */}
      {showAdd && (
        <Modal title={editItem ? 'Kaydı Düzenle' : 'Hasta Ekle'} onClose={() => { setShowAdd(false); setEditItem(null); resetForm(); }} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>HASTA ADI *</div>
              <Inp ph="Ad Soyad" val={form.patient_name} set={v => setForm(f => ({ ...f, patient_name: v }))} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>OP. TARİHİ</div>
              <Inp type="date" ph="" val={form.surgery_date} set={v => setForm(f => ({ ...f, surgery_date: v }))} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TEKNİK</div>
              <Sel val={form.technique} set={v => setForm(f => ({ ...f, technique: v }))} opts={['FUE', 'DHI', 'Safir FUE', 'PRP']} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>KAYNAK</div>
              <Sel val={form.kaynak} set={v => setForm(f => ({ ...f, kaynak: v }))} opts={[{ v: 'Premium Hair', l: '🏢 Premium Hair' }, { v: 'Hair International', l: '✈️ Hair International (Kendi Hastam)' }]} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TOPLAM GELİR ($)</div>
              <Inp type="number" ph="Örn: 2500" val={form.total_price} set={v => setForm(f => ({ ...f, total_price: v }))} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>ALİ HAYDAR ÜCRETİ ($)</div>
              <Inp type="number" ph="0" val={form.ali_haydar_fee} set={v => setForm(f => ({ ...f, ali_haydar_fee: v }))} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>SEYİT ÜCRETİ ($)</div>
              <Inp type="number" ph="0" val={form.seyit_fee} set={v => setForm(f => ({ ...f, seyit_fee: v }))} />
            </div>
            <div style={{ gridColumn: '1/-1', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: 12 }}>
              <div style={{ color: '#B8952E', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>👥 DİĞER EKİP ÜYELERİ (her ay değişebilir — isim yazın)</div>
              {form.otherFees.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 6 }}>
                  <input list="diger-ekip-list" value={row.name} onChange={(e) => updateOtherFeeRow(idx, 'name', e.target.value)} placeholder="Kişi adı" style={{ padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12, boxSizing: 'border-box' }} />
                  <input type="number" value={row.amount} onChange={(e) => updateOtherFeeRow(idx, 'amount', e.target.value)} placeholder="Tutar ($)" style={{ padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12, boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => removeOtherFeeRow(idx)} style={{ padding: '4px 10px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 12, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <datalist id="diger-ekip-list">{Object.values(otherFeeByName).map(v => <option key={v.display} value={v.display} />)}</datalist>
              <Btn v="s" sm onClick={addOtherFeeRow}>+ Kişi Ekle</Btn>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>NOTLAR</div>
              <Inp ph="Notlar..." val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 0, background: '#FFFFFF', paddingTop: 12, paddingBottom: 4, borderTop: '1px solid #D4C7AE' }}>
            <Btn v="s" onClick={() => { setShowAdd(false); setEditItem(null); resetForm(); }}>İptal</Btn>
            <Btn onClick={savePayment}>{editItem ? 'Güncelle' : 'Kaydet'}</Btn>
          </div>
        </Modal>
      )}

      {/* ALACAK EKLE MODAL */}
      {showAddRec && (
        <Modal title={editingRec ? 'Alacağı Düzenle' : 'Alacak Ekle'} onClose={() => { setShowAddRec(false); setEditingRec(null); setRecForm({ description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null, person: 'Genel', date: dd(0) }); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>KİM İÇİN? (kişisel harcama sahibi)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {['Genel', 'Ali Haydar', 'Seyit', 'Premium Hair (Market)'].map(p => (
                  <button key={p} type="button" onClick={() => setRecForm(f => ({ ...f, person: p }))} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${recForm.person === p ? '#7E9A89' : '#E3D9C7'}`, background: recForm.person === p ? 'rgba(126,154,137,0.15)' : '#FFFFFF', color: recForm.person === p ? '#7E9A89' : '#A79B88', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{p}</button>
                ))}
              </div>
              <input
                list="rec-person-list"
                value={recForm.person}
                onChange={(e) => setRecForm(f => ({ ...f, person: e.target.value }))}
                placeholder="Ya da başka bir isim yazın (değişken ekip üyesi)"
                style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }}
              />
              <datalist id="rec-person-list">
                {Object.values(otherFeeByName).map(v => <option key={v.display} value={v.display} />)}
              </datalist>
            </div>
            <Inp ph="Açıklama *" val={recForm.description} set={v => setRecForm(f => ({ ...f, description: v }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Inp ph="Tutar *" type="number" val={recForm.amount} set={v => setRecForm(f => ({ ...f, amount: v }))} />
              <Sel val={recForm.currency} set={v => setRecForm(f => ({ ...f, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }, { v: 'SAR', l: 'SAR' }]} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TARİH (hangi döneme ait olacağını belirler)</div>
              <Inp type="date" ph="" val={recForm.date} set={v => setRecForm(f => ({ ...f, date: v }))} />
            </div>
            <Inp ph="Notlar" val={recForm.notes} set={v => setRecForm(f => ({ ...f, notes: v }))} />
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>FİŞ FOTOĞRAFI (opsiyonel)</div>
              <input type="file" accept="image/*" onChange={e => setRecForm(f => ({ ...f, receiptFile: e.target.files[0] }))} style={{ width: '100%', padding: 8, background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => { setShowAddRec(false); setEditingRec(null); setRecForm({ description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null, person: 'Genel', date: dd(0) }); }}>İptal</Btn>
              <Btn onClick={saveReceivable} disabled={uploadingReceipt}>{uploadingReceipt ? 'Yükleniyor...' : (editingRec ? 'Güncelle' : 'Kaydet')}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Finance({ patients, expenses, setExpenses, user, region }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ cat: 'Kira', desc: '', amount: '', date: dd(0) });
  const totalRev = patients.reduce((s, p) => s + (p.totalPaid || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const net = totalRev - totalExp;
  const save = async () => {
    if (!form.desc || !form.amount) return;
    const row = { ...form, amount: Number(form.amount), region };
    const saved = await insertGider(row);
    setExpenses((es) => [saved ?? { ...row, id: Date.now() }, ...es]);
    setShowAdd(false);
    setForm({ cat: 'Kira', desc: '', amount: '', date: dd(0) });
  };
  return (
    <div>
      <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900, marginBottom: 18 }}>💰 Muhasebe</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {[
          { ico: '📈', lbl: 'Gelir', val: fmtM(totalRev), clr: '#6B8F5E' },
          { ico: '💸', lbl: 'Gider', val: fmtM(totalExp), clr: '#C1554A' },
          { ico: '✨', lbl: 'Net', val: fmtM(net), clr: net >= 0 ? '#6B8F5E' : '#C1554A' },
        ].map((k) => (
          <div key={k.lbl} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{k.ico}</div>
            <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 24, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ color: '#33302A', fontWeight: 800 }}>Giderler</div>
        <Btn sm onClick={() => setShowAdd(true)}>+ Gider</Btn>
      </div>
      {expenses.map((e) => (
        <div key={e.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ color: '#33302A', fontSize: 13 }}>{e.desc}</div>
            <div style={{ color: '#7A7062', fontSize: 10 }}>{e.cat} · {fmt(e.date)}</div>
          </div>
          <div style={{ color: '#C1554A', fontWeight: 800 }}>-₺{e.amount.toLocaleString()}</div>
        </div>
      ))}
      {showAdd && (
        <Modal title="Gider Ekle" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sel val={form.cat} set={(v) => setForm((f) => ({ ...f, cat: v }))} opts={['Personel', 'Kira', 'Malzeme', 'Reklam', 'Diger']} />
            <Inp ph="Aciklama *" val={form.desc} set={(v) => setForm((f) => ({ ...f, desc: v }))} />
            <Inp ph="Tutar" val={form.amount} set={(v) => setForm((f) => ({ ...f, amount: v }))} />
            <Inp type="date" ph="" val={form.date} set={(v) => setForm((f) => ({ ...f, date: v }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setShowAdd(false)}>Iptal</Btn>
              <Btn onClick={save}>Kaydet</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ActivityLog({ region }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchLogs(region);
      setLogs(data || []);
      setLoading(false);
    })();
  }, [region]);
  const refresh = async () => { setLoading(true); const data = await fetchLogs(region); setLogs(data || []); setLoading(false); };
  const userNames = [...new Set(logs.map((l) => l.user_name))];
  const filtered = logs.filter((l) => {
    if (filterUser && l.user_name !== filterUser) return false;
    if (search) { const q = search.toLowerCase(); return (l.user_name || '').toLowerCase().includes(q) || (l.action || '').toLowerCase().includes(q) || (l.target_name || '').toLowerCase().includes(q); }
    return true;
  });
  const actionColor = (action) => {
    if (action?.includes('silindi')) return '#C1554A';
    if (action?.includes('eklendi')) return '#6B8F5E';
    if (action?.includes('yuklendi')) return '#7E9A89';
    if (action?.includes('tahsil')) return '#B8952E';
    return '#A79B88';
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900 }}>📜 Aktivite Geçmişi</div>
        <Btn sm v="s" onClick={refresh}>🔄 Yenile</Btn>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 200 }}><Inp ph="Ara..." val={search} set={setSearch} /></div>
        <div style={{ flex: 1, minWidth: 160 }}><Sel val={filterUser} set={setFilterUser} opts={[{ v: '', l: '👥 Tümü' }, ...userNames.map((n) => ({ v: n, l: n }))]} /></div>
      </div>
      {loading ? <div style={{ color: '#7A7062', textAlign: 'center', padding: 30 }}>Yukleniyor...</div> : filtered.length === 0 ? <div style={{ color: '#7A7062', textAlign: 'center', padding: 30 }}>Kayit yok.</div> : filtered.map((l) => (
        <div key={l.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderLeft: `3px solid ${actionColor(l.action)}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Av name={l.user_name} size={26} clr={actionColor(l.action)} />
              <span style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{l.user_name}</span>
              <span style={{ color: actionColor(l.action), fontSize: 12, fontWeight: 700 }}>{l.action}</span>
            </div>
            <span style={{ color: '#7A7062', fontSize: 10 }}>{fmtDateTime(l.created_at)}</span>
          </div>
          <div style={{ color: '#A79B88', fontSize: 12, marginLeft: 34 }}>{l.target_type}: <span style={{ color: '#33302A', fontWeight: 600 }}>{l.target_name}</span>{l.details && ` · ${l.details}`}</div>
        </div>
      ))}
    </div>
  );
}

function Settings({ users, setUsers, user, region }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'operation', password: '' });
  const [newPass, setNewPass] = useState('');
  const addUser = async () => {
    if (!form.name || !form.password) return;
    const saved = await insertKullanici({ ...form, region });
    if (saved) setUsers((us) => [...us, saved]);
    setShowAdd(false);
    setForm({ name: '', email: '', role: 'operation', password: '' });
  };
  const removeUser = async (u) => {
    if (!window.confirm('Silinsin mi?')) return;
    await deleteKullanici(u.id);
    setUsers((us) => us.filter((x) => x.id !== u.id));
  };
  const changePassword = async () => {
    if (!newPass) return;
    await updateKullanici(editUser.id, { password: newPass });
    setUsers((us) => us.map((u) => (u.id === editUser.id ? { ...u, password: newPass } : u)));
    setEditUser(null);
    setNewPass('');
  };

  const [backingUp, setBackingUp] = useState('');
  const downloadCSV = (rows, filename) => {
    if (!rows || rows.length === 0) { alert('Veri yok.'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers, ...rows.map(r => headers.map(h => r[h]))]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const backupDataset = async (label, fetchFn, filename) => {
    setBackingUp(label);
    try {
      const data = await fetchFn();
      downloadCSV(data || [], filename);
    } catch (e) {
      alert('Yedekleme sırasında hata oluştu.');
    }
    setBackingUp('');
  };
  const BACKUP_ITEMS = [
    { label: 'Hastalar', fn: () => fetchHastalar(region), file: `hastalar_${region}.csv` },
    { label: 'Leadler', fn: () => fetchLiderler(region), file: `leadler_${region}.csv` },
    { label: 'Hasta Ücret Kayıtları', fn: () => fetchPatientPayments(region), file: `hasta_ucret_kayitlari_${region}.csv` },
    { label: 'Alacaklar', fn: () => fetchReceivables(region), file: `alacaklar_${region}.csv` },
    { label: 'Giderler', fn: () => fetchGiderler(region), file: `giderler_${region}.csv` },
    { label: 'Medikal Ürünler', fn: fetchMedikalUrunler, file: 'medikal_urunler.csv' },
    { label: 'Medikal Müşteriler', fn: fetchMedikalMusteriler, file: 'medikal_musteriler.csv' },
    { label: 'Medikal Satışlar', fn: fetchMedikalSatislar, file: 'medikal_satislar.csv' },
    { label: 'Medikal Alımlar', fn: fetchMedikalAlimlar, file: 'medikal_alimlar.csv' },
    { label: 'Medikal Giderler', fn: fetchMedikalGiderler, file: 'medikal_giderler.csv' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900 }}>⚙️ Kullanici Yonetimi</div>
        <Btn sm onClick={() => setShowAdd(true)}>+ Kullanici Ekle</Btn>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>💾 Yedekleme</div>
        <div style={{ color: '#7A7062', fontSize: 11, marginBottom: 12 }}>Her veri setini Excel'de açılabilir CSV dosyası olarak indirin — düzenli olarak yedek almanız önerilir.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BACKUP_ITEMS.map(item => (
            <Btn key={item.label} sm v="s" disabled={backingUp === item.label} onClick={() => backupDataset(item.label, item.fn, item.file)}>
              {backingUp === item.label ? '⏳...' : `📥 ${item.label}`}
            </Btn>
          ))}
        </div>
      </div>
      {users.map((u) => {
        const role = ROLES[u.role];
        return (
          <div key={u.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Av name={u.name} size={36} clr={role?.clr} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#33302A', fontSize: 13, fontWeight: 700 }}>{u.name} {role?.badge}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{role?.lbl}</div>
            </div>
            <Btn sm v="s" onClick={() => { setEditUser(u); setNewPass(''); }}>🔑</Btn>
            {u.role !== 'admin' && <Btn sm v="d" onClick={() => removeUser(u)}>Sil</Btn>}
          </div>
        );
      })}
      {showAdd && (
        <Modal title="Kullanici Ekle" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Inp ph="Ad *" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Inp ph="Email" val={form.email} set={(v) => setForm((f) => ({ ...f, email: v }))} />
            <Sel val={form.role} set={(v) => setForm((f) => ({ ...f, role: v }))} opts={Object.entries(ROLES).map(([k, v]) => ({ v: k, l: v.badge + ' ' + v.lbl }))} />
            <Inp ph="Sifre *" type="password" val={form.password} set={(v) => setForm((f) => ({ ...f, password: v }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setShowAdd(false)}>Iptal</Btn>
              <Btn onClick={addUser}>Ekle</Btn>
            </div>
          </div>
        </Modal>
      )}
      {editUser && (
        <Modal title={`${editUser.name} - Sifre`} onClose={() => setEditUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Inp ph="Yeni Sifre" type="password" val={newPass} set={setNewPass} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setEditUser(null)}>Iptal</Btn>
              <Btn onClick={changePassword}>Kaydet</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const parseSaleText = (text, urunler, musteriler) => {
  const lower = text.toLowerCase();
  let customerGuess = '', productGuess = '', quantity = 1, price = '', currency = 'TRY';
  const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(\$|dolar|usd|tl|₺|lira)/i);
  if (priceMatch) {
    price = priceMatch[1].replace(',', '.');
    const cur = priceMatch[2].toLowerCase();
    currency = (cur === '$' || cur === 'dolar' || cur === 'usd') ? 'USD' : 'TRY';
  }
  const qtyMatch = text.match(/(\d+)\s*(tane|adet)/i);
  if (qtyMatch) quantity = Number(qtyMatch[1]);
  const custMatch = text.match(/([A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ]*)'(?:e|ye|a|ya|nin|nın|ın|in)/);
  if (custMatch) {
    const nameGuess = custMatch[1];
    const found = musteriler.find((m) => m.name.toLowerCase() === nameGuess.toLowerCase());
    customerGuess = found ? found.name : nameGuess;
  } else {
    const found = musteriler.find((m) => lower.includes(m.name.toLowerCase()));
    if (found) customerGuess = found.name;
  }
  const foundProduct = urunler.find((p) => lower.includes(p.name.toLowerCase()));
  if (foundProduct) productGuess = foundProduct.name;
  return { customerGuess, productGuess, quantity, price, currency };
};

const MEDIKAL_TABS = [
  { id: 'urunler', ico: '📦', lbl: 'Ürünler' },
  { id: 'musteriler', ico: '👥', lbl: 'Müşteriler' },
  { id: 'tedarikciler', ico: '🚚', lbl: 'Tedarikçiler' },
  { id: 'alim', ico: '📥', lbl: 'Stok Girişi' },
  { id: 'satis', ico: '🛒', lbl: 'Satış' },
  { id: 'acikhesap', ico: '📒', lbl: 'Açık Hesap' },
  { id: 'giderler', ico: '💸', lbl: 'Giderler' },
  { id: 'raporlar', ico: '📊', lbl: 'Raporlar' },
  { id: 'teklif', ico: '📄', lbl: 'Teklif' },
];

function MedikalSatis({ user }) {
  const [sub, setSub] = useState('urunler');
  const [loading, setLoading] = useState(true);
  const [urunler, setUrunler] = useState([]);
  const [musteriler, setMusteriler] = useState([]);
  const [tedarikciler, setTedarikciler] = useState([]);
  const [alimlar, setAlimlar] = useState([]);
  const [satislar, setSatislar] = useState([]);
  const [giderler, setGiderler] = useState([]);
  const [teklifler, setTeklifler] = useState([]);

  const refreshAll = async () => {
    setLoading(true);
    const [u, m, t, a, s, g, tk] = await Promise.all([
      fetchMedikalUrunler(), fetchMedikalMusteriler(), fetchMedikalTedarikciler(),
      fetchMedikalAlimlar(), fetchMedikalSatislar(), fetchMedikalGiderler(), fetchMedikalTeklifler(),
    ]);
    setUrunler(u || []); setMusteriler(m || []); setTedarikciler(t || []);
    setAlimlar(a || []); setSatislar(s || []); setGiderler(g || []); setTeklifler(tk || []);
    setLoading(false);
  };

  useEffect(() => { refreshAll(); }, []);

  if (loading) return <div style={{ color: '#7A7062', padding: 30 }}>Yükleniyor...</div>;

  return (
    <div>
      <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900, marginBottom: 16 }}>💊 Medikal Satış</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {MEDIKAL_TABS.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${sub === t.id ? '#7E9A89' : '#E3D9C7'}`, background: sub === t.id ? 'rgba(126,154,137,0.15)' : '#FFFFFF', color: sub === t.id ? '#7E9A89' : '#A79B88', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {t.ico} {t.lbl}
          </button>
        ))}
      </div>
      {sub === 'urunler' && <MedikalUrunler urunler={urunler} setUrunler={setUrunler} />}
      {sub === 'musteriler' && <MedikalMusteriler musteriler={musteriler} setMusteriler={setMusteriler} satislar={satislar} />}
      {sub === 'tedarikciler' && <MedikalTedarikciler tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} alimlar={alimlar} setAlimlar={setAlimlar} />}
      {sub === 'alim' && <MedikalAlim urunler={urunler} setUrunler={setUrunler} tedarikciler={tedarikciler} alimlar={alimlar} setAlimlar={setAlimlar} />}
      {sub === 'satis' && <MedikalSatisGirisi urunler={urunler} setUrunler={setUrunler} musteriler={musteriler} satislar={satislar} setSatislar={setSatislar} />}
      {sub === 'acikhesap' && <MedikalAcikHesap satislar={satislar} setSatislar={setSatislar} />}
      {sub === 'giderler' && <MedikalGiderler giderler={giderler} setGiderler={setGiderler} />}
      {sub === 'raporlar' && <MedikalRaporlar urunler={urunler} satislar={satislar} alimlar={alimlar} giderler={giderler} musteriler={musteriler} />}
      {sub === 'teklif' && <MedikalTeklif urunler={urunler} musteriler={musteriler} teklifler={teklifler} setTeklifler={setTeklifler} />}
    </div>
  );
}

function MedikalUrunler({ urunler, setUrunler }) {
  const [form, setForm] = useState({ name: '', alis_fiyati: '', kritik_stok: '5', currency: 'TRY' });
  const add = async () => {
    if (!form.name) return;
    const row = { name: form.name, alis_fiyati: Number(form.alis_fiyati) || 0, kritik_stok: Number(form.kritik_stok) || 5, stok_miktari: 0, currency: form.currency };
    const saved = await insertMedikalUrun(row);
    if (saved) setUrunler((us) => [...us, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: '', alis_fiyati: '', kritik_stok: '5', currency: 'TRY' });
  };
  const remove = async (id) => {
    if (!window.confirm('Ürün silinsin mi?')) return;
    await deleteMedikalUrun(id);
    setUrunler((us) => us.filter((u) => u.id !== id));
  };
  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>+ Yeni Ürün</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8 }}>
          <Inp ph="Ürün adı" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Inp ph="Alış fiyatı" type="number" val={form.alis_fiyati} set={(v) => setForm((f) => ({ ...f, alis_fiyati: v }))} />
          <Sel val={form.currency} set={(v) => setForm((f) => ({ ...f, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }]} />
          <Inp ph="Kritik stok" type="number" val={form.kritik_stok} set={(v) => setForm((f) => ({ ...f, kritik_stok: v }))} />
          <Btn onClick={add}>Ekle</Btn>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '1px solid #E3D9C7' }}>
            {['Ürün', 'Stok', 'Kritik Stok', 'Alış Fiyatı', ''].map((h) => <th key={h} style={{ color: '#7A7062', padding: '8px 10px', textAlign: 'left' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {urunler.map((u) => {
              const low = Number(u.stok_miktari) <= Number(u.kritik_stok);
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #E3D9C7' }}>
                  <td style={{ color: '#33302A', fontWeight: 700, padding: '10px' }}>{u.name}</td>
                  <td style={{ color: low ? '#C1554A' : '#6B8F5E', fontWeight: 800, padding: '10px' }}>{u.stok_miktari} {low && '⚠️'}</td>
                  <td style={{ color: '#7A7062', padding: '10px' }}>{u.kritik_stok}</td>
                  <td style={{ color: '#7A7062', padding: '10px' }}>{u.currency === 'USD' ? '$' : '₺'}{Number(u.alis_fiyati).toLocaleString()}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => remove(u.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {urunler.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Henüz ürün yok.</div>}
      </div>
    </div>
  );
}

function MedikalMusteriler({ musteriler, setMusteriler, satislar }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [selCustomer, setSelCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const add = async () => {
    if (!form.name) return;
    const saved = await insertMedikalMusteri(form);
    if (saved) setMusteriler((ms) => [...ms, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: '', phone: '', notes: '' });
  };
  const remove = async (id) => {
    if (!window.confirm('Müşteri silinsin mi?')) return;
    await deleteMedikalMusteri(id);
    setMusteriler((ms) => ms.filter((m) => m.id !== id));
  };
  const getHistory = (name) => (satislar || []).filter((s) => s.customer_name === name).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
  const filtered = musteriler.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.phone || '').includes(search));
  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>+ Yeni Müşteri</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
          <Inp ph="İsim" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Inp ph="Telefon" val={form.phone} set={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Inp ph="Not" val={form.notes} set={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <Btn onClick={add}>Ekle</Btn>
        </div>
      </div>
      <Inp ph="🔍 Müşteri ara (isim veya telefon)..." val={search} set={setSearch} style={{ marginBottom: 12 }} />
      {filtered.map((m) => {
        const hist = getHistory(m.name);
        const totalSpentTRY = hist.filter((x) => (x.currency || 'TRY') === 'TRY').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
        const totalSpentUSD = hist.filter((x) => x.currency === 'USD').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
        const unpaidCount = hist.filter((x) => x.payment_type === 'Açık Hesap' && !x.paid).length;
        return (
          <div key={m.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }} onClick={() => setSelCustomer(m)}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{m.name} {unpaidCount > 0 && <span style={{ color: '#B8952E', fontSize: 10 }}>📒 {unpaidCount} açık hesap</span>}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{m.phone} {m.notes && `· ${m.notes}`} · {hist.length} işlem</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {totalSpentTRY > 0 && <div style={{ color: '#6B8F5E', fontWeight: 800, fontSize: 12 }}>₺{totalSpentTRY.toLocaleString()}</div>}
              {totalSpentUSD > 0 && <div style={{ color: '#6B8F5E', fontWeight: 800, fontSize: 12 }}>${totalSpentUSD.toLocaleString()}</div>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); remove(m.id); }} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>{search ? 'Eşleşen müşteri yok.' : 'Henüz müşteri yok.'}</div>}

      {selCustomer && (
        <Modal title={`${selCustomer.name} - Geçmiş`} onClose={() => setSelCustomer(null)} wide>
          {(() => {
            const hist = getHistory(selCustomer.name);
            const totalSpentTRY = hist.filter((x) => (x.currency || 'TRY') === 'TRY').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
            const totalSpentUSD = hist.filter((x) => x.currency === 'USD').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
            const totalUnpaidTRY = hist.filter((x) => x.payment_type === 'Açık Hesap' && !x.paid && (x.currency || 'TRY') === 'TRY').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
            const totalUnpaidUSD = hist.filter((x) => x.payment_type === 'Açık Hesap' && !x.paid && x.currency === 'USD').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
            return (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140, background: '#F1EBDE', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: '#7A7062', fontSize: 10 }}>TOPLAM HARCAMA (TL)</div>
                    <div style={{ color: '#6B8F5E', fontWeight: 900, fontSize: 18 }}>₺{totalSpentTRY.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, background: '#F1EBDE', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: '#7A7062', fontSize: 10 }}>TOPLAM HARCAMA ($)</div>
                    <div style={{ color: '#6B8F5E', fontWeight: 900, fontSize: 18 }}>${totalSpentUSD.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, background: '#F1EBDE', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: '#7A7062', fontSize: 10 }}>BEKLEYEN AÇIK HESAP</div>
                    <div style={{ color: '#B8952E', fontWeight: 900, fontSize: 16 }}>₺{totalUnpaidTRY.toLocaleString()} + ${totalUnpaidUSD.toLocaleString()}</div>
                  </div>
                </div>
                {hist.map((s) => (
                  <div key={s.id} style={{ background: '#F1EBDE', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#33302A', fontSize: 12, fontWeight: 700 }}>{s.product_name} × {s.quantity}</div>
                      <div style={{ color: '#7A7062', fontSize: 10 }}>{fmt(s.sale_date)} · {s.payment_type} {s.payment_type === 'Açık Hesap' && (s.paid ? '✓ Tahsil edildi' : '⏳ Bekliyor')}</div>
                    </div>
                    <div style={{ color: '#33302A', fontWeight: 700 }}>{s.currency === 'USD' ? '$' : '₺'}{(Number(s.sale_price) * Number(s.quantity)).toLocaleString()}</div>
                  </div>
                ))}
                {hist.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Bu müşterinin satış geçmişi yok.</div>}
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

function MedikalTedarikciler({ tedarikciler, setTedarikciler, alimlar, setAlimlar }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [selTedarikci, setSelTedarikci] = useState(null);
  const [search, setSearch] = useState('');
  const add = async () => {
    if (!form.name) return;
    const saved = await insertMedikalTedarikci(form);
    if (saved) setTedarikciler((ts) => [...ts, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: '', phone: '', notes: '' });
  };
  const remove = async (id) => {
    if (!window.confirm('Tedarikçi silinsin mi?')) return;
    await deleteMedikalTedarikci(id);
    setTedarikciler((ts) => ts.filter((t) => t.id !== id));
  };
  const getHistory = (name) => (alimlar || []).filter((a) => a.tedarikci_name === name).sort((a, b) => new Date(b.alim_tarihi) - new Date(a.alim_tarihi));
  const markPaid = async (alim) => {
    if (!window.confirm(`"${alim.product_name}" ödemesi yapıldı mı?`)) return;
    const updated = await updateMedikalAlim(alim.id, { paid: true, paid_date: dd(0) });
    if (updated) setAlimlar((as) => as.map((a) => (a.id === alim.id ? updated : a)));
  };
  const filtered = tedarikciler.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.phone || '').includes(search));
  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>+ Yeni Tedarikçi</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
          <Inp ph="Firma adı" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Inp ph="Telefon" val={form.phone} set={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Inp ph="Not" val={form.notes} set={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <Btn onClick={add}>Ekle</Btn>
        </div>
      </div>
      <Inp ph="🔍 Tedarikçi ara..." val={search} set={setSearch} style={{ marginBottom: 12 }} />
      {filtered.map((t) => {
        const hist = getHistory(t.name);
        const totalBought = hist.reduce((s, x) => s + Number(x.quantity) * Number(x.alis_fiyati), 0);
        const unpaidCount = hist.filter((x) => !x.paid).length;
        return (
          <div key={t.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }} onClick={() => setSelTedarikci(t)}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{t.name} {unpaidCount > 0 && <span style={{ color: '#C1554A', fontSize: 10 }}>💳 {unpaidCount} borç</span>}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{t.phone} {t.notes && `· ${t.notes}`} · {hist.length} alım</div>
            </div>
            <div style={{ color: '#C68A3D', fontWeight: 800, fontSize: 12 }}>₺{totalBought.toLocaleString()}</div>
            <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>{search ? 'Eşleşen tedarikçi yok.' : 'Henüz tedarikçi yok.'}</div>}

      {selTedarikci && (
        <Modal title={`${selTedarikci.name} - Geçmiş`} onClose={() => setSelTedarikci(null)} wide>
          {(() => {
            const hist = getHistory(selTedarikci.name);
            const totalBought = hist.reduce((s, x) => s + Number(x.quantity) * Number(x.alis_fiyati), 0);
            const totalDebt = hist.filter((x) => !x.paid).reduce((s, x) => s + Number(x.quantity) * Number(x.alis_fiyati), 0);
            return (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: '#F1EBDE', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: '#7A7062', fontSize: 10 }}>TOPLAM ALINAN</div>
                    <div style={{ color: '#C68A3D', fontWeight: 900, fontSize: 18 }}>₺{totalBought.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1, background: '#F1EBDE', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: '#7A7062', fontSize: 10 }}>ÖDENMEMİŞ BORÇ</div>
                    <div style={{ color: '#C1554A', fontWeight: 900, fontSize: 18 }}>₺{totalDebt.toLocaleString()}</div>
                  </div>
                </div>
                {hist.map((a) => (
                  <div key={a.id} style={{ background: '#F1EBDE', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#33302A', fontSize: 12, fontWeight: 700 }}>{a.product_name} × {a.quantity}</div>
                      <div style={{ color: '#7A7062', fontSize: 10 }}>{fmt(a.alim_tarihi)} · {a.paid ? '✓ Ödendi' : '⏳ Ödenmedi'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#33302A', fontWeight: 700 }}>{a.currency === 'USD' ? '$' : '₺'}{(Number(a.quantity) * Number(a.alis_fiyati)).toLocaleString()}</div>
                      {!a.paid && <button onClick={() => markPaid(a)} style={{ padding: '5px 10px', background: '#6B8F5E', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Öde</button>}
                    </div>
                  </div>
                ))}
                {hist.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Bu tedarikçiden alım yok.</div>}
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

function MedikalAlim({ urunler, setUrunler, tedarikciler, alimlar, setAlimlar }) {
  const [form, setForm] = useState({ tedarikci_name: '', product_name: '', quantity: '', alis_fiyati: '', currency: 'TRY', alim_tarihi: dd(0) });
  const [editingAlim, setEditingAlim] = useState(null);

  const save = async () => {
    if (!form.product_name || !form.quantity) return;
    const qty = Number(form.quantity) || 0;
    const price = Number(form.alis_fiyati) || 0;

    if (editingAlim) {
      const oldProd = urunler.find((u) => u.name.toLowerCase() === editingAlim.product_name.toLowerCase());
      const updated = await updateMedikalAlim(editingAlim.id, { tedarikci_name: form.tedarikci_name, product_name: form.product_name, quantity: qty, alis_fiyati: price, currency: form.currency, alim_tarihi: form.alim_tarihi });
      if (updated) setAlimlar((as) => as.map((a) => (a.id === editingAlim.id ? updated : a)));
      if (oldProd) {
        const reverted = await updateMedikalUrun(oldProd.id, { stok_miktari: Number(oldProd.stok_miktari) - Number(editingAlim.quantity) });
        if (reverted) setUrunler((us) => us.map((u) => (u.id === oldProd.id ? reverted : u)));
      }
      const newProd = urunler.find((u) => u.name.toLowerCase() === form.product_name.toLowerCase());
      const base = newProd && oldProd && newProd.id === oldProd.id ? { ...newProd, stok_miktari: Number(oldProd.stok_miktari) - Number(editingAlim.quantity) } : newProd;
      if (base) {
        const applied = await updateMedikalUrun(base.id, { stok_miktari: Number(base.stok_miktari) + qty, alis_fiyati: price, currency: form.currency });
        if (applied) setUrunler((us) => us.map((u) => (u.id === base.id ? applied : u)));
      }
      setEditingAlim(null);
      setForm({ tedarikci_name: '', product_name: '', quantity: '', alis_fiyati: '', currency: 'TRY', alim_tarihi: dd(0) });
      return;
    }

    const row = { tedarikci_name: form.tedarikci_name, product_name: form.product_name, quantity: qty, alis_fiyati: price, currency: form.currency, alim_tarihi: form.alim_tarihi };
    const saved = await insertMedikalAlim(row);
    if (saved) setAlimlar((as) => [saved, ...as]);

    let existing = urunler.find((u) => u.name.toLowerCase() === form.product_name.toLowerCase());
    if (existing) {
      const updated = await updateMedikalUrun(existing.id, { stok_miktari: Number(existing.stok_miktari) + qty, alis_fiyati: price, currency: form.currency });
      if (updated) setUrunler((us) => us.map((u) => (u.id === existing.id ? updated : u)));
    } else {
      const newProd = await insertMedikalUrun({ name: form.product_name, alis_fiyati: price, stok_miktari: qty, kritik_stok: 5, currency: form.currency });
      if (newProd) setUrunler((us) => [...us, newProd].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setForm({ tedarikci_name: '', product_name: '', quantity: '', alis_fiyati: '', currency: 'TRY', alim_tarihi: dd(0) });
  };

  const startEdit = (a) => {
    setEditingAlim(a);
    setForm({ tedarikci_name: a.tedarikci_name || '', product_name: a.product_name, quantity: a.quantity, alis_fiyati: a.alis_fiyati, currency: a.currency || 'TRY', alim_tarihi: a.alim_tarihi });
  };

  const remove = async (id) => {
    if (!window.confirm('Kayıt silinsin mi? (Stok otomatik geri alınmaz)')) return;
    await deleteMedikalAlim(id);
    setAlimlar((as) => as.filter((a) => a.id !== id));
  };
  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{editingAlim ? '✏️ Alımı Düzenle' : '📥 Stok Girişi (Alım)'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>TEDARİKÇİ</div>
            <input list="tedarikci-list" value={form.tedarikci_name} onChange={(e) => setForm((f) => ({ ...f, tedarikci_name: e.target.value }))} placeholder="Tedarikçi adı" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
            <datalist id="tedarikci-list">{tedarikciler.map((t) => <option key={t.id} value={t.name} />)}</datalist>
          </div>
          <div>
            <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>ÜRÜN</div>
            <input list="urun-list" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} placeholder="Ürün adı (yoksa otomatik oluşur)" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
            <datalist id="urun-list">{urunler.map((u) => <option key={u.id} value={u.name} />)}</datalist>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8 }}>
          <Inp ph="Adet" type="number" val={form.quantity} set={(v) => setForm((f) => ({ ...f, quantity: v }))} />
          <Inp ph="Alış fiyatı (birim)" type="number" val={form.alis_fiyati} set={(v) => setForm((f) => ({ ...f, alis_fiyati: v }))} />
          <Sel val={form.currency} set={(v) => setForm((f) => ({ ...f, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }]} />
          <Inp type="date" ph="" val={form.alim_tarihi} set={(v) => setForm((f) => ({ ...f, alim_tarihi: v }))} />
          <Btn onClick={save}>{editingAlim ? 'Güncelle' : 'Kaydet'}</Btn>
        </div>
        {editingAlim && <div style={{ marginTop: 8 }}><Btn v="s" sm onClick={() => { setEditingAlim(null); setForm({ tedarikci_name: '', product_name: '', quantity: '', alis_fiyati: '', currency: 'TRY', alim_tarihi: dd(0) }); }}>İptal</Btn></div>}
      </div>
      <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Son Alımlar</div>
      {alimlar.slice(0, 30).map((a) => (
        <div key={a.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{a.product_name} × {a.quantity}</div>
            <div style={{ color: '#7A7062', fontSize: 11 }}>{a.tedarikci_name || 'Tedarikçi belirtilmedi'} · {fmt(a.alim_tarihi)} · Birim: {a.currency === 'USD' ? '$' : '₺'}{Number(a.alis_fiyati).toLocaleString()}</div>
          </div>
          <div style={{ color: '#C68A3D', fontWeight: 800 }}>{a.currency === 'USD' ? '$' : '₺'}{(Number(a.quantity) * Number(a.alis_fiyati)).toLocaleString()}</div>
          <button onClick={() => startEdit(a)} style={{ padding: '4px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>✏️</button>
          <button onClick={() => remove(a.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
        </div>
      ))}
      {alimlar.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Henüz alım yok.</div>}
    </div>
  );
}

function MedikalSatisGirisi({ urunler, setUrunler, musteriler, satislar, setSatislar }) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState(null);
  const [editingSale, setEditingSale] = useState(null);

  const analyze = () => {
    if (!rawText.trim()) return;
    const parsed = parseSaleText(rawText, urunler, musteriler);
    setPreview({
      customer_name: parsed.customerGuess, product_name: parsed.productGuess,
      quantity: parsed.quantity || 1, sale_price: parsed.price || '', currency: parsed.currency || 'TRY',
      payment_type: 'Nakit', sale_date: dd(0), due_date: dd(7), raw_text: rawText,
    });
  };

  const startManual = () => {
    setPreview({ customer_name: '', product_name: '', quantity: 1, sale_price: '', currency: 'TRY', payment_type: 'Nakit', sale_date: dd(0), due_date: dd(7) });
  };

  const confirmSave = async () => {
    if (!preview.customer_name || !preview.product_name || !preview.sale_price) { alert('Müşteri, ürün ve fiyat gerekli'); return; }
    const matched = urunler.find((u) => u.name.toLowerCase() === preview.product_name.toLowerCase());
    const costPrice = matched ? Number(matched.alis_fiyati) : 0;
    const costCurrency = matched ? (matched.currency || 'TRY') : 'TRY';
    const qty = Number(preview.quantity) || 1;
    const isPaid = preview.payment_type !== 'Açık Hesap';

    if (editingSale) {
      const oldMatched = urunler.find((u) => u.name.toLowerCase() === editingSale.product_name.toLowerCase());
      const row = {
        customer_name: preview.customer_name, product_name: preview.product_name, quantity: qty,
        sale_price: Number(preview.sale_price), cost_price: costPrice, currency: preview.currency,
        cost_currency: costCurrency, payment_type: preview.payment_type, sale_date: preview.sale_date,
        due_date: preview.payment_type === 'Açık Hesap' ? preview.due_date : null, paid: isPaid,
      };
      const updated = await updateMedikalSatis(editingSale.id, row);
      if (updated) setSatislar((ss) => ss.map((s) => (s.id === editingSale.id ? updated : s)));
      // stok düzelt: eski ürüne geri ekle, yeni ürünten düş
      if (oldMatched) {
        const restored = await updateMedikalUrun(oldMatched.id, { stok_miktari: Number(oldMatched.stok_miktari) + Number(editingSale.quantity) });
        if (restored) setUrunler((us) => us.map((u) => (u.id === oldMatched.id ? restored : u)));
      }
      const freshMatched = matched && oldMatched && matched.id === oldMatched.id ? { ...matched, stok_miktari: Number(oldMatched.stok_miktari) + Number(editingSale.quantity) } : matched;
      if (freshMatched) {
        const decremented = await updateMedikalUrun(freshMatched.id, { stok_miktari: Number(freshMatched.stok_miktari) - qty });
        if (decremented) setUrunler((us) => us.map((u) => (u.id === freshMatched.id ? decremented : u)));
      }
      setEditingSale(null);
      setPreview(null);
      setRawText('');
      return;
    }

    const row = {
      customer_name: preview.customer_name, product_name: preview.product_name, quantity: qty,
      sale_price: Number(preview.sale_price), cost_price: costPrice, currency: preview.currency,
      cost_currency: costCurrency, payment_type: preview.payment_type, sale_date: preview.sale_date,
      due_date: preview.payment_type === 'Açık Hesap' ? preview.due_date : null,
      raw_text: preview.raw_text, paid: isPaid,
    };
    const saved = await insertMedikalSatis(row);
    if (saved) setSatislar((ss) => [saved, ...ss]);
    if (matched) {
      const updated = await updateMedikalUrun(matched.id, { stok_miktari: Number(matched.stok_miktari) - qty });
      if (updated) setUrunler((us) => us.map((u) => (u.id === matched.id ? updated : u)));
    }
    setPreview(null);
    setRawText('');
  };

  const startEdit = (s) => {
    setEditingSale(s);
    setPreview({
      customer_name: s.customer_name, product_name: s.product_name, quantity: s.quantity,
      sale_price: s.sale_price, currency: s.currency, payment_type: s.payment_type, sale_date: s.sale_date,
      due_date: s.due_date || dd(7),
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Satış silinsin mi? (Stok otomatik geri alınmaz)')) return;
    await deleteMedikalSatis(id);
    setSatislar((ss) => ss.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>🛒 Hızlı Satış Girişi</div>
        <Inp ph="Örn: Ahmet'e 5 tane Minoxidil 100 dolardan verdim" val={rawText} set={setRawText} rows={2} />
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <Btn onClick={analyze}>🔍 Analiz Et</Btn>
          <Btn v="s" onClick={startManual}>✍️ Manuel Gir</Btn>
        </div>
      </div>

      {preview && (
        <div style={{ background: '#FFFFFF', border: '1px solid #7E9A8944', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ color: '#7E9A89', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{editingSale ? '✏️ Satışı Düzenle' : '✓ Önizleme — Kontrol Edip Onaylayın'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>MÜŞTERİ</div>
              <input list="sale-cust-list" value={preview.customer_name} onChange={(e) => setPreview((p) => ({ ...p, customer_name: e.target.value }))} placeholder="🔍 Müşteri ara veya yaz" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
              <datalist id="sale-cust-list">{musteriler.map((m) => <option key={m.id} value={m.name} />)}</datalist>
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>ÜRÜN</div>
              <input list="sale-prod-list" value={preview.product_name} onChange={(e) => setPreview((p) => ({ ...p, product_name: e.target.value }))} placeholder="🔍 Ürün ara veya yaz" style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
              <datalist id="sale-prod-list">{urunler.map((u) => <option key={u.id} value={u.name} />)}</datalist>
            </div>
          </div>
          {(() => {
            const matched = urunler.find((u) => u.name.toLowerCase() === preview.product_name.toLowerCase());
            if (!matched) return null;
            const margin = preview.sale_price ? (Number(preview.sale_price) - Number(matched.alis_fiyati)) : null;
            return (
              <div style={{ background: '#F1EBDE', borderRadius: 8, padding: '8px 12px', marginBottom: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ color: '#C68A3D', fontSize: 12, fontWeight: 700 }}>💰 Alış Fiyatı: {matched.currency === 'USD' ? '$' : '₺'}{Number(matched.alis_fiyati).toLocaleString()}</span>
                <span style={{ color: '#7A7062', fontSize: 12 }}>Stok: {matched.stok_miktari}</span>
                {margin !== null && <span style={{ color: margin >= 0 ? '#6B8F5E' : '#C1554A', fontSize: 12, fontWeight: 700 }}>Birim Kâr: {matched.currency === 'USD' ? '$' : '₺'}{margin.toLocaleString()}</span>}
              </div>
            );
          })()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>ADET</div>
              <Inp type="number" ph="" val={preview.quantity} set={(v) => setPreview((p) => ({ ...p, quantity: v }))} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>BİRİM FİYAT</div>
              <Inp type="number" ph="" val={preview.sale_price} set={(v) => setPreview((p) => ({ ...p, sale_price: v }))} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>PARA BİRİMİ</div>
              <Sel val={preview.currency} set={(v) => setPreview((p) => ({ ...p, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }]} />
            </div>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>ÖDEME TİPİ</div>
              <Sel val={preview.payment_type} set={(v) => setPreview((p) => ({ ...p, payment_type: v }))} opts={[{ v: 'Nakit', l: '💵 Nakit' }, { v: 'Havale', l: '🏦 Havale' }, { v: 'Açık Hesap', l: '📒 Açık Hesap' }]} />
            </div>
          </div>
          {preview.payment_type === 'Açık Hesap' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#B8952E', fontSize: 10, marginBottom: 4 }}>ÖDEME GÜNÜ (vade tarihi)</div>
              <Inp type="date" ph="" val={preview.due_date} set={(v) => setPreview((p) => ({ ...p, due_date: v }))} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn v="s" onClick={() => { setPreview(null); setEditingSale(null); }}>İptal</Btn>
            <Btn onClick={confirmSave}>{editingSale ? '✓ Güncelle' : '✓ Onayla ve Kaydet'}</Btn>
          </div>
        </div>
      )}

      <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Son Satışlar</div>
      {satislar.slice(0, 30).map((s) => {
        const kar = (Number(s.sale_price) - Number(s.cost_price)) * Number(s.quantity);
        return (
          <div key={s.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{s.customer_name} — {s.product_name} × {s.quantity}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{fmt(s.sale_date)} · {s.payment_type} {s.payment_type === 'Açık Hesap' && (s.paid ? '✓' : '⏳')} · Birim: {s.currency === 'USD' ? '$' : '₺'}{Number(s.sale_price).toLocaleString()}</div>
            </div>
            <div style={{ color: '#6B8F5E', fontWeight: 800 }}>Kâr: {s.currency === 'USD' ? '$' : '₺'}{kar.toLocaleString()}</div>
            <button onClick={() => startEdit(s)} style={{ padding: '4px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>✏️</button>
            <button onClick={() => remove(s.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
          </div>
        );
      })}
      {satislar.length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Henüz satış yok.</div>}
    </div>
  );
}

function MedikalAcikHesap({ satislar, setSatislar }) {
  const unpaid = satislar.filter((s) => s.payment_type === 'Açık Hesap' && !s.paid);
  const paid = satislar.filter((s) => s.payment_type === 'Açık Hesap' && s.paid);

  const today = dd(0);
  const tomorrow = dd(1);
  const isUrgent = (dateStr) => dateStr && dateStr <= tomorrow;
  const isOverdue = (dateStr) => dateStr && dateStr < today;

  const byCustomer = {};
  unpaid.forEach((s) => {
    if (!byCustomer[s.customer_name]) byCustomer[s.customer_name] = { total: 0, items: [] };
    byCustomer[s.customer_name].total += Number(s.sale_price) * Number(s.quantity);
    byCustomer[s.customer_name].items.push(s);
  });

  const markPaid = async (sale) => {
    if (!window.confirm(`"${sale.product_name}" için ${sale.customer_name} tahsil edildi mi?`)) return;
    const updated = await updateMedikalSatis(sale.id, { paid: true, paid_date: dd(0) });
    if (updated) setSatislar((ss) => ss.map((s) => (s.id === sale.id ? updated : s)));
  };

  const totalUnpaid = unpaid.reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
  const urgentCount = unpaid.filter((s) => isUrgent(s.due_date)).length;

  return (
    <div>
      <div style={{ color: '#B8952E', fontWeight: 900, fontSize: 18, marginBottom: 10 }}>📒 Toplam Bekleyen Açık Hesap: ₺{totalUnpaid.toLocaleString()}</div>
      {urgentCount > 0 && (
        <div style={{ background: 'rgba(193,85,74,0.12)', border: '1px solid #C1554A', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#C1554A', fontWeight: 700, fontSize: 13 }}>
          ⚠️ {urgentCount} ödemenin vadesi bugün/yarın veya geçmiş!
        </div>
      )}
      {Object.entries(byCustomer).length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Bekleyen açık hesap yok.</div>}
      {Object.entries(byCustomer).map(([customer, data]) => (
        <div key={customer} style={{ background: '#FFFFFF', border: '1px solid #B8952E44', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ color: '#33302A', fontWeight: 800, fontSize: 14 }}>{customer}</div>
            <div style={{ color: '#B8952E', fontWeight: 900, fontSize: 14 }}>₺{data.total.toLocaleString()}</div>
          </div>
          {data.items.map((s) => {
            const urgent = isUrgent(s.due_date);
            const overdue = isOverdue(s.due_date);
            return (
              <div key={s.id} style={{ background: '#F1EBDE', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, border: urgent ? '1px solid #C1554A' : 'none' }}>
                <div>
                  <div style={{ color: '#33302A', fontSize: 12 }}>{s.product_name} × {s.quantity}</div>
                  <div style={{ color: '#7A7062', fontSize: 10 }}>{fmt(s.sale_date)} {s.due_date && `· Vade: ${fmt(s.due_date)}`} {overdue && <span style={{ color: '#C1554A', fontWeight: 700 }}>⚠️ GECİKTİ</span>} {!overdue && urgent && <span style={{ color: '#C68A3D', fontWeight: 700 }}>⏰ YAKLAŞIYOR</span>}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: '#33302A', fontWeight: 700 }}>₺{(Number(s.sale_price) * Number(s.quantity)).toLocaleString()}</div>
                  <button onClick={() => markPaid(s)} style={{ padding: '5px 10px', background: '#6B8F5E', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Tahsil</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {paid.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ color: '#6B8F5E', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✅ Tahsil Edilenler ({paid.length})</summary>
          {paid.map((s) => (
            <div key={s.id} style={{ background: '#F1EBDE', borderLeft: '3px solid #6B8F5E', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <div style={{ color: '#33302A', fontSize: 12 }}>{s.customer_name} — {s.product_name} × {s.quantity}</div>
              <div style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 12 }}>₺{(Number(s.sale_price) * Number(s.quantity)).toLocaleString()} · {fmt(s.paid_date)}</div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function MedikalGiderler({ giderler, setGiderler }) {
  const [form, setForm] = useState({ description: '', amount: '', category: 'Diğer', date: dd(0) });
  const add = async () => {
    if (!form.description || !form.amount) return;
    const row = { ...form, amount: Number(form.amount), currency: 'TRY' };
    const saved = await insertMedikalGider(row);
    if (saved) setGiderler((gs) => [saved, ...gs]);
    setForm({ description: '', amount: '', category: 'Diğer', date: dd(0) });
  };
  const remove = async (id) => {
    if (!window.confirm('Silinsin mi?')) return;
    await deleteMedikalGider(id);
    setGiderler((gs) => gs.filter((g) => g.id !== id));
  };
  const total = giderler.reduce((s, g) => s + Number(g.amount || 0), 0);
  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>💸 Gider Ekle</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8 }}>
          <Inp ph="Açıklama" val={form.description} set={(v) => setForm((f) => ({ ...f, description: v }))} />
          <Inp ph="Tutar" type="number" val={form.amount} set={(v) => setForm((f) => ({ ...f, amount: v }))} />
          <Sel val={form.category} set={(v) => setForm((f) => ({ ...f, category: v }))} opts={['Kira', 'Nakliye', 'Personel', 'Diğer']} />
          <Inp type="date" ph="" val={form.date} set={(v) => setForm((f) => ({ ...f, date: v }))} />
          <Btn onClick={add}>Ekle</Btn>
        </div>
      </div>
      <div style={{ color: '#C1554A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Toplam Gider: ₺{total.toLocaleString()}</div>
      {giderler.map((g) => (
        <div key={g.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#33302A', fontSize: 13 }}>{g.description}</div>
            <div style={{ color: '#7A7062', fontSize: 11 }}>{g.category} · {fmt(g.date)}</div>
          </div>
          <div style={{ color: '#C1554A', fontWeight: 800 }}>-₺{Number(g.amount).toLocaleString()}</div>
          <button onClick={() => remove(g.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
        </div>
      ))}
    </div>
  );
}

function MedikalRaporlar({ urunler, satislar, alimlar, giderler, musteriler }) {
  const [range, setRange] = useState('ay');
  const [customFrom, setCustomFrom] = useState(dd(-30));
  const [customTo, setCustomTo] = useState(dd(0));

  const getBounds = () => {
    const today = new Date();
    if (range === 'bugun') return [dd(0), dd(0)];
    if (range === 'hafta') return [dd(-7), dd(0)];
    if (range === 'ay') return [dd(-30), dd(0)];
    if (range === 'ozel') return [customFrom, customTo];
    return [null, null];
  };
  const [from, to] = getBounds();
  const inRange = (dateStr) => {
    if (!from) return true;
    return dateStr >= from && dateStr <= to;
  };

  const filteredSales = satislar.filter((s) => inRange(s.sale_date));
  const filteredExpenses = giderler.filter((g) => inRange(g.date));

  const calcFor = (cur) => {
    const sales = filteredSales.filter((s) => (s.currency || 'TRY') === cur);
    const revenue = sales.reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
    const cogs = sales.reduce((s, x) => s + (((x.cost_currency || 'TRY') === cur) ? Number(x.cost_price) * Number(x.quantity) : 0), 0);
    const acikHesap = sales.filter((s) => s.payment_type === 'Açık Hesap').reduce((s, x) => s + Number(x.sale_price) * Number(x.quantity), 0);
    return { revenue, cogs, acikHesap };
  };
  const tryStats = calcFor('TRY');
  const usdStats = calcFor('USD');
  const totalExpenses = filteredExpenses.reduce((s, x) => s + Number(x.amount), 0);
  const netProfitTRY = tryStats.revenue - tryStats.cogs - totalExpenses;
  const netProfitUSD = usdStats.revenue - usdStats.cogs;

  const productStats = {};
  filteredSales.forEach((s) => {
    const key = `${s.product_name}__${s.currency || 'TRY'}`;
    if (!productStats[key]) productStats[key] = { name: s.product_name, currency: s.currency || 'TRY', qty: 0, revenue: 0, cost: 0 };
    productStats[key].qty += Number(s.quantity);
    productStats[key].revenue += Number(s.sale_price) * Number(s.quantity);
    productStats[key].cost += Number(s.cost_price) * Number(s.quantity);
  });

  const customerStats = {};
  filteredSales.forEach((s) => {
    if (!customerStats[s.customer_name]) customerStats[s.customer_name] = { revenue: 0, count: 0 };
    customerStats[s.customer_name].revenue += Number(s.sale_price) * Number(s.quantity);
    customerStats[s.customer_name].count += 1;
  });
  const topProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topCustomers = Object.entries(customerStats).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

  const exportCSV = () => {
    const header = ['Tarih', 'Müşteri', 'Ürün', 'Adet', 'Birim Fiyat', 'Para Birimi', 'Ödeme Tipi', 'Toplam'];
    const rows = filteredSales.map((s) => [s.sale_date, s.customer_name, s.product_name, s.quantity, s.sale_price, s.currency, s.payment_type, (Number(s.sale_price) * Number(s.quantity)).toFixed(2)]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medikal_satislar_${dd(0)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {[{ v: 'bugun', l: 'Bugün' }, { v: 'hafta', l: 'Bu Hafta' }, { v: 'ay', l: 'Bu Ay' }, { v: 'tum', l: 'Tüm Zamanlar' }, { v: 'ozel', l: 'Özel Tarih' }].map((r) => (
          <button key={r.v} onClick={() => setRange(r.v)} style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${range === r.v ? '#7E9A89' : '#E3D9C7'}`, background: range === r.v ? 'rgba(126,154,137,0.15)' : '#FFFFFF', color: range === r.v ? '#7E9A89' : '#A79B88', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{r.l}</button>
        ))}
      </div>
      {range === 'ozel' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <Inp type="date" ph="" val={customFrom} set={setCustomFrom} />
          <Inp type="date" ph="" val={customTo} set={setCustomTo} />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 10 }}>
        {[
          { lbl: '₺ Gelir (TL)', val: `₺${tryStats.revenue.toLocaleString()}`, clr: '#6B8F5E' },
          { lbl: '₺ Maliyet (TL)', val: `₺${tryStats.cogs.toLocaleString()}`, clr: '#C68A3D' },
          { lbl: '₺ Giderler', val: `₺${totalExpenses.toLocaleString()}`, clr: '#C1554A' },
          { lbl: '₺ Net Kâr (TL)', val: `₺${netProfitTRY.toLocaleString()}`, clr: netProfitTRY >= 0 ? '#6B8F5E' : '#C1554A' },
          { lbl: '₺ Açık Hesap', val: `₺${tryStats.acikHesap.toLocaleString()}`, clr: '#B8952E' },
        ].map((k) => (
          <div key={k.lbl} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 18, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { lbl: '$ Gelir (USD)', val: `$${usdStats.revenue.toLocaleString()}`, clr: '#6B8F5E' },
          { lbl: '$ Maliyet (USD)', val: `$${usdStats.cogs.toLocaleString()}`, clr: '#C68A3D' },
          { lbl: '$ Net Kâr (USD)', val: `$${netProfitUSD.toLocaleString()}`, clr: netProfitUSD >= 0 ? '#6B8F5E' : '#C1554A' },
          { lbl: '$ Açık Hesap', val: `$${usdStats.acikHesap.toLocaleString()}`, clr: '#B8952E' },
        ].map((k) => (
          <div key={k.lbl} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 18, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ color: '#7A7062', fontSize: 11, marginBottom: 14 }}>💡 TL ve Dolar tutarları karışmasın diye ayrı hesaplanır, otomatik kur çevrimi yapılmaz.</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13 }}>📦 Ürün Bazlı Rapor</div>
        <Btn sm v="s" onClick={exportCSV}>📥 CSV İndir (Excel)</Btn>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '1px solid #E3D9C7' }}>
            {['Ürün', 'Satılan Adet', 'Gelir', 'Maliyet', 'Kâr', 'Güncel Stok'].map((h) => <th key={h} style={{ color: '#7A7062', padding: '8px 10px', textAlign: 'left' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {Object.values(productStats).map((st) => {
              const prod = urunler.find((u) => u.name === st.name);
              const sym = st.currency === 'USD' ? '$' : '₺';
              return (
                <tr key={st.name + st.currency} style={{ borderBottom: '1px solid #E3D9C7' }}>
                  <td style={{ color: '#33302A', fontWeight: 700, padding: '10px' }}>{st.name} <span style={{ color: '#7A7062', fontSize: 10 }}>({st.currency})</span></td>
                  <td style={{ color: '#7A7062', padding: '10px' }}>{st.qty}</td>
                  <td style={{ color: '#6B8F5E', padding: '10px' }}>{sym}{st.revenue.toLocaleString()}</td>
                  <td style={{ color: '#C68A3D', padding: '10px' }}>{sym}{st.cost.toLocaleString()}</td>
                  <td style={{ color: '#6B8F5E', fontWeight: 800, padding: '10px' }}>{sym}{(st.revenue - st.cost).toLocaleString()}</td>
                  <td style={{ color: prod && prod.stok_miktari <= prod.kritik_stok ? '#C1554A' : '#7A7062', padding: '10px' }}>{prod ? prod.stok_miktari : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {Object.keys(productStats).length === 0 && <div style={{ color: '#7A7062', textAlign: 'center', padding: 20 }}>Bu tarih aralığında satış yok.</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>🏆 En Çok Satan Ürünler</div>
          {topProducts.map((p, i) => (
            <div key={p.name + p.currency} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < topProducts.length - 1 ? '1px solid #E3D9C7' : 'none' }}>
              <span style={{ color: '#33302A', fontSize: 12 }}>{i + 1}. {p.name}</span>
              <span style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 12 }}>{p.qty} adet</span>
            </div>
          ))}
          {topProducts.length === 0 && <div style={{ color: '#7A7062', fontSize: 12 }}>Veri yok.</div>}
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>👑 En Çok Alışveriş Yapan Müşteriler</div>
          {topCustomers.map(([name, st], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < topCustomers.length - 1 ? '1px solid #E3D9C7' : 'none' }}>
              <span style={{ color: '#33302A', fontSize: 12 }}>{i + 1}. {name}</span>
              <span style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 12 }}>₺{st.revenue.toLocaleString()}</span>
            </div>
          ))}
          {topCustomers.length === 0 && <div style={{ color: '#7A7062', fontSize: 12 }}>Veri yok.</div>}
        </div>
      </div>
    </div>
  );
}

function MedikalTeklif({ urunler, musteriler, teklifler, setTeklifler }) {
  const [customerName, setCustomerName] = useState('');
  const [validUntil, setValidUntil] = useState(dd(15));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: '' }]);

  const addItem = () => setItems((it) => [...it, { product_name: '', quantity: 1, unit_price: '' }]);
  const removeItem = (idx) => setItems((it) => it.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => setItems((it) => it.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));

  const total = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const generatePDF = (teklifData) => {
    const doc = new jsPDF();
    doc.setFillColor(42, 157, 178);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('HAIR MEDICAL GROUP', 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('FİYAT TEKLİFİ', 14, 40);
    doc.setFontSize(10);
    doc.text(`Müşteri: ${teklifData.customer_name || '-'}`, 14, 50);
    doc.text(`Tarih: ${fmt(new Date().toISOString().split('T')[0])}`, 14, 57);
    doc.text(`Geçerlilik: ${fmt(teklifData.valid_until)}`, 14, 64);

    let y = 78;
    doc.setFillColor(230, 230, 230);
    doc.rect(14, y - 6, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Ürün', 16, y);
    doc.text('Adet', 110, y);
    doc.text('Birim Fiyat', 135, y);
    doc.text('Toplam', 170, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    teklifData.items.forEach((it) => {
      const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
      doc.text(String(it.product_name || '-'), 16, y);
      doc.text(String(it.quantity), 110, y);
      doc.text(`₺${Number(it.unit_price).toLocaleString()}`, 135, y);
      doc.text(`₺${lineTotal.toLocaleString()}`, 170, y);
      y += 8;
    });
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`TOPLAM: ₺${teklifData.total_amount.toLocaleString()}`, 130, y);
    if (teklifData.notes) {
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Notlar:', 14, y);
      y += 7;
      doc.text(String(teklifData.notes), 14, y, { maxWidth: 180 });
    }
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Hair Medical Group', 14, 285);
    doc.save(`Teklif_${(teklifData.customer_name || 'musteri').replace(/\s+/g, '_')}.pdf`);
  };

  const saveAndDownload = async () => {
    if (!customerName || items.some((it) => !it.product_name || !it.unit_price)) { alert('Müşteri adı ve tüm ürün satırları doldurulmalı'); return; }
    const teklifData = { customer_name: customerName, items, total_amount: total, currency: 'TRY', valid_until: validUntil, notes };
    const saved = await insertMedikalTeklif(teklifData);
    if (saved) setTeklifler((ts) => [saved, ...ts]);
    generatePDF(teklifData);
    setCustomerName(''); setNotes(''); setItems([{ product_name: '', quantity: 1, unit_price: '' }]);
  };

  const remove = async (id) => {
    if (!window.confirm('Teklif silinsin mi?')) return;
    await deleteMedikalTeklif(id);
    setTeklifler((ts) => ts.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>📄 Yeni Fiyat Teklifi</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>MÜŞTERİ</div>
            <input list="teklif-cust-list" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }} />
            <datalist id="teklif-cust-list">{musteriler.map((m) => <option key={m.id} value={m.name} />)}</datalist>
          </div>
          <div>
            <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>GEÇERLİLİK TARİHİ</div>
            <Inp type="date" ph="" val={validUntil} set={setValidUntil} />
          </div>
        </div>
        {items.map((it, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 6 }}>
            <input list="teklif-urun-list" value={it.product_name} onChange={(e) => updateItem(idx, 'product_name', e.target.value)} placeholder="Ürün" style={{ padding: '9px 12px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13 }} />
            <Inp ph="Adet" type="number" val={it.quantity} set={(v) => updateItem(idx, 'quantity', v)} />
            <Inp ph="Birim Fiyat" type="number" val={it.unit_price} set={(v) => updateItem(idx, 'unit_price', v)} />
            <button onClick={() => removeItem(idx)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <datalist id="teklif-urun-list">{urunler.map((u) => <option key={u.id} value={u.name} />)}</datalist>
        <div style={{ marginBottom: 10 }}><Btn v="s" sm onClick={addItem}>+ Satır Ekle</Btn></div>
        <Inp ph="Notlar" val={notes} set={setNotes} rows={2} />
        <div style={{ color: '#6B8F5E', fontWeight: 900, fontSize: 16, margin: '10px 0' }}>Toplam: ₺{total.toLocaleString()}</div>
        <Btn onClick={saveAndDownload}>📄 PDF Oluştur ve Kaydet</Btn>
      </div>

      <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Geçmiş Teklifler</div>
      {teklifler.map((t) => (
        <div key={t.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{t.customer_name}</div>
            <div style={{ color: '#7A7062', fontSize: 11 }}>{fmt(t.created_at)} · Geçerlilik: {fmt(t.valid_until)}</div>
          </div>
          <div style={{ color: '#6B8F5E', fontWeight: 800 }}>₺{Number(t.total_amount).toLocaleString()}</div>
          <button onClick={() => generatePDF(t)} style={{ padding: '4px 10px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>📄 İndir</button>
          <button onClick={() => remove(t.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
        </div>
      ))}
    </div>
  );
}

function MarketFisleri({ user, region }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [form, setForm] = useState({ tip: 'market', description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null });

  const load = async () => {
    setLoading(true);
    const all = await fetchReceivables(region);
    setReceipts((all || []).filter(r => r.person === 'Premium Hair (Market)' || r.person === 'Ali Haydar'));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ tip: 'market', description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null });

  const save = async () => {
    if (!form.description || !form.amount) return;
    setUploading(true);
    let receiptUrl = editingReceipt ? editingReceipt.receipt_url : null;
    if (form.receiptFile) receiptUrl = await uploadReceipt(form.receiptFile);

    if (editingReceipt) {
      const updated = await updateReceivable(editingReceipt.id, {
        description: form.description, amount: Number(form.amount), currency: form.currency,
        notes: form.notes, receipt_url: receiptUrl,
      });
      if (updated) setReceipts(rs => rs.map(r => r.id === editingReceipt.id ? updated : r));
      await logAction(user, region, 'Kayıt güncellendi', 'Market/Avans', form.description);
      setEditingReceipt(null);
    } else {
      const row = {
        region, description: form.description, amount: Number(form.amount), currency: form.currency,
        notes: form.notes, receipt_url: receiptUrl, paid: false,
        person: form.tip === 'avans' ? 'Ali Haydar' : 'Premium Hair (Market)',
      };
      const saved = await insertReceivable(row);
      if (saved) setReceipts(rs => [saved, ...rs]);
      await logAction(user, region, form.tip === 'avans' ? 'Avans eklendi' : 'Market fişi eklendi', form.tip === 'avans' ? 'Avans' : 'Market', form.description);
    }
    setShowAdd(false);
    resetForm();
    setUploading(false);
  };

  const startEdit = (r) => {
    setForm({ tip: r.person === 'Ali Haydar' ? 'avans' : 'market', description: r.description || '', amount: r.amount || '', currency: r.currency || 'TRY', notes: r.notes || '', receiptFile: null });
    setEditingReceipt(r);
    setShowAdd(true);
  };

  const removeReceipt = async (id) => {
    if (!window.confirm('Bu kayıt silinsin mi?')) return;
    await deleteReceivable(id);
    setReceipts(rs => rs.filter(r => r.id !== id));
  };

  const marketReceipts = receipts.filter(r => r.person === 'Premium Hair (Market)');
  const avansReceipts = receipts.filter(r => r.person === 'Ali Haydar');
  const pending = marketReceipts.filter(r => !r.paid);
  const paid = marketReceipts.filter(r => r.paid);
  const avansPending = avansReceipts.filter(r => !r.paid);
  const avansPaid = avansReceipts.filter(r => r.paid);
  const totalPendingTRY = pending.filter(r => (r.currency || 'TRY') === 'TRY').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPendingUSD = pending.filter(r => r.currency === 'USD').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPendingSAR = pending.filter(r => r.currency === 'SAR').reduce((s, r) => s + Number(r.amount || 0), 0);
  const avansTotalTRY = avansPending.filter(r => (r.currency || 'TRY') === 'TRY').reduce((s, r) => s + Number(r.amount || 0), 0);
  const avansTotalUSD = avansPending.filter(r => r.currency === 'USD').reduce((s, r) => s + Number(r.amount || 0), 0);
  const avansTotalSAR = avansPending.filter(r => r.currency === 'SAR').reduce((s, r) => s + Number(r.amount || 0), 0);

  if (loading) return <div style={{ color: '#7A7062', padding: 30 }}>Yükleniyor...</div>;

  return (
    <div>
      <div style={{ color: '#33302A', fontSize: 18, fontWeight: 900, marginBottom: 6 }}>🛒 Market Fişleri & Avans</div>
      <div style={{ color: '#7A7062', fontSize: 12, marginBottom: 18 }}>Premium Hair adına yapılan market alışverişleri ve kendi avanslarınız</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div style={{ background: 'rgba(107,143,94,0.1)', border: '1px solid #6B8F5E44', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>BEKLEYEN ALACAK (Premium Hair'den)</div>
          <div style={{ color: '#6B8F5E', fontSize: 18, fontWeight: 900, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {totalPendingTRY > 0 && <span>₺{totalPendingTRY.toLocaleString()}</span>}
            {totalPendingUSD > 0 && <span>${totalPendingUSD.toLocaleString()}</span>}
            {totalPendingSAR > 0 && <span>SAR {totalPendingSAR.toLocaleString()}</span>}
            {totalPendingTRY === 0 && totalPendingUSD === 0 && totalPendingSAR === 0 && <span>0</span>}
          </div>
        </div>
        <div style={{ background: 'rgba(193,85,74,0.08)', border: '1px solid #C1554A44', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#7A7062', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>ALDIĞIM AVANS (Seyit'e Borcum)</div>
          <div style={{ color: '#C1554A', fontSize: 18, fontWeight: 900, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {avansTotalTRY > 0 && <span>₺{avansTotalTRY.toLocaleString()}</span>}
            {avansTotalUSD > 0 && <span>${avansTotalUSD.toLocaleString()}</span>}
            {avansTotalSAR > 0 && <span>SAR {avansTotalSAR.toLocaleString()}</span>}
            {avansTotalTRY === 0 && avansTotalUSD === 0 && avansTotalSAR === 0 && <span>0</span>}
          </div>
        </div>
      </div>

      <Btn onClick={() => { resetForm(); setEditingReceipt(null); setShowAdd(true); }} full>+ Yeni Kayıt Ekle</Btn>

      <div style={{ marginTop: 20, color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>🛒 Bekleyen Market Fişleri</div>
      {pending.length === 0 ? (
        <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 20 }}>Bekleyen fiş yok.</div>
      ) : pending.map(r => (
        <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{r.description}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{fmt(r.date_added || r.created_at)} {r.notes && `· ${r.notes}`}</div>
              {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#7E9A89', fontSize: 11 }}>📷 Fişi Gör</a>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: '#6B8F5E', fontWeight: 800, fontSize: 14 }}>{r.currency === 'USD' ? '$' : r.currency === 'SAR' ? 'SAR ' : '₺'}{Number(r.amount).toLocaleString()}</div>
              <button onClick={() => startEdit(r)} style={{ padding: '4px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>✏️</button>
              <button onClick={() => removeReceipt(r.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, color: '#33302A', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>💰 Aldığım Avanslar</div>
      {avansPending.length === 0 ? (
        <div style={{ color: '#7A7062', fontSize: 12, textAlign: 'center', padding: 20 }}>Kayıtlı avans yok.</div>
      ) : avansPending.map(r => (
        <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#33302A', fontWeight: 700, fontSize: 13 }}>{r.description}</div>
              <div style={{ color: '#7A7062', fontSize: 11 }}>{fmt(r.date_added || r.created_at)} {r.notes && `· ${r.notes}`}</div>
              {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#7E9A89', fontSize: 11 }}>📷 Fişi Gör</a>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: '#C1554A', fontWeight: 800, fontSize: 14 }}>{r.currency === 'USD' ? '$' : r.currency === 'SAR' ? 'SAR ' : '₺'}{Number(r.amount).toLocaleString()}</div>
              <button onClick={() => startEdit(r)} style={{ padding: '4px 8px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 11, cursor: 'pointer' }}>✏️</button>
              <button onClick={() => removeReceipt(r.id)} style={{ padding: '4px 8px', background: 'rgba(193,85,74,0.15)', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        </div>
      ))}

      {(paid.length > 0 || avansPaid.length > 0) && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ color: '#6B8F5E', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✅ Kapanmış Kayıtlar ({paid.length + avansPaid.length})</summary>
          {[...paid, ...avansPaid].map(r => (
            <div key={r.id} style={{ background: '#F1EBDE', borderLeft: '3px solid #6B8F5E', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div style={{ color: '#33302A', fontSize: 12 }}>{r.person === 'Ali Haydar' ? '💰' : '🛒'} {r.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 12 }}>{r.currency === 'USD' ? '$' : r.currency === 'SAR' ? 'SAR ' : '₺'}{Number(r.amount).toLocaleString()}</div>
                <button onClick={() => startEdit(r)} style={{ padding: '3px 7px', background: 'rgba(126,154,137,0.15)', border: '1px solid #7E9A89', borderRadius: 6, color: '#7E9A89', fontSize: 10, cursor: 'pointer' }}>✏️</button>
              </div>
            </div>
          ))}
        </details>
      )}

      {showAdd && (
        <Modal title={editingReceipt ? 'Kaydı Düzenle' : 'Yeni Kayıt Ekle'} onClose={() => { setShowAdd(false); setEditingReceipt(null); resetForm(); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 6 }}>NE İÇİN?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, tip: 'market' }))} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${form.tip === 'market' ? '#6B8F5E' : '#E3D9C7'}`, background: form.tip === 'market' ? 'rgba(107,143,94,0.12)' : '#FFFFFF', color: form.tip === 'market' ? '#6B8F5E' : '#7A7062', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🛒 Market Fişi</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, tip: 'avans' }))} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${form.tip === 'avans' ? '#C1554A' : '#E3D9C7'}`, background: form.tip === 'avans' ? 'rgba(193,85,74,0.1)' : '#FFFFFF', color: form.tip === 'avans' ? '#C1554A' : '#7A7062', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💰 Avans Aldım</button>
              </div>
            </div>
            <Inp ph={form.tip === 'avans' ? 'Açıklama * (örn: Seyit\'ten avans)' : 'Ne alındı? (açıklama) *'} val={form.description} set={v => setForm(f => ({ ...f, description: v }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Inp ph="Tutar *" type="number" val={form.amount} set={v => setForm(f => ({ ...f, amount: v }))} />
              <Sel val={form.currency} set={v => setForm(f => ({ ...f, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }, { v: 'SAR', l: 'SAR ﷼' }]} />
            </div>
            <Inp ph="Not (opsiyonel)" val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} />
            <div>
              <div style={{ color: '#7A7062', fontSize: 10, marginBottom: 4 }}>FİŞ FOTOĞRAFI {editingReceipt?.receipt_url && '(mevcut fotoğraf korunur, yeni seçerseniz değişir)'}</div>
              {editingReceipt?.receipt_url && <a href={editingReceipt.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#7E9A89', fontSize: 11, display: 'block', marginBottom: 6 }}>📷 Mevcut fotoğrafı gör</a>}
              <input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, receiptFile: e.target.files[0] }))} style={{ width: '100%', padding: 8, background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => { setShowAdd(false); setEditingReceipt(null); resetForm(); }}>İptal</Btn>
              <Btn onClick={save} disabled={uploading}>{uploading ? 'Yükleniyor...' : (editingReceipt ? 'Güncelle' : 'Kaydet')}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const NAV = [
  { id: 'dashboard', ico: '🏠', lbl: 'Panel', perm: 'view_dashboard' },
  { id: 'leads', ico: '📋', lbl: 'Leadler', perm: 'view_leads' },
  { id: 'patients', ico: '💎', lbl: 'Hastalar', perm: 'view_patients' },
  { id: 'finance', ico: '💰', lbl: 'Muhasebe', perm: 'view_finance' },
  { id: 'market', ico: '🛒', lbl: 'Market Fişleri', perm: 'view_market' },
  { id: 'medikal', ico: '💊', lbl: 'Medikal', perm: 'view_dashboard' },
  { id: 'logs', ico: '📜', lbl: 'Aktivite', perm: 'view_logs' },
  { id: 'settings', ico: '⚙️', lbl: 'Ayarlar', perm: 'manage_users' },
];

function CurrencyConverterWidget() {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(null);
  const [rateSource, setRateSource] = useState('yükleniyor');
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('TRY');
  const SAR_RATE = 3.75;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data && data.rates && data.rates.TRY) {
          setRate(Math.round(data.rates.TRY * 100) / 100);
          setRateSource('otomatik');
        } else {
          setRateSource('bulunamadı');
        }
      } catch (e) {
        setRateSource('bulunamadı');
      }
    })();
  }, []);

  const toUsdBase = (amt, cur) => {
    if (cur === 'USD') return amt;
    if (cur === 'SAR') return amt / SAR_RATE;
    if (cur === 'TRY') return rate ? amt / rate : null;
    return null;
  };

  const amt = Number(amount) || 0;
  const usdBase = toUsdBase(amt, from);
  const results = {
    TRY: from === 'TRY' ? amt : (usdBase !== null && rate ? usdBase * rate : null),
    USD: from === 'USD' ? amt : usdBase,
    SAR: from === 'SAR' ? amt : (usdBase !== null ? usdBase * SAR_RATE : null),
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Kur Çevirici"
        style={{
          position: 'fixed', bottom: 20, right: 20, width: 54, height: 54, borderRadius: '50%',
          background: '#7E9A89', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(126,154,137,0.5)', zIndex: 300,
        }}
      >💱</button>
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 20, width: 280, background: '#FFFFFF',
          border: '1px solid #D4C7AE', borderRadius: 16, padding: 18, zIndex: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ color: '#33302A', fontWeight: 800, fontSize: 13 }}>💱 Kur Çevirici</div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#7A7062', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Tutar"
              style={{ flex: 1, padding: '8px 10px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13, boxSizing: 'border-box' }}
            />
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: '8px 10px', background: '#FFFFFF', border: '1px solid #E3D9C7', borderRadius: 8, color: '#33302A', fontSize: 13 }}
            >
              <option value="TRY">₺ TL</option>
              <option value="USD">$ USD</option>
              <option value="SAR">SAR</option>
            </select>
          </div>
          {['TRY', 'USD', 'SAR'].filter(c => c !== from).map(c => (
            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#FFFFFF', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ color: '#7A7062', fontSize: 12 }}>{c === 'TRY' ? '₺ TL' : c === 'USD' ? '$ USD' : 'SAR'}</span>
              <span style={{ color: '#6B8F5E', fontWeight: 700, fontSize: 13 }}>
                {results[c] !== null ? results[c].toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </span>
            </div>
          ))}
          <div style={{ color: '#7A7062', fontSize: 10, marginTop: 8 }}>1$ = {rate ?? '...'} ₺ ({rateSource}) · 1$ = {SAR_RATE} SAR (sabit)</div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [appUnlocked, setAppUnlocked] = useState(false);
  const [appPass, setAppPass] = useState('');
  const [appPassErr, setAppPassErr] = useState(false);
  const [pendingRegion, setPendingRegion] = useState(null);
  const [regionPass, setRegionPass] = useState('');
  const [regionPassErr, setRegionPassErr] = useState(false);
  const [region, setRegion] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPass, setUserPass] = useState('');
  const [userPassErr, setUserPassErr] = useState(false);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [side, setSide] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [leads, setLeads] = useState([]);
  const [patients, setPatients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [receivables, setReceivables] = useState([]);

  useEffect(() => {
    (async () => { try { const connected = await initDrive(); setDriveConnected(connected); } catch (e) {} })();
  }, []);

  useEffect(() => {
    if (!region) return;
    (async () => {
      try {
        const all = await fetchAll(region);
        const regionUsers = (all.kullanicilar || []).filter((u) => !u.region || u.region === region);
        setUsers(regionUsers);
        setLeads(all.liderler);
        setPatients(all.hastalar);
        setExpenses(all.giderler);
        setReceivables(all.receivables || []);
        setDbReady(true);
      } catch (err) { setDbError(err?.message); setDbReady(true); }
    })();
  }, [region]);

  if (!appUnlocked)
    return (
      <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 380, background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={130} />
            <div style={{ color: '#7A7062', fontSize: 12, marginTop: 14 }}>Program Şifresi</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp ph="Program Sifresi" type="password" val={appPass} set={(v) => { setAppPass(v); setAppPassErr(false); }} />
            {appPassErr && <div style={{ color: '#C1554A', fontSize: 12, textAlign: 'center' }}>Sifre yanlis!</div>}
            <Btn full onClick={() => { if (appPass === APP_PASSWORD) { setAppUnlocked(true); } else { setAppPassErr(true); } }}>Giris</Btn>
          </div>
        </div>
      </div>
    );

  if (!region && !pendingRegion)
    return (
      <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 480, background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={100} />
            <div style={{ color: '#7A7062', fontSize: 13, marginTop: 14 }}>🌍 Şube Seçin</div>
          </div>
          {Object.entries(REGIONS).map(([key, r]) => (
            <button key={key} onClick={() => { setPendingRegion(key); setRegionPass(''); setRegionPassErr(false); }} style={{ padding: '20px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, border: `2px solid ${r.clr}33`, background: `${r.clr}11`, textAlign: 'left', width: '100%', marginBottom: 12 }}>
              <div style={{ fontSize: 38 }}>{r.flag}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#33302A', fontSize: 16, fontWeight: 800 }}>{r.lbl}</div>
                <div style={{ color: r.clr, fontSize: 11, marginTop: 2 }}>Giriş →</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );

  if (pendingRegion && !region)
    return (
      <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 400, background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={80} />
            <div style={{ fontSize: 48, marginTop: 14, marginBottom: 6 }}>{REGIONS[pendingRegion]?.flag}</div>
            <div style={{ color: '#7A7062', fontSize: 16, fontWeight: 900 }}>{REGIONS[pendingRegion]?.lbl}</div>
            <div style={{ color: '#7A7062', fontSize: 12, marginTop: 4 }}>Şube Şifresi</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp ph="Şube Şifresi" type="password" val={regionPass} set={(v) => { setRegionPass(v); setRegionPassErr(false); }} />
            {regionPassErr && <div style={{ color: '#C1554A', fontSize: 12, textAlign: 'center' }}>Sifre yanlis!</div>}
            <Btn full onClick={() => { if (regionPass === REGION_PASSWORDS[pendingRegion]) { setRegion(pendingRegion); setPendingRegion(null); setRegionPass(''); } else { setRegionPassErr(true); } }}>Giris</Btn>
            <Btn full v="s" onClick={() => { setPendingRegion(null); setRegionPass(''); }}>Geri</Btn>
          </div>
        </div>
      </div>
    );

  if (!dbReady)
    return (
      <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Logo size={120} />
        <div style={{ color: '#7A7062', fontSize: 12, marginTop: 10 }}>{REGIONS[region]?.flag} {REGIONS[region]?.lbl} yükleniyor...</div>
      </div>
    );

  if (!selectedUser)
    return (
      <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 420, background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 20, padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Logo size={90} />
            <div style={{ color: REGIONS[region]?.clr, fontSize: 13, marginTop: 12, fontWeight: 700 }}>{REGIONS[region]?.flag} {REGIONS[region]?.lbl}</div>
          </div>
          {users.map((u) => {
            const role = ROLES[u.role];
            return (
              <div key={u.id} onClick={() => { setSelectedUser(u); setUserPass(''); setUserPassErr(false); }} style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E3D9C7', background: '#FFFFFF', marginBottom: 8 }}>
                <Av name={u.name} size={34} clr={role?.clr} />
                <div>
                  <div style={{ color: '#33302A', fontSize: 13, fontWeight: 700 }}>{u.name} {role?.badge}</div>
                  <div style={{ color: '#7A7062', fontSize: 11 }}>{role?.lbl}</div>
                </div>
              </div>
            );
          })}
          <button onClick={() => { setRegion(null); setUsers([]); }} style={{ marginTop: 14, padding: '8px', width: '100%', background: 'transparent', border: '1px solid #D4C7AE', borderRadius: 8, color: '#7A7062', fontSize: 11, cursor: 'pointer' }}>← Şube Değiştir</button>
        </div>
      </div>
    );

  if (!user)
    return (
      <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 380, background: '#FFFFFF', border: '1px solid #D4C7AE', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Logo size={70} />
            <div style={{ marginTop: 14 }}><Av name={selectedUser.name} size={52} clr={ROLES[selectedUser.role]?.clr} /></div>
            <div style={{ color: '#7A7062', fontSize: 14, fontWeight: 900, marginTop: 12 }}>{selectedUser.name}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp ph="Sifre" type="password" val={userPass} set={(v) => { setUserPass(v); setUserPassErr(false); }} />
            {userPassErr && <div style={{ color: '#C1554A', fontSize: 12, textAlign: 'center' }}>Sifre yanlis!</div>}
            <Btn full onClick={async () => { if (userPass === selectedUser.password) { setUser(selectedUser); setPage('dashboard'); await logAction(selectedUser, region, 'Giris yapildi', 'Sistem', selectedUser.name); } else { setUserPassErr(true); } }}>Giris</Btn>
            <Btn full v="s" onClick={() => setSelectedUser(null)}>Geri</Btn>
          </div>
        </div>
      </div>
    );

  const visNav = NAV.filter((n) => {
    if (!can(user, n.perm)) return false;
    if (n.id === 'finance' && region === 'suudi' && user.role !== 'admin') return false;
    return true;
  });
  const isAdmin = can(user, 'manage_drive');
  const reg = REGIONS[region];

  return (
    <div style={{ minHeight: '100vh', background: '#F7F3EC', display: 'flex', fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#33302A' }}>
      <div style={{ width: side ? 230 : 70, background: '#FFFFFF', borderRight: '1px solid #E3D9C7', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative' }}>
        <div style={{ padding: side ? '20px 18px 16px' : '16px 8px', borderBottom: '1px solid #E3D9C7', textAlign: 'center' }}>
          <Logo size={side ? 60 : 40} />
          {side && <div style={{ color: reg.clr, fontSize: 10, marginTop: 8, fontWeight: 700 }}>{reg.flag} {reg.lbl}</div>}
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {visNav.map((n) => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: side ? '10px 18px' : '10px 0', justifyContent: side ? 'flex-start' : 'center', background: active ? 'rgba(126,154,137,0.12)' : 'transparent', border: 'none', borderLeft: `3px solid ${active ? '#7E9A89' : 'transparent'}`, color: active ? '#7E9A89' : '#7A7062', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500 }}>
                <span style={{ fontSize: 16 }}>{n.ico}</span>
                {side && <span>{n.lbl}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: side ? '14px 18px' : '14px 10px', borderTop: '1px solid #E3D9C7', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Av name={user.name} size={30} clr={ROLES[user.role]?.clr} />
          {side && (
            <div style={{ flex: 1 }}>
              <div style={{ color: '#33302A', fontSize: 12, fontWeight: 600 }}>{user.name}</div>
              <div style={{ color: '#7A7062', fontSize: 10 }}>{ROLES[user.role]?.lbl}</div>
            </div>
          )}
          {side && <button onClick={() => { setUser(null); setSelectedUser(null); setRegion(null); setUsers([]); }} style={{ background: 'none', border: 'none', color: '#7A7062', cursor: 'pointer', fontSize: 14 }}>⏏</button>}
        </div>
        <button onClick={() => setSide((o) => !o)} style={{ position: 'absolute', top: '50%', right: -12, transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: '#D4C7AE', border: '1px solid #E3D9C7', color: '#7A7062', cursor: 'pointer', fontSize: 11 }}>{side ? '<' : '>'}</button>
      </div>
      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button onClick={() => { setRegion(null); setSelectedUser(null); setUser(null); setUsers([]); }} style={{ padding: '5px 12px', background: `${reg.clr}22`, border: `1px solid ${reg.clr}`, borderRadius: 6, color: reg.clr, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{reg.flag} {reg.lbl} · Şube Değiştir</button>
          {!dbError && <span style={{ color: '#6B8F5E', fontSize: 11 }}>● Supabase</span>}
          {isAdmin && (
            <>
              <span style={{ color: driveConnected ? '#6B8F5E' : '#C68A3D', fontSize: 11 }}>● Drive {driveConnected ? 'bagli' : 'bagli degil'}</span>
              {!driveConnected && <button onClick={async () => { try { await connectDrive(); setDriveConnected(true); } catch (e) { alert('Hata'); } }} style={{ padding: '4px 10px', background: '#4285f4', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Drive Baglan</button>}
              {driveConnected && <button onClick={() => { disconnectDrive(); setDriveConnected(false); }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #C1554A', borderRadius: 6, color: '#C1554A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Drive Cikis</button>}
            </>
          )}
        </div>
        {page === 'dashboard' && <Dashboard user={user} region={region} leads={leads} patients={patients} />}
        {page === 'leads' && <Leads user={user} region={region} leads={leads} setLeads={setLeads} />}
        {page === 'patients' && <Patients user={user} region={region} patients={patients} setPatients={setPatients} driveConnected={driveConnected} />}
        {page === 'finance' && region === 'suudi' && user.role === 'admin' && <SuudiFinance user={user} region={region} patients={patients} receivables={receivables} setReceivables={setReceivables} />}
        {page === 'finance' && region === 'istanbul' && <Finance patients={patients} expenses={expenses} setExpenses={setExpenses} user={user} region={region} />}
        {page === 'market' && <MarketFisleri user={user} region={region} />}
        {page === 'medikal' && <MedikalSatis user={user} />}
        {page === 'logs' && <ActivityLog region={region} />}
        {page === 'settings' && <Settings users={users} setUsers={setUsers} user={user} region={region} />}
      </div>
      <CurrencyConverterWidget />
    </div>
  );
}
