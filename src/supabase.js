import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ejbxxfbszdwggswzgzni.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_x58XCR8y-UAqXl3KV-ww2w_wWv3l-u5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const guard = async (promise, label) => {
  const { data, error } = await promise;
  if (error) {
    console.error(`[Supabase] ${label}:`, error.message);
    return null;
  }
  return data;
};

export const uploadPhoto = async (patientId, category, file) => {
  const ext = file.name.split('.').pop();
  const path = `${patientId}/${category}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from('patient-photos').upload(path, file);
  if (error) { console.error('Upload error:', error.message); return null; }
  const { data: urlData } = supabase.storage.from('patient-photos').getPublicUrl(path);
  return urlData.publicUrl;
};

export const deletePhoto = async (url) => {
  const path = url.split('patient-photos/')[1];
  await supabase.storage.from('patient-photos').remove([path]);
};

export const uploadReceipt = async (file) => {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const { data, error } = await supabase.storage.from('receipts').upload(path, file);
  if (error) { console.error('Receipt upload error:', error.message); return null; }
  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
  return urlData.publicUrl;
};

export const fetchKullanicilar = () => guard(supabase.from('app_users').select('*').order('id'), 'fetchKullanicilar');
export const fetchAjanslar = () => guard(supabase.from('agencies').select('*').order('id'), 'fetchAjanslar');
export const fetchLiderler = (region = 'istanbul') =>
  guard(supabase.from('leads').select('*').eq('region', region).order('id', { ascending: false }), 'fetchLiderler');
export const fetchHastalar = (region = 'istanbul') =>
  guard(supabase.from('patients').select('*').eq('region', region).order('id', { ascending: false }), 'fetchHastalar');
export const fetchGiderler = (region = 'istanbul') =>
  guard(supabase.from('expenses').select('*').eq('region', region).order('id', { ascending: false }), 'fetchGiderler');
export const fetchReceivables = (region = 'suudi') =>
  guard(supabase.from('receivables').select('*').eq('region', region).order('created_at', { ascending: false }), 'fetchReceivables');

export const insertLider = (row) => guard(supabase.from('leads').insert([row]).select().single(), 'insertLider');
export const updateLider = (id, updates) => guard(supabase.from('leads').update(updates).eq('id', id).select().single(), 'updateLider');
export const deleteLider = (id) => guard(supabase.from('leads').delete().eq('id', id), 'deleteLider');

export const insertHasta = (row) => guard(supabase.from('patients').insert([row]).select().single(), 'insertHasta');
export const updateHasta = (id, updates) => guard(supabase.from('patients').update(updates).eq('id', id).select().single(), 'updateHasta');
export const deleteHasta = (id) => guard(supabase.from('patients').delete().eq('id', id), 'deleteHasta');

export const insertGider = (row) => guard(supabase.from('expenses').insert([row]).select().single(), 'insertGider');
export const deleteGider = (id) => guard(supabase.from('expenses').delete().eq('id', id), 'deleteGider');
export const insertAjans = (row) => guard(supabase.from('agencies').insert([row]).select().single(), 'insertAjans');

export const insertReceivable = (row) => guard(supabase.from('receivables').insert([row]).select().single(), 'insertReceivable');
export const updateReceivable = (id, updates) => guard(supabase.from('receivables').update(updates).eq('id', id).select().single(), 'updateReceivable');
export const deleteReceivable = (id) => guard(supabase.from('receivables').delete().eq('id', id), 'deleteReceivable');

export const insertKullanici = (row) => guard(supabase.from('app_users').insert([row]).select().single(), 'insertKullanici');
export const updateKullanici = (id, updates) => guard(supabase.from('app_users').update(updates).eq('id', id).select().single(), 'updateKullanici');
export const deleteKullanici = (id) => guard(supabase.from('app_users').delete().eq('id', id), 'deleteKullanici');

export const insertLog = (row) => guard(supabase.from('activity_logs').insert([row]).select().single(), 'insertLog');
export const fetchLogs = (region = 'istanbul') =>
  guard(supabase.from('activity_logs').select('*').eq('region', region).order('created_at', { ascending: false }).limit(500), 'fetchLogs');

export const fetchPatientPayments = (region = 'suudi') =>
  guard(supabase.from('patient_payments').select('*').eq('region', region).order('created_at', { ascending: false }), 'fetchPatientPayments');
export const insertPatientPayment = (row) => guard(supabase.from('patient_payments').insert([row]).select().single(), 'insertPatientPayment');
export const updatePatientPayment = (id, updates) => guard(supabase.from('patient_payments').update(updates).eq('id', id).select().single(), 'updatePatientPayment');
export const deletePatientPayment = (id) => guard(supabase.from('patient_payments').delete().eq('id', id), 'deletePatientPayment');

export const fetchAll = async (region = 'istanbul') => {
  const [kullanicilar, ajanslar, liderler, hastalar, giderler, receivables] = await Promise.all([
    fetchKullanicilar(), fetchAjanslar(), fetchLiderler(region), fetchHastalar(region), fetchGiderler(region), fetchReceivables(region),
  ]);
  return {
    kullanicilar: kullanicilar ?? [], ajanslar: ajanslar ?? [], liderler: liderler ?? [],
    hastalar: hastalar ?? [], giderler: giderler ?? [], receivables: receivables ?? [],
  };
};

// ===== MEDİKAL SATIŞ MODÜLÜ =====

export const fetchMedikalUrunler = () => guard(supabase.from('medikal_urunler').select('*').order('name'), 'fetchMedikalUrunler');
export const insertMedikalUrun = (row) => guard(supabase.from('medikal_urunler').insert([row]).select().single(), 'insertMedikalUrun');
export const updateMedikalUrun = (id, updates) => guard(supabase.from('medikal_urunler').update(updates).eq('id', id).select().single(), 'updateMedikalUrun');
export const deleteMedikalUrun = (id) => guard(supabase.from('medikal_urunler').delete().eq('id', id), 'deleteMedikalUrun');

export const fetchMedikalMusteriler = () => guard(supabase.from('medikal_musteriler').select('*').order('name'), 'fetchMedikalMusteriler');
export const insertMedikalMusteri = (row) => guard(supabase.from('medikal_musteriler').insert([row]).select().single(), 'insertMedikalMusteri');
export const deleteMedikalMusteri = (id) => guard(supabase.from('medikal_musteriler').delete().eq('id', id), 'deleteMedikalMusteri');

export const fetchMedikalTedarikciler = () => guard(supabase.from('medikal_tedarikciler').select('*').order('name'), 'fetchMedikalTedarikciler');
export const insertMedikalTedarikci = (row) => guard(supabase.from('medikal_tedarikciler').insert([row]).select().single(), 'insertMedikalTedarikci');
export const deleteMedikalTedarikci = (id) => guard(supabase.from('medikal_tedarikciler').delete().eq('id', id), 'deleteMedikalTedarikci');

export const fetchMedikalAlimlar = () => guard(supabase.from('medikal_alimlar').select('*').order('created_at', { ascending: false }), 'fetchMedikalAlimlar');
export const insertMedikalAlim = (row) => guard(supabase.from('medikal_alimlar').insert([row]).select().single(), 'insertMedikalAlim');
export const updateMedikalAlim = (id, updates) => guard(supabase.from('medikal_alimlar').update(updates).eq('id', id).select().single(), 'updateMedikalAlim');
export const deleteMedikalAlim = (id) => guard(supabase.from('medikal_alimlar').delete().eq('id', id), 'deleteMedikalAlim');

export const fetchMedikalSatislar = () => guard(supabase.from('medikal_satislar').select('*').order('created_at', { ascending: false }), 'fetchMedikalSatislar');
export const insertMedikalSatis = (row) => guard(supabase.from('medikal_satislar').insert([row]).select().single(), 'insertMedikalSatis');
export const updateMedikalSatis = (id, updates) => guard(supabase.from('medikal_satislar').update(updates).eq('id', id).select().single(), 'updateMedikalSatis');
export const deleteMedikalSatis = (id) => guard(supabase.from('medikal_satislar').delete().eq('id', id), 'deleteMedikalSatis');

export const fetchMedikalGiderler = () => guard(supabase.from('medikal_giderler').select('*').order('date', { ascending: false }), 'fetchMedikalGiderler');
export const insertMedikalGider = (row) => guard(supabase.from('medikal_giderler').insert([row]).select().single(), 'insertMedikalGider');
export const deleteMedikalGider = (id) => guard(supabase.from('medikal_giderler').delete().eq('id', id), 'deleteMedikalGider');

export const fetchMedikalTeklifler = () => guard(supabase.from('medikal_teklifler').select('*').order('created_at', { ascending: false }), 'fetchMedikalTeklifler');
export const insertMedikalTeklif = (row) => guard(supabase.from('medikal_teklifler').insert([row]).select().single(), 'insertMedikalTeklif');
export const deleteMedikalTeklif = (id) => guard(supabase.from('medikal_teklifler').delete().eq('id', id), 'deleteMedikalTeklif');

// Premium Hair Genel Hesabı (kümülatif borç/alacak defteri)
export const fetchPremiumHairLedger = () => guard(supabase.from('premium_hair_ledger').select('*').order('date', { ascending: true }), 'fetchPremiumHairLedger');
export const insertPremiumHairLedger = (row) => guard(supabase.from('premium_hair_ledger').insert([row]).select().single(), 'insertPremiumHairLedger');
export const updatePremiumHairLedger = (id, updates) => guard(supabase.from('premium_hair_ledger').update(updates).eq('id', id).select().single(), 'updatePremiumHairLedger');
export const deletePremiumHairLedger = (id) => guard(supabase.from('premium_hair_ledger').delete().eq('id', id), 'deletePremiumHairLedger');
