(function () {
  var params = new URLSearchParams(window.location.search);
  var attributionFields = {
    landing_page: window.location.href,
    landing_path: window.location.pathname,
    referrer: document.referrer || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
    gclid: params.get('gclid') || '',
    msclkid: params.get('msclkid') || '',
  };

  function ensureHiddenField(form, name, value) {
    var field = form.querySelector('input[name="' + name + '"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      form.appendChild(field);
    }
    if (!field.value) field.value = value;
  }

  document.querySelectorAll('form[action*="formspree.io"]').forEach(function (form) {
    Object.keys(attributionFields).forEach(function (name) {
      ensureHiddenField(form, name, attributionFields[name]);
    });
  });
})();
