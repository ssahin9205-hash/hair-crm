import React, { useState, useCallback, useEffect } from 'react';
import {
  fetchAll,
  insertLider,
  updateLider,
  deleteLider,
  insertHasta,
  updateHasta,
  deleteHasta,
  insertGider,
  insertAjans,
  uploadPhoto,
  deletePhoto,
  insertKullanici,
  updateKullanici,
  deleteKullanici,
  insertLog,
  fetchLogs,
  insertReceivable,
  updateReceivable,
  deleteReceivable,
  uploadReceipt,
  fetchPatientPayments,
  insertPatientPayment,
  updatePatientPayment,
  deletePatientPayment,
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
    lbl: 'Admin', clr: '#9ba8bc', badge: '👑',
    perms: ['view_dashboard','view_leads','view_patients','view_finance','view_settings','edit_finance','edit_leads','edit_patients','manage_users','manage_drive','view_logs'],
  },
  manager: {
    lbl: 'Yonetici', clr: '#4f7cff', badge: '🏢',
    perms: ['view_dashboard','view_leads','view_patients','view_finance','edit_leads','edit_patients'],
  },
  sales: {
    lbl: 'Temsilci', clr: '#22c55e', badge: '📞',
    perms: ['view_dashboard','view_leads','edit_leads'],
  },
  operation: {
    lbl: 'Operasyon', clr: '#f97316', badge: '🏥',
    perms: ['view_dashboard','view_patients','edit_patients'],
  },
  finance: {
    lbl: 'Muhasebe', clr: '#f0b429', badge: '💰',
    perms: ['view_dashboard','view_finance','edit_finance'],
  },
};

const can = (u, perm) => {
  if (!u) return false;
  return ROLES[u.role]?.perms?.includes(perm) ?? false;
};

const LS = [
  { id: 'yeni', lbl: 'Yeni', clr: '#4f7cff', ico: '🆕' },
  { id: 'cevaplandi', lbl: 'Cevaplandi', clr: '#2dd4bf', ico: '💬' },
  { id: 'foto_alindi', lbl: 'Fotograf Alindi', clr: '#60a5fa', ico: '📸' },
  { id: 'konsultasyon', lbl: 'Konsultasyon', clr: '#a855f7', ico: '🔬' },
  { id: 'fiyat_verildi', lbl: 'Fiyat Verildi', clr: '#f0b429', ico: '💰' },
  { id: 'takipte', lbl: 'Takipte', clr: '#f97316', ico: '🔁' },
  { id: 'kapora_alindi', lbl: 'Kapora Alindi', clr: '#22c55e', ico: '✅' },
  { id: 'op_planlandi', lbl: 'Op. Planlandi', clr: '#22d3ee', ico: '🗓' },
  { id: 'iptal', lbl: 'Iptal', clr: '#f04040', ico: '❌' },
  { id: 'kara_liste', lbl: 'Kara Liste', clr: '#ff1a1a', ico: '🚫' },
];
const lsCfg = (id) => LS.find((s) => s.id === id) || { lbl: id, clr: '#4a5270', ico: '.' };

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
    <img src={LOGO_URL} alt="Hair International" style={{ height: size, width: 'auto', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(196,205,217,0.15))' }} />
  );
}

function Av({ name, size = 34, clr }) {
  const ini = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${clr || '#4f7cff'},${(clr || '#4f7cff') + '22'})`, border: `1px solid ${(clr || '#4f7cff') + '33'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 800, color: '#dde3ef' }}>
      {ini}
    </div>
  );
}

function Btn({ onClick, children, v = 'p', sm, full, disabled }) {
  const m = {
    p: { bg: '#4f7cff', c: '#fff', b: 'none' },
    s: { bg: 'transparent', c: '#9ba8bc', b: '1px solid #242840' },
    d: { bg: 'rgba(240,64,64,0.1)', c: '#f04040', b: '1px solid #f0404033' },
  };
  const s = m[v] || m.p;
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: sm ? '5px 12px' : '9px 18px', background: s.bg, color: s.c, border: s.b, borderRadius: 8, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: sm ? 11 : 13, opacity: disabled ? 0.5 : 1, width: full ? '100%' : 'auto' }}>
      {children}
    </button>
  );
}

function Inp({ ph, val, set, type = 'text', style = {}, rows }) {
  const b = { width: '100%', padding: '9px 12px', background: '#121525', border: '1px solid #1c2035', borderRadius: 8, color: '#dde3ef', fontSize: 13, boxSizing: 'border-box', outline: 'none', ...style };
  if (rows) return <textarea placeholder={ph} value={val} onChange={(e) => set(e.target.value)} rows={rows} style={{ ...b, resize: 'vertical' }} />;
  return <input type={type} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} style={b} />;
}

