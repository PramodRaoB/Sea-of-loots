import * as THREE from 'three'
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js'
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry";
import {Player} from "./player";
import {Loot} from "./loot";
import {Enemy} from "./enemy";
import {Water} from 'three/examples/jsm/objects/Water.js';
import {Sky} from 'three/examples/jsm/objects/Sky.js';
import {Cannon} from "./cannon";

const lootPoints = 100, damageWithCollision = 25, damageWithCannon = 10;

let camera, scene, renderer, sun, water;
let player, clock;
let light, sound, mainSplash, splash2;
let deltaFrame = 0;
let curLevel = 1;
let cameraMode = 0;
let enemies = [], loots = [], cannons = [];
let lastMessageTime = 0, messageDuration = 5;

// 0 -> start, 1 -> running, 2 -> over
let gameState = 1;

const gravity = 10

// helpers
let arrowHelper, boxHelper, lootHelper;

const random_int = (min, max) => {
    return Math.ceil(Math.random() * (max - min + 1) + min - 1)
}

function onKeyDown(e) {
    const keyCode = e.which;
    splash2.visible = false;
    if (keyCode === 87) { // w
        player.moveFront = 1;
    }
    if (keyCode === 83) { // s
        player.moveBack = 1;
    }
    if (keyCode === 65) { // a
        player.moveLeft = 1;
    }
    if (keyCode === 68) { // d
        player.moveRight = 1;
    }
    if (keyCode === 32) { // space
        player_fire();
    }
    if (keyCode === 38) { // arrow up
        player.cannonUp = 1;
    }
    if (keyCode === 40) { // arrow down
        player.cannonDown = 1;
    }
}

function onKeyUp(e) {
    const keyCode = e.which;
    if (keyCode === 87) { // w
        player.moveFront = 0;
    }
    if (keyCode === 83) { // s
        player.moveBack = 0;
    }
    if (keyCode === 65) { // a
        player.moveLeft = 0;
    }
    if (keyCode === 68) { // d
        player.moveRight = 0;
    }
    if (keyCode === 38) { // arrow up
        player.cannonUp = 0;
    }
    if (keyCode === 40) { // arrow down
        player.cannonDown = 0;
    }
    if (keyCode === 86) { // v
        cameraMode ^= 1;
    }
}

function player_fire() {
    if (clock.getElapsedTime() - player.lastCannonFire < player.coolDown) {
        document.getElementById("message").innerHTML = "Wait for cannon cooldown!"
        lastMessageTime = clock.getElapsedTime();
        return;
    }
    let target = player.obj.position.clone().addScaledVector(player.direction, player.range + Math.random() * 5)
    let velY = gravity * player.obj.position.distanceTo(target) / (2 * player.cannonSpeed)
    let targetDirection = target.clone().sub(player.obj.position).normalize()
    let newCannon = new Cannon(scene, new THREE.Vector3(player.obj.position.x, 2.5, player.obj.position.z), velY, targetDirection, 0, player)
    cannons.push(newCannon)
    player.lastCannonFire = clock.getElapsedTime();
}

const minRadius = 50, midRadius = 175, maxRadius = 200;
let minCnt = 50;

function is_colliding(obj) {
    if (obj.bbox.intersectsBox(player.bbox)) return true;
    for (const loot of loots) {
        if (obj.bbox.intersectsBox(loot.bbox)) return true;
    }
    for (const enemy of enemies) {
        if (obj.bbox.intersectsBox(enemy.bbox)) return true;
    }
    return false;
}

function generate_loot() {
    if (loots.length >= minCnt) return;
    let target = minCnt - loots.length;
    while (target) {
        let randAngle = random_int(0, 359);
        randAngle = randAngle * Math.PI / 180;
        let pos = new THREE.Vector3().copy(player.obj.position)
        pos.addScaledVector(new THREE.Vector3(Math.cos(randAngle), 0, Math.sin(randAngle)), random_int(minRadius, midRadius))
        let newLoot = new Loot(scene, pos)
        if (!is_colliding(newLoot)) {
            loots.push(newLoot)
            target--;
        } else {
            scene.remove(newLoot.obj)
        }
    }
}

