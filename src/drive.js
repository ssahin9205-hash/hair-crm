// drive.js — Google Drive Entegrasyonu
const CLIENT_ID = "1048470480461-irfpvjnreg86u22snraj9of44f4drk6a.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const ROOT_FOLDER_NAME = "Sac Ekimi Hastalari";

let tokenClient = null;
let accessToken = null;
let gapiInited = false;
let gisInited = false;

// Google API'leri yükle
const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
  const s = document.createElement("script");
  s.src = src; s.async = true; s.defer = true;
  s.onload = resolve; s.onerror = reject;
  document.body.appendChild(s);
});

export const initDrive = async () => {
  await loadScript("https://apis.google.com/js/api.js");
  await loadScript("https://accounts.google.com/gsi/client");

  await new Promise((resolve) => window.gapi.load("client", resolve));
  await window.gapi.client.init({
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
  });
  gapiInited = true;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "",
  });
  gisInited = true;

  const saved = localStorage.getItem("drive_token");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.expires > Date.now()) {
        accessToken = parsed.token;
        window.gapi.client.setToken({ access_token: accessToken });
        return true;
      }
    } catch {}
  }
  return false;
};

export const isDriveConnected = () => !!accessToken;

export const connectDrive = () => new Promise((resolve, reject) => {
  if (!tokenClient) { reject(new Error("Drive baslatilmadi")); return; }
  tokenClient.callback = (resp) => {
    if (resp.error) { reject(new Error(resp.error)); return; }
    accessToken = resp.access_token;
    const expires = Date.now() + (resp.expires_in - 60) * 1000;
    localStorage.setItem("drive_token", JSON.stringify({ token: accessToken, expires }));
    window.gapi.client.setToken({ access_token: accessToken });
    resolve(true);
  };
  tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
});

export const disconnectDrive = () => {
  accessToken = null;
  localStorage.removeItem("drive_token");
  window.gapi?.client?.setToken(null);
};

// Klasor varsa bul, yoksa olustur
const findOrCreateFolder = async (name, parentId = null) => {
  let q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;

  const res = await window.gapi.client.drive.files.list({
    q, fields: "files(id, name)", pageSize: 1,
  });

  if (res.result.files && res.result.files.length > 0) {
    return res.result.files[0].id;
  }

  const meta = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId && { parents: [parentId] }),
  };
  const created = await window.gapi.client.drive.files.create({
    resource: meta, fields: "id",
  });
  return created.result.id;
};

// Hasta klasoru olustur (Sac Ekimi Hastalari/HastaAdi)
export const ensurePatientFolder = async (patientName) => {
  const rootId = await findOrCreateFolder(ROOT_FOLDER_NAME);
  const patientId = await findOrCreateFolder(patientName, rootId);
  return patientId;
};

// Kategori alt klasoru olustur
export const ensureCategoryFolder = async (patientName, category) => {
  const patientId = await ensurePatientFolder(patientName);
  const categoryId = await findOrCreateFolder(category, patientId);
  return categoryId;
};

// Drive'a dosya yukle
export const uploadToDrive = async (patientName, category, file) => {
  if (!accessToken) throw new Error("Drive bagli degil");

  const folderId = await ensureCategoryFolder(patientName, category);

  const meta = { name: file.name, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", file);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive yukleme hatasi: ${err}`);
  }

  const data = await res.json();

  // Dosyayi paylasilabilir yap
  await window.gapi.client.drive.permissions.create({
    fileId: data.id,
    resource: { role: "reader", type: "anyone" },
  }).catch(() => {});

  return {
    id: data.id,
    name: data.name,
    link: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
};

// Hasta klasoru linkini al
export const getPatientFolderLink = async (patientName) => {
  if (!accessToken) throw new Error("Drive bagli degil");
  const folderId = await ensurePatientFolder(patientName);
  return `https://drive.google.com/drive/folders/${folderId}`;
};