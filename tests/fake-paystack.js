// A tiny pretend Paystack for the automated tests, so nothing real is called and no real money is involved.
// It answers the same three calls the PHP backend makes: initialize, verify, and the hosted "pay" page.
const http = require('http');
const crypto = require('crypto');

function startFakePaystack(baseUrl, secret) {
  const port = Number(new URL(baseUrl).port);
  const txs = new Map();                                   // reference -> { email, amount, currency, channels, callback_url, status }
  const server = http.createServer((req, res) => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const url = new URL(req.url, baseUrl);
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      if (url.pathname.startsWith('/pay/')) {                // the hosted page: the shopper "pays", then is sent back to the shop
        const ref = decodeURIComponent(url.pathname.slice(5)), tx = txs.get(ref);
        if (!tx) return send(404, { status: false });
        tx.status = 'success';
        res.writeHead(302, { Location: `${tx.callback_url}?reference=${encodeURIComponent(ref)}&trxref=${encodeURIComponent(ref)}` });
        return res.end();
      }
      if (req.headers.authorization !== `Bearer ${secret}`) return send(401, { status: false, message: 'Invalid key' });
      if (req.method === 'POST' && url.pathname === '/transaction/initialize') {
        const b = JSON.parse(raw || '{}');
        if (!b.reference || !Number.isInteger(b.amount) || b.amount < 100 || !b.email) return send(400, { status: false, message: 'Bad request' });
        txs.set(b.reference, { ...b, status: 'abandoned' });
        return send(200, { status: true, message: 'Authorization URL created', data: { authorization_url: `${baseUrl}/pay/${encodeURIComponent(b.reference)}`, access_code: 'fake', reference: b.reference } });
      }
      const m = url.pathname.match(/^\/transaction\/verify\/(.+)$/);
      if (req.method === 'GET' && m) {
        const tx = txs.get(decodeURIComponent(m[1]));
        if (!tx) return send(404, { status: false, message: 'Transaction reference not found' });
        return send(200, { status: true, message: 'Verification successful', data: { status: tx.status, reference: decodeURIComponent(m[1]), amount: tx.amount, currency: tx.currency } });
      }
      send(404, { status: false, message: 'Not found' });
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({
      txs,
      sign: body => crypto.createHmac('sha512', secret).update(body).digest('hex'),   // what Paystack puts in the x-paystack-signature header
      close: () => new Promise(r => server.close(r)),
    }));
  });
}
module.exports = { startFakePaystack };