function collision_loot() {
    for (let i = 0; i < loots.length; i++) {
        if (loots[i].bbox.intersectsBox(player.bbox)) {
            player.score += lootPoints;
            scene.remove(loots[i].obj);
            loots.splice(i, 1);
            i--;
        }
    }
}

function remove_loot() {
    for (let i = 0; i < loots.length; i++) {
        if (!loots[i] || !loots[i].obj) return;
        if (loots[i].obj.position.distanceTo(player.obj.position) > maxRadius) {
            scene.remove(loots[i].obj);
            loots.splice(i, 1);
            i--;
        }
    }
}

const dangerMinRadius = 250, dangerMidRadius = 375, dangerMaxRadius = 400;
let dangerMinCnt = 3;

function generate_enemies() {
    if (enemies.length >= dangerMinCnt) return;
    let target = dangerMinCnt - enemies.length;
    while (target) {
        let randAngle = random_int(0, 359);
        randAngle = randAngle * Math.PI / 180;
        let pos = new THREE.Vector3().copy(player.obj.position)
        pos.addScaledVector(new THREE.Vector3(Math.cos(randAngle), 0, Math.sin(randAngle)), random_int(dangerMinRadius, dangerMidRadius))
        let newEnemy = new Enemy(scene, pos)
        if (!is_colliding(newEnemy)) {
            enemies.push(newEnemy)
            target--;
        } else {
            scene.remove(newEnemy.obj)
        }
    }
}

function remove_enemy() {
    for (let i = 0; i < enemies.length; i++) {
        if (!enemies[i] || !enemies[i].obj) return;
        if (enemies[i].obj.position.distanceTo(player.obj.position) > dangerMaxRadius || enemies[i].health <= 0) {
            scene.remove(enemies[i].obj);
            enemies.splice(i, 1);
            i--;
        }
    }
}

function collision_enemy() {
    for (let i = 0; i < enemies.length; i++) {
        if (!enemies[i] || !enemies[i].obj) return;
        if (enemies[i].bbox.intersectsBox(player.bbox)) {
            player.health -= damageWithCollision;
            scene.remove(enemies[i].obj);
            enemies.splice(i, 1);
            i--;
        }
    }
}

function remove_cannon() {
    for (let i = 0; i < cannons.length; i++) {
        if (!cannons[i] || !cannons[i].obj) return;
        if (cannons[i].obj.position.y <= -5) {
            scene.remove(cannons[i].obj);
            cannons.splice(i, 1);
            i--;
        }
    }
}

function collision_cannon() {
    for (let i = 0; i < cannons.length; i++) {
        if (!cannons[i] || !cannons[i].obj) return;
        if (cannons[i].type) {
            for (let enemy of enemies) {
                if (!enemy || !enemy.obj) break;
                if (enemy === cannons[i].parent) continue;
                if (cannons[i].bbox.intersectsBox(enemy.bbox)) {
                    enemy.health -= damageWithCannon
                    scene.remove(cannons[i].obj)
                    cannons.splice(i, 1)
                    i--;
                }
            }
            if (cannons[i].bbox.intersectsBox(player.bbox)) {
                player.health -= damageWithCannon;
                scene.remove(cannons[i].obj)
                cannons.splice(i, 1)
                i--;
            }
        } else {
            for (let enemy of enemies) {
                if (!enemy || !enemy.obj) break;
                if (cannons[i].bbox.intersectsBox(enemy.bbox)) {
                    enemy.health -= damageWithCannon
                    scene.remove(cannons[i].obj)
                    cannons.splice(i, 1)
                    i--;
                }
            }
        }
    }
}

