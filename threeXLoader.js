(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('os')) :
	typeof define === 'function' && define.amd ? define(['os'], factory) :
	(global.THREE = global.THREE || {}, global.THREE.XLoader = factory(global.os));
}(this, (function (os) { 'use strict';

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
        this.keyType = 4;
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
    make(XAnimationInfoArray) {
        for(let i =0; i < XAnimationInfoArray.length;i++){
            this.hierarchy.push(this.makeBonekeys(XAnimationInfoArray[i]));
        }
        this.length = this.hierarchy[0].keys[this.hierarchy[0].keys.length -1].time;
    }
    clone(){
       return Object.assign({}, this);
    }
    _make(XAnimationInfoArray, mesh) {
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
        refObj.name = XAnimationInfo.boneName;
        refObj.parent = "";
        refObj.keys = this.keyFrameRefactor(XAnimationInfo);
        refObj.copy = function(){return Object.assign({}, this);};
        return refObj;
    }
    keyFrameRefactor(XAnimationInfo) {
        const keys = [];
        for (let i = 0; i < XAnimationInfo.keyFrames.length; i++) {
            const keyframe = {};
            keyframe.time = XAnimationInfo.keyFrames[i].time * this.fps;
            if(XAnimationInfo.keyFrames[i].pos){
                keyframe.pos = XAnimationInfo.keyFrames[i].pos;
            }
            if(XAnimationInfo.keyFrames[i].rot){
                keyframe.rot = XAnimationInfo.keyFrames[i].rot;
            }
            if(XAnimationInfo.keyFrames[i].scl){
                keyframe.scl = XAnimationInfo.keyFrames[i].scl;
            }
            if(XAnimationInfo.keyFrames[i].matrix){
                keyframe.matrix = XAnimationInfo.keyFrames[i].matrix;
                keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
                keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
                keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
            }
            keys.push(keyframe);
        }
        return keys;
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
        this.debug = true;
        this.manager = (manager !== undefined) ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = (Texloader !== undefined) ? Texloader : new THREE.TextureLoader();
        this.zflg = (_zflg === undefined) ? false : _zflg;
        this.url = "";
        this.baseDir = "";
        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;
        this.tmpUvArray = [];
        this.facesNormal = [];
        this.nowFrameName = "";
        this.nowAnimationSetName = "";
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
    readLine(line) {
        let readed = 0;
        while (true) {
            let find = -1;
            find = line.indexOf('//', readed);
            if (find === -1) {
                find = line.indexOf('#', readed);
            }
            if (find > -1 && find < 2) {
                let foundNewLine = -1;
                foundNewLine = line.indexOf("\r\n", readed);
                if (foundNewLine > 0) {
                    readed = foundNewLine + 2;
                } else {
                    foundNewLine = line.indexOf("\r", readed);
                    if (foundNewLine > 0) {
                        readed = foundNewLine + 1;
                    } else {
                        readed = line.indexOf("\n", readed) + 1;
                    }
                }
            } else {
                break;
            }
        }
        return line.substr(readed);
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
        this.HierarchieParse(this.Hierarchies, endRead);
        this.changeRoot();
        this.currentObject = this.Hierarchies.children.shift();
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
                const nameData = this.readLine(this.data.substr(endRead, find1 - endRead - 1)).trim();
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
                        endRead = findEnd + 1;
                    } else {
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
        if (this.currentObject.parent || this.currentObject.children.length > 0 || !this.currentObject.worked) {
            if (timeoutFlag) {
                setTimeout(() => {
                    console.log(' == break === ');
                    this.mainloop();
                }, 1);
            } else {
                this.mainloop();
            }
        } else {
            this.readFinalize();
            setTimeout(() => {
                this.onLoad({
                    models: this.Meshes,
                    animations: this.Animations
                });
            }, 1);
        }
    }
    mainProc() {
        let ref_timeout = false;
        while (true) {
            if (!this.currentObject.worked) {
                switch (this.currentObject.type) {
                    case "template":
                        break;
                    case "AnimTicksPerSecond":
                        this.AnimTicksPerSecond = parseInt(this.currentObject.data);
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
                        this.currentGeo.parentName = this.getParentName(this.currentObject).trim();
                        this.currentGeo.VertexSetedBoneCount = [];
                        this.currentGeo.Geometry = new THREE.Geometry();
                        this.currentGeo.Materials = [];
                        this.currentGeo.normalVectors = [];
                        this.currentGeo.BoneInfs = [];
                        this.currentGeo.baseFrame = this.currentFrame;
                        this.makeBoneFromCurrentFrame();
                        this.readVertexDatas();
                        ref_timeout = true;
                        break;
                    case "MeshNormals":
                        this.readVertexDatas();
                        break;
                    case "MeshTextureCoords":
                        this.setMeshTextureCoords();
                        break;
                    case "VertexDuplicationIndices":
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
                        if (this.currentAnimeFrames) {
                            this.currentAnime.AnimeFrames.push(this.currentAnimeFrames);
                        }
                        this.currentAnimeFrames = new XAnimationInfo();
                        this.currentAnimeFrames.boneName = this.currentObject.data.trim();
                        break;
                    case "AnimationKey":
                        this.readAnimationKey();
                        ref_timeout = true;
                        break;
                }
                this.currentObject.worked = true;
            }
            if (this.currentObject.children.length > 0) {
                this.currentObject = this.currentObject.children.shift();
                if (this.debug) {
                    console.log('processing ' + this.currentObject.name);
                }
                break;
            } else {
                if (this.currentObject.worked) {
                    if (this.currentObject.parent && !this.currentObject.parent.parent) {
                        this.changeRoot();
                    }
                }
                if (this.currentObject.parent) {
                    this.currentObject = this.currentObject.parent;
                } else {
                    ref_timeout = true;
                }
                break;
            }
        }
        return ref_timeout;
    }
    changeRoot() {
        if (this.currentGeo != null && this.currentGeo.name) {
            this.MakeOutputGeometry();
        }
        this.currentGeo = {};
        if (this.currentAnime != null && this.currentAnime.name) {
            if (this.currentAnimeFrames) {
                this.currentAnime.AnimeFrames.push(this.currentAnimeFrames);
                this.currentAnimeFrames = null;
            }
            this.MakeOutputAnimation();
        }
        this.currentAnime = {};
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
        this.currentFrame.FrameTransformMatrix = new THREE.Matrix4();
        const data = this.currentObject.data.split(",");
        this.ParseMatrixData(this.currentFrame.FrameTransformMatrix, data);
        this.makeBoneFromCurrentFrame();
    }
    makeBoneFromCurrentFrame() {
        const b = new THREE.Bone();
        b.name = this.currentFrame.name;
        b.applyMatrix(this.currentFrame.FrameTransformMatrix);
        b.matrixWorld = b.matrix;
        b.FrameTransformMatrix = this.currentFrame.FrameTransformMatrix;
        this.currentFrame.putBone = b;
        if (this.currentFrame.parentName) {
            for (var frame in this.HieStack) {
                if (this.HieStack[frame].name === this.currentFrame.parentName) {
                    this.HieStack[frame].putBone.add(this.currentFrame.putBone);
                }
            }
        }
    }
    readVertexDatas() {
        let endRead = 0;
        let mode = 0;
        let mode_local = 0;
        let maxLength = 0;
        let nowReadedLine = 0;
        while (true) {
            let changeMode = false;
            if (mode_local === 0) {
                const refO = this.readInt1(endRead);
                endRead = refO.endRead;
                mode_local = 1;
                nowReadedLine = 0;
                maxLength = this.currentObject.data.indexOf(';;', endRead) + 1;
                if (maxLength <= 0) {
                    maxLength = this.currentObject.data.length;
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
        const data = this.readLine(line.trim()).substr(0, line.length - 2).split(";");
        this.currentGeo.Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
        this.currentGeo.Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
        this.currentGeo.Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
        this.currentGeo.VertexSetedBoneCount.push(0);
    }
    readFace1(line) {
        const data = this.readLine(line.trim()).substr(2, line.length - 4).split(",");
        if (this.zflg) {
            this.currentGeo.Geometry.faces.push(new THREE.Face3(parseInt(data[2], 10), parseInt(data[1], 10), parseInt(data[0], 10), new THREE.Vector3(1, 1, 1).normalize()));
        } else {
            this.currentGeo.Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1], 10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));
        }
    }
    readNormalVector1(line) {
        const data = this.readLine(line.trim()).substr(0, line.length - 2).split(";");
        this.currentGeo.normalVectors.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
    }
    readNormalFace1(line, nowReaded) {
        const data = this.readLine(line.trim()).substr(2, line.length - 4).split(",");
        let nowID = parseInt(data[0], 10);
        const v1 = this.currentGeo.normalVectors[nowID];
        nowID = parseInt(data[1], 10);
        const v2 = this.currentGeo.normalVectors[nowID];
        nowID = parseInt(data[2], 10);
        const v3 = this.currentGeo.normalVectors[nowID];
        if (this.zflg) {
            this.currentGeo.Geometry.faces[nowReaded].vertexNormals = [v3, v2, v1];
        } else {
            this.currentGeo.Geometry.faces[nowReaded].vertexNormals = [v1, v2, v3];
        }
    }
    setMeshNormals() {
        let endRead = 0;
        let mode = 0;
        let mode_local = 0;
        while (true) {
            switch (mode) {
                case 0:
                    if (mode_local === 0) {
                        const refO = this.readInt1(0);
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
                        const data = this.readLine(line.trim()).split(";");
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
        let mode = 0;
        let mode_local = 0;
        while (true) {
            switch (mode) {
                case 0:
                    if (mode_local === 0) {
                        const refO = this.readInt1(0);
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
                        const data = this.readLine(line.trim()).split(";");
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
        while (true) {
            if (mode_local < 2) {
                const refO = this.readInt1(endRead);
                endRead = refO.endRead;
                mode_local++;
                
            } else {
                let find = this.currentObject.data.indexOf(';', endRead);
                if (find === -1) {
                    find = this.currentObject.data.length;
                    mode = 3;
                    mode_local = 0;
                }
                const line = this.currentObject.data.substr(endRead, find - endRead);
                const data = this.readLine(line.trim()).split(",");
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
        let find = this.currentObject.data.indexOf(';;', endRead);
        let line = this.currentObject.data.substr(endRead, find - endRead);
        const data = this.readLine(line.trim()).split(";");
        nowMat.color.r = parseFloat(data[0]);
        nowMat.color.g = parseFloat(data[1]);
        nowMat.color.b = parseFloat(data[2]);
        endRead = find + 2;
        find = this.currentObject.data.indexOf(';', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        nowMat.shininess = parseFloat(this.readLine(line));
        endRead = find + 1;
        find = this.currentObject.data.indexOf(';;', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data2 = this.readLine(line.trim()).split(";");
        nowMat.specular.r = parseFloat(data2[0]);
        nowMat.specular.g = parseFloat(data2[1]);
        nowMat.specular.b = parseFloat(data2[2]);
        endRead = find + 2;
        find = this.currentObject.data.indexOf(';;', endRead);
        if (find === -1) {
            find = this.currentObject.data.length;
        }
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data3 = this.readLine(line.trim()).split(";");
        nowMat.emissive.r = parseFloat(data3[0]);
        nowMat.emissive.g = parseFloat(data3[1]);
        nowMat.emissive.b = parseFloat(data3[2]);
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
                        nowMat.map = this.Texloader.load(this.baseDir + fileName);
                        break;
                    case "BumpMapFilename":
                        nowMat.bumpMap = this.Texloader.load(this.baseDir + fileName);
                        nowMat.bumpScale = 0.05;
                        break;
                    case "NormalMapFilename":
                        nowMat.normalMap = this.Texloader.load(this.baseDir + fileName);
                        nowMat.normalScale = new THREE.Vector2(2, 2);
                        break;
                    case "EmissiveMapFilename":
                        nowMat.emissiveMap = this.Texloader.load(this.baseDir + fileName);
                        break;
                    case "LightMapFilename":
                        nowMat.lightMap = this.Texloader.load(this.baseDir + fileName);
                        break;
                    case "LightMapFilename":
                        nowMat.lightMap = this.Texloader.load(this.baseDir + fileName);
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
        let find = this.currentObject.data.indexOf(';', endRead);
        let line = this.currentObject.data.substr(endRead, find - endRead);
        endRead = find + 1;
        boneInf.boneName = line.substr(1, line.length - 2);
        boneInf.BoneIndex = this.currentGeo.BoneInfs.length;
        find = this.currentObject.data.indexOf(';', endRead);
        endRead = find + 1;
        find = this.currentObject.data.indexOf(';', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data = this.readLine(line.trim()).split(",");
        for (let i = 0; i < data.length; i++) {
            boneInf.Indeces.push(parseInt(data[i]));
        }
        endRead = find + 1;
        find = this.currentObject.data.indexOf(';', endRead);
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data2 = this.readLine(line.trim()).split(",");
        for (let i = 0; i < data2.length; i++) {
            boneInf.Weights.push(parseFloat(data2[i]));
        }
        endRead = find + 1;
        find = this.currentObject.data.indexOf(';', endRead);
        if (find <= 0) {
            find = this.currentObject.data.length;
        }
        line = this.currentObject.data.substr(endRead, find - endRead);
        const data3 = this.readLine(line.trim()).split(",");
        boneInf.OffsetMatrix = new THREE.Matrix4();
        this.ParseMatrixData(boneInf.OffsetMatrix, data3);
        this.currentGeo.BoneInfs.push(boneInf);
    }
    _makePutBoneList(startBone, ref) {
        for (let i = 0; i < ref.length; i++) {
            if (ref[i].name === startBone) {
                return;
            }
        }
        for (var frame in this.HieStack) {
            if (this.HieStack[frame].name === startBone) {
                const b = new THREE.Bone();
                b.name = startBone;
                b.applyMatrix(this.HieStack[frame].FrameTransformMatrix);
                b.matrixWorld = b.matrix;
                b.FrameTransformMatrix = this.HieStack[frame].FrameTransformMatrix;
                ref.push(b);
                if (this.HieStack[frame].putBone.children && this.HieStack[frame].putBone.children.length > 0) {
                    for (let i = 0; i < this.HieStack[frame].putBone.children.length; i++) {
                        this.makePutBoneList(this.HieStack[frame].putBone.children[i].name, ref);
                        for (let m = 0; m < ref.length; m++) {
                            if (ref[m].name === this.HieStack[frame].putBone.children[i].name) {
                                b.add(ref[m]);
                            }
                        }
                    }
                }
                break;
            }
        }
    }
    makePutBoneList(_RootName, _bones) {
        let putting = false;
        for (var frame in this.HieStack) {
            if (this.HieStack[frame].name === _RootName || putting) {
                putting = true;
                const b = new THREE.Bone();
                b.name = this.HieStack[frame].name;
                b.applyMatrix(this.HieStack[frame].FrameTransformMatrix);
                b.matrixWorld = b.matrix;
                b.FrameTransformMatrix = this.HieStack[frame].FrameTransformMatrix;
                b.pos = new THREE.Vector3().setFromMatrixPosition(b.FrameTransformMatrix).toArray();
                b.rotq = new THREE.Quaternion().setFromRotationMatrix(b.FrameTransformMatrix).toArray();
                b.scl = new THREE.Vector3().setFromMatrixScale(b.FrameTransformMatrix).toArray();
                if (this.HieStack[frame].parentName && this.HieStack[frame].parentName.length > 0) {
                    for (let i = 0; i < _bones.length; i++) {
                        if (this.HieStack[frame].parentName === _bones[i].name) {
                            _bones[i].add(b);
                            b.parent = i;
                            break;
                        }
                    }
                }
                _bones.push(b);
            }
        }
    }
    MakeOutputGeometry() {
        this.currentGeo.Geometry.computeBoundingBox();
        this.currentGeo.Geometry.computeBoundingSphere();
        this.currentGeo.Geometry.verticesNeedUpdate = true;
        this.currentGeo.Geometry.normalsNeedUpdate = true;
        this.currentGeo.Geometry.colorsNeedUpdate = true;
        this.currentGeo.Geometry.uvsNeedUpdate = true;
        this.currentGeo.Geometry.groupsNeedUpdate = true;
        let mesh = null;
        if (this.currentGeo.BoneInfs.length > 0) {
            const putBones = [];
            this.makePutBoneList(this.currentGeo.baseFrame.parentName, putBones);
            for (let bi = 0; bi < this.currentGeo.BoneInfs.length; bi++) {
                let boneIndex = 0;
                for (let bb = 0; bb < putBones.length; bb++) {
                    if (putBones[bb].name === this.currentGeo.BoneInfs[bi].boneName) {
                        boneIndex = bb;
                        putBones[bb].OffsetMatrix = new THREE.Matrix4();
                        putBones[bb].OffsetMatrix.copy(this.currentGeo.BoneInfs[bi].OffsetMatrix);
                        break;
                    }
                }
                for (let vi = 0; vi < this.currentGeo.BoneInfs[bi].Indeces.length; vi++) {
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
                    if (this.currentGeo.VertexSetedBoneCount[nowVertexID] > 4) {
                        console.log('warn! over 4 bone weight! :' + nowVertexID);
                    }
                }
            }
            for (let sk = 0; sk < this.currentGeo.Materials.length; sk++) {
                this.currentGeo.Materials[sk].skinning = true;
            }
            const offsetList = [];
            for (let bi = 0; bi < putBones.length; bi++) {
                if (putBones[bi].OffsetMatrix) {
                    offsetList.push(putBones[bi].OffsetMatrix);
                } else {
                    offsetList.push(new THREE.Matrix4());
                }
            }
            const bufferGeometry = new THREE.BufferGeometry().fromGeometry(this.currentGeo.Geometry);
            bufferGeometry.bones = putBones;
            mesh = new THREE.SkinnedMesh(bufferGeometry, new THREE.MultiMaterial(this.currentGeo.Materials));
            mesh.skeleton.boneInverses = offsetList;
        } else {
            const bufferGeometry = new THREE.BufferGeometry().fromGeometry(this.currentGeo.Geometry);
            mesh = new THREE.Mesh(bufferGeometry, new THREE.MultiMaterial(this.currentGeo.Materials));
        }
        mesh.name = this.currentGeo.name;
        const worldBaseMx = new THREE.Matrix4();
        let currentMxFrame = this.currentGeo.baseFrame.putBone;
        if (currentMxFrame.parent) {
            while (true) {
                currentMxFrame = currentMxFrame.parent;
                if (currentMxFrame) {
                    worldBaseMx.multiply(currentMxFrame.FrameTransformMatrix);
                } else {
                    break;
                }
            }
        }
        mesh.applyMatrix(worldBaseMx);
        this.Meshes.push(mesh);
    }
    readAnimationKey() {
        let endRead = 0;
        let find = this.currentObject.data.indexOf(';', endRead);
        let line = this.currentObject.data.substr(endRead, find - endRead);
        endRead = find + 1;
        let nowKeyType = parseInt(this.readLine(line));
        find = this.currentObject.data.indexOf(';', endRead);
        endRead = find + 1;
        line = this.currentObject.data.substr(endRead);
        const data = this.readLine(line.trim()).split(";;,");
        for (let i = 0; i < data.length; i++) {
            const data2 = data[i].split(";");
            let keyInfo = new XKeyFrameInfo();
            keyInfo.type = nowKeyType;
            keyInfo.Frame = parseInt(data2[0]);
            keyInfo.index = this.currentAnimeFrames.keyFrames.length;
            keyInfo.time = keyInfo.Frame;
            if (nowKeyType != 4) {
                let frameFound = false;
                for (var mm = 0; mm < this.currentAnimeFrames.keyFrames.length; mm++) {
                    if (this.currentAnimeFrames.keyFrames[mm].Frame === keyInfo.Frame) {
                        keyInfo = this.currentAnimeFrames.keyFrames[mm];
                        frameFound = true;
                        break;
                    }
                }
                const frameValue = data2[2].split(",");
                switch (nowKeyType) {
                    case 0:
                        keyInfo.rot = new THREE.Quaternion(parseFloat(frameValue[1]), parseFloat(frameValue[2]), parseFloat(frameValue[3]), parseFloat(frameValue[0]) * -1);
                        break;
                    case 1:
                        keyInfo.scl = new THREE.Vector3(parseFloat(frameValue[0]), parseFloat(frameValue[1]), parseFloat(frameValue[2]));
                        break;
                    case 2:
                        keyInfo.pos = new THREE.Vector3(parseFloat(frameValue[0]), parseFloat(frameValue[1]), parseFloat(frameValue[2]));
                        break;
                }
                if (!frameFound) {
                    this.currentAnimeFrames.keyFrames.push(keyInfo);
                }
            } else {
                keyInfo.matrix = new THREE.Matrix4();
                this.ParseMatrixData(keyInfo.matrix, data2[2].split(","));
                this.currentAnimeFrames.keyFrames.push(keyInfo);
            }
        }
    }
    MakeOutputAnimation() {
        const animationObj = new XAnimationObj();
        animationObj.fps = this.AnimTicksPerSecond;
        animationObj.name = this.currentAnime.name;
        animationObj.make(this.currentAnime.AnimeFrames);
        this.Animations.push(animationObj);
    }
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
            let findAnimation = false;
            for (let i = 0; i < animation.hierarchy.length; i++) {
                if (model.skeleton.bones[b].name === animation.hierarchy[i].name) {
                    findAnimation = true;
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
            if (!findAnimation) {
                const c_key = animation.hierarchy[0].copy();
                c_key.name = model.skeleton.bones[b].name;
                c_key.parent = -1;
                for (let k = 0; k < c_key.keys.length; k++) {
                    c_key.keys[k].pos.set(0, 0, 0);
                    c_key.keys[k].scl.set(1, 1, 1);
                    c_key.keys[k].rot.set(0, 0, 0, 1);
                }
                put.hierarchy.push(c_key);
            }
        }
        return put;
    }
    readFinalize() {
    }
    ParseMatrixData(targetMatrix, data) {
        targetMatrix.set(
            parseFloat(data[0]), parseFloat(data[4]), parseFloat(data[8]), parseFloat(data[12]),
            parseFloat(data[1]), parseFloat(data[5]), parseFloat(data[9]), parseFloat(data[13]),
            parseFloat(data[2]), parseFloat(data[6]), parseFloat(data[10]), parseFloat(data[14]),
            parseFloat(data[3]), parseFloat(data[7]), parseFloat(data[11]), parseFloat(data[15]));
    }
}

return XLoader;

})));
