/* Accessories catalogue. Load AFTER phones.js and BEFORE app.js.
   Row: [name, price, old price, rating, reviews, seller, emoji] */
window.EXTRA_PRODUCTS = (window.EXTRA_PRODUCTS || []).concat([
  ['Oraimo 20000mAh Power Bank Fast Charge',18500,24000,5,'1.5k','MarketHub Official','🔋'],
  ['Oraimo USB-C Fast Charging Cable 1.5m',2900,4500,4,'2.1k','MarketHub Official','🔌'],
  ['Samsung Galaxy Buds FE Wireless Earbuds',68000,89000,4,'412','MarketHub Official','🎧'],
  ['JBL Go 4 Portable Bluetooth Speaker',32000,42000,5,'876','JBL Official Store','🔊']
].map(([name, price, old, r, rv, seller, e], i) => ({
  id: 201 + i, name, price, old, r, rv, seller, e, free: true, official: /Official/.test(seller), cat: 'electronics', fbt: true
})));

/* Earbuds range for the product details page (id 205 has full demo details) */
window.EXTRA_PRODUCTS = window.EXTRA_PRODUCTS.concat([
  [205,'Oraimo FreePods 4 ANC True Wireless Earbuds',24500,42000,5,'1,284','MarketHub Official','🎧',{
    brand:'Oraimo', model:'OTW-330', sku:'ORA-FP4-BLK', sold:'5,000+', ratings:1284, stock:12, sellerRating:92,
    crumbs:[['Electronics','category.html?c=electronics'],['Headphones & Earphones',null],['Wireless Earbuds',null]],
    colors:[['Black','#222222'],['White','#eeeeee'],['Blue','#3b6cb0'],['Green','#3b8a5a']],
    styles:['Standard','With Charging Case','With Ear Hooks'],
    desc:['The Oraimo FreePods 4 delivers immersive Active Noise Cancellation that silences up to 90% of surrounding noise, so your music, calls and podcasts always sound clean. A 4-microphone ENC system keeps your voice crisp on every call, while the latest Bluetooth 5.3 chipset pairs instantly and holds a rock-solid connection. Enjoy up to 40 hours of total playtime when you charge with the included case.',
      'Built for all-day comfort, the lightweight in-ear design sits securely without pressure, and IPX5 water resistance shrugs off sweat and light rain. Responsive touch controls let you play, pause, switch tracks and answer calls with a tap. When you\'re in a hurry, a quick 10-minute fast charge gives you up to 2 hours of playback.'],
    features:['Active Noise Cancellation with Transparency mode','4-mic ENC for crystal-clear calls','Up to 40 hours total playtime with case','Bluetooth 5.3 ultra-low latency game mode','IPX5 sweat and splash resistant','Fast charge: 10 minutes for 2 hours of playback'],
    specs:[['Brand','Oraimo'],['Model','OTW-330'],['Bluetooth','5.3'],['Noise cancellation','Active (ANC) + Transparency'],['Playtime','Up to 40 hours with case'],['Water resistance','IPX5'],['Charging port','USB-C'],['Warranty','12 months']]
  }],
  [206,'Oraimo FreePods 3 True Wireless Earbuds',18500,27000,4,'940','MarketHub Official','🎧'],
  [207,'JBL Tune 130NC TWS Noise Cancelling Earbuds',72500,95000,5,'876','JBL Official Store','🎧'],
  [208,'Anker Soundcore Life P3 ANC Earbuds',54000,68000,5,'1.1k','Anker Official Store','🎧'],
  [209,'Baseus Bowie EZ10 True Wireless Earbuds',22500,32000,4,'318','Baseus Official Store','🎧'],
  [210,'JBL Flip 6 Portable Bluetooth Speaker',68000,85000,5,'1.3k','JBL Official Store','🔊']
].map(([id, name, price, old, r, rv, seller, e, detail]) => ({
  id, name, price, old, r, rv, seller, e, detail, free: true, official: /Official/.test(seller), cat: 'electronics'
})));