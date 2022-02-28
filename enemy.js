import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Enemy {
    constructor(scene, pos) {
        this.velocity = Math.random() * 5 + 5;
        this.rotation = 2 * Math.random() * Math.PI;
        this.bob = -Math.random() * 0.8
        this.cannonSpeed = 50
        this.range = 50
        this.coolDown = Math.random() * 3 + 3;
        this.lastCannonFire = -10;
        this.health = 30
        this.bbox = new THREE.Box3()
        this.init_model(scene, pos)
    }

    init_model(scene, pos) {
        let loader = new GLTFLoader();
        // Load a glTF resource
        loader.load(
            // resource URL
            '/static/models/kenney/Models/glTF format/ship_dark.glb',
            // 'static/models/pirate/scene.glb',
            // called when the resource is loaded
            (gltf) => {
                this.obj = gltf.scene;
                this.obj.position.copy(pos);
                this.bbox = new THREE.Box3().setFromObject(this.obj)
                scene.add(this.obj)
            },
            // called while loading is progressing
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // called when loading has errors
            function (error) {
                console.log('An error happened');
            }
        );
    }
}
