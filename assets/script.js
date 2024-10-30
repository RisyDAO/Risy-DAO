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
    timeout: 5000,
    retries: 3,
    debugMode: false,
    cacheExpiry: 30000,
    providerUpdateInterval: 59000
});

// Detect user's preferred language
function detectLanguage() {
    return localStorage.getItem('preferred-language') || (navigator.language || navigator.userLanguage).startsWith('tr') ? 'tr' : 'en';
}

// Konfigürasyon değerlerini ekleyelim
const config = {
    mirrors: {
        checkInterval: 5 * 60 * 1000, // 5 dakika
        timeout: 5000, // 5 saniye
    }
};

// Alpine.js data function
function risyData() {
    return {
        language: detectLanguage(),
        translations: data,
        contractAddress: '0xca154cF88F6ffBC23E16B5D08a9Bf4851FB97199',
        daoAddress: '0xD74E510a6472B20910ABCF8a3945E445b16aE11A',
        liquidityAddresses: [
            "0xb908228a001cb177ac785659505ebca1d9947ee8",
            "0x8341b5240e05552d85e78bcd691b2982c3e4deaf",
            "0xa0d3ee50d6932c554c958d3567d32898575884c5"
        ],
        ctaUrl: '',
        whitepaperUrl: '',
        scannerUrl: '',
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
        mirrors: data.common.config.mirrors,
        currentMirror: null,
        alternativeMirrors: [],
        activeMirrors: [],

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
            version: 'Loading...',
            daoTreasuryBalance: 'Loading...',
            daoTreasuryValueUSD: 'Loading...',
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
                this.days = this.daysPassed.toFixed(0).toString();

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

            // Tarih gösterimini güncelle
            if (this.onChainData.launchDate) {
                document.querySelector('[data-translate="onChainData.launchDate"]').nextElementSibling.textContent = this.getLocalizedLaunchDate();
            }

            this.createPieChart();
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
                const [risyInfo, currentPrice, daoTreasuryBalance] = await Promise.all([
                    connector.getRisyDAOInfo(this.contractAddress),
                    connector.calculateUniswapV2PriceAsNum("0xb908228A001CB177ac785659505EBCa1d9947EE8", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"),
                    connector.getDAOTreasuryBalance(this.daoAddress, this.contractAddress)
                ]);

                this.onChainData = {
                    ...this.onChainData,
                    address: this.contractAddress,
                    name: risyInfo.name,
                    symbol: risyInfo.symbol,
                    decimals: risyInfo.decimals,
                    totalSupply: risyInfo.totalSupply,
                    transferLimitPercent: (risyInfo.transferLimit.percent * 100).toFixed(2),
                    transferLimitHours: (risyInfo.transferLimit.timeWindow / 3600).toString(),
                    maxBalance: risyInfo.maxBalance,
                    maxBalancePercent: (risyInfo.maxBalance / risyInfo.totalSupply * 100).toFixed(2),
                    daoFee: risyInfo.daoFee * 100,
                    version: risyInfo.version,
                    currentPrice: currentPrice.toFixed(12),
                    daoTreasuryBalance: parseFloat(daoTreasuryBalance).toFixed(2)
                };

                this.onChainData.totalSupplyUSD = (parseFloat(this.onChainData.totalSupply) * currentPrice).toFixed(2);
                this.onChainData.maxBalanceUSD = (parseFloat(this.onChainData.maxBalance) * currentPrice).toFixed(2);
                this.onChainData.daoTreasuryValueUSD = (parseFloat(daoTreasuryBalance) * currentPrice).toFixed(2);
                
                this.profitCalculator.capital = this.onChainData.maxBalanceUSD;
            } catch (error) {
                console.error('Error fetching on-chain data:', error);
                this.error = this.getTranslation('onChainData.fetchError');
                setTimeout(() => {
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

            return `${years}${this.getTranslation('onChainData.year')} ${months % 12}${this.getTranslation('onChainData.month')} ${days % 30}${this.getTranslation('onChainData.day')} ${hours}${this.getTranslation('onChainData.hour')} ${minutes}${this.getTranslation('onChainData.minute')} ${seconds}${this.getTranslation('onChainData.second')}`;
        },

        async init() {
            // Set configuration data
            const commonConfig = this.translations.common.config;
            
            this.contractAddress = commonConfig.contractAddress;
            this.daoAddress = commonConfig.daoAddress;
            this.liquidityAddresses = commonConfig.liquidityAddresses;
            this.ctaUrl = commonConfig.ctaUrl;
            this.scanUrl = commonConfig.scanUrl;
            this.analyticsUrl = commonConfig.analyticsUrl;
            this.earnFreeRisyUrl = commonConfig.earnFreeRisyUrl;
            this.scannerUrl = commonConfig.scannerUrl;
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

            // Update mirrors
            this.updateMirrors();

            // Initialize animations and UI components
            this.initAnimations();

            // Start mirror checks
            this.startMirrorChecks();

            // Using Promise.all for performance improvement
            await Promise.all([
                this.profitCalculator.init(),
                this.fetchOnChainData()
            ]);

            this.startPeriodicUpdates();
        },

        startPeriodicUpdates() {
            const updatePrice = async () => {
                try {
                    const currentPrice = await connector.calculateUniswapV2PriceAsNum(
                        "0xb908228A001CB177ac785659505EBCa1d9947EE8",
                        "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
                    );
                    this.onChainData.currentPrice = currentPrice.toFixed(12);
                    this.onChainData.totalSupplyUSD = (parseFloat(this.onChainData.totalSupply) * currentPrice).toFixed(2);
                    this.onChainData.maxBalanceUSD = (parseFloat(this.onChainData.maxBalance) * currentPrice).toFixed(2);
                } catch (error) {
                    console.error('Error updating current price:', error);
                }
            };

            const updateDAOTreasuryBalance = async () => {
                try {
                    const daoTreasuryBalance = await connector.getDAOTreasuryBalance(this.daoAddress, this.contractAddress);
                    this.onChainData.daoTreasuryBalance = parseFloat(daoTreasuryBalance).toFixed(2);
                    this.onChainData.daoTreasuryValueUSD = (parseFloat(daoTreasuryBalance) * parseFloat(this.onChainData.currentPrice)).toFixed(2);
                } catch (error) {
                    console.error('Error updating DAO treasury balance:', error);
                }
            };

            setInterval(updatePrice, 30000);
            setInterval(updateDAOTreasuryBalance, 30000);
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
                        } else if (entry.target.id === 'roadmap') {
                            this.animateRoadmap();
                        }
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            observer.observe(document.getElementById('features'));
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
        },

        getLocalizedLaunchDate() {
            return this.onChainData.launchDate.toLocaleString(this.language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
        },

        createPieChart() {
            const chartData = this.getTranslation('tokenomics.chartData');
            if (!Array.isArray(chartData)) {
                console.error('chartData is not an array:', chartData);
                return;
            }
            
            const chartContainer = document.getElementById('tokenomics-chart');
            const legendContainer = document.getElementById('tokenomics-legend');

            // Clear previous chart and legend
            chartContainer.innerHTML = '';
            legendContainer.innerHTML = '';

            // Create conic-gradient for pie chart
            let conicGradient = '';
            let startAngle = 0;

            chartData.forEach((item, index) => {
                const endAngle = startAngle + (item.value / 100) * 360;
                conicGradient += `${item.color} ${startAngle}deg ${endAngle}deg${index < chartData.length - 1 ? ',' : ''}`;
                startAngle = endAngle;
            });

            chartContainer.style.background = `conic-gradient(${conicGradient})`;

            // Create legend
            chartData.forEach(item => {
                const legendItem = document.createElement('div');
                legendItem.classList.add('legend-item');
                legendItem.innerHTML = `
                    <div class="legend-color" style="background-color: ${item.color};"></div>
                    <div>${item.label}: ${item.value}%</div>
                `;
                legendContainer.appendChild(legendItem);
            });
        },

        getCoordinatesForAngle(angle) {
            const x = 32 + 32 * Math.cos(angle * Math.PI / 180);
            const y = 32 + 32 * Math.sin(angle * Math.PI / 180);
            return [x, y];
        },

        async checkMirrorStatus(mirror) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.mirrors.timeout);

                const response = await fetch(mirror.url, {
                    method: 'GET',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // If response is OK, the mirror is active
                return response.ok;
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log(`Mirror ${mirror.url} timed out`);
                } else {
                    console.log(`Mirror ${mirror.url} is not accessible:`, error);
                }
                return false;
            }
        },

        async updateMirrors() {
            try {
                // Find current URL
                const currentUrl = window.location.href;
                this.currentMirror = this.mirrors.find(mirror => currentUrl.startsWith(mirror.url)) || this.mirrors[0];

                // Check all mirrors (current mirror is always active)
                const mirrorStatuses = await Promise.all(
                    this.mirrors.map(async mirror => ({
                        ...mirror,
                        isActive: mirror.url === this.currentMirror.url ? true : await this.checkMirrorStatus(mirror)
                    }))
                );

                // Filter active mirrors
                this.activeMirrors = mirrorStatuses.filter(mirror => mirror.isActive);

                // Update alternative mirrors (excluding current mirror)
                this.alternativeMirrors = this.activeMirrors
                    .filter(mirror => mirror.url !== this.currentMirror.url);
            } catch (error) {
                console.error('Error updating mirrors:', error);
            }
        },

        startMirrorChecks() {
            this.updateMirrors();
            setInterval(() => {
                this.updateMirrors();
            }, config.mirrors.checkInterval);
        },
    };
}

// Initialize Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('risyData', risyData);
});

// Log events for ad tracking
function logEvent(eventName = "click", eventValue = 0) {
    console.log(`Logging event: ${eventName} with value: ${eventValue}`);

    const eventMap = {
        go_swap: '6689cbc67f3ea2b25c892697',
        go_tally: '6689cf007f3ea2b25c89318c',
        go_whitepaper: '6689cf5e0afb82138bf9c3b6',
        go_press_kit: '6689cfd00afb82138bf9c55b',
        go_social: '6689d0080afb82138bf9c619',
        go_contract: '6689d0520afb82138bf9c6a9',
        go_dex_screen: '6689d0af0afb82138bf9c78a',
        go_email: '6689d3400afb82138bf9d8d2',
        click: '6689d3ec0afb82138bf9ddc2'
    };

    const conversionID = eventMap[eventName] || eventMap.click;
    window.BMDataLayer = window.BMDataLayer || [];
    window.BMDataLayer.push({
        conversionID,
        eventId: eventName,
        event: 'conversion',
        eventValue
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const eventName = e.target.getAttribute('data-event') || 'click';
            const eventValue = e.target.getAttribute('data-event-value') || 0;
            logEvent(eventName, eventValue);
        }
    });
});