const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const fireworksCanvas = document.getElementById('fireworksCanvas');
const fwCtx = fireworksCanvas ? fireworksCanvas.getContext('2d') : null;
const gameContainer = document.getElementById('game-container');
const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('startButton');
const portfolioModal = document.getElementById('portfolio-modal');
const modalPlaceholderText = document.getElementById('modal-placeholder-text');
const carouselContainer = document.getElementById('carousel-container');
const closePortfolioModalBtn = document.getElementById('close-portfolio-modal');
const powerBarContainer = document.getElementById('power-bar-container');
const powerBarLabel = document.getElementById('power-bar-label');
const powerBarFill = document.getElementById('power-bar-fill');
const completionModal = document.getElementById('completion-modal');
const closeCompletionModalBtn = document.getElementById('close-completion-modal');

if (!canvas || !ctx || !fireworksCanvas || !fwCtx || !gameContainer || !startOverlay || !startButton || !portfolioModal || !modalPlaceholderText || !carouselContainer || !closePortfolioModalBtn || !powerBarContainer || !powerBarLabel || !powerBarFill || !completionModal || !closeCompletionModalBtn) {
    console.error("Essential HTML elements not found!");
    if (document.body) document.body.innerHTML = '<h1 style="color:white;">Error: Game elements missing.</h1>';
} else {

    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    fireworksCanvas.width = gameContainer.clientWidth;
    fireworksCanvas.height = gameContainer.clientHeight;

    // --- Game Settings ---
    const gravity = 0.5;
    const moveSpeed = 5;
    const jumpStrength = 18;
    const groundLevel = canvas.height - 30;
    const interactionThreshold = 50; // Increased slightly for bigger cups

    const fireworkGravity = 0.1;
    const fireworkParticleCount = 80;
    const fireworkParticleLife = 90;

    const playerDisplayWidth = 80;
    const playerDisplayHeight = 80;

    // VISUAL CHANGE 1: Doubled coffee size
    const coffeeDrawSize = 60;

    // --- URL Configuration for easy updates ---
    // This object holds all external and internal links.
    // When you deploy your site, you can easily update these paths in one place.
    // I'm assuming your 'portfolio-website' folder is next to your 'Portfolio-Game' folder.
    const portfolioBaseUrl = '../portfolio-website/';
    const urls = {
        portfolioHome: `${portfolioBaseUrl}portfolio-site.html`, // The main portfolio homepage
        portfolioLevel1: `${portfolioBaseUrl}portfolio-level-1.html`, // Direct link to the case study page for Level 1
        portfolioLevel2: `${portfolioBaseUrl}portfolio-level-2.html`, // Direct link to the case study page for Level 2
        portfolioLevel3: `${portfolioBaseUrl}portfolio-level-3.html`, // Direct link to the case study page for Level 3
        linkedIn: 'https://www.linkedin.com/in/dylanromero/'
    };

    // --- Game State Variables ---
    let coffeePowerLevel = 0;
    const maxCoffeePower = 5;
    const collectedCupIds = new Set();
    let fireworkParticles = [];
    let allCupsCollectedTriggered = false;
    let isPaused = false;

    // --- Image Assets ---
    const characterImage = new Image();
    const coffeeImage = new Image();
    let characterImageLoaded = false;
    let coffeeImageLoaded = false;

    // --- Core Entities ---
    const player = {
        x: 50,
        y: groundLevel - playerDisplayHeight,
        width: playerDisplayWidth,
        height: playerDisplayHeight,
        vx: 0,
        vy: 0,
        sprite: characterImage,
        isJumping: false,
        isGrounded: false,
        facingRight: true,
        draw: function () {
            if (characterImageLoaded) {
                ctx.save();
                try {
                    if (!this.facingRight) {
                        ctx.scale(-1, 1);
                        ctx.translate(-this.x * 2 - this.width, 0);
                    }
                    ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
                } catch (e) {
                    console.error("Error drawing player sprite:", e);
                    ctx.fillStyle = 'red';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                } finally {
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        }
    };

    // VISUAL CHANGE 2: Changed platform color and removed blurry shadow for a crisper 8-bit look
    const platformColor = '#4a4a4a'; // Darker gray
    const platforms = [
        { x: 0, y: groundLevel, width: canvas.width, height: 10, color: 'transparent' },
        { x: 625, y: groundLevel - 360, width: 100, height: 20, color: platformColor },
        { x: 350, y: groundLevel - 150, width: 120, height: 20, color: platformColor },
        { x: 550, y: groundLevel - 220, width: 80, height: 20, color: platformColor },
        { x: 200, y: groundLevel - 300, width: 100, height: 20, color: platformColor },
    ];

    function drawPlatforms() {
        platforms.forEach(p => {
            if (p.color !== 'transparent') {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.width, p.height);
                // Add a hard dark border instead of a soft shadow
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 4;
                ctx.strokeRect(p.x + 2, p.y + 2, p.width - 4, p.height - 4);
            }
        });
    }

    const coffeeCups = [
        { id: 'portfolio', x: 400, y: 0, type: 'Portfolio', title: "Portfolio", isPlayerNearby: false, platformIndex: 2 },
        { id: 'tutorial', x: 180, y: 0, type: 'Tutorial', title: "Tutorial", isPlayerNearby: false, platformIndex: 0 },
        { id: 'about', x: 640, y: 0, type: 'About', title: "About me", isPlayerNearby: false, platformIndex: 1 },
        { id: 'funfacts', x: 235, y: 0, type: 'Fun facts', title: "Fun facts", isPlayerNearby: false, platformIndex: 4 },
        { id: 'boringwebsiteversion', x: 565, y: 0, type: 'Boring website version', title: "Boring website version", isPlayerNearby: false, platformIndex: 3 },
    ];

    function drawCoffeeCups() {
        if (!coffeeImageLoaded) return;

        // VISUAL CHANGE 3: Calculate floating offset based on time
        const floatOffset = Math.sin(Date.now() / 250) * 5;

        coffeeCups.forEach(cup => {
            ctx.font = '12px "Press Start 2P"';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';

            const textX = cup.x + coffeeDrawSize / 2;
            // Adjust text Y based on float offset
            const textY = cup.y - 12 + floatOffset;
            ctx.strokeText(cup.title, textX, textY);
            ctx.fillText(cup.title, textX, textY);

            const drawX = cup.x;
            // Apply float offset to drawing position
            const drawY = cup.y + floatOffset;

            if (cup.isPlayerNearby) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.strokeRect(drawX - 4, drawY - 4, coffeeDrawSize + 8, coffeeDrawSize + 8); // Increased highlight box slightly
            }
            try {
                ctx.drawImage(coffeeImage, drawX, drawY, coffeeDrawSize, coffeeDrawSize);
            } catch (e) {
                ctx.fillStyle = 'red';
                ctx.fillRect(drawX, drawY, coffeeDrawSize, coffeeDrawSize);
            }
        });
    }

    // --- Controls & Inputs ---
    const keys = { left: false, right: false, up: false, enter: false };
    let gameHasStarted = false;

    window.addEventListener('keydown', (e) => {
        if (!gameHasStarted) return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                break;
            case ' ':
            case 'ArrowUp':
            case 'w':
                if (!player.isJumping && player.isGrounded) {
                    keys.up = true;
                }
                break;
            case 'Enter':
                if (!keys.enter) {
                    keys.enter = true;
                    handleInteraction();
                }
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!gameHasStarted) return;
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = false;
                break;
            case ' ':
            case 'ArrowUp':
            case 'w':
                keys.up = false;
                player.isJumping = false;
                break;
            case 'Enter':
                keys.enter = false;
                break;
        }
    });

    function handleInteraction() {
        let interacted = false;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        coffeeCups.forEach(cup => {
            if (cup.isPlayerNearby) {
                const cupCenterX = cup.x + coffeeDrawSize / 2;
                const cupCenterY = cup.y + coffeeDrawSize / 2;
                const dx = playerCenterX - cupCenterX;
                const dy = playerCenterY - cupCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < interactionThreshold && !interacted) {
                    showPortfolioModal(cup.type, cup.title);
                    if (!collectedCupIds.has(cup.id) && coffeePowerLevel < maxCoffeePower) {
                        collectedCupIds.add(cup.id);
                        coffeePowerLevel++;
                        updatePowerBarDisplay();
                        triggerPowerBarEffect();

                        if (coffeePowerLevel === maxCoffeePower && !allCupsCollectedTriggered) {
                            allCupsCollectedTriggered = true;
                        }
                    }
                    interacted = true;
                }
            }
        });
    }

    function rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    // --- Portfolio Modal & Carousel Logic ---
    let currentSlideIndex = 0;

    function showSlide(index) {
        const slides = document.querySelectorAll('.carousel-slide');
        const totalSlides = slides ? slides.length : 0;

        if (!slides || totalSlides === 0) return;

        if (index >= totalSlides) {
            currentSlideIndex = 0;
        } else if (index < 0) {
            currentSlideIndex = totalSlides - 1;
        } else {
            currentSlideIndex = index;
        }

        slides.forEach(slide => slide.classList.remove('active'));
        if (slides[currentSlideIndex]) {
            slides[currentSlideIndex].classList.add('active');
        }
    }

    window.changeSlide = function (n) {
        showSlide(currentSlideIndex + n);
    };

    // --- Modal System & Data ---
    if (carouselContainer) {
        carouselContainer.innerHTML = `
            <div class="carousel-slide">
                <div class="text-content" style="text-align:center; padding: 20px;">
                    <h2 style="margin-bottom: 20px; line-height: 1.4;">Level 1 - Grading Gauntlet</h2>
                    <img src="images/UW-building.png" alt="8-bit university building" style="margin: 0 auto 20px auto; max-height: 200px; border: 4px solid #333; box-shadow: 4px 4px 0 #000;">
                    <p>Teaching content design at the University of Washington</p>
                    <br>
                    <a href="${urls.portfolioLevel1}" target="_blank" rel="noopener noreferrer" class="warp-btn">Warp to Location*</a>
                </div>
            </div>
            <div class="carousel-slide">
                <div class="text-content" style="text-align:center; padding: 20px;">
                    <h2 style="margin-bottom: 20px; line-height: 1.4;">Level 2 - Consensus Canyon Crossing</h2>
                    <img src="images/microsoft-community-8bit.png" alt="8-bit microsoft logo with connected profile headshots" style="margin: 0 auto 20px auto; max-height: 200px; border: 4px solid #333; box-shadow: 4px 4px 0 #000;">
                    <p>Building a content design community across Microsoft</p>
                    <br>
                    <a href="${urls.portfolioLevel2}" target="_blank" rel="noopener noreferrer" class="warp-btn">Warp to Location*</a>
                </div>
            </div>
            <div class="carousel-slide">
                <div class="text-content" style="text-align:center; padding: 20px;">
                    <h2 style="margin-bottom: 20px; line-height: 1.4;">Level 3 - The AI Em-Dash</h2>
                    <img src="images/ai-transformation-8bit.png" alt="8-bit image of a happy person with robotic AI gloves on" style="margin: 0 auto 20px auto; max-height: 200px; border: 4px solid #333; box-shadow: 4px 4px 0 #000;">
                    <p>Transforming the content design discipline</p>
                    <br>
                    <a href="${urls.portfolioLevel3}" target="_blank" rel="noopener noreferrer" class="warp-btn">Warp to Location*</a>
                </div>
            </div>
            <a class="prev-slide" onclick="changeSlide(-1)">&#10094;</a>
            <a class="next-slide" onclick="changeSlide(1)">&#10095;</a>
            <div style="text-align: center; margin-top: 25px; padding-bottom: 10px;">
                <span style="font-size: 0.8rem; color: #666; font-family: sans-serif; font-style: italic;">*i.e. my website where it's easy to view my work</span>
            </div>
        `;
    }

    const modalContentMap = {
        'Tutorial': {
            layout: 'block',
            html: `<div class="text-content"><h2>How to Play</h2><p>Don't worry, this customer journey is as advertised! If you figured out how to get here, you already know how to play the game. Good design leverages existing mental models. In this case I'm using <a href="https://www.nngroup.com/articles/skeuomorphism/" target="_blank" rel="noopener noreferrer">skeuomorphism</a> as a well-established model for digital navigation. (Don't get me started on the pros and cons of skeuomorphism.)</p></div>`
        },
        'About': {
            layout: 'flex',
            classes: ['flex-layout'],
            html: `<div class="text-content"><h2>Dylan Romero</h2><p><h3>UX Leader | Content Designer/Engineer | Ex-Professor | AI Spelunker | <a href="${urls.linkedIn}" target="_blank" rel="noopener noreferrer">LinkedIn</a></h3></p><p>Howdy! I'm the kind of guy who will add a skateboard to my game character to avoid spending extra time creating a sprite sheet. Do I skate? No; I barely know what an ollie is.</p><p>So why would I do that? Because I ruthlessly prioritize my time to focus on customer needs (that's you!), business outcomes (currently for Microsoft), and learning through play (AI + portfolio + game? Yes please!).</p><p>As a content design leader, I love spreading the joy of learning, which I balance out with scorn for patterns and practices that erode trust and make UX a bummer for customers.</p><p>I love doing this so much that <a href="https://commlead.uw.edu/person/dylan-romero/">I teach a content design class</a> at the Communication Leadership masters program at the University of Washington, where students laugh at my jokes solely because they're funny and not because I hold power over their grades.</p></div><div class="image-content"><img src="images/dylan-about-me.png" alt="Dylan Romero"></div>`
        },
        'Fun facts': {
            layout: 'block',
            html: (title) => `<div class="text-content"><h2>${title}</h2><p>Donkey Kong is often credited as the first platformer, but the lesser-known game called Space Panic is the real OG (released about a year earlier in 1980). In that game you could climb ladders, but you couldn't jump. 40+ years later, Dylan Romero's portfolio finally added the ability to jump. You're welcome.</p></div>`
        },
        'Boring website version': {
            layout: 'block',
            html: (title) => `<div class="text-content"><h2>${title}</h2><p>It's not all fun and games: view my <a href="${urls.portfolioHome}" target="_blank" rel="noopener noreferrer">standard portfolio website</a> or my super professional <a href="${urls.linkedIn}" target="_blank" rel="noopener noreferrer">LinkedIn</a> page.</p></div>`
        }
    };

    function showPortfolioModal(contentType, title) {
        if (!portfolioModal || !carouselContainer || !modalPlaceholderText) return;

        carouselContainer.style.display = 'none';
        modalPlaceholderText.style.display = 'none';
        modalPlaceholderText.innerHTML = '';
        modalPlaceholderText.classList.remove('flex-layout');

        if (contentType === 'Portfolio') {
            carouselContainer.style.display = 'block';
            showSlide(0);
        } else {
            const contentData = modalContentMap[contentType];
            if (contentData) {
                modalPlaceholderText.innerHTML = typeof contentData.html === 'function' ? contentData.html(title) : contentData.html;
                modalPlaceholderText.style.display = contentData.layout;
                if (contentData.classes) {
                    modalPlaceholderText.classList.add(...contentData.classes);
                }
            } else {
                modalPlaceholderText.innerHTML = `<div class="text-content"><h2>${title}</h2><p>Content coming soon for the ${title} section!</p></div>`;
                modalPlaceholderText.style.display = 'block';
            }
        }
        isPaused = true;
        portfolioModal.style.display = "flex";
    }

    function hidePortfolioModal() {
        if (!portfolioModal || !carouselContainer || !modalPlaceholderText) return;
        portfolioModal.style.display = "none";
        carouselContainer.style.display = 'none';
        modalPlaceholderText.style.display = 'none';
        isPaused = false;
        lastTime = performance.now();

        if (allCupsCollectedTriggered) {
            startFireworks();
            showCompletionModal();
        }
    }

    if (closePortfolioModalBtn) {
        closePortfolioModalBtn.onclick = hidePortfolioModal;
    }

    function showCompletionModal() {
        if (completionModal) {
            completionModal.style.display = 'flex';
            isPaused = true;
        }
    }

    function hideCompletionModal() {
        if (completionModal) {
            completionModal.style.display = 'none';
            isPaused = false;
            lastTime = performance.now();
        }
    }

    if (closeCompletionModalBtn) {
        closeCompletionModalBtn.onclick = hideCompletionModal;
    }

    window.addEventListener('click', function (event) {
        if (event.target == portfolioModal) {
            hidePortfolioModal();
        } else if (event.target == completionModal) {
            hideCompletionModal();
        }
    });

    // --- Fireworks System ---
    function startFireworks() {
        fireworkParticles = [];
        const centerX = canvas.width / 2;
        const centerY = 100;
        const colors = ['#FFD700', '#FF6347', '#ADFF2F', '#87CEEB', '#DA70D6', '#FFFFFF'];

        for (let i = 0; i < fireworkParticleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            fireworkParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: fireworkParticleLife + Math.random() * 30
            });
        }
    }

    function updateFireworks() {
        for (let i = fireworkParticles.length - 1; i >= 0; i--) {
            const p = fireworkParticles[i];
            p.vy += fireworkGravity;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                fireworkParticles.splice(i, 1);
            }
        }
    }

    function drawFireworks() {
        if (!fwCtx) return;
        fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        for (let i = 0; i < fireworkParticles.length; i++) {
            const p = fireworkParticles[i];
            fwCtx.fillStyle = p.color;
            fwCtx.fillRect(p.x - 1, p.y - 1, 3, 3);
        }
    }

    // --- UI Interactions ---
    function updatePowerBarDisplay() {
        if (!powerBarLabel || !powerBarFill) return;
        powerBarLabel.textContent = `Coffee Power: ${coffeePowerLevel}/${maxCoffeePower}`;
        const fillPercentage = (coffeePowerLevel / maxCoffeePower) * 100;
        powerBarFill.style.width = `${fillPercentage}%`;
    }

    function triggerPowerBarEffect() {
        if (!powerBarContainer) return;
        powerBarContainer.classList.add('flash-glow');
        setTimeout(() => {
            powerBarContainer.classList.remove('flash-glow');
        }, 600);
    }

    // --- Core Game Loop ---
    function update() {
        player.vx = 0;

        if (keys.left) {
            player.vx = -moveSpeed;
            player.facingRight = false;
        }
        if (keys.right) {
            player.vx = moveSpeed;
            player.facingRight = true;
        }
        if (keys.up && !player.isJumping && player.isGrounded) {
            player.vy = -jumpStrength;
            player.isJumping = true;
            player.isGrounded = false;
        }

        player.x += player.vx;
        player.vy += gravity;
        player.y += player.vy;
        player.isGrounded = false;

        platforms.forEach(p => {
            if (rectCollision(player, p)) {
                if (player.vy >= 0 && (player.y + player.height - player.vy) <= p.y) {
                    player.y = p.y - player.height;
                    player.vy = 0;
                    player.isGrounded = true;
                    player.isJumping = false;
                } else if (player.vy < 0 && (player.y - player.vy) >= (p.y + p.height)) {
                    player.y = p.y + p.height;
                    player.vy = 0;
                } else {
                    if (rectCollision(player, p)) {
                        if (player.vx > 0 && player.x + player.width - player.vx <= p.x) {
                            player.x = p.x - player.width;
                            player.vx = 0;
                        } else if (player.vx < 0 && player.x - player.vx >= p.x + p.width) {
                            player.x = p.x + p.width;
                            player.vx = 0;
                        }
                    }
                }
            }
        });

        // Screen boundaries
        if (player.x < 0) {
            player.x = 0;
            player.vx = 0;
        }
        if (player.x + player.width > canvas.width) {
            player.x = canvas.width - player.width;
            player.vx = 0;
        }
        if (player.y > canvas.height) {
            player.x = 50;
            player.y = groundLevel - player.height;
            player.vy = 0;
            player.isJumping = false;
            player.isGrounded = false;
        }

        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        coffeeCups.forEach(cup => {
            const cupCenterX = cup.x + coffeeDrawSize / 2;
            const cupCenterY = cup.y + coffeeDrawSize / 2;
            const dx = playerCenterX - cupCenterX;
            const dy = playerCenterY - cupCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            cup.isPlayerNearby = (distance < interactionThreshold);
        });

        updateFireworks();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPlatforms();
        drawCoffeeCups();
        player.draw();
    }

    let animationFrameId = null;
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    function gameLoop(currentTime) {
        animationFrameId = requestAnimationFrame(gameLoop);

        if (isPaused) return;

        const deltaTime = currentTime - lastTime;
        if (deltaTime >= frameInterval) {
            lastTime = currentTime - (deltaTime % frameInterval);
            update();
            draw();
            drawFireworks();
        }
    }

    function startGame() {
        player.y = groundLevel - player.height;
        startOverlay.style.display = 'none';
        if (powerBarContainer) {
            powerBarContainer.style.display = 'block';
        }
        gameHasStarted = true;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        lastTime = performance.now();
        gameLoop(lastTime);
    }

    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    // --- Asset Loading ---
    function assetsLoaded() {
        coffeeCups.forEach(cup => {
            const platform = platforms[cup.platformIndex];
            if (platform) {
                cup.y = platform.y - coffeeDrawSize - 15; /* Adjusted for float */
            } else {
                cup.y = groundLevel - coffeeDrawSize - 15;
            }
        });

        updatePowerBarDisplay();

        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = "Start Game";
        }
    }

    function assetLoadError(error) {
        console.error(error);
        if (startButton) {
            startButton.textContent = "Load Error!";
            startButton.disabled = true;
        }
        if (ctx) {
            ctx.font = '14px "Press Start 2P"';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading images!', canvas.width / 2, canvas.height / 2);
        }
    }

    const fontPromise = document.fonts.load('1rem "Press Start 2P"').catch(() => Promise.resolve());

    const characterPromise = new Promise((resolve, reject) => {
        characterImage.onload = () => { characterImageLoaded = true; resolve(); };
        characterImage.onerror = reject;
        characterImage.src = 'images/Dylan-character.png';
    });

    const coffeePromise = new Promise((resolve, reject) => {
        coffeeImage.onload = () => { coffeeImageLoaded = true; resolve(); };
        coffeeImage.onerror = reject;
        coffeeImage.src = 'images/coffee-bit.png';
    });

    Promise.all([fontPromise, characterPromise, coffeePromise])
        .then(assetsLoaded)
        .catch(assetLoadError);
}