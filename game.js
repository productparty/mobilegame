// Game variables
let scene, camera, renderer;
let car, road;
let isPlaying = false;
let roadSegments = [];
let roadCurve = [];
let deviceOrientation = { beta: 0, gamma: 0, alpha: 0 };
let screenOrientation = window.orientation || 0;
let lastTime = 0;
let carPosition = 0;
let roadLength = 1000;
let roadWidth = 10;
let segmentLength = 10;
let cameraHeight = 2;
let speed = 0.02;
let maxSpeed = 0.15;
let acceleration = 0.000015;
let carDistance = 0;
let trees = [];
let mountains = [];
let obstacles = [];
let debugMode = false;
let distanceCounter = 0;
let soundEnabled = true;
let engineSound, crashSound;
let gameOver = false;
let needsRoadExtension = false;

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    // Position camera to see the road and car
    camera.position.set(0, 8, -10);
    camera.lookAt(0, 0, 10);
    
    // Create renderer
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create fog for depth effect
    scene.fog = new THREE.Fog(0x87CEEB, 50, 300);

    // Generate curved road
    generateRoad();
    
    // Create car
    createCar();
    
    // Add mountains
    createMountains();
    
    // Add trees
    createTrees();
    
    // Add obstacles
    createObstacles();
    
    // Load sounds
    loadSounds();
    
    // Add distance counter
    createDistanceCounter();
    
    // Add event listeners
    setupEventListeners();
    
    // Start animation loop
    animate(0);
}

function generateRoad() {
    // Clear existing road segments
    roadSegments = [];
    roadCurve = [];
    
    // Remove old road if it exists
    if (road) {
        scene.remove(road);
    }
    
    // Generate road curve
    let x = 0;
    let z = 0;
    let direction = 0;
    
    for (let i = 0; i < roadLength / segmentLength; i++) {
        // Gradually change direction for curves
        if (i % 20 === 0) {
            direction = Math.random() * 0.3 - 0.15;
        }
        
        x += direction * segmentLength;
        z += segmentLength;
        
        roadCurve.push({ x, z });
    }
    
    // Create road segments
    const roadGroup = new THREE.Group();
    
    for (let i = 0; i < roadCurve.length - 1; i++) {
        const p1 = roadCurve[i];
        const p2 = roadCurve[i + 1];
        
        // Calculate segment direction
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const angle = Math.atan2(dx, dz);
        
        // Create segment
        const segmentGeometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
        const segmentMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            side: THREE.DoubleSide
        });
        const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        
        // Position and rotate segment
        segment.position.set(p1.x + dx/2, 0, p1.z + dz/2);
        segment.rotation.set(-Math.PI/2, 0, angle);
        
        roadGroup.add(segment);
        roadSegments.push(segment);
        
        // Add road markings
        if (i % 5 === 0) {
            const markingGeometry = new THREE.PlaneGeometry(0.5, 2);
            const markingMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
            const marking = new THREE.Mesh(markingGeometry, markingMaterial);
            
            marking.position.set(p1.x + dx/2, 0.01, p1.z + dz/2);
            marking.rotation.set(-Math.PI/2, 0, angle);
            
            roadGroup.add(marking);
        }
    }
    
    road = roadGroup;
    scene.add(road);
}

