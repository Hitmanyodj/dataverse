/**
 * DATAVERSE'26 - Advanced Application Logic & Optimization
 */

// --- 1. Global Setup & Mobile Check ---
const isMobile = window.innerWidth < 768;

// Inject Lenis for Apple-grade smooth scrolling (if GSAP ScrollTrigger is present)
// Using pure JS injection so we don't alter HTML structure manually.
const loadSmoothScroll = () => {
    if (isMobile) return; // Keep native scrolling on mobile for performance
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@studio-freight/lenis@1.0.34/dist/lenis.min.js';
    script.onload = () => {
        const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        
        // Sync Lenis with GSAP ScrollTrigger to prevent jitter/conflict
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => { lenis.raf(time * 1000) });
            gsap.ticker.lagSmoothing(0);
        } else {
            function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
            requestAnimationFrame(raf);
        }
    };
    document.head.appendChild(script);
};

const initInteractions = () => {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            let x = e.clientX - e.target.getBoundingClientRect().left;
            let y = e.clientY - e.target.getBoundingClientRect().top;
            let ripples = document.createElement('span');
            ripples.className = 'ripple';
            ripples.style.left = x + 'px';
            ripples.style.top = y + 'px';
            this.appendChild(ripples);
            setTimeout(() => { ripples.remove() }, 600);
        });
    });
};

// --- 3. Cinematic Preloader & GSAP Reveals ---
const initPreloader = () => {
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  
  if (!preloader) return;

  const targetText = "INITIALIZING SYSTEM...";
  let typingIndex = 0; let progress = 0; let isReady = false;

  const typeText = () => {
      const el = document.getElementById('typing-text');
      if(el && typingIndex < targetText.length) {
          el.innerHTML = targetText.substring(0, typingIndex + 1) + '<span class="typing-cursor"></span>';
          typingIndex++;
          setTimeout(typeText, 40);
      }
  };
  typeText();

  const closePreloader = () => {
      if (isReady) return;
      isReady = true;
      preloader.style.opacity = '0';
      setTimeout(() => { 
          preloader.style.display = 'none'; 
          initGSAP(); 
          document.dispatchEvent(new Event('appReady')); // Broadcast readiness
      }, 1200);
  };

  const updateProgress = () => {
      if (progress < 100) {
          progress += Math.random() * 8;
          if (progress > 100) progress = 100;
          if(progressBar) progressBar.style.width = `${progress}%`;
          if(progressText) progressText.innerText = `${Math.floor(progress)}%`;
          
          if (progress === 100) setTimeout(closePreloader, 400);
          else setTimeout(updateProgress, isMobile ? 25 : 15);
      }
  };
  updateProgress();
  setTimeout(closePreloader, 4000); // Fallback
};

// --- 4. Data Network AI Background (HTML5 Canvas 2D) ---
const initNetworkCanvas = () => {
    const canvas = document.getElementById('network-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    let width, height;
    
    // Performance limiting
    const numNodes = isMobile ? 50 : 120;
    const maxDistance = 150;
    const mouseRadius = 250; // Increased radius for better interaction
    
    let nodes = [];
    let mouse = { x: null, y: null };
    
    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    };
    
    window.addEventListener('resize', resize);
    resize();
    
    // Mouse tracking
    if (!isMobile) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        document.documentElement.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });
    }

    class Node {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Data flow motion: streaming diagonally
            this.vx = (Math.random() * 0.5 + 0.2); 
            this.vy = (Math.random() * 0.5 - 0.25);
            this.baseRadius = Math.random() * 1.5 + 0.5;
            this.radius = this.baseRadius;
            
            // Neon colors
            const colors = ['#00d4ff', '#00f3ff', '#8a2be2', '#00f3ff'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            
            this.pulseCounter = Math.random() * Math.PI * 2;
            this.isHighlight = Math.random() < 0.05; // 5% chance
        }
        
        update() {
            // Apply drift
            this.x += this.vx;
            this.y += this.vy;
            
            // Wrap around seamlessly
            if (this.x > width + 50) this.x = -50;
            if (this.x < -50) this.x = width + 50;
            if (this.y > height + 50) this.y = -50;
            if (this.y < -50) this.y = height + 50;
            
            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null && !isMobile) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < mouseRadius) {
                    // Repel with satisfying force
                    const force = (mouseRadius - dist) / mouseRadius;
                    this.x -= (dx / dist) * force * 3.5;
                    this.y -= (dy / dist) * force * 3.5;
                }
            }
            
            // Pulsing effect
            this.pulseCounter += 0.03;
            let currentRadius = this.baseRadius + Math.sin(this.pulseCounter) * 0.4;
            
            if (this.isHighlight) {
                currentRadius += Math.sin(this.pulseCounter * 1.5) * 1.0;
            }
            this.radius = Math.max(0.1, currentRadius);
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = this.isHighlight ? 15 : 5;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
        }
    }
    
    // Initialize nodes
    for (let i = 0; i < numNodes; i++) {
        nodes.push(new Node());
    }
    
    // Optimization: intersection observer
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; });
    observer.observe(document.querySelector('.content-wrapper') || document.body);

    // Initial entrance warp speed effect placeholder
    let speedMult = 5;
    document.addEventListener('appReady', () => {
        if(typeof gsap !== 'undefined') {
            gsap.to({val: 5}, {val: 1, duration: 2.5, ease: "power4.out", onUpdate: function() {
                speedMult = this.targets()[0].val;
            }});
        } else {
            speedMult = 1;
        }
    });

    const animate = () => {
        if (!isVisible) {
            requestAnimationFrame(animate);
            return;
        }
        
        // Solid black with slight transparency for motion trails
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw connections
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDistance) {
                    let opacity = (1 - (dist / maxDistance)) * 0.5; // base opacity
                    
                    // Interaction brighten
                    if (mouse.x !== null && mouse.y !== null && !isMobile) {
                        const midX = (nodes[i].x + nodes[j].x) / 2;
                        const midY = (nodes[i].y + nodes[j].y) / 2;
                        const mdx = mouse.x - midX;
                        const mdy = mouse.y - midY;
                        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                        if (mDist < mouseRadius) {
                            opacity += 0.5; // Stronger brighten near cursor
                        }
                    }
                    
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    
                    const gradient = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
                    gradient.addColorStop(0, `rgba(0, 243, 255, ${opacity})`);
                    gradient.addColorStop(1, `rgba(138, 43, 226, ${opacity})`);
                    
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
            
            // Lines to mouse
            if (mouse.x !== null && mouse.y !== null && !isMobile) {
                const dx = nodes[i].x - mouse.x;
                const dy = nodes[i].y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseRadius) {
                    const opacity = (1 - (dist / mouseRadius)) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        for (let node of nodes) {
            // Apply entrance warp speed
            const originalVx = node.vx;
            const originalVy = node.vy;
            node.vx *= speedMult;
            node.vy *= speedMult;
            
            node.update();
            node.draw();
            
            node.vx = originalVx;
            node.vy = originalVy;
        }
        
        requestAnimationFrame(animate);
    };
    
    animate();
};

