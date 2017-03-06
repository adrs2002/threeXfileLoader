# threeXfileLoader
====
# Overview
X file(directX 3d file) loader for three.js.

## Demo

[demo]: http://www001.upp.so-net.ne.jp/adrs2002/xfileTest.html        "please look this"

## Requirement
THREE.js

##how to use　使い方的な。

0. read js file , 'three.js(three.min.js)', and 'threeXfileLoader.js' your HTML file.

1.  Declaration  THREE.JS Load Manager, and TextureLoader
 like this

    manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };
    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };
    var onError = function (xhr) {
    };

    Texloader = new THREE.TextureLoader();

2. Declaration XFileLoader

    var loader = new XFileLoader(manager, Texloader);

3. load from URL

    loader.load(['X Data URL', true, true], function (object) {
        for (var i = 0; i < object.FrameInfo.length; i++) {
            Models.push(object.FrameInfo[i]);
            scene.add(Models[i]);
        }
        object = null;
    }, onProgress, onError);

4. load from URL(with animation)

    loader.load(['content/SSR06_Born2.x', true, true], function (object) {
        for (var i = 0; i < object.FrameInfo.length; i++) {
            Models.push(object.FrameInfo[i]);
            scene.add(Models[i]);

            if (Models[i] instanceof THREE.SkinnedMesh) {
                skeletonHelper = new THREE.SkeletonHelper(Models[i]);
                scene.add( skeletonHelper );
                if (Models[i].geometry.animations !== undefined) {
                    Models[i].mixer = new THREE.AnimationMixer(Models[i]);
                    animates.push(Models[i].mixer);
                    var action = Models[i].mixer.clipAction(Models[i].geometry.animations);
                    action.play();
                }
            }
        }
        object = null;
    }, onProgress, onError);

.. and animation, update ///////////

    animates[i].update( clock.getDelta() );

---------------------------------
5. Disclaimer

can read *TEXT format X file only!* not a binary format!
---------------------------------
## LICENCE
 MIT.