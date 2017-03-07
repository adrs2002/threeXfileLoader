"use strict";

// import * as THREE from '../three.js'
import XfileLoadMode from './parts/xFileLoadMode.js'
import Xdata from './parts/rawXdata.js'
import XboneInf from './parts/xBoneInf.js'
import XAnimationInfo from './parts/xAnimationInfo.js'
import XAnimationObj from './parts/XAnimationObj.js'
import XFrameInfo from './parts/XFrameInfo.js'
import KeyFrameInfo from './parts/KeyFrameInfo.js'

/**
 * @author Jey-en 
 *
 * This loader is load model (and animation) from .X file format. (for old DirectX).
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


class XFileLoader {
    // コンストラクタ
    constructor(manager, Texloader, _zflg) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
        this.Texloader = (Texloader !== undefined) ? Texloader : THREE.TextureLoader;
        this.zflg = (_zflg === undefined) ? false : _zflg;
        this.skinFlg = false;
        this.url = "";
        this.baseDir = "";
        // XfileLoadMode = XfileLoadMode;
        // 現在の行読み込みもーど
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
        this.BoneInf = new XboneInf();

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
        this.KeyInfo = null;

        this.animeKeyNames = null;
        this.data = null;
        this.onLoad = null;
    }

    //読み込み開始命令部
    load(_arg, onLoad, onProgress, onError) {

        const loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('arraybuffer');

        for (let i = 0; i < _arg.length; i++) {
            switch (i) {
                case 0: this.url = _arg[i]; break;
                case 1: this.zflg = _arg[i]; break;
                case 2: this.skinFlg = _arg[i]; break;
            }
        }

        loader.load(this.url, (text) => {
            this.parse(text, onLoad);
        }, onProgress, onError);

    }

    isBinary(binData) {

        const reader = new DataView(binData);
        const face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
        const n_faces = reader.getUint32(80, true);
        const expect = 80 + (32 / 8) + (n_faces * face_size);

        if (expect === reader.byteLength) {
            return true;
        }

        // some binary files will have different size from expected,
        // checking characters higher than ASCII to confirm is binary
        const fileLength = reader.byteLength;
        for (let index = 0; index < fileLength; index++) {

            if (reader.getUint8(index, false) > 127) {
                return true;
            }
        }
        return false;
    }


    ensureBinary(buf) {
        if (typeof buf === "string") {
            const array_buffer = new Uint8Array(buf.length);
            for (let i = 0; i < buf.length; i++) {
                array_buffer[i] = buf.charCodeAt(i) & 0xff; // implicitly assumes little-endian
            }
            return array_buffer.buffer || array_buffer;
        } else {
            return buf;
        }
    }

    ensureString(buf) {

        if (typeof buf !== "string") {
            const array_buffer = new Uint8Array(buf);
            let str = '';
            for (let i = 0; i < buf.byteLength; i++) {
                str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
            }
            return str;
        } else {
            return buf;
        }
    }

    //解析を行う前に、バイナリファイルかテキストファイルかを判別する。今はテキストファイルしか対応できていないので・・・
    parse(data, onLoad) {
        const binData = this.ensureBinary(data);
        this.data = this.ensureString(data);
        this.onLoad = onLoad;
        return this.isBinary(binData)
            ? this.parseBinary(binData)
            : this.parseASCII();
    }

    /*
    バイナリデータだった場合の読み込み。現在は基本的に未対応
    */
    parseBinary(data) {
        //ねげちぶ！
        return parseASCII(String.fromCharCode.apply(null, data));
    }

    parseASCII() {
        //モデルファイルの元ディレクトリを取得する
        let baseDir = "";
        if (this.url.lastIndexOf("/") > 0) {
            this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);
        }

        //Xfileとして分解できたものの入れ物
        this.LoadingXdata = new Xdata();

        // 返ってきたデータを行ごとに分解
        this.lines = this.data.split("\n");
        this.mainloop();
    }

    mainloop() {
        let EndFlg = false;

        //フリーズ現象を防ぐため、1000行ずつの制御にしている（１行ずつだと遅かった）
        for (let i = 0; i < 100000; i++) {
            this.LineRead(this.lines[this.endLineCount].trim());
            this.endLineCount++;

            if (this.endLineCount >= this.lines.length - 1) {
                EndFlg = true;
                this.readFinalize();
                setTimeout(() => { this.animationFinalize() }, 0);
                //this.onLoad(this.LoadingXdata);
                break;
            }
        }

        if (!EndFlg) { setTimeout(() => { this.mainloop() }, 0); }

    }



    //Xファイル解析メイン
    LineRead(line) {

        //後でちゃんと考えるさ･･
        // template が入っていたら、その行は飛ばす！飛ばさなきゃ読める形が増えるだろうけど、後回し　
        if (line.indexOf("template ") > -1) { return; }

        if (line.length === 0) { return; }

        //DirectXは[ Frame ] で中身が構成されているため、Frameのツリー構造を一度再現する。
        //その後、Three.jsのObject3D型に合わせて再構築する必要がある
        if (line.indexOf("{") > -1) {
            this.ElementLv++;
        }

        //AnimTicksPerSecondは上のほうで1行で来る想定。外れたら、知らん！データを直すかフォークして勝手にやってくれ
        if (line.indexOf("AnimTicksPerSecond") > -1) {
            const findA = line.indexOf("{") ;
            this.LoadingXdata.AnimTicksPerSecond = parseInt(line.substr(findA + 1, line.indexOf(";") - findA + 1), 10);
        }

        if (line.indexOf("}") > -1) {
            //カッコが終わった時の動作
            if (this.ElementLv < 1 || this.nowFrameName === "") { this.ElementLv = 0; return; }
            this.endElement();
            return;
        }

        ///////////////////////////////////////////////////////////////////

        if (line.indexOf("Frame ") > -1) {
            //１つのFrame開始
            this.beginFrame(line);
            return;
        }

        if (line.indexOf("FrameTransformMatrix") > -1) {
            this.nowReadMode = XfileLoadMode.FrameTransformMatrix_Read;
            return;
        }

        if (this.nowReadMode === XfileLoadMode.FrameTransformMatrix_Read) {
            const data = line.split(",");
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix = new THREE.Matrix4();
            this.ParseMatrixData(this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix, data);
            this.nowReadMode = XfileLoadMode.Element;
            return;
        }

        ////////////////////////////////////////////////////////////////////
        ///Mesh ＝　面データの読み込み開始
        /*  Mesh　は、頂点数（1行または ; ）→頂点データ(;区切りでxyz要素)→面数（index要素数）→index用データ　で成り立つ
        */
        if (line.indexOf("Mesh ") > -1) { this.beginReadMesh(line); return; }

        //頂点数読み出し
        if (this.nowReadMode === XfileLoadMode.Vartex_init) { this.readVertexCount(line); return; }
        //頂点読み出し
        if (this.nowReadMode === XfileLoadMode.Vartex_Read) {
            if (this.readVertex(line)) { return; }
        }

        //Index読み出し///////////////////
        if (this.nowReadMode === XfileLoadMode.Index_init) { this.readIndexLength(line); return; }

        if (this.nowReadMode === XfileLoadMode.index_Read) {
            if (this.readVertexIndex(line)) { return; }
        }

        //Normal部//////////////////////////////////////////////////
        //XFileでのNormalは、頂点毎の向き→面に属してる頂点のID　という順番で入っている。
        if (line.indexOf("MeshNormals ") > -1) { this.beginMeshNormal(line); return; }

        if (this.nowReadMode === XfileLoadMode.Normal_V_init) { this.readMeshNormalCount(line); return; }

        if (this.nowReadMode === XfileLoadMode.Normal_V_Read) { if (this.readMeshNormalVertex(line)) { return; } }

        if (this.nowReadMode === XfileLoadMode.Normal_I_init) { this.readMeshNormalIndexCount(line); return; }

        if (this.nowReadMode === XfileLoadMode.Normal_I_Read) { if (this.readMeshNormalIndex(line)) { return; } }
        ///////////////////////////////////////////////////////////////

        //UV///////////////////////////////////////////////////////////
        //UV宣言
        if (line.indexOf("MeshTextureCoords ") > -1) { this.nowReadMode = XfileLoadMode.Uv_init; return; }

        if (this.nowReadMode === XfileLoadMode.Uv_init) { this.readUvInit(line); return; }

        if (this.nowReadMode === XfileLoadMode.Uv_Read) {
            //次にUVを仮の入れ物に突っ込んでいく
            if (this.readUv(line)) { return; }
        }
        ////////////////////////////////////////////////////////////

        //マテリアルのセット（面に対するマテリアルの割り当て）//////////////////////////
        if (line.indexOf("MeshMaterialList ") > -1) {
            this.nowReadMode = XfileLoadMode.Mat_Face_init;
            return;
        }
        if (this.nowReadMode === XfileLoadMode.Mat_Face_init) {
            //マテリアル数がここ？今回は特に影響ないようだが
            this.nowReadMode = XfileLoadMode.Mat_Face_len_Read;
            return;
        }
        if (this.nowReadMode === XfileLoadMode.Mat_Face_len_Read) { this.readMatrixSetLength(line); return; }

        if (this.nowReadMode === XfileLoadMode.Mat_Face_Set) { if (this.readMaterialBind(line)) { return; } }

        //マテリアル定義
        if (line.indexOf("Material ") > -1) { this.readMaterialInit(line); return; }

        if (this.nowReadMode === XfileLoadMode.Mat_Set) { this.readandSetMaterial(line); return; }

        if (this.nowReadMode >= XfileLoadMode.Mat_Set_Texture && this.nowReadMode < XfileLoadMode.Weit_init) { this.readandSetMaterialTexture(line); return; }
        /////////////////////////////////////////////////////////////////////////

        //Bone部（仮//////////////////////////////////////////////////////////////////////
        if (line.indexOf("SkinWeights ") > -1 && this.nowReadMode >= XfileLoadMode.Element) { this.readBoneInit(line); return; }

        if (this.nowReadMode === XfileLoadMode.Weit_init) { this.readBoneName(line); return; }

        if (this.nowReadMode === XfileLoadMode.Weit_IndexLength) { this.readBoneVertexLength(line); return; }

        if (this.nowReadMode === XfileLoadMode.Weit_Read_Index) { this.readandSetBoneVertex(line); return; }

        if (this.nowReadMode === XfileLoadMode.Weit_Read_Value) { this.readandSetBoneWeightValue(line); return; }

        if (this.nowReadMode === XfileLoadMode.Weit_Read_Matrx) { this.readandSetBoneOffsetMatrixValue(line); return; }
        ///////////////////////////////////////////////////

        //アニメーション部
        ////////////////////////////////////////////////////////////
        //ここからは、Frame構造とは切り離して考える必要がある。
        //別ファイルに格納されている可能性も考慮しなくては…
        if (line.indexOf("AnimationSet ") > -1) { this.readandCreateAnimationSet(line); return; }

        if (line.indexOf("Animation ") > -1 && this.nowReadMode === XfileLoadMode.Anim_init) { this.readAndCreateAnimation(line); return; }

        if (line.indexOf("AnimationKey ") > -1) { this.nowReadMode = XfileLoadMode.Anim_KeyValueTypeRead; return; }

        if (this.nowReadMode === XfileLoadMode.Anim_KeyValueTypeRead) {
            this.nowAnimationKeyType = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReadMode = XfileLoadMode.Anim_KeyValueLength;
            return;
        }

        if (this.nowReadMode === XfileLoadMode.Anim_KeyValueLength) {
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
            this.nowReadMode = XfileLoadMode.Anime_ReadKeyFrame;
            return;
        }
        //やっとキーフレーム読み込み
        if (this.nowReadMode === XfileLoadMode.Anime_ReadKeyFrame) { this.readAnimationKeyFrame(line); return; }
        ////////////////////////
    }


    endElement(line) {

        if (this.nowReadMode < XfileLoadMode.Anim_init && this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv === this.ElementLv && this.nowReadMode > XfileLoadMode.none) {

            //１つのFrame終了
            if (this.FrameHierarchie.length > 0) {
                //「子」を探して、セットする
                this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].children = new Array();
                const keys = Object.keys(this.LoadingXdata.FrameInfo_Raw);
                for (let m = 0; m < keys.length; m++) {
                    if (this.LoadingXdata.FrameInfo_Raw[keys[m]].ParentName === this.nowFrameName) {
                        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].children.push(keys[m]);
                    }
                }
                this.FrameHierarchie.pop();
            }

            this.MakeOutputGeometry(this.nowFrameName, this.zflg);
            this.FrameStartLv = this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv;

            //読み込み中のフレームを一段階上に戻す
            if (this.FrameHierarchie.length > 0) {
                this.nowFrameName = this.FrameHierarchie[this.FrameHierarchie.length - 1];
                this.FrameStartLv = this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv;
            } else {
                this.nowFrameName = "";
            }
        }

        if (this.nowReadMode === XfileLoadMode.Mat_Set) {
            //子階層を探してセットする                    
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Materials.push(this.nowMat);
            this.nowReadMode = XfileLoadMode.Element;
        }

        this.ElementLv--;
    }

    beginFrame(line) {
        this.FrameStartLv = this.ElementLv;
        this.nowReadMode = XfileLoadMode.Element;

        this.nowFrameName = line.substr(6, line.length - 8);
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName] = new XFrameInfo();
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameName = this.nowFrameName;
        //親の名前がすぐわかるので、この段階でセット
        if (this.FrameHierarchie.length > 0) {
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].ParentName = this.FrameHierarchie[this.FrameHierarchie.length - 1];
        }
        this.FrameHierarchie.push(this.nowFrameName);
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv = this.FrameStartLv;
    }

    beginReadMesh(line) {
        if (this.nowFrameName === "") {
            this.FrameStartLv = this.ElementLv;
            this.nowFrameName = line.substr(5, line.length - 6);
            if (this.nowFrameName === "") { this.nowFrameName = "mesh_" + this.LoadingXdata.FrameInfo_Raw.length; }
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName] = new XFrameInfo();
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameName = this.nowFrameName;
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv = this.FrameStartLv;
        }

        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry = new THREE.Geometry();
        this.geoStartLv = this.ElementLv;
        this.nowReadMode = XfileLoadMode.Vartex_init;

        Bones = new Array();
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Materials = new Array();
    }

    readVertexCount(line) {
        this.nowReadMode = XfileLoadMode.Vartex_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }

    readVertex(line) {
        //頂点が確定
        const data = line.substr(0, line.length - 2).split(";");
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
        //頂点を作りながら、Skin用構造も作成してしまおう
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].VertexSetedBoneCount.push(0);
        this.nowReaded++;

        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = XfileLoadMode.Index_init;
            return true;
        }
        return false;
    }

    readIndexLength(line) {
        this.nowReadMode = XfileLoadMode.index_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }

    readVertexIndex(line) {
        // 面に属する頂点数,頂点の配列内index という形で入っている
        const data = line.substr(2, line.length - 4).split(",");

        if (this.zflg) {
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.push(new THREE.Face3(parseInt(data[2], 10), parseInt(data[1], 10), parseInt(data[0], 10), new THREE.Vector3(1, 1, 1).normalize()));
        } else {
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1], 10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));
        }
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = XfileLoadMode.Element;
            return true;
        }
        return false;
    }

    beginMeshNormal(line) {
        this.nowReadMode = XfileLoadMode.Normal_V_init;
        this.NormalVectors = new Array();
        this.FacesNormal = new Array();
    }

    readMeshNormalCount(line) {
        this.nowReadMode = XfileLoadMode.Normal_V_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }

    readMeshNormalVertex(line) {
        var data = line.split(";");
        this.NormalVectors.push([parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])]);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = XfileLoadMode.Normal_I_init;
            return true;
        }
        return false;
    }

    readMeshNormalIndexCount(line) {
        this.nowReadMode = XfileLoadMode.Normal_I_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }

    readMeshNormalIndex(line) {

        //やっとNomal放線が決まる
        const data = line.substr(2, line.length - 4).split(",");
        //indexに対応したベクトルを一度取得＆加算し、単位ベクトルを得てからセットする

        let nowID = parseInt(data[0], 10);
        const v1 = new THREE.Vector3(this.NormalVectors[nowID][0], this.NormalVectors[nowID][1], this.NormalVectors[nowID][2]);
        nowID = parseInt(data[1], 10);
        const v2 = new THREE.Vector3(this.NormalVectors[nowID][0], this.NormalVectors[nowID][1], this.NormalVectors[nowID][2]);
        nowID = parseInt(data[2], 10);
        const v3 = new THREE.Vector3(this.NormalVectors[nowID][0], this.NormalVectors[nowID][1], this.NormalVectors[nowID][2]);

        //研究中
        if (this.zflg) {
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v3, v2, v1];
        } else {
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v1, v2, v3];
        }
        //this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v1, v2, v3];

        this.FacesNormal.push(v1.normalize());
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = XfileLoadMode.Element;
            return true;
        }
        return false;
    }

    ///////
    readUvInit(line) {
        //まず、セットされるUVの頂点数
        this.nowReadMode = XfileLoadMode.Uv_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
        this.tmpUvArray = new Array();
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0] = new Array();
    }

    readUv(line) {
        const data = line.split(";");
        //これは宣言された頂点の順に入っていく
        if (XfileLoader_IsUvYReverse) {
            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), 1 - parseFloat(data[1])));
        } else {
            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), parseFloat(data[1])));
        }

        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            //UV読み込み完了。メッシュにUVを割り当てる
            //geometry.faceVertexUvs[ 0 ][ faceIndex ][ vertexIndex ]
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0] = new Array();
            for (var m = 0; m < this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.length; m++) {
                this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m] = new Array();
                this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[m].a]);
                this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[m].b]);
                this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[m].c]);
            }

            this.nowReadMode = XfileLoadMode.Element;
            this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.uvsNeedUpdate = true;
            return true;
        }
        return false;
    }

    readMatrixSetLength(line) {
        this.nowReadMode = XfileLoadMode.Mat_Face_Set;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }

    readMaterialBind(line) {
        const data = line.split(",");
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].materialIndex = parseInt(data[0]);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = XfileLoadMode.Element;
            return true;
        }
        return false;
    }

    readMaterialInit(line) {
        this.nowReadMode = XfileLoadMode.Mat_Set;
        this.matReadLine = 0;
        this.nowMat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
        let matName = line.substr(9, line.length - 10);
        if (matName !== "") { this.nowMat.name = matName; }

        if (this.zflg) {
            this.nowMat.side = THREE.BackSide;
        }
        else {
            this.nowMat.side = THREE.FrontSide;
        }
        this.nowMat.side = THREE.FrontSide;
    }

    readandSetMaterial(line) {
        const data = line.split(";");
        this.matReadLine++;
        switch (this.matReadLine) {
            case 1:
                //FaceColor
                this.nowMat.color.r = data[0];
                this.nowMat.color.g = data[1];
                this.nowMat.color.b = data[2];
                break;
            case 2:
                //power
                this.nowMat.shininess = data[0];
                break;
            case 3:
                //Specular
                this.nowMat.specular.r = data[0];
                this.nowMat.specular.g = data[1];
                this.nowMat.specular.b = data[2];
                break;
            case 4:
                //Emissiv color and put
                this.nowMat.emissive.r = data[0];
                this.nowMat.emissive.g = data[1];
                this.nowMat.emissive.b = data[2];
                break;
        }

        if (line.indexOf("TextureFilename") > -1) {
            this.nowReadMode = XfileLoadMode.Mat_Set_Texture;
        }
        if (line.indexOf("BumpMapFilename") > -1) {
            this.nowReadMode = XfileLoadMode.Mat_Set_BumpTex;
            this.nowMat.bumpScale = 0.05;
        }
        if (line.indexOf("NormalMapFilename") > -1) {
            this.nowReadMode = XfileLoadMode.Mat_Set_NormalTex;
            this.nowMat.normalScale = new THREE.Vector2(2, 2);
        }
        if (line.indexOf("EmissiveMapFilename") > -1) {
            this.nowReadMode = XfileLoadMode.Mat_Set_EmissiveTex;
        }
        if (line.indexOf("LightMapFilename") > -1) {
            this.nowReadMode = XfileLoadMode.Mat_Set_LightTex;
        }
    }

    //テクスチャのセット 
    readandSetMaterialTexture(line) {
        const data = line.substr(1, line.length - 3);
        if (data != undefined && data.length > 0) {

            switch (this.nowReadMode) {
                case XfileLoadMode.Mat_Set_Texture:
                    this.nowMat.map = this.Texloader.load(this.baseDir + data);
                    break;
                case XfileLoadMode.Mat_Set_BumpTex:
                    this.nowMat.bumpMap = this.Texloader.load(this.baseDir + data);
                    break;
                case XfileLoadMode.Mat_Set_NormalTex:
                    this.nowMat.normalMap = this.Texloader.load(this.baseDir + data);
                    break;
                case XfileLoadMode.Mat_Set_EmissiveTex:
                    this.nowMat.emissiveMap = this.Texloader.load(this.baseDir + data);
                    break;
                case XfileLoadMode.Mat_Set_LightTex:
                    this.nowMat.lightMap = this.Texloader.load(this.baseDir + data);
                    break;
                case XfileLoadMode.Mat_Set_EnvTex:
                    this.nowMat.envMap = this.Texloader.load(this.baseDir + data);
                    break;
            }
        }
        this.nowReadMode = XfileLoadMode.Mat_Set;
        this.endLineCount++;    //}しかないつぎの行をとばす。改行のない詰まったデータが来たらどうしようね
        this.ElementLv--;
    }
    ////////////////////////////////////////////////
    readBoneInit(line) {
        this.nowReadMode = XfileLoadMode.Weit_init;
        this.BoneInf = new XboneInf();
    }
    readBoneName(line) {
        //ボーン名称
        this.nowReadMode = XfileLoadMode.Weit_IndexLength;
        this.BoneInf.BoneName = line.substr(1, line.length - 3);
        this.BoneInf.BoneIndex = this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.length;
        this.nowReaded = 0;
    }

    readBoneVertexLength(line) {
        //ボーンに属する頂点数
        this.nowReadMode = XfileLoadMode.Weit_Read_Index;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }
    readandSetBoneVertex(line) {
        //ボーンに属する頂点を割り当て
        this.BoneInf.Indeces.push(parseInt(line.substr(0, line.length - 1), 10));
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {
            this.nowReadMode = XfileLoadMode.Weit_Read_Value;
            this.nowReaded = 0;
        }
    }
    readandSetBoneWeightValue(line) {
        //頂点にウェイトを割り当て
        const nowVal = parseFloat(line.substr(0, line.length - 1));
        this.BoneInf.Weights.push(nowVal);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {
            this.nowReadMode = XfileLoadMode.Weit_Read_Matrx;
        }
    }
    readandSetBoneOffsetMatrixValue(line) {
        //ボーンの初期Matrix
        const data = line.split(",");
        this.BoneInf.initMatrix = new THREE.Matrix4();
        this.ParseMatrixData(this.BoneInf.initMatrix, data);

        this.BoneInf.OffsetMatrix = new THREE.Matrix4();
        this.BoneInf.OffsetMatrix.getInverse(this.BoneInf.initMatrix);
        this.LoadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.push(this.BoneInf);
        this.nowReadMode = XfileLoadMode.Element;
    }
    //////////////
    readandCreateAnimationSet(line) {
        this.FrameStartLv = this.ElementLv;
        this.nowReadMode = XfileLoadMode.Anim_init;

        this.nowAnimationSetName = line.substr(13, line.length - 14).trim();    //13ってのは　AnimationSet  の文字数。 14は AnimationSet に末尾の  { を加えて、14
        this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName] = new Array();
    }

    readAndCreateAnimation(line) {
        //アニメーション構造開始。
        this.nowFrameName = line.substr(10, line.length - 11).trim();    //10ってのは　Animations  の文字数。 11は Animations に末尾の  { を加えて、11
        this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName] = new XAnimationInfo();
        this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].AnimeName = this.nowFrameName;
        this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].FrameStartLv = this.FrameStartLv;
        //ここは悪いコード。
        //次に来る「影響を受けるボーン」は、{  }  が１行で来るという想定･･･かつ、１つしかないという想定。
        //想定からずれるものがあったらカスタマイズしてくれ･･そのためのオープンソースだ。
        while (true) {
            this.endLineCount++;
            line = this.lines[this.endLineCount].trim();
            if (line.indexOf("{") > -1 && line.indexOf("}") > -1) {
                this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].BoneName = line.replace(/{/g, "").replace(/}/g, "").trim();
                break;
            }
        }
    }

    readAnimationKeyFrame(line) {
        this.KeyInfo = null;
        const data = line.split(";");

        const nowKeyframe = parseInt(data[0], 10);
        let frameFound = false;

        const tmpM = new THREE.Matrix4();
        //すでにそのキーが宣言済みでないかどうかを探す
        //要素によるキー飛ばし（回転：0&20フレーム、　移動:0&10&20フレーム　で、10フレーム時に回転キーがない等 )には対応できていない
        if (this.nowAnimationKeyType != 4) {
            for (var mm = 0; mm < this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].KeyFrames.length; mm++) {
                if (this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].KeyFrames[mm].Frame === nowKeyframe) {
                    this.KeyInfo = this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].KeyFrames[mm];
                    frameFound = true;
                    break;
                }
            }
        }

        if (!frameFound) {
            this.KeyInfo = new KeyFrameInfo();
            this.KeyInfo.matrix = new THREE.Matrix4();
            this.KeyInfo.Frame = nowKeyframe;
        }


        const data2 = data[2].split(",");
        switch (this.nowAnimationKeyType) {
            case 0:
                tmpM.makeRotationFromQuaternion(new THREE.Quaternion(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2])));
                this.KeyInfo.matrix.multiply(tmpM);
                break;
            case 1:
                tmpM.makeScale(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2]));
                this.KeyInfo.matrix.multiply(tmpM);
                break;
            case 2:
                tmpM.makeTranslation(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2]));
                this.KeyInfo.matrix.multiply(tmpM);
                break;
            //case 3: this.KeyInfo.matrix.makeScale(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])); break;
            case 4:
                this.ParseMatrixData(this.KeyInfo.matrix, data2);
                break;
        }

        if (!frameFound) {
            this.KeyInfo.index = this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].KeyFrames.length;
            this.KeyInfo.time = /*1.0 / this.LoadingXdata.AnimTicksPerSecond * */ this.KeyInfo.Frame;
            this.LoadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].KeyFrames.push(this.KeyInfo);
        }

        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";;;") > -1) {
            this.nowReadMode = XfileLoadMode.Anim_init
        }
    }
    ////////////////////////

    readFinalize() {
        //アニメーション情報、ボーン構造などを再構築
        this.LoadingXdata.FrameInfo = new Array();
        const keys = Object.keys(this.LoadingXdata.FrameInfo_Raw);
        for (let i = 0; i < keys.length; i++) {
            if (this.LoadingXdata.FrameInfo_Raw[keys[i]].Mesh != null) {
                this.LoadingXdata.FrameInfo.push(this.LoadingXdata.FrameInfo_Raw[keys[i]].Mesh);
            }
        }

        //一部ソフトウェアからの出力用（DirectXとOpenGLのZ座標系の違い）に、鏡面処理を行う
        if (this.LoadingXdata.FrameInfo != null & this.LoadingXdata.FrameInfo.length > 0) {
            for (let i = 0; i < this.LoadingXdata.FrameInfo.length; i++) {
                if (this.LoadingXdata.FrameInfo[i].parent == null) {
                    this.LoadingXdata.FrameInfo[i].zflag = this.zflg;
                    if (this.zflg) {
                        this.LoadingXdata.FrameInfo[i].scale.set(-1, 1, 1);
                    }
                }
            }
        }

    }

    /////////////////////////////////
    ParseMatrixData(targetMatrix, data) {
        targetMatrix.set(
            parseFloat(data[0]), parseFloat(data[4]), parseFloat(data[8]), parseFloat(data[12]),
            parseFloat(data[1]), parseFloat(data[5]), parseFloat(data[9]), parseFloat(data[13]),
            parseFloat(data[2]), parseFloat(data[6]), parseFloat(data[10]), parseFloat(data[14]),
            parseFloat(data[3]), parseFloat(data[7]), parseFloat(data[11]), parseFloat(data[15]));
    }


    //最終的に出力されるTHREE.js型のメッシュ（Mesh)を確定する
    MakeOutputGeometry(nowFrameName, _zflg) {

        if (this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry != null) {

            //１つのmesh終了
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingBox();
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingSphere();

            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.verticesNeedUpdate = true;
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.normalsNeedUpdate = true;
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.colorsNeedUpdate = true;
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.uvsNeedUpdate = true;
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.groupsNeedUpdate = true;

            //ボーンの階層構造を作成する
            //BoneはFrame階層基準で作成、その後にWeit割り当てのボーン配列を再セットする

            const putBones = new Array();
            const BoneDics = new Array();
            let rootBone = new THREE.Bone();
            if (this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs != null && this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length) {
                const keys = Object.keys(this.LoadingXdata.FrameInfo_Raw);
                const BoneDics_Name = new Array();
                for (let m = 0; m < keys.length; m++) {
                    if (this.LoadingXdata.FrameInfo_Raw[keys[m]].FrameStartLv <= this.LoadingXdata.FrameInfo_Raw[nowFrameName].FrameStartLv && nowFrameName != keys[m]) { continue; }

                    const b = new THREE.Bone();
                    b.name = keys[m];
                    b.applyMatrix(this.LoadingXdata.FrameInfo_Raw[keys[m]].FrameTransformMatrix);
                    b.matrixWorld = b.matrix;
                    b.FrameTransformMatrix = this.LoadingXdata.FrameInfo_Raw[keys[m]].FrameTransformMatrix;
                    BoneDics_Name[b.name] = putBones.length;
                    putBones.push(b);
                }


                //今度はボーンの親子構造を作成するために、再度ループさせる
                for (let m = 0; m < putBones.length; m++) {
                    for (let dx = 0; dx < this.LoadingXdata.FrameInfo_Raw[putBones[m].name].children.length; dx++) {
                        const nowBoneIndex = BoneDics_Name[this.LoadingXdata.FrameInfo_Raw[putBones[m].name].children[dx]];
                        if (putBones[nowBoneIndex] != null) {
                            putBones[m].add(putBones[nowBoneIndex]);
                        }
                    }
                }
            }

            let mesh = null;
            if (putBones.length > 0) {
                if (this.LoadingXdata.FrameInfo_Raw[putBones[0].name].children.length === 0 && nowFrameName != putBones[0].name) {
                    putBones[0].add(putBones[1]);
                    putBones[0].zflag = _zflg;
                }

                //さらに、ウェイトとボーン情報を紐付ける
                for (let m = 0; m < putBones.length; m++) {
                    if (putBones[m].parent === null) {
                        putBones[m].zflag = _zflg;
                    }

                    for (let bi = 0; bi < this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length; bi++) {
                        if (putBones[m].name === this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].BoneName) {
                            //ウェイトのあるボーンであることが確定。頂点情報を割り当てる
                            for (let vi = 0; vi < this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces.length; vi++) {
                                //頂点へ割り当て
                                const nowVertexID = this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces[vi];
                                const nowVal = this.LoadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Weights[vi];

                                switch (this.LoadingXdata.FrameInfo_Raw[nowFrameName].VertexSetedBoneCount[nowVertexID]) {
                                    case 0:
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].x = m;
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].x = nowVal;
                                        break;
                                    case 1:
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].y = m;
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].y = nowVal;
                                        break;
                                    case 2:
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].z = m;
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].z = nowVal;
                                        break;
                                    case 3:
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].w = m;
                                        this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].w = nowVal;
                                        break;
                                }
                                this.LoadingXdata.FrameInfo_Raw[nowFrameName].VertexSetedBoneCount[nowVertexID]++;
                            }
                        }
                    }
                }

                for (let sk = 0; sk < this.LoadingXdata.FrameInfo_Raw[nowFrameName].Materials.length; sk++) {
                    this.LoadingXdata.FrameInfo_Raw[nowFrameName].Materials[sk].skinning = true;
                }

                mesh = new THREE.SkinnedMesh(this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry, new THREE.MultiMaterial(this.LoadingXdata.FrameInfo_Raw[nowFrameName].Materials));
                const skeleton = new THREE.Skeleton(putBones);
                mesh.add(putBones[0]);
                mesh.bind(skeleton);

                mesh.SketetonBase = putBones;

            }
            else {
                mesh = new THREE.Mesh(this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry, new THREE.MultiMaterial(this.LoadingXdata.FrameInfo_Raw[nowFrameName].Materials));
            }
            mesh.name = nowFrameName;
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Mesh = mesh;
            this.LoadingXdata.FrameInfo_Raw[nowFrameName].Geometry = null;
        }
    }

    //ガチ最終・アニメーションを独自形式→Three.jsの標準に変換する
    animationFinalize() {
        this.animeKeyNames = Object.keys(this.LoadingXdata.AnimationSetInfo);
        if (this.animeKeyNames != null && this.animeKeyNames.length > 0) {
            this.nowReaded = 0;
            this.LoadingXdata.XAnimationObj = [];
            this.animationFinalize_step();
        } else {
            this.finalproc();
        }
    }


    animationFinalize_step() {
        const i = this.nowReaded;
        const keys = Object.keys(this.LoadingXdata.FrameInfo_Raw);
        //アニメーションセットと関連付けられている「はず」のモデルを探す。
        let tgtModel = null;
        for (let m = 0; m < this.LoadingXdata.FrameInfo.length; m++) {
            const keys2 = Object.keys(this.LoadingXdata.AnimationSetInfo[this.animeKeyNames[i]]);
            if(this.LoadingXdata.AnimationSetInfo[this.animeKeyNames[i]][keys2[0]].BoneName == this.LoadingXdata.FrameInfo[m].name){
                tgtModel =  this.LoadingXdata.FrameInfo[m];
            }
        }
        if (tgtModel != null) {
            this.LoadingXdata.XAnimationObj[i] = new XAnimationObj();
            this.LoadingXdata.XAnimationObj[i].fps = this.LoadingXdata.AnimTicksPerSecond;
            this.LoadingXdata.XAnimationObj[i].name = this.animeKeyNames[i];
            this.LoadingXdata.XAnimationObj[i].make(this.LoadingXdata.AnimationSetInfo[this.animeKeyNames[i]], tgtModel);

            tgtModel.geometry.animations = THREE.AnimationClip.parseAnimation(this.LoadingXdata.XAnimationObj[i],tgtModel.skeleton.bones);            
        } 
        this.nowReaded++;
        if (this.nowReaded >= this.animeKeyNames.length) {
            this.finalproc();
        } else {
            this.animationFinalize_step();
        }
    }

    finalproc() {
        setTimeout(() => { this.onLoad(this.LoadingXdata) }, 0);
    }
};
