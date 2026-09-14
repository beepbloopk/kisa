/* Kisa: shared legal and informational modal (About, Privacy, Terms, FAQ, Cookies).
   Pair with assets/css/kisa-modal.css. Injects its own markup; no per-page HTML needed.
   Any <a href="/about|/privacy|/terms|/faq|/cookies"> on the page opens it. */
(function () {
  /* ---- Modal shell: injected once, so pages only need the script tag ---- */
  var MARKUP =
    '<div class="kisa-modal-backdrop" id="kisaModalBackdrop" aria-hidden="true"></div>' +
    '<div class="kisa-modal" id="kisaModal" role="dialog" aria-modal="true" aria-labelledby="kisaModalTitle" style="display:none;">' +
      '<div class="kisa-modal-inner">' +
        '<div class="kisa-modal-header">' +
          '<h2 class="kisa-modal-title" id="kisaModalTitle"></h2>' +
          '<button class="kisa-modal-close" id="kisaModalClose" aria-label="Close">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="kisa-modal-body" id="kisaModalBody"></div>' +
      '</div>' +
    '</div>';

  function ensureShell() {
    if (document.getElementById('kisaModal')) return;
    var host = document.createElement('div');
    host.innerHTML = MARKUP;
    while (host.firstChild) document.body.appendChild(host.firstChild);
  }

  var CONTENT = {
    about: {
      title: 'About Kisa',
      html: `
        <h3>Why Kisa Exists</h3>
        <p>Most neighbourhoods have the same handful of stray cats, and the same handful of people quietly looking after them. Someone leaves food out. Someone else knows the cat has been limping for a week. Usually, none of them know the others exist.</p>
        <p>Kisa gives that scattered care one shared place to live. Spot a cat, log a sighting, and it builds into a living profile the whole street can see.</p>
        <h3>How It Works</h3>
        <ul>
          <li><strong>Report a sighting</strong>: pin a location, add a photo, note how the cat looked.</li>
          <li><strong>Watch a profile grow</strong>: repeat sightings gather into one history per cat.</li>
          <li><strong>Raise an SOS</strong>: mark a cat as an emergency and nearby volunteers are alerted first.</li>
          <li><strong>Look after them together</strong>: like, comment, and flag when you have taken a cat in.</li>
        </ul>
        <h3>Who We Are</h3>
        <p>Kisa was built for #hackthekitty 2026 by people who kept meeting the same cats on the same streets and wanted somewhere to write it down. It is a community project, and it is better the more neighbours join in.</p>
        <h3>Get In Touch</h3>
        <p>Questions, ideas, or a bug to report? Reach us at <strong>hello@kisa.app</strong>, or use the contact page, we read every message.</p>
      `
    },
    privacy: {
      title: 'Privacy Policy',
      html: `
        <p class="kisa-modal-updated">Last updated: 1 July 2026</p>
        <h3>Who We Are</h3>
        <p>Kisa is a community platform for tracking, reporting, and supporting stray and community cats. We are committed to protecting your personal information and being transparent about how we use it.</p>
        <h3>Information We Collect</h3>
        <p>When you use Kisa, we may collect the following information:</p>
        <ul>
          <li>Account information you provide when registering (name, email address, profile photo)</li>
          <li>Sighting reports including location data, photos, and cat condition details you choose to submit</li>
          <li>Usage data such as pages visited, features used, and time spent on the platform</li>
          <li>Device information including browser type, operating system, and IP address</li>
          <li>Communications you send to us or post within the platform</li>
        </ul>
        <h3>How We Use Your Information</h3>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Operate and improve the Kisa platform and its features</li>
          <li>Display cat sightings on the live map and community feed</li>
          <li>Send notifications about sightings, rescues, or updates you have opted into</li>
          <li>Maintain platform safety and prevent misuse</li>
          <li>Respond to your support requests and enquiries</li>
          <li>Comply with our legal obligations</li>
        </ul>
        <h3>Location Data</h3>
        <p>If you choose to report a sighting using your live location, we collect the geographic coordinates you submit. You may also enter a location manually. We do not track your location continuously or in the background. Location data attached to sighting reports is visible to other platform users as part of the community map.</p>
        <h3>Photos and Uploads</h3>
        <p>Photos you upload are stored on our servers and may be visible to other users as part of sighting reports and cat profiles. We do not sell or license your uploaded content to third parties. You retain ownership of photos you upload and grant Kisa a non-exclusive licence to display them within the platform.</p>
        <h3>Data Sharing</h3>
        <p>We do not sell your personal data. We may share data with:</p>
        <ul>
          <li>Service providers who help us operate the platform (such as cloud hosting and analytics), under strict data processing agreements</li>
          <li>Law enforcement or regulatory bodies where required by law</li>
          <li>Other users, only for content you have chosen to make public (such as sighting reports and comments)</li>
        </ul>
        <h3>Data Retention</h3>
        <p>We retain your account data for as long as your account is active. If you delete your account, we will remove your personal information within 30 days, except where we are required by law to retain it. Sighting reports you have submitted may remain on the platform in anonymised form to preserve community cat history.</p>
        <h3>Your Rights</h3>
        <p>Depending on where you live, you may have the right to access, correct, or delete the personal data we hold about you. You may also have the right to object to certain processing or to request a copy of your data in a portable format. To exercise any of these rights, contact us at privacy@kisa.app.</p>
        <h3>Cookies</h3>
        <p>Kisa uses essential cookies to keep you signed in and maintain your session. We may also use analytics cookies to understand how the platform is used and improve it. You can control cookie preferences through your browser settings. Disabling essential cookies may affect platform functionality.</p>
        <h3>Security</h3>
        <p>We take reasonable technical and organisational measures to protect your data against unauthorised access, loss, or disclosure. However, no system is completely secure and we cannot guarantee absolute security.</p>
        <h3>Children</h3>
        <p>Kisa is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>
        <h3>Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes by email or via an in-platform notice. Continued use of Kisa after changes are posted constitutes acceptance of the updated policy.</p>
        <h3>Contact Us</h3>
        <p>For any privacy-related questions or requests, please contact us at privacy@kisa.app.</p>
      `
    },
    terms: {
      title: 'Terms of Service',
      html: `
        <p class="kisa-modal-updated">Last updated: 1 July 2026</p>
        <h3>Acceptance of Terms</h3>
        <p>By accessing or using Kisa, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform. We may update these terms from time to time and will notify you of material changes.</p>
        <h3>The Kisa Platform</h3>
        <p>Kisa is a community tool designed to help people report, track, and support stray and community cats in their neighbourhood. The platform allows users to submit sighting reports, view a live map of cat activity, and interact with others in the community feed.</p>
        <h3>Eligibility</h3>
        <p>You must be at least 13 years old to use Kisa. By using the platform you confirm that you meet this requirement. If you are under 18, you should use the platform with the knowledge and permission of a parent or guardian.</p>
        <h3>Your Account</h3>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must not share your account with others or use another person's account without their permission. Notify us immediately at support@kisa.app if you suspect unauthorised access to your account.</p>
        <h3>Acceptable Use</h3>
        <p>When using Kisa, you agree not to:</p>
        <ul>
          <li>Submit false, misleading, or fabricated sighting reports</li>
          <li>Upload content that is offensive, abusive, or violates any person's rights</li>
          <li>Use the platform to harass, threaten, or intimidate any individual</li>
          <li>Attempt to access, scrape, or extract data from the platform in an unauthorised manner</li>
          <li>Use the platform for any commercial purpose without our prior written consent</li>
          <li>Upload content that infringes third-party intellectual property rights</li>
          <li>Attempt to compromise the security or integrity of the platform</li>
        </ul>
        <h3>User Content</h3>
        <p>You retain ownership of content you submit to Kisa, including photos, sighting descriptions, and comments. By submitting content, you grant Kisa a non-exclusive, royalty-free, worldwide licence to display, reproduce, and distribute your content within the platform for the purposes of operating the service.</p>
        <p>You are solely responsible for the content you post. Kisa does not verify the accuracy of user-submitted sighting reports and cannot be held responsible for actions taken based on community information.</p>
        <h3>Animal Welfare</h3>
        <p>Kisa is committed to the welfare of cats. Users must not use the platform to facilitate any harm to animals. Reports of animal cruelty should be directed to the appropriate local authority or animal welfare organisation. We reserve the right to remove content and ban users who we believe are misusing the platform to harm animals.</p>
        <h3>Moderation</h3>
        <p>We reserve the right to remove any content that violates these terms or that we determine, in our sole discretion, to be harmful, false, or inappropriate. We may suspend or terminate accounts that repeatedly violate these terms or that we believe pose a risk to the community.</p>
        <h3>Intellectual Property</h3>
        <p>All Kisa branding, design, software, and original content is owned by Kisa and protected by applicable intellectual property laws. You may not copy, reproduce, or create derivative works from Kisa's proprietary content without our express written permission.</p>
        <h3>Disclaimer of Warranties</h3>
        <p>Kisa is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the accuracy, reliability, or availability of the platform. We do not guarantee that sighting reports are accurate or that the platform will be free from errors or interruptions.</p>
        <h3>Limitation of Liability</h3>
        <p>To the fullest extent permitted by law, Kisa shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of or inability to use the platform, including any damages resulting from reliance on community-submitted information.</p>
        <h3>Termination</h3>
        <p>You may delete your account at any time through the platform settings. We may suspend or terminate your access at any time if we believe you have violated these terms, with or without notice.</p>
        <h3>Governing Law</h3>
        <p>These terms shall be governed by and construed in accordance with applicable law. Any disputes shall be subject to the exclusive jurisdiction of the courts in the relevant territory.</p>
        <h3>Contact Us</h3>
        <p>For questions about these terms, please contact us at support@kisa.app.</p>
      `
    },
    faq: {
      title: 'Frequently Asked Questions',
      html: `
        <p style="color:var(--text-2);margin-bottom:24px;">Got a question about Kisa? Find answers to the most common ones below.</p>
        <div id="kisaFaqAccordion"></div>
      `,
      faqs: [
        { q: 'What is Kisa?', a: 'Kisa is a community platform for tracking and supporting stray and community cats in your neighbourhood. Anyone can report a sighting, and the community works together to monitor, feed, and rescue cats that need help.' },
        { q: 'Is Kisa free to use?', a: 'Yes, Kisa is completely free for all community members. Create an account and start reporting sightings straight away.' },
        { q: 'How do I report a cat sighting?', a: 'Once you are signed in, click "Report a Sighting" in the navigation bar. Fill in the details including a photo, location, and the cat\'s condition, then submit. Your report will appear on the live map and in the community feed.' },
        { q: 'Do I need an account to browse the map?', a: 'You can view the live map and browse cat profiles without an account. However, you need to be signed in to submit reports, like posts, or leave comments.' },
        { q: 'What does SOS mean?', a: 'SOS indicates a cat that needs urgent veterinary attention or rescue. If you spot a cat in an SOS condition, please also contact your local animal welfare organisation or a vet as soon as possible.' },
        { q: 'Can I report a cat as adopted or taken in?', a: 'Yes. On any community post, you can use the "I\'ve taken them in" option to update the community that the cat is safe. This helps prevent duplicate rescue attempts and keeps the community informed.' },
        { q: 'How is my location data used?', a: 'Your location is only collected when you submit a sighting report, and only the location you provide is stored. We do not track your location in the background. See our Privacy Policy for full details.' },
        { q: 'How do I delete my account?', a: 'You can delete your account from the Settings page. This will remove your personal information within 30 days. Some sighting reports may remain in anonymised form to preserve community cat history.' },
        { q: 'How do I report inappropriate content?', a: 'Use the report option on any post or comment. Our moderation team reviews reports and takes action in line with our Terms of Service.' },
        { q: 'How can I get in touch with the Kisa team?', a: 'You can reach us at support@kisa.app. We aim to respond within 2 business days.' }
      ]
    },
    cookies: {
      title: 'Cookie Policy',
      html: `
        <p class="kisa-modal-updated">Last updated: 1 July 2026</p>
        <h3>What Are Cookies</h3>
        <p>Cookies are small text files stored on your device when you visit a website. They help websites remember information about your visit, such as your login status and preferences.</p>
        <h3>Cookies We Use</h3>
        <p>Kisa uses a minimal set of cookies:</p>
        <ul>
          <li><strong>Essential cookies</strong> - Required for the platform to function. These include your session cookie that keeps you signed in. You cannot opt out of essential cookies without affecting platform functionality.</li>
          <li><strong>Analytics cookies</strong> - Help us understand how the platform is used so we can improve it. These collect anonymised usage data such as pages visited and features used.</li>
          <li><strong>Preference cookies</strong> - Remember your settings and preferences, such as display mode.</li>
        </ul>
        <h3>Managing Cookies</h3>
        <p>You can control and delete cookies through your browser settings. Please note that disabling essential cookies will affect your ability to use Kisa, including staying signed in. For instructions on managing cookies in your browser, refer to your browser's help documentation.</p>
        <h3>Third-Party Cookies</h3>
        <p>We use a small number of trusted third-party services to help operate Kisa, such as analytics providers. These services may set their own cookies. We do not allow third-party advertising cookies on Kisa.</p>
        <h3>Changes</h3>
        <p>We may update this Cookie Policy as the platform evolves. Any significant changes will be communicated through an in-platform notice.</p>
        <h3>Contact</h3>
        <p>For questions about our use of cookies, contact us at privacy@kisa.app.</p>
      `
    }
  };

  function buildFaqHtml(faqs) {
    return faqs.map(function(item, i) {
      return '<div class="kisa-modal-faq-item" data-faq="' + i + '">' +
        '<button class="kisa-modal-faq-q" type="button">' +
          item.q +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>' +
        '<div class="kisa-modal-faq-a">' + item.a + '</div>' +
      '</div>';
    }).join('');
  }

  function openModal(type) {
    var data = CONTENT[type];
    if (!data) return;
    ensureShell();
    var modal    = document.getElementById('kisaModal');
    var backdrop = document.getElementById('kisaModalBackdrop');
    var title    = document.getElementById('kisaModalTitle');
    var body     = document.getElementById('kisaModalBody');
    title.textContent = data.title;
    body.innerHTML    = data.html;
    if (type === 'faq' && data.faqs) {
      var acc = document.getElementById('kisaFaqAccordion');
      if (acc) {
        acc.innerHTML = buildFaqHtml(data.faqs);
        acc.addEventListener('click', function(e) {
          var btn = e.target.closest('.kisa-modal-faq-q');
          if (!btn) return;
          var item = btn.closest('.kisa-modal-faq-item');
          var wasOpen = item.classList.contains('open');
          acc.querySelectorAll('.kisa-modal-faq-item').forEach(function(el) { el.classList.remove('open'); });
          if (!wasOpen) item.classList.add('open');
        });
      }
    }
    modal.style.display = 'flex';
    backdrop.style.display = 'block';
    document.body.style.overflow = 'hidden';
    /* setTimeout, not rAF: rAF is throttled in a hidden/background tab, which
       would leave the modal displayed but stuck at opacity 0. */
    setTimeout(function() {
      modal.classList.add('open');
      backdrop.classList.add('open');
    }, 16);
    body.scrollTop = 0;
  }

  function closeModal() {
    var modal    = document.getElementById('kisaModal');
    var backdrop = document.getElementById('kisaModalBackdrop');
    modal.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function() {
      modal.style.display = 'none';
      backdrop.style.display = 'none';
    }, 250);
  }

  function init() {
    ensureShell();

    /* Wire all footer links */
    document.querySelectorAll('a[href="/privacy"], a[href="/terms"], a[href="/faq"], a[href="/cookies"], a[href="/about"]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        var map = { '/privacy': 'privacy', '/terms': 'terms', '/faq': 'faq', '/cookies': 'cookies', '/about': 'about' };
        openModal(map[el.getAttribute('href')]);
      });
    });

    /* Close button */
    document.getElementById('kisaModalClose').addEventListener('click', closeModal);

    /* Backdrop click */
    document.getElementById('kisaModalBackdrop').addEventListener('click', closeModal);

    /* Escape key */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose globally so links can also call openModal() directly if needed */
  window.kisaOpenModal = openModal;
})();
