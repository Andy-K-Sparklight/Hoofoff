/* Storage Struct
- expires: number, in ms (when will this expire)
- date: date (when was this created)
- baseVersion: string (base game version)
- premium: boolean (has verification or not)
- network: string (network password)
- ip: string (normally 10.16.32.128, but this is sent by client)
- port: number (game port)
- password: string (network password)
- count: number (how many times can it still be used)
- message: string (for client to see)
*/

let ID_MAP = {};
let SECRET_MAP = {};
const fs = require("fs-extra");
const CryptoJS = require("crypto-js");

const TARGET_FILE = "storage.json";
const SECRET_FILE = "secret.json";
module.exports = {
  enableIntervalSave,
  markUse,
  create,
  ensureType,
  loadData,
  saveDataSync,
  deactive
};

function deactive(id, secret) {
  const s = SECRET_MAP[id];
  if (s === secret) {
    delete ID_MAP[id];
    delete SECRET_MAP[id];
    console.log(`Profile ${id} deactivated.`);
    return "Delete successful."
  }
  return "Invalid secret!"
}

function saveDataSync() {
  console.log("[ST] Saving map data!");
  mapGC();
  fs.writeFileSync(TARGET_FILE, JSON.stringify(ID_MAP));
  fs.writeFileSync(SECRET_FILE, JSON.stringify(SECRET_MAP));
}
function enableIntervalSave() {
  setInterval(() => {
    saveData();
  }, 300000);
}
function markUse(id) {
  try {
    ensureType("string", id);
  } catch (e) {
    console.log("[MG] Could not create: invalid arguments");
    throw e;
  }
  id = id.toLowerCase();
  if (ID_MAP[id] !== undefined) {
    let s = ID_MAP[id];
    if (s.count > 0) {
      console.log(`[MG] Profile ${id} has just been acquired!`);
      s.count = s.count - 1;
      s.nextIP = s.nextIP + 1;
      if (s.nextIP === 128) {
        s.nextIP = s.nextIP + 1;
      }
      if (s.nextIP > 255) {
        s.nextIP = 0;
      }
      let x = JSON.stringify(s);
      if (s.count === 0) {
        console.log(`[MG] Profile ${id} has just been used up!`);
        delete ID_MAP[id];
      }
      return x;
    } else {
      console.log(`[MG] Profile ${id} has already been used up!`);
      delete ID_MAP[id];
    }
  }
  return "Not found."
}

function create(
  baseVersion,
  premium,
  network,
  ip,
  port,
  password,
  message,
  count,
  expires,
  secret
) {
  try {
    ensureType("string", baseVersion, network, ip, password, message, secret);
    ensureType("number", port, count, expires);
    ensureType("boolean", premium);
  } catch (e) {
    console.log("[MG] Could not create: invalid arguments");
    throw e;
  }
  let cid;
  let tries = 0;
  do {
    cid = CryptoJS.SHA1(Math.random().toString()).toString().slice(0, 6);
  } while (ID_MAP[cid] !== undefined && tries < 32);
  {
    tries++;
    cid = CryptoJS.SHA1(Math.random().toString()).toString().slice(0, 6);
  }
  if (tries >= 32) {
    throw "[MG] Could not create: failed to allocate id";
  }
  cid = cid.toLowerCase();
  console.log(`[MG] Creating profile for ${cid}`);
  ID_MAP[cid] = {
    baseVersion,
    premium,
    network,
    ip,
    port,
    password,
    message,
    count,
    expires,
    date: new Date().toString(),
    nextIP: 0,
  };
  SECRET_MAP[cid] = secret;
  return cid;
}

function ensureType(type, ...vals) {
  for (let c of vals) {
    if (typeof c !== type) {
      throw `Invalid type for ${c}, expected ${type}`;
    }
  }
}

async function saveData() {
  console.log("[ST] Saving map data!");
  mapGC();
  await fs.writeFile(TARGET_FILE, JSON.stringify(ID_MAP));
  await fs.writeFile(SECRET_FILE, JSON.stringify(SECRET_MAP));
}

async function loadData() {
  console.log("[ST] Loading map data!");
  try {
    ID_MAP = await fs.readJSON(TARGET_FILE);
    SECRET_MAP = await fs.readJSON(SECRET_FILE);
  } catch {
    console.log("[ST] Map data not exist or corrupted, created.");
    ID_MAP = {};
    SECRET_MAP = {};
  }
}

function mapGC() {
  console.log("[GC] GC start.");
  let cDate = new Date().getTime();
  for (let b of Object.keys(ID_MAP)) {
    let struct = ID_MAP[b];
    let expires = struct.expires;
    let date = new Date(struct.date).getTime();
    if (cDate - date > expires) {
      console.log(`[GC] Outdated code ${b}, disposed.`);
      delete ID_MAP[b];
      continue;
    }
    if (struct.count === 0) {
      console.log(`[GC] Used up code ${b}, disposed.`);
      delete ID_MAP[b];
      continue;
    }
  }
  for (let x of Object.keys(SECRET_MAP)) {
    if (ID_MAP[x] === undefined) {
      delete SECRET_MAP[x];
    }
  }

  console.log("[GC] GC end.");
}
