const TOKEN_SERVER_URL = "https://mock-oauth2.kimlikdao.net/token";
const BILGI_SERVER_URL = "https://mock-oauth2.kimlikdao.net/temel-bilgileri";
const CLIENT_ID = 'F5CAA82F-E2CF-4F21-A745-471ABE3CE7F8';
const CLIENT_SECRET = 'B97B789F-9D0F-48AF-AD09-0721979D0E9F';
let PRIVATE_KEY = null;

function err(mesaj, kod) {
  return new Response('{hata:"' + mesaj + '"}', {
    status: kod,
    headers: { 'content-type': 'application/json' }
  })
}

function base64Encode(buf) {
  let string = '';
  (new Uint8Array(buf)).forEach(
    (byte) => { string += String.fromCharCode(byte) }
  )
  return btoa(string)
}

/**
 * @param {Request} request
 * @return {Promise<Result>}
 */
async function handleRequest(request) {
  const url = new URL(request.url)

  if (request.method !== "GET") {
    return hata('GET gerekli', 405);
  }

  // (0) Imza isteğini oku
  const oauth_code = url.searchParams.get('oauth_code');
  const taahhüt = url.searchParams.get('taahhüt') || url.searchParams.get('taahhut');

  // (1) Access tokenini al
  const token_req_param = {
    grant_type: "authorization_code",
    code: oauth_code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }
  const token_req = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(token_req_param).toString()
  }
  const token_res = await fetch(TOKEN_SERVER_URL, token_req);
  const token_body = await token_res.json();
  const token = token_body.access_token;

  // (2) Access token ile 'Temel-Bilgileri' al.
  const bilgi_req = {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }
  const bilgi_res = await fetch(BILGI_SERVER_URL, bilgi_req);
  const bilgi = await bilgi_res.json();

  // (3) Gizli anahtar ile 'Temel-Bilgileri' imzala.
  // NOT: KimlikAŞ Ed25519 eliptik eğrisi ile imza atıyor.
  // Test sunucuda kolaylık adına SubtleCrypto'nun desteklediği
  // P-521 eliptik eğrisini kullanıyoruz.     
  if (!PRIVATE_KEY) {
    PRIVATE_KEY = await crypto.subtle.importKey("jwk",
      JSON.parse(KIMLIK_AS_PRIVATE_KEY), {
      name: "ECDSA",
      namedCurve: "P-521"
    }, true, ["sign"]);
  }
  bilgi.an = new Date();
  bilgi.taahhüt = taahhüt;
  let imza = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-512" },
    },
    PRIVATE_KEY,
    new TextEncoder().encode(JSON.stringify(bilgi))
  );
  imza = await crypto.subtle.digest({ name: 'SHA-256' }, imza);
  bilgi.imza = base64Encode(imza).slice(0, 28);
  bilgi.k = 0;

  // (4) Imzali kullanıcı bilgilerini geri yolla.
  return new Response(JSON.stringify(bilgi), {
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'access-control-allow-origin': '*'
    },
  })
}

export default { fetch: handleRequest };
