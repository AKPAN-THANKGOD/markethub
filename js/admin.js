/* Admin page – runs after app.js. Only accounts listed under 'admin_emails' in api/config.local.php get in (the server checks every request again).
   Lists orders, changes their status and marks bank transfers as paid. API mode only. */
MH.ready.then(() => {
const root = $('#adm'), esc = Auth.esc;
const STATUS = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYTXT = { pending: 'Unpaid', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' };
const when = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const msg = (icon, title, body) => root.innerHTML = `<div class="box emptycart"><div class="big">${icon}</div><h2>${title}</h2><p>${body}</p><a href="index.html" class="btn">Back to the shop</a></div>`;

if (MH.mode !== 'api') return msg('🛠️', 'Admin needs the PHP backend', 'This page only works when the site runs with the PHP + MySQL backend (see docs/backend.md).');
if (!Auth.user()) return msg('🔒', 'Please sign in', '<a href="account.html?next=admin.html" class="link">Sign in with your admin account</a> to continue.');
if (!MH.admin) return msg('⛔', 'No access', 'This account is not an admin. Admin accounts are listed in <code>admin_emails</code> in <code>api/config.local.php</code>.');

const f = { status: '', unpaid: false, q: '' };
root.innerHTML = `<h1 style="margin:18px 0 0">Orders</h1>
  <div class="box adm-bar"><select id="fStatus" aria-label="Status"><option value="">All statuses</option>${STATUS.map(s => `<option>${s}</option>`).join('')}</select>
    <label><input type="checkbox" id="fUnpaid"> Unpaid only</label>
    <input id="fQ" type="search" placeholder="Order number, e-mail or name" aria-label="Search orders">
    <button class="btn-outline mini" id="fGo" type="button">Refresh</button></div>
  <div class="box" style="overflow-x:auto"><table class="adm" id="tbl"></table></div>`;

async function load() {
  const qs = new URLSearchParams({ ...(f.status && { status: f.status }), ...(f.unpaid && { pay: 'unpaid' }), ...(f.q && { q: f.q }) });
  const r = await apiFetch('admin/orders.php?' + qs);
  if (r.error) return $('#tbl').innerHTML = `<tr><td>${esc(r.error)}</td></tr>`;
  $('#tbl').innerHTML = r.items.length ? `<thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Change</th></tr></thead><tbody>${r.items.map(o => `<tr>
    <td><b>#${o.id}</b><br><small class="mut">${when(o.date)} · ${o.units} item${o.units === 1 ? '' : 's'}</small></td>
    <td>${esc(o.name)}<br><small class="mut">${esc(o.email)} · ${esc(o.city)}</small></td>
    <td><b>${fmt(o.total)}</b></td>
    <td>${{ card: 'Card', transfer: 'Transfer', cod: 'On delivery' }[o.pay]}<br><small class="${o.payStatus === 'paid' ? 'grn' : 'mut'}">${PAYTXT[o.payStatus]}</small>${o.refundDue ? '<br><small class="redt">⚠ Cancelled but paid: refund on Paystack</small>' : ''}</td>
    <td><span class="st st${STATUS.indexOf(o.status)}">${o.status}</span></td>
    <td class="adm-act"><select data-sel="${o.id}" aria-label="New status for ${o.id}">${STATUS.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="btn-outline mini" data-set="${o.id}" type="button">Update</button>
      ${o.payStatus === 'pending' && o.status !== 'cancelled' ? `<button class="btn mini2" data-paid="${o.id}" type="button">Mark paid</button>` : ''}</td></tr>`).join('')}</tbody>` : '<tbody><tr><td>No orders match.</td></tr></tbody>';
}
async function act(body, ok) {
  const r = await apiFetch('admin/order-update.php', { method: 'POST', body });
  if (r.error) return toast(r.error);
  toast(ok); load();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-set],[data-paid],#fGo'); if (!b) return;
  if (b.id === 'fGo') return load();
  if (b.dataset.set) {
    const to = document.querySelector(`[data-sel="${b.dataset.set}"]`).value;
    if (to === 'cancelled' && !confirm('Cancel this order? The items go back in stock and this cannot be undone.')) return;
    act({ id: b.dataset.set, action: 'status', status: to }, 'Order updated ✔');
  } else if (confirm('Mark this order as paid? Only do this when the money has really arrived.')) act({ id: b.dataset.paid, action: 'paid' }, 'Marked as paid ✔');
});
$('#fStatus').onchange = e => { f.status = e.target.value; load(); };
$('#fUnpaid').onchange = e => { f.unpaid = e.target.checked; load(); };
$('#fQ').onkeydown = e => { if (e.key === 'Enter') { f.q = e.target.value.trim(); load(); } };
load();
});
