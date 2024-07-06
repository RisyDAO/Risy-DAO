// Detect user's preferred language
function detectLanguage() {
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang) return savedLang;
    
    const userLang = navigator.language || navigator.userLanguage;
    return userLang.startsWith('tr') ? 'tr' : 'en';
}

// Alpine.js data function
function risyData() {
    return {
        language: detectLanguage(),
        translations: data,
        contractAddress: '',
        whitepaperUrl: '',
        dexScreenerUrl: '',
        swapUrl: '',
        tallyUrl: '',
        socialLinks: {},
        contactEmail: '',
        features: [],
        tokenomics: [],
        roadmapItems: [],
        faqItems: [],

        switchLanguage(lang) {
            this.language = lang;
            this.updateContent();
            document.documentElement.lang = lang;
            localStorage.setItem('preferred-language', lang);
        },

        updateContent() {
            // Update all translatable content
            document.querySelectorAll('[data-translate]').forEach(el => {
                const key = el.getAttribute('data-translate');
                el.textContent = this.getTranslation(key);
            });

            // Update dynamic content
            this.features = this.translations[this.language].features;
            this.tokenomics = this.translations[this.language].tokenomics.items;
            this.roadmapItems = this.translations[this.language].roadmap.items;
            this.faqItems = this.translations[this.language].faq.items;

            // Update language options
            const languageOptions = this.translations[this.language].languages;
            for (const [code, name] of Object.entries(languageOptions)) {
                const element = document.querySelector(`[data-language="${code}"]`);
                if (element) element.textContent = name;
            }
        },

        getTranslation(key) {
            const keys = key.split('.');
            return keys.reduce((obj, k) => obj && obj[k], this.translations[this.language]) || key;
        },

        async init() {
            // Set configuration data
            const commonConfig = this.translations.common.config;
            
            this.contractAddress = commonConfig.contractAddress;
            this.scanUrl = commonConfig.scanUrl;
            this.dexScreenerUrl = commonConfig.dexScreenerUrl;
            this.swapUrl = commonConfig.swapUrl;
            this.tallyUrl = commonConfig.tallyUrl;
            this.socialLinks = commonConfig.socialLinks;
            this.contactEmail = commonConfig.contactEmail;
            this.pressKitUrl = commonConfig.pressKitUrl;

            // Set language-specific configuration data
            const config = this.translations[this.language].config;

            this.whitepaperUrl = config.whitepaperUrl;

            // Set content data
            this.updateContent();

            this.initAnimations();
        },

        initAnimations() {
            // Smooth scrolling
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    if(this.getAttribute('href') !== '#') {
                        document.querySelector(this.getAttribute('href')).scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // Anime.js animations
            this.initFloatAnimation();
            this.initSectionAnimations();
            this.initParallax();
            this.initFeatureHoverEffects();
            this.initPulsingButton();
        },

        initFloatAnimation() {
            anime({
                targets: '.animate-float',
                translateY: [-10, 10],
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutSine',
                duration: 3000
            });
        },

        initSectionAnimations() {
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (entry.target.id === 'features') {
                            this.animateFeatures();
                        } else if (entry.target.id === 'tokenomics') {
                            this.animateTokenomics();
                        } else if (entry.target.id === 'roadmap') {
                            this.animateRoadmap();
                        }
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            observer.observe(document.getElementById('features'));
            observer.observe(document.getElementById('tokenomics'));
            observer.observe(document.getElementById('roadmap'));
        },

        animateFeatures() {
            anime({
                targets: '#features .feature-card',
                scale: [0.9, 1],
                opacity: [0, 1],
                delay: anime.stagger(100, {start: 300}),
                easing: 'easeOutElastic(1, .5)',
                duration: 1000
            });
        },

        animateTokenomics() {
            anime({
                targets: '#tokenomics li',
                translateX: [-50, 0],
                opacity: [0, 1],
                delay: anime.stagger(100, {start: 300}),
                easing: 'easeOutQuad',
                duration: 800
            });
        },

        animateRoadmap() {
            anime({
                targets: '#roadmap .roadmap-item',
                translateY: [50, 0],
                opacity: [0, 1],
                delay: anime.stagger(200, {start: 300}),
                easing: 'easeOutQuad',
                duration: 1000
            });
        },

        initParallax() {
            window.addEventListener('scroll', () => {
                const scrollY = window.scrollY;
                const heroSection = document.getElementById('hero');
                heroSection.style.backgroundPositionY = `${scrollY * 0.5}px`;
            });
        },

        initFeatureHoverEffects() {
            const featureCards = document.querySelectorAll('#features .feature-card');
            featureCards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    anime({
                        targets: card,
                        scale: 1.05,
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                        duration: 300,
                        easing: 'easeOutQuad'
                    });
                });
                card.addEventListener('mouseleave', () => {
                    anime({
                        targets: card,
                        scale: 1,
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        duration: 300,
                        easing: 'easeOutQuad'
                    });
                });
            });
        },

        animateValue(obj, start, end, duration) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const currentNumber = Math.floor(progress * (end - start) + start);
                obj.textContent = obj.textContent.replace(/\d+/, currentNumber.toLocaleString());
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        },

        initPulsingButton() {
            anime({
                targets: '#hero a.cta-button',
                scale: [1, 1.1],
                opacity: [0.9, 1],
                easing: 'easeInOutQuad',
                duration: 1000,
                direction: 'alternate',
                loop: true
            });
        }
    };
}

// Initialize Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('risyData', risyData);
});

// Log events for ad tracking
function logEvent(eventName="click", eventVal = 0) {
    console.log(`Logging event: ${eventName} with value: ${eventVal}`);

    switch (eventName) {
        case 'go_swap':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689cbc67f3ea2b25c892697',eventId:'go_swap',event:'conversion',eventValue:eventVal});
            break;
        case 'go_tally':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689cf007f3ea2b25c89318c',eventId:'go_tally',event:'conversion',eventValue:eventVal});
            break;
        case 'go_whitepaper':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689cf5e0afb82138bf9c3b6',eventId:'go_whitepaper',event:'conversion',eventValue:eventVal});
            break;
        case 'go_press_kit':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689cfd00afb82138bf9c55b',eventId:'go_press_kit',event:'conversion',eventValue:eventVal});
            break;
        case 'go_social':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689d0080afb82138bf9c619',eventId:'go_social',event:'conversion',eventValue:eventVal});
            break;
        case 'go_contract':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689d0520afb82138bf9c6a9',eventId:'go_contract',event:'conversion',eventValue:eventVal});
            break;
        case 'go_dex_screen':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689d0af0afb82138bf9c78a',eventId:'go_dex_screen',event:'conversion',eventValue:eventVal});
            break;
        case 'go_email':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689d3400afb82138bf9d8d2',eventId:'go_email',event:'conversion',eventValue:eventVal});
            break;
        case 'click':
            // Bitmedia
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689d3ec0afb82138bf9ddc2',eventId:'click',event:'conversion',eventValue:eventVal});
            break;
        default:
            window.BMDataLayer=window.BMDataLayer||[];window.BMDataLayer.push({conversionID:'6689d3ec0afb82138bf9ddc2',eventId:'click',event:'conversion',eventValue:eventVal});
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Log whole click events
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'A') {
            const eventName = target.getAttribute('data-event');
            const eventVal = target.getAttribute('data-event-value');
            if (eventName) {
                if (eventVal) {
                    logEvent(eventName, eventVal);
                } else {
                    logEvent(eventName);
                }
            } else {
                if (eventVal) {
                    logEvent('click', eventVal);
                } else {
                    logEvent();
                }
            }
        }
    });
});