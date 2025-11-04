function createSparkles(config = {}) {
  const {
    density = 100,
    heroCount = 6,
    minSize = 2,
    maxSize = 6,
    twinkle = true,
    className = ''
  } = config;

  // Generate sparkle data
  const points = [];
  
  // Regular sparkles
  for (let i = 0; i < density; i++) {
    const size = minSize + Math.random() * (maxSize - minSize);
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 18;
    const duration = 12 + Math.random() * 6;
    const type = Math.random() < 0.4 ? 'star' : 'dot';
    const opacity = 0.15 + Math.random() * 0.25;
    points.push({ x, y, size, delay, duration, type, opacity, isHero: false });
  }
  
  // Hero sparkles (larger)
  for (let i = 0; i < heroCount; i++) {
    const size = 10 + Math.random() * 4;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 18;
    const duration = 12 + Math.random() * 6;
    const type = 'star';
    const opacity = 0.6 + Math.random() * 0.2;
    points.push({ x, y, size, delay, duration, type, opacity, isHero: true });
  }

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'sparkles-svg');
  svg.setAttribute('aria-hidden', 'true');

  // Create defs
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Regular gradient
  const sparkGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  sparkGrad.setAttribute('id', 'sparkGrad');
  sparkGrad.setAttribute('cx', '50%');
  sparkGrad.setAttribute('cy', '50%');
  
  const stops = [
    { offset: '0%', color: '#FFFFFF' },
    { offset: '60%', color: '#E7E0FF' },
    { offset: '100%', color: '#BFA7FF' }
  ];
  
  stops.forEach(stop => {
    const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopEl.setAttribute('offset', stop.offset);
    stopEl.setAttribute('stop-color', stop.color);
    sparkGrad.appendChild(stopEl);
  });
  
  // Hero gradient
  const heroSparkGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  heroSparkGrad.setAttribute('id', 'heroSparkGrad');
  heroSparkGrad.setAttribute('cx', '50%');
  heroSparkGrad.setAttribute('cy', '50%');
  
  const heroStops = [
    { offset: '0%', color: '#FFFFFF', opacity: '0.9' },
    { offset: '50%', color: '#E7E0FF', opacity: '0.8' },
    { offset: '100%', color: '#BFA7FF', opacity: '0.6' }
  ];
  
  heroStops.forEach(stop => {
    const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopEl.setAttribute('offset', stop.offset);
    stopEl.setAttribute('stop-color', stop.color);
    if (stop.opacity) stopEl.setAttribute('stop-opacity', stop.opacity);
    heroSparkGrad.appendChild(stopEl);
  });
  
  // Filters
  const softGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  softGlow.setAttribute('id', 'softGlow');
  softGlow.setAttribute('x', '-50%');
  softGlow.setAttribute('y', '-50%');
  softGlow.setAttribute('width', '200%');
  softGlow.setAttribute('height', '200%');
  
  const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '0.5');
  blur.setAttribute('result', 'blur');
  softGlow.appendChild(blur);
  
  const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode1.setAttribute('in', 'blur');
  const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode2.setAttribute('in', 'SourceGraphic');
  merge.appendChild(mergeNode1);
  merge.appendChild(mergeNode2);
  softGlow.appendChild(merge);
  
  // Hero filter
  const heroGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  heroGlow.setAttribute('id', 'heroGlow');
  heroGlow.setAttribute('x', '-100%');
  heroGlow.setAttribute('y', '-100%');
  heroGlow.setAttribute('width', '300%');
  heroGlow.setAttribute('height', '300%');
  
  const heroBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  heroBlur.setAttribute('stdDeviation', '1');
  heroBlur.setAttribute('result', 'blur');
  heroGlow.appendChild(heroBlur);
  
  const heroMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  const heroMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  heroMergeNode1.setAttribute('in', 'blur');
  const heroMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  heroMergeNode2.setAttribute('in', 'SourceGraphic');
  heroMerge.appendChild(heroMergeNode1);
  heroMerge.appendChild(heroMergeNode2);
  heroGlow.appendChild(heroMerge);
  
  defs.appendChild(sparkGrad);
  defs.appendChild(heroSparkGrad);
  defs.appendChild(softGlow);
  defs.appendChild(heroGlow);
  svg.appendChild(defs);
  
  // Create sparkles
  points.forEach((p, i) => {
    const gradientId = p.isHero ? 'heroSparkGrad' : 'sparkGrad';
    const filterId = p.isHero ? 'heroGlow' : 'softGlow';
    
    if (p.type === 'star') {
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const starPoints = `
        ${p.x},${p.y - p.size * 0.5}
        ${p.x + p.size * 0.15},${p.y - p.size * 0.15}
        ${p.x + p.size * 0.5},${p.y}
        ${p.x + p.size * 0.15},${p.y + p.size * 0.15}
        ${p.x},${p.y + p.size * 0.5}
        ${p.x - p.size * 0.15},${p.y + p.size * 0.15}
        ${p.x - p.size * 0.5},${p.y}
        ${p.x - p.size * 0.15},${p.y - p.size * 0.15}
      `.trim().replace(/\s+/g, ' ');
      
      polygon.setAttribute('points', starPoints);
      polygon.setAttribute('fill', `url(#${gradientId})`);
      polygon.setAttribute('opacity', p.opacity);
      polygon.setAttribute('filter', `url(#${filterId})`);
      
      if (twinkle) {
        polygon.style.transformOrigin = `${p.x}% ${p.y}%`;
        polygon.style.animation = `sparkle-twinkle ${p.duration}s ${p.delay}s infinite ease-in-out`;
      }
      
      svg.appendChild(polygon);
    } else {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', p.size * 0.3);
      circle.setAttribute('fill', `url(#${gradientId})`);
      circle.setAttribute('opacity', p.opacity);
      circle.setAttribute('filter', `url(#${filterId})`);
      
      if (twinkle) {
        circle.style.transformOrigin = `${p.x}% ${p.y}%`;
        circle.style.animation = `sparkle-pulse ${p.duration}s ${p.delay}s infinite ease-in-out`;
      }
      
      svg.appendChild(circle);
    }
  });
  
  return svg;
}

// Default sparkles configuration - easy to customize
const SPARKLES_CONFIG = {
  density: 110,      // Number of regular sparkles
  heroCount: 8,      // Number of larger hero sparkles
  minSize: 2,        // Minimum sparkle size
  maxSize: 14,       // Maximum sparkle size for regular sparkles
  twinkle: true      // Enable twinkle animations
};

// Initialize sparkles when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const heroSection = document.querySelector('.gradient-bg');
  if (heroSection) {
    // Create sparkles container
    const sparklesContainer = document.createElement('div');
    sparklesContainer.className = 'sparkles-container';
    sparklesContainer.setAttribute('aria-hidden', 'true');
    
    // Create sparkles SVG with configuration
    const sparklesSvg = createSparkles(SPARKLES_CONFIG);
    
    sparklesContainer.appendChild(sparklesSvg);
    
    // Insert after the black overlay but before content
    const blackOverlay = heroSection.querySelector('.absolute.inset-0.bg-black');
    if (blackOverlay && blackOverlay.nextSibling) {
      blackOverlay.parentNode.insertBefore(sparklesContainer, blackOverlay.nextSibling);
    } else {
      heroSection.insertBefore(sparklesContainer, heroSection.firstChild);
    }
  }
});