function Sel({ val, set, opts, style = {} }) {
  return (
    <select value={val} onChange={(e) => set(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#121525', border: '1px solid #1c2035', borderRadius: 8, color: '#dde3ef', fontSize: 13, ...style }}>
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
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'absolute', top: 20, right: 20, padding: '10px 16px', background: 'rgba(240,64,64,0.9)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✕ Kapat</button>
      {index > 0 && <button onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', fontWeight: 700 }}>‹</button>}
      {index < urls.length - 1 && <button onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', fontWeight: 700 }}>›</button>}
      <img src={urls[index]} alt="" style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0e1020', border: '1px solid #242840', borderRadius: 16, padding: 28, width: wide ? 820 : 440, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ color: '#dde3ef', margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a5270', fontSize: 22, cursor: 'pointer' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Dashboard({ user, region, leads, patients }) {
  const reg = REGIONS[region];
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: '#dde3ef', fontSize: 20, fontWeight: 900 }}>Merhaba, {user.name.split(' ')[0]} 👋</div>
        <div style={{ color: reg.clr, fontSize: 13, marginTop: 3, fontWeight: 700 }}>{reg.flag} {reg.lbl} Şubesi</div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { ico: '📋', lbl: 'Lead', val: leads.length, clr: '#4f7cff' },
          { ico: '💎', lbl: 'Hasta', val: patients.length, clr: '#a855f7' },
        ].map((k) => (
          <div key={k.lbl} style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{k.ico}</div>
            <div style={{ color: '#4a5270', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 24, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>
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
        <div style={{ color: '#dde3ef', fontSize: 18, fontWeight: 900 }}>📋 Leadler</div>
        {can(user, 'edit_leads') && <Btn onClick={() => setShowAdd(true)} sm>+ Yeni Lead</Btn>}
      </div>
      <Inp ph="Ara..." val={search} set={setSearch} style={{ marginBottom: 12 }} />
      {filtered.map((l) => {
        const s = lsCfg(l.status);
        return (
          <div key={l.id} onClick={() => setSel(l)} style={{ background: '#121525', border: `1px solid #1c2035`, borderLeft: `4px solid ${s.clr}`, borderRadius: 11, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 7 }}>
            <Av name={l.name} size={40} clr={s.clr} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#dde3ef', fontWeight: 800, fontSize: 14 }}>{l.name}</div>
              <div style={{ color: '#4a5270', fontSize: 11 }}>📞 {l.phone} · {s.ico} {s.lbl}</div>
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
          <div style={{ color: '#4a5270', fontSize: 12, marginBottom: 10 }}>📞 {sel.phone} · {lsCfg(sel.status).ico} {lsCfg(sel.status).lbl}</div>
          {sel.notes && <div style={{ background: '#1a1d30', borderRadius: 8, padding: 12, color: '#dde3ef', fontSize: 12 }}>{sel.notes}</div>}
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
  const [form, setForm] = useState({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', operatorNames: [] });

  const getPhotos = (p) => { try { return typeof p.photos === 'string' ? JSON.parse(p.photos) : p.photos || {}; } catch { return {}; } };

  const save = async () => {
    if (!form.name) return;
    const tp = Number(form.totalPrice) || 0, dep = Number(form.deposit) || 0;
    const operatorStr = form.operatorNames.join(', ');
    const obj = { name: form.name, phone: form.phone, country: form.country, surgeryDate: form.surgeryDate, technique: form.technique, grafts: Number(form.grafts) || 0, totalPrice: tp, deposit: dep, remaining: Math.max(0, tp - dep), totalPaid: dep, source_type: form.sourceType, source_name: form.sourceType === 'acenta' ? form.sourceName : null, operator_name: operatorStr || null };

    if (editingPatient) {
      await updateHasta(editingPatient.id, obj);
      setPatients((ps) => ps.map((p) => (p.id === editingPatient.id ? { ...p, ...obj } : p)));
      await logAction(user, region, 'Hasta güncellendi', 'Hasta', form.name, `Op: ${operatorStr || '-'}`);
      try {
        const linked = await fetchPatientPayments('suudi');
        const match = (linked || []).find((p) => p.patient_name === editingPatient.name);
        if (match) {
          await updatePatientPayment(match.id, { patient_name: form.name, surgery_date: form.surgeryDate || null, technique: form.technique, total_price: tp });
        }
      } catch (e) {}
      setEditingPatient(null);
      setShowAdd(false);
      setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', operatorNames: [] });
      return;
    }

    const fullObj = { ...obj, status: 'planli', photos: JSON.stringify({}), region };
    const saved = await insertHasta(fullObj);
    setPatients((ps) => [saved ?? { ...fullObj, id: Date.now() }, ...ps]);
    await logAction(user, region, 'Hasta eklendi', 'Hasta', form.name, `Op: ${operatorStr || '-'}`);
    if (region === 'suudi') {
      try {
        const graftNum = Number(form.grafts) || 0;
        const suggestedFee = graftNum > 0 ? (graftNum < 3000 ? 400 : 500) : null;
        const notesParts = [];
        if (operatorStr) notesParts.push(`Operatör: ${operatorStr}`);
        if (suggestedFee) notesParts.push(`Önerilen ekip ücreti: $${suggestedFee} (${graftNum} greft)`);
        await insertPatientPayment({
          region: 'suudi',
          patient_name: form.name,
          surgery_date: form.surgeryDate || null,
          technique: form.technique,
          total_price: tp,
          ali_haydar_fee: 0,
          yusuf_fee: 0,
          mete_fee: 0,
          seyit_fee: 0,
          notes: notesParts.join(' · '),
        });
      } catch (e) {}
    }
    setShowAdd(false);
    setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', operatorNames: [] });
  };

  const startEditPatient = (p) => {
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
      operatorNames: p.operator_name ? p.operator_name.split(',').map(s => s.trim()).filter(Boolean) : [],
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
  const operatorList = ['Ali Haydar', 'Yusuf', 'Mete', 'Seyit'];
  const toggleOperator = (name) => {
    setForm(f => {
      const has = f.operatorNames.includes(name);
      return { ...f, operatorNames: has ? f.operatorNames.filter(n => n !== name) : [...f.operatorNames, name] };
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ color: '#dde3ef', fontSize: 18, fontWeight: 900 }}>💎 Hastalar</div>
        {can(user, 'edit_patients') && <Btn onClick={() => setShowAdd(true)} sm>+ Hasta Ekle</Btn>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
        {patients.map((p) => (
          <div key={p.id} style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: 16, position: 'relative' }}>
            {can(user, 'edit_patients') && (
              <>
                <button onClick={(e) => { e.stopPropagation(); startEditPatient(p); }} style={{ position: 'absolute', top: 8, right: 40, width: 26, height: 26, borderRadius: '50%', background: 'rgba(79,124,255,0.2)', border: '1px solid #4f7cff', color: '#4f7cff', fontSize: 13, cursor: 'pointer', zIndex: 2 }}>✏️</button>
                <button onClick={(e) => { e.stopPropagation(); handleDeletePatient(p); }} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(240,64,64,0.2)', border: '1px solid #f04040', color: '#f04040', fontSize: 16, cursor: 'pointer', zIndex: 2 }}>×</button>
              </>
            )}
            <div onClick={() => { setSel(p); setActiveTab('onGun'); setLastUpload(null); }} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11, paddingRight: 30 }}>
                <Av name={p.name} size={42} clr="#2dd4bf" />
                <div>
                  <div style={{ color: '#dde3ef', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: '#4a5270', fontSize: 11 }}>{p.phone}</div>
                </div>
              </div>
              <div style={{ color: '#4a5270', fontSize: 11 }}>📅 {fmt(p.surgeryDate)} · {p.technique}</div>
              {p.operator_name && <div style={{ color: '#60a5fa', fontSize: 11, marginTop: 3 }}>👤 {p.operator_name}</div>}
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <Modal title={editingPatient ? `${editingPatient.name} - Düzenle` : 'Yeni Hasta'} onClose={() => { setShowAdd(false); setEditingPatient(null); setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', operatorNames: [] }); }} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>AD SOYAD *</div><Inp ph="Ad" val={form.name} set={(v) => setForm((f) => ({ ...f, name: v }))} /></div>
            <div><div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>TELEFON</div><Inp ph="Tel" val={form.phone} set={(v) => setForm((f) => ({ ...f, phone: v }))} /></div>
            <div><div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>OP. TARIHI</div><Inp type="date" ph="" val={form.surgeryDate} set={(v) => setForm((f) => ({ ...f, surgeryDate: v }))} /></div>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>GREFT SAYISI</div>
              <Inp type="number" ph="Örn: 3200" val={form.grafts} set={(v) => setForm((f) => ({ ...f, grafts: v }))} />
              {form.grafts && (
                <div style={{ color: '#22c55e', fontSize: 11, marginTop: 5, fontWeight: 700 }}>
                  💡 Önerilen ekip ücreti: ${Number(form.grafts) < 3000 ? '400' : '500'} (3000 altı: $400, 3000 ve üstü: $500)
                </div>
              )}
            </div>
            <div><div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>TEKNIK</div><Sel val={form.technique} set={(v) => setForm((f) => ({ ...f, technique: v }))} opts={['FUE', 'DHI', 'Safir FUE', 'PRP']} /></div>
            {region === 'suudi' && (
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 6 }}>HASTAYI KİM YAPTI * (birden fazla seçilebilir)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {operatorList.map(name => {
                    const active = form.operatorNames.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleOperator(name)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 20,
                          border: `1px solid ${active ? '#4f7cff' : '#1c2035'}`,
                          background: active ? 'rgba(79,124,255,0.18)' : '#121525',
                          color: active ? '#4f7cff' : '#9ba8bc',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {active ? '✓ ' : ''}👤 {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn v="s" onClick={() => { setShowAdd(false); setEditingPatient(null); setForm({ name: '', phone: '', country: '', surgeryDate: '', technique: 'DHI', grafts: '', totalPrice: '', deposit: '', sourceType: 'hair_international', sourceName: '', operatorNames: [] }); }}>Iptal</Btn>
            <Btn onClick={save}>{editingPatient ? 'Güncelle' : 'Kaydet'}</Btn>
          </div>
        </Modal>
      )}
      {sel && (
        <Modal title={sel.name} onClose={() => setSel(null)} wide>
          {can(user, 'edit_patients') && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => startEditPatient(sel)} style={{ flex: 1, padding: '10px 18px', background: 'rgba(79,124,255,0.15)', border: '1px solid #4f7cff', borderRadius: 8, color: '#4f7cff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✏️ Bilgileri Düzenle</button>
              <button onClick={() => handleDeletePatient(sel)} style={{ flex: 1, padding: '10px 18px', background: 'rgba(240,64,64,0.15)', border: '1px solid #f04040', borderRadius: 8, color: '#f04040', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🗑 Hastayi Sil</button>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#4a5270', fontSize: 11 }}>📞 {sel.phone}</div>
            <div style={{ color: '#4a5270', fontSize: 11 }}>⚗️ {sel.technique} · {sel.grafts} greft</div>
            {sel.operator_name && <div style={{ color: '#60a5fa', fontSize: 12, marginTop: 6, fontWeight: 700 }}>👤 Operatör: {sel.operator_name}</div>}
            {driveConnected && (
              <button onClick={openDriveFolder} style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(66,133,244,0.15)', border: '1px solid #4285f4', borderRadius: 6, color: '#4285f4', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📁 Drive</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {PHOTO_CATS.map((c) => {
              const photos = getPhotos(sel);
              const cnt = (photos[c.id] || []).length + (photos[`${c.id}_videos`] || []).length;
              return (
                <button key={c.id} onClick={() => { setActiveTab(c.id); setLastUpload(null); }} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${activeTab === c.id ? '#4f7cff' : '#1c2035'}`, background: activeTab === c.id ? 'rgba(79,124,255,0.15)' : 'transparent', color: activeTab === c.id ? '#4f7cff' : '#4a5270', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {c.lbl}{cnt > 0 && <span style={{ background: '#4f7cff', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, marginLeft: 4 }}>{cnt}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(79,124,255,0.12)', border: '1px solid #4f7cff44', borderRadius: 8, color: '#4f7cff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
                <button onClick={() => handleDeletePhoto(url)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(240,64,64,0.85)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
            {currentPhotos.length === 0 && currentVideos.length === 0 && <div style={{ color: '#4a5270', fontSize: 12, gridColumn: '1/-1', padding: '20px 0' }}>Medya yok.</div>}
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
  const [recForm, setRecForm] = useState({ description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null, person: 'Genel' });
  const [form, setForm] = useState({ patient_name: '', surgery_date: '', technique: 'DHI', total_price: '', ali_haydar_fee: '', yusuf_fee: '', mete_fee: '', seyit_fee: '', notes: '' });

  useEffect(() => {
    (async () => {
      const data = await fetchPatientPayments('suudi');
      setPayments(data || []);
    })();
  }, []);

  const resetForm = () => setForm({ patient_name: '', surgery_date: '', technique: 'DHI', total_price: '', ali_haydar_fee: '', yusuf_fee: '', mete_fee: '', seyit_fee: '', notes: '' });

  const savePayment = async () => {
    if (!form.patient_name) return;
    const row = { region: 'suudi', patient_name: form.patient_name, surgery_date: form.surgery_date || null, technique: form.technique, total_price: Number(form.total_price) || 0, ali_haydar_fee: Number(form.ali_haydar_fee) || 0, yusuf_fee: Number(form.yusuf_fee) || 0, mete_fee: Number(form.mete_fee) || 0, seyit_fee: Number(form.seyit_fee) || 0, notes: form.notes };
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
    setForm({ patient_name: p.patient_name, surgery_date: p.surgery_date || '', technique: p.technique || 'DHI', total_price: p.total_price || '', ali_haydar_fee: p.ali_haydar_fee || '', yusuf_fee: p.yusuf_fee || '', mete_fee: p.mete_fee || '', seyit_fee: p.seyit_fee || '', notes: p.notes || '' });
    setEditItem(p);
    setShowAdd(true);
  };

  const totalRevenue = payments.reduce((s, p) => s + Number(p.total_price || 0), 0) + payments.reduce((s, p) => s + Number(p.seyit_fee || 0), 0);
  const totalAli = payments.reduce((s, p) => s + Number(p.ali_haydar_fee || 0), 0);
  const totalYusuf = payments.reduce((s, p) => s + Number(p.yusuf_fee || 0), 0);
  const totalMete = payments.reduce((s, p) => s + Number(p.mete_fee || 0), 0);
  const totalSeyit = payments.reduce((s, p) => s + Number(p.seyit_fee || 0), 0);
  const totalTeam = totalAli + totalYusuf + totalMete + totalSeyit;
  const netProfit = totalRevenue - totalTeam;

  const pendingRec = receivables.filter(r => !r.paid);
  const paidRec = receivables.filter(r => r.paid);
  const totalPending = pendingRec.reduce((s, r) => s + Number(r.amount || 0), 0);

  const toUSD = (r) => {
    // basit yaklaşım: TRY/SAR farklı para birimlerini olduğu gibi kişi borcundan düşer (aynı birim varsayımı: kayıt sırasında USD girilmesi önerilir)
    return Number(r.amount || 0);
  };
  const pendingAli = pendingRec.filter(r => r.person === 'Ali Haydar').reduce((s, r) => s + toUSD(r), 0);
  const pendingYusuf = pendingRec.filter(r => r.person === 'Yusuf').reduce((s, r) => s + toUSD(r), 0);
  const pendingMete = pendingRec.filter(r => r.person === 'Mete').reduce((s, r) => s + toUSD(r), 0);
  const pendingSeyit = pendingRec.filter(r => r.person === 'Seyit').reduce((s, r) => s + toUSD(r), 0);
  const pendingGenel = pendingRec.filter(r => !r.person || r.person === 'Genel').reduce((s, r) => s + toUSD(r), 0);

  const netAli = totalAli - pendingAli;
  const netYusuf = totalYusuf - pendingYusuf;
  const netMete = totalMete - pendingMete;
  const netSeyit = totalSeyit - pendingSeyit;

  const saveReceivable = async () => {
    if (!recForm.description || !recForm.amount) return;
    setUploadingReceipt(true);
    let receiptUrl = null;
    if (recForm.receiptFile) receiptUrl = await uploadReceipt(recForm.receiptFile);
    const row = { region, description: recForm.description, amount: Number(recForm.amount), currency: recForm.currency, notes: recForm.notes, receipt_url: receiptUrl, paid: false, person: recForm.person || 'Genel' };
    const saved = await insertReceivable(row);
    if (saved) setReceivables(rs => [saved, ...rs]);
    setShowAddRec(false);
    setRecForm({ description: '', amount: '', currency: 'TRY', notes: '', receiptFile: null, person: 'Genel' });
    setUploadingReceipt(false);
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
      <div style={{ color: '#dde3ef', fontSize: 18, fontWeight: 900, marginBottom: 18 }}>💰 Muhasebe - 🇸🇦 Suudi Arabistan</div>

      {/* ÖZET KARTLAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { lbl: 'Toplam Gelir', val: `$${totalRevenue.toLocaleString()}`, clr: '#22c55e' },
          { lbl: 'Ali Haydar', val: `$${totalAli.toLocaleString()}`, clr: '#f97316' },
          { lbl: 'Yusuf', val: `$${totalYusuf.toLocaleString()}`, clr: '#f97316' },
          { lbl: 'Mete', val: `$${totalMete.toLocaleString()}`, clr: '#f97316' },
          { lbl: 'Seyit', val: `$${totalSeyit.toLocaleString()}`, clr: '#f97316' },
          { lbl: 'Net Kâr', val: `$${netProfit.toLocaleString()}`, clr: netProfit >= 0 ? '#22c55e' : '#f04040' },
        ].map(k => (
          <div key={k.lbl} style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: '#4a5270', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 20, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* HASTA LİSTESİ */}
      <div style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#dde3ef', fontWeight: 800, fontSize: 14 }}>👥 Hasta Ücret Kayıtları</div>
            <div style={{ color: '#4a5270', fontSize: 11, marginTop: 2 }}>{payments.length} hasta</div>
          </div>
          <Btn sm onClick={() => { resetForm(); setEditItem(null); setShowAdd(true); }}>+ Hasta Ekle</Btn>
        </div>
        {payments.length === 0 ? (
          <div style={{ color: '#4a5270', fontSize: 12, textAlign: 'center', padding: 30 }}>Henüz kayıt yok.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c2035' }}>
                  {['Hasta', 'Tarih', 'Teknik', 'Gelir', 'Ali Haydar', 'Yusuf', 'Mete', 'Seyit', 'İşlem'].map(h => (
                    <th key={h} style={{ color: '#4a5270', fontWeight: 700, padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1c2035' }}>
                    <td style={{ color: '#dde3ef', fontWeight: 700, padding: '10px 10px' }}>{p.patient_name}</td>
                    <td style={{ color: '#4a5270', padding: '10px 10px', whiteSpace: 'nowrap' }}>{fmt(p.surgery_date)}</td>
                    <td style={{ color: '#4a5270', padding: '10px 10px' }}>{p.technique}</td>
                    <td style={{ color: '#22c55e', fontWeight: 700, padding: '10px 10px' }}>${Number(p.total_price || 0).toLocaleString()}</td>
                    <td style={{ color: '#f97316', padding: '10px 10px' }}>${Number(p.ali_haydar_fee || 0).toLocaleString()}</td>
                    <td style={{ color: '#f97316', padding: '10px 10px' }}>${Number(p.yusuf_fee || 0).toLocaleString()}</td>
                    <td style={{ color: '#f97316', padding: '10px 10px' }}>${Number(p.mete_fee || 0).toLocaleString()}</td>
                    <td style={{ color: '#f97316', padding: '10px 10px' }}>${Number(p.seyit_fee || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(p)} style={{ padding: '4px 8px', background: 'rgba(79,124,255,0.15)', border: '1px solid #4f7cff', borderRadius: 6, color: '#4f7cff', fontSize: 11, cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => deletePayment(p.id)} style={{ padding: '4px 8px', background: 'rgba(240,64,64,0.15)', border: '1px solid #f04040', borderRadius: 6, color: '#f04040', fontSize: 11, cursor: 'pointer' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NET ÖDEME ÖZETİ (Kişisel Alacaklar Düşülmüş) */}
      <div style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ color: '#dde3ef', fontWeight: 800, fontSize: 14, marginBottom: 14 }}>💵 Net Ödenecek (Kişisel Alacaklar Düşülmüş)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2035' }}>
                {['Kişi', 'Hak Ediş', 'Bekleyen Alacak', 'Net Ödenecek'].map(h => (
                  <th key={h} style={{ color: '#4a5270', fontWeight: 700, padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Ali Haydar', earned: totalAli, pending: pendingAli, net: netAli },
                { name: 'Yusuf', earned: totalYusuf, pending: pendingYusuf, net: netYusuf },
                { name: 'Mete', earned: totalMete, pending: pendingMete, net: netMete },
                { name: 'Seyit', earned: totalSeyit, pending: pendingSeyit, net: netSeyit },
              ].map(row => (
                <tr key={row.name} style={{ borderBottom: '1px solid #1c2035' }}>
                  <td style={{ color: '#dde3ef', fontWeight: 700, padding: '10px 10px' }}>{row.name}</td>
                  <td style={{ color: '#22c55e', padding: '10px 10px' }}>${row.earned.toLocaleString()}</td>
                  <td style={{ color: row.pending > 0 ? '#f04040' : '#4a5270', padding: '10px 10px' }}>{row.pending > 0 ? `-$${row.pending.toLocaleString()}` : '-'}</td>
                  <td style={{ color: row.net >= 0 ? '#22c55e' : '#f04040', fontWeight: 900, padding: '10px 10px' }}>${row.net.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendingGenel > 0 && (
          <div style={{ marginTop: 12, color: '#f97316', fontSize: 11, fontWeight: 700 }}>
            🏢 Genel/Şirket bekleyen: ${pendingGenel.toLocaleString()} (kişiye bağlı değil, ayrı takip edilir)
          </div>
        )}
      </div>

      {/* ALACAKLAR */}
      <div style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#dde3ef', fontWeight: 800, fontSize: 14 }}>📋 Alacaklar</div>
            <div style={{ color: '#f97316', fontSize: 11, marginTop: 2 }}>Bekleyen: ₺{totalPending.toLocaleString()}</div>
          </div>
          <Btn sm onClick={() => setShowAddRec(true)}>+ Alacak</Btn>
        </div>
        {pendingRec.length === 0 ? (
          <div style={{ color: '#4a5270', fontSize: 12, textAlign: 'center', padding: 20 }}>Bekleyen alacak yok.</div>
        ) : pendingRec.map(r => (
          <div key={r.id} style={{ background: '#1a1d30', border: '1px solid #f9731633', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ color: '#dde3ef', fontSize: 13, fontWeight: 700 }}>
                {r.description}
                <span style={{ marginLeft: 8, padding: '2px 8px', background: 'rgba(79,124,255,0.15)', border: '1px solid #4f7cff44', borderRadius: 10, color: '#4f7cff', fontSize: 10, fontWeight: 700 }}>
                  {r.person || 'Genel'}
                </span>
              </div>
              <div style={{ color: '#4a5270', fontSize: 11 }}>{fmt(r.date_added)} {r.notes && `· ${r.notes}`}</div>
              {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#4f7cff', fontSize: 11 }}>📷 Fiş</a>}
            </div>
            <div style={{ color: '#f97316', fontWeight: 800, fontSize: 14 }}>{r.currency === 'USD' ? '$' : r.currency === 'EUR' ? '€' : '₺'}{Number(r.amount).toLocaleString()}</div>
            <button onClick={() => markPaid(r)} style={{ padding: '5px 10px', background: '#22c55e', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Tahsil</button>
            <button onClick={() => removeRec(r)} style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #f04040', borderRadius: 6, color: '#f04040', fontSize: 11, cursor: 'pointer' }}>Sil</button>
          </div>
        ))}
        {paidRec.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ color: '#22c55e', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✅ Tahsil Edilenler ({paidRec.length})</summary>
            {paidRec.map(r => (
              <div key={r.id} style={{ background: '#1a1d30', borderLeft: '3px solid #22c55e', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#dde3ef', fontSize: 12 }}>{r.description}</div>
                  <div style={{ color: '#4a5270', fontSize: 10 }}>Tahsil: {fmt(r.paid_date)}</div>
                </div>
                <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 13 }}>{r.currency === 'USD' ? '$' : '₺'}{Number(r.amount).toLocaleString()}</div>
              </div>
            ))}
          </details>
        )}
      </div>

      {/* HASTA EKLE/DÜZENLE MODAL */}
      {showAdd && (
        <Modal title={editItem ? 'Kaydı Düzenle' : 'Hasta Ekle'} onClose={() => { setShowAdd(false); setEditItem(null); resetForm(); }} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>HASTA ADI *</div>
              <Inp ph="Ad Soyad" val={form.patient_name} set={v => setForm(f => ({ ...f, patient_name: v }))} />
            </div>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>OP. TARİHİ</div>
              <Inp type="date" ph="" val={form.surgery_date} set={v => setForm(f => ({ ...f, surgery_date: v }))} />
            </div>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>TEKNİK</div>
              <Sel val={form.technique} set={v => setForm(f => ({ ...f, technique: v }))} opts={['FUE', 'DHI', 'Safir FUE', 'PRP']} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>TOPLAM GELİR ($)</div>
              <Inp type="number" ph="Örn: 2500" val={form.total_price} set={v => setForm(f => ({ ...f, total_price: v }))} />
            </div>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>ALİ HAYDAR ÜCRETİ ($)</div>
              <Inp type="number" ph="0" val={form.ali_haydar_fee} set={v => setForm(f => ({ ...f, ali_haydar_fee: v }))} />
            </div>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>YUSUF ÜCRETİ ($)</div>
              <Inp type="number" ph="0" val={form.yusuf_fee} set={v => setForm(f => ({ ...f, yusuf_fee: v }))} />
            </div>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>METE ÜCRETİ ($)</div>
              <Inp type="number" ph="0" val={form.mete_fee} set={v => setForm(f => ({ ...f, mete_fee: v }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>SEYİT ÜCRETİ ($)</div>
              <Inp type="number" ph="0" val={form.seyit_fee} set={v => setForm(f => ({ ...f, seyit_fee: v }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>NOTLAR</div>
              <Inp ph="Notlar..." val={form.notes} set={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Btn v="s" onClick={() => { setShowAdd(false); setEditItem(null); resetForm(); }}>İptal</Btn>
            <Btn onClick={savePayment}>{editItem ? 'Güncelle' : 'Kaydet'}</Btn>
          </div>
        </Modal>
      )}

      {/* ALACAK EKLE MODAL */}
      {showAddRec && (
        <Modal title="Alacak Ekle" onClose={() => setShowAddRec(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>KİM İÇİN? (kişisel harcama sahibi)</div>
              <Sel val={recForm.person} set={v => setRecForm(f => ({ ...f, person: v }))} opts={[
                { v: 'Genel', l: '🏢 Genel / Şirket' },
                { v: 'Ali Haydar', l: '👤 Ali Haydar' },
                { v: 'Yusuf', l: '👤 Yusuf' },
                { v: 'Mete', l: '👤 Mete' },
                { v: 'Seyit', l: '👤 Seyit' },
              ]} />
            </div>
            <Inp ph="Açıklama *" val={recForm.description} set={v => setRecForm(f => ({ ...f, description: v }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <Inp ph="Tutar *" type="number" val={recForm.amount} set={v => setRecForm(f => ({ ...f, amount: v }))} />
              <Sel val={recForm.currency} set={v => setRecForm(f => ({ ...f, currency: v }))} opts={[{ v: 'TRY', l: '₺ TL' }, { v: 'USD', l: '$ USD' }, { v: 'SAR', l: 'SAR' }]} />
            </div>
            <Inp ph="Notlar" val={recForm.notes} set={v => setRecForm(f => ({ ...f, notes: v }))} />
            <div>
              <div style={{ color: '#4a5270', fontSize: 10, marginBottom: 4 }}>FİŞ FOTOĞRAFI (opsiyonel)</div>
              <input type="file" accept="image/*" onChange={e => setRecForm(f => ({ ...f, receiptFile: e.target.files[0] }))} style={{ width: '100%', padding: 8, background: '#121525', border: '1px solid #1c2035', borderRadius: 8, color: '#dde3ef', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="s" onClick={() => setShowAddRec(false)}>İptal</Btn>
              <Btn onClick={saveReceivable} disabled={uploadingReceipt}>{uploadingReceipt ? 'Yükleniyor...' : 'Kaydet'}</Btn>
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
      <div style={{ color: '#dde3ef', fontSize: 18, fontWeight: 900, marginBottom: 18 }}>💰 Muhasebe</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {[
          { ico: '📈', lbl: 'Gelir', val: fmtM(totalRev), clr: '#22c55e' },
          { ico: '💸', lbl: 'Gider', val: fmtM(totalExp), clr: '#f04040' },
          { ico: '✨', lbl: 'Net', val: fmtM(net), clr: net >= 0 ? '#22c55e' : '#f04040' },
        ].map((k) => (
          <div key={k.lbl} style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{k.ico}</div>
            <div style={{ color: '#4a5270', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>{k.lbl}</div>
            <div style={{ color: k.clr, fontSize: 24, fontWeight: 900 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ color: '#dde3ef', fontWeight: 800 }}>Giderler</div>
        <Btn sm onClick={() => setShowAdd(true)}>+ Gider</Btn>
      </div>
      {expenses.map((e) => (
        <div key={e.id} style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ color: '#dde3ef', fontSize: 13 }}>{e.desc}</div>
            <div style={{ color: '#4a5270', fontSize: 10 }}>{e.cat} · {fmt(e.date)}</div>
          </div>
          <div style={{ color: '#f04040', fontWeight: 800 }}>-₺{e.amount.toLocaleString()}</div>
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
    if (action?.includes('silindi')) return '#f04040';
    if (action?.includes('eklendi')) return '#22c55e';
    if (action?.includes('yuklendi')) return '#4f7cff';
    if (action?.includes('tahsil')) return '#f0b429';
    return '#9ba8bc';
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ color: '#dde3ef', fontSize: 18, fontWeight: 900 }}>📜 Aktivite Geçmişi</div>
        <Btn sm v="s" onClick={refresh}>🔄 Yenile</Btn>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 200 }}><Inp ph="Ara..." val={search} set={setSearch} /></div>
        <div style={{ flex: 1, minWidth: 160 }}><Sel val={filterUser} set={setFilterUser} opts={[{ v: '', l: '👥 Tümü' }, ...userNames.map((n) => ({ v: n, l: n }))]} /></div>
      </div>
      {loading ? <div style={{ color: '#4a5270', textAlign: 'center', padding: 30 }}>Yukleniyor...</div> : filtered.length === 0 ? <div style={{ color: '#4a5270', textAlign: 'center', padding: 30 }}>Kayit yok.</div> : filtered.map((l) => (
        <div key={l.id} style={{ background: '#121525', border: '1px solid #1c2035', borderLeft: `3px solid ${actionColor(l.action)}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Av name={l.user_name} size={26} clr={actionColor(l.action)} />
              <span style={{ color: '#dde3ef', fontWeight: 700, fontSize: 13 }}>{l.user_name}</span>
              <span style={{ color: actionColor(l.action), fontSize: 12, fontWeight: 700 }}>{l.action}</span>
            </div>
            <span style={{ color: '#4a5270', fontSize: 10 }}>{fmtDateTime(l.created_at)}</span>
          </div>
          <div style={{ color: '#9ba8bc', fontSize: 12, marginLeft: 34 }}>{l.target_type}: <span style={{ color: '#dde3ef', fontWeight: 600 }}>{l.target_name}</span>{l.details && ` · ${l.details}`}</div>
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
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ color: '#dde3ef', fontSize: 18, fontWeight: 900 }}>⚙️ Kullanici Yonetimi</div>
        <Btn sm onClick={() => setShowAdd(true)}>+ Kullanici Ekle</Btn>
      </div>
      {users.map((u) => {
        const role = ROLES[u.role];
        return (
          <div key={u.id} style={{ background: '#121525', border: '1px solid #1c2035', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Av name={u.name} size={36} clr={role?.clr} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#dde3ef', fontSize: 13, fontWeight: 700 }}>{u.name} {role?.badge}</div>
              <div style={{ color: '#4a5270', fontSize: 11 }}>{role?.lbl}</div>
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

const NAV = [
  { id: 'dashboard', ico: '🏠', lbl: 'Panel', perm: 'view_dashboard' },
  { id: 'leads', ico: '📋', lbl: 'Leadler', perm: 'view_leads' },
  { id: 'patients', ico: '💎', lbl: 'Hastalar', perm: 'view_patients' },
  { id: 'finance', ico: '💰', lbl: 'Muhasebe', perm: 'view_finance' },
  { id: 'logs', ico: '📜', lbl: 'Aktivite', perm: 'view_logs' },
  { id: 'settings', ico: '⚙️', lbl: 'Ayarlar', perm: 'manage_users' },
];

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
      <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 380, background: '#0e1020', border: '1px solid #242840', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={130} />
            <div style={{ color: '#4a5270', fontSize: 12, marginTop: 14 }}>Program Şifresi</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp ph="Program Sifresi" type="password" val={appPass} set={(v) => { setAppPass(v); setAppPassErr(false); }} />
            {appPassErr && <div style={{ color: '#f04040', fontSize: 12, textAlign: 'center' }}>Sifre yanlis!</div>}
            <Btn full onClick={() => { if (appPass === APP_PASSWORD) { setAppUnlocked(true); } else { setAppPassErr(true); } }}>Giris</Btn>
          </div>
        </div>
      </div>
    );

  if (!region && !pendingRegion)
    return (
      <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 480, background: '#0e1020', border: '1px solid #242840', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={100} />
            <div style={{ color: '#4a5270', fontSize: 13, marginTop: 14 }}>🌍 Şube Seçin</div>
          </div>
          {Object.entries(REGIONS).map(([key, r]) => (
            <button key={key} onClick={() => { setPendingRegion(key); setRegionPass(''); setRegionPassErr(false); }} style={{ padding: '20px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, border: `2px solid ${r.clr}33`, background: `${r.clr}11`, textAlign: 'left', width: '100%', marginBottom: 12 }}>
              <div style={{ fontSize: 38 }}>{r.flag}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#dde3ef', fontSize: 16, fontWeight: 800 }}>{r.lbl}</div>
                <div style={{ color: r.clr, fontSize: 11, marginTop: 2 }}>Giriş →</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );

  if (pendingRegion && !region)
    return (
      <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 400, background: '#0e1020', border: '1px solid #242840', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={80} />
            <div style={{ fontSize: 48, marginTop: 14, marginBottom: 6 }}>{REGIONS[pendingRegion]?.flag}</div>
            <div style={{ color: '#c4cdd9', fontSize: 16, fontWeight: 900 }}>{REGIONS[pendingRegion]?.lbl}</div>
            <div style={{ color: '#4a5270', fontSize: 12, marginTop: 4 }}>Şube Şifresi</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp ph="Şube Şifresi" type="password" val={regionPass} set={(v) => { setRegionPass(v); setRegionPassErr(false); }} />
            {regionPassErr && <div style={{ color: '#f04040', fontSize: 12, textAlign: 'center' }}>Sifre yanlis!</div>}
            <Btn full onClick={() => { if (regionPass === REGION_PASSWORDS[pendingRegion]) { setRegion(pendingRegion); setPendingRegion(null); setRegionPass(''); } else { setRegionPassErr(true); } }}>Giris</Btn>
            <Btn full v="s" onClick={() => { setPendingRegion(null); setRegionPass(''); }}>Geri</Btn>
          </div>
        </div>
      </div>
    );

  if (!dbReady)
    return (
      <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Logo size={120} />
        <div style={{ color: '#4a5270', fontSize: 12, marginTop: 10 }}>{REGIONS[region]?.flag} {REGIONS[region]?.lbl} yükleniyor...</div>
      </div>
    );

  if (!selectedUser)
    return (
      <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 420, background: '#0e1020', border: '1px solid #242840', borderRadius: 20, padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Logo size={90} />
            <div style={{ color: REGIONS[region]?.clr, fontSize: 13, marginTop: 12, fontWeight: 700 }}>{REGIONS[region]?.flag} {REGIONS[region]?.lbl}</div>
          </div>
          {users.map((u) => {
            const role = ROLES[u.role];
            return (
              <div key={u.id} onClick={() => { setSelectedUser(u); setUserPass(''); setUserPassErr(false); }} style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #1c2035', background: '#121525', marginBottom: 8 }}>
                <Av name={u.name} size={34} clr={role?.clr} />
                <div>
                  <div style={{ color: '#dde3ef', fontSize: 13, fontWeight: 700 }}>{u.name} {role?.badge}</div>
                  <div style={{ color: '#4a5270', fontSize: 11 }}>{role?.lbl}</div>
                </div>
              </div>
            );
          })}
          <button onClick={() => { setRegion(null); setUsers([]); }} style={{ marginTop: 14, padding: '8px', width: '100%', background: 'transparent', border: '1px solid #242840', borderRadius: 8, color: '#4a5270', fontSize: 11, cursor: 'pointer' }}>← Şube Değiştir</button>
        </div>
      </div>
    );

  if (!user)
    return (
      <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 380, background: '#0e1020', border: '1px solid #242840', borderRadius: 20, padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Logo size={70} />
            <div style={{ marginTop: 14 }}><Av name={selectedUser.name} size={52} clr={ROLES[selectedUser.role]?.clr} /></div>
            <div style={{ color: '#c4cdd9', fontSize: 14, fontWeight: 900, marginTop: 12 }}>{selectedUser.name}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Inp ph="Sifre" type="password" val={userPass} set={(v) => { setUserPass(v); setUserPassErr(false); }} />
            {userPassErr && <div style={{ color: '#f04040', fontSize: 12, textAlign: 'center' }}>Sifre yanlis!</div>}
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
    <div style={{ minHeight: '100vh', background: '#080910', display: 'flex', fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#dde3ef' }}>
      <div style={{ width: side ? 230 : 70, background: '#0e1020', borderRight: '1px solid #1c2035', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative' }}>
        <div style={{ padding: side ? '20px 18px 16px' : '16px 8px', borderBottom: '1px solid #1c2035', textAlign: 'center' }}>
          <Logo size={side ? 60 : 40} />
          {side && <div style={{ color: reg.clr, fontSize: 10, marginTop: 8, fontWeight: 700 }}>{reg.flag} {reg.lbl}</div>}
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {visNav.map((n) => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: side ? '10px 18px' : '10px 0', justifyContent: side ? 'flex-start' : 'center', background: active ? 'rgba(79,124,255,0.12)' : 'transparent', border: 'none', borderLeft: `3px solid ${active ? '#4f7cff' : 'transparent'}`, color: active ? '#4f7cff' : '#4a5270', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500 }}>
                <span style={{ fontSize: 16 }}>{n.ico}</span>
                {side && <span>{n.lbl}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: side ? '14px 18px' : '14px 10px', borderTop: '1px solid #1c2035', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Av name={user.name} size={30} clr={ROLES[user.role]?.clr} />
          {side && (
            <div style={{ flex: 1 }}>
              <div style={{ color: '#dde3ef', fontSize: 12, fontWeight: 600 }}>{user.name}</div>
              <div style={{ color: '#4a5270', fontSize: 10 }}>{ROLES[user.role]?.lbl}</div>
            </div>
          )}
          {side && <button onClick={() => { setUser(null); setSelectedUser(null); setRegion(null); setUsers([]); }} style={{ background: 'none', border: 'none', color: '#4a5270', cursor: 'pointer', fontSize: 14 }}>⏏</button>}
        </div>
        <button onClick={() => setSide((o) => !o)} style={{ position: 'absolute', top: '50%', right: -12, transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: '#242840', border: '1px solid #1c2035', color: '#4a5270', cursor: 'pointer', fontSize: 11 }}>{side ? '<' : '>'}</button>
      </div>
      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button onClick={() => { setRegion(null); setSelectedUser(null); setUser(null); setUsers([]); }} style={{ padding: '5px 12px', background: `${reg.clr}22`, border: `1px solid ${reg.clr}`, borderRadius: 6, color: reg.clr, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{reg.flag} {reg.lbl} · Şube Değiştir</button>
          {!dbError && <span style={{ color: '#22c55e', fontSize: 11 }}>● Supabase</span>}
          {isAdmin && (
            <>
              <span style={{ color: driveConnected ? '#22c55e' : '#f97316', fontSize: 11 }}>● Drive {driveConnected ? 'bagli' : 'bagli degil'}</span>
              {!driveConnected && <button onClick={async () => { try { await connectDrive(); setDriveConnected(true); } catch (e) { alert('Hata'); } }} style={{ padding: '4px 10px', background: '#4285f4', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Drive Baglan</button>}
              {driveConnected && <button onClick={() => { disconnectDrive(); setDriveConnected(false); }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #f04040', borderRadius: 6, color: '#f04040', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Drive Cikis</button>}
            </>
          )}
        </div>
        {page === 'dashboard' && <Dashboard user={user} region={region} leads={leads} patients={patients} />}
        {page === 'leads' && <Leads user={user} region={region} leads={leads} setLeads={setLeads} />}
        {page === 'patients' && <Patients user={user} region={region} patients={patients} setPatients={setPatients} driveConnected={driveConnected} />}
        {page === 'finance' && region === 'suudi' && user.role === 'admin' && <SuudiFinance user={user} region={region} patients={patients} receivables={receivables} setReceivables={setReceivables} />}
        {page === 'finance' && region === 'istanbul' && <Finance patients={patients} expenses={expenses} setExpenses={setExpenses} user={user} region={region} />}
        {page === 'logs' && <ActivityLog region={region} />}
        {page === 'settings' && <Settings users={users} setUsers={setUsers} user={user} region={region} />}
      </div>
    </div>
  );
}
