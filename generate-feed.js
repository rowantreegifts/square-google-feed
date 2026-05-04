#!/usr/bin/env node

/**
 * Square → Google Merchant Centre Feed Generator
 *
 * Connects to the Square Catalogue API (REST), pulls all active products,
 * and generates a Google Merchant Centre-compatible XML feed (RSS 2.0).
 *
 * Also generates an issues report highlighting products with problems.
 *
 * Built for: The Rowan Tree, Budleigh Salterton, Devon
 * Website:   rowantreegifts.co.uk
 *
 * NO external dependencies — uses only Node.js built-in modules.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  // Square API
  squareAccessToken: process.env.SQUARE_ACCESS_TOKEN,
  squareApiBase: 'https://connect.squareup.com/v2',

  // Shop settings
  shopName: 'The Rowan Tree',
  shopUrl: 'https://rowantreegifts.co.uk',
  shopDescription: 'Gifts & homewares from The Rowan Tree, Budleigh Salterton, Devon',
  defaultBrand: 'The Rowan Tree',
  currency: 'GBP',
  contentLanguage: 'en',
  targetCountry: 'GB',
  condition: 'new',

  // Shipping defaults (UK standard)
  shippingCountry: 'GB',
  shippingService: 'Standard',
  shippingPrice: '4.99 GBP',

  // Output paths
  outputDir: path.join(__dirname, 'docs'),
  feedFileName: 'feed.xml',
  reportFileName: 'issues-report.txt',

  // Google title max length
  maxTitleLength: 150,
};

// ─── Google Product Category Mappings ────────────────────────────────────────

const CATEGORY_MAPPINGS = {
  'candle': 'Home & Garden > Decor > Candles',
  'candles': 'Home & Garden > Decor > Candles',
  'diffuser': 'Home & Garden > Decor > Home Fragrances',
  'wax melt': 'Home & Garden > Decor > Candles',
  'cushion': 'Home & Garden > Decor > Throw Pillows',
  'throw': 'Home & Garden > Linens & Bedding > Bedding > Blankets & Throws',
  'blanket': 'Home & Garden > Linens & Bedding > Bedding > Blankets & Throws',
  'vase': 'Home & Garden > Decor > Vases',
  'clock': 'Home & Garden > Decor > Clocks',
  'mirror': 'Home & Garden > Decor > Mirrors',
  'frame': 'Home & Garden > Decor > Picture Frames',
  'photo frame': 'Home & Garden > Decor > Picture Frames',
  'coaster': 'Home & Garden > Kitchen & Dining > Barware > Coasters',
  'mug': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  'cup': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  'plate': 'Home & Garden > Kitchen & Dining > Tableware > Serveware > Plates',
  'bowl': 'Home & Garden > Kitchen & Dining > Tableware > Serveware > Bowls',
  'tea towel': 'Home & Garden > Kitchen & Dining > Kitchen Linens > Dish Towels',
  'apron': 'Home & Garden > Kitchen & Dining > Kitchen Linens > Aprons',
  'oven glove': 'Home & Garden > Kitchen & Dining > Kitchen Linens > Oven Mitts & Pot Holders',
  'chopping board': 'Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils > Cutting Boards',
  'placemat': 'Home & Garden > Kitchen & Dining > Table Linens > Placemats',
  'napkin': 'Home & Garden > Kitchen & Dining > Table Linens > Napkins',
  'doormat': 'Home & Garden > Decor > Door Mats',
  'garden': 'Home & Garden > Lawn & Garden > Gardening',
  'plant pot': 'Home & Garden > Lawn & Garden > Gardening > Pots & Planters',
  'planter': 'Home & Garden > Lawn & Garden > Gardening > Pots & Planters',
  'ornament': 'Home & Garden > Decor > Figurines',
  'figurine': 'Home & Garden > Decor > Figurines',
  'decoration': 'Home & Garden > Decor',
  'sign': 'Home & Garden > Decor > Wall Art',
  'wall art': 'Home & Garden > Decor > Wall Art',
  'print': 'Home & Garden > Decor > Wall Art',
  'lamp': 'Home & Garden > Lighting > Lamps',
  'light': 'Home & Garden > Lighting',
  'lantern': 'Home & Garden > Lighting > Lamps',
  'storage': 'Home & Garden > Household Supplies > Storage & Organization',
  'basket': 'Home & Garden > Household Supplies > Storage & Organization > Baskets',
  'hook': 'Home & Garden > Household Supplies > Storage & Organization > Hooks',
  'necklace': 'Apparel & Accessories > Jewelry > Necklaces',
  'bracelet': 'Apparel & Accessories > Jewelry > Bracelets',
  'earring': 'Apparel & Accessories > Jewelry > Earrings',
  'earrings': 'Apparel & Accessories > Jewelry > Earrings',
  'ring': 'Apparel & Accessories > Jewelry > Rings',
  'jewellery': 'Apparel & Accessories > Jewelry',
  'jewelry': 'Apparel & Accessories > Jewelry',
  'watch': 'Apparel & Accessories > Jewelry > Watches',
  'scarf': 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls',
  'hat': 'Apparel & Accessories > Clothing Accessories > Hats',
  'bag': 'Apparel & Accessories > Handbags, Wallets & Cases',
  'handbag': 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
  'purse': 'Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips',
  'wallet': 'Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips',
  'keyring': 'Apparel & Accessories > Clothing Accessories > Keychains',
  'key ring': 'Apparel & Accessories > Clothing Accessories > Keychains',
  'socks': 'Apparel & Accessories > Clothing > Underwear & Socks > Socks',
  'gloves': 'Apparel & Accessories > Clothing Accessories > Gloves & Mittens',
  'card': 'Arts & Entertainment > Party & Celebration > Cards > Greeting Cards',
  'cards': 'Arts & Entertainment > Party & Celebration > Cards > Greeting Cards',
  'greeting card': 'Arts & Entertainment > Party & Celebration > Cards > Greeting Cards',
  'notebook': 'Office Supplies > General Office Supplies > Notebooks & Notepads',
  'journal': 'Office Supplies > General Office Supplies > Notebooks & Notepads',
  'diary': 'Office Supplies > General Office Supplies > Notebooks & Notepads',
  'pen': 'Office Supplies > General Office Supplies > Pens & Pencils',
  'pencil': 'Office Supplies > General Office Supplies > Pens & Pencils',
  'stationery': 'Office Supplies > General Office Supplies',
  'wrap': 'Arts & Entertainment > Party & Celebration > Gift Wrapping',
  'gift wrap': 'Arts & Entertainment > Party & Celebration > Gift Wrapping',
  'wrapping paper': 'Arts & Entertainment > Party & Celebration > Gift Wrapping',
  'gift bag': 'Arts & Entertainment > Party & Celebration > Gift Wrapping > Gift Bags',
  'tissue paper': 'Arts & Entertainment > Party & Celebration > Gift Wrapping',
  'ribbon': 'Arts & Entertainment > Party & Celebration > Gift Wrapping > Ribbons & Bows',
  'toy': 'Toys & Games',
  'toys': 'Toys & Games',
  'game': 'Toys & Games > Games',
  'puzzle': 'Toys & Games > Puzzles',
  'teddy': 'Toys & Games > Stuffed Animals',
  'soft toy': 'Toys & Games > Stuffed Animals',
  'baby': 'Baby & Toddler',
  'soap': 'Health & Beauty > Personal Care > Cosmetics > Bath & Body > Bar Soap',
  'bath bomb': 'Health & Beauty > Personal Care > Cosmetics > Bath & Body > Bath Additives',
  'bath': 'Health & Beauty > Personal Care > Cosmetics > Bath & Body',
  'hand cream': 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Lotion & Moisturizer',
  'body lotion': 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Lotion & Moisturizer',
  'lip balm': 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Lip Balm',
  'perfume': 'Health & Beauty > Personal Care > Cosmetics > Fragrance',
  'fragrance': 'Health & Beauty > Personal Care > Cosmetics > Fragrance',
  'book': 'Media > Books',
  'books': 'Media > Books',
  'cookbook': 'Media > Books > Non-Fiction Books',
  'chocolate': 'Food, Beverages & Tobacco > Food Items > Confectionery > Chocolate',
  'sweet': 'Food, Beverages & Tobacco > Food Items > Confectionery',
  'sweets': 'Food, Beverages & Tobacco > Food Items > Confectionery',
  'fudge': 'Food, Beverages & Tobacco > Food Items > Confectionery > Fudge',
  'jam': 'Food, Beverages & Tobacco > Food Items > Condiments & Sauces > Jams & Jellies',
  'marmalade': 'Food, Beverages & Tobacco > Food Items > Condiments & Sauces > Jams & Jellies',
  'tea': 'Food, Beverages & Tobacco > Beverages > Tea',
  'coffee': 'Food, Beverages & Tobacco > Beverages > Coffee',
  'biscuit': 'Food, Beverages & Tobacco > Food Items > Bakery > Biscuits & Cookies',
  'biscuits': 'Food, Beverages & Tobacco > Food Items > Bakery > Biscuits & Cookies',
  'gift set': 'Arts & Entertainment > Party & Celebration > Gift Giving > Gift Sets',
  'gift': 'Arts & Entertainment > Party & Celebration > Gift Giving',
};

const DEFAULT_CATEGORY = 'Arts & Entertainment > Party & Celebration > Gift Giving';

const CATCH_ALL_PRODUCT_NAMES = new Set([
  'in store purchase',
  'bath body',
  'cards stationery',
  'homewares',
  'toys games',
  'clothing bags',
  'books',
  'children s clothes',
]);

const COLOR_KEYWORDS = [
  'black', 'white', 'grey', 'gray', 'silver', 'gold', 'bronze', 'brown', 'beige',
  'cream', 'ivory', 'red', 'pink', 'coral', 'orange', 'yellow', 'green', 'aqua',
  'turquoise', 'teal', 'blue', 'navy', 'purple', 'lilac', 'violet', 'lavender',
  'multi', 'multicolour', 'multicolor', 'rainbow', 'clear', 'natural', 'taupe',
  'camel', 'khaki', 'burgundy', 'plum', 'mustard',
];

// ─── HTTP Helpers (no external dependencies) ─────────────────────────────────

function squareGet(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CONFIG.squareApiBase}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.squareAccessToken}`,
        'Square-Version': '2024-12-18',
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Square API error ${res.statusCode}: ${JSON.stringify(parsed.errors || parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Square response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function squarePost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CONFIG.squareApiBase}${endpoint}`);
    const bodyStr = JSON.stringify(body);

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.squareAccessToken}`,
        'Square-Version': '2024-12-18',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Square API error ${res.statusCode}: ${JSON.stringify(parsed.errors || parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Square response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPrice(amountInPence, currency) {
  if (!amountInPence && amountInPence !== 0) return null;
  const pounds = Number(amountInPence) / 100;
  return `${pounds.toFixed(2)} ${currency || CONFIG.currency}`;
}

function buildProductUrl(itemName, itemId) {
  if (!itemName) return CONFIG.shopUrl;
  // Square Online URL format: /product/product-name-slug/
  // Some URLs also include the Square variation ID, but the slug-only version works too
  const slug = itemName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${CONFIG.shopUrl}/product/${slug}/`;
}

function mapToGoogleCategory(name, squareCategory) {
  const searchText = `${name || ''} ${squareCategory || ''}`.toLowerCase();
  const sortedKeywords = Object.keys(CATEGORY_MAPPINGS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeywords) {
    if (searchText.includes(keyword)) {
      return CATEGORY_MAPPINGS[keyword];
    }
  }
  return DEFAULT_CATEGORY;
}

function truncateTitle(title) {
  if (!title) return '';
  if (title.length <= CONFIG.maxTitleLength) return title;
  return title.substring(0, CONFIG.maxTitleLength - 3) + '...';
}

function normalizeProductName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCatchAllProduct(name) {
  return CATCH_ALL_PRODUCT_NAMES.has(normalizeProductName(name));
}

function normalizeAttributeValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([x×])\s*/gi, ' x ')
    .trim();
}

