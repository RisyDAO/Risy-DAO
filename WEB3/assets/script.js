// RisyConnector initialization
const rpcList = [
    "https://polygon.gateway.tenderly.co/2wV3bFeeHB2fY6uVT7uB0M",
    "https://polygon.gateway.tenderly.co/3hrilfgliLox7wHffJ3KG3",
    "https://polygon.gateway.tenderly.co/54sRfq2yMc24rkHUMB5GcQ",
    "https://polygon.gateway.tenderly.co/3KCXhFClgBQfk86RrIDGb2",
    "https://polygon-mainnet.infura.io/v3/6abe696e9cb946d0b52e286e11037a2b",
    "https://polygon-mainnet.infura.io/v3/cb02a852ec17453bb8a0cc700c5c61c6",
    "https://polygon.llamarpc.com",
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.blockpi.network/v1/rpc/public",
    "https://polygon.drpc.org",
    "https://polygon.rpc.blxrbdn.com",
    "https://api.zan.top/node/v1/polygon/mainnet/public",
    "https://polygon-mainnet.public.blastapi.io",
    "https://endpoints.omniatech.io/v1/matic/mainnet/public",
    "https://polygon.meowrpc.com",
    "https://rpc-mainnet.matic.quiknode.pro",
    "https://polygon.rpc.subquery.network/public",
    "https://polygon.api.onfinality.io/public",
    "https://polygon-mainnet.4everland.org/v1/37fa9972c1b1cd5fab542c7bdd4cde2f",
    "https://1rpc.io/matic",
    "https://polygon-pokt.nodies.app",
    "https://polygon-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
    "https://gateway.tenderly.co/public/polygon",
    "https://polygon.gateway.tenderly.co",
    "https://polygon-rpc.com",
    "https://rpc.ankr.com/polygon"
];

