var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var Xdata = function Xdata() {
        classCallCheck(this, Xdata);

        //XFrameInfo Array(final output)
        this.FrameInfo = new Array();

        //XFrameInfo Array
        this.FrameInfo_Raw = new Array();

        this.AnimationSetInfo = new Array();

        this.AnimTicksPerSecond = 60;
};



var Xdata$2 = Object.freeze({
	default: Xdata
});

//ボーン（ウェイト）情報格納クラス構造
var XboneInf = function XboneInf() {
    classCallCheck(this, XboneInf);

    this.BoneName = "";
    //重要：ボーンを1次元配列化したときの配列内index。skinindexに対応する
    this.BoneIndex = 0;
    //このIndecesは頂点Indexということ
    this.Indeces = new Array();
    this.Weights = new Array();
    this.initMatrix = null;
    this.OffsetMatrix = null;
};



var XboneInf$2 = Object.freeze({
	default: XboneInf
});

// import * as THREE from '../three.js'

/**
 * @author Jey-en 
 *
 * This loader loads X file in ASCII Only!!
 *
 * Support
 *  - mesh
 *  - texture
 *  - normal / uv
 *  - material
 *  - skinning
 *
 *  Not Support
 *  - material(ditail)
 *  - morph
 *  - scene
 */

var XFileLoader = function () {
    // コンストラクタ
    function XFileLoader(manager, Texloader, _zflg) {
        classCallCheck(this, XFileLoader);

        this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;
        this.Texloader = Texloader !== undefined ? Texloader : THREE.TextureLoader;
        this.zflg = _zflg === undefined ? false : _zflg;

        ///現在の行読み込みもーど
        this.nowReadMode = XfileLoadMode.none;

        this.nowAnimationKeyType = 4;

        //Xファイルは要素宣言→要素数→要素実体　という並びになるので、要素数宣言を保持する
        this.tgtLength = 0;
        this.nowReaded = 0;

        // { の数（ファイル先頭から
        this.ElementLv = 0;

        //ジオメトリ読み込み開始時の　{ の数
        this.geoStartLv = Number.MAX_VALUE;

        //Frame読み込み開始時の　{ の数
        this.FrameStartLv = Number.MAX_VALUE;

        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;

        //ボーン情報格納用
        this.BoneInf = new XboneInf$2();

        //UV割り出し用の一時保管配列
        this.tmpUvArray = new Array();

        //放線割り出し用の一時保管配列
        //Xfileの放線は「頂点ごと」で入っているので、それを面に再計算して割り当てる。面倒だと思う
        this.NormalVectors = new Array();
        this.FacesNormal = new Array();

        //現在読み出し中のフレーム名称
        this.nowFrameName = "";

        this.nowAnimationSetName = "";

        //現在読み出し中のフレームの階層構造。
        this.FrameHierarchie = new Array();
        this.endLineCount = 0;
        this.geometry = null;

        this.LoadingXdata = null;
        this.lines = null;
    }

    // プロトタイプのメソッド - ruleHelper.isFuga()


    createClass(XFileLoader, [{
        key: 'isFuga',
        value: function isFuga() {
            alert('fatti');
        }

        //読み込み開始命令部

    }, {
        key: 'load',
        value: function load(_arg, onLoad, onProgress, onError) {

            var scope = this;
            var loader = new THREE.XHRLoader(scope.manager);
            loader.setResponseType('arraybuffer');
            var skinFlg = false;
            var url = "";

            for (var i = 0; i < _arg.length; i++) {
                switch (i) {
                    case 0:
                        url = _arg[i];break;
                    case 1:
                        zflg = _arg[i];break;
                    case 2:
                        skinFlg = _arg[i];break;
                }
            }

            loader.load(url, function (text) {
                this.parse(text, url, zflg, skinFlg, onLoad);
            }, onProgress, onError);
        }
    }, {
        key: 'isBinary',
        value: function isBinary(binData) {
            var expect = void 0,
                face_size = void 0,
                n_faces = void 0,
                reader = void 0;
            reader = new DataView(binData);
            face_size = 32 / 8 * 3 + 32 / 8 * 3 * 3 + 16 / 8;
            n_faces = reader.getUint32(80, true);
            expect = 80 + 32 / 8 + n_faces * face_size;

            if (expect === reader.byteLength) {
                return true;
            }

            // some binary files will have different size from expected,
            // checking characters higher than ASCII to confirm is binary
            var fileLength = reader.byteLength;
            for (var index = 0; index < fileLength; index++) {

                if (reader.getUint8(index, false) > 127) {
                    return true;
                }
            }
            return false;
        }
    }, {
        key: 'ensureBinary',
        value: function ensureBinary(buf) {
            if (typeof buf === "string") {
                var array_buffer = new Uint8Array(buf.length);
                for (var i = 0; i < buf.length; i++) {
                    array_buffer[i] = buf.charCodeAt(i) & 0xff; // implicitly assumes little-endian
                }
                return array_buffer.buffer || array_buffer;
            } else {
                return buf;
            }
        }
    }, {
        key: 'ensureString',
        value: function ensureString(buf) {

            if (typeof buf !== "string") {
                var array_buffer = new Uint8Array(buf);
                var str = '';
                for (var i = 0; i < buf.byteLength; i++) {
                    str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
                }
                return str;
            } else {
                return buf;
            }
        }

        //解析を行う前に、バイナリファイルかテキストファイルかを判別する。今はテキストファイルしか対応できていないので・・・

    }, {
        key: 'parse',
        value: function parse(data, url, zflg, skinFlg, onLoad) {
            var binData = this.ensureBinary(data);
            return this.isBinary(binData) ? this.parseBinary(binData) : this.parseASCII(this.ensureString(data), url, zflg, skinFlg, onLoad);
        }

        /*
        バイナリデータだった場合の読み込み。現在は未対応
        */

    }, {
        key: 'parseBinary',
        value: function parseBinary(data) {
            //ねげちぶ！
            return null;
        }
    }, {
        key: 'parseASCII',
        value: function parseASCII(data, url, zflg, skinFlg, _onLoad) {
            //var scope = this;

            //モデルファイルの元ディレクトリを取得する
            var baseDir = "";
            if (url.lastIndexOf("/") > 0) {
                baseDir = url.substr(0, url.lastIndexOf("/") + 1);
            }

            //Xfileとして分解できたものの入れ物
            this.LoadingXdata = new Xdata$2();

            // 返ってきたデータを行ごとに分解
            this.lines = data.split("\n");
        }
    }, {
        key: 'mainloop',
        value: function mainloop() {
            var EndFlg = false;

            //フリーズ現象を防ぐため、100行ずつの制御にしている（１行ずつだと遅かった）
            for (var _i = 0; _i < 100; _i++) {
                LineRead(lines[endLineCount].trim(), zflg, skinFlg);
                this.endLineCount++;

                if (endLineCount >= lines.length - 1) {
                    EndFlg = true;
                    //アニメーション情報、ボーン構造などを再構築
                    LoadingXdata.FrameInfo = new Array();
                    var keys = Object.keys(LoadingXdata.FrameInfo_Raw);
                    for (var _i = 0; _i < keys.length; _i++) {
                        if (LoadingXdata.FrameInfo_Raw[keys[_i]].Mesh != null) {
                            LoadingXdata.FrameInfo.push(LoadingXdata.FrameInfo_Raw[keys[_i]].Mesh);
                        }
                    }

                    //一部ソフトウェアからの出力用（DirectXとOpenGLのZ座標系の違い）に、鏡面処理を行う
                    if (LoadingXdata.FrameInfo != null & LoadingXdata.FrameInfo.length > 0) {
                        for (var _i = 0; _i < LoadingXdata.FrameInfo.length; _i++) {
                            if (LoadingXdata.FrameInfo[_i].parent == null) {

                                LoadingXdata.FrameInfo[_i].zflag = zflg;

                                if (zflg) {
                                    var refz = new THREE.Matrix4().identity();
                                    //refz.elements[0] = -1;
                                    //refz.elements[10] = -1;                                  
                                    //LoadingXdata.FrameInfo[i].applyMatrix(refz);
                                    //LoadingXdata.FrameInfo[i].applyMatrix(new THREE.Matrix4().makeScale(-1, 1, -1));
                                    //LoadingXdata.FrameInfo[i].updateMatrix();
                                    //LoadingXdata.FrameInfo[i].updateMatrixWorld();
                                    LoadingXdata.FrameInfo[_i].scale.set(-1, 1, 1);
                                }

                                //反転化したことによるメッシュ法線情報を再度割り当てる
                                /*
                                  LoadingXdata.FrameInfo[i].geometry.computeFaceNormals();
                                  LoadingXdata.FrameInfo[i].geometry.computeVertexNormals();
                                 */
                            }
                        }
                    }

                    _onLoad(LoadingXdata);
                    break;
                }
            }

            if (!EndFlg) {
                setTimeout(mainLoop, 0);
            }
        }
    }]);
    return XFileLoader;
}();

export default XFileLoader;
