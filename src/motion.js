export function initCompass(root) {
	const journey = root.querySelector('#journey');
	const chapters = [...root.querySelectorAll('.chapter')];
	const ruler = root.querySelector('.ruler-input');
	const rulerTrack = root.querySelector('.ruler-track');
	const instrument = root.querySelector('.instrument');
	const needle = root.querySelector('#path3');
	const stent = root.querySelector('#path4');
	const destination = root.querySelector('.destination');
	const stage = root.querySelector('.stage');
	const header = root.querySelector('.header');
	const featureBackdrop = root.querySelector('.feature-backdrop');
	const featureSystem = root.querySelector('.feature-system');
	const featurePlanets = [...root.querySelectorAll('.feature-system .feature-planet')];
	const featureLabelsLayer = root.querySelector('.feature-labels');
	const featureLabels = [...featureLabelsLayer.querySelectorAll('.feature-planet')];
	const aperture = root.querySelector('#stent-aperture circle');
	const logo = root.querySelector('.compass-svg');
	const logoWrap = root.querySelector('.logo-wrap');
	const chrome = [...root.querySelectorAll('.watermark, .compass-caption, .stage-bottom, .chapter-nav')];
	const dial = [...root.querySelectorAll('.instrument-scale, .orbit, .bearing')];
	const angleLabel = root.querySelector('#angle');
	const ring = root.querySelector('.instrument-scale');
	const rulerTicksContainer = root.querySelector('.ruler-ticks');
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const compactLayout = matchMedia('(max-height: 500px)');
	const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
	const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
	const chapterPositions = [0, 1, 2, 3];
	const totalUnits = 4.6;
	const ringTicks = [...ring.querySelectorAll('.dial-tick')];
	const rulerTicks = [...rulerTicksContainer.querySelectorAll('i')];
	let frame = 0;
	let displayedProgress = null;
	let previousFrameTime = 0;
	let snapNextFrame = false;
	let activeChapter = -1;
	let portal = { x: 0, y: 0, radius: 1, finalScale: 1 };

	function setPlanetExpansion(planet, expanded) {
		if (!expanded) {
			planet.classList.remove('is-expanded');
			planet.style.removeProperty('--planet-hover-offset');
			planet.style.removeProperty('--planet-hover-offset-y');
			return;
		}
		planet.classList.remove('is-expanded');
		planet.style.removeProperty('--planet-hover-offset');
		planet.style.removeProperty('--planet-hover-offset-y');
		const isMobile = window.innerWidth <= 700;
		const expandedWidth = isMobile ? Math.min(184, window.innerWidth * 0.54) : Math.min(240, Math.max(180, window.innerWidth * 0.16));
		const expandedHeight = isMobile ? 92 : Math.min(136, Math.max(96, window.innerWidth * 0.1));
		const rect = planet.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const left = clamp(centerX - expandedWidth / 2, 12, window.innerWidth - expandedWidth - 12);
		const top = clamp(centerY - expandedHeight / 2, 12, window.innerHeight - expandedHeight - 12);
		planet.style.setProperty('--planet-hover-offset', `${left + expandedWidth / 2 - centerX}px`);
		planet.style.setProperty('--planet-hover-offset-y', `${top + expandedHeight / 2 - centerY}px`);
		planet.classList.add('is-expanded');
	}

	const listeners = [];
	const on = (target, name, handler, options) => {
		target.addEventListener(name, handler, options);
		listeners.push(() => target.removeEventListener(name, handler, options));
	};
	featureLabels.forEach(planet => {
		on(planet, 'pointerenter', () => planet.classList.add('is-expanded'));
		on(planet, 'pointerleave', () => { if (document.activeElement !== planet) setPlanetExpansion(planet, false); });
		on(planet, 'focus', () => setPlanetExpansion(planet, true));
		on(planet, 'blur', () => { if (!planet.matches(':hover')) setPlanetExpansion(planet, false); });
	});

	function measurePortal() {
		if (compactLayout.matches) return;
		const viewBox = logo.viewBox.baseVal;
		const logoTransform = root.querySelector('#g4').transform.baseVal.consolidate().matrix;
		const svgX = aperture.cx.baseVal.value + logoTransform.e;
		const svgY = aperture.cy.baseVal.value + logoTransform.f;
		const instrumentStyle = getComputedStyle(instrument);
		const wrapStyle = getComputedStyle(logoWrap);
		const logoWidth = parseFloat(wrapStyle.width);
		const originX = parseFloat(wrapStyle.left) + svgX / viewBox.width * logoWidth;
		const originY = parseFloat(wrapStyle.top) + svgY / viewBox.height * parseFloat(wrapStyle.height);
		instrument.style.transformOrigin = `${originX}px ${originY}px`;
		const x = parseFloat(instrumentStyle.left) - parseFloat(instrumentStyle.width) / 2 + originX;
		const y = parseFloat(instrumentStyle.top) - parseFloat(instrumentStyle.height) / 2 + originY;
		const radius = aperture.r.baseVal.value / viewBox.width * logoWidth;
		const farthestCorner = Math.hypot(Math.max(x, stage.clientWidth - x), Math.max(y, stage.clientHeight - y));
		portal = { x, y, radius, finalScale: farthestCorner / radius * 1.04 };
	}

	function scrollRange() {
		return Math.max(1, journey.offsetHeight - window.innerHeight);
	}

	function syncHeader() {
		if (!header) return;
		header.classList.toggle('is-scrolling', window.scrollY > 8);
	}

	function render(time = performance.now()) {
		frame = 0;
		syncHeader();
		if (compactLayout.matches) {
			displayedProgress = null;
			previousFrameTime = 0;
			featureBackdrop.style.opacity = '0';
			featureSystem.style.opacity = '0';
			featureSystem.style.visibility = 'hidden';
			featureLabelsLayer.style.opacity = '0';
			featureLabelsLayer.style.visibility = 'hidden';
			stage.classList.remove('is-features');
			chapters.forEach(chapter => { chapter.inert = false; chapter.removeAttribute('aria-hidden'); });
			destination.inert = false;
			destination.removeAttribute('aria-hidden');
			return;
		}
		const targetProgress = clamp((window.scrollY - journey.offsetTop) / scrollRange());
		const elapsed = previousFrameTime ? Math.min(64, time - previousFrameTime) : 16;
		previousFrameTime = time;
		// 以时间而非帧数平滑滚轮阶跃，停滚后收敛；不拦截原生滚动
		if (displayedProgress === null || reducedMotion.matches || snapNextFrame) {
			displayedProgress = targetProgress;
			snapNextFrame = false;
		} else {
			displayedProgress += (targetProgress - displayedProgress) * (1 - Math.exp(-elapsed / 85));
			if (Math.abs(targetProgress - displayedProgress) < 0.00002) displayedProgress = targetProgress;
		}
		const position = displayedProgress * totalUnits;
		const rotation = Math.min(360, position * 90);
		const reveal = ease((position - 3.7) / 0.9);
		const nextChapter = Math.min(3, Math.floor(position + 0.001));
		const fadeOut = 1 - ease((position - 3.58) / 0.42);
		const featureEnter = ease((position - 0.72) / 0.34);
		const featureExit = 1 - ease((position - 2.58) / 0.42);
		const featureOpacity = featureEnter * featureExit;
		const featureBackgroundOpacity = featureEnter * (1 - ease((position - 1.65) / 0.4));
		const featureScale = 0.03
			+ ease((position - 0.72) / 0.5) * 0.55
			+ ease((position - 1.15) / 0.85) * 0.55
			+ ease((position - 2.0) / 0.95) * 5.1;

		activeChapter = nextChapter;
		chapters.forEach((chapter, index) => {
			const chapterPhase = position - index;
			const entering = index === 0 ? 1 : ease((chapterPhase + 0.16) / 0.24);
			const leaving = index === 3 ? fadeOut : 1 - ease((chapterPhase - 0.78) / 0.42);
			const opacity = entering * leaving;
			chapter.style.opacity = opacity.toFixed(4);
			chapter.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
			chapter.style.transform = 'none';
			chapter.inert = index !== activeChapter || fadeOut < 0.05;
			chapter.setAttribute('aria-hidden', String(chapter.inert));
			const copyItems = [...chapter.querySelectorAll('.chapter-copy > *')];
			copyItems.forEach((item, itemIndex) => {
				const copyProgress = index === 0 ? 1 : ease((chapterPhase + 0.24 - itemIndex * 0.08) / 0.36);
				item.style.opacity = (copyProgress * leaving).toFixed(4);
				const flowOffset = (1 - copyProgress) * 18 - chapterPhase * 16;
				item.style.transform = reducedMotion.matches ? 'none' : `translateY(${flowOffset}px)`;
			});
		});
		featureBackdrop.style.opacity = featureBackgroundOpacity.toFixed(4);
		featureSystem.style.opacity = featureOpacity.toFixed(4);
		featureSystem.style.visibility = featureOpacity > 0.001 ? 'visible' : 'hidden';
		featureSystem.inert = featureOpacity < 0.05;
		featureSystem.setAttribute('aria-hidden', String(featureOpacity < 0.05));
		featureLabelsLayer.style.opacity = featureOpacity.toFixed(4);
		featureLabelsLayer.style.visibility = featureOpacity > 0.001 ? 'visible' : 'hidden';
		featureLabelsLayer.inert = featureOpacity < 0.05;
		featureLabelsLayer.setAttribute('aria-hidden', String(featureOpacity < 0.05));
		featureSystem.style.setProperty('--system-scale', featureScale.toFixed(4));
		const featureBlend = Math.round(featureBackgroundOpacity * 100);
		featureSystem.style.setProperty('--feature-mask', `color-mix(in srgb, var(--feature-bg) ${featureBlend}%, var(--bg))`);
		const featureText = `color-mix(in srgb, var(--feature-ink) ${featureBlend}%, var(--ink))`;
		const featureTextMuted = `color-mix(in srgb, var(--feature-muted) ${featureBlend}%, var(--ink-secondary))`;
		featureSystem.style.setProperty('--feature-text', featureText);
		featureSystem.style.setProperty('--feature-text-muted', featureTextMuted);
		featureLabelsLayer.style.setProperty('--feature-text', featureText);
		featureLabelsLayer.style.setProperty('--feature-text-muted', featureTextMuted);
		stage.classList.toggle('is-features', featureBackgroundOpacity > 0.5);
		featurePlanets.forEach((planet, index) => {
			const baseAngle = Number(planet.dataset.angle ?? 0);
			const speed = index < 5 ? 16 : -12;
			const angle = baseAngle + position * speed;
			const baseRadius = planet.classList.contains('feature-planet--outer')
				? Math.min(window.innerWidth * 0.5, window.innerHeight * 0.58)
				: Math.min(window.innerWidth * 0.38, window.innerHeight * 0.45);
			const distance = `${baseRadius * featureScale}px`;
			const label = featureLabels[index];
			planet.style.setProperty('--planet-angle', `${angle}deg`);
			planet.style.setProperty('--planet-distance', distance);
			label.style.setProperty('--planet-angle', `${angle}deg`);
			label.style.setProperty('--planet-distance', distance);
			planet.style.opacity = featureOpacity.toFixed(4);
			label.style.opacity = '1';
		});

		needle.style.transform = `rotate(${rotation}deg)`;
		angleLabel.textContent = `${String(Math.round(rotation)).padStart(3, '0')}°`;
		// 原图指针朝东北（45°），两端的波峰随方位移动，跨越 0° 时连续
		const heading = (rotation + 45) % 360;
		const angularDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
		ringTicks.forEach((tick, index) => {
			const leading = Math.exp(-Math.pow(angularDistance(index * 5, heading) / 13, 2));
			const trailing = Math.exp(-Math.pow(angularDistance(index * 5, (heading + 180) % 360) / 13, 2));
			tick.style.setProperty('--activity', Math.max(leading, trailing * 0.55).toFixed(4));
		});
		const rulerProgress = Math.min(position / 4, 1);
		rulerTrack.style.setProperty('--position', rulerProgress);
		rulerTicks.forEach((tick, index) => {
			const distance = index / (rulerTicks.length - 1) - rulerProgress;
			const activity = Math.exp(-Math.pow(distance / 0.065, 2));
			tick.style.setProperty('--activity', activity.toFixed(4));
		});
		// 拖动时保留原生 range 的输入值，滚动时同步滑块位置
		if (!ruler.matches(':active')) ruler.value = String(rulerProgress * 400);
		const names = document.documentElement.lang === 'en'
			? ['Context', 'Features', 'Control', 'Trace'] : ['现场', '特性', '边界', '记录'];
		ruler.setAttribute('aria-valuetext', `${names[activeChapter]} · ${Math.round(rotation)}°`);
		// 下层外壳、星形和旋转指针共用固定孔洞，stent 独立覆盖其上
		// 孔径按最远视口角点计算，终点依靠孔洞覆盖屏幕，不淡出整个 Logo
		const portalProgress = reducedMotion.matches ? Number(position >= 4.0) : reveal;
		const scale = Math.pow(portal.finalScale, portalProgress);
		instrument.classList.toggle('is-revealing', portalProgress > 0);
		instrument.style.transform = `translate(-50%, -50%) scale(${scale})`;
		stent.style.opacity = String(1 - ease(portalProgress / 0.28));
		dial.forEach(element => { element.style.opacity = String(1 - ease(reveal / 0.3)); });
		chrome.forEach(element => {
			element.style.opacity = String(fadeOut);
			element.style.visibility = fadeOut > 0.001 ? 'visible' : 'hidden';
			element.inert = fadeOut < 0.05;
		});
		// 内容固定在 Logo 后面，仅在与 SVG 孔洞重合的圆内显示
		// 半像素内缩避免孔洞边缘因栅格化出现内容泄漏
		destination.style.opacity = '1';
		destination.style.visibility = portalProgress > 0 ? 'visible' : 'hidden';
		destination.style.clipPath = `circle(${Math.max(0, portal.radius * scale - 0.5)}px at ${portal.x}px ${portal.y}px)`;
		destination.inert = portalProgress < 0.98;
		destination.setAttribute('aria-hidden', String(destination.inert));
		if (displayedProgress !== targetProgress) scheduleRender();
		else previousFrameTime = 0;
	}

	function scheduleRender() {
		if (!frame) frame = requestAnimationFrame(render);
	}

	function navigateTo(hash, smooth = true) {
		const index = chapters.findIndex(chapter => `#${chapter.id}` === hash);
		if (index < 0 && hash !== '#studio') return;
		if (compactLayout.matches) {
			root.querySelector(hash).scrollIntoView({ behavior: 'auto' });
			return;
		}
		const unit = hash === '#studio' ? totalUnits : chapterPositions[index];
		if (!smooth) snapNextFrame = true;
		window.scrollTo({ top: journey.offsetTop + scrollRange() * unit / totalUnits, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
	}

	root.querySelectorAll('a[href^="#"]').forEach(link => {
		on(link, 'click', event => {
			const hash = link.getAttribute('href');
			if (!root.querySelector(hash)) return;
			event.preventDefault();
			history.pushState(null, '', hash);
			navigateTo(hash);
			// 跳过链接立即揭幕并转移焦点，避免键盘焦点留在隐藏的动画层
			if (link.classList.contains('skip-link')) {
				navigateTo(hash, false);
				render();
				destination.setAttribute('tabindex', '-1');
				destination.focus({ preventScroll: true });
			}
		});
	});
	on(ruler, 'input', () => {
		snapNextFrame = true;
		window.scrollTo({ top: journey.offsetTop + scrollRange() * (Number(ruler.value) / 100) / totalUnits, behavior: 'instant' });
		scheduleRender();
	});
	on(window, 'scroll', () => {
		syncHeader();
		scheduleRender();
	}, { passive: true });
	on(window, 'resize', () => {
		measurePortal();
		featureLabels.filter(planet => planet.classList.contains('is-expanded')).forEach(planet => setPlanetExpansion(planet, true));
		scheduleRender();
	});
	on(window, 'hashchange', () => navigateTo(location.hash));
	on(window, 'popstate', () => navigateTo(location.hash || '#understand'));
	on(reducedMotion, 'change', scheduleRender);
	on(compactLayout, 'change', () => { measurePortal(); scheduleRender(); });
	on(window, 'pageshow', event => {
		if (!event.persisted && location.hash) navigateTo(location.hash, false);
		scheduleRender();
	});

	measurePortal();
	render();
	if (location.hash) navigateTo(location.hash, false);
	return () => {
		cancelAnimationFrame(frame);
		listeners.forEach(dispose => dispose());
	};
}
