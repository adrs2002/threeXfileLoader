"use strict";

/**
 * @author Jey-en  https://github.com/adrs2002
 * 
 * this loader repo -> https://github.com/adrs2002/threeXLoader
 * 
 * This loader is load model (and animation) from .X file format. (for old DirectX).
 *  ! this version are load from TEXT format .X only ! not a Binary.
 * 
 * Support
 *  - mesh
 *  - texture
 *  - normal / uv
 *  - material
 *  - skinning
 *
 *  Not Support
 *  - template
 *  - material(ditail)
 *  - morph
 *  - scene
 */

// import * as THREE from '../three.js'

// import this.XfileLoadMode from './parts/this.xFileLoadMode.js'
import Xdata from './parts/rawXdata.js'
import XboneInf from './parts/xBoneInf.js'
import XAnimationInfo from './parts/xAnimationInfo.js'
import XAnimationObj from './parts/XAnimationObj.js'
import XFrameInfo from './parts/xFrameInfo.js'
import XKeyFrameInfo from './parts/KeyFrameInfo.js'


export default class XLoader {
    // コンストラクタ
    constructor(manager, Texloader, _zflg) {

        this.debug = false;

        /*
        this.XfileLoadMode = {

            none: -1,
            Element: 1,
            FrameTransformMatrix_Read: 3,
            Mesh: 5,
            Vartex_init: 10,
            Vartex_Read: 11,
            Index_init: 20,
            index_Read: 21,
            Uv_init: 30,
            Uv_Read: 31,

            Normal_V_init: 40,
            Normal_V_Read: 41,
            Normal_I_init: 42,
            Normal_I_Read: 43,

            Mat_Face_init: 101,
            Mat_Face_len_Read: 102,
            Mat_Face_Set: 103,
            Mat_Set: 111,

            Mat_Set_Texture: 121,
            Mat_Set_LightTex: 122,
            Mat_Set_EmissiveTex: 123,
            Mat_Set_BumpTex: 124,
            Mat_Set_NormalTex: 125,
            Mat_Set_EnvTex: 126,

            Weit_init: 201,
            Weit_IndexLength: 202,
            Weit_Read_Index: 203,
            Weit_Read_Value: 204,
            Weit_Read_Matrx: 205,

            Anim_init: 1001,
            Anim_Reading: 1002,
            Anim_KeyValueTypeRead: 1003,
            Anim_KeyValueLength: 1004,
            Anime_ReadKeyFrame: 1005,

        };
        */

        this.manager = (manager != null) ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = (Texloader != null) ? Texloader : new THREE.TextureLoader();
        this.zflg = (_zflg === undefined) ? false : _zflg;

        this.url = "";
        this.baseDir = "";

        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;

        //UV割り出し用の一時保管配列
        this.tmpUvArray = [];

        this.facesNormal = [];
        this.normalReadFlag = false;
        //現在読み出し中のフレーム名称
        this.nowFrameName = "";

        this.nowAnimationSetName = "";

        //現在読み出し中のフレームの階層構造。
        this.frameHierarchie = [];
        this.Hierarchies = {};
        this.HieStack = [];
        this.currentObject = {};
        this.currentFrame = {};


        this.endLineCount = 0;

        this.loadingXdata = null;
        this.lines = null;
        this.keyInfo = null;

        this.animeKeyNames = null;
        this.data = null;
        this.onLoad = null;

        this.IsUvYReverse = true;

        this.Meshes = [];
        this.Animations = [];
        this.AnimTicksPerSecond = 30;

        this.currentGeo = null;
        this.currentAnime = null;
        this.currentAnimeFrames = null;

        this.texCount = 0;
        this.readedTexCount = 0;
    }

