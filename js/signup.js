// MMT — Signup form → Airtable direct API
// Real-time referral code validation + full field validation

const AIRTABLE_TOKEN      = 'patQnkHCylQhZUFwq.40b951b3d00fb8b97f2af61018b420e1e21743090cb3e69601134f6c640100c8';
const AIRTABLE_BASE_ID    = 'appFgDvKVR05JBx3g';
const AIRTABLE_TABLE      = 'tbl6KVpFjVsnTWajG';
const REFERRAL_TABLE      = 'tblfmTwHjEw6Pld5F';

document.addEventListener('DOMContentLoaded', () => {
  const panels  = document.querySelectorAll('.step-panel');
  const steps   = document.querySelectorAll('.step-item');
  const formData = {};

  function goTo(key) {
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === key));
    steps.forEach(s => {
      const n = parseInt(s.dataset.step);
      const t = parseInt(key);
      s.classList.toggle('active', s.dataset.step === key);
      s.classList.toggle('done', !isNaN(n) && !isNaN(t) && n < t);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Validate referral code against Airtable ──
  async function validateReferralCode(code) {
    try {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${REFERRAL_TABLE}?filterByFormula={Code}="${code.toUpperCase()}"`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      const data = await res.json();
      return data.records && data.records.length > 0;
    } catch (e) {
      console.error('Code validation error:', e);
      return false;
    }
  }

  // ── Validation rules per step ──
  function validatePanelBasic(num) {
    const panel = document.querySelector(`.step-panel[data-panel="${num}"]`);
    const errors = [];

    if (num === '1') {
      const refCode = panel.querySelector('#ref-code')?.value.trim();
      const name    = panel.querySelector('#full-name')?.value.trim();
      const email   = panel.querySelector('#email')?.value.trim();
      const phone   = panel.querySelector('#phone')?.value.trim();
      if (!refCode) errors.push('Referral code is required.');
      if (!name)    errors.push('Your name is required.');
      if (!email)   errors.push('Your email is required.');
      if (!phone)   errors.push('Your phone number is required.');
    }

    if (num === '2') {
      const birthday = panel.querySelector('#birthday')?.value.trim();
      const zodiac   = panel.querySelector('#zodiac')?.value.trim();
      const pets     = panel.querySelector('#pets')?.value.trim();
      const aboutMe  = panel.querySelector('#about-me')?.value.trim();
      const hobbies  = panel.querySelectorAll('.tag-opt.active');
      const travel   = panel.querySelector('#travel-plans')?.value.trim();
      if (!birthday)            errors.push('Birthday is required.');
      if (!zodiac)              errors.push('Zodiac sign is required.');
      if (!pets)                errors.push('Pets field is required (enter "none" if applicable).');
      if (!aboutMe)             errors.push('Please tell us a bit about yourself.');
      if (hobbies.length === 0) errors.push('Please select at least one hobby.');
      if (!travel)              errors.push('Please share your upcoming travel plans.');
    }

    if (num === '3') {
      panel.querySelectorAll('.tot-row').forEach(row => {
        const label  = row.querySelector('.tot-label')?.textContent?.trim();
        const active = row.querySelector('.tot-opt.active');
        if (!active) errors.push(`Please answer: ${label}`);
      });
    }

    if (num === '4') {
      const style     = panel.querySelector('input[name="home-style"]:checked');
      const messageMe = panel.querySelector('#message-me')?.value.trim();
      if (!style)     errors.push('Please select your home style.');
      if (!messageMe) errors.push('Please fill in the "Message me about" field.');
    }

    if (num === '5') {
      const homeType = panel.querySelector('#home-type')?.value.trim();
      const city     = panel.querySelector('#host-city')?.value.trim();
      const bio      = panel.querySelector('#host-bio')?.value.trim();
      const disc1    = panel.querySelector('#disc-1');
      const disc2    = panel.querySelector('#disc-2');
      if (!homeType) errors.push('Please select your home type.');
      if (!city)     errors.push('Your city is required.');
      if (!bio)      errors.push('Please write a bio for your host profile.');
      if (!disc1?.checked) errors.push('Please agree to the founding member statement.');
      if (!disc2?.checked) errors.push('Please agree to the profile & matching statement.');
    }

    return errors;
  }

  function showErrors(errors, panelNum) {
    const existing = document.querySelector('.validation-errors');
    if (existing) existing.remove();
    if (errors.length === 0) return true;
    const panel = document.querySelector(`.step-panel[data-panel="${panelNum}"]`);
    const box = document.createElement('div');
    box.className = 'validation-errors';
    box.innerHTML = errors.map(e => `<p>· ${e}</p>`).join('');
    const nav = panel.querySelector('.step-nav');
    if (nav) panel.insertBefore(box, nav);
    else panel.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  function clearErrors() {
    const existing = document.querySelector('.validation-errors');
    if (existing) existing.remove();
  }

  function collectPanel(num) {
    const panel = document.querySelector(`.step-panel[data-panel="${num}"]`);
    if (!panel) return;
    panel.querySelectorAll('input, textarea, select').forEach(el => {
      if (!el.id) return;
      if (el.type === 'checkbox') { formData[el.id] = el.checked ? 'Agreed' : 'Not agreed'; return; }
      if (el.type === 'radio') {
        if (el.checked) {
          const label = el.closest('.style-opt')?.querySelector('.style-name')?.textContent;
          if (label) formData['home-style'] = label;
        }
        return;
      }
      formData[el.id] = el.value;
    });
    const tags = Array.from(panel.querySelectorAll('.tag-opt.active')).map(t => t.textContent.trim());
    if (tags.length) formData.hobbies = tags.join(', ');
    panel.querySelectorAll('.tot-row').forEach(row => {
      const label  = row.querySelector('.tot-label')?.textContent?.trim();
      const active = row.querySelector('.tot-opt.active');
      if (label && active) formData['tot_' + label] = active.textContent.trim();
    });
  }

  async function submitToAirtable() {
    const thisOrThat = Object.keys(formData)
      .filter(k => k.startsWith('tot_'))
      .map(k => `${k.replace('tot_', '')}: ${formData[k]}`)
      .join(' | ');

    const fields = {
      'Name':                 formData['full-name']    || '',
      'Email':                formData['email']         || '',
      'Phone':                formData['phone']         || '',
      'Referral Code':        formData['ref-code']      || '',
      'Referrer Email':       formData['ref-email']     || '',
      'Birthday':             formData['birthday']      || '',
      'Zodiac':               formData['zodiac']        || '',
      'Pets':                 formData['pets']          || '',
      'About Me':             formData['about-me']      || '',
      'Hobbies':              formData['hobbies']       || '',
      'Other Hobbies':        formData['other-hobbies'] || '',
      'Upcoming Travel':      formData['travel-plans']  || '',
      'Home Type':            formData['home-type']     || '',
      'Host City':            formData['host-city']     || '',
      'Home Style':           formData['home-style']    || '',
      'Message Me About':     formData['message-me']    || '',
      'This or That Answers': thisOrThat,
      'Referral Tier':        'Founding Member',
    };

    try {
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
      const data = await res.json();
      if (data.error) console.error('Airtable error:', data.error);
    } catch (e) {
      console.error('Submission error:', e);
    }

    goTo('done');
  }

  // ── Next buttons — validate then advance ──
  document.querySelectorAll('.next-btn').forEach(b => {
    b.addEventListener('click', async () => {
      const currentPanel = b.closest('.step-panel').dataset.panel;
      const errors = validatePanelBasic(currentPanel);

      // Extra: validate referral code on step 1
      if (currentPanel === '1' && errors.length === 0) {
        const code = document.querySelector('#ref-code')?.value.trim();
        b.textContent = 'Checking code...';
        b.disabled = true;
        const valid = await validateReferralCode(code);
        b.textContent = 'Continue →';
        b.disabled = false;
        if (!valid) {
          showErrors(['That referral code is not valid. Please check your code and try again.'], '1');
          return;
        }
      }

      if (!showErrors(errors, currentPanel)) return;
      clearErrors();
      collectPanel(currentPanel);
      goTo(b.dataset.next);
    });
  });

  // ── Back buttons ──
  document.querySelectorAll('.prev-btn').forEach(b => {
    b.addEventListener('click', () => {
      clearErrors();
      goTo(b.dataset.prev);
    });
  });

  // ── Hobby tags ──
  document.querySelectorAll('.tag-opt').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('active'));
  });

  // ── This or that ──
  document.querySelectorAll('.tot-toggle').forEach(g => {
    g.querySelectorAll('.tot-opt').forEach(o => {
      o.addEventListener('click', () => {
        g.querySelectorAll('.tot-opt').forEach(x => x.classList.remove('active'));
        o.classList.add('active');
      });
    });
  });

  // ── Final submit ──
  const finalForm = document.querySelector('form[data-panel="5"]');
  if (finalForm) {
    finalForm.addEventListener('submit', e => {
      e.preventDefault();
      const errors = validatePanelBasic('5');
      if (!showErrors(errors, '5')) return;
      clearErrors();
      collectPanel('5');
      submitToAirtable();
    });
  }
});
