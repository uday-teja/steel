// TEST-ONLY fictional feeds on example.com. Never published.
const h = (n: number) => new Date(Date.now() - n * 36e5).toUTCString();
const rss = (items: string[]) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items.join('')}</channel></rss>`;
const item = (t: string, d: string, hrs: number, slug: string, src?: string) =>
  `<item><title><![CDATA[${t}]]></title><link>https://example.com/${slug}?utm_source=rss</link><description><![CDATA[${d}]]></description><pubDate>${h(hrs)}</pubDate>${src ? `<source url="https://example.com">${src}</source>` : ''}</item>`;

export function fixtureFeeds(): Record<string, string> {
  return {
    'hbl-companies': rss([
      item('Domestic HR coil prices edge higher as mills announce increase', 'Indian steel mills raised list prices of hot-rolled coil by ₹1,000 per tonne for December, according to trade sources.', 3, 'a1'),
      item('Tata Steel commissions new blast furnace unit at Kalinganagar plant', 'Tata Steel said the new blast furnace raises capacity at its Kalinganagar plant in Odisha to 8 mtpa.', 6, 'a2'),
      item('JSW Steel reports Q2 net profit rise on higher volumes', 'JSW Steel reported consolidated net profit of ₹1,200 crore for the September quarter.', 10, 'a3'),
      item('Cricket: India beat Australia in second Test', 'Sports report.', 2, 'x1'),
    ]),
    'gn-india-policy': rss([
      item('Ministry of Steel notifies revised quality control order for stainless steel products', 'The Ministry of Steel has notified a revised Quality Control Order under BIS certification.', 8, 'p1'),
      item('Cabinet approves rural roads scheme', 'Unrelated release about roads.', 9, 'p2'),
    ]),
    'gn-india-industry': rss([
      item('Tata Steel commissions new blast furnace at Kalinganagar - Example Daily', '', 6, 'g3', 'Example Daily'),
      item('DGTR recommends anti-dumping duty on flat steel imports from China - Example Daily', '', 5, 'g1', 'Example Daily'),
    ]),
    'gn-world-green-raw': rss([
      item('Iron ore slips as China steel output curbs weigh on demand', 'Seaborne iron ore fell as Chinese mills in Hebei extended production cuts.', 4, 'm1'),
      item('Gold hits record high', 'Gold prices rose.', 3, 'm3'),
    ]),
    'gn-world-industry': rss([
      item('Nucor posts lower quarterly earnings on weaker US steel prices - Example Wire', '', 9, 'w2', 'Example Wire'),
      item('Stegra secures financing for hydrogen-based green steel plant in Sweden - Example Climate', '', 11, 'w3', 'Example Climate'),
    ]),
  };
}
