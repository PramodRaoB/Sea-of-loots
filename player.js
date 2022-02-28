import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene) {
        this.velocity = 10;
        this.rotation = 0.5;
        this.tiltLimit = Math.PI / 12;
        this.tiltSpeed = 0.5;
        this.direction = new THREE.Vector3(0, 0, -1);
        this.bbox = new THREE.Box3()
        this.lastCannonFire = -6;
        this.coolDown = 5;
        this.range = 10
        this.maxRange = 150
        this.minRange = 10
        this.cannonSpeed = 50
        this.moveRight = 0;
        this.moveLeft = 0;
        this.moveFront = 0;
        this.moveBack = 0;
        this.cannonUp = 0;
        this.cannonDown = 0;
        this.score = 0;
        this.health = 100;
        this.init_model(scene)
    }

    init_model(scene) {
        var loader = new GLTFLoader();
        // Load a glTF resource
        loader.load(
            // resource URL
            '/static/models/kenney/Models/glTF format/ship_light.glb',
            // called when the resource is loaded
             ( gltf ) => {
                this.obj = gltf.scene;
                this.bbox = new THREE.Box3().setFromObject(this.obj)
                scene.add( gltf.scene );
            },
            // called while loading is progressing
            function ( xhr ) {
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // called when loading has errors
            function ( error ) {
                console.log( 'An error happened' );
            }
        );
    }
}