function init() {
    // Debug
    // const gui = new dat.GUI()

    // Init scene
    scene = new THREE.Scene();

    // Init camera (PerspectiveCamera)
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    // Position camera
    camera.position.set(10, 7, 3)


    // Init renderer
    renderer = new THREE.WebGLRenderer({antialias: true});

    // Set size (whole window)
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // create an AudioListener and add it to the camera
    const listener = new THREE.AudioListener();
    camera.add(listener);

    // create a global audio source
    sound = new THREE.Audio(listener);

    // load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('static/assets/theme.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.autoplay = true;
        sound.play();
    });

    const fontLoader = new FontLoader();
    fontLoader.load(
        // resource URL
        'static/assets/fonts/helvetiker_bold.typeface.json',

        // onLoad callback
        function (font) {
            // do something with the font
            const geometry = new TextGeometry('Game over!', {
                font: font,
                size: 6,
                height: 2
            })
            mainSplash = new THREE.Mesh(geometry, [
                new THREE.MeshPhongMaterial({color: 0xad4000}),
                new THREE.MeshPhongMaterial({color: 0x5c2301})
            ])
            mainSplash.castShadow = true
            mainSplash.position.set(0, 5, -50)
            scene.add(mainSplash)
            mainSplash.visible = false
        },

        // onProgress callback
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // onError callback
        function (err) {
            console.log('An error happened');
        }
    );


    const fontLoader2 = new FontLoader();
    fontLoader2.load(
        // resource URL
        'static/assets/fonts/helvetiker_bold.typeface.json',

        // onLoad callback
        function (font) {
            // do something with the font
            const geometry = new TextGeometry('Ahoy! Welcome to the sea of loots!\nWASD to move\nV to change camera\nSpace to fire cannon!\nEnemies take three cannon shots to die!\nGet on with the journey then matey!', {
                font: font,
                size: 6,
                height: 2
            })
            splash2 = new THREE.Mesh(geometry, [
                new THREE.MeshPhongMaterial({color: 0xad4000}),
                new THREE.MeshPhongMaterial({color: 0x5c2301})
            ])
            splash2.castShadow = true
            splash2.position.set(-75, 50, -150)
            splash2.add(mainSplash)
            splash2.visible = true;
            scene.add(splash2)
        },

        // onProgress callback
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // onError callback
        function (err) {
            console.log('An error happened');
        }
    );

    // controls = new OrbitControls(camera, renderer.domElement);

    // Render to canvas element
    document.body.appendChild(renderer.domElement);

    // Directional light
    // light = new THREE.DirectionalLight("#ffffff", 0.5);
    // light.position.set(0, 10, 10);
    // scene.add(light)

    let diffuseLight = new THREE.AmbientLight("#ffffff", 0.5)
    diffuseLight.position.set(0, 100, 100)
    scene.add(diffuseLight)

    sun = new THREE.Vector3();
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('./static/textures/waternormals.jpg', function (texture) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = -Math.PI / 2;

    scene.add(water);
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 1,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {

        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        scene.environment = pmremGenerator.fromScene(sky).texture;

    }

    updateSun();


    // Add texture -
    // const texture = new THREE.TextureLoader().load('textures/crate.gif');

    // Create material with texture
    // const material = new THREE.MeshBasicMaterial({ map: texture });

    // Player stuff
    player = new Player(scene)

    // get clock
    clock = new THREE.Clock()

    // helpers
    // const lightHelper = new THREE.DirectionalLightHelper(light, 1);
    // scene.add(lightHelper)
    // arrowHelper = new THREE.ArrowHelper(player.direction, new THREE.Vector3(0, 0, 0), 10, "#ff0000")
    // scene.add(arrowHelper)
    // let axisHelper = new THREE.AxesHelper(10)
    // scene.add(axisHelper)
    // boxHelper = new THREE.Box3Helper()
    // scene.add(boxHelper)
}

function player_bob() {
    const time = performance.now() * 0.003;
    player.obj.position.y = Math.sin(time) * 0.4 - 0.6;
    player.obj.rotation.x = Math.cos(time) * 0.05;
}

function loot_bob() {
    for (let loot of loots) {
        if (!loot || !loot.obj) return;
        const time = performance.now() * 0.001;

        let bob = Math.sin(time);
        loot.obj.position.y = bob * bob * loot.bob;
    }
}

function enemy_bob() {
    for (let enemy of enemies) {
        if (!enemy || !enemy.obj) return;
        const time = performance.now() * 0.001;

        let bob = Math.sin(time);
        enemy.obj.position.y = bob * bob * enemy.bob;
    }
}

