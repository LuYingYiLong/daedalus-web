import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import compassSvg from './assets/compass.svg?raw';
import { content, features } from './content';
import { initCompass } from './motion';

const Beams = lazy(() => import('./components/Beams'));

const docsUrl = 'https://daedalus-docs.readthedocs.io/en/latest/';
const studioUrl = 'https://github.com/LuYingYiLong/daedalus-studio';
const imageUrl = `${import.meta.env.BASE_URL}img/daedalus-studio.png`;

function Lines({ lines }) {
	return lines.map((line, index) => (
		<span key={index}>
			{index > 0 && <br />}
			{line}
		</span>
	));
}

function Heading({ lines, id, first = false }) {
	const Tag = first ? 'h1' : 'h2';
	return (
		<Tag id={id}>
			{lines[0]}<br /><span>{lines[1]}</span>
		</Tag>
	);
}

function Header({ copy, onLanguageChange }) {
	return (
		<header className="header">
			<a className="brand" href="#understand" aria-label="Daedalus Studio">
				<span>DAEDALUS<span className="brand-light"> STUDIO</span></span>
			</a>
			<nav aria-label="主导航">
				<a href="#understand">{copy.explore}</a><a href={docsUrl}>{copy.docs}</a>
			</nav>
			<div className="header-end">
				<button id="language" type="button" aria-label={copy.languageLabel} onClick={onLanguageChange}>
					{copy.languageButton}
				</button>
				<a className="github" href={studioUrl}>GITHUB</a>
			</div>
		</header>
	);
}

function Destination({ copy }) {
	const [showBeams, setShowBeams] = useState(false);

	useEffect(() => {
		if (showBeams) return;
		const loadWhenNearby = () => {
			if (window.location.hash === '#studio' || window.scrollY > window.innerHeight * 2.5 || window.matchMedia('(max-height: 500px)').matches) {
				setShowBeams(true);
			}
		};
		loadWhenNearby();
		window.addEventListener('scroll', loadWhenNearby, { passive: true });
		window.addEventListener('hashchange', loadWhenNearby);
		window.addEventListener('resize', loadWhenNearby);
		return () => {
			window.removeEventListener('scroll', loadWhenNearby);
			window.removeEventListener('hashchange', loadWhenNearby);
			window.removeEventListener('resize', loadWhenNearby);
		};
	}, [showBeams]);

	return (
		<section className="destination" aria-labelledby="destination-title" id="studio">
			<div className="destination-beams" aria-hidden="true">
				{showBeams && (
					<Suspense fallback={null}>
						<Beams />
					</Suspense>
				)}
			</div>
			<div className="destination-copy">
				<p className="eyebrow">YOUR NEXT CHAPTER</p>
				<Heading lines={copy.finalTitle} id="destination-title" />
				<p>{copy.finalBody}</p>
				<div className="actions">
					<a className="primary" href={`${studioUrl}/releases/latest`}><span>{copy.download}</span></a>
					<a href={docsUrl}>{copy.start}</a>
				</div>
			</div>
			<figure className="workspace">
				<div className="workspace-bar"><span>DAEDALUS STUDIO</span><span>YOUR LOCAL WORKSPACE</span></div>
				<img src={imageUrl} alt="Daedalus Studio 工作区：项目、对话与工具面板" />
			</figure>
		</section>
	);
}

function Instrument() {
	return (
		<div className="instrument" aria-hidden="true">
			<div className="instrument-scale">
				{Array.from({ length: 72 }, (_, index) => (
					<span className={`dial-tick${index % 6 === 0 ? ' is-major' : ''}`} style={{ transform: `rotate(${index * 5}deg)` }} key={index}><i /></span>
				))}
			</div>
			<span className="bearing north">N</span><span className="bearing east">E</span>
			<span className="bearing south">S</span><span className="bearing west">W</span>
			<div className="orbit" />
			{/* 这个 SVG 来自仓库内的固定资源，保留其渐变、滤镜和中心孔洞的原始结构 */}
			<div className="logo-wrap" dangerouslySetInnerHTML={{ __html: compassSvg }} />
		</div>
	);
}

