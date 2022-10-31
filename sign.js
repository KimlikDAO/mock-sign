const TOKEN_SERVER_URL = "https://mock-oauth2.kimlikdao.net/token";
const BILGI_SERVER_URL = "https://mock-oauth2.kimlikdao.net/bilgi";
const CLIENT_ID = 'F5CAA82F-E2CF-4F21-A745-471ABE3CE7F8';
const CLIENT_SECRET = 'B97B789F-9D0F-48AF-AD09-0721979D0E9F';

/**
 * @param {string} message
 * @param {number} code
 */
const err = (message, code) => {
  return new Response('{hata:"' + message + '"}', {
    status: code,
    headers: { 'content-type': 'application/json' }
  })
}

/**
 * @param {nvi.TemelBilgileri} kişi
 * @return {PersonInfo}
 */
const toPersonInfo = (kişi) => /** @type {PersonInfo} */({
  first: kişi.ad,
  last: kişi.soyad,
  localIdNumber: "TR" + kişi.TCKN,
  cityOfBirth: kişi.dyeri,
  dateOfBirth: kişi.dt,
  gender: kişi.cinsiyet,
  humanID: null,
})

/**
 * @param {nvi.IletisimBilgileri} iletişim
 * @return {ContactInfo}
 */
const toContactInfo = (iletişim) => /** @type {ContactInfo} */({
  email: iletişim.eposta,
  phone: iletişim.telefon,
})

/**
 * @param {TürkiyeAdresi} trAdresi
 * @return {AddressInfo}
 */
const fromTürkiyeAdresi = (trAdresi) => {
  trAdresi.country = "Türkiye";
  return trAdresi;
}

/**
 * @param {InfoSection} data
 * @param {string} commit base64 encded cryptographic EVM address commitment.
 * @param {string} signerKey
 * @return {InfoSection}
 */
const signFor = (data, commit, signerKey) => data

export default {
  /**
   * @param {CFWorkersRequest} request
   * @return {Promise<Response>|Response}
   */
  fetch(request) {
    /** @const {URL} */
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return err('GET gerekli', 405);
    }

    const signerKey = "";
    const oauth_code = url.searchParams.get('oauth_code') || "";
    const commit = url.searchParams.get('taahhüt') || url.searchParams.get('taahhut') || "";

    /** @const {OAuthAccessTokenRequest} */
    const tokenRequest = {
      grant_type: "authorization_code",
      code: oauth_code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }
    return fetch(TOKEN_SERVER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(/** @type {!Object<string, string>} */(tokenRequest)).toString()
    }).then((res) => res.json())
      .then((/** @type {OAuthAccessToken} */ body) => fetch(BILGI_SERVER_URL, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + body.access_token }
      }))
      .then((res) => res.json())
      .then((data) => new Response(JSON.stringify({
        "personInfo": signFor(
          toPersonInfo(data["Temel-Bilgileri"]), commit, signerKey),
        "contactInfo": signFor(
          toContactInfo(data["Iletisim-Bilgileri"]), commit, signerKey),
        "kütükBilgileri": signFor(
          /** @type {KütükBilgileri} */(data["Kutuk-Bilgileri"]), commit, signerKey),
        "addressInfo": signFor(
          fromTürkiyeAdresi(data["Adres-Bilgileri"]), commit, signerKey)
      }), {
        headers: {
          'content-type': 'application/json;charset=utf-8',
          'access-control-allow-origin': '*'
        }
      }))
  }
};