function extractSize(title, variationName, description) {
  const variation = normalizeAttributeValue(variationName);
  const searchText = normalizeAttributeValue(`${title || ''} ${variationName || ''} ${description || ''}`);

  if (variation && !/^regular$/i.test(variation)) {
    if (/^(junior|regular|small|medium|large|extra large|one size)$/i.test(variation)) return variation;
    if (/^(xs|s|m|l|xl|xxl)$/i.test(variation)) return variation.toUpperCase();
    if (/^(?:uk\s*)?\d+(?:\s*[-–]\s*\d+)?$/i.test(variation)) return variation;
  }

  const patterns = [
    /\b(one size|one-size)\b/i,
    /\b(?:size|uk size|uk)\s*[:\-]?\s*((?:UK\s*)?\d+(?:\s*[-–]\s*\d+)?|XS|S|M|L|XL|XXL)\b/i,
    /\b(\d+\s*[-–]\s*\d+\s*(?:m|months|yrs|years))\b/i,
    /\b(?:dimensions?|measures?|measurement|card size|box size|napkin size|headband size|size)\s*[:\-]?\s*((?:\d+(?:\.\d+)?\s*(?:cm|mm|m|inch|in|")\s*(?:x|×)\s*){1,3}\d+(?:\.\d+)?\s*(?:cm|mm|m|inch|in|"))/i,
    /\b(?:height|diameter|approx(?:imately)?|measuring|measures|size)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:cm|mm|m|ml|l|oz|inch|in|"))\b/i,
  ];

  for (const pattern of patterns) {
    const match = searchText.match(pattern);
    if (match) return normalizeAttributeValue(match[1]).replace(/^one-size$/i, 'One size');
  }

  return null;
}

function extractColor(title, variationName, description) {
  const preferredText = `${title || ''} ${variationName || ''}`.toLowerCase();

  function findColors(text) {
    const found = [];
    for (const color of COLOR_KEYWORDS) {
      const pattern = new RegExp(`(^|[^a-z])${color.replace(/ /g, '\\s+')}(?=$|[^a-z])`, 'i');
      if (pattern.test(text) && !found.includes(color)) {
        found.push(color);
      }
    }
    return found;
  }

  const selected = findColors(preferredText);
  if (!selected.length) return null;

  return selected
    .slice(0, 3)
    .map(color => color.replace(/^./, char => char.toUpperCase()))
    .join('/');
}

function inferAgeGroup(title, squareCategory, googleCategory, description) {
  const text = `${title || ''} ${squareCategory || ''} ${googleCategory || ''} ${description || ''}`.toLowerCase();

  if (/\b(newborn|0\s*[-–]\s*3\s*m|up to 1 month|from birth)\b/.test(text)) return 'newborn';
  if (/\b(baby|infant|0\s*[-–]\s*6\s*m|6\s*[-–]\s*12\s*m)\b/.test(text)) return 'infant';
  if (/\b(toddler|1\s*[-–]\s*3\s*(?:years|yrs))\b/.test(text)) return 'toddler';
  if (/\b(kids?|children|childrens|junior|girls?|boys?|age\s*\d+\+|aged\s*\d+\+)\b/.test(text)) return 'kids';
  if (/apparel|accessories|jewelry|jewellery|clothing|bags|scarves|socks|gloves|hats/i.test(text)) return 'adult';

  return null;
}

function inferGender(title, squareCategory, googleCategory, description, ageGroup) {
  const text = `${title || ''} ${squareCategory || ''} ${googleCategory || ''} ${description || ''}`.toLowerCase();

  if (/\b(women|womens|ladies|lady|female|girl|girls)\b/.test(text)) return 'female';
  if (/\b(men|mens|male|boy|boys)\b/.test(text)) return 'male';
  if (ageGroup || /apparel|accessories|jewelry|jewellery|clothing|bags|scarves|socks|gloves|hats|baby|toddler|kids|children/i.test(text)) {
    return 'unisex';
  }

  return null;
}

// ─── Square API Data Fetching ────────────────────────────────────────────────

async function fetchAllCatalogItems() {
  console.log('📦 Fetching catalogue items from Square...');
  const items = [];
  let cursor = undefined;

  do {
    const response = await squareGet('/catalog/list', { types: 'ITEM', cursor });
    if (response.objects) {
      items.push(...response.objects);
    }
    cursor = response.cursor;
    process.stdout.write(`\r   Fetched ${items.length} items...`);
  } while (cursor);

  console.log(`\n   ✅ Total items fetched: ${items.length}`);
  return items;
}

async function fetchAllImages() {
  console.log('🖼️  Fetching image data from Square...');
  const images = {};
  let cursor = undefined;

  do {
    const response = await squareGet('/catalog/list', { types: 'IMAGE', cursor });
    if (response.objects) {
      for (const img of response.objects) {
        if (img.image_data && img.image_data.url) {
          images[img.id] = img.image_data.url;
        }
      }
    }
    cursor = response.cursor;
  } while (cursor);

  console.log(`   ✅ Total images fetched: ${Object.keys(images).length}`);
  return images;
}

async function fetchAllCategories() {
  console.log('📂 Fetching categories from Square...');
  const categories = {};
  let cursor = undefined;

  do {
    const response = await squareGet('/catalog/list', { types: 'CATEGORY', cursor });
    if (response.objects) {
      for (const cat of response.objects) {
        if (cat.category_data) {
          categories[cat.id] = cat.category_data.name;
        }
      }
    }
    cursor = response.cursor;
  } while (cursor);

  console.log(`   ✅ Total categories fetched: ${Object.keys(categories).length}`);
  return categories;
}

async function fetchInventoryCounts(variationIds) {
  console.log('📊 Fetching inventory counts...');
  const inventory = {};
  const batchSize = 100;

  for (let i = 0; i < variationIds.length; i += batchSize) {
    const batch = variationIds.slice(i, i + batchSize);
    try {
      const response = await squarePost('/inventory/counts/batch-retrieve', {
        catalog_object_ids: batch,
      });
      if (response.counts) {
        for (const count of response.counts) {
          const qty = Math.max(0, Math.floor(parseFloat(count.quantity || '0')));
          const existing = inventory[count.catalog_object_id];
          if (!existing || qty > 0) {
            inventory[count.catalog_object_id] = {
              status: qty > 0 ? 'in_stock' : 'out_of_stock',
              quantity: qty,
            };
          }
        }
      }
    } catch (err) {
      // Inventory API may not be enabled — default to in_stock
      if (i === 0) {
        console.log(`\n   ⚠️  Could not fetch inventory (this is OK if inventory tracking is not enabled)`);
      }
    }
    process.stdout.write(`\r   Checked inventory for ${Math.min(i + batchSize, variationIds.length)} / ${variationIds.length} variations...`);
  }

  console.log(`\n   ✅ Inventory data collected`);
  return inventory;
}

// ─── Feed Generation ─────────────────────────────────────────────────────────

function generateFeedEntry(item, variation, images, categories, inventory) {
  const itemData = item.item_data;
  if (!itemData) return null;

  const varData = variation.item_variation_data;
  if (!varData) return null;

  // Price
  const priceMoney = varData.price_money;
  const price = priceMoney ? formatPrice(priceMoney.amount, priceMoney.currency) : null;

  // Product identifiers
  const itemId = variation.id;
  const sku = varData.sku || null;

  // Title
  let title = itemData.name || '';
  const variationName = varData.name || '';
  if (variationName && variationName.toLowerCase() !== 'regular' && variationName.toLowerCase() !== title.toLowerCase()) {
    title = `${title} - ${variationName}`;
  }

  // Description
  const description = stripHtml(itemData.description) || title;

  // Images
  const imageIds = itemData.image_ids || [];
  const imageUrls = imageIds.map(id => images[id]).filter(Boolean);
  const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;
  const additionalImages = imageUrls.slice(1);

  // Category
  const categoryId = itemData.category_id;
  // Also check for reporting_category and categories (newer Square API)
  let squareCategory = categoryId ? categories[categoryId] : null;
  if (!squareCategory && itemData.categories) {
    for (const catRef of itemData.categories) {
      if (categories[catRef.id]) {
        squareCategory = categories[catRef.id];
        break;
      }
    }
  }
  const googleCategory = mapToGoogleCategory(title, squareCategory);
  const size = extractSize(title, variationName, description);
  const color = extractColor(title, variationName, description);
  const ageGroup = inferAgeGroup(title, squareCategory, googleCategory, description);
  const gender = inferGender(title, squareCategory, googleCategory, description, ageGroup);

  // Availability
  const inventoryData = inventory[variation.id];
  const availability = inventoryData ? inventoryData.status : 'in_stock';
  const quantity = inventoryData ? inventoryData.quantity : null;

  // Product URL
  const productUrl = buildProductUrl(itemData.name, item.id);

  // Build XML
  let entry = '    <item>\n';
  entry += `      <g:id>${escapeXml(itemId)}</g:id>\n`;
  entry += `      <title>${escapeXml(truncateTitle(title))}</title>\n`;
  entry += `      <g:description>${escapeXml(description.substring(0, 5000))}</g:description>\n`;
  entry += `      <link>${escapeXml(productUrl)}</link>\n`;

  if (primaryImage) {
    entry += `      <g:image_link>${escapeXml(primaryImage)}</g:image_link>\n`;
  }
  for (const addImg of additionalImages.slice(0, 10)) {
    entry += `      <g:additional_image_link>${escapeXml(addImg)}</g:additional_image_link>\n`;
  }

  entry += `      <g:availability>${availability}</g:availability>\n`;
  if (quantity !== null) {
    entry += `      <g:quantity>${quantity}</g:quantity>\n`;
  }

  if (price) {
    entry += `      <g:price>${escapeXml(price)}</g:price>\n`;
  }

  entry += `      <g:condition>${CONFIG.condition}</g:condition>\n`;
  entry += `      <g:brand>${escapeXml(CONFIG.defaultBrand)}</g:brand>\n`;
  entry += `      <g:identifier_exists>no</g:identifier_exists>\n`;

  if (sku) {
    entry += `      <g:mpn>${escapeXml(sku)}</g:mpn>\n`;
  }

  if (color) {
    entry += `      <g:color>${escapeXml(color)}</g:color>\n`;
  }

  if (size) {
    entry += `      <g:size>${escapeXml(size)}</g:size>\n`;
  }

  if (ageGroup) {
    entry += `      <g:age_group>${ageGroup}</g:age_group>\n`;
  }

  if (gender) {
    entry += `      <g:gender>${gender}</g:gender>\n`;
  }

  entry += `      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>\n`;
  if (squareCategory) {
    entry += `      <g:product_type>${escapeXml(squareCategory)}</g:product_type>\n`;
  }

  entry += `      <g:shipping>\n`;
  entry += `        <g:country>${CONFIG.shippingCountry}</g:country>\n`;
  entry += `        <g:service>${CONFIG.shippingService}</g:service>\n`;
  entry += `        <g:price>${CONFIG.shippingPrice}</g:price>\n`;
  entry += `      </g:shipping>\n`;

  entry += '    </item>\n';

  return {
    xml: entry,
    issues: {
      id: itemId,
      title: title,
      missingImage: !primaryImage,
      missingPrice: !price,
      missingDescription: !itemData.description,
      titleTooLong: (title.length > CONFIG.maxTitleLength),
      googleCategory: googleCategory,
      categoryMapped: googleCategory !== DEFAULT_CATEGORY,
      hasColor: Boolean(color),
      hasSize: Boolean(size),
      hasAgeGroup: Boolean(ageGroup),
      hasGender: Boolean(gender),
    }
  };
}

function buildFeedXml(entries) {
  const now = new Date().toUTCString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '  <channel>\n';
  xml += `    <title>${escapeXml(CONFIG.shopName)} Product Feed</title>\n`;
  xml += `    <link>${escapeXml(CONFIG.shopUrl)}</link>\n`;
  xml += `    <description>${escapeXml(CONFIG.shopDescription)}</description>\n`;
  xml += `    <lastBuildDate>${now}</lastBuildDate>\n`;
  xml += '\n';

  for (const entry of entries) {
    xml += entry;
  }

  xml += '  </channel>\n';
  xml += '</rss>\n';

  return xml;
}

// ─── Issues Report ───────────────────────────────────────────────────────────

function generateIssuesReport(allIssues) {
  const now = new Date().toISOString();

  const missingImages = allIssues.filter(i => i.missingImage);
  const missingPrices = allIssues.filter(i => i.missingPrice);
  const missingDescriptions = allIssues.filter(i => i.missingDescription);
  const longTitles = allIssues.filter(i => i.titleTooLong);
  const unmappedCategories = allIssues.filter(i => !i.categoryMapped);
  const withColor = allIssues.filter(i => i.hasColor);
  const withSize = allIssues.filter(i => i.hasSize);
  const withAgeGroup = allIssues.filter(i => i.hasAgeGroup);
  const withGender = allIssues.filter(i => i.hasGender);

  let report = '';
  report += '===============================================================\n';
  report += '  GOOGLE MERCHANT CENTRE FEED - ISSUES REPORT\n';
  report += `  Generated: ${now}\n`;
  report += `  The Rowan Tree - rowantreegifts.co.uk\n`;
  report += '===============================================================\n\n';

  report += `SUMMARY\n`;
  report += `-------\n`;
  report += `Total products in feed:           ${allIssues.length}\n`;
  report += `Products missing images:          ${missingImages.length}\n`;
  report += `Products missing prices:          ${missingPrices.length}\n`;
  report += `Products missing descriptions:    ${missingDescriptions.length}\n`;
  report += `Products with titles too long:    ${longTitles.length}\n`;
  report += `Products using default category:  ${unmappedCategories.length}\n`;
  report += `Products with colour supplied:    ${withColor.length}\n`;
  report += `Products with size supplied:      ${withSize.length}\n`;
  report += `Products with age group supplied: ${withAgeGroup.length}\n`;
  report += `Products with gender supplied:    ${withGender.length}\n`;
  report += '\n';

  if (missingImages.length > 0) {
    report += `\nPRODUCTS MISSING IMAGES (${missingImages.length})\n`;
    report += `${'─'.repeat(60)}\n`;
    report += `These products have no image and will likely be rejected by Google.\n`;
    report += `Please add images in your Square Dashboard.\n\n`;
    for (const item of missingImages.slice(0, 200)) {
      report += `  - [${item.id}] ${item.title}\n`;
    }
    if (missingImages.length > 200) report += `  ... and ${missingImages.length - 200} more\n`;
  }

  if (missingPrices.length > 0) {
    report += `\nPRODUCTS MISSING PRICES (${missingPrices.length})\n`;
    report += `${'─'.repeat(60)}\n`;
    report += `These products have no price set and will be rejected by Google.\n`;
    report += `Please add prices in your Square Dashboard.\n\n`;
    for (const item of missingPrices.slice(0, 200)) {
      report += `  - [${item.id}] ${item.title}\n`;
    }
    if (missingPrices.length > 200) report += `  ... and ${missingPrices.length - 200} more\n`;
  }

  if (missingDescriptions.length > 0) {
    report += `\nPRODUCTS MISSING DESCRIPTIONS (${missingDescriptions.length})\n`;
    report += `${'─'.repeat(60)}\n`;
    report += `These products have no description. Google may still accept them,\n`;
    report += `but adding descriptions will improve your listings.\n\n`;
    for (const item of missingDescriptions.slice(0, 200)) {
      report += `  - [${item.id}] ${item.title}\n`;
    }
    if (missingDescriptions.length > 200) report += `  ... and ${missingDescriptions.length - 200} more\n`;
  }

  if (longTitles.length > 0) {
    report += `\nPRODUCTS WITH TITLES TOO LONG (${longTitles.length})\n`;
    report += `${'─'.repeat(60)}\n`;
    report += `Google limits titles to ${CONFIG.maxTitleLength} characters. These have been\n`;
    report += `automatically truncated in the feed, but you may want to shorten them.\n\n`;
    for (const item of longTitles.slice(0, 200)) {
      report += `  - [${item.id}] ${item.title}\n`;
    }
    if (longTitles.length > 200) report += `  ... and ${longTitles.length - 200} more\n`;
  }

  if (unmappedCategories.length > 0) {
    report += `\nPRODUCTS USING DEFAULT GOOGLE CATEGORY (${unmappedCategories.length})\n`;
    report += `${'─'.repeat(60)}\n`;
    report += `These products couldn't be auto-mapped to a specific Google category\n`;
    report += `and are using the default: "${DEFAULT_CATEGORY}"\n`;
    report += `This is OK but more specific categories may improve visibility.\n\n`;
    for (const item of unmappedCategories.slice(0, 100)) {
      report += `  - ${item.title}\n`;
    }
    if (unmappedCategories.length > 100) report += `  ... and ${unmappedCategories.length - 100} more\n`;
  }

  report += '\n===============================================================\n';
  report += '  END OF REPORT\n';
  report += '===============================================================\n';

  return report;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('\n🌳 The Rowan Tree — Square → Google Merchant Centre Feed Generator');
  console.log('================================================================\n');

  if (!CONFIG.squareAccessToken) {
    console.error('❌ ERROR: SQUARE_ACCESS_TOKEN environment variable is not set.');
    console.error('Please set it before running:');
    console.error('  export SQUARE_ACCESS_TOKEN="your-token-here"\n');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('🧪 DRY RUN MODE — will test API connection only\n');
  }

  // Test connection
  try {
    const locationsResp = await squareGet('/locations');
    const locations = locationsResp.locations || [];
    console.log(`✅ Connected to Square! Found ${locations.length} location(s):`);
    for (const loc of locations) {
      console.log(`   - ${loc.name} (${loc.id})`);
    }
    console.log('');
  } catch (err) {
    console.error('❌ Failed to connect to Square API. Please check your access token.');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log('✅ Dry run complete — API connection works!\n');
    process.exit(0);
  }

  // Fetch all data in parallel
  const [items, images, categories] = await Promise.all([
    fetchAllCatalogItems(),
    fetchAllImages(),
    fetchAllCategories(),
  ]);

  // Collect all variation IDs for inventory lookup
  const variationIds = [];
  for (const item of items) {
    if (item.item_data && item.item_data.variations) {
      for (const v of item.item_data.variations) {
        variationIds.push(v.id);
      }
    }
  }

  // Fetch inventory
  const inventory = await fetchInventoryCounts(variationIds);

  // Generate feed entries
  console.log('\n📝 Generating feed entries...');
  const xmlEntries = [];
  const allIssues = [];
  let skipped = 0;
  let skippedCatchAll = 0;

  for (const item of items) {
    const itemData = item.item_data;
    if (!itemData) continue;

    // Skip archived items
    if (item.is_deleted || itemData.is_archived) {
      skipped++;
      continue;
    }

    if (isCatchAllProduct(itemData.name)) {
      skippedCatchAll++;
      continue;
    }

    const variations = itemData.variations || [];
    for (const variation of variations) {
      const result = generateFeedEntry(item, variation, images, categories, inventory);
      if (result) {
        xmlEntries.push(result.xml);
        allIssues.push(result.issues);
      }
    }
  }

  console.log(`   ✅ Generated ${xmlEntries.length} feed entries (skipped ${skipped} archived items)`);
  if (skippedCatchAll) {
    console.log(`   ✅ Excluded ${skippedCatchAll} catch-all placeholder products`);
  }

  // Build the full XML feed
  const feedXml = buildFeedXml(xmlEntries);

  // Generate issues report
  const issuesReport = generateIssuesReport(allIssues);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Write feed file
  const feedPath = path.join(CONFIG.outputDir, CONFIG.feedFileName);
  fs.writeFileSync(feedPath, feedXml, 'utf8');
  console.log(`\n📄 Feed written to: ${feedPath}`);
  console.log(`   Feed size: ${(feedXml.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total products: ${xmlEntries.length}`);

  // Write issues report
  const reportPath = path.join(CONFIG.outputDir, CONFIG.reportFileName);
  fs.writeFileSync(reportPath, issuesReport, 'utf8');
  console.log(`📋 Issues report written to: ${reportPath}`);

  // Write a simple index.html
  const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>The Rowan Tree - Product Feed</title>
  <meta http-equiv="refresh" content="0;url=feed.xml">
</head>
<body>
  <h1>The Rowan Tree — Google Merchant Centre Product Feed</h1>
  <p>Redirecting to <a href="feed.xml">feed.xml</a>...</p>
  <p><a href="issues-report.txt">View issues report</a></p>
  <p>Last updated: ${new Date().toISOString()}</p>
</body>
</html>`;
  fs.writeFileSync(path.join(CONFIG.outputDir, 'index.html'), indexHtml, 'utf8');

  // Print summary
  console.log('\n================================================================');
  console.log('  DONE! Feed generated successfully.');
  console.log('================================================================');

  const missingImages = allIssues.filter(i => i.missingImage).length;
  const missingPrices = allIssues.filter(i => i.missingPrice).length;
  const missingDescs = allIssues.filter(i => i.missingDescription).length;
  const longTitles = allIssues.filter(i => i.titleTooLong).length;
  const withColor = allIssues.filter(i => i.hasColor).length;
  const withSize = allIssues.filter(i => i.hasSize).length;
  const withAgeGroup = allIssues.filter(i => i.hasAgeGroup).length;
  const withGender = allIssues.filter(i => i.hasGender).length;

  console.log('\n📈 Visibility details supplied:');
  console.log(`   - ${withColor} products with colour`);
  console.log(`   - ${withSize} products with size`);
  console.log(`   - ${withAgeGroup} products with age group`);
  console.log(`   - ${withGender} products with gender`);

  if (missingImages || missingPrices || missingDescs || longTitles) {
    console.log('\n⚠️  Issues found:');
    if (missingImages) console.log(`   - ${missingImages} products missing images`);
    if (missingPrices) console.log(`   - ${missingPrices} products missing prices`);
    if (missingDescs) console.log(`   - ${missingDescs} products missing descriptions`);
    if (longTitles) console.log(`   - ${longTitles} products with titles too long`);
    console.log(`\n   See full details in: ${reportPath}`);
  } else {
    console.log('\n✅ No issues found — all products look good!');
  }

  console.log('');
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