function createCar() {
    // Create car group
    car = new THREE.Group();
    
    // Create car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        shininess: 80
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    // Store original color
    body.userData.originalColor = body.material.color.clone();
    car.add(body);
    
    // Create car roof
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.7, 2);
    const roofMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xdd0000,
        shininess: 80
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 1.35, -0.2);
    // Store original color
    roof.userData.originalColor = roof.material.color.clone();
    car.add(roof);
    
    // Create windshield
    const windshieldGeometry = new THREE.BoxGeometry(1.7, 0.6, 0.1);
    const windshieldMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x88ccff,
        transparent: true,
        opacity: 0.7,
        shininess: 100
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 1.2, 1);
    // Store original color
    windshield.userData.originalColor = windshield.material.color.clone();
    car.add(windshield);
    
    // Add wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 32);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    // Create and position 4 wheels
    const wheelPositions = [
        [-1, -0.3, -1.5], // back left
        [1, -0.3, -1.5],  // back right
        [-1, -0.3, 1.5],  // front left
        [1, -0.3, 1.5]    // front right
    ];
    
    wheelPositions.forEach(position => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...position);
        // Store original color
        wheel.userData.originalColor = wheel.material.color.clone();
        car.add(wheel);
    });
    
    // Add headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headlightMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.5
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-0.8, 0.5, 2);
    // Store original color
    leftHeadlight.userData.originalColor = leftHeadlight.material.color.clone();
    car.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(0.8, 0.5, 2);
    // Store original color
    rightHeadlight.userData.originalColor = rightHeadlight.material.color.clone();
    car.add(rightHeadlight);
    
    // Position car
    car.position.set(0, 0.4, 0);
    scene.add(car);
}

function createMountains() {
    // Create mountains in the distance
    const mountainGeometry = new THREE.ConeGeometry(20, 40, 4);
    const mountainMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    
    // Add mountains on both sides of the road
    for (let i = 0; i < 10; i++) {
        const leftMountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        leftMountain.position.set(-30 - Math.random() * 50, 0, i * 100);
        scene.add(leftMountain);
        mountains.push(leftMountain);
        
        const rightMountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        rightMountain.position.set(30 + Math.random() * 50, 0, i * 100);
        scene.add(rightMountain);
        mountains.push(rightMountain);
    }
}

function createTrees() {
    // Create trees along the road
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    
    const leavesGeometry = new THREE.ConeGeometry(2, 6, 8);
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x006400 });
    
    // Add trees on both sides of the road
    for (let i = 0; i < 50; i++) {
        const tree = new THREE.Group();
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        tree.add(trunk);
        
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 6;
        tree.add(leaves);
        
        // Position trees along the road
        const side = Math.random() > 0.5 ? 1 : -1;
        const segment = Math.floor(Math.random() * (roadCurve.length - 1));
        const roadPoint = roadCurve[segment];
        
        tree.position.set(
            roadPoint.x + side * (roadWidth/2 + 5 + Math.random() * 10),
            0,
            roadPoint.z
        );
        
        scene.add(tree);
        trees.push(tree);
    }
}

