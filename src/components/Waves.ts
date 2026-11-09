// 原创矢量路径，三个连续波段都以页面底色收束，深浅模式保持衔接。
const path = 'M0 64Q180 10 360 64T720 64T1080 64T1440 64T1800 64T2160 64T2520 64T2880 64T3240 64T3600 64V132H0Z';
export const waves = `<div class="hero-waves" th:if="\${theme.config.hero.wave_enabled}" th:classappend="\${theme.config.hero.wave_motion ? 'waves-moving' : ''}" aria-hidden="true"><svg viewBox="0 0 1440 120" preserveAspectRatio="none"><g class="wave wave-back"><path d="${path}"/></g><g class="wave wave-middle"><path d="${path}"/></g><g class="wave wave-front"><path d="${path}"/></g></svg></div>`;
