(() => {
	'use strict';

	const journey = document.querySelector('#journey');
	const chapters = [...document.querySelectorAll('.chapter')];
	const ruler = document.querySelector('.ruler-input');
	const rulerTrack = document.querySelector('.ruler-track');
	const instrument = document.querySelector('.instrument');
	const needle = document.querySelector('#path3');
	const stent = document.querySelector('#path4');
	const destination = document.querySelector('.destination');
	const stage = document.querySelector('.stage');
	const header = document.querySelector('.header');
	const aperture = document.querySelector('#stent-aperture circle');
	const logo = document.querySelector('.compass-svg');
	const logoWrap = document.querySelector('.logo-wrap');
	const chrome = [...document.querySelectorAll('.watermark, .compass-caption, .stage-bottom, .chapter-nav')];
	const dial = [...document.querySelectorAll('.instrument-scale, .orbit, .bearing')];
	const angleLabel = document.querySelector('#angle');
	const ring = document.querySelector('.instrument-scale');
	const rulerTicksContainer = document.querySelector('.ruler-ticks');
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const compactLayout = matchMedia('(max-height: 500px)');
	const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
	const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
	const chapterPositions = [0, 1, 2, 3];
	const totalUnits = 4.6;
	// 两套刻度仅创建一次，滚动时只更新变换和颜色
	const ringTicks = Array.from({ length: 72 }, (_, index) => {
		const tick = document.createElement('span');
		tick.className = `dial-tick${index % 6 === 0 ? ' is-major' : ''}`;
		tick.style.transform = `rotate(${index * 5}deg)`;
		tick.append(document.createElement('i'));
		ring.append(tick);
		return tick;
	});
	const rulerTicks = Array.from({ length: 49 }, (_, index) => {
		const tick = document.createElement('i');
		tick.className = index % 12 === 0 ? 'is-major' : '';
		rulerTicksContainer.append(tick);
		return tick;
	});
	let frame = 0;
	let displayedProgress = null;
	let previousFrameTime = 0;
	let snapNextFrame = false;
	let activeChapter = -1;
	let portal = { x: 0, y: 0, radius: 1, finalScale: 1 };

	function measurePortal() {
		if (compactLayout.matches) return;
		const viewBox = logo.viewBox.baseVal;
		const logoTransform = document.querySelector('#g4').transform.baseVal.consolidate().matrix;
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

		if (nextChapter !== activeChapter) {
			activeChapter = nextChapter;

		}
		chapters.forEach((chapter, index) => {
			const entering = index === 0 ? 1 : ease((position - index + 0.04) / 0.04);
			const leaving = index === 3 ? fadeOut : 1 - ease((position - index - 0.78) / 0.18);
			const opacity = entering * leaving;
			chapter.style.opacity = opacity.toFixed(4);
			chapter.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
			chapter.style.transform = reducedMotion.matches ? 'none' : `translateY(${(1 - entering) * 20 - (1 - leaving) * 14}px)`;
			chapter.inert = index !== activeChapter || fadeOut < 0.05;
			chapter.setAttribute('aria-hidden', String(chapter.inert));
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
			? ['Context', 'Momentum', 'Control', 'Trace'] : ['现场', '进度', '边界', '记录'];
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
			document.querySelector(hash).scrollIntoView({ behavior: 'auto' });
			return;
		}
		const unit = hash === '#studio' ? totalUnits : chapterPositions[index];
		if (!smooth) snapNextFrame = true;
		window.scrollTo({ top: journey.offsetTop + scrollRange() * unit / totalUnits, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
	}

	document.querySelectorAll('a[href^="#"]').forEach(link => {
		link.addEventListener('click', event => {
			const hash = link.getAttribute('href');
			if (!document.querySelector(hash)) return;
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
	ruler.addEventListener('input', () => {
		snapNextFrame = true;
		window.scrollTo({ top: journey.offsetTop + scrollRange() * (Number(ruler.value) / 100) / totalUnits, behavior: 'instant' });
		scheduleRender();
	});
	window.addEventListener('scroll', () => {
		syncHeader();
		scheduleRender();
	}, { passive: true });
	window.addEventListener('resize', () => { measurePortal(); scheduleRender(); });
	window.addEventListener('hashchange', () => navigateTo(location.hash));
	window.addEventListener('popstate', () => navigateTo(location.hash || '#understand'));
	reducedMotion.addEventListener('change', scheduleRender);
	compactLayout.addEventListener('change', () => { measurePortal(); scheduleRender(); });
	window.addEventListener('pageshow', event => {
		if (!event.persisted && location.hash) navigateTo(location.hash, false);
		scheduleRender();
	});

	const english = {
		skip: 'Skip animation, explore Studio', overview: 'EXPLORE', docs: 'DOCS ↗',
		finalTitle: 'Your idea is ready.<br /><span>Make it real.</span>',
		finalBody: 'From the first idea to evidence you can inspect. Start your next project with Daedalus Studio.',
		download: 'DOWNLOAD FOR WINDOWS', start: 'READ THE DOCS ↗',
		title0: 'Read first.<br /><span>Then act.</span>', body0: 'No copy-pasted context.<br />It reads your Godot project,<br />scene, scripts, and editor state.',
		detailTitle0: 'Your project is not a blank chat.', detailBody0: 'The open scene, selected node, scripts, and diagnostics<br />become context for the work.',
		title1: 'Hard tasks.<br /><span>Keep moving.</span>', body1: 'Plans, tool events, and checkpoints<br />stay with the run.<br />Close Studio. Keep your progress.',
		detailTitle1: 'Start once. Continue anywhere.', detailBody1: 'Pause, restart, or switch workspaces.<br />Resume from the last reliable state.', plan1: 'Read the scene', plan2: 'Run the task', plan3: 'Save progress',
		title2: 'Let it act.<br /><span>You decide.</span>', body2: 'Changes arrive as reviewable diffs.<br />Writes, deletes, and commands<br />cross an explicit approval gate.',
		detailTitle2: 'Automation with a boundary.', detailBody2: 'Read, verify, propose, and write are separate.<br />Every change stays visible before it lands.', approval: 'READY FOR YOUR REVIEW',
		title3: 'The task ends.<br /><span>The trace stays.</span>', body3: 'Terminal output, diagnostics, checks, and changes<br />stay with the run.<br />Open it later. Continue from reality.',
		detailTitle3: 'Not “done”. A local trace.', detailBody3: 'Results, warnings, and failure reasons<br />remain available when you need them.', check1: 'Code checks', check2: 'Terminal output', check3: 'Task record',
		scroll: 'SCROLL TO FIND YOUR DIRECTION', skipShort: 'EXPLORE STUDIO ↗',
	};
	const copyElements = [...document.querySelectorAll('[data-copy]')];
	const chinese = Object.fromEntries(copyElements.map(element => [element.dataset.copy, element.innerHTML]));
	let language = 'zh-CN';
	document.querySelector('#language').addEventListener('click', event => {
		language = language === 'zh-CN' ? 'en' : 'zh-CN';
		const dictionary = language === 'en' ? english : chinese;
		copyElements.forEach(element => { element.innerHTML = dictionary[element.dataset.copy]; });
		document.documentElement.lang = language;
		ruler.setAttribute('aria-label', language === 'en' ? 'Explore progress' : '探索进度');
		scheduleRender();
		event.currentTarget.textContent = language === 'en' ? '中文' : 'EN';
		event.currentTarget.setAttribute('aria-label', language === 'en' ? '切换为中文' : 'Switch to English');
		document.title = language === 'en' ? 'Daedalus Studio — Give ideas a direction.' : 'Daedalus Studio — 让想法，有方向。';
	});

	measurePortal();
	render();
})();