function createObstacles() {
    // Create obstacles on the road
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0xffcc00 });
    
    // Add obstacles at random positions on the road
    for (let i = 0; i < 20; i++) {
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        
        // Position obstacles on the road
        const segment = Math.floor(Math.random() * (roadCurve.length - 1));
        const roadPoint = roadCurve[segment];
        
        // Don't place obstacles too close to the start
        if (segment < 10) continue;
        
        obstacle.position.set(
            roadPoint.x + (Math.random() * roadWidth - roadWidth/2) * 0.8,
            0.5,
            roadPoint.z
        );
        
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

function loadSounds() {
    // Create audio elements
    engineSound = new Audio('sounds/car-changing-gears-sound-188962.mp3');
    engineSound.loop = true;
    engineSound.volume = 0.5;
    
    crashSound = new Audio('sounds/car-accident-with-squeal-and-crash-6054.mp3');
    crashSound.volume = 1.0;
}

function createDistanceCounter() {
    // Create distance counter element
    const counter = document.createElement('div');
    counter.id = 'distance-counter';
    counter.textContent = 'Distance: 0.00 miles';
    document.body.appendChild(counter);
}

function animate(time) {
    requestAnimationFrame(animate);
    
    if (!renderer) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (isPlaying && !gameOver) {
        // Gradually increase speed - more gentle acceleration
        if (speed < maxSpeed) {
            speed += acceleration * deltaTime;
            
            // Debug speed info
            if (debugMode) {
                document.getElementById('debug-info').textContent += 
                    `\nSpeed: ${speed.toFixed(5)}, Distance: ${distanceCounter.toFixed(2)}`;
            }
        }
        
        // Update car position
        updateCarPosition(deltaTime);
        
        // Update distance counter - adjusted for slower speed
        distanceCounter += speed * deltaTime * 0.03;
        updateDistanceCounter();
        
        // Check for collisions
        checkCollisions();
        
        // Play engine sound
        if (soundEnabled && engineSound && engineSound.paused) {
            engineSound.currentTime = 0; // Reset sound to beginning
            engineSound.play().catch(e => console.log('Audio play error:', e));
        }
        
        // Check if we need to extend the road
        if (car.position.z > roadLength * 0.7 && !needsRoadExtension) {
            needsRoadExtension = true;
            extendRoad();
        }
    }
    
    renderer.render(scene, camera);
}

function updateDistanceCounter() {
    // Convert meters to miles and update the display
    const miles = (distanceCounter * 0.000621371).toFixed(2);
    document.getElementById('distance-counter').textContent = `Distance: ${miles} miles`;
}

function updateCarPosition(deltaTime) {
    // Move car forward
    car.position.z += speed * deltaTime;
    
    // Find current road segment
    const segmentIndex = Math.floor(car.position.z / segmentLength);
    if (segmentIndex >= 0 && segmentIndex < roadCurve.length) {
        const targetX = roadCurve[segmentIndex].x;
        
        // Apply device tilt for steering
        let tiltFactor = 0;
        
        if (window.DeviceOrientationEvent) {
            // For steering wheel style controls (rotate phone like a steering wheel)
            // Use beta (left-to-right tilt) for steering when holding phone facing you
            // Negative beta means tilting left (turn left)
            // Positive beta means tilting right (turn right)
            
            // Invert the beta value to fix steering direction
            tiltFactor = -deviceOrientation.beta / 15; // Inverted and adjusted sensitivity
            
            // Debug steering input
            if (debugMode) {
                document.getElementById('debug-info').textContent = 
                    `Steering: ${tiltFactor.toFixed(2)}, 
                     Alpha: ${deviceOrientation.alpha.toFixed(2)}, 
                     Beta: ${deviceOrientation.beta.toFixed(2)}, 
                     Gamma: ${deviceOrientation.gamma.toFixed(2)}`;
            }
        }
        
        // Apply steering
        car.position.x += tiltFactor * speed * deltaTime;
        
        // Apply road curve force (car follows road curve naturally)
        car.position.x += (targetX - car.position.x) * 0.03;
        
        // Limit car to road width
        const halfRoadWidth = roadWidth / 2;
        car.position.x = Math.max(targetX - halfRoadWidth, Math.min(targetX + halfRoadWidth, car.position.x));
        
        // Tilt car based on steering
        car.rotation.z = -tiltFactor * 0.2; // Also invert this to match the steering
        car.rotation.y = Math.atan2(targetX - car.position.x, 10) * 0.2;
    }
    
    // Update camera to follow car - position directly behind and slightly above
    camera.position.x = car.position.x;
    camera.position.y = car.position.y + 3;
    camera.position.z = car.position.z - 7;
    camera.lookAt(car.position.x, car.position.y, car.position.z + 15);
}

function checkCollisions() {
    // Check for collisions with obstacles
    for (const obstacle of obstacles) {
        const distance = car.position.distanceTo(obstacle.position);
        if (distance < 2) {
            handleCrash('Crashed! Press "Try Again" to continue.');
            break;
        }
    }
    
    // Check if car is off the road
    const segmentIndex = Math.floor(car.position.z / segmentLength);
    if (segmentIndex >= 0 && segmentIndex < roadCurve.length) {
        const roadPoint = roadCurve[segmentIndex];
        const distanceFromCenter = Math.abs(car.position.x - roadPoint.x);
        
        if (distanceFromCenter > roadWidth / 2 + 1) {
            handleCrash('Off road! Press "Try Again" to continue.');
        }
    }
}

function handleCrash(message) {
    gameOver = true;
    isPlaying = false;
    
    // Stop engine sound and play crash sound
    if (soundEnabled) {
        if (engineSound) {
            engineSound.pause();
            engineSound.currentTime = 0;
        }
        
        // Force crash sound to play by creating a new instance
        if (crashSound) {
            // Create a new instance to avoid issues with previous plays
            const crashSoundInstance = new Audio(crashSound.src);
            crashSoundInstance.volume = 1.0;
            crashSoundInstance.play().catch(e => console.log('Crash sound play error:', e));
        }
    }
    
    // Show game over message
    document.getElementById('game-over').textContent = message;
    document.getElementById('game-over').classList.add('visible');
    
    // Create explosion effect
    createExplosion(car.position);
}

function createExplosion(position) {
    // Create particle system for explosion
    const particleCount = 100;
    const particles = new THREE.Group();
    
    // Create flame particles
    const flameGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    
    // Create smoke particles
    const smokeGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const smokeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x222222,
        transparent: true,
        opacity: 0.7
    });
    
    // Create spark particles
    const sparkGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    for (let i = 0; i < particleCount; i++) {
        // Determine particle type
        let particle;
        if (i < particleCount * 0.5) {
            // Flame
            particle = new THREE.Mesh(flameGeometry, flameMaterial);
        } else if (i < particleCount * 0.8) {
            // Smoke
            particle = new THREE.Mesh(smokeGeometry, smokeMaterial);
        } else {
            // Spark
            particle = new THREE.Mesh(sparkGeometry, sparkMaterial);
        }
        
        // Position at car with slight randomness
        particle.position.set(
            position.x + (Math.random() - 0.5) * 2,
            position.y + (Math.random() - 0.5) * 2,
            position.z + (Math.random() - 0.5) * 2
        );
        
        // Random velocity - more upward for smoke, more outward for flames/sparks
        const speed = 0.05 + Math.random() * 0.1;
        const angle = Math.random() * Math.PI * 2;
        const upwardBias = particle.material === smokeMaterial ? 0.8 : 0.3;
        
        particle.userData.velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.random() * speed * 2 * upwardBias,
            Math.sin(angle) * speed
        );
        
        // Add lifetime for particles
        particle.userData.lifetime = 2 + Math.random() * 2;
        particle.userData.age = 0;
        
        particles.add(particle);
    }
    
    scene.add(particles);
    
    // Add car damage visual effect
    car.children.forEach(part => {
        if (part.material && part.material.color) {
            // Darken the car parts
            part.material.color.offsetHSL(0, 0, -0.3);
        }
    });
    
    // Animate explosion
    const animateExplosion = function(time) {
        let allDead = true;
        
        particles.children.forEach(particle => {
            // Update position
            particle.position.add(particle.userData.velocity);
            
            // Apply gravity and drag
            particle.userData.velocity.y -= 0.001;
            particle.userData.velocity.multiplyScalar(0.98);
            
            // Update age
            particle.userData.age += 0.016;
            
            // Handle particle aging
            if (particle.userData.age < particle.userData.lifetime) {
                allDead = false;
                
                // Fade out smoke
                if (particle.material.opacity) {
                    particle.material.opacity = Math.max(0, 1 - (particle.userData.age / particle.userData.lifetime));
                }
                
                // Shrink flames
                if (particle.material === flameMaterial) {
                    const scale = Math.max(0.1, 1 - (particle.userData.age / particle.userData.lifetime));
                    particle.scale.set(scale, scale, scale);
                }
            } else {
                // Remove dead particles
                particles.remove(particle);
            }
        });
        
        if (!allDead && particles.children.length > 0) {
            requestAnimationFrame(animateExplosion);
        } else {
            scene.remove(particles);
        }
    };
    
    animateExplosion();
}

