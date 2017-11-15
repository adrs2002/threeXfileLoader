# THREE.XfileLoader

[日本語](README.ja.md)
====
# Overview
X file(directX 3d file) loader for three.js.

## Demo

please look this  → [demo][] 

[demo]: http://adrs2002.com/sandbox/xloader/xFileLoaderSample.html       "Demo"

## Requirement
THREE.js

##how to use

0. read 2 .js file. `three.js(three.min.js)` and `threeXLoader.js`　load code your HTML file.

1.   Declaration  `THREE.LoadingManager` and `THREE.TextureLoader` 
 like this 

```  
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
```  

2. Declaration `THREE.XLoader`

```
    var loader = new THREE.XLoader(manager, Texloader);
```

3.  load .Xfile from URL .
(that is model only file (not animation))

```

    var Models = [];

    loader.load(['example.x'], function (object) {
        for (var i = 0; i < object.models.length; i++) {
                Models.push(object.models[i]);    
                scene.add(Models[i]);             
        }
        object = null;
    }, onProgress, onError);

```

4. model with animation in 1 file


```

    var Models = [];
    var animates = [];

    loader.load(['example.x'], function (object) {
        for (var i = 0; i < object.models.length; i++) {
                Models.push(object.models[i]);    
                scene.add(Models[i]);             
        }

        /// assignAnimation  is must call with animation
        loader.assignAnimation(Models[0]);

        animates.push(Models[0].animationMixer);

        // make animation clip
        var stand = Models[0].animationMixer.clipAction(Models[0].geometry.animations[0].name);
        
        // begin animation!
        stand.play();
        
        object = null;
    }, onProgress, onError);

```

update animation 

```

   function animate() {

        requestAnimationFrame(animate);
        var nowTime = Date.now();
        var dulTime = nowTime - LastDateTime;
        LastDateTime = nowTime;

        // [ animates update ] is update bone.
        if (animates != null && animates.length > 0) {
            for (var i = 0; i < animates.length; i++) {
                animates[i].update(dulTime);
            }
        }
        renderer.render(scene, camera);
   }

```

5. use `assignAnimation`, you can bind model & animation from separately file!

```

    var Models = [];
    var animates = [];

    loader.load(['model.x'], function (object) {
        for (var i = 0; i < object.models.length; i++) {
                Models.push(object.models[i]);    
                scene.add(Models[i]);             
        }

        var loader2 = new THREE.XLoader(manager, Texloader);
        loader2.load(['animation.x'], function () {
            
            loader2.assignAnimation(Models[0]); 
            animates.push(Models[0].animationMixer);
            var stand = Models[0].animationMixer.clipAction(Models[0].geometry.animations[0].name);
            stand.play();

        }
        object = null;
    }, onProgress, onError);


```

6. If the model is flipped horizontally, please enable the flag of the second argument!

```

    var Models = [];

    loader.load(['example.x', true], function (object) {
        for (var i = 0; i < object.models.length; i++) {
                Models.push(object.models[i]);    
                scene.add(Models[i]);             
        }
        object = null;
    }, onProgress, onError);

```

The options that can be specified are as follows.(ver2.1)

  propertyName | valueType | default | example | context
  --- | --- | --- | --- |  ---  
  zflag | bool | false | `{ zflag : true }` | output model flipped Y axis.
  putPos | bool | true | `{ putPos : true }` | output positions animation. set 'false', not output positions animation. may be able to  Diversion animation.
  putRot | bool | true | `{ putRot : true }` | output rotations animation.
  putScl | bool | true | `{ putScl : true }` | output scales animation.

```
    loader.load(['example.x', { zflag : true, putPos : false, putScl : false  } ], function (object) {

```

7. `material` can set diffuse and another texture.

 name | context
  --- |  ---  
  TextureFilename | Diffuse mapping texture.
  BumpMapFilename | Bump mapping texture.
  NormalMapFilename | Normal mapping texture.
  EmissiveMapFilename | Emmissive mapping texture.
  LightMapFilename | Light mapping texture.

```
 ( your x file MeshMaterialList -> Material block)

    Material {
        1.000000;1.000000;1.000000;1.000000;;
        34.560001;
        0.315000;0.315000;0.315000;;
        0.000000;0.000000;0.000000;;
        TextureFilename {
        "dif.png";
        }
        BumpMapFilename {
        "bump.png";
        }
    }

```

---------------------------------
8. Disclaimer

・　can read *TEXT format X file only!* not a binary format!  
・　if your read model & animation in 1 file, make sure that only one mesh is output.  
Operation can not be guaranteed for the second and subsequent objects.

---------------------------------
## LICENCE
 MIT.