    //読み込み開始命令部
    load(_arg, onLoad, onProgress, onError) {

        const loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('arraybuffer');

        for (let i = 0; i < _arg.length; i++) {
            switch (i) {
                case 0:
                    this.url = _arg[i];
                    break;
                case 1:
                    this.zflg = _arg[i];
                    break;
            }
        }

        loader.load(this.url, (response) => {

            this.parse(response, onLoad);

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
        return this.isBinary(binData) ?
            this.parseBinary(binData) :
            this.parseASCII();

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
        this.loadingXdata = new Xdata();

        // 返ってきたデータを行ごとに分解
        // this.lines = this.data.split("\n");

        // 階層構造分解
        let added = 0;
        let endRead = 16; // 先頭16文字は固定
        this.Hierarchies.children = [];
        this.HierarchieParse(this.Hierarchies, endRead);
        this.currentObject = this.Hierarchies; //.children.shift();
        this.mainloop();

    }

    HierarchieParse(_parent, _end) {
        let endRead = _end;
        while (true) {
            const find1 = this.data.indexOf('{', endRead) + 1;
            const findEnd = this.data.indexOf('}', endRead);
            const findNext = this.data.indexOf('{', find1) + 1;
            if (find1 > 0 && findEnd > find1) {
                const currentObject = {};
                currentObject.children = [];
                const nameData = this.data.substr(endRead, find1 - endRead - 1).trim();

                const word = nameData.split(/ /g);
                if (word.length > 0) {
                    currentObject.type = word[0];
                    if (word.length >= 2) {
                        currentObject.name = word[1];
                    } else {
                        currentObject.name = word[0] + this.Hierarchies.children.length;
                    }
                } else {
                    currentObject.name = nameData;
                    currentObject.type = "";
                }

                if (currentObject.type == "Animation") {
                    currentObject.data = this.data.substr(findNext, findEnd - findNext).trim();
                    const refs = this.HierarchieParse(currentObject, findEnd + 1);
                    endRead = refs.end;
                    currentObject.children = refs.parent.children;
                } else {
                    const DataEnder = this.data.lastIndexOf(';', findNext > 0 ? Math.min(findNext, findEnd) : findEnd);
                    currentObject.data = this.data.substr(find1, DataEnder - find1).trim();
                    if (findNext <= 0 || findEnd < findNext) {
                        // 子階層なし。クローズ   
                        endRead = findEnd + 1;
                    } else {
                        // 子階層あり
                        const nextStart = Math.max(DataEnder + 1, find1);
                        const refs = this.HierarchieParse(currentObject, nextStart);
                        endRead = refs.end;
                        currentObject.children = refs.parent.children;
                    }
                }
                currentObject.parent = _parent;
                if (currentObject.type != "template") {
                    _parent.children.push(currentObject);
                }
            } else {
                endRead = find1 === -1 ? this.data.length : findEnd + 1;
                break;
            }
        }

        return {
            parent: _parent,
            end: endRead
        };
    }


    mainloop() {

        const timeoutFlag = this.mainProc();

        if (this.currentObject.parent) {
            this.currentObject = this.currentObject.parent;
            if (timeoutFlag) {
                setTimeout(() => {
                    if (this.debug) {console.log(' == break === ');}
                    this.mainloop();
                }, 1);
            } else {
                this.mainloop();
            }
        } else {
            this.readFinalize();
            this.returnLoop();
        }
    }

    mainProc() {
        let ref_timeout = false;
        while (true) {
            if (this.currentObject.children.length > 0) {
                this.currentObject = this.currentObject.children.shift();
                if (this.debug) {
                    console.log('processing ' + this.currentObject.name);
                }
                switch (this.currentObject.type) {
                    case "template":
                        break;

                    case "AnimTicksPerSecond":

                        break;

                    case "Frame":
                        this.setFrame();
                        break;

                    case "FrameTransformMatrix":
                        this.setFrameTransformMatrix();
                        break;

                    case "Mesh":
                        this.changeRoot();
                        this.currentGeo = {};
                        this.currentGeo.name = this.currentObject.name.trim();
                        this.currentGeo.ParentName = this.getParentName(this.currentObject).trim();
                        this.currentGeo.VertexSetedBoneCount = [];
                        this.currentGeo.Geometry = new THREE.Geometry();
                        this.currentGeo.Materials = [];
                        this.currentGeo.normalVectors = [];
                        this.currentGeo.BoneInfs = [];
                        this.currentGeo.putBones = [];
                        this.currentGeo.baseFrame = this.currentFrame;
                        this.makeBoneFromCurrentFrame();
                        this.readVertexDatas();
                        ref_timeout = true;
                        break;

                    case "MeshNormals":
                        this.readVertexDatas();
                        this.normalReadFlag = true;
                        break;

                    case "MeshTextureCoords":
                        this.setMeshTextureCoords();
                        break;

                    case "VertexDuplicationIndices":
                        //イラネ
                        break;

                    case "MeshMaterialList":
                        this.setMeshMaterialList();
                        break;

                    case "Material":
                        this.setMaterial();
                        break;

                    case "SkinWeights":
                        this.setSkinWeights();
                        break;

                    case "AnimationSet":
                        this.changeRoot();
                        this.currentAnime = {};
                        this.currentAnime.name = this.currentObject.name.trim();
                        this.currentAnime.AnimeFrames = [];
                        break;

                    case "Animation":
                        // this.currentAnimeFrames = {};
                        // this.currentAnimeFrames.boneName = this.currentObject.data.trim();
                        this.currentAnimeFrames = new XAnimationInfo();
                        this.currentAnimeFrames.boneName = this.currentObject.data.trim();
                        break;

                    case "AnimationKey":
                        this.readAnimationKey();
                        ref_timeout = true;
                        break;
                }
            } else {
                // ルート＝親が１つだけの場合
                if (this.currentObject.parent && !this.currentObject.parent.parent) {
                    this.changeRoot();
                }
                break;
            }
        }
        return ref_timeout;
    }

    changeRoot() {

        if (this.currentGeo != null && this.currentGeo.name) {
            this.MakeOutputGeometry();
            this.currentGeo = {};
        }
        if (this.currentAnime != null && this.currentAnime.name) {
            this.MakeOutputAnimation();
            this.currentAnime = {};
        }

    }

    getParentName(_obj) {
        if (_obj.parent) {
            if (_obj.parent.name) {
                return _obj.parent.name;
            } else {
                return this.getParentName(_obj.parent);
            }
        } else {
            return "";
        }
    }

    setFrame() {
        this.nowFrameName = this.currentObject.name.trim();
        this.currentFrame = {};
        this.currentFrame.name = this.nowFrameName;
        this.currentFrame.children = [];
        if (this.currentObject.parent && this.currentObject.parent.name) {
            this.currentFrame.parentName = this.currentObject.parent.name;
        }
        this.frameHierarchie.push(this.nowFrameName);
        this.HieStack[this.nowFrameName] = this.currentFrame;
    }

    setFrameTransformMatrix() {
        // this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix = new THREE.Matrix4();
        // this.ParseMatrixData(this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix, this.currentObject.data);

        this.currentFrame.FrameTransformMatrix = new THREE.Matrix4();
        const data = this.currentObject.data.split(",");
        this.ParseMatrixData(this.currentFrame.FrameTransformMatrix, data);
        if (this.currentGeo != null && this.currentGeo.putBones) {
            this.makeBoneFromCurrentFrame();
        }
    }

    makeBoneFromCurrentFrame() {
        const b = new THREE.Bone();
        b.name = this.currentFrame.name;
        b.applyMatrix(this.currentFrame.FrameTransformMatrix);
        b.matrixWorld = b.matrix;
        b.FrameTransformMatrix = this.currentFrame.FrameTransformMatrix;
        this.currentGeo.putBones.push(b);

        if (this.currentFrame.parentName) {
            for (let i = 0; i < this.currentGeo.putBones.length; i++) {
                if (this.currentGeo.putBones[i].name === this.currentFrame.parentName) {
                    this.currentGeo.putBones[i].add(this.currentGeo.putBones[this.currentGeo.putBones.length - 1]);
                    break;
                }
            }
        }

    }

    readVertexDatas() {

        // 1行目は総頂点数。
        let endRead = 0;
        let totalV = 0;
        let totalFace = 0;
        let mode = 0;
        let mode_local = 0
        let maxLength = 0;
        let nowReadedLine = 0;
        while (true) {
            let changeMode = false;
            if (mode_local === 0) {
                const refO = this.readInt1(endRead);
                totalV = refO.refI;
                endRead = refO.endRead;
                mode_local = 1;
                nowReadedLine = 0;
                maxLength = this.currentObject.data.indexOf(';;', endRead) + 1;
                if (maxLength <= 0) {
                    maxLength = this.currentObject.data.length
                }
            } else {
                let find = 0;
                switch (mode) {
                    case 0:
                        find = this.currentObject.data.indexOf(',', endRead) + 1;
                        break;
                    case 1:
                        find = this.currentObject.data.indexOf(';,', endRead) + 1;
                        break;
                }

                if (find === 0 || find > maxLength) {
                    find = maxLength;
                    mode_local = 0;
                    changeMode = true;
                }

                switch (this.currentObject.type) {
                    case "Mesh":
                        switch (mode) {
                            case 0:
                                this.readVertex1(this.currentObject.data.substr(endRead, find - endRead));
                                break;
                            case 1:
                                this.readFace1(this.currentObject.data.substr(endRead, find - endRead));
                                break;
                        }
                        break;

                    case "MeshNormals":
                        switch (mode) {
                            case 0:
                                this.readNormalVector1(this.currentObject.data.substr(endRead, find - endRead));
                                break;
                            case 1:
                                this.readNormalFace1(this.currentObject.data.substr(endRead, find - endRead), nowReadedLine);
                                break;
                        }
                        break;
                }
                endRead = find + 1;
                nowReadedLine++;
                if (changeMode) {
                    mode++;
                }
            }
            if (endRead >= this.currentObject.data.length) {
                break;
            }
        }
    }

    readInt1(start) {
        const find = this.currentObject.data.indexOf(';', start);
        return {
            refI: parseInt(this.currentObject.data.substr(start, find - start)),
            endRead: find + 1
        };
    }

    readVertex1(line) {
        //頂点が確定
        const data = line.trim().substr(0, line.length - 2).split(";");
        this.currentGeo.Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
        //頂点を作りながら、Skin用構造も作成してしまおう
        this.currentGeo.Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
        this.currentGeo.Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
        this.currentGeo.VertexSetedBoneCount.push(0);
    }

    readFace1(line) {
        // 面に属する頂点数,頂点の配列内index という形で入っている
        const data = line.trim().substr(2, line.length - 4).split(",");
        if (this.zflg) {
            this.currentGeo.Geometry.faces.push(new THREE.Face3(parseInt(data[2], 10), parseInt(data[1], 10), parseInt(data[0], 10), new THREE.Vector3(1, 1, 1).normalize()));
        } else {
            this.currentGeo.Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1], 10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));
        }
    }

    readNormalVector1(line) {
        const data = line.trim().substr(0, line.length - 2).split(";");
        this.currentGeo.normalVectors.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
        // this.currentGeo.normalVectors.push([parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])]);
    }

    readNormalFace1(line, nowReaded) {

        const data = line.trim().substr(2, line.length - 4).split(",");

        let nowID = parseInt(data[0], 10);
        const v1 = this.currentGeo.normalVectors[nowID];
        nowID = parseInt(data[1], 10);
        const v2 = this.currentGeo.normalVectors[nowID];
        nowID = parseInt(data[2], 10);
        const v3 = this.currentGeo.normalVectors[nowID];

        //研究中
        if (this.zflg) {
            this.currentGeo.Geometry.faces[nowReaded].vertexNormals = [v3, v2, v1];
        } else {
            this.currentGeo.Geometry.faces[nowReaded].vertexNormals = [v1, v2, v3];
        }

    }


    setMeshNormals() {
        let endRead = 0;
        let totalV = 0;
        let totalFace = 0;
        let mode = 0;
        let mode_local = 0
        while (true) {
            switch (mode) {
                case 0: //vertex
                    if (mode_local === 0) {
                        const refO = this.readInt1(0);
                        totalV = refO.refI;
                        endRead = refO.endRead;
                        mode_local = 1;
                    } else {
                        let find = this.currentObject.data.indexOf(',', endRead) + 1;
                        if (find === -1) {
                            find = this.currentObject.data.indexOf(';;', endRead) + 1;
                            mode = 2;
                            mode_local = 0;
                        }
                        const line = this.currentObject.data.substr(endRead, find - endRead);
                        const data = line.trim().split(";");
                        this.currentGeo.normalVectors.push([parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])]);
                        endRead = find + 1;
                    }
                    break;
            }
            if (endRead >= this.currentObject.data.length) {
                break;
            }
        }
    }

    setMeshTextureCoords() {
        this.tmpUvArray = [];
        this.currentGeo.Geometry.faceVertexUvs = [];
        this.currentGeo.Geometry.faceVertexUvs.push([]);

        let endRead = 0;
        let totalV = 0;
        let totalFace = 0;
        let mode = 0;
        let mode_local = 0
        while (true) {
            switch (mode) {
                case 0: //vertex
                    if (mode_local === 0) {
                        const refO = this.readInt1(0);
                        totalV = refO.refI;
                        endRead = refO.endRead;
                        mode_local = 1;
                    } else {
                        let find = this.currentObject.data.indexOf(',', endRead) + 1;
                        if (find === 0) {
                            find = this.currentObject.data.length;
                            mode = 2;
                            mode_local = 0;
                        }
                        const line = this.currentObject.data.substr(endRead, find - endRead);
                        const data = line.trim().split(";");
                        if (this.IsUvYReverse) {
                            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), 1 - parseFloat(data[1])));
                        } else {
                            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), parseFloat(data[1])));
                        }
                        endRead = find + 1;
                    }
                    break;
            }
            if (endRead >= this.currentObject.data.length) {
                break;
            }
        }
        //UV読み込み完了。メッシュにUVを割り当てる
        this.currentGeo.Geometry.faceVertexUvs[0] = [];
        for (var m = 0; m < this.currentGeo.Geometry.faces.length; m++) {
            this.currentGeo.Geometry.faceVertexUvs[0][m] = [];
            this.currentGeo.Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.currentGeo.Geometry.faces[m].a]);
            this.currentGeo.Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.currentGeo.Geometry.faces[m].b]);
            this.currentGeo.Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.currentGeo.Geometry.faces[m].c]);

        }
        this.currentGeo.Geometry.uvsNeedUpdate = true;
    }

    setMeshMaterialList() {
        let endRead = 0;
        let mode = 0;
        let mode_local = 0;
        let readCount = 0;
        while (true) {
            if (mode_local < 2) {
                const refO = this.readInt1(endRead);
                endRead = refO.endRead;
                mode_local++;
                readCount = 0;
            } else {
                let find = this.currentObject.data.indexOf(';', endRead);
                if (find === -1) {
                    find = this.currentObject.data.length;
                    mode = 3;
                    mode_local = 0;
                }
                const line = this.currentObject.data.substr(endRead, find - endRead);
                const data = line.trim().split(",");
                for (let i = 0; i < data.length; i++) {
                    this.currentGeo.Geometry.faces[i].materialIndex = parseInt(data[i]);
                }
                endRead = this.currentObject.data.length;
            }
            if (endRead >= this.currentObject.data.length || mode >= 3) {
                break;
            }
        }
    }

    setMaterial() {
        const nowMat = new THREE.MeshPhongMaterial({
            color: Math.random() * 0xffffff
        });

        if (this.zflg) {
            nowMat.side = THREE.BackSide;
        } else {
            nowMat.side = THREE.FrontSide;
        }
        nowMat.side = THREE.FrontSide;

        nowMat.name = this.currentObject.name;

        let endRead = 0;
        // １つめの[;;]まで＝Diffuse
        let find = this.currentObject.data.indexOf(';;', endRead);
        let line = this.currentObject.data.substr(endRead, find - endRead);
        const data = line.trim().split(";");
        nowMat.color.r = parseFloat(data[0]);
        nowMat.color.g = parseFloat(data[1]);
        nowMat.color.b = parseFloat(data[2]);

        // 次の [;]まで＝反射率
        endRead = find + 2;
        find = this.currentObject.data.indexOf(';', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        nowMat.shininess = parseFloat(line);

        // 次の[;;]まで＝反射光？
        endRead = find + 1;
        find = this.currentObject.data.indexOf(';;', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data2 = line.trim().split(";");
        nowMat.specular.r = parseFloat(data2[0]);
        nowMat.specular.g = parseFloat(data2[1]);
        nowMat.specular.b = parseFloat(data2[2]);

        // 次の [;]まで＝発光色?
        endRead = find + 2;
        find = this.currentObject.data.indexOf(';;', endRead);
        if (find === -1) {
            find = this.currentObject.data.length;
        }
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data3 = line.trim().split(";");
        nowMat.emissive.r = parseFloat(data3[0]);
        nowMat.emissive.g = parseFloat(data3[1]);
        nowMat.emissive.b = parseFloat(data3[2]);

        // 子階層処理
        let localObject = null;
        while (true) {
            if (this.currentObject.children.length > 0) {
                localObject = this.currentObject.children.shift();
                if (this.debug) {
                    console.log('processing ' + localObject.name);
                }
                const fileName = localObject.data.substr(1, localObject.data.length - 2);
               switch (localObject.type) {
                    case "TextureFilename":
                        this.texCount++;        
                        this.Texloader.load(this.baseDir + fileName,  texture => { // onLoad
                            nowMat.map = texture;
                            this.readedTexCount++;
                          });            
                        break;
                    case "BumpMapFilename":
                        this.texCount++;
                        this.Texloader.load(this.baseDir + fileName,  texture => { // onLoad
                            nowMat.bumpMap = texture;
                            this.readedTexCount++;
                          });
                        nowMat.bumpScale = 0.05;
                        break;
                    case "NormalMapFilename":
                        this.texCount++;
                        this.Texloader.load(this.baseDir + fileName,  texture => { // onLoad
                            nowMat.normalMap = texture;
                            this.readedTexCount++;
                          });  
                        nowMat.normalScale = new THREE.Vector2(2, 2);
                        break;
                    case "EmissiveMapFilename":
                        this.texCount++;
                        this.Texloader.load(this.baseDir + fileName,  texture => { // onLoad
                            nowMat.emissiveMap = texture;
                            this.readedTexCount++;
                          });  
                        break;
                    case "LightMapFilename":
                        this.texCount++;
                        this.Texloader.load(this.baseDir + fileName,  texture => { // onLoad
                            nowMat.lightMap = texture;
                            this.readedTexCount++;
                          });  
                        break;
                        
                }
            } else {
                break;
            }
        }

        this.currentGeo.Materials.push(nowMat);
    }

    setSkinWeights() {
        const boneInf = new XboneInf();

        let endRead = 0;
        // １つめの[;]まで＝name
        let find = this.currentObject.data.indexOf(';', endRead);
        let line = this.currentObject.data.substr(endRead, find - endRead);
        endRead = find + 1;

        boneInf.boneName = line.substr(1, line.length - 2);
        boneInf.BoneIndex = this.currentGeo.BoneInfs.length;

        // ボーンに属する頂点数。今はいらない
        find = this.currentObject.data.indexOf(';', endRead);
        endRead = find + 1;

        // 次の[;]まで：このボーンに属する頂点Index
        find = this.currentObject.data.indexOf(';', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data = line.trim().split(",");
        for (let i = 0; i < data.length; i++) {
            boneInf.Indeces.push(parseInt(data[i]));
        }
        endRead = find + 1;
        //  次の[;]まで：それぞれの頂点に対するweight
        find = this.currentObject.data.indexOf(';', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data2 = line.trim().split(",");
        for (let i = 0; i < data2.length; i++) {
            boneInf.Weights.push(parseFloat(data2[i]));
        }
        endRead = find + 1;
        // 次の[;] or 最後まで：ini matrix
        find = this.currentObject.data.indexOf(';', endRead);
        if (find <= 0) {
            find = this.currentObject.data.length;
        }
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data3 = line.trim().split(",");
        boneInf.initMatrix = new THREE.Matrix4();
        this.ParseMatrixData(boneInf.initMatrix, data3);

        boneInf.OffsetMatrix = new THREE.Matrix4();
        boneInf.OffsetMatrix.getInverse(boneInf.initMatrix);
        this.currentGeo.BoneInfs.push(boneInf);

    }

    MakeOutputGeometry() {

        //１つのmesh終了
        this.currentGeo.Geometry.computeBoundingBox();
        this.currentGeo.Geometry.computeBoundingSphere();

        this.currentGeo.Geometry.verticesNeedUpdate = true;
        if(!this.normalReadFlag){
            this.currentGeo.Geometry.normalsNeedUpdate = true;
        }
        this.currentGeo.Geometry.colorsNeedUpdate = true;
        this.currentGeo.Geometry.uvsNeedUpdate = true;
        this.currentGeo.Geometry.groupsNeedUpdate = true;

        //ボーンの階層構造を作成する

        let mesh = null;
        const bufferGeometry = new THREE.BufferGeometry();

        if (this.currentGeo.BoneInfs.length > 0) {
            //さらに、ウェイトとボーン情報を紐付ける
            for (let bi = 0; bi < this.currentGeo.BoneInfs.length; bi++) {
                // ズレているskinWeightのボーンと、頂点のないボーン情報とのすり合わせ
                let boneIndex = 0;
                for (let bb = 0; bb < this.currentGeo.putBones.length; bb++) {
                    if (this.currentGeo.putBones[bb].name === this.currentGeo.BoneInfs[bi].boneName) {
                        boneIndex = bb;
                        break;
                    }
                }

                //ウェイトのあるボーンであることが確定。頂点情報を割り当てる
                for (let vi = 0; vi < this.currentGeo.BoneInfs[bi].Indeces.length; vi++) {
                    //頂点へ割り当て
                    const nowVertexID = this.currentGeo.BoneInfs[bi].Indeces[vi];
                    const nowVal = this.currentGeo.BoneInfs[bi].Weights[vi];

                    switch (this.currentGeo.VertexSetedBoneCount[nowVertexID]) {
                        case 0:
                            this.currentGeo.Geometry.skinIndices[nowVertexID].x = boneIndex;
                            this.currentGeo.Geometry.skinWeights[nowVertexID].x = nowVal;
                            break;
                        case 1:
                            this.currentGeo.Geometry.skinIndices[nowVertexID].y = boneIndex;
                            this.currentGeo.Geometry.skinWeights[nowVertexID].y = nowVal;
                            break;
                        case 2:
                            this.currentGeo.Geometry.skinIndices[nowVertexID].z = boneIndex;
                            this.currentGeo.Geometry.skinWeights[nowVertexID].z = nowVal;
                            break;
                        case 3:
                            this.currentGeo.Geometry.skinIndices[nowVertexID].w = boneIndex;
                            this.currentGeo.Geometry.skinWeights[nowVertexID].w = nowVal;
                            break;
                    }
                    this.currentGeo.VertexSetedBoneCount[nowVertexID]++;
                }
            }

            for (let sk = 0; sk < this.currentGeo.Materials.length; sk++) {
                this.currentGeo.Materials[sk].skinning = true;
            }

            mesh = new THREE.SkinnedMesh(bufferGeometry.fromGeometry(this.currentGeo.Geometry), new THREE.MultiMaterial(this.currentGeo.Materials));
            const skeleton = new THREE.Skeleton(this.currentGeo.putBones);
            mesh.add(this.currentGeo.putBones[0]);
            mesh.bind(skeleton);

        } else {
            mesh = new THREE.Mesh(this.currentGeo.Geometry, new THREE.MultiMaterial(this.currentGeo.Materials));
        }

        mesh.name = this.currentGeo.name;
        this.Meshes.push(mesh);
    }


    readAnimationKey() {

        let endRead = 0;
        // １つめの[;]まで＝keyType
        let find = this.currentObject.data.indexOf(';', endRead);
        let line = this.currentObject.data.substr(endRead, find - endRead);
        endRead = find + 1;

        this.currentAnimeFrames.keyType = parseInt(line);
        // 2つめの[;]まで＝キー数。スルー
        find = this.currentObject.data.indexOf(';', endRead);
        endRead = find + 1;
        // 本番 [;;,] で1キーとなる
        line = this.currentObject.data.substr(endRead);
        const data = line.trim().split(";;,");
        for (let i = 0; i < data.length; i++) {
            //内部。さらに[;]でデータが分かれる
            const data2 = data[i].split(";");

            const keyInfo = new XKeyFrameInfo();
            keyInfo.matrix = new THREE.Matrix4();
            keyInfo.Frame = parseInt(data2[0]);

            this.ParseMatrixData(keyInfo.matrix, data2[2].split(","));

            keyInfo.index = this.currentAnimeFrames.keyFrames.length;
            keyInfo.time = keyInfo.Frame;
            this.currentAnimeFrames.keyFrames.push(keyInfo);

            /* matrixキー以外の対応が必要になったら、下を考える。
            //すでにそのキーが宣言済みでないかどうかを探す
            //要素によるキー飛ばし（回転：0&20フレーム、　移動:0&10&20フレーム　で、10フレーム時に回転キーがない等 )には対応できていない
            if (this.currentAnimeFrames.keyType != 4) {
                for (var mm = 0; mm < this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.length; mm++) {
                    if (this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames[mm].Frame === nowKeyframe) {
                        this.keyInfo = this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames[mm];
                        frameFound = true;
                        break;
                    }
                }
            }
                        switch (this.nowAnimationKeyType) {

                case 0:
                    tmpM.makeRotationFromQuaternion(new THREE.Quaternion(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2])));
                    this.keyInfo.matrix.multiply(tmpM);
                    break;
                case 1:
                    tmpM.makeScale(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2]));
                    this.keyInfo.matrix.multiply(tmpM);
                    break;
                case 2:
                    tmpM.makeTranslation(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2]));
                    this.keyInfo.matrix.multiply(tmpM);
                    break;
                    //case 3: this.keyInfo.matrix.makeScale(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])); break;
                case 4:
                    this.ParseMatrixData(this.keyInfo.matrix, data2);
                    break;
            }

            if (!frameFound) {
                this.keyInfo.index = this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.length;
                this.keyInfo.time =  this.keyInfo.Frame;
                this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.push(this.keyInfo);
            }

            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength || line.indexOf(";;;") > -1) {
                this.nowReadMode = this.XfileLoadMode.Anim_init                
            }
            */
        }

        this.currentAnime.AnimeFrames.push(this.currentAnimeFrames);
    }

    MakeOutputAnimation() {
        const animationObj = new XAnimationObj();
        animationObj.fps = this.AnimTicksPerSecond;
        animationObj.name = this.currentAnime.name;
        animationObj.make(this.currentAnime.AnimeFrames);
        this.Animations.push(animationObj);

    }

    /**
     * 
     * @param { THREE.Mesh } _model 
     * @param { XAnimationObj } _animation
     */
    assignAnimation(_model, _animation) {
        let model = _model;
        let animation = _animation;
        if (!model) {
            model = this.Meshes[0];
        }
        if (!animation) {
            animation = this.Animations[0];
        }

        const put = {};
        put.fps = animation.fps;
        put.name = animation.name;
        put.length = animation.length;
        put.hierarchy = [];
        for (let b = 0; b < model.skeleton.bones.length; b++) {
            for (let i = 0; i < animation.hierarchy.length; i++) {
                if (model.skeleton.bones[b].name === animation.hierarchy[i].name) {
                    const c_key = animation.hierarchy[i].copy();
                    c_key.parent = -1;
                    if (model.skeleton.bones[b].parent && model.skeleton.bones[b].parent.type === "Bone") {
                        for (let bb = 0; bb < put.hierarchy.length; bb++) {
                            if (put.hierarchy[bb].name === model.skeleton.bones[b].parent.name) {
                                c_key.parent = bb;
                                c_key.parentName = model.skeleton.bones[b].parent.name;
                                break;
                            }
                        }
                    }

                    put.hierarchy.push(c_key);
                    break;
                }
            }
        }
        return put;
    }


    readFinalize() {
        //一部ソフトウェアからの出力用（DirectXとOpenGLのZ座標系の違い）に、鏡面処理を行う     
        if (this.zflg) {
            for (let i = 0; i < this.Meshes.length; i++) {
                this.Meshes[i].scale.set(-1, 1, 1);
                this.Meshes[i].rotation.y = Math.PI;
            }
        }
    }

    
    returnLoop(){
        if(this.texCount <= this.readedTexCount){
            this.onLoad({
                models: this.Meshes,
                animations: this.Animations
            });        
        } else {
            setTimeout(() => {this.returnLoop()}, 100);
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

    /////////////////// old logic /////////////////


    //Xファイル解析メイン
    lineRead(line) {

        //後でちゃんと考えるさ･･
        // template が入っていたら、その行は飛ばす！飛ばさなきゃ読める形が増えるだろうけど、後回し　
        if (line.indexOf("template ") > -1) {
            return;
        }

        if (line.length === 0) {
            return;
        }

        //DirectXは[ Frame ] で中身が構成されているため、Frameのツリー構造を一度再現する。
        //その後、Three.jsのObject3D型に合わせて再構築する必要がある
        if (line.indexOf("{") > -1) {

            this.elementLv++;

        }

        //AnimTicksPerSecondは上のほうで1行で来る想定。外れたら、知らん！データを直すかフォークして勝手にやってくれ
        if (line.indexOf("AnimTicksPerSecond") > -1) {

            const findA = line.indexOf("{");
            this.loadingXdata.AnimTicksPerSecond = parseInt(line.substr(findA + 1, line.indexOf(";") - findA + 1), 10);

        }

        if (line.indexOf("}") > -1) {
            //カッコが終わった時の動作
            if (this.elementLv < 1 || this.nowFrameName === "") {
                this.elementLv = 0;
                return;
            }
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

            this.nowReadMode = this.XfileLoadMode.FrameTransformMatrix_Read;
            return;

        }

        if (this.nowReadMode === this.XfileLoadMode.FrameTransformMatrix_Read) {

            const data = line.split(",");
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix = new THREE.Matrix4();
            this.ParseMatrixData(this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix, data);
            this.nowReadMode = this.XfileLoadMode.Element;
            return;

        }

        ////////////////////////////////////////////////////////////////////
        ///Mesh ＝　面データの読み込み開始
        /*  Mesh　は、頂点数（1行または ; ）→頂点データ(;区切りでxyz要素)→面数（index要素数）→index用データ　で成り立つ
         */
        if (line.indexOf("Mesh ") > -1) {
            this.beginReadMesh(line);
            return;
        }

        //頂点数読み出し
        if (this.nowReadMode === this.XfileLoadMode.Vartex_init) {
            this.readVertexCount(line);
            return;
        }
        //頂点読み出し
        if (this.nowReadMode === this.XfileLoadMode.Vartex_Read) {

            if (this.readVertex(line)) {
                return;
            }

        }

        //Index読み出し///////////////////
        if (this.nowReadMode === this.XfileLoadMode.Index_init) {
            this.readIndexLength(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.index_Read) {

            if (this.readVertexIndex(line)) {
                return;
            }

        }

        //Normal部//////////////////////////////////////////////////
        //XFileでのNormalは、頂点毎の向き→面に属してる頂点のID　という順番で入っている。
        if (line.indexOf("MeshNormals ") > -1) {
            this.beginMeshNormal(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Normal_V_init) {
            this.readMeshNormalCount(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Normal_V_Read) {
            if (this.readMeshNormalVertex(line)) {
                return;
            }
        }

        if (this.nowReadMode === this.XfileLoadMode.Normal_I_init) {
            this.readMeshNormalIndexCount(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Normal_I_Read) {
            if (this.readMeshNormalIndex(line)) {
                return;
            }
        }
        ///////////////////////////////////////////////////////////////

        //UV///////////////////////////////////////////////////////////
        //UV宣言
        if (line.indexOf("MeshTextureCoords ") > -1) {
            this.nowReadMode = this.XfileLoadMode.Uv_init;
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Uv_init) {
            this.readUvInit(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Uv_Read) {
            //次にUVを仮の入れ物に突っ込んでいく
            if (this.readUv(line)) {
                return;
            }

        }
        ////////////////////////////////////////////////////////////

        //マテリアルのセット（面に対するマテリアルの割り当て）//////////////////////////
        if (line.indexOf("MeshMaterialList ") > -1) {

            this.nowReadMode = this.XfileLoadMode.Mat_Face_init;
            return;

        }
        if (this.nowReadMode === this.XfileLoadMode.Mat_Face_init) {
            //マテリアル数がここ？今回は特に影響ないようだが
            this.nowReadMode = this.XfileLoadMode.Mat_Face_len_Read;
            return;

        }
        if (this.nowReadMode === this.XfileLoadMode.Mat_Face_len_Read) {
            this.readMatrixSetLength(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Mat_Face_Set) {
            if (this.readMaterialBind(line)) {
                return;
            }
        }

        //マテリアル定義
        if (line.indexOf("Material ") > -1) {
            this.readMaterialInit(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Mat_Set) {
            this.readandSetMaterial(line);
            return;
        }

        if (this.nowReadMode >= this.XfileLoadMode.Mat_Set_Texture && this.nowReadMode < this.XfileLoadMode.Weit_init) {
            this.readandSetMaterialTexture(line);
            return;
        }
        /////////////////////////////////////////////////////////////////////////

        //Bone部（仮//////////////////////////////////////////////////////////////////////
        if (line.indexOf("SkinWeights ") > -1 && this.nowReadMode >= this.XfileLoadMode.Element) {
            this.readBoneInit(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Weit_init) {
            this.readBoneName(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Weit_IndexLength) {
            this.readBoneVertexLength(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Weit_Read_Index) {
            this.readandSetBoneVertex(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Weit_Read_Value) {
            this.readandSetBoneWeightValue(line);
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Weit_Read_Matrx) {
            this.readandSetBoneOffsetMatrixValue(line);
            return;
        }
        ///////////////////////////////////////////////////

        //アニメーション部
        ////////////////////////////////////////////////////////////
        //ここからは、Frame構造とは切り離して考える必要がある。
        //別ファイルに格納されている可能性も考慮しなくては…
        if (line.indexOf("AnimationSet ") > -1) {
            this.readandCreateAnimationSet(line);
            return;
        }

        if (line.indexOf("Animation ") > -1 && this.nowReadMode === this.XfileLoadMode.Anim_init) {
            this.readAndCreateAnimation(line);
            return;
        }

        if (line.indexOf("AnimationKey ") > -1) {
            this.nowReadMode = this.XfileLoadMode.Anim_KeyValueTypeRead;
            return;
        }

        if (this.nowReadMode === this.XfileLoadMode.Anim_KeyValueTypeRead) {

            this.nowAnimationKeyType = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReadMode = this.XfileLoadMode.Anim_KeyValueLength;
            return;

        }

        if (this.nowReadMode === this.XfileLoadMode.Anim_KeyValueLength) {

            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
            this.nowReadMode = this.XfileLoadMode.Anime_ReadKeyFrame;
            return;

        }
        //やっとキーフレーム読み込み
        if (this.nowReadMode === this.XfileLoadMode.Anime_ReadKeyFrame) {
            this.readAnimationKeyFrame(line);
            return;
        }
        ////////////////////////
    }


    endElement(line) {

        if (this.nowReadMode < this.XfileLoadMode.Anim_init && this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv === this.elementLv && this.nowReadMode > this.XfileLoadMode.none) {

            //１つのFrame終了
            if (this.frameHierarchie.length > 0) {
                //「子」を探して、セットする
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].children = [];
                const keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
                for (let m = 0; m < keys.length; m++) {

                    if (this.loadingXdata.FrameInfo_Raw[keys[m]].ParentName === this.nowFrameName) {

                        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].children.push(keys[m]);

                    }

                }

                this.frameHierarchie.pop();

            }

            this.MakeOutputGeometry(this.nowFrameName, this.zflg);
            this.frameStartLv = this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv;

            //読み込み中のフレームを一段階上に戻す
            if (this.frameHierarchie.length > 0) {

                this.nowFrameName = this.frameHierarchie[this.frameHierarchie.length - 1];
                this.frameStartLv = this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv;

            } else {

                this.nowFrameName = "";

            }

        }

        if (this.nowReadMode === this.XfileLoadMode.Mat_Set) {
            //子階層を探してセットする                    
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Materials.push(this.nowMat);
            this.nowReadMode = this.XfileLoadMode.Element;

        }

        this.elementLv--;

    }

    beginFrame(line) {

        this.frameStartLv = this.elementLv;
        this.nowReadMode = this.XfileLoadMode.Element;

        this.nowFrameName = line.substr(6, line.length - 8);
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName] = new XFrameInfo();
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameName = this.nowFrameName;
        //親の名前がすぐわかるので、この段階でセット
        if (this.frameHierarchie.length > 0) {

            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].ParentName = this.frameHierarchie[this.frameHierarchie.length - 1];

        }
        this.frameHierarchie.push(this.nowFrameName);
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv = this.frameStartLv;

    }

    beginReadMesh(line) {

        if (this.nowFrameName === "") {

            this.frameStartLv = this.elementLv;
            this.nowFrameName = line.substr(5, line.length - 6);
            if (this.nowFrameName === "") {
                this.nowFrameName = "mesh_" + this.loadingXdata.FrameInfo_Raw.length;
            }
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName] = new XFrameInfo();
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameName = this.nowFrameName;
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv = this.frameStartLv;

        }

        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry = new THREE.Geometry();
        this.geoStartLv = this.elementLv;
        this.nowReadMode = this.XfileLoadMode.Vartex_init;

        this.Bones = [];
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Materials = [];

    }

    readVertexCount(line) {

        this.nowReadMode = this.XfileLoadMode.Vartex_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;

    }

    readVertex(line) {
        //頂点が確定
        const data = line.substr(0, line.length - 2).split(";");
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
        //頂点を作りながら、Skin用構造も作成してしまおう
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].VertexSetedBoneCount.push(0);
        this.nowReaded++;

        if (this.nowReaded >= this.tgtLength) {

            this.nowReadMode = this.XfileLoadMode.Index_init;
            return true;

        }

        return false;

    }

    readIndexLength(line) {

        this.nowReadMode = this.XfileLoadMode.index_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;

    }

    readVertexIndex(line) {
        // 面に属する頂点数,頂点の配列内index という形で入っている
        const data = line.substr(2, line.length - 4).split(",");

        if (this.zflg) {

            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.push(new THREE.Face3(parseInt(data[2], 10), parseInt(data[1], 10), parseInt(data[0], 10), new THREE.Vector3(1, 1, 1).normalize()));

        } else {

            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1], 10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));

        }
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {

            this.nowReadMode = this.XfileLoadMode.Element;
            return true;

        }

        return false;

    }


    readMeshNormalIndexCount(line) {

        this.nowReadMode = this.XfileLoadMode.Normal_I_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;

    }

    ///////
    readUvInit(line) {

        //まず、セットされるUVの頂点数
        this.nowReadMode = this.XfileLoadMode.Uv_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
        this.tmpUvArray = [];
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0] = [];

    }

    readUv(line) {

        const data = line.split(";");
        //これは宣言された頂点の順に入っていく
        if (this.IsUvYReverse) {

            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), 1 - parseFloat(data[1])));

        } else {

            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), parseFloat(data[1])));

        }

        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            //UV読み込み完了。メッシュにUVを割り当てる
            //geometry.faceVertexUvs[ 0 ][ faceIndex ][ vertexIndex ]
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0] = [];
            for (var m = 0; m < this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.length; m++) {

                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m] = [];
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[m].a]);
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[m].b]);
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[m].c]);

            }

            this.nowReadMode = this.XfileLoadMode.Element;
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.uvsNeedUpdate = true;
            return true;

        }

        return false;

    }

    readMatrixSetLength(line) {

        this.nowReadMode = this.XfileLoadMode.Mat_Face_Set;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;

    }

    readMaterialBind(line) {

        const data = line.split(",");
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].materialIndex = parseInt(data[0]);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {

            this.nowReadMode = this.XfileLoadMode.Element;
            return true;

        }

        return false;

    }

    readMaterialInit(line) {

        this.nowReadMode = this.XfileLoadMode.Mat_Set;
        this.matReadLine = 0;
        this.nowMat = new THREE.MeshPhongMaterial({
            color: Math.random() * 0xffffff
        });
        let matName = line.substr(9, line.length - 10);
        if (matName !== "") {
            this.nowMat.name = matName;
        }

        if (this.zflg) {

            this.nowMat.side = THREE.BackSide;

        } else {

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

            this.nowReadMode = this.XfileLoadMode.Mat_Set_Texture;

        } else if (line.indexOf("BumpMapFilename") > -1) {

            this.nowReadMode = this.XfileLoadMode.Mat_Set_BumpTex;
            this.nowMat.bumpScale = 0.05;

        } else if (line.indexOf("NormalMapFilename") > -1) {

            this.nowReadMode = this.XfileLoadMode.Mat_Set_NormalTex;
            this.nowMat.normalScale = new THREE.Vector2(2, 2);

        } else if (line.indexOf("EmissiveMapFilename") > -1) {

            this.nowReadMode = this.XfileLoadMode.Mat_Set_EmissiveTex;

        } else if (line.indexOf("LightMapFilename") > -1) {

            this.nowReadMode = this.XfileLoadMode.Mat_Set_LightTex;

        }

    }

    //テクスチャのセット 
    readandSetMaterialTexture(line) {

        const data = line.substr(1, line.length - 3);

        if (data != undefined && data.length > 0) {

            switch (this.nowReadMode) {

                case this.XfileLoadMode.Mat_Set_Texture:
                    this.nowMat.map = this.Texloader.load(this.baseDir + data);
                    break;
                case this.XfileLoadMode.Mat_Set_BumpTex:
                    this.nowMat.bumpMap = this.Texloader.load(this.baseDir + data);
                    break;
                case this.XfileLoadMode.Mat_Set_NormalTex:
                    this.nowMat.normalMap = this.Texloader.load(this.baseDir + data);
                    break;
                case this.XfileLoadMode.Mat_Set_EmissiveTex:
                    this.nowMat.emissiveMap = this.Texloader.load(this.baseDir + data);
                    break;
                case this.XfileLoadMode.Mat_Set_LightTex:
                    this.nowMat.lightMap = this.Texloader.load(this.baseDir + data);
                    break;
                case this.XfileLoadMode.Mat_Set_EnvTex:
                    this.nowMat.envMap = this.Texloader.load(this.baseDir + data);
                    break;
            }

        }

        this.nowReadMode = this.XfileLoadMode.Mat_Set;
        this.endLineCount++; //}しかないつぎの行をとばす。改行のない詰まったデータが来たらどうしようね
        this.elementLv--;

    }
    ////////////////////////////////////////////////
    readBoneInit(line) {

        this.nowReadMode = this.XfileLoadMode.Weit_init;
        this.BoneInf = new XboneInf();

    }

    readBoneName(line) {
        //ボーン名称
        this.nowReadMode = this.XfileLoadMode.Weit_IndexLength;
        this.BoneInf.boneName = line.substr(1, line.length - 3);
        this.BoneInf.BoneIndex = this.loadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.length;
        this.nowReaded = 0;

    }

    readBoneVertexLength(line) {
        //ボーンに属する頂点数
        this.nowReadMode = this.XfileLoadMode.Weit_Read_Index;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;

    }
    readandSetBoneVertex(line) {
        //ボーンに属する頂点を割り当て
        this.BoneInf.Indeces.push(parseInt(line.substr(0, line.length - 1), 10));
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {

            this.nowReadMode = this.XfileLoadMode.Weit_Read_Value;
            this.nowReaded = 0;

        }

    }

    readandSetBoneWeightValue(line) {
        //頂点にウェイトを割り当て
        const nowVal = parseFloat(line.substr(0, line.length - 1));
        this.BoneInf.Weights.push(nowVal);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {

            this.nowReadMode = this.XfileLoadMode.Weit_Read_Matrx;

        }

    }

    readandSetBoneOffsetMatrixValue(line) {
        //ボーンの初期Matrix
        const data = line.split(",");
        this.BoneInf.initMatrix = new THREE.Matrix4();
        this.ParseMatrixData(this.BoneInf.initMatrix, data);

        this.BoneInf.OffsetMatrix = new THREE.Matrix4();
        this.BoneInf.OffsetMatrix.getInverse(this.BoneInf.initMatrix);
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.push(this.BoneInf);
        this.nowReadMode = this.XfileLoadMode.Element;

    }
    //////////////
    readandCreateAnimationSet(line) {

        this.frameStartLv = this.elementLv;
        this.nowReadMode = this.XfileLoadMode.Anim_init;

        this.nowAnimationSetName = line.substr(13, line.length - 14).trim(); //13ってのは　AnimationSet  の文字数。 14は AnimationSet に末尾の  { を加えて、14
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName] = [];

    }

    readAndCreateAnimation(line) {
        //アニメーション構造開始。
        this.nowFrameName = line.substr(10, line.length - 11).trim(); //10ってのは　Animations  の文字数。 11は Animations に末尾の  { を加えて、11
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName] = new XAnimationInfo();
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].animeName = this.nowFrameName;
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].FrameStartLv = this.frameStartLv;
        //ここは悪いコード。
        //次に来る「影響を受けるボーン」は、{  }  が１行で来るという想定･･･かつ、１つしかないという想定。
        //想定からずれるものがあったらカスタマイズしてくれ･･そのためのオープンソースだ。
        while (true) {

            this.endLineCount++;
            line = this.lines[this.endLineCount].trim();
            if (line.indexOf("{") > -1 && line.indexOf("}") > -1) {

                this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].boneName = line.replace(/{/g, "").replace(/}/g, "").trim();
                break;

            }

        }

    }

    readAnimationKeyFrame(line) {

        this.keyInfo = null;
        const data = line.split(";");

        const nowKeyframe = parseInt(data[0], 10);
        let frameFound = false;

        const tmpM = new THREE.Matrix4();
        //すでにそのキーが宣言済みでないかどうかを探す
        //要素によるキー飛ばし（回転：0&20フレーム、　移動:0&10&20フレーム　で、10フレーム時に回転キーがない等 )には対応できていない
        if (this.nowAnimationKeyType != 4) {

            for (var mm = 0; mm < this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.length; mm++) {

                if (this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames[mm].Frame === nowKeyframe) {

                    this.keyInfo = this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames[mm];
                    frameFound = true;
                    break;

                }

            }

        }

        if (!frameFound) {

            this.keyInfo = new XKeyFrameInfo();
            this.keyInfo.matrix = new THREE.Matrix4();
            this.keyInfo.Frame = nowKeyframe;

        }

        const data2 = data[2].split(",");
        switch (this.nowAnimationKeyType) {

            case 0:
                tmpM.makeRotationFromQuaternion(new THREE.Quaternion(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2])));
                this.keyInfo.matrix.multiply(tmpM);
                break;
            case 1:
                tmpM.makeScale(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2]));
                this.keyInfo.matrix.multiply(tmpM);
                break;
            case 2:
                tmpM.makeTranslation(parseFloat(data2[0]), parseFloat(data2[1]), parseFloat(data2[2]));
                this.keyInfo.matrix.multiply(tmpM);
                break;
                //case 3: this.keyInfo.matrix.makeScale(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])); break;
            case 4:
                this.ParseMatrixData(this.keyInfo.matrix, data2);
                break;

        }

        if (!frameFound) {

            this.keyInfo.index = this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.length;
            this.keyInfo.time = /*1.0 / this.loadingXdata.AnimTicksPerSecond * */ this.keyInfo.Frame;
            this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.push(this.keyInfo);

        }

        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";;;") > -1) {

            this.nowReadMode = this.XfileLoadMode.Anim_init

        }

    }
    ////////////////////////

    _readFinalize() {
        //アニメーション情報、ボーン構造などを再構築
        this.loadingXdata.FrameInfo = [];
        const keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
        for (let i = 0; i < keys.length; i++) {

            if (this.loadingXdata.FrameInfo_Raw[keys[i]].Mesh != null) {

                this.loadingXdata.FrameInfo.push(this.loadingXdata.FrameInfo_Raw[keys[i]].Mesh);

            }

        }

        //一部ソフトウェアからの出力用（DirectXとOpenGLのZ座標系の違い）に、鏡面処理を行う
        if (this.loadingXdata.FrameInfo != null & this.loadingXdata.FrameInfo.length > 0) {

            for (let i = 0; i < this.loadingXdata.FrameInfo.length; i++) {

                if (this.loadingXdata.FrameInfo[i].parent == null) {

                    this.loadingXdata.FrameInfo[i].zflag = this.zflg;
                    if (this.zflg) {

                        this.loadingXdata.FrameInfo[i].scale.set(-1, 1, 1);

                    }

                }

            }

        }

    }


    //最終的に出力されるTHREE.js型のメッシュ（Mesh)を確定する
    _MakeOutputGeometry(nowFrameName, _zflg) {

        if (this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry != null) {

            //１つのmesh終了
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingBox();
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingSphere();

            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.verticesNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.normalsNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.colorsNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.uvsNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.groupsNeedUpdate = true;

            //ボーンの階層構造を作成する
            //BoneはFrame階層基準で作成、その後にWeit割り当てのボーン配列を再セットする

            const putBones = [];
            const BoneDics = [];
            let rootBone = new THREE.Bone();
            if (this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs != null && this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length) {

                const keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
                const BoneDics_Name = [];
                for (let m = 0; m < keys.length; m++) {

                    if (this.loadingXdata.FrameInfo_Raw[keys[m]].FrameStartLv <= this.loadingXdata.FrameInfo_Raw[nowFrameName].FrameStartLv && nowFrameName != keys[m]) {
                        continue;
                    }

                    const b = new THREE.Bone();
                    b.name = keys[m];
                    b.applyMatrix(this.loadingXdata.FrameInfo_Raw[keys[m]].FrameTransformMatrix);
                    b.matrixWorld = b.matrix;
                    b.FrameTransformMatrix = this.loadingXdata.FrameInfo_Raw[keys[m]].FrameTransformMatrix;
                    BoneDics_Name[b.name] = putBones.length;
                    putBones.push(b);

                }


                //今度はボーンの親子構造を作成するために、再度ループさせる
                for (let m = 0; m < putBones.length; m++) {

                    for (let dx = 0; dx < this.loadingXdata.FrameInfo_Raw[putBones[m].name].children.length; dx++) {

                        const nowBoneIndex = BoneDics_Name[this.loadingXdata.FrameInfo_Raw[putBones[m].name].children[dx]];
                        if (putBones[nowBoneIndex] != null) {

                            putBones[m].add(putBones[nowBoneIndex]);
                        }

                    }

                }

            }

            let mesh = null;
            const bufferGeometry = new THREE.BufferGeometry();

            if (putBones.length > 0) {

                if (this.loadingXdata.FrameInfo_Raw[putBones[0].name].children.length === 0 && nowFrameName != putBones[0].name) {

                    putBones[0].add(putBones[1]);
                    putBones[0].zflag = _zflg;

                }

                //さらに、ウェイトとボーン情報を紐付ける
                for (let m = 0; m < putBones.length; m++) {

                    if (putBones[m].parent === null) {

                        putBones[m].zflag = _zflg;

                    }

                    for (let bi = 0; bi < this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length; bi++) {

                        if (putBones[m].name === this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].boneName) {
                            //ウェイトのあるボーンであることが確定。頂点情報を割り当てる
                            for (let vi = 0; vi < this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces.length; vi++) {
                                //頂点へ割り当て
                                const nowVertexID = this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces[vi];
                                const nowVal = this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Weights[vi];

                                switch (this.loadingXdata.FrameInfo_Raw[nowFrameName].VertexSetedBoneCount[nowVertexID]) {
                                    case 0:
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].x = m;
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].x = nowVal;
                                        break;
                                    case 1:
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].y = m;
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].y = nowVal;
                                        break;
                                    case 2:
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].z = m;
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].z = nowVal;
                                        break;
                                    case 3:
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].w = m;
                                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].w = nowVal;
                                        break;
                                }

                                this.loadingXdata.FrameInfo_Raw[nowFrameName].VertexSetedBoneCount[nowVertexID]++;

                            }

                        }

                    }

                }


                for (let sk = 0; sk < this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials.length; sk++) {

                    this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials[sk].skinning = true;

                }

                mesh = new THREE.SkinnedMesh(bufferGeometry.fromGeometry(this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry), new THREE.MultiMaterial(this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials));
                const skeleton = new THREE.Skeleton(putBones);
                mesh.add(putBones[0]);
                mesh.bind(skeleton);

            } else {

                mesh = new THREE.Mesh(bufferGeometry.fromGeometry(this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry), new THREE.MultiMaterial(this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials));

            }

            mesh.name = nowFrameName;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Mesh = mesh;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry = null;

        }

    }

    //ガチ最終・アニメーションを独自形式→Three.jsの標準に変換する
    _animationFinalize() {

        this.animeKeyNames = Object.keys(this.loadingXdata.AnimationSetInfo);
        if (this.animeKeyNames != null && this.animeKeyNames.length > 0) {

            this.nowReaded = 0;
            this.loadingXdata.XAnimationObj = [];
            this.animationFinalize_step();

        } else {

            this.finalproc();

        }

    }


    _animationFinalize_step() {

        const i = this.nowReaded;
        const keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
        //アニメーションセットと関連付けられている「はず」のモデルを探す。
        let tgtModel = null;
        for (let m = 0; m < this.loadingXdata.FrameInfo.length; m++) {

            const keys2 = Object.keys(this.loadingXdata.AnimationSetInfo[this.animeKeyNames[i]]);
            if (this.loadingXdata.AnimationSetInfo[this.animeKeyNames[i]][keys2[0]].boneName == this.loadingXdata.FrameInfo[m].name) {

                tgtModel = this.loadingXdata.FrameInfo[m];

            }

        }
        if (tgtModel != null) {

            this.loadingXdata.XAnimationObj[i] = new XAnimationObj();
            this.loadingXdata.XAnimationObj[i].fps = this.loadingXdata.AnimTicksPerSecond;
            this.loadingXdata.XAnimationObj[i].name = this.animeKeyNames[i];
            this.loadingXdata.XAnimationObj[i].make(this.loadingXdata.AnimationSetInfo[this.animeKeyNames[i]], tgtModel);

            // tgtModel.geometry.animations = THREE.AnimationClip.parseAnimation(this.loadingXdata.XAnimationObj[i],tgtModel.skeleton.bones);            
        }

        this.nowReaded++;
        if (this.nowReaded >= this.animeKeyNames.length) {

            this.loadingXdata.AnimationSetInfo = null;
            this.finalproc();

        } else {

            this.animationFinalize_step();

        }

    }

    _finalproc() {

        setTimeout(() => {
            this.onLoad({
                models: this.Meshes,
                animations: this.Animations
            })
        }, 1);

    }

};

// export { XLoader };