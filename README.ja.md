# THREE.XfileLoader
====
# Overview
X file(directX 3d file) ローダー for three.js.

## デモ

デモ＆サンプルサイト　→ [demo][] 

[demo]: http://adrs2002.com/sandbox/xloader/xFileLoaderSample.html      "Demo"

## 前提・必要なもの
THREE.js

## 使い方的な。

0. `three.js(three.min.js)`　と `threeXLoader.js`　の２つのファイルの読み込みを行います。

1.  `THREE.LoadingManager` と `THREE.TextureLoader`　の定義をしておきます  
(これらは必須ではありませんが、あると非常に役に立ちます)

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

2. `THREE.XLoader` を宣言します

```
    var loader = new THREE.XLoader(manager, Texloader);
```

3. モデルデータを読み込み、シーンに追加します。  
下記はアニメーションがない場合のモデルデータの読み込みです

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

4. アニメーションがある場合のファイルの読み込み（モデルとアニメーションが同一ファイル内にある）


```

    var Models = [];
    var animates = [];

    loader.load(['example.x'], function (object) {
        for (var i = 0; i < object.models.length; i++) {
                Models.push(object.models[i]);    
                scene.add(Models[i]);             
        }

        /// assignAnimation にて、読み込んだアニメーションにモデルのボーン情報を関連付けます。
        loader.assignAnimation(Models[0]);

        // 再生・速度管理がしやすいように、animationMixerは必要な分を配列に入れます
        animates.push(Models[0].animationMixer);

        // アニメーションからクリップを作成します。
        var stand = Models[0].animationMixer.clipAction(Models[0].geometry.animations[0].name);
        
        //アニメーションの再生を開始します。
        stand.play();
        
        object = null;
    }, onProgress, onError);

```

アニメーションを更新します。これは毎フレーム呼ぶ必要があります。

```

   function animate() {

        requestAnimationFrame(animate);
        var nowTime = Date.now();
        var dulTime = nowTime - LastDateTime;
        LastDateTime = nowTime;

        // ここで、animatesの更新をかけることで、ボーン情報が更新され、アニメーションとなります。
        if (animates != null && animates.length > 0) {
            for (var i = 0; i < animates.length; i++) {
                animates[i].update(dulTime);
            }
        }
        renderer.render(scene, camera);
   }

```

5. `assignAnimation`を使うことで、モデルとアニメーションが別のファイルになっている場合でも、アニメーションを結合させることができます。

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

6. 一部ソフトウェアからの出力結果で、モデルが左右に反転している場合は、第二引数のフラグを有効にしてください

```

    var Models = [];

    loader.load(['example.x', { zflag : true } ], function (object) {
        for (var i = 0; i < object.models.length; i++) {
                Models.push(object.models[i]);    
                scene.add(Models[i]);             
        }
        object = null;
    }, onProgress, onError);

```

指定可能な第二引数でのオプション引数は、下記の通りです(ver2.1現在)

  プロパティ名 | 型 | デフォルト | 例 | 説明
  zflag | bool | false | '{ zflag : true }` | モデルをY軸を中心に反転します。
  putPos | bool | true | '{ putPos : true }` | 位置に関するアニメーションを出力します。falseの場合、位置に関するアニメーションを出力しません。これにより、アニメーションが他キャラに流用できるかもしれません。
  putRot | bool | true | '{ putRot : true }` | 回転に関するアニメーションのポジションを出力します。
  putScl | bool | true | '{ putScl : true }` | スケールに関するアニメーションのポジションを出力します。

```
    loader.load(['example.x', { zflag : true, putPos : false, putScl : false  } ], function (object) {

```

7. マテリアルには、メインテクスチャ以外にも、下記のものが指定可能となっております。

 プロパティ名| 説明  
  --- |  ---  
  TextureFilename | 通常のテクスチャマップです
  BumpMapFilename | バンプマッピングを指定できます。
  NormalMapFilename | ノーマルマッピングを指定できます。
  EmissiveMapFilename | 発光マッピングを指定できます。
  LightMapFilename | ライトマップを指定できます。


```
 ( x ファイル内部： MeshMaterialList -> Material block)

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
8. 免責事項

現状、読み込めるXファイルには、下記の制約があります。

・　ファイルは、テキストファイルである必要があります。バイナリタイプのXファイルには対応していません。  
・　アニメーションを行うファイルを読み込む場合には、出力されるメッシュ(mesh)は１つのみにされるようにしてください。  
　　2つ目以降のオブジェクトに関しては、動作の保証ができません。

---------------------------------
## LICENCE
 MIT.