function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', () => {
        isPlaying = true;
        gameOver = false;
        document.getElementById('game-over').classList.remove('visible');
        
        // Reset car appearance when starting
        resetCarAppearance();
        
        // Start engine sound
        if (soundEnabled && engineSound) {
            engineSound.currentTime = 0;
            engineSound.play().catch(e => console.log('Audio play error:', e));
        }
        
        // Request device orientation permission on iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                    }
                })
                .catch(console.error);
        }
    });
    
    document.getElementById('stop-button').addEventListener('click', () => {
        isPlaying = false;
        if (soundEnabled && engineSound) {
            engineSound.pause();
        }
    });
    
    document.getElementById('restart-button').addEventListener('click', () => {
        // Reset car position
        car.position.set(0, 0.4, 0);
        
        // Reset camera
        camera.position.set(0, 8, -10);
        camera.lookAt(0, 0, 10);
        
        // Reset game state
        isPlaying = false;
        gameOver = false;
        speed = 0.02; // Reset to initial slower speed
        distanceCounter = 0;
        updateDistanceCounter(); // Update the display
        document.getElementById('game-over').classList.remove('visible');
        
        // Clear obstacles near the starting position
        clearNearbyObstacles();
        
        // Reset car appearance (remove damage effects)
        resetCarAppearance();
        
        // Stop any sounds
        if (soundEnabled) {
            if (engineSound) {
                engineSound.pause();
                engineSound.currentTime = 0;
            }
            if (crashSound) {
                crashSound.pause();
                crashSound.currentTime = 0;
            }
        }
    });
    
    document.getElementById('toggle-debug').addEventListener('click', () => {
        debugMode = !debugMode;
        document.getElementById('debug-info').style.display = debugMode ? 'block' : 'none';
    });
    
    document.getElementById('toggle-sound').addEventListener('click', (e) => {
        soundEnabled = !soundEnabled;
        e.target.textContent = soundEnabled ? '🔊' : '🔇';
        
        if (!soundEnabled && engineSound) {
            engineSound.pause();
        } else if (soundEnabled && isPlaying && engineSound) {
            engineSound.play().catch(e => console.log('Audio play error:', e));
        }
    });
    
    window.addEventListener('resize', onWindowResize);
    
    // Listen for device orientation changes
    function handleOrientation(event) {
        deviceOrientation.alpha = event.alpha || 0;
        deviceOrientation.beta = event.beta || 0;
        deviceOrientation.gamma = event.gamma || 0;
        
        if (debugMode) {
            document.getElementById('debug-info').textContent = 
                `Alpha: ${deviceOrientation.alpha.toFixed(2)}, 
                 Beta: ${deviceOrientation.beta.toFixed(2)}, 
                 Gamma: ${deviceOrientation.gamma.toFixed(2)}`;
        }
    }
    
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
        
        window.addEventListener('orientationchange', () => {
            screenOrientation = window.orientation || 0;
        });
    }
    
    // Add keyboard controls for testing on desktop
    window.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            deviceOrientation.beta = 15; // Simulate tilting left (now positive beta turns left)
        } else if (event.key === 'ArrowRight') {
            deviceOrientation.beta = -15;  // Simulate tilting right (now negative beta turns right)
        }
    });
    
    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            deviceOrientation.beta = 0;  // Reset when key released
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Function to clear obstacles near the car's position
function clearNearbyObstacles() {
    const safeDistance = 30; // Distance to clear obstacles ahead
    
    // Remove obstacles that are too close to the starting position
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        // Check if obstacle is ahead of the car and within safe distance
        if (obstacle.position.z > car.position.z && 
            obstacle.position.z < car.position.z + safeDistance) {
            
            // Remove from scene and from obstacles array
            scene.remove(obstacle);
            obstacles.splice(i, 1);
        }
    }
}

