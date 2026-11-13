import { squareRequest } from './square.mjs';

const TYPES = ['ITEM','MODIFIER_LIST','CATEGORY','TAX','DISCOUNT','IMAGE'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,192}$/.test(value);
function failure(code = 'invalid_order') {
  return Object.assign(new Error(code === 'invalid_order' ? 'The order is invalid or contains unsupported catalog options.' : code === 'invalid_location' ? 'The selected location is invalid.' : code === 'unsupported_menu' ? 'This catalog uses options that are not supported for online checkout.' : 'Square is temporarily unavailable.'), {code,status:code === 'square_unavailable' ? 503 : code === 'unsupported_menu' ? 409 : 400});
}
function location(value) { if (!identifier(value)) throw failure('invalid_location'); }
function keys(value, allowed) { if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))) throw failure(); }
function versionReference(object) {
  if (object.version === undefined) return {};
  if (!Number.isSafeInteger(object.version) || object.version < 0) throw failure('square_unavailable');
  return {catalog_version:object.version};
}
function quantity(value) { if (!Number.isInteger(value) || value < 1 || value > 99) throw failure(); }
function present(object, locationId) {
  return object.is_deleted !== true && (object.type === 'MODIFIER' || (object.present_at_all_locations !== false ? !(object.absent_at_location_ids || []).includes(locationId) : (object.present_at_location_ids || []).includes(locationId)));
}
function filterObject(object, locationId, expectedTypes = TYPES) {
  if (!record(object) || !identifier(object.id) || !expectedTypes.includes(object.type)) throw failure('square_unavailable');
  for (const field of ['present_at_all_locations','is_deleted']) if (object[field] !== undefined && typeof object[field] !== 'boolean') throw failure('square_unavailable');
  for (const field of ['present_at_location_ids','absent_at_location_ids']) if (object[field] !== undefined && (!Array.isArray(object[field]) || object[field].some(id => !identifier(id)))) throw failure('square_unavailable');
  if (!present(object,locationId)) return null;
  const field = `${object.type.toLowerCase()}_data`;
  if (!record(object[field])) throw failure('square_unavailable');
  const copy = {...object,[field]:{...object[field]}};
  const childField = object.type === 'ITEM' ? 'variations' : object.type === 'MODIFIER_LIST' ? 'modifiers' : null;
  if (childField) {
    const children = object[field][childField] ?? [];
    if (!Array.isArray(children)) throw failure('square_unavailable');
    copy[field][childField] = children.map(child => filterObject(child,locationId,[object.type === 'ITEM' ? 'ITEM_VARIATION' : 'MODIFIER'])).filter(Boolean);
  }
  return copy;
}