let detectionRadius = (dangerMinRadius + dangerMidRadius) / 2, closestRadius = 50, attackingRadius = 100;

function enemy_logic() {
    for (let enemy of enemies) {
        if (!enemy || !enemy.obj) return;
        if (enemy.obj.position.distanceTo(player.obj.position) > detectionRadius) continue;
        let lookAt = enemy.obj.position.clone().sub(player.obj.position)
        enemy.obj.lookAt(lookAt.clone().add(enemy.obj.position))
        lookAt.normalize();
        if (enemy.obj.position.distanceTo(player.obj.position) > closestRadius)
            enemy.obj.position.addScaledVector(lookAt, -enemy.velocity * deltaFrame);
        if (enemy.obj.position.distanceTo(player.obj.position) <= attackingRadius) {
            if (clock.getElapsedTime() - enemy.lastCannonFire < enemy.coolDown) {
                continue;
            }
            let target = player.obj.position.clone();
            target.x += Math.random() * 7;
            target.y += Math.random() * 7;
            let velY = gravity * enemy.obj.position.distanceTo(target) / (2 * enemy.cannonSpeed)
            let targetDirection = target.clone().sub(enemy.obj.position).normalize()
            let newCannon = new Cannon(scene, new THREE.Vector3(enemy.obj.position.x, 2.5, enemy.obj.position.z), velY, targetDirection, 1, enemy)
            cannons.push(newCannon)
            enemy.lastCannonFire = clock.getElapsedTime();
        }
    }
}

function cannon_logic() {
    for (let cannon of cannons) {
        if (!cannon || !cannon.obj) return;
        cannon.obj.position.addScaledVector(cannon.direction, player.cannonSpeed * deltaFrame)
        cannon.obj.position.y += cannon.velocity * deltaFrame;
        cannon.velocity -= gravity * deltaFrame;
    }
}