// Function to reset car appearance after crash
function resetCarAppearance() {
    car.children.forEach(part => {
        if (part.material && part.material.color) {
            // Reset any color changes from damage
            if (part.userData.originalColor) {
                part.material.color.copy(part.userData.originalColor);
            }
        }
    });
}

// Function to extend the road when the car gets close to the end
function extendRoad() {
    const oldRoadLength = roadLength;
    
    // Generate new road segments
    let lastX = roadCurve[roadCurve.length - 1].x;
    let lastZ = roadCurve[roadCurve.length - 1].z;
    let direction = 0;
    
    const roadGroup = new THREE.Group();
    
    // Add new segments to extend the road
    for (let i = 0; i < roadLength / segmentLength; i++) {
        // Gradually change direction for curves
        if (i % 20 === 0) {
            direction = Math.random() * 0.3 - 0.15;
        }
        
        lastX += direction * segmentLength;
        lastZ += segmentLength;
        
        roadCurve.push({ x: lastX, z: lastZ });
        
        // Create new segment
        if (i > 0) {
            const p1 = roadCurve[roadCurve.length - 2];
            const p2 = roadCurve[roadCurve.length - 1];
            
            // Calculate segment direction
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const angle = Math.atan2(dx, dz);
            
            // Create segment
            const segmentGeometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
            const segmentMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x333333,
                side: THREE.DoubleSide
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            
            // Position and rotate segment
            segment.position.set(p1.x + dx/2, 0, p1.z + dz/2);
            segment.rotation.set(-Math.PI/2, 0, angle);
            
            roadGroup.add(segment);
            roadSegments.push(segment);
            
            // Add road markings
            if (i % 5 === 0) {
                const markingGeometry = new THREE.PlaneGeometry(0.5, 2);
                const markingMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                const marking = new THREE.Mesh(markingGeometry, markingMaterial);
                
                marking.position.set(p1.x + dx/2, 0.01, p1.z + dz/2);
                marking.rotation.set(-Math.PI/2, 0, angle);
                
                roadGroup.add(marking);
            }
        }
    }
    
    // Add the new road segments to the scene
    scene.add(roadGroup);
    
    // Add trees and mountains along the extended road
    addEnvironmentToExtendedRoad(oldRoadLength);
    
    // Add obstacles to the extended road
    addObstaclesToExtendedRoad(oldRoadLength);
    
    // Update road length
    roadLength *= 2;
    
    // Reset flag
    needsRoadExtension = false;
}

