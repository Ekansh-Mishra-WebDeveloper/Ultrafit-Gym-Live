// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✅ Service worker registered:', reg))
      .catch(err => console.error('❌ Service worker registration failed:', err));
  });
}

// ===== PWA INSTALL PROMPT =====
let deferredPrompt;
const installBtn = document.getElementById('installAppBtn');

// Always show the button
if (installBtn) installBtn.style.display = 'inline-flex';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('✅ beforeinstallprompt fired – install available');
});

if (installBtn) {
  installBtn.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') console.log('User accepted install');
        deferredPrompt = null;
      });
    } else {
      console.log('❌ No install prompt available. Check: HTTPS? Manifest? SW?');
      // You can add a manual instruction if needed, but no alert.
    }
  });
}

// ===== YOUR ORIGINAL MAIN SCRIPT (with one fix: members endpoint) =====
(function() {
  const API_BASE = '/api';

  async function fetchJSON(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`Fetch error ${url}:`, err);
      return null;
    }
  }

  let siteSettings = {};
  let statsData = {};
  let trainers = [];
  let members = [];
  let products = [];
  let transformations = [];
  let dietPlans = [];
  let workoutPlans = [];
  let memberships = [];
  let galleryImages = [];
  let reels = [];
  let reviews = [];
  let contactInfo = {};

  async function loadAllData() {
    const [
      settings, stats, trainersRes, membersRes, productsRes,
      transRes, dietRes, workoutRes, membershipRes, galleryRes,
      reelsRes, reviewsRes, contactRes
    ] = await Promise.all([
      fetchJSON(`${API_BASE}/sitesettings`),
      fetchJSON(`${API_BASE}/stats`),
      fetchJSON(`${API_BASE}/trainers`),
      fetchJSON(`${API_BASE}/members-list`),   // ✅ FIXED: was '/members' now public endpoint
      fetchJSON(`${API_BASE}/products`),
      fetchJSON(`${API_BASE}/transformations`),
      fetchJSON(`${API_BASE}/dietplans`),
      fetchJSON(`${API_BASE}/workoutplans`),
      fetchJSON(`${API_BASE}/memberships`),
      fetchJSON(`${API_BASE}/gallery`),
      fetchJSON(`${API_BASE}/reels`),
      fetchJSON(`${API_BASE}/reviews`),
      fetchJSON(`${API_BASE}/contactinfo`)
    ]);
    if (settings) siteSettings = settings;
    if (stats) statsData = stats;
    if (trainersRes) trainers = trainersRes;
    if (membersRes) members = membersRes;
    if (productsRes) products = productsRes;
    if (transRes) transformations = transRes;
    if (dietRes) dietPlans = dietRes;
    if (workoutRes) workoutPlans = workoutRes;
    if (membershipRes) memberships = membershipRes;
    if (galleryRes) galleryImages = galleryRes.images || [];
    if (reelsRes) reels = reelsRes;
    if (reviewsRes) reviews = reviewsRes;
    if (contactRes) contactInfo = contactRes;
  }

  function renderSiteSettings() {
    const logoImgs = document.querySelectorAll('.nav-logo-img, .hero-logo-img');
    logoImgs.forEach(img => { if (siteSettings.logoUrl) img.src = siteSettings.logoUrl; });
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && siteSettings.heroSubheading) heroTitle.innerText = siteSettings.heroSubheading;
    const heroBtn = document.getElementById('heroVipBtn');
    if (heroBtn && siteSettings.heroButtonText) heroBtn.innerText = siteSettings.heroButtonText;
    const statusSpan = document.getElementById('statusText');
    if (statusSpan && siteSettings.liveStatusText) statusSpan.innerText = siteSettings.liveStatusText;
    const floatBtn = document.getElementById('floatingTrialBtn');
    if (floatBtn && siteSettings.floatingButtonText) floatBtn.innerText = siteSettings.floatingButtonText;
  }

  function renderSectionHeadings() {
    const map = {
      trainersHeading: siteSettings.trainersHeading,
      transformationsHeading: siteSettings.transformationsHeading,
      membersHeading: siteSettings.membersHeading,
      dietHeading: siteSettings.dietHeading,
      workoutHeading: siteSettings.workoutHeading,
      membershipHeading: siteSettings.membershipHeading,
      shopHeading: siteSettings.shopHeading,
      galleryHeading: siteSettings.galleryHeading,
      reelsHeading: siteSettings.reelsHeading,
      reviewsHeading: siteSettings.reviewsHeading
    };
    for (const [id, text] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el && text) el.innerText = text;
    }
  }

  function renderStats() {
    if (!statsData) return;
    const statNumbers = document.querySelectorAll('.stat-num');
    if (statNumbers.length >= 3) {
      statNumbers[0].setAttribute('data-count', statsData.membersCount || 0);
      statNumbers[1].setAttribute('data-count', statsData.trainersCount || 0);
      statNumbers[2].setAttribute('data-count', statsData.transformationsCount || 0);
    }
    const counters = document.querySelectorAll('.stat-num');
    if (counters.length) {
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-count'));
            let count = 0;
            const inc = target / 40;
            const update = () => {
              count += inc;
              if (count < target) {
                el.innerText = Math.floor(count);
                requestAnimationFrame(update);
              } else el.innerText = target;
            };
            update();
            counterObserver.unobserve(el);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(c => counterObserver.observe(c));
    }
  }

  function renderTrainers() {
    const container = document.getElementById('trainersContainer');
    if (!container) return;
    if (!trainers.length) { container.innerHTML = '<p style="color:white;">No trainers found.</p>'; return; }
    container.innerHTML = trainers.map(t => `
      <div class="leader-card" data-trainer-id="${t._id}">
        <img src="${t.photoUrl}" alt="${t.name}" loading="lazy">
        <h3>${escapeHtml(t.name)}</h3>
        <p>${escapeHtml(t.position)}</p>
        <button class="btn-outline-gold view-profile-btn">View Profile</button>
        <div class="trainer-socials">
          <a href="https://wa.me/${t.whatsappNumber}?text=Hi%2C%20${encodeURIComponent(t.name)}%20I%20want%20to%20join%20UltraFit%20Gym" target="_blank" class="social-icon whatsapp"><i class="fab fa-whatsapp"></i></a>
          <a href="${t.instagramUrl}" target="_blank" class="social-icon instagram"><i class="fab fa-instagram"></i></a>
        </div>
      </div>
    `).join('');
    document.querySelectorAll('.leader-card .view-profile-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const trainer = trainers[idx];
        showModal(`
          <div style="text-align:center;">
            <img src="${trainer.photoUrl}" style="width:120px;height:120px;border-radius:50%;border:2px solid #FFD700;margin-bottom:1rem;">
            <h2 style="color:#FFD700;">${trainer.name}</h2>
            <p style="color:#bbb;">${trainer.position}</p>
            <p style="line-height:1.5;margin-top:1rem;">${trainer.bio || 'No bio available.'}</p>
          </div>
        `);
      });
    });
  }

  function renderMembersCarousel() {
    const container = document.getElementById('membersCarouselItems');
    if (!container) return;
    const featured = members.filter(m => m.featured === true);
    if (!featured.length) {
      container.innerHTML = '<div class="member-card">No featured members yet.</div>';
      return;
    }
    container.innerHTML = featured.map(m => `
      <div class="member-card">
        <img class="member-avatar" src="${m.photoUrl || DEFAULT_PROFILE}" alt="${m.name}">
        <div class="member-name">${escapeHtml(m.name)}</div>
        <div class="member-role">${escapeHtml(m.position || 'Member')}</div>
        <div class="member-age">${m.age} years old</div>
        <div class="member-bio">“${escapeHtml(m.feedback || 'No feedback yet.')}”</div>
      </div>
    `).join('');
    const total = featured.length;
    const prevBtn = document.getElementById('membersPrevBtn');
    const nextBtn = document.getElementById('membersNextBtn');
    const dotsContainer = document.getElementById('membersDots');
    let current = 0;
    function updateCarousel() {
      container.style.transform = `translateX(-${current * 100}%)`;
      if (dotsContainer) {
        Array.from(dotsContainer.children).forEach((dot, i) => dot.classList.toggle('active', i === current));
      }
    }
    function renderDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.classList.add('members-dot');
        if (i === current) dot.classList.add('active');
        dot.addEventListener('click', () => { current = i; updateCarousel(); });
        dotsContainer.appendChild(dot);
      }
    }
    if (prevBtn && nextBtn) {
      const newPrev = prevBtn.cloneNode(true);
      const newNext = nextBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrev, prevBtn);
      nextBtn.parentNode.replaceChild(newNext, nextBtn);
      newPrev.onclick = () => { current = (current - 1 + total) % total; updateCarousel(); };
      newNext.onclick = () => { current = (current + 1) % total; updateCarousel(); };
    }
    renderDots();
    updateCarousel();
  }

  function renderProducts() {
    const container = document.querySelector('.product-grid');
    if (!container) return;
    const preview = products.slice(0, 3);
    if (!preview.length) { container.innerHTML = '<p>No products available.</p>'; return; }
    container.innerHTML = preview.map(p => `
      <div class="product-card">
        <img src="${p.imageUrl}" alt="${p.name}">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="price">₹${p.price}</p>
        <button class="btn-gold-whatsapp" data-product="${p.name}">Buy Now</button>
      </div>
    `).join('');
    document.querySelectorAll('.btn-gold-whatsapp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'shop.html';
      });
    });
  }

  function renderTransformations() {
    const container = document.getElementById('transformationsContainer');
    if (!container) return;
    if (!transformations.length) { container.innerHTML = '<p>No transformations yet.</p>'; return; }
    container.innerHTML = transformations.map(t => `
      <div class="trans-card">
        <div class="luxury-comparison-slider" data-before="${t.afterImage}" data-after="${t.beforeImage}">
          <div class="comparison-images"><img class="before-image" alt="Before"><div class="after-image-container"><img class="after-image" alt="After"></div></div>
          <div class="slider-handle" style="left:50%"><div class="vertical-line"></div><div class="handle-circle"><i class="fas fa-arrows-alt-h"></i></div></div>
          <div class="comparison-label before-label">BEFORE</div><div class="comparison-label after-label">AFTER</div>
        </div>
        <button class="btn-see-more">See more</button>
      </div>
    `).join('');
    document.querySelectorAll('.luxury-comparison-slider').forEach(initLuxurySlider);
    document.querySelectorAll('.btn-see-more').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'members.html';
      });
    });
  }

  function renderDietPlans() {
    const container = document.getElementById('dietGrid');
    if (!container) return;
    if (!dietPlans.length) { container.innerHTML = '<p>No diet plans found.</p>'; return; }
    container.innerHTML = dietPlans.map(d => `
      <div class="diet-card">
        <div class="diet-card-image"><img src="${d.imageUrl}" alt="${d.title}"></div>
        <div class="diet-card-content">
          <h3>${escapeHtml(d.title)}</h3>
          <p>${escapeHtml(d.shortDescription)}</p>
          <div class="diet-targets">${d.targets.map(t => `<span><i class="fas fa-leaf"></i> ${escapeHtml(t)}</span>`).join('')}</div>
          <button class="btn-outline-gold full-plan-btn" data-plan="${d.title}">Full Diet Plan</button>
        </div>
      </div>
    `).join('');
    document.querySelectorAll('.full-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'diet.html';
      });
    });
  }

  function renderWorkoutPlans() {
    const container = document.getElementById('workoutGrid');
    if (!container) return;
    if (!workoutPlans.length) { container.innerHTML = '<p>No workout plans found.</p>'; return; }
    container.innerHTML = workoutPlans.map(w => `
      <div class="workout-card">
        <div class="workout-card-image"><img src="${w.imageUrl}" alt="${w.title}"></div>
        <div class="workout-card-content">
          <h3>${escapeHtml(w.title)}</h3>
          <p>${escapeHtml(w.shortDescription)}</p>
          <div class="workout-targets">${w.targets.map(t => `<span><i class="fas fa-dumbbell"></i> ${escapeHtml(t)}</span>`).join('')}</div>
          <button class="btn-outline-gold full-workout-btn" data-plan="${w.title}">Full Workout Plan</button>
        </div>
      </div>
    `).join('');
    document.querySelectorAll('.full-workout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'workout.html';
      });
    });
  }

  function renderMemberships() {
    const container = document.querySelector('.membership-cards');
    if (!container) return;
    if (!memberships.length) { container.innerHTML = '<p>No membership plans available.</p>'; return; }
    container.innerHTML = memberships.map(m => `
      <div class="membership-card">
        <h3>${escapeHtml(m.planName)}</h3>
        <div class="price">₹${m.price}<span>/${m.duration}</span></div>
        <p>${escapeHtml(m.description)}</p>
      </div>
    `).join('');
  }

  function renderGallery() {
    const container = document.getElementById('galleryItemsContainer');
    if (!container) return;
    if (!galleryImages.length) { container.innerHTML = '<div class="carousel-item">No images</div>'; return; }
    container.innerHTML = '';
    galleryImages.forEach(src => {
      const div = document.createElement('div');
      div.className = 'carousel-item';
      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      div.appendChild(img);
      container.appendChild(div);
    });
    if (window.galleryCarousel) window.galleryCarousel.destroy?.();
    window.galleryCarousel = new InfiniteCarousel('galleryCarousel', 'galleryItemsContainer', 'galleryDots', 'galleryPrevBtn', 'galleryNextBtn', 'image', galleryImages, { autoSlide: true });
  }

  function renderReels() {
    const container = document.getElementById('reelsItemsContainer');
    if (!container) return;
    const reelUrls = reels.map(r => r.videoUrl);
    if (!reelUrls.length) { container.innerHTML = '<div class="carousel-item">No reels</div>'; return; }
    container.innerHTML = '';
    reelUrls.forEach(src => {
      const div = document.createElement('div');
      div.className = 'carousel-item';
      const video = document.createElement('video');
      video.src = src;
      video.muted = true;
      video.playsInline = true;
      div.appendChild(video);
      container.appendChild(div);
    });
    if (window.reelsCarousel) window.reelsCarousel.destroy?.();
    window.reelsCarousel = new InfiniteCarousel('reelsCarousel', 'reelsItemsContainer', 'reelsDots', 'reelsPrevBtn', 'reelsNextBtn', 'video', reelUrls, { autoSlide: false });
  }

  function renderReviews() {
    const container = document.getElementById('reviewCarouselItems');
    if (!container) return;
    if (!reviews.length) { container.innerHTML = '<div class="review-card">No reviews yet</div>'; return; }
    container.innerHTML = reviews.map(r => {
      const stars = Array(5).fill().map((_, i) => `<i class="fas fa-star ${i < (r.rating || 5) ? '' : 'inactive'}"></i>`).join('');
      return `
        <div class="review-card">
          <img class="review-avatar" src="${r.photoUrl}">
          <div class="review-name">${escapeHtml(r.name)}</div>
          <div class="review-stars">${stars}</div>
          <div class="review-text">“${escapeHtml(r.review)}”</div>
        </div>
      `;
    }).join('');
    let currentReview = 0, reviewTransition = false;
    const total = reviews.length;
    const reviewItems = container;
    const prevBtn = document.getElementById('reviewPrevBtn');
    const nextBtn = document.getElementById('reviewNextBtn');
    const dotsContainer = document.getElementById('reviewDots');
    function updateReviewCarousel(instant = false) {
      if (instant) reviewItems.style.transition = 'none';
      else reviewItems.style.transition = 'transform 0.5s cubic-bezier(0.2,0.9,0.4,1.1)';
      reviewItems.style.transform = `translateX(-${currentReview * 100}%)`;
      if (instant) reviewItems.offsetHeight;
      updateReviewDots();
    }
    function updateReviewDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.classList.add('review-dot');
        if (i === currentReview) dot.classList.add('active');
        dot.addEventListener('click', () => { if (!reviewTransition) goToReview(i); });
        dotsContainer.appendChild(dot);
      }
    }
    function goToReview(index) {
      if (reviewTransition) return;
      reviewTransition = true;
      currentReview = index;
      updateReviewCarousel(false);
      setTimeout(() => reviewTransition = false, 500);
    }
    function nextReview() { goToReview((currentReview + 1) % total); }
    function prevReview() { goToReview((currentReview - 1 + total) % total); }
    if (prevBtn) { const newPrev = prevBtn.cloneNode(true); prevBtn.parentNode.replaceChild(newPrev, prevBtn); newPrev.addEventListener('click', prevReview); }
    if (nextBtn) { const newNext = nextBtn.cloneNode(true); nextBtn.parentNode.replaceChild(newNext, nextBtn); newNext.addEventListener('click', nextReview); }
    updateReviewCarousel(true);
  }

  function renderContactInfo() {
    if (!contactInfo) return;
    const phoneEl = document.getElementById('contactPhone');
    if (phoneEl && contactInfo.phone) phoneEl.innerText = contactInfo.phone;
    const phoneLink = document.querySelector('.contact-info-item a[href^="tel:"]');
    if (phoneLink && contactInfo.phone) phoneLink.href = `tel:${contactInfo.phone}`;
    const whatsappEl = document.getElementById('contactWhatsapp');
    if (whatsappEl && contactInfo.whatsappNumber) whatsappEl.innerText = contactInfo.whatsappNumber;
    const waLink = document.querySelector('.contact-info-item a[href*="wa.me"]');
    if (waLink && contactInfo.whatsappNumber) waLink.href = `https://wa.me/${contactInfo.whatsappNumber}?text=Hi%2C%20I%20want%20to%20join%20UltraFit%20Gym`;
    const fbLink = document.querySelector('.contact-social a[href*="facebook"]');
    if (fbLink && contactInfo.facebookUrl) fbLink.href = contactInfo.facebookUrl;
    const igLink = document.querySelector('.contact-social a[href*="instagram"]');
    if (igLink && contactInfo.instagramUrl) igLink.href = contactInfo.instagramUrl;
    const addressEl = document.getElementById('contactAddress');
    if (addressEl && contactInfo.address) addressEl.innerText = contactInfo.address;
  }

  function initLuxurySlider(slider) {
    const beforeUrl = slider.getAttribute('data-before');
    const afterUrl = slider.getAttribute('data-after');
    const beforeImg = slider.querySelector('.before-image');
    const afterImg = slider.querySelector('.after-image');
    const afterContainer = slider.querySelector('.after-image-container');
    const handle = slider.querySelector('.slider-handle');
    if (!beforeImg || !afterImg) return;
    beforeImg.src = beforeUrl;
    afterImg.src = afterUrl;
    let startX = 0, startPercent = 50, isDragging = false;
    function setPos(percent) {
      percent = Math.min(Math.max(percent, 0), 100);
      afterContainer.style.width = percent + '%';
      handle.style.left = percent + '%';
    }
    function onStart(e) {
      isDragging = true;
      e.preventDefault();
      const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      const rect = slider.getBoundingClientRect();
      const relX = Math.min(Math.max(0, clientX - rect.left), rect.width);
      startPercent = (relX / rect.width) * 100;
      startX = clientX;
    }
    function onMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      let clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const rect = slider.getBoundingClientRect();
      let deltaX = clientX - startX;
      let newPercent = startPercent + (deltaX / rect.width) * 100;
      setPos(newPercent);
    }
    function onEnd() { isDragging = false; }
    handle.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    handle.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    setPos(50);
  }

  class InfiniteCarousel {
    constructor(containerId, itemsId, dotsId, prevId, nextId, type, items, options = {}) {
      this.container = document.getElementById(containerId);
      this.itemsContainer = document.getElementById(itemsId);
      this.dotsContainer = document.getElementById(dotsId);
      this.prevBtn = document.getElementById(prevId);
      this.nextBtn = document.getElementById(nextId);
      this.type = type;
      this.total = items.length;
      this.infinite = [items[items.length-1], ...items, items[0]];
      this.currentReal = 0;
      this.currentInf = 1;
      this.transitioning = false;
      this.auto = options.autoSlide || false;
      this.delay = options.autoSlideDelay || 3000;
      this.pauseOnHover = options.pauseOnHover || true;
      this.interval = null;
      this.hovered = false;
      this.init();
      if (this.auto) this.startAuto();
      if (this.pauseOnHover) this.setupHover();
    }
    init() {
      this.itemsContainer.innerHTML = '';
      this.infinite.forEach((src, i) => {
        const div = document.createElement('div');
        div.className = 'carousel-item';
        if (this.type === 'image') {
          const img = document.createElement('img');
          img.src = src;
          img.loading = 'lazy';
          div.appendChild(img);
        } else if (this.type === 'video') {
          const video = document.createElement('video');
          video.src = src;
          video.muted = true;
          video.playsInline = true;
          div.appendChild(video);
        }
        this.itemsContainer.appendChild(div);
      });
      this.updateDots();
      this.update(false);
      this.attachEvents();
    }
    updateDots() {
      if (!this.dotsContainer) return;
      this.dotsContainer.innerHTML = '';
      for (let i = 0; i < this.total; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === this.currentReal) dot.classList.add('active');
        dot.addEventListener('click', () => { if (!this.transitioning) this.goTo(i); });
        this.dotsContainer.appendChild(dot);
      }
    }
    setActiveDot() {
      const dots = this.dotsContainer?.querySelectorAll('.dot');
      dots?.forEach((d, i) => {
        if (i === this.currentReal) d.classList.add('active');
        else d.classList.remove('active');
      });
    }
    update(withTransition = true) {
      if (!withTransition) this.itemsContainer.style.transition = 'none';
      else this.itemsContainer.style.transition = 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)';
      this.itemsContainer.style.transform = `translateX(-${this.currentInf * 100}%)`;
      if (!withTransition) this.itemsContainer.offsetHeight;
      if (this.type === 'video') this.manageVideo();
    }
    manageVideo() {
      const videos = this.itemsContainer.querySelectorAll('video');
      videos.forEach((v, i) => {
        if (i === this.currentInf) {
          v.currentTime = 0;
          v.play().catch(e => console.log);
          v.onended = () => { if (!this.transitioning) this.next(); };
        } else {
          v.pause();
          v.currentTime = 0;
          v.onended = null;
        }
      });
    }
    goTo(index) {
      if (this.transitioning) return;
      const delta = index - this.currentReal;
      this.currentReal = index;
      this.currentInf += delta;
      this.update(true);
      this.setActiveDot();
      if (this.auto) this.resetAuto();
      this.transitioning = true;
      this.itemsContainer.addEventListener('transitionend', () => this.handleEnd(), { once: true });
    }
    handleEnd() {
      this.transitioning = false;
      if (this.currentInf === 0) {
        this.currentReal = this.total - 1;
        this.currentInf = this.total;
        this.update(false);
        this.setActiveDot();
      } else if (this.currentInf === this.total + 1) {
        this.currentReal = 0;
        this.currentInf = 1;
        this.update(false);
        this.setActiveDot();
      }
      if (this.type === 'video') this.manageVideo();
    }
    next() { if (!this.transitioning) this.goTo((this.currentReal + 1) % this.total); }
    prev() { if (!this.transitioning) this.goTo((this.currentReal - 1 + this.total) % this.total); }
    attachEvents() {
      this.prevBtn?.addEventListener('click', () => this.prev());
      this.nextBtn?.addEventListener('click', () => this.next());
      let startX = 0, dragging = false, dist = 0;
      const main = this.container.querySelector('.carousel-main');
      if (!main) return;
      const onStart = (e) => {
        if (this.transitioning) return;
        dragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        dist = 0;
        this.itemsContainer.style.transition = 'none';
      };
      const onMove = (e) => {
        if (!dragging) return;
        const curX = e.touches ? e.touches[0].clientX : e.clientX;
        const delta = curX - startX;
        dist = delta;
        const currentPercent = -this.currentInf * 100;
        const newPercent = currentPercent + (delta / this.itemsContainer.parentElement.offsetWidth) * 100;
        this.itemsContainer.style.transform = `translateX(${newPercent}%)`;
      };
      const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        this.itemsContainer.style.transition = '';
        if (Math.abs(dist) > 50) {
          if (dist > 0) this.prev();
          else this.next();
        } else {
          this.update(true);
        }
      };
      main.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      main.addEventListener('touchstart', onStart, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }
    startAuto() {
      if (this.interval) clearInterval(this.interval);
      this.interval = setInterval(() => { if (!this.transitioning && !this.hovered) this.next(); }, this.delay);
    }
    resetAuto() { if (this.auto) { clearInterval(this.interval); this.startAuto(); } }
    setupHover() {
      this.container.addEventListener('mouseenter', () => this.hovered = true);
      this.container.addEventListener('mouseleave', () => { this.hovered = false; this.resetAuto(); });
    }
    destroy() { if (this.interval) clearInterval(this.interval); }
  }

  const modalOverlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalDynamicBody');
  function showModal(html) {
    modalBody.innerHTML = html;
    modalOverlay.style.display = 'flex';
  }
  document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => modalOverlay.style.display = 'none'));
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });

  function openLeadModal() {
    document.getElementById('trialForm').reset();
    const msgDiv = document.getElementById('trialMessage');
    msgDiv.style.display = 'none';
    msgDiv.innerHTML = '';
    modalOverlay.style.display = 'flex';
  }

  async function submitTrialForm(e) {
    e.preventDefault();
    const name = document.getElementById('trialName').value.trim();
    const phone = document.getElementById('trialPhone').value.trim();
    const email = document.getElementById('trialEmail').value.trim();

    if (!name || !phone || !email) {
      showTrialMessage('Please fill in all fields.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitTrialBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/book-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showTrialMessage(data.message || '✅ Trial booked! Check your email.', 'success');
        setTimeout(() => {
          modalOverlay.style.display = 'none';
          document.getElementById('trialForm').reset();
        }, 3000);
      } else {
        showTrialMessage(data.message || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Trial booking error:', err);
      showTrialMessage('Network error. Please check your connection.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  function showTrialMessage(msg, type) {
    const msgDiv = document.getElementById('trialMessage');
    msgDiv.innerHTML = msg;
    msgDiv.className = `trial-message ${type}`;
    msgDiv.style.display = 'block';
    setTimeout(() => {
      msgDiv.style.display = 'none';
    }, 5000);
  }

  document.getElementById('trialForm')?.addEventListener('submit', submitTrialForm);

  // AI CHAT functionality
  const chatBubble = document.getElementById('chatBubble');
  const chatWindow = document.getElementById('chatWindow');
  const chatClose = document.getElementById('chatCloseBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSendBtn');

  function toggleChatWindow(open) {
    if (open) chatWindow.classList.add('open');
    else chatWindow.classList.remove('open');
  }

  chatBubble.addEventListener('click', () => toggleChatWindow(true));
  chatClose.addEventListener('click', () => toggleChatWindow(false));

  async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'message user-message';
    userMsgDiv.textContent = message;
    chatMessages.appendChild(userMsgDiv);
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch(`${API_BASE}/chat-groq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();

      chatMessages.removeChild(typingDiv);

      if (response.ok && data.reply) {
        const botMsgDiv = document.createElement('div');
        botMsgDiv.className = 'message bot-message';
        botMsgDiv.textContent = data.reply;
        chatMessages.appendChild(botMsgDiv);
      } else {
        throw new Error(data.error || 'No response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      chatMessages.removeChild(typingDiv);
      const errorMsgDiv = document.createElement('div');
      errorMsgDiv.className = 'message bot-message';
      errorMsgDiv.textContent = '🏋️ Sorry, I’m having trouble connecting. Please try again later.';
      chatMessages.appendChild(errorMsgDiv);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  chatSend.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  const DEFAULT_PROFILE = "https://img.freepik.com/premium-vector/vector-flat-illustration-grayscale-avatar-user-profile-person-icon-gender-neutral-silhouette_719432-3512.jpg?semt=ais_hybrid&w=740&q=80";
  function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, (m) => { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

  async function init() {
    await loadAllData();
    renderSiteSettings();
    renderSectionHeadings();
    renderStats();
    renderTrainers();
    renderMembersCarousel();
    renderProducts();
    renderTransformations();
    renderDietPlans();
    renderWorkoutPlans();
    renderMemberships();
    renderGallery();
    renderReels();
    renderReviews();
    renderContactInfo();

    const fadeElements = document.querySelectorAll('.service-item, .leader-card, .trans-card, .product-card, .diet-card, .workout-card');
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('appear'); });
    }, { threshold: 0.2 });
    fadeElements.forEach(el => { el.classList.add('fade-up'); fadeObserver.observe(el); });
  }

  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger) hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));

  document.getElementById('heroVipBtn')?.addEventListener('click', openLeadModal);
  document.getElementById('floatingTrialBtn')?.addEventListener('click', openLeadModal);

  init();
})();