// Draw the scene every time the screen is refreshed
function render_loop() {
    if (gameState === 1) {
        if (!clock.running) clock.start();
        deltaFrame = clock.getDelta();
        requestAnimationFrame(render_loop);
        water.material.uniforms['time'].value += 0.5 / 60.0;

        if (!sound.isPlaying) sound.play();

        if (clock.getElapsedTime() > curLevel * 20) {
            minCnt += 10
            dangerMinCnt += 1
            detectionRadius += 50
            player.coolDown = Math.max(player.coolDown - 0.25, 1)
            curLevel++;
            document.getElementById("message").innerHTML = "Level up! Cannon cooldown reduced, enemies detect you from further away!"
            lastMessageTime = clock.getElapsedTime();
        }

        if (clock.getElapsedTime() - lastMessageTime >= messageDuration) {
            document.getElementById("message").innerHTML = "";
        }

        if (player.obj) {
            let textPos = new THREE.Vector3().copy(player.obj.position)
            textPos.addScaledVector(player.direction, 25);
            mainSplash.position.set(textPos.x, 10, textPos.z)
            // if (cameraMode)
            //     mainSplash.lookAt(player.obj.position)
            // else
            mainSplash.lookAt(camera.position)
            if (player.health <= 0) {
                // game over
                mainSplash.visible = true;
                gameState = 0;
            }
            if (cameraMode) {
                let vec1 = new THREE.Vector3(0, -75, 0);
                vec1.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.obj.rotation.y);
                let vec2 = player.obj.position.clone().sub(vec1);
                camera.position.copy(vec2);
                camera.lookAt(player.obj.position)
            } else {
                let vec1 = new THREE.Vector3(-2, -7, -14);
                vec1.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.obj.rotation.y);
                let vec2 = player.obj.position.clone().sub(vec1);
                camera.position.copy(vec2);
                let cameraLookAt = player.obj.position.clone().addScaledVector(player.direction, 50);
                camera.lookAt(cameraLookAt)
            }

            // bobbing animation
            player_bob();
            loot_bob();
            enemy_bob();

            player.bbox.setFromObject(player.obj)
            for (let enemy of enemies) enemy.bbox.setFromObject(enemy.obj)
            for (let cannon of cannons) cannon.bbox.setFromObject(cannon.obj)
            // boxHelper.box = player.bbox

            // Player movement
            if (player.moveFront) {
                player.obj.position.addScaledVector(player.direction, player.velocity * deltaFrame)
                water.position.addScaledVector(player.direction, player.velocity * deltaFrame)
            }
            if (player.moveBack) {
                player.obj.position.addScaledVector(player.direction, -player.velocity * deltaFrame)
                water.position.addScaledVector(player.direction, -player.velocity * deltaFrame)
            }
            if (player.moveRight) {
                player.obj.rotation.y -= player.rotation * deltaFrame;
                player.direction.set(0, 0, -1)
                player.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.obj.rotation.y);
                player.direction.normalize();
                player.obj.rotation.z -= player.tiltSpeed * deltaFrame;
            }
            if (player.moveLeft) {
                player.obj.rotation.y += player.rotation * deltaFrame;
                player.direction.set(0, 0, -1)
                player.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.obj.rotation.y);
                player.direction.normalize();
                player.obj.rotation.z += player.tiltSpeed * deltaFrame;
            }
            player.obj.rotation.z = Math.max(-player.tiltLimit, player.obj.rotation.z)
            player.obj.rotation.z = Math.min(player.tiltLimit, player.obj.rotation.z)
            if (!player.moveLeft && !player.moveRight) {
                if (Math.abs(player.obj.rotation.z) < player.rotation * deltaFrame) player.obj.rotation.z = 0;
                else if (player.obj.rotation.z < 0) player.obj.rotation.z += player.tiltSpeed * deltaFrame
                else if (player.obj.rotation.z > 0) player.obj.rotation.z -= player.tiltSpeed * deltaFrame
            }

            if (player.cannonUp) {
                player.range += 20 * deltaFrame;
            }
            if (player.cannonDown) {
                player.range -= 20 * deltaFrame;
            }
            player.range = Math.min(player.range, player.maxRange)
            player.range = Math.max(player.range, player.minRange)
            // arrowHelper.setDirection(player.direction)

            // check collisions
            collision_loot();
            collision_enemy();
            collision_cannon();

            // remove unused objects
            remove_loot();
            remove_enemy();
            remove_cannon();

            // generate new objects
            generate_loot();
            generate_enemies();

            // enemy logic
            enemy_logic();
            cannon_logic();

            // Update HUD
            document.getElementById("score").innerHTML = "Score: " + player.score
            document.getElementById("time").innerHTML = "Time: " + Math.ceil(clock.getElapsedTime())
            document.getElementById("health").innerHTML = "Health: " + player.health;
            document.getElementById("range").innerHTML = "Cannon range: " + (Math.round(player.range * 100) / 100).toFixed(2);
        }
    } else if (gameState === 0) {
        requestAnimationFrame(render_loop);
        clock.stop();
        // renderer.setAnimationLoop(null);
        document.getElementById("splash").innerHTML = "Game over! <br> Your final score is: " + player.score + "<br> You survived for " + Math.ceil(clock.getElapsedTime()) + " seconds"
        water.material.uniforms['time'].value += 0.5 / 60.0;
        if (cameraMode) {
            let vec1 = new THREE.Vector3(0, -75, 0);
            vec1.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.obj.rotation.y);
            let vec2 = player.obj.position.clone().sub(vec1);
            camera.position.copy(vec2);
            camera.lookAt(player.obj.position)
        } else {
            let vec1 = new THREE.Vector3(-2, -7, -14);
            vec1.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.obj.rotation.y);
            let vec2 = player.obj.position.clone().sub(vec1);
            camera.position.copy(vec2);
            let cameraLookAt = player.obj.position.clone().addScaledVector(player.direction, 50);
            camera.lookAt(cameraLookAt)
        }

        // bobbing animation
        player_bob();
        loot_bob();
        enemy_bob();
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    // Camera frustum aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    // After making changes to aspect
    camera.updateProjectionMatrix();
    // Reset size
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize, false);
window.addEventListener('keydown', onKeyDown, false);
window.addEventListener('keyup', onKeyUp, false);

init();
render_loop();