const connector = new RisyConnector(rpcList, {
    timeout: 30000,
    retries: 3,
    debugMode: false
});

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
        contractAddress: '0xca154cF88F6ffBC23E16B5D08a9Bf4851FB97199',
        ctaUrl: '',
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
        isLoading: true,
        error: null,

        onChainData: {
            address: 'Loading...',
            chain: 'Polygon Mainnet',
            chainDesc: 'Polygon POS (Chain ID: 137 / 0x89)',
            name: 'Loading...',
            symbol: 'Loading...',
            decimals: 0,
            totalSupply: 'Loading...',
            totalSupplyUSD: 'Loading...',
            initialPrice: '0.000000019380',
            currentPrice: '0.000000019380',
            launchDate: new Date("Jul-03-2024 05:56:16 PM UTC"),
            transferLimit: 'Loading...',
            maxBalance: 'Loading...',
            maxBalancePercent: 'Loading...',
            maxBalanceUSD: 'Loading...',
            daoFee: 'Loading...',
            version: 'Loading...'
        },

        profitCalculator: {
            startPrice: "0.000000019380",
            currentPrice: "0.000000019380",
            startDate: new Date("Jul-03-2024 05:56:16 PM UTC"),
            get currentDate() {
                return new Date();
            },
            dailyReturn: "1",
            capital: "1000",
            days: "365",
            parseNumber(value) {
                value = value.replace(',', '.');
                return parseFloat(value) || 0;
            },
            async init() {
                await connector.calculateUniswapV2PriceAsNum("0xb908228A001CB177ac785659505EBCa1d9947EE8","0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359").then(price => {
                    this.currentPrice = price.toFixed(12).toString();
                    this.dailyReturn = (this.currentDailyReturn * 100).toFixed(2).toString();
                });
                
                setInterval(async () => {
                    await connector.calculateUniswapV2PriceAsNum("0xb908228A001CB177ac785659505EBCa1d9947EE8","0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359").then(price => {
                        this.currentPrice = price.toFixed(12).toString();
                    });
                }, 30000);
            },
            get daysPassed() {
                return (this.currentDate - this.startDate) / (1000 * 60 * 60 * 24);
            },
            get currentXRise() {
                return this.parseNumber(this.currentPrice) / this.parseNumber(this.startPrice);
            },
            get currentPercentageRise() {
                return (this.currentXRise - 1) * 100;
            },
            get whatIfFinalAmount() {
                return this.parseNumber(this.capital) * this.currentXRise;
            },
            get currentDailyReturn() {
                return Math.pow(this.currentXRise, 1 / this.daysPassed) - 1;
            },
            get whatIfProfit() {
                return this.whatIfFinalAmount - this.parseNumber(this.capital);
            },
            get finalAmount() {
                return this.parseNumber(this.capital) * Math.pow((1 + this.parseNumber(this.dailyReturn) / 100), this.parseNumber(this.days));
            },
            get roi() {
                return Math.log(2) / Math.log(1 + this.parseNumber(this.dailyReturn) / 100);
            },
            get profit() {
                return this.finalAmount - this.parseNumber(this.capital);
            },
            get xRise() {
                return this.finalAmount / this.parseNumber(this.capital);
            },
            get percentageRise() {
                return (this.xRise - 1) * 100;
            },
        },

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
        
        async switchToPolygon() {
            console.log('Switching to Polygon Mainnet...');
            const translate = this.translations[this.language].config;

            if (typeof window.ethereum !== 'undefined') {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x89' }], // Polygon Mainnet chain ID
                    });
                    console.log('Switched to Polygon Mainnet');

                    return true;
                } catch (switchError) {
                    // This error code indicates that the chain has not been added to MetaMask
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0x89',
                                    chainName: 'Polygon Mainnet',
                                    nativeCurrency: {
                                        name: 'MATIC',
                                        symbol: 'MATIC',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://polygon-rpc.com/'],
                                    blockExplorerUrls: ['https://polygonscan.com/']
                                }],
                            });
                            console.log('Added Polygon Mainnet to wallet');

                            // Check if Polygon network is selected
                            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                            if (chainId === '0x89') {
                                console.log('Switched to Polygon Mainnet');

                                return true;
                            } else {
                                console.error('Error switching to Polygon Mainnet:', chainId);
                                alert(translate.switchToPolygonError);

                                return false;
                            }
                        } catch (addError) {
                            console.error('Error adding Polygon Mainnet:', addError);
                            alert(translate.addPolygonError);

                            return false;
                        }
                    } else {
                        console.error('Error switching to Polygon Mainnet:', switchError);
                        alert(translate.switchToPolygonError);

                        return false;
                    }
                }
            } else {
                this.installMetaMask();

                return false;
            }
        },

        async addToWallet() {
            console.log('Adding token to wallet...');
            const translate = this.translations[this.language].config;

            if (typeof window.ethereum !== 'undefined') {
                try {
                    // Check if Polygon network is selected
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    if (chainId !== '0x89') {
                        const shouldSwitch = confirm(translate.wrongNetwork);
                        if (shouldSwitch) {
                            var networkStatus = await this.switchToPolygon();
                            if (!networkStatus) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }

                    // Add token to wallet
                    await window.ethereum.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: this.contractAddress,
                                name: 'Risy DAO',
                                symbol: 'RISY',
                                decimals: 18,
                                image: 'https://raw.githubusercontent.com/RisyDAO/Risy-DAO/main/WEB3/img/logo.png'
                            },
                        },
                    });

                    console.log('Token added to wallet');

                    return true;
                } catch (error) {
                    console.error('Error adding token to wallet:', error);
                    alert(translate.addedToWalletError + error.message + '\n\n (' + translate.manualAddToWallet + this.contractAddress + ')');
                }
            } else {
                this.installMetaMask();

                return false;
            }
        },

        installMetaMask() {
            console.log('Installing MetaMask...');
            const translate = this.translations[this.language].config;

            if (typeof window.ethereum === 'undefined') {
                const isMetaMaskInstalled = confirm(translate.noWalletDetected);
                if (isMetaMaskInstalled) {
                    window.open('https://metamask.io/download/', '_blank');
                }
            }
        },

        async fetchOnChainData() {
            try {
                this.isLoading = true;
                this.error = null;
                const risyInfo = await connector.getRisyDAOInfo(this.contractAddress);
                
                this.onChainData = {
                    ...this.onChainData,
                    address: this.contractAddress,
                    name: risyInfo.name,
                    symbol: risyInfo.symbol,
                    decimals: risyInfo.decimals,
                    totalSupply: risyInfo.totalSupply,
                    transferLimit: `${risyInfo.transferLimit.percent * 100}% of balance per ${risyInfo.transferLimit.timeWindow / 3600} hours (GMT+0)`,
                    maxBalance: risyInfo.maxBalance,
                    maxBalancePercent: (risyInfo.maxBalance / risyInfo.totalSupply * 100).toFixed(2),
                    daoFee: risyInfo.daoFee * 100,
                    version: risyInfo.version
                };

                // Fetch current price
                const currentPrice = await connector.calculateUniswapV2PriceAsNum(
                    "0xb908228A001CB177ac785659505EBCa1d9947EE8",
                    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
                );
                this.onChainData.currentPrice = currentPrice.toFixed(12);
                this.profitCalculator.currentPrice = this.onChainData.currentPrice;
                this.onChainData.totalSupplyUSD = (parseFloat(this.onChainData.totalSupply) * parseFloat(this.onChainData.currentPrice)).toFixed(2);
                this.onChainData.maxBalanceUSD = (parseFloat(this.onChainData.maxBalance) * parseFloat(this.onChainData.currentPrice)).toFixed(2);
                this.profitCalculator.capital = this.onChainData.maxBalanceUSD;
            } catch (error) {
                // Try again after 5 seconds
                console.error('Error fetching on-chain data:', error);
                this.error = 'Failed to fetch on-chain data.<br>Please check your network connection.<br><br>Trying again in 5 seconds or refresh page...';
                setTimeout(()=>{
                    this.error = null;
                    this.isLoading = true;
                    this.fetchOnChainData();
                }, 5000);
            } finally {
                this.isLoading = false;
            }
        },

        getTimeSinceLaunch() {
            const now = new Date();
            const diff = now - this.onChainData.launchDate;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const years = Math.floor(months / 12);
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            return `${years}y ${months % 12}m ${days % 30}d ${hours}h ${minutes}m ${seconds}s`;
        },

        async init() {
            // Set configuration data
            const commonConfig = this.translations.common.config;
            
            this.contractAddress = commonConfig.contractAddress;
            this.ctaUrl = commonConfig.ctaUrl;
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

            // Initialize profit calculator
            await this.profitCalculator.init();

            // Initialize animations and UI components
            this.initAnimations();

            // Fetch on-chain data
            await this.fetchOnChainData();

            // Start periodic updates
            this.startPeriodicUpdates();
        },

        startPeriodicUpdates() {
            // Update current price every 30 seconds
            setInterval(async () => {
                try {
                    const currentPrice = await connector.calculateUniswapV2PriceAsNum(
                        "0xb908228A001CB177ac785659505EBCa1d9947EE8",
                        "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
                    );
                    this.onChainData.currentPrice = currentPrice.toFixed(12);
                    this.profitCalculator.currentPrice = this.onChainData.currentPrice;
                    this.onChainData.totalSupplyUSD = (parseFloat(this.onChainData.totalSupply) * parseFloat(this.onChainData.currentPrice)).toFixed(2);
                    this.onChainData.maxBalanceUSD = (parseFloat(this.onChainData.maxBalance) * parseFloat(this.onChainData.currentPrice)).toFixed(2);
                    this.profitCalculator.capital = this.onChainData.maxBalanceUSD;
                } catch (error) {
                    console.error('Error updating current price:', error);
                }
            }, 30000);

            // Update time since launch every second
            setInterval(() => {
                this.$refs.timeSinceLaunch.textContent = this.getTimeSinceLaunch();
            }, 1000);
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