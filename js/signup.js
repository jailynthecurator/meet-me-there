// MMT — Signup form → Airtable direct API

const AIRTABLE_TOKEN   = 'patQnkHCylQhZUFwq.40b951b3d00fb8b97f2af61018b420e1e21743090cb3e69601134f6c640100c8';
const AIRTABLE_BASE_ID = 'appFgDvKVR05JBx3g';
const AIRTABLE_TABLE   = 'tbl6KVpFjVsnTWajG';

document.addEventListener('DOMContentLoaded', () => {
  const panels   = document.querySelectorAll('.step-panel');
  const steps    = document.querySelectorAll('.step-item');
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

    // Field names match Airtable columns EXACTLY
    const fields = {
      'Name':                  formData['full-name']    || '',
      'Email':                 formData['email']         || '',
      'Phone':                 formData['phone']         || '',
      'Referral Code':         formData['ref-code']      || '',
      'Referrer Email':        formData['ref-email']     || '',
      'Birthday':              formData['birthday']      || '',
      'Zodiac':                formData['zodiac']        || '',
      'Pets':                  formData['pets']          || '',
      'About Me':              formData['about-me']      || '',
      'Hobbies':               formData['hobbies']       || '',
      'Other Hobbies':         formData['other-hobbies'] || '',
      'Upcoming Travel':       formData['travel-plans']  || '',
      'Home Type':             formData['home-type']     || '',
      'Host City':             formData['host-city']     || '',
      'Home Style':            formData['home-style']    || '',
      'Message Me About':      formData['message-me']    || '',
      'This or That Answers':  thisOrThat,
      'Referral Tier':         'Founding Member',
    };

    console.log('Submitting to Airtable:', fields);

    try {
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ fields })
      });

      const data = await res.json();
      console.log('Airtable response:', data);

      if (data.error) {
        console.error('Airtable error:', data.error);
      }
    } catch (e) {
      console.error('Submission error:', e);
    }

    goTo('done');
  }

  document.querySelectorAll('.next-btn').forEach(b => {
    b.addEventListener('click', () => {
      collectPanel(b.closest('.step-panel').dataset.panel);
      goTo(b.dataset.next);
    });
  });

  document.querySelectorAll('.prev-btn').forEach(b => {
    b.addEventListener('click', () => goTo(b.dataset.prev));
  });

  document.querySelectorAll('.tag-opt').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('active'));
  });

  document.querySelectorAll('.tot-toggle').forEach(g => {
    g.querySelectorAll('.tot-opt').forEach(o => {
      o.addEventListener('click', () => {
        g.querySelectorAll('.tot-opt').forEach(x => x.classList.remove('active'));
        o.classList.add('active');
      });
    });
  });

  const finalForm = document.querySelector('form[data-panel="5"]');
  if (finalForm) {
    finalForm.addEventListener('submit', e => {
      e.preventDefault();
      collectPanel('5');
      const d1 = document.getElementById('disc-1');
      const d2 = document.getElementById('disc-2');
      if (!d1?.checked || !d2?.checked) {
        alert('Please agree to both statements before submitting.');
        return;
      }
      submitToAirtable();
    });
  }
});
