(function () {
  'use strict';

  const DEFAULT_RENDER_API_URL = (function () {
    try {
      if (window && window.location && /^https?:$/i.test(window.location.protocol)) {
        if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || '')) {
          return window.location.origin.replace(/\/$/, '') + '/api/render';
        }
      }
    } catch (_err) {}
    return 'https://calvey-render-api.vercel.app/api/render';
  })();
  const MAX_CAPTURE_EDGE = 1600;

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!rect) return true;
    if (!rect.width || !rect.height) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (!style) return true;
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function getActiveElementById(id) {
    const escapedId = String(id || '').replace(/"/g, '\\"');
    const matches = Array.prototype.slice.call(document.querySelectorAll('[id="' + escapedId + '"]'));
    if (!matches.length) return null;
    const visible = matches.find(isElementVisible);
    return visible || matches[matches.length - 1] || null;
  }

  function safeText(value, fallback) {
    if (value === null || value === undefined) return fallback;
    const str = String(value).trim();
    return str || fallback;
  }

  function getProjectFieldData() {
    const city = safeText(window.siteData && window.siteData.city, '');
    const address = safeText((window.siteData && (window.siteData.address || window.siteData.siteName)) || city, 'the project site');

    let climateDescription = 'temperate climate';
    if (window.siteData && typeof window.siteData.lat === 'number') {
      const lat = window.siteData.lat;
      if (lat >= 50) climateDescription = 'cool northern climate with long winter light and low sun angles';
      else if (lat >= 35) climateDescription = 'temperate four-season climate';
      else if (lat >= 23) climateDescription = 'warm temperate climate with strong summer sun';
      else climateDescription = 'subtropical climate with high heat and humidity';
    }

    if (window.sunData && typeof window.sunData.hdd === 'number' && typeof window.sunData.cdd === 'number') {
      if (window.sunData.hdd > window.sunData.cdd) climateDescription += ', cold-dominant seasonal profile';
      else if (window.sunData.cdd > window.sunData.hdd) climateDescription += ', cooling-dominant seasonal profile';
      else climateDescription += ', mixed heating/cooling demands';
    }

    const buildingType = safeText(window.programData && window.programData.buildingType, 'mixed-use').toLowerCase();
    const storyCount = Number((window.outline && window.outline.nFloors) || (window.programData && window.programData.nFloors) || 4);
    const approximateHeight = Math.round((window.outline && window.outline.totalHeight) || (window.programData && window.programData.totalHeight) || storyCount * 12);

    const orientation = typeof window.getOrientationContext === 'function'
      ? safeText(window.getOrientationContext().replace(/^,\s*/, '').replace('property oriented along ', ''), 'east-west axis')
      : 'east-west axis';

    let solarStrategy = 'passive solar-aware facade calibration with shading where needed';
    if (window.sunData && typeof window.sunData.hdd === 'number' && typeof window.sunData.cdd === 'number') {
      if (window.sunData.hdd > window.sunData.cdd) solarStrategy = 'southern solar access with winter gain and controlled summer shading';
      else if (window.sunData.cdd > window.sunData.hdd) solarStrategy = 'deep overhangs, solar control, and heat-gain reduction';
    }

    const glazingEmphasis = (window.outline && window.outline.leanAngle && Math.abs(window.outline.leanAngle) > 3)
      ? 'selective high-performance glazing emphasizing primary views and controlled daylight'
      : 'balanced high-performance glazing with clear facade hierarchy';

    const massingLanguage = (window.windData && window.windData.twist)
      ? 'wind-shaped massing with subtle torsion and tapered vertical articulation'
      : 'clean climate-responsive massing with disciplined proportions';

    const context = 'surrounding street edge, planting, neighboring urban fabric, and pedestrian scale foreground';
    const styleMode = styleDescriptor((getActiveElementById('stylePreset') || {}).value || 'watercolor');

    return {
      address,
      city: city || 'the surrounding city',
      climateDescription,
      buildingType,
      orientation,
      solarStrategy,
      glazingEmphasis,
      storyCount,
      approximateHeight,
      massingLanguage,
      context,
      styleMode
    };
  }

  function styleDescriptor(mode) {
    if (mode === 'photorealistic' || mode === 'magazine' || mode === 'night' || mode === 'aerial') {
      return 'photoreal exterior rendering';
    }
    return 'watercolor architectural sketch';
  }

  function buildRenderingPrompt(mode) {
    const d = getProjectFieldData();
    const style = styleDescriptor(mode);

    const structureAnchor = 'CRITICAL: The input image is a 3D massing model. You MUST exactly follow the silhouette, shape, proportions, setbacks, and stepped/twisted geometry shown in the input image. Do not invent a different building form. The output building must match the input model block-for-block.';

    if (style === 'photoreal exterior rendering') {
      return [
        structureAnchor,
        `Render this 3D model as a photoreal exterior of a ${d.buildingType} building at ${d.address}, ${d.city}.`,
        `Apply materials, glazing, and facade detail directly onto the exact massing shown in the input image. Keep the same camera angle, building outline, and proportions.`,
        `Climate context: ${d.climateDescription} with ${d.solarStrategy}. Use ${d.glazingEmphasis} and ${d.massingLanguage}.`,
        `Add ${d.context}, realistic vegetation, and atmospheric lighting at architectural photography quality.`
      ].join(' ');
    }

    return [
      structureAnchor,
      `Render this 3D model as a watercolor architectural sketch of a ${d.buildingType} building at ${d.address}, ${d.city}.`,
      `The sketch must depict the exact same stepped/twisted massing, outline, and camera angle from the input image. Apply watercolor treatment onto that form.`,
      `Climate context: ${d.climateDescription} with ${d.solarStrategy}. Emphasize ${d.glazingEmphasis} and ${d.massingLanguage}.`,
      `Soft layered washes, loose expressive brushwork, selective ink linework, and ${d.context}.`
    ].join(' ');
  }

  function updatePromptFromData() {
    const style = getActiveElementById('stylePreset');
    const promptInput = getActiveElementById('promptInput');
    if (!promptInput) return;
    promptInput.value = buildRenderingPrompt(style ? style.value : 'watercolor');
  }

  function showApiEndpointError(message) {
    const errorEl = getActiveElementById('apiEndpointError');
    if (!errorEl) return;
    errorEl.style.display = message ? 'block' : 'none';
    errorEl.textContent = message || '';
  }

  function resolveRenderApiUrl() {
    const input = getActiveElementById('renderApiUrl');
    const raw = safeText(input && input.value, DEFAULT_RENDER_API_URL);
    let parsed;
    try {
      parsed = new URL(raw);
    } catch (_err) {
      showApiEndpointError('Please enter a valid render endpoint URL.');
      return null;
    }
    if (!/^https?:$/.test(parsed.protocol) || !parsed.pathname.includes('/api/render')) {
      showApiEndpointError('Render endpoint must be an http(s) URL that includes /api/render.');
      return null;
    }
    showApiEndpointError('');
    return parsed.toString();
  }

  function dataUrlToImageSource(dataUrl) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Captured image could not be decoded.')); };
      img.src = dataUrl;
    });
  }

  async function resizeDataUrl(dataUrl) {
    const img = await dataUrlToImageSource(dataUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('Capture produced empty image dimensions.');

    const maxEdge = Math.max(w, h);
    const scale = maxEdge > MAX_CAPTURE_EDGE ? (MAX_CAPTURE_EDGE / maxEdge) : 1;
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(img, 0, 0, outW, outH);
    return canvas.toDataURL('image/jpeg', 0.88);
  }

  async function captureViewportDataUrl() {
    if (window.renderer && window.scene && window.camera) {
      window.renderer.render(window.scene, window.camera);
    }

    const directCanvas = getActiveElementById('renderCanvas') || document.querySelector('#renderViewport canvas');
    if (directCanvas && typeof directCanvas.toDataURL === 'function') {
      try {
        return await resizeDataUrl(directCanvas.toDataURL('image/png'));
      } catch (_err) {}
    }

    const resultImageCandidate = document.querySelector('#renderViewport img, #aiResult img');
    if (resultImageCandidate && resultImageCandidate.src) {
      try {
        return await resizeDataUrl(resultImageCandidate.src);
      } catch (_err) {}
    }

    const viewport = getActiveElementById('renderViewport');
    if (!viewport) throw new Error('Render viewport not found.');

    if (typeof window.html2canvas !== 'function') {
      await new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = function () { reject(new Error('html2canvas fallback failed to load.')); };
        document.head.appendChild(script);
      });
    }

    const fallbackCanvas = await window.html2canvas(viewport, { backgroundColor: '#060606', useCORS: true, scale: 1 });
    return resizeDataUrl(fallbackCanvas.toDataURL('image/png'));
  }

  function setLoadingState(isLoading, text, isError) {
    const captureBtn = getActiveElementById('captureBtn');
    const statusLine = getActiveElementById('statusLine');
    if (captureBtn) {
      captureBtn.disabled = isLoading;
      captureBtn.textContent = isLoading ? 'Rendering…' : 'Capture & Render';
    }
    if (statusLine) {
      statusLine.textContent = text || '';
      statusLine.className = 'status' + (isLoading ? ' active' : '') + (isError ? ' error' : '');
    }
  }

  async function captureAndRenderSecure() {
    const promptInput = getActiveElementById('promptInput');
    const stylePreset = getActiveElementById('stylePreset');
    const resultPanel = getActiveElementById('aiResult');
    const resultImage = getActiveElementById('aiImage');
    const downloadBtn = getActiveElementById('downloadRenderBtn');

    const renderApiUrl = resolveRenderApiUrl();
    if (!renderApiUrl) {
      setLoadingState(false, 'Render failed: invalid endpoint URL.', true);
      return;
    }

    setLoadingState(true, 'Capturing base image and submitting render job...', false);

    try {
      const baseImageDataUrl = await captureViewportDataUrl();
      const prompt = safeText(promptInput && promptInput.value, buildRenderingPrompt(stylePreset ? stylePreset.value : 'watercolor'));
      const metadata = Object.assign({ renderMode: styleDescriptor(stylePreset ? stylePreset.value : '') }, getProjectFieldData());

      const response = await fetch(renderApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseImageDataUrl, prompt, metadata })
      });

      const payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || ('Render API failed (' + response.status + ')'));
      if (!payload.imageDataUrl) throw new Error('Render API response missing imageDataUrl.');

      resultPanel.style.display = 'block';
      resultImage.src = payload.imageDataUrl;
      if (promptInput && payload.revisedPrompt) {
        promptInput.value = payload.revisedPrompt;
      }
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.onclick = function () {
          const a = document.createElement('a');
          a.href = payload.imageDataUrl;
          a.download = 'calvey_form_render_' + Date.now() + '.png';
          a.click();
        };
      }
      if (typeof window.addToGallery === 'function') {
        window.addToGallery(payload.imageDataUrl, 'OpenAI · ' + (payload.model || 'render') + ' · ' + new Date().toLocaleTimeString());
      }
      setLoadingState(false, 'Render complete.', false);
    } catch (error) {
      const message = (error && error.message) ? error.message : 'Unknown error.';
      if (/load failed|failed to fetch|networkerror|timeout/i.test(message)) {
        // API unreachable — fall back to local high-res capture
        setLoadingState(true, 'Render API unreachable — falling back to local capture...', false);
        try {
          if (window.renderer && window.scene && window.camera) {
            const host = getActiveElementById('renderViewport');
            const origW = (host && host.clientWidth) || 800;
            const origH = (host && host.clientHeight) || 450;
            const origPixelRatio = window.renderer.getPixelRatio();
            window.renderer.setPixelRatio(2);
            window.renderer.setSize(origW, origH, false);
            window.renderer.render(window.scene, window.camera);
            const localDataUrl = window.renderer.domElement.toDataURL('image/png');
            window.renderer.setPixelRatio(origPixelRatio);
            window.renderer.setSize(origW, origH, false);
            if (resultPanel) resultPanel.style.display = 'block';
            if (resultImage) resultImage.src = localDataUrl;
            if (downloadBtn) {
              downloadBtn.disabled = false;
              downloadBtn.onclick = function () {
                const a = document.createElement('a');
                a.href = localDataUrl;
                a.download = 'calvey_form_render_' + Date.now() + '.png';
                a.click();
              };
            }
            if (typeof window.addToGallery === 'function') {
              window.addToGallery(localDataUrl, 'Local capture · ' + new Date().toLocaleTimeString());
            }
            setLoadingState(false, 'Local high-res capture complete (API was unreachable).', false);
          } else {
            setLoadingState(false, 'Render API unreachable and local renderer not available. Verify the endpoint URL and CORS settings.', true);
          }
        } catch (fallbackErr) {
          setLoadingState(false, 'Render API unreachable. Local fallback also failed: ' + ((fallbackErr && fallbackErr.message) || 'unknown'), true);
        }
      } else {
        setLoadingState(false, 'Render failed: ' + message, true);
      }
    }
  }

  function registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/CALVEY_FORM/service-worker.js').then(function (registration) {
          if (registration && typeof registration.update === 'function') {
            registration.update().catch(function () {});
          }
        }).catch(function () {});
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    registerPWA();
    updatePromptFromData();

    const endpointInput = getActiveElementById('renderApiUrl');
    if (endpointInput && !endpointInput.value.trim()) {
      endpointInput.value = DEFAULT_RENDER_API_URL;
    }
    if (endpointInput) {
      endpointInput.addEventListener('blur', resolveRenderApiUrl);
      endpointInput.addEventListener('input', function () {
        showApiEndpointError('');
      });
    }

    const regenBtn = getActiveElementById('regenPromptBtn');
    if (regenBtn) regenBtn.addEventListener('click', updatePromptFromData);

    const stylePreset = getActiveElementById('stylePreset');
    if (stylePreset) {
      stylePreset.addEventListener('change', function () {
        if (stylePreset.value !== 'custom') updatePromptFromData();
      });
    }

    const captureBtn = getActiveElementById('captureBtn');
    if (captureBtn) captureBtn.addEventListener('click', captureAndRenderSecure);
  });
})();