// --- 5. Custom Cursor (Cinematic Follow) ---
const initCursor = () => {
  if (isMobile) return;
  const cursor = document.getElementById('cursor');
  const tracker = document.getElementById('cursor-tracker');
  if (!cursor || !tracker) return;

  let mouseX = 0, mouseY = 0, trackX = 0, trackY = 0;
  document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`; // GPU accelerated
  });

  const renderTracker = () => {
      trackX += (mouseX - trackX) * 0.15;
      trackY += (mouseY - trackY) * 0.15;
      tracker.style.transform = `translate3d(${trackX}px, ${trackY}px, 0)`;
      requestAnimationFrame(renderTracker);
  };
  renderTracker();

  document.querySelectorAll('a, button, input, select').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
};

// --- 6. 3D Tilt Hover Effects ---
const initTilt = () => {
    const cards = document.querySelectorAll('.verse-card');
    cards.forEach(card => {
        if(isMobile) {
            // Touch scale fallback
            card.addEventListener('touchstart', () => card.style.transform = 'scale(0.95)');
            card.addEventListener('touchend', () => card.style.transform = 'scale(1)');
        } else {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                card.style.transform = `perspective(1000px) rotateX(${-y / 15}deg) rotateY(${x / 15}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });
        }
    });
};

// --- remaining generic logic wrapper ---
document.addEventListener('DOMContentLoaded', () => {
  loadSmoothScroll();
  initCursor();
  initPreloader();
  initInteractions();
  initNetworkCanvas();
  initTilt();
  
  // Mobile Menu Logic
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (burger && mobileMenu) {
      burger.addEventListener('click', () => {
          burger.classList.toggle('active');
          mobileMenu.classList.toggle('active');
      });
      document.querySelectorAll('.mobile-link').forEach(link => {
          link.addEventListener('click', () => {
              burger.classList.remove('active');
              mobileMenu.classList.remove('active');
          });
      });
  }
  
  // Tabs logic
  document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn, .tab-panel').forEach(e => e.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
  });

  // GSAP Reveals
  window.initGSAP = () => {
      if (typeof gsap === 'undefined') return;
      gsap.from('.hero-title', { y: 60, opacity: 0, duration: 1.5, ease: 'power4.out' });
      gsap.from('.hero-subtitle', { y: 20, opacity: 0, duration: 1.5, delay: 0.3, ease: 'power4.out' });
      
      const elements = gsap.utils.toArray('.verse-card, .about-text, .stat-box, .event-card, .register-form');
      elements.forEach(el => {
          gsap.from(el, { scrollTrigger: { trigger: el, start: isMobile ? 'top 95%' : 'top 90%', toggleActions: 'play none none none' }, y: 50, opacity: 0, duration: 1, ease: 'power3.out' });
      });
  };
});
