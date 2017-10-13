(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.THREE = global.THREE || {}, global.THREE.XLoader = factory());
}(this, (function () { 'use strict';

class Xdata {
    constructor() {
        this.FrameInfo = [];
        this.FrameInfo_Raw = [];
        this.AnimationSetInfo = [];
        this.AnimTicksPerSecond = 60;
        this.XAnimationObj = null;
    }
}

class XboneInf {
    constructor() {
        this.boneName = "";
        this.BoneIndex = 0;
        this.Indeces = [];
        this.Weights = [];
        this.initMatrix = null;
        this.OffsetMatrix = null;
    }
}

class XAnimationInfo {
    constructor() {
        this.animeName = "";
        this.boneName = "";
        this.targetBone = null;
        this.frameStartLv = 0;
        this.keyFrames = [];
        this.InverseMx = null;
    }
}

class XAnimationObj {
    constructor() {
        this.fps = 30;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = [];
    }
    make(XAnimationInfoArray, mesh) {
        const keys = Object.keys(XAnimationInfoArray);
        const hierarchy_tmp = [];
        for (let i = 0; i < keys.length; i++) {
            let bone = null;
            let parent = -1;
            let baseIndex = -1;
            for (let m = 0; m < mesh.skeleton.bones.length; m++) {
                if (mesh.skeleton.bones[m].name == XAnimationInfoArray[keys[i]].boneName) {
                    bone = XAnimationInfoArray[keys[i]].boneName;
                    parent = mesh.skeleton.bones[m].parent.name;
                    baseIndex = m;
                    break;
                }
            }
            hierarchy_tmp[baseIndex] = this.makeBonekeys(XAnimationInfoArray[keys[i]], bone, parent);
    }
        const keys2 = Object.keys(hierarchy_tmp);
        for (let i = 0; i < keys2.length; i++) {
            this.hierarchy.push(hierarchy_tmp[i]);
            let parentId = -1;
            for (let m = 0; m < this.hierarchy.length; m++) {
                if (i != m && this.hierarchy[i].parent === this.hierarchy[m].name) {
                    parentId = m;
                    break;
                }
            }
            this.hierarchy[i].parent = parentId;
        }
    }
    makeBonekeys(XAnimationInfo, bone, parent) {
        const refObj = {};
        refObj.name = bone;
        refObj.parent = parent;
        refObj.keys = [];
        for (let i = 0; i < XAnimationInfo.keyFrames.length; i++) {
            const keyframe = {};
            keyframe.time = XAnimationInfo.keyFrames[i].time * this.fps;
            keyframe.matrix = XAnimationInfo.keyFrames[i].matrix;
            keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
            keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
            keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
            refObj.keys.push(keyframe);
        }
        return refObj;
    }
}

class XFrameInfo {
    constructor() {
        this.Mesh = null;
        this.Geometry = null;
        this.FrameName = "";
        this.ParentName = "";
        this.frameStartLv = 0;
        this.FrameTransformMatrix = null;
        this.children = [];
        this.BoneInfs = [];
        this.VertexSetedBoneCount = [];
        this.Materials = [];
    }
}

class XKeyFrameInfo {
    constructor() {
        this.index = 0;
        this.Frame = 0;
        this.time = 0.0;
        this.matrix = null;
    }
}

"use strict";
class XLoader {
    constructor(manager, Texloader, _zflg) {
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
        this.manager = (manager !== undefined) ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = (Texloader !== undefined) ? Texloader : new THREE.TextureLoader();
        this.zflg = (_zflg === undefined) ? false : _zflg;
        this.url = "";
        this.baseDir = "";
        this.nowReadMode = this.XfileLoadMode.none;
        this.nowAnimationKeyType = 4;
        this.tgtLength = 0;
        this.nowReaded = 0;
        this.elementLv = 0;
        this.geoStartLv = Number.MAX_VALUE;
        this.frameStartLv = Number.MAX_VALUE;
        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;
        this.BoneInf = new XboneInf();
        this.tmpUvArray = [];
        this.normalVectors = [];
        this.facesNormal = [];
        this.nowFrameName = "";
        this.nowAnimationSetName = "";
        this.frameHierarchie = [];
        this.Hierarchies = {};
        this.HieStack = [];
        this.currentObject = {};
        this.endLineCount = 0;
        this.geometry = null;
        this.loadingXdata = null;
        this.lines = null;
        this.keyInfo = null;
        this.animeKeyNames = null;
        this.data = null;
        this.onLoad = null;
        this.IsUvYReverse = true;
    }
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
                array_buffer[i] = buf.charCodeAt(i) & 0xff;
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
                str += String.fromCharCode(array_buffer[i]);
            }
            return str;
        } else {
            return buf;
        }
    }
    parse(data, onLoad) {
        const binData = this.ensureBinary(data);
        this.data = this.ensureString(data);
        this.onLoad = onLoad;
        return this.isBinary(binData) ?
            this.parseBinary(binData) :
            this.parseASCII();
    }
    parseBinary(data) {
        return parseASCII(String.fromCharCode.apply(null, data));
    }
    parseASCII() {
        if (this.url.lastIndexOf("/") > 0) {
            this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);
        }
        this.loadingXdata = new Xdata();
        let endRead = 16;
        this.Hierarchies.children = [];
        const refObj = this.HierarchieParse(this.Hierarchies, endRead);
        this.mainloop();
    }
    HierarchieParse(_parent, _end) {
        let endRead = _end;
        while (true) {
            const find1 = this.data.indexOf('{', endRead) + 1;
            const findEnd = this.data.indexOf('}', endRead);
            const findNext = this.data.indexOf('{', find1) + 1;
            if (find1 > -1 && findEnd > find1) {
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
                    endRead = this.data.indexOf('}', findEnd + 1) + 1;
                    currentObject.children = refs.parent.children;
                } else {
                    const DataEnder = this.data.lastIndexOf(';', findNext);
                    if (DataEnder < findNext) {
                        currentObject.data = this.data.substr(find1, DataEnder - find1).trim();
                    }
                    if (findEnd < findNext) {
                        endRead = findEnd + 1;
                    } else {
                        const nextStart = Math.max(DataEnder + 1, find1);
                        const refs = this.HierarchieParse(currentObject, nextStart);
                        endRead = refs.end;
                        currentObject.children = refs.parent.children;
                    }
                }
                _parent.children.push(currentObject);
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
        let EndFlg = false;
        if (!EndFlg) {
            setTimeout(() => {
                this.mainloop();
            }, 1);
        }
    }
    lineRead(line) {
        if (line.indexOf("template ") > -1) {
            return;
        }
        if (line.length === 0) {
            return;
        }
        if (line.indexOf("{") > -1) {
            this.elementLv++;
        }
        if (line.indexOf("AnimTicksPerSecond") > -1) {
            const findA = line.indexOf("{");
            this.loadingXdata.AnimTicksPerSecond = parseInt(line.substr(findA + 1, line.indexOf(";") - findA + 1), 10);
        }
        if (line.indexOf("}") > -1) {
            if (this.elementLv < 1 || this.nowFrameName === "") {
                this.elementLv = 0;
                return;
            }
            this.endElement();
            return;
        }
        if (line.indexOf("Frame ") > -1) {
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
        if (line.indexOf("Mesh ") > -1) {
            this.beginReadMesh(line);
            return;
        }
        if (this.nowReadMode === this.XfileLoadMode.Vartex_init) {
            this.readVertexCount(line);
            return;
        }
        if (this.nowReadMode === this.XfileLoadMode.Vartex_Read) {
            if (this.readVertex(line)) {
                return;
            }
        }
        if (this.nowReadMode === this.XfileLoadMode.Index_init) {
            this.readIndexLength(line);
            return;
        }
        if (this.nowReadMode === this.XfileLoadMode.index_Read) {
            if (this.readVertexIndex(line)) {
                return;
            }
        }
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
        if (line.indexOf("MeshTextureCoords ") > -1) {
            this.nowReadMode = this.XfileLoadMode.Uv_init;
            return;
        }
        if (this.nowReadMode === this.XfileLoadMode.Uv_init) {
            this.readUvInit(line);
            return;
        }
        if (this.nowReadMode === this.XfileLoadMode.Uv_Read) {
            if (this.readUv(line)) {
                return;
            }
        }
        if (line.indexOf("MeshMaterialList ") > -1) {
            this.nowReadMode = this.XfileLoadMode.Mat_Face_init;
            return;
        }
        if (this.nowReadMode === this.XfileLoadMode.Mat_Face_init) {
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
        if (this.nowReadMode === this.XfileLoadMode.Anime_ReadKeyFrame) {
            this.readAnimationKeyFrame(line);
            return;
        }
    }
    endElement(line) {
        if (this.nowReadMode < this.XfileLoadMode.Anim_init && this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv === this.elementLv && this.nowReadMode > this.XfileLoadMode.none) {
            if (this.frameHierarchie.length > 0) {
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
            if (this.frameHierarchie.length > 0) {
                this.nowFrameName = this.frameHierarchie[this.frameHierarchie.length - 1];
                this.frameStartLv = this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv;
            } else {
                this.nowFrameName = "";
            }
        }
        if (this.nowReadMode === this.XfileLoadMode.Mat_Set) {
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
        const data = line.substr(0, line.length - 2).split(";");
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
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
    beginMeshNormal(line) {
        this.nowReadMode = this.XfileLoadMode.Normal_V_init;
        this.normalVectors = [];
        this.facesNormal = [];
    }
    readMeshNormalCount(line) {
        this.nowReadMode = this.XfileLoadMode.Normal_V_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }
    readMeshNormalVertex(line) {
        var data = line.split(";");
        this.normalVectors.push([parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])]);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = this.XfileLoadMode.Normal_I_init;
            return true;
        }
        return false;
    }
    readMeshNormalIndexCount(line) {
        this.nowReadMode = this.XfileLoadMode.Normal_I_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }
    readMeshNormalIndex(line) {
        const data = line.substr(2, line.length - 4).split(",");
        let nowID = parseInt(data[0], 10);
        const v1 = new THREE.Vector3(this.normalVectors[nowID][0], this.normalVectors[nowID][1], this.normalVectors[nowID][2]);
        nowID = parseInt(data[1], 10);
        const v2 = new THREE.Vector3(this.normalVectors[nowID][0], this.normalVectors[nowID][1], this.normalVectors[nowID][2]);
        nowID = parseInt(data[2], 10);
        const v3 = new THREE.Vector3(this.normalVectors[nowID][0], this.normalVectors[nowID][1], this.normalVectors[nowID][2]);
        if (this.zflg) {
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v3, v2, v1];
        } else {
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v1, v2, v3];
        }
        this.facesNormal.push(v1.normalize());
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
            this.nowReadMode = this.XfileLoadMode.Element;
            return true;
        }
        return false;
    }
    readUvInit(line) {
        this.nowReadMode = this.XfileLoadMode.Uv_Read;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
        this.tmpUvArray = [];
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0] = [];
    }
    readUv(line) {
        const data = line.split(";");
        if (this.IsUvYReverse) {
            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), 1 - parseFloat(data[1])));
        } else {
            this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), parseFloat(data[1])));
        }
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength) {
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
                this.nowMat.color.r = data[0];
                this.nowMat.color.g = data[1];
                this.nowMat.color.b = data[2];
                break;
            case 2:
                this.nowMat.shininess = data[0];
                break;
            case 3:
                this.nowMat.specular.r = data[0];
                this.nowMat.specular.g = data[1];
                this.nowMat.specular.b = data[2];
                break;
            case 4:
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
        this.endLineCount++;
        this.elementLv--;
    }
    readBoneInit(line) {
        this.nowReadMode = this.XfileLoadMode.Weit_init;
        this.BoneInf = new XboneInf();
    }
    readBoneName(line) {
        this.nowReadMode = this.XfileLoadMode.Weit_IndexLength;
        this.BoneInf.boneName = line.substr(1, line.length - 3);
        this.BoneInf.BoneIndex = this.loadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.length;
        this.nowReaded = 0;
    }
    readBoneVertexLength(line) {
        this.nowReadMode = this.XfileLoadMode.Weit_Read_Index;
        this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
        this.nowReaded = 0;
    }
    readandSetBoneVertex(line) {
        this.BoneInf.Indeces.push(parseInt(line.substr(0, line.length - 1), 10));
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {
            this.nowReadMode = this.XfileLoadMode.Weit_Read_Value;
            this.nowReaded = 0;
        }
    }
    readandSetBoneWeightValue(line) {
        const nowVal = parseFloat(line.substr(0, line.length - 1));
        this.BoneInf.Weights.push(nowVal);
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {
            this.nowReadMode = this.XfileLoadMode.Weit_Read_Matrx;
        }
    }
    readandSetBoneOffsetMatrixValue(line) {
        const data = line.split(",");
        this.BoneInf.initMatrix = new THREE.Matrix4();
        this.ParseMatrixData(this.BoneInf.initMatrix, data);
        this.BoneInf.OffsetMatrix = new THREE.Matrix4();
        this.BoneInf.OffsetMatrix.getInverse(this.BoneInf.initMatrix);
        this.loadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.push(this.BoneInf);
        this.nowReadMode = this.XfileLoadMode.Element;
    }
    readandCreateAnimationSet(line) {
        this.frameStartLv = this.elementLv;
        this.nowReadMode = this.XfileLoadMode.Anim_init;
        this.nowAnimationSetName = line.substr(13, line.length - 14).trim();
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName] = [];
    }
    readAndCreateAnimation(line) {
        this.nowFrameName = line.substr(10, line.length - 11).trim();
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName] = new XAnimationInfo();
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].animeName = this.nowFrameName;
        this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].FrameStartLv = this.frameStartLv;
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
            case 4:
                this.ParseMatrixData(this.keyInfo.matrix, data2);
                break;
        }
        if (!frameFound) {
            this.keyInfo.index = this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.length;
            this.keyInfo.time =                                                   this.keyInfo.Frame;
            this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.push(this.keyInfo);
        }
        this.nowReaded++;
        if (this.nowReaded >= this.tgtLength || line.indexOf(";;;") > -1) {
            this.nowReadMode = this.XfileLoadMode.Anim_init;
        }
    }
    readFinalize() {
        this.loadingXdata.FrameInfo = [];
        const keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
        for (let i = 0; i < keys.length; i++) {
            if (this.loadingXdata.FrameInfo_Raw[keys[i]].Mesh != null) {
                this.loadingXdata.FrameInfo.push(this.loadingXdata.FrameInfo_Raw[keys[i]].Mesh);
            }
        }
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
    ParseMatrixData(targetMatrix, data) {
        targetMatrix.set(
            parseFloat(data[0]), parseFloat(data[4]), parseFloat(data[8]), parseFloat(data[12]),
            parseFloat(data[1]), parseFloat(data[5]), parseFloat(data[9]), parseFloat(data[13]),
            parseFloat(data[2]), parseFloat(data[6]), parseFloat(data[10]), parseFloat(data[14]),
            parseFloat(data[3]), parseFloat(data[7]), parseFloat(data[11]), parseFloat(data[15]));
    }
    MakeOutputGeometry(nowFrameName, _zflg) {
        if (this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry != null) {
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingBox();
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingSphere();
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.verticesNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.normalsNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.colorsNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.uvsNeedUpdate = true;
            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.groupsNeedUpdate = true;
            const putBones = [];
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
                for (let m = 0; m < putBones.length; m++) {
                    if (putBones[m].parent === null) {
                        putBones[m].zflag = _zflg;
                    }
                    for (let bi = 0; bi < this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length; bi++) {
                        if (putBones[m].name === this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].boneName) {
                            for (let vi = 0; vi < this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces.length; vi++) {
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
    animationFinalize() {
        this.animeKeyNames = Object.keys(this.loadingXdata.AnimationSetInfo);
        if (this.animeKeyNames != null && this.animeKeyNames.length > 0) {
            this.nowReaded = 0;
            this.loadingXdata.XAnimationObj = [];
            this.animationFinalize_step();
        } else {
            this.finalproc();
        }
    }
    animationFinalize_step() {
        const i = this.nowReaded;
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
        }
        this.nowReaded++;
        if (this.nowReaded >= this.animeKeyNames.length) {
            this.loadingXdata.AnimationSetInfo = null;
            this.finalproc();
        } else {
            this.animationFinalize_step();
        }
    }
    finalproc() {
        setTimeout(() => {
            this.onLoad(this.loadingXdata);
        }, 1);
    }
}

return XLoader;

})));
