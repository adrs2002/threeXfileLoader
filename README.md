# THREE.XfileLoader
====
# Overview
X file(directX 3d file) loader for three.js.

## Demo

please look this [demo][] 

[demo]: http://adrs2002.com/openlibs/xloader/xfileTest.html      "Demo"

## Requirement
THREE.js

##how to use　使い方的な。

0. read 2 .js file , 'three.js(three.min.js)', and 'threeXLoader.js' your HTML file.

1.  Declaration  THREE.JS Load Manager, and TextureLoader.  
 like this  
  
        manager = new THREE.LoadingManager();
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

4. load from URL(with model and animation)

        loader.load(['X Data URL', true, true], function (object) {
            for (var i = 0; i < object.FrameInfo.length; i++) {
                Models.push(object.FrameInfo[i]);
                scene.add(Models[i]);

                if (Models[i] instanceof THREE.SkinnedMesh) {
                    skeletonHelper = new THREE.SkeletonHelper(Models[i]);
                    scene.add( skeletonHelper );
                    var animateObj = loader2.assignAnimation(Models[0]);

                    if (animateObj !== undefined) {
                        Models[i].mixer = new THREE.AnimationMixer(Models[i]);
                        Models[i].geometry.animations = [];

                        Models[i].geometry.animations.push(THREE.AnimationClip.parseAnimation(
                            splitAnimation(animateObj, 'stand', 10 * animateObj.fps, 11 *
                                animateObj.fps), Models[i].skeleton.bones));
                        var mixer = new THREE.AnimationMixer(Models[0]);

                        animates.push(mixer);
                        var action = mixer.clipAction(Models[i].geometry.animations);
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