function addEnvironmentToExtendedRoad(startZ) {
    // Add trees along the extended road
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    
    const leavesGeometry = new THREE.ConeGeometry(2, 6, 8);
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x006400 });
    
    // Add trees on both sides of the extended road
    for (let i = 0; i < 25; i++) {
        const tree = new THREE.Group();
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        tree.add(trunk);
        
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 6;
        tree.add(leaves);
        
        // Position trees along the extended road
        const side = Math.random() > 0.5 ? 1 : -1;
        const segment = Math.floor(roadCurve.length / 2) + Math.floor(Math.random() * (roadCurve.length / 2));
        if (segment >= roadCurve.length) continue;
        
        const roadPoint = roadCurve[segment];
        
        tree.position.set(
            roadPoint.x + side * (roadWidth/2 + 5 + Math.random() * 10),
            0,
            roadPoint.z
        );
        
        scene.add(tree);
        trees.push(tree);
    }
    
    // Add mountains along the extended road
    const mountainGeometry = new THREE.ConeGeometry(20, 40, 4);
    const mountainMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    
    // Add mountains on both sides of the extended road
    for (let i = 0; i < 5; i++) {
        const leftMountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        leftMountain.position.set(-30 - Math.random() * 50, 0, startZ + i * 100);
        scene.add(leftMountain);
        mountains.push(leftMountain);
        
        const rightMountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        rightMountain.position.set(30 + Math.random() * 50, 0, startZ + i * 100);
        scene.add(rightMountain);
        mountains.push(rightMountain);
    }
}

function addObstaclesToExtendedRoad(startZ) {
    // Create obstacles on the extended road
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0xffcc00 });
    
    // Add obstacles at random positions on the extended road
    for (let i = 0; i < 10; i++) {
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        
        // Position obstacles on the extended road
        const segment = Math.floor(roadCurve.length / 2) + Math.floor(Math.random() * (roadCurve.length / 2));
        if (segment >= roadCurve.length) continue;
        
        const roadPoint = roadCurve[segment];
        
        obstacle.position.set(
            roadPoint.x + (Math.random() * roadWidth - roadWidth/2) * 0.8,
            0.5,
            roadPoint.z
        );
        
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

// Initialize when page loads
window.addEventListener('load', init);