export async function listMenu(env, token, locationId, cursor = '', fetcher = fetch) {
  location(locationId);
  if (typeof cursor !== 'string' || cursor.length > 2048 || /[\x00-\x20\x7f]/.test(cursor)) throw failure();
  const query = new URLSearchParams({types:TYPES.join(',')});
  if (cursor) query.set('cursor',cursor);
  const data = await squareRequest(env,`/v2/catalog/list?${query}`,null,token,fetcher);
  if ((data.objects !== undefined && !Array.isArray(data.objects)) || (data.cursor !== undefined && (typeof data.cursor !== 'string' || data.cursor.length > 2048 || /[\x00-\x20\x7f]/.test(data.cursor)))) throw failure('square_unavailable');
  return {objects:(data.objects || []).map(object => filterObject(object,locationId)).filter(Boolean),cursor:data.cursor || ''};
}
function validateInput(input, pickup) {
  keys(input,['idempotency_key','line_items','buyer']);
  if (typeof input.idempotency_key !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(input.idempotency_key) || !Array.isArray(input.line_items) || input.line_items.length < 1 || input.line_items.length > 50) throw failure();
  for (const line of input.line_items) {
    keys(line,['catalog_object_id','quantity','modifiers','note']);
    if (!identifier(line.catalog_object_id)) throw failure();
    quantity(line.quantity);
    if (line.note !== undefined && (typeof line.note !== 'string' || line.note.length > 500 || /[\x00-\x08\x0b-\x1f\x7f]/.test(line.note))) throw failure();
    if (line.modifiers !== undefined && (!Array.isArray(line.modifiers) || line.modifiers.length > 50)) throw failure();
    const seen = new Set();
    for (const modifier of line.modifiers || []) {
      keys(modifier,['catalog_object_id','quantity']);
      if (!identifier(modifier.catalog_object_id) || seen.has(modifier.catalog_object_id)) throw failure();
      seen.add(modifier.catalog_object_id);quantity(modifier.quantity);
    }
  }
  if (pickup || input.buyer !== undefined) {
    keys(input.buyer,['name','phone']);
    if (typeof input.buyer.name !== 'string' || !input.buyer.name.trim() || input.buyer.name.length > 100 || /[\x00-\x1f\x7f]/.test(input.buyer.name) || typeof input.buyer.phone !== 'string' || !/^\+[1-9]\d{7,14}$/.test(input.buyer.phone)) throw failure();
  }
}
function money(value) { return record(value) && Number.isSafeInteger(value.amount) && value.amount >= 0 && /^[A-Z]{3}$/.test(value.currency); }
function catalogPrice(variation,locationId) {
  const data=variation.item_variation_data;
  if (data.sellable === false) throw failure();
  if (data.stockable_conversion || data.measurement_unit_id || data.pricing_type !== 'FIXED_PRICING') throw failure('unsupported_menu');
  if (data.location_overrides !== undefined && (!Array.isArray(data.location_overrides) || data.location_overrides.some(value => !record(value) || !identifier(value.location_id)))) throw failure('square_unavailable');
  const override=(data.location_overrides || []).find(value => value.location_id === locationId);
  if (override?.sold_out === true || (override?.pricing_type && override.pricing_type !== 'FIXED_PRICING') || !money(override?.price_money ?? data.price_money)) throw failure();
}
function modifiersFor(line,item,lists) {
  const requested = new Map((line.modifiers || []).map(modifier => [modifier.catalog_object_id,modifier]));
  const accepted = new Map();
  const infos=item.item_data.modifier_list_info ?? [];
  if (!Array.isArray(infos)) throw failure('square_unavailable');
  for (const info of infos) {
    if (!record(info)) throw failure('square_unavailable');
    if (info.enabled === false) continue;
    const list=lists.get(info.modifier_list_id)?.modifier_list_data;
    if (!list) throw failure();
    if ((info.modifier_overrides?.length) || (list.modifier_type && list.modifier_type !== 'LIST') || list.is_conversational || info.is_conversational === 'YES') throw failure('unsupported_menu');
    const allowQuantities = info.allow_quantities === 'YES' || ((info.allow_quantities === undefined || info.allow_quantities === 'NOT_SET') && list.allow_quantities === true);
    let min=info.min_selected_modifiers ?? -1, max=info.max_selected_modifiers ?? -1;
    if (min === -1 && max === -1) {
      min=list.min_selected_modifiers ?? 0;
      max=list.max_selected_modifiers ?? -1;
      if (max === -1) max=list.selection_type === 'SINGLE' ? 1 : 0;
    }
    if (![min,max].every(value => Number.isInteger(value) && value >= -1)) throw failure();
    min=Math.max(0,min);max=Math.max(0,max);
    let count=0;
    for (const modifier of list.modifiers) {
      const data=modifier.modifier_data;
      if (data.on_by_default) throw failure('unsupported_menu');
      if (data.modifier_list_id && data.modifier_list_id !== info.modifier_list_id) throw failure();
      const selected=requested.get(modifier.id);
      if (!selected) continue;
      if (accepted.has(modifier.id) || (!allowQuantities && selected.quantity !== 1) || !money(data.price_money)) throw failure();
      accepted.set(modifier.id,modifier);count+=selected.quantity;
    }
    if (count < min || max > 0 && count > max) throw failure();
  }
  if (accepted.size !== requested.size) throw failure();
  return [...requested.values()].map(modifier => ({catalog_object_id:modifier.catalog_object_id,...versionReference(accepted.get(modifier.catalog_object_id)),quantity:String(modifier.quantity)}));
}
async function buildOrder(env,token,locationId,input,pickup,fetcher) {
  location(locationId);validateInput(input,pickup);
  const objects=[], seen = new Set();let cursor='';
  for (let page=0;page<100;page++) {
    const result=await listMenu(env,token,locationId,cursor,fetcher);objects.push(...result.objects);
    if (!result.cursor) {cursor='';break;}
    if (seen.has(result.cursor)) throw failure('square_unavailable');
    seen.add(result.cursor);cursor=result.cursor;
  }
  if (cursor) throw failure('square_unavailable');
  const lists=new Map(objects.filter(object => object.type==='MODIFIER_LIST').map(object => [object.id,object]));
  const variations=new Map();
  for (const item of objects.filter(object => object.type==='ITEM')) for (const variation of item.item_data.variations) variations.set(variation.id,{item,variation});
  const line_items=input.line_items.map(line => {
    const found=variations.get(line.catalog_object_id);
    if (!found || found.variation.item_variation_data.item_id !== found.item.id || found.item.item_data.is_archived) throw failure();
    if (found.item.item_data.product_type !== undefined && found.item.item_data.product_type !== 'REGULAR') throw failure('unsupported_menu');
    catalogPrice(found.variation,locationId);
    const modifiers=modifiersFor(line,found.item,lists);
    return {catalog_object_id:line.catalog_object_id,...versionReference(found.variation),quantity:String(line.quantity),...(line.note !== undefined ? {note:line.note} : {}),...(modifiers.length ? {modifiers} : {})};
  });
  return {location_id:locationId,line_items,pricing_options:{auto_apply_taxes:true,auto_apply_discounts:false},...(pickup ? {fulfillments:[{type:'PICKUP',state:'PROPOSED',pickup_details:{schedule_type:'ASAP',recipient:{display_name:input.buyer.name,phone_number:input.buyer.phone}}}]} : {})};
}
function scoped(value,locationId) {
  if (!record(value)) throw failure('square_unavailable');
  if (value.location_id !== locationId) throw failure('invalid_location');
  return value;
}
export async function calculateCheckout(env,token,locationId,input,fetcher=fetch) {
  const order=await buildOrder(env,token,locationId,input,false,fetcher);
  const result=await squareRequest(env,'/v2/orders/calculate',{order},token,fetcher);
  return {order:scoped(result.order,locationId)};
}
export async function createCheckout(env,token,locationId,input,fetcher=fetch) {
  const order=await buildOrder(env,token,locationId,input,true,fetcher);
  const result=await squareRequest(env,'/v2/online-checkout/payment-links',{idempotency_key:input.idempotency_key,order},token,fetcher);
  const link=result.payment_link;let url;
  try { url=new URL(link?.url); } catch {throw failure('square_unavailable');}
  if (!identifier(link?.id) || !identifier(link?.order_id) || url.protocol !== 'https:' || url.username || url.password || url.port || !['square.link','checkout.square.site',...(env.SQUARE_ENVIRONMENT === 'sandbox' ? ['sandbox.square.link'] : [])].includes(url.hostname) || url.hash || url.search) throw failure('square_unavailable');
  return {id:link.id,order_id:link.order_id,url:url.href};
}
export async function getOrder(env,token,locationId,id,fetcher=fetch) {
  location(locationId);if (!identifier(id)) throw failure();
  return {order:scoped((await squareRequest(env,`/v2/orders/${encodeURIComponent(id)}`,null,token,fetcher)).order,locationId)};
}
export async function getPayment(env,token,locationId,id,fetcher=fetch) {
  location(locationId);if (!identifier(id)) throw failure();
  return {payment:scoped((await squareRequest(env,`/v2/payments/${encodeURIComponent(id)}`,null,token,fetcher)).payment,locationId)};
}
