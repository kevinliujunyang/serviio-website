
(function () {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('t');
  if (!params.has('t')) return;
  var panel = document.getElementById('outreach-confirmation');
  panel.hidden = false;
  document.querySelector('#message .home-message-grid').hidden = true;
  var zh = document.documentElement.lang === 'zh';
  panel.scrollIntoView({block: 'start'});
  var restaurant = (params.get('r') || '').slice(0, 200);
  var system = (params.get('s') || '').slice(0, 100);

  // GET only renders. The lead is submitted exclusively via the button POST
  // below. A simple GET or link preview does not create a lead.
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    document.getElementById('confirm-view').style.display = 'none';
    document.getElementById('invalid-view').style.display = 'block';
    return;
  }
  if (restaurant) {
    document.getElementById('for-rest').textContent = (zh ? '：' : ' for ') + restaurant;
  }
  var compat = system
    ? "Next: we'll check compatibility with your " + system + " system, then reach out to arrange setup."
    : "Next: we'll check compatibility with your ordering system, then reach out to arrange setup.";
  document.getElementById('next-step').textContent = compat;
  document.getElementById('success-msg').textContent = system
    ? "Kevin will check compatibility with your " + system + " system and contact you shortly to arrange setup."
    : "Kevin will contact you shortly to arrange setup.";

  if (zh) {
    document.getElementById('next-step').textContent = system ? '下一步：我们会确认与 ' + system + ' 的兼容性，然后联系您安排设置。' : '下一步：我们会确认您的点餐系统兼容性，然后联系您安排设置。';
    document.getElementById('success-msg').textContent = 'Kevin 会联系您确认系统兼容性并安排设置。';
  }
  var btn = document.getElementById('confirm-btn');
  btn.disabled = false;
  btn.addEventListener('click', function () {
    if (btn.disabled) return;
    document.getElementById('err').style.display = 'none';
    btn.disabled = true;
    btn.textContent = zh ? '正在确认…' : 'Confirming…';
    var data = new FormData();
    data.append('token', token);
    if (restaurant) data.append('restaurant', restaurant);
    if (system) data.append('ordering_system', system);
    data.append('source', 'cold-email-one-click');
    data.append('_subject', 'New Serviio trial interest (one-click)');
    data.append('_gotcha', ''); // honeypot
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    fetch('https://formspree.io/f/xeeezpzn', {
      method: 'POST',
      signal: controller.signal,
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(function (resp) {
      if (!resp.ok) throw new Error('submit failed');
      clearTimeout(timeout);
      document.getElementById('confirm-view').style.display = 'none';
      document.getElementById('success-view').style.display = 'block';
      document.getElementById('success-view').focus();
    }).catch(function () {
      clearTimeout(timeout);
      btn.disabled = false;
      btn.textContent = zh ? '好的，请联系我 →' : 'Yes, contact me →';
      var e = document.getElementById('err');
      e.style.display = 'block';
      e.textContent = 'Something went wrong — please try again or email info@serviio.ai.';
    });
  });
})();
