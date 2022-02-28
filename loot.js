import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Loot {
    constructor(scene, pos) {
        this.rotation = 2 * Math.random() * Math.PI;
        this.bob = -Math.random()
        this.bbox = new THREE.Box3()
        this.init_model(scene, pos)
    }

    init_model(scene, pos) {
        let loader = new GLTFLoader();
        // Load a glTF resource
        loader.load(
            // resource URL
            '/static/models/kenney/Models/glTF format/chest.gltf',
            // called when the resource is loaded
            ( gltf ) => {
                this.obj = gltf.scene;
                this.obj.position.copy(pos);
                this.obj.rotation.y = this.rotation
                this.bbox = new THREE.Box3().setFromObject(this.obj)
                scene.add(this.obj)
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
