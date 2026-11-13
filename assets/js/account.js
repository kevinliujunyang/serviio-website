(() => {
  'use strict';
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  const el = id => document.getElementById(id);
  let session = null;
  let profileSaving = false;
  let menuCursor = '';
  let menuCount = 0;
  let menuGeneration = 0;
  let accessGeneration = 0;
  let menuBusy = 0;
  let pendingToken = new URLSearchParams(location.hash.slice(1)).get('token');
  // Remove the challenge before fetching or following any links. Landing never consumes it.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  const outcome = new URLSearchParams(location.search).get('square');
  if (outcome) history.replaceState(null, '', location.pathname);
  const messages = {
    unavailable: t('Account service is temporarily unavailable or has not been set up. Please try again later or contact info@serviio.ai.', '账户服务暂时不可用或尚未完成配置。请稍后重试，或联系 info@serviio.ai。'),
    invalid_token: t('This sign-in link has expired or was already used. Request a new link below.', '此登录链接已过期或已使用。请在下方重新获取链接。'),
    invalid_challenge: t('This sign-in link has expired or was already used. Request a new link below.', '此登录链接已过期或已使用。请在下方重新获取链接。'),
    rate_limited: t('Too many attempts. Please wait a few minutes and try again.', '尝试次数过多。请等待几分钟后重试。'),
    unauthorized: t('Your session has ended. Please sign in again.', '登录已过期，请重新登录。'),
    invalid_email: t('Enter a valid email address.', '请输入有效的电子邮箱地址。'),
    restaurant_required: t('Save your restaurant details before connecting Square.', '请先保存餐厅资料，再连接 Square。'),
    merchant_already_connected: t('This Square account is already connected to another Serviio account. Contact support for help.', '此 Square 账户已连接到另一个 Serviio 账户。请联系客服。'),
    invalid_location: t('This location is unavailable. Refresh the locations and choose an active location.', '该门店不可用。请刷新门店列表并选择营业中的门店。'),
    reconnect_required: t('Square access needs to be renewed. Reconnect your account.', '需要重新授权 Square，请重新连接账户。')
  };
  messages.permissions_required = t('Reconnect Square and approve menu, order, and hosted-checkout access.', '请重新连接 Square 并授权菜单、订单和托管结账访问。');
  messages.invalid_order = t('Check the catalog items, quantities, modifiers, and pickup details.', '请检查菜单项目、数量、选项和取餐信息。');
  messages.unsupported_menu = t('This menu configuration needs additional setup before checkout.', '此菜单配置尚需额外设置才能结账。');
  messages.authentication_required = messages.unauthorized;
  messages.square_setup = t('Square connection is not available yet. Serviio must finish its Square setup.', 'Square 连接暂不可用，Serviio 尚需完成 Square 配置。');
  messages.configuration_unavailable = messages.unavailable;
  messages.email_unavailable = messages.unavailable;
  messages.service_unavailable = messages.unavailable;
  messages.merchant_mismatch = t('Disconnect the existing Square account before connecting a different Square account.', '请先断开现有 Square 账户的连接，再连接其他 Square 账户。');
  messages.invalid_link = messages.invalid_token;
  messages.square_reconnect_required = messages.reconnect_required;
  messages.square_unavailable = t('Square is temporarily unavailable. Please try again.', 'Square 暂时不可用，请重试。');
  messages.connection_busy = t('Another connection update is in progress. Please wait and try again.', '另一项连接更新正在进行中，请稍后重试。');
  messages.invalid_restaurant = t('Check your restaurant name, contact name, and phone number, then save again.', '请检查餐厅名称、联系人姓名和电话号码后重新保存。');
  messages.forbidden = t('This request could not be verified. Refresh the account page and try again.', '无法验证此请求。请刷新账户页面后重试。');
  const fallback = t('We could not complete that request. Please try again. Your entered details have been kept.', '未能完成此操作，请重试。您填写的资料已保留。');
  function notice(message, error = false) {
    el('notice').textContent = message;
    el('notice').hidden = !message;
    el('notice').setAttribute('data-error', String(error));
  }
  function signedOut() {
    session = null;
    accessGeneration++; resetMenu(); updateMenuButtons();
    el('refresh-permissions').disabled = true;
    el('sign-in-panel').hidden = false;
    el('workspace').hidden = true;
    el('logout').hidden = true;
  }
  async function api(path, data) {
    let response;
    const requestSession = session;
    try {
      response = await fetch('/api/account/' + path, {
        method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        ...(data === undefined ? {} : { body: JSON.stringify(data) })
      });
    } catch { throw new Error(fallback); }
    let body;
    try { body = await response.json(); } catch { throw new Error(response.status === 503 ? messages.unavailable : fallback); }
    if (!response.ok) {
      if (response.status === 401 && session === requestSession) signedOut();
      if (path.startsWith('square/') && body.error === 'configuration_unavailable') throw new Error(messages.square_setup);
      throw new Error(messages[body.error] || (response.status === 503 ? messages.unavailable : fallback));
    }
    return body;
  }
  async function action(buttonId, run) {
    const button = el(buttonId);
    if (button.disabled) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    notice('');
    if (buttonId === 'connect-square') el('square-notice').hidden = true;
    try { await run(); } catch (error) {
      const target = { 'connect-square': 'square-notice', 'refresh-permissions': 'access-status', 'load-menu': 'menu-status', 'more-menu': 'menu-status' }[buttonId];
      if (target) { el(target).textContent = error.message || fallback; el(target).hidden = false; }
      else notice(error.message || fallback, true);
    }
    finally {
      button.disabled = false; button.setAttribute('aria-busy', 'false');
      if (['load-menu','more-menu'].includes(buttonId)) updateMenuButtons();
      if (buttonId === 'refresh-permissions') button.disabled = session?.connection?.status !== 'connected';
    }
  }
  function profileValues() {
    return { name: el('restaurant-name').value.trim(), contact_name: el('contact-name').value.trim(), phone: el('phone').value.trim() };
  }
  function profileIsSaved() {
    const current = profileValues();
    return Boolean(session?.restaurant) && Object.keys(current).every(key => current[key] === session.restaurant[key]);
  }
  function renderProfileState() {
    const saved = profileIsSaved();
    const button = el('save-profile');
    button.disabled = profileSaving || saved;
    button.textContent = profileSaving ? t('Saving…', '正在保存…') : saved ? t('Saved', '已保存') : session?.restaurant ? t('Save changes', '保存更改') : t('Save restaurant details', '保存餐厅资料');
    button.setAttribute('data-saved', String(saved && !profileSaving));
  }
  function renderConnection(connection) {
    const status = connection?.status || 'disconnected';
    const labels = {
      connected: t('Square connected', 'Square 已连接'),
      disconnected: t('Square not connected', '尚未连接 Square'),
      reconnect_required: t('Reconnect required', '需要重新连接'),
      renewal_failed: t('Connection renewal failed', '连接续期失败')
    };
    el('connection-status').textContent = labels[status] || t('Connection needs attention', '连接需要处理');
    el('connection-status').setAttribute('data-connected', String(status === 'connected'));
    el('connect-square').textContent = status === 'disconnected' ? t('Connect Square', '连接 Square') : t('Reconnect Square', '重新连接 Square');
    const connected = status === 'connected';
    el('locations-panel').hidden = !connected;
    el('disconnect-square').hidden = !connection || status === 'disconnected';
    el('disconnect-confirm').hidden = true;
    el('selected-location').textContent = connection?.location_id
      ? t('Selected location ID: ', '已选门店 ID：') + connection.location_id
      : t('No location selected yet.', '尚未选择门店。');
    el('connection-details').textContent = status === 'renewal_failed'
      ? t('We could not renew Square access. Reconnect to restore the connection.', '无法续期 Square 授权。请重新连接以恢复访问。')
      : status === 'reconnect_required' ? t('Square access has expired or was revoked. Authorize again to continue.', 'Square 授权已过期或被撤销，请重新授权。')
      : t('API access lets Serviio work with Square. Connecting alone does not submit orders or charge payments.', 'API 授权允许 Serviio 连接 Square；仅连接账户不会自动提交订单或扣款。');
    const dates = [];
    for (const [key, label] of [['verified_at', t('Last checked', '最近验证')], ['renewed_at', t('Last renewed', '最近续期')]]) {
      if (connection?.[key]) {
        const date = new Date(connection[key]);
        if (!Number.isNaN(date.getTime())) dates.push(label + ': ' + date.toLocaleString(zh ? 'zh-CN' : 'en-US'));
      }
    }
    el('connection-dates').textContent = dates.join(' · ');
    el('connect-square').disabled = !session?.restaurant || session?.square_configured === false;
    renderAccess(null);
    el('square-notice').textContent = session?.square_configured === false ? messages.square_setup : '';
    el('square-notice').hidden = session?.square_configured !== false;
  }
  function updateMenuButtons() {
    const allowed = session?.connection?.status === 'connected' && session.connection.location_id && session.square_access?.capabilities?.menu;
    el('load-menu').disabled = menuBusy > 0 || !allowed;
    el('more-menu').disabled = menuBusy > 0 || !allowed;
  }
  function resetMenu() {
    menuGeneration++;
    menuCursor = ''; menuCount = 0;
    el('menu-items').replaceChildren(); el('more-menu').hidden = true;
    el('menu-status').textContent = '';
  }
  function renderAccess(access) {
    if (!access) accessGeneration++;
    if (session) session.square_access = access;
    const connected = session?.connection?.status === 'connected';
    el('access-panel').hidden = !connected;
    el('refresh-permissions').disabled = !connected;
    updateMenuButtons();
    for (const [id, capability, label] of [['menu-access','menu',t('Menu access', '菜单访问')], ['orders-access','orders',t('Order access', '订单访问')], ['payments-access','checkout',t('Hosted checkout access', '托管结账访问')]]) {
      el(id).textContent = label + ': ' + (!access ? t('not checked', '尚未验证') : access.capabilities?.[capability] ? t('approved', '已授权') : t('approval needed', '需要授权'));
    }
    el('access-status').textContent = !access ? t('Check which API permissions Square has granted. Reconnect to approve any added permissions.', '请验证 Square 已授予的 API 权限；新增权限需要重新连接并批准。') : access.missing?.length ? t('Additional permissions are needed. Reconnect Square and approve access, then check again.', '需要额外权限。请重新连接 Square 并批准访问，然后再次验证。') : t('API permissions verified with Square. Voice ordering and live checkout still require their own setup and testing.', '已向 Square 验证 API 权限。语音点餐和实际结账仍需单独设置与测试。');
    resetMenu();
  }
  async function loadPermissions() {
    el('access-status').textContent = t('Checking permissions with Square…', '正在向 Square 验证权限…');
    const requestedSession = session; const generation = ++accessGeneration;
    try {
      const data = await api('square/permissions');
      if (session === requestedSession && generation === accessGeneration) renderAccess(data);
    } catch (error) { if (session === requestedSession && generation === accessGeneration) throw error; }
  }
  async function loadMenu(append = false) {
    if (!append) resetMenu();
    el('menu-status').textContent = t('Loading menu from Square…', '正在从 Square 加载菜单…');
    const requestedSession = session; const requestedLocation = session?.connection?.location_id;
    const generation = menuGeneration; menuBusy++; updateMenuButtons();
    try {
    const data = await api('square/menu' + (append && menuCursor ? '?cursor=' + encodeURIComponent(menuCursor) : ''));
    if (session !== requestedSession || generation !== menuGeneration || session?.connection?.location_id !== requestedLocation) return;
    const items = (data.objects || []).filter(object => object.type === 'ITEM');
    for (const object of items) {
      const row = document.createElement('li');
      const prices = (object.item_data?.variations || []).map(variation => {
        const details = variation.item_variation_data || {};
        const override = details.location_overrides?.find(location => location.location_id === requestedLocation);
        const money = override?.price_money || details.price_money;
        let amount = t('price varies', '价格另定');
        if (money && Number.isSafeInteger(money.amount) && typeof money.currency === 'string') {
          const formatter = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: money.currency });
          amount = formatter.format(money.amount / (10 ** formatter.resolvedOptions().maximumFractionDigits));
        }
        return [details.name, amount, override?.sold_out ? t('sold out', '已售罄') : ''].filter(Boolean).join(' · ');
      }).join('; ');
      row.textContent = (object.item_data?.name || t('Unnamed item', '未命名菜品')) + (prices ? ' — ' + prices : '');
      el('menu-items').append(row);
    }
    menuCount += items.length; menuCursor = data.cursor || '';
    el('more-menu').hidden = !menuCursor;
    el('menu-status').textContent = menuCount ? t(`${menuCount} menu item${menuCount === 1 ? '' : 's'} loaded from Square.`, `已从 Square 加载 ${menuCount} 个菜单项目。`) : t('No menu items were returned for this location.', '此门店未返回菜单项目。');
    } catch (error) {
      if (session === requestedSession && generation === menuGeneration && session?.connection?.location_id === requestedLocation) throw error;
    } finally { menuBusy--; updateMenuButtons(); }
  }
  async function loadLocations() {
    el('location').disabled = true;
    el('save-location').disabled = true;
    el('location-loading').textContent = t('Loading Square locations…', '正在加载 Square 门店…');
    try {
      const data = await api('square/locations');
      const options = [];
      const placeholder = document.createElement('option');
      placeholder.value = ''; placeholder.textContent = t('Choose an active location', '请选择营业中的门店'); options.push(placeholder);
      for (const item of data.locations || []) {
        if (item.status !== 'ACTIVE') continue;
        const option = document.createElement('option'); option.value = item.id;
        const address = typeof item.address === 'string' ? item.address : item.address ? [item.address.address_line_1, item.address.locality].filter(Boolean).join(', ') : '';
        option.textContent = item.name + (address ? ' · ' + address : ''); options.push(option);
      }
      el('location').replaceChildren(...options);
      el('location').value = session?.connection?.location_id || '';
      el('location').disabled = options.length < 2;
      el('save-location').disabled = options.length < 2;
      el('location-loading').textContent = options.length < 2 ? t('No active locations were returned by Square. Check your Square account, then refresh.', 'Square 未返回营业中的门店。请检查 Square 账户后刷新。') : t('Only active locations are available.', '仅显示营业中的门店。');
    } catch (error) {
      el('location-loading').textContent = t('Locations could not be loaded. Use Refresh locations to try again.', '无法加载门店，请点击刷新门店重试。');
      throw error;
    }
  }
  async function loadAccount({populate = true} = {}) {
    const data = await api('me');
    session = data;
    el('sign-in-panel').hidden = true; el('confirm-panel').hidden = true;
    el('workspace').hidden = false; el('logout').hidden = false;
    el('account-email').textContent = data.account.email;
    if (populate) {
      el('restaurant-name').value = data.restaurant?.name || '';
      el('contact-name').value = data.restaurant?.contact_name || '';
      el('phone').value = data.restaurant?.phone || '';
    }
    renderProfileState();
    renderConnection(data.connection);
    if (data.connection?.status === 'connected') await loadLocations();
  }
  el('sign-in-form').addEventListener('submit', event => {
    event.preventDefault();
    return action('sign-in-button', async () => {
      await api('sign-in', { email: el('email').value.trim(), locale: zh ? 'zh' : 'en' });
      notice(t('Check your email for a sign-in link. If delivery is available, it will arrive shortly. The link expires in 15 minutes.', '请查看邮箱中的登录链接。如可正常投递，邮件将很快送达。链接在 15 分钟后失效。'));
    });
  });
  el('confirm-sign-in').addEventListener('click', () => action('confirm-sign-in', async () => {
    if (!pendingToken) { signedOut(); el('confirm-panel').hidden = true; throw new Error(messages.invalid_token); }
    try { await api('verify', { token: pendingToken }); pendingToken = null; await loadAccount(); notice(t('You are signed in.', '登录成功。')); }
    catch (error) { signedOut(); el('confirm-panel').hidden = !pendingToken; throw error; }
  }));
  el('profile-form').addEventListener('input', renderProfileState);
  el('profile-form').addEventListener('submit', event => {
    event.preventDefault();
    return action('save-profile', async () => {
      const profile = profileValues();
      profileSaving = true; renderProfileState();
      await api('restaurant', profile);
      session.restaurant = profile;
      el('connect-square').disabled = session.square_configured === false;
      notice(profileIsSaved() ? t('Restaurant details saved.', '餐厅资料已保存。') : t('Earlier changes saved. You have unsaved changes.', '先前的更改已保存，当前仍有未保存的更改。'));
    }).finally(() => { profileSaving = false; renderProfileState(); });
  });
  el('connect-square').addEventListener('click', () => action('connect-square', async () => {
    const data = await api('square/connect', { locale: zh ? 'zh' : 'en' });
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || !['connect.squareup.com', 'connect.squareupsandbox.com'].includes(url.hostname) || url.pathname !== '/oauth2/authorize' || url.username || url.password) throw new Error(fallback);
    location.assign(url.href);
  }));
  el('location-form').addEventListener('submit', event => {
    event.preventDefault();
    return action('save-location', async () => {
      const locationId = el('location').value;
      if (!locationId) throw new Error(messages.invalid_location);
      await api('square/location', {location_id: locationId});
      session.connection.location_id = locationId;
      renderAccess(session.square_access);
      el('selected-location').textContent = t('Selected location ID: ', '已选门店 ID：') + locationId;
      notice(t('Square location saved. Ordering is not activated.', 'Square 门店已保存，点餐服务尚未开通。'));
    });
  });
  el('refresh-permissions').addEventListener('click', () => action('refresh-permissions', loadPermissions));
  el('load-menu').addEventListener('click', () => action('load-menu', () => loadMenu()));
  el('more-menu').addEventListener('click', () => action('more-menu', () => loadMenu(true)));
  el('refresh-locations').addEventListener('click', () => action('refresh-locations', loadLocations));
  el('disconnect-square').addEventListener('click', () => { el('disconnect-confirm').hidden = false; el('confirm-disconnect').focus(); });
  el('cancel-disconnect').addEventListener('click', () => { el('disconnect-confirm').hidden = true; el('disconnect-square').focus(); });
  el('confirm-disconnect').addEventListener('click', () => action('confirm-disconnect', async () => {
    await api('square/disconnect', {}); session.connection = null; renderConnection(null);
    notice(t('Square disconnected. Serviio no longer has access through this connection.', '已断开 Square，Serviio 将无法再通过此连接访问您的账户。'));
  }));
  el('logout').addEventListener('click', () => action('logout', async () => {
    await api('logout', {}); signedOut(); notice(t('You are signed out.', '您已退出登录。'));
  }));
  el('retry-account').addEventListener('click', () => action('retry-account', () => loadAccount()));
  signedOut();
  el('confirm-panel').hidden = !pendingToken;
  el('sign-in-panel').hidden = Boolean(pendingToken);
  el('loading').hidden = Boolean(pendingToken);
  if (!pendingToken) {
    loadAccount().then(() => {
      if (outcome === 'connected' && session?.connection?.status === 'connected') notice(t('Square authorization received. Choose a location below to finish connecting.', '已收到 Square 授权。请在下方选择门店以完成连接。'));
      else if (outcome === 'denied') notice(t('Square access was not granted. You can try connecting again.', '未获得 Square 授权，您可以重新尝试连接。'), true);
      else if (outcome === 'error') notice(t('Square could not be connected. Please try again or contact support.', '无法连接 Square。请重试或联系客服。'), true);
    }).catch(error => {
      // An unauthenticated visitor sees the sign-in form without a session-expired alarm.
      if (error.message !== messages.unauthorized) notice(error.message, true);
    }).finally(() => { el('loading').hidden = true; });
  }
})();
