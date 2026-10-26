/* Smartphone catalogue. Load BEFORE app.js so the cart/search can see these products.
   Row: [name, price, old price, rating, reviews, free delivery(1/0), seller, low stock(1/0)] */
const _k = s => /k$/i.test(s) ? parseFloat(s) * 1000 : +s;
window.EXTRA_PRODUCTS = [
  ['Samsung Galaxy A15 6.5" 128GB 4GB RAM',184500,246000,5,'820',1,'MarketHub Official',0],
  ['Apple iPhone 15 6.1" 128GB',985000,1150000,5,'2.3k',0,'MarketHub Official',0],
  ['Tecno Spark 20 Pro 6.78" 256GB',245000,320000,4,'560',1,'Tecno Official Store',0],
  ['Infinix Note 40 6.78" 256GB',268000,335000,5,'412',1,'Infinix Official Store',0],
  ['Xiaomi Redmi Note 13 6.67" 128GB',189000,236000,5,'674',1,'Xiaomi Official Store',0],
  ['Oppo A78 6.43" 128GB',215000,260000,4,'214',1,'Slot Nigeria',0],
  ['Samsung Galaxy S24 Ultra 6.8" 256GB',1450000,1650000,5,'1.1k',1,'MarketHub Official',0],
  ['Apple iPhone 13 6.1" 128GB',720000,830000,5,'1.6k',0,'MarketHub Official',0],
  ['Google Pixel 8 6.2" 128GB',680000,760000,5,'340',1,'Google Official Store',0],
  ['Nokia G22 6.52" 128GB',145000,185000,4,'129',1,'Pointek Store',0],
  ['Infinix Zero 30 6.78" 256GB',312000,390000,4,'298',1,'Infinix Official Store',0],
  ['Tecno Camon 20 Pro 6.67" 256GB',289000,360000,4,'188',1,'Tecno Official Store',0],
  ['Xiaomi Redmi 13C 6.74" 128GB',132000,178000,4,'431',1,'Xiaomi Official Store',0],
  ['Samsung Galaxy A05 6.7" 64GB',108000,140000,4,'87',1,'Jumia Partner Store',1],
  ['Oppo Reno 8T 6.43" 256GB',335000,425000,4,'176',1,'Slot Nigeria',0],
  ['itel A70 6.6" 128GB',96500,132000,4,'52',1,'3C Hub Lagos',0],
  ['Apple iPhone 14 Pro Max 6.7" 256GB',1120000,1320000,5,'1.4k',0,'MarketHub Official',0],
  ['Samsung Galaxy Z Flip 5 6.7" 256GB',1250000,1480000,5,'610',0,'MarketHub Official',0],
  ['Infinix Smart 8 6.6" 128GB',88000,120000,4,'61',1,'Gadget Mall NG',0],
  ['Tecno Pop 8 6.6" 64GB',79500,108000,4,'12',1,'Jumia Partner Store',1],
  ['Xiaomi Poco X6 Pro 6.67" 256GB',385000,470000,5,'894',1,'Xiaomi Official Store',0],
  ['Google Pixel 7a 6.1" 128GB',540000,620000,5,'402',1,'Google Official Store',0],
  ['Honor X8b 6.7" 256GB',178000,232000,4,'134',1,'Honor Official Store',0],
  ['Realme Note 50 6.74" 128GB',118000,155000,4,'38',1,'Realme Official Store',0]
].map(([name, price, old, r, rv, free, seller, low], i) => {
  const brand = name.split(' ')[0];
  return { id: 101 + i, name, price, old, r, rv, free: !!free, seller, low: !!low, brand,
    official: /Official/.test(seller), type: brand === 'Apple' ? 'iphone' : 'android',
    pop: _k(rv), cat: 'phones', e: '📱' };
});