function FeatureSystem({ copy }) {
	return (
		<>
			<div className="feature-system" aria-label={copy.featureLabel} aria-hidden="true">
				<div className="feature-orbit feature-orbit--inner" aria-hidden="true" />
				<div className="feature-orbit feature-orbit--outer" aria-hidden="true" />
				{features.map((feature, index) => (
					<article
						className={`feature-planet feature-planet--${feature.orbit}`}
						data-order={index}
						data-angle={feature.angle}
						aria-hidden="true"
						key={feature.id}
					/>
				))}
			</div>
			<div className="feature-labels" aria-hidden="true">
				{features.map((feature, index) => (
					<article
						className={`feature-planet feature-planet--${feature.orbit} feature-label`}
						data-order={index}
						data-angle={feature.angle}
						tabIndex={0}
						key={feature.id}
					>
						<strong>{copy.features[feature.id][0]}</strong>
						<small className="feature-planet-detail">{copy.features[feature.id][1]}</small>
					</article>
				))}
			</div>
		</>
	);
}

function ChapterDetail({ index, chapter }) {
	if (index === 1) return null;
	return (
		<aside className="chapter-detail">
			<span className="detail-index">{chapter.detailIndex}</span>
			<h3>{chapter.detailTitle}</h3>
			<p><Lines lines={chapter.detailBody} /></p>
			{index === 0 && (
				<div className="context-tree">
					<span>my-game /</span><span>├─ Main.tscn</span><span>├─ Player.gd</span>
					<span>└─ selected: Player</span><span className="accent">↳ editor context connected</span>
				</div>
			)}
			{index === 2 && (
				<div className="diff">
					<span>CHANGE SET <b>+24 −08</b></span>
					<code className="removed">− return response;</code>
					<code>+ await review(changes);</code>
					<code>+ await verify(project);</code>
					<small>{chapter.approval}</small>
				</div>
			)}
			{index === 3 && (
				<div className="verification">
					{chapter.checks.map((label, checkIndex) => (
						<span key={label}>✓ <span>{label}</span><b>{['PASS', 'SAVED', 'READY'][checkIndex]}</b></span>
					))}
				</div>
			)}
		</aside>
	);
}

function Chapters({ copy }) {
	const ids = ['understand', 'plan', 'review', 'verify'];
	return (
		<div className="chapters">
			{copy.chapters.map((chapter, index) => (
				<section
					className={`chapter${index === 0 ? ' is-active' : ''}${index === 1 ? ' chapter--features' : ''}`}
					id={ids[index]}
					data-chapter={index}
					aria-labelledby={`title-${index}`}
					key={ids[index]}
				>
					<div className="chapter-copy">
						<p className="eyebrow">{chapter.eyebrow}</p>
						<Heading lines={chapter.title} id={`title-${index}`} first={index === 0} />
						<p className="description"><Lines lines={chapter.body} /></p>
					</div>
					<ChapterDetail index={index} chapter={chapter} />
				</section>
			))}
		</div>
	);
}

function Progress({ copy }) {
	return (
		<nav className="chapter-nav" aria-label={copy.progressLabel}>
			<div className="ruler-track" aria-hidden="true">
				<div className="ruler-ticks">
					{Array.from({ length: 49 }, (_, index) => <i className={index % 12 === 0 ? 'is-major' : ''} key={index} />)}
				</div>
				<span className="ruler-cursor" />
			</div>
			<input className="ruler-input" type="range" min="0" max="400" step="1" defaultValue="0" aria-label={copy.progressLabel} aria-valuetext="现场 · 0°" />
		</nav>
	);
}

export default function App() {
	const rootRef = useRef(null);
	const [language, setLanguage] = useState('zh-CN');
	const copy = content[language];

	useEffect(() => {
		document.documentElement.lang = language;
		document.title = copy.pageTitle;
		window.dispatchEvent(new Event('scroll'));
	}, [language, copy.pageTitle]);

	useEffect(() => initCompass(rootRef.current), []);

	return (
		<div ref={rootRef}>
			<a className="skip-link" href="#studio">{copy.skip}</a>
			<Header copy={copy} onLanguageChange={() => setLanguage(current => current === 'zh-CN' ? 'en' : 'zh-CN')} />
			<main id="journey">
				<div className="stage">
					<Destination copy={copy} />
					<div className="story-surface">
						<div className="watermark" aria-hidden="true">DAEDALUS</div>
						<Instrument />
						<FeatureSystem copy={copy} />
						<Chapters copy={copy} />
						<div className="compass-caption" aria-hidden="true"><span>DAEDALUS / DIRECTION ENGINE</span><span id="angle">000°</span></div>
						<div className="stage-bottom">
							<div className="scroll-cue"><span>{copy.scroll}</span></div>
							<a href="#studio">{copy.skipShort}</a>
						</div>
					</div>
					<Progress copy={copy} />
				</div>
			</main>
		</div>
	);
}
