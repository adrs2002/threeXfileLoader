var XfileLoadMode$1 = XfileLoadMode = {
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
    Anime_ReadKeyFrame: 1005
};

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

var XAnimationObj = function () {
    function XAnimationObj() {
        classCallCheck(this, XAnimationObj);

        this.fps = 30;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = [];
    }

    createClass(XAnimationObj, [{
        key: 'make',
        value: function make(XAnimationInfoArray, mesh) {
            var keys = Object.keys(XAnimationInfoArray);
            var hierarchy_tmp = [];
            for (var i = 0; i < keys.length; i++) {
                var bone = null;
                var parent = -1;
                var baseIndex = -1;
                for (var m = 0; m < mesh.skeleton.bones.length; m++) {
                    if (mesh.skeleton.bones[m].name == XAnimationInfoArray[keys[i]].boneName) {
                        bone = XAnimationInfoArray[keys[i]].boneName;
                        parent = mesh.skeleton.bones[m].parent.name;
                        baseIndex = m;
                        break;
                    }
                }
                hierarchy_tmp[baseIndex] = this.makeBonekeys(XAnimationInfoArray[keys[i]], bone, parent);
            }
            var keys2 = Object.keys(hierarchy_tmp);
            for (var _i = 0; _i < keys2.length; _i++) {
                this.hierarchy.push(hierarchy_tmp[_i]);
                var parentId = -1;
                for (var _m = 0; _m < this.hierarchy.length; _m++) {
                    if (_i != _m && this.hierarchy[_i].parent === this.hierarchy[_m].name) {
                        parentId = _m;
                        break;
                    }
                }
                this.hierarchy[_i].parent = parentId;
            }
        }
    }, {
        key: 'makeBonekeys',
        value: function makeBonekeys(XAnimationInfo, bone, parent) {
            var refObj = {};
            refObj.name = bone;
            refObj.parent = parent;
            refObj.keys = [];
            for (var i = 0; i < XAnimationInfo.keyFrames.length; i++) {
                var keyframe = {};
                keyframe.time = XAnimationInfo.keyFrames[i].time * this.fps;
                keyframe.matrix = XAnimationInfo.keyFrames[i].matrix;
                keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
                keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
                keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
                refObj.keys.push(keyframe);
            }
            return refObj;
        }
    }]);
    return XAnimationObj;
}();

var Xdata = function Xdata() {
    classCallCheck(this, Xdata);

    this.FrameInfo = [];
    this.FrameInfo_Raw = [];
    this.AnimationSetInfo = [];
    this.AnimTicksPerSecond = 60;
    this.XAnimationObj = null;
};

var XboneInf = function XboneInf() {
    classCallCheck(this, XboneInf);

    this.boneName = "";
    this.BoneIndex = 0;
    this.Indeces = [];
    this.Weights = [];
    this.initMatrix = null;
    this.OffsetMatrix = null;
};

var XAnimationInfo$1 = XAnimationInfo = function XAnimationInfo() {
    this.animeName = "";
    this.boneName = "";
    this.targetBone = null;
    this.frameStartLv = 0;
    this.keyFrames = [];
    this.InverseMx = null;
};

var XFrameInfo$1 = XFrameInfo = function XFrameInfo() {
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
};

var XKeyFrameInfo = function XKeyFrameInfo() {
    classCallCheck(this, XKeyFrameInfo);

    this.index = 0;
    this.Frame = 0;
    this.time = 0.0;
    this.matrix = null;
};

THREE.XLoader = function () {
    function XLoader(manager, Texloader, _zflg) {
        classCallCheck(this, XLoader);

        this.manager = manager !== undefined ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = Texloader !== undefined ? Texloader : new THREE.TextureLoader();
        this.zflg = _zflg === undefined ? false : _zflg;
        this.url = "";
        this.baseDir = "";
        this.nowReadMode = XfileLoadMode$1.none;
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
        this.endLineCount = 0;
        this.geometry = null;
        this.loadingXdata = null;
        this.lines = null;
        this.keyInfo = null;
        this.animeKeyNames = null;
        this.data = null;
        this.onLoad = null;
    }

    createClass(XLoader, [{
        key: 'load',
        value: function load(_arg, onLoad, onProgress, onError) {
            var _this = this;

            var loader = new THREE.FileLoader(this.manager);
            loader.setResponseType('arraybuffer');
            for (var i = 0; i < _arg.length; i++) {
                switch (i) {
                    case 0:
                        this.url = _arg[i];break;
                    case 1:
                        this.zflg = _arg[i];break;
                }
            }
            loader.load(this.url, function (response) {
                _this.parse(response, onLoad);
            }, onProgress, onError);
        }
    }, {
        key: 'isBinary',
        value: function isBinary(binData) {
            var reader = new DataView(binData);
            var face_size = 32 / 8 * 3 + 32 / 8 * 3 * 3 + 16 / 8;
            var n_faces = reader.getUint32(80, true);
            var expect = 80 + 32 / 8 + n_faces * face_size;
            if (expect === reader.byteLength) {
                return true;
            }
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
                    array_buffer[i] = buf.charCodeAt(i) & 0xff;
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
                    str += String.fromCharCode(array_buffer[i]);
                }
                return str;
            } else {
                return buf;
            }
        }
    }, {
        key: 'parse',
        value: function parse(data, onLoad) {
            var binData = this.ensureBinary(data);
            this.data = this.ensureString(data);
            this.onLoad = onLoad;
            return this.isBinary(binData) ? this.parseBinary(binData) : this.parseASCII();
        }
    }, {
        key: 'parseBinary',
        value: function parseBinary(data) {
            return parseASCII(String.fromCharCode.apply(null, data));
        }
    }, {
        key: 'parseASCII',
        value: function parseASCII() {
            var baseDir = "";
            if (this.url.lastIndexOf("/") > 0) {
                this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);
            }
            this.loadingXdata = new Xdata();
            this.lines = this.data;
            this.readedLength = 0;
            this.mainloop();
        }
    }, {
        key: 'mainloop',
        value: function mainloop() {
            var _this2 = this;

            var EndFlg = false;
            for (var i = 0; i < 10; i++) {
                var forceBreak = this.SectionRead();
                this.endLineCount++;
                if (this.readedLength >= this.data.length) {
                    EndFlg = true;
                    this.readFinalize();
                    setTimeout(function () {
                        _this2.animationFinalize();
                    }, 1);
                    break;
                }
                if (forceBreak) {
                    break;
                }
            }
            if (!EndFlg) {
                setTimeout(function () {
                    _this2.mainloop();
                }, 1);
            }
        }
    }, {
        key: 'getNextSection',
        value: function getNextSection(_offset, _start, _end) {
            var find = this.data.indexOf("{", _offset);
            return [this.data.substr(_offset, _start - _offset).trim(), this.data.substr(_start + 1, _end - _start - 1)];
        }
    }, {
        key: 'getNextSection2',
        value: function getNextSection2(_obj, _offset, _start, _end) {
            var find = _obj.indexOf("{", _offset);
            return [_obj.substr(_offset, _start - _offset).trim(), _obj.substr(_start + 1, _end - _start - 1)];
        }
    }, {
        key: 'readMeshSection',
        value: function readMeshSection(_data) {
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry = new THREE.Geometry();
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Materials = [];
            var find = _data.indexOf(";");
            var find_2semi = _data.indexOf(";;");
            {
                var v_data_base = _data.substr(find + 1, find_2semi - find + 2);
                var v_data = v_data_base.split(";,");
                for (var i = 0; i < v_data.length; i++) {
                    this.readVertex(v_data[i]);
                }
            }
            find = _data.indexOf(";", find_2semi + 2);
            find_2semi = _data.indexOf(";;", find);
            {
                var _v_data_base = _data.substr(find + 1, find_2semi - find + 2);
                var _v_data = _v_data_base.split(";,");
                for (var _i = 0; _i < _v_data.length; _i++) {
                    this.readVertexIndex(_v_data[_i]);
                }
            }
            find = _data.indexOf("MeshTextureCoords");
            if (find > -1) {
                var find2 = _data.indexOf("{", find + 1);
                var find3 = _data.indexOf("}", find + 1);
                var section = this.getNextSection2(_data, find, find2, find3);
                find = _data.indexOf(";", find_2semi + 2);
                find_2semi = _data.indexOf(";;", find);
            }
        }
    }, {
        key: 'readVertexLines',
        value: function readVertexLines(_data, find, find2, _readFunc) {}
    }, {
        key: 'SectionRead',
        value: function SectionRead() {
            var find = this.data.indexOf("{", this.readedLength);
            if (find === -1) {
                this.readedLength = this.data.length;return;
            }
            var line = this.data.substr(this.readedLength, find - this.readedLength);
            var find2 = this.data.indexOf("{", find + 1);
            var find3 = this.data.indexOf("}", find + 1);
            var find4 = this.data.indexOf("}", this.readedLength);
            if (find4 < find) {
                if (this.elementLv < 1 || this.nowFrameName === "") {
                    this.elementLv = 0;
                } else {
                    this.endElement();
                }
                this.readedLength = find4 + 1;
                return false;
            }
            if (find3 > find2) {
                if (line.indexOf("Frame ") > -1) {
                    this.elementLv++;
                    this.beginFrame(line);
                } else if (line.indexOf("Mesh ") > -1) {
                    var section = this.getNextSection(this.readedLength, find, find3);
                    this.readedLength = find3 + 1;
                    this.readMeshSection(section[1]);
                    this.nowReadMode = XfileLoadMode$1.Element;
                    return true;
                } else if (line.indexOf("AnimationSet ") > -1) {
                    this.readandCreateAnimationSet(line);
                } else if (line.indexOf("Animation ") > -1) {
                    this.readAndCreateAnimation(line);
                    find2 = this.data.indexOf("{", find + line.length);
                    find3 = this.data.indexOf("}", find + line.length);
                    var _section = this.getNextSection(this.readedLength + line.length, find2, find3);
                }
                this.readedLength = find + 1;
                return false;
            } else {
                var _section2 = this.getNextSection(this.readedLength, find, find3);
                this.readedLength = find3 + 1;
                if (_section2[0].indexOf("AnimTicksPerSecond") > -1) {
                    this.loadingXdata.AnimTicksPerSecond = parseInt(_section2[1].substr(0, _section2[1].indexOf(";")), 10);
                    this.elementLv = 0;
                    return false;
                } else if (_section2[0].indexOf("FrameTransformMatrix") > -1) {
                    var data = _section2[1].split(",");
                    data[15] = data[15].substr(0, data[15].indexOf(';;'));
                    this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix = new THREE.Matrix4();
                    this.ParseMatrixData(this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix, data);
                    this.nowReadMode = XfileLoadMode$1.Element;
                    return false;
                }
            }
            return false;
            if (line.indexOf("template ") > -1) {
                var _find = this.data.indexOf("}", this.readedLength + 1);
                this.readedLength = _find + 1;
                return;
            }
            this.readedLength += find + 1;
            if (line.length === 0) {
                return;
            }
            this.elementLv++;
            if (line.indexOf("AnimTicksPerSecond") > -1) {
                var findA = this.data.indexOf("}", this.readLength) - this.readLength;
                var str = this.data.substr(this.readLength, findA).trim();
                this.loadingXdata.AnimTicksPerSecond = parseInt(str.substr(0, str.indexOf(";")), 10);
                this.readedLength += findA + 1;
                this.elementLv = 0;
                return;
            }
            if (line.indexOf("}") > -1) {
                if (this.elementLv < 1 || this.nowFrameName === "") {
                    this.elementLv = 0;return;
                }
                this.endElement();
                return;
            }
            if (line.indexOf("Frame ") > -1) {
                this.beginFrame(line);
                return;
            }
            if (line.indexOf("FrameTransformMatrix") > -1) {
                this.nowReadMode = XfileLoadMode$1.FrameTransformMatrix_Read;
                return;
            }
            if (this.nowReadMode === XfileLoadMode$1.FrameTransformMatrix_Read) {
                var _data2 = line.split(",");
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix = new THREE.Matrix4();
                this.ParseMatrixData(this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameTransformMatrix, _data2);
                this.nowReadMode = XfileLoadMode$1.Element;
                return;
            }
            if (line.indexOf("Mesh ") > -1) {
                this.beginReadMesh(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Vartex_init) {
                this.readVertexCount(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Vartex_Read) {
                if (this.readVertex(line)) {
                    return;
                }
            }
            if (this.nowReadMode === XfileLoadMode$1.Index_init) {
                this.readIndexLength(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.index_Read) {
                if (this.readVertexIndex(line)) {
                    return;
                }
            }
            if (line.indexOf("MeshNormals ") > -1) {
                this.beginMeshNormal(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Normal_V_init) {
                this.readMeshNormalCount(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Normal_V_Read) {
                if (this.readMeshNormalVertex(line)) {
                    return;
                }
            }
            if (this.nowReadMode === XfileLoadMode$1.Normal_I_init) {
                this.readMeshNormalIndexCount(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Normal_I_Read) {
                if (this.readMeshNormalIndex(line)) {
                    return;
                }
            }
            if (line.indexOf("MeshTextureCoords ") > -1) {
                this.nowReadMode = XfileLoadMode$1.Uv_init;return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Uv_init) {
                this.readUvInit(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Uv_Read) {
                if (this.readUv(line)) {
                    return;
                }
            }
            if (line.indexOf("MeshMaterialList ") > -1) {
                this.nowReadMode = XfileLoadMode$1.Mat_Face_init;
                return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Mat_Face_init) {
                this.nowReadMode = XfileLoadMode$1.Mat_Face_len_Read;
                return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Mat_Face_len_Read) {
                this.readMatrixSetLength(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Mat_Face_Set) {
                if (this.readMaterialBind(line)) {
                    return;
                }
            }
            if (line.indexOf("Material ") > -1) {
                this.readMaterialInit(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Mat_Set) {
                this.readandSetMaterial(line);return;
            }
            if (this.nowReadMode >= XfileLoadMode$1.Mat_Set_Texture && this.nowReadMode < XfileLoadMode$1.Weit_init) {
                this.readandSetMaterialTexture(line);return;
            }
            if (line.indexOf("SkinWeights ") > -1 && this.nowReadMode >= XfileLoadMode$1.Element) {
                this.readBoneInit(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Weit_init) {
                this.readBoneName(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Weit_IndexLength) {
                this.readBoneVertexLength(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Weit_Read_Index) {
                this.readandSetBoneVertex(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Weit_Read_Value) {
                this.readandSetBoneWeightValue(line);return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Weit_Read_Matrx) {
                this.readandSetBoneOffsetMatrixValue(line);return;
            }
            if (line.indexOf("AnimationKey ") > -1) {
                this.nowReadMode = XfileLoadMode$1.Anim_KeyValueTypeRead;return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Anim_KeyValueTypeRead) {
                this.nowAnimationKeyType = parseInt(line.substr(0, line.length - 1), 10);
                this.nowReadMode = XfileLoadMode$1.Anim_KeyValueLength;
                return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Anim_KeyValueLength) {
                this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
                this.nowReaded = 0;
                this.nowReadMode = XfileLoadMode$1.Anime_ReadKeyFrame;
                return;
            }
            if (this.nowReadMode === XfileLoadMode$1.Anime_ReadKeyFrame) {
                this.readAnimationKeyFrame(line);return;
            }
        }
    }, {
        key: 'endElement',
        value: function endElement(line) {
            if (this.nowReadMode < XfileLoadMode$1.Anim_init && this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv === this.elementLv && this.nowReadMode > XfileLoadMode$1.none) {
                if (this.frameHierarchie.length > 0) {
                    this.loadingXdata.FrameInfo_Raw[this.nowFrameName].children = [];
                    var keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
                    for (var m = 0; m < keys.length; m++) {
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
            if (this.nowReadMode === XfileLoadMode$1.Mat_Set) {
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Materials.push(this.nowMat);
                this.nowReadMode = XfileLoadMode$1.Element;
            }
            this.elementLv--;
        }
    }, {
        key: 'beginFrame',
        value: function beginFrame(line) {
            this.frameStartLv = this.elementLv;
            this.nowReadMode = XfileLoadMode$1.Element;
            var findindex = line.indexOf("Frame ");
            this.nowFrameName = line.substr(findindex + 6, line.length - findindex + 1).trim();
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName] = new XFrameInfo$1();
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameName = this.nowFrameName;
            if (this.frameHierarchie.length > 0) {
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].ParentName = this.frameHierarchie[this.frameHierarchie.length - 1];
            }
            this.frameHierarchie.push(this.nowFrameName);
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv = this.frameStartLv;
        }
    }, {
        key: 'beginReadMesh',
        value: function beginReadMesh(line) {
            if (this.nowFrameName === "") {
                this.frameStartLv = this.elementLv;
                this.nowFrameName = line.substr(5, line.length - 6);
                if (this.nowFrameName === "") {
                    this.nowFrameName = "mesh_" + this.loadingXdata.FrameInfo_Raw.length;
                }
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName] = new XFrameInfo$1();
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameName = this.nowFrameName;
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].FrameStartLv = this.frameStartLv;
            }
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry = new THREE.Geometry();
            this.geoStartLv = this.elementLv;
            this.nowReadMode = XfileLoadMode$1.Vartex_init;
            Bones = [];
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Materials = [];
        }
    }, {
        key: 'readVertexCount',
        value: function readVertexCount(line) {
            this.nowReadMode = XfileLoadMode$1.Vartex_Read;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
        }
    }, {
        key: 'readVertex',
        value: function readVertex(line) {
            var data = line.substr(0, line.length - 2).split(";");
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].VertexSetedBoneCount.push(0);
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = XfileLoadMode$1.Index_init;
                return true;
            }
            return false;
        }
    }, {
        key: 'readIndexLength',
        value: function readIndexLength(line) {
            this.nowReadMode = XfileLoadMode$1.index_Read;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
        }
    }, {
        key: 'readVertexIndex',
        value: function readVertexIndex(line) {
            var data = line.substr(2, line.length - 4).split(",");
            if (this.zflg) {
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.push(new THREE.Face3(parseInt(data[2], 10), parseInt(data[1], 10), parseInt(data[0], 10), new THREE.Vector3(1, 1, 1).normalize()));
            } else {
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1], 10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));
            }
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = XfileLoadMode$1.Element;
                return true;
            }
            return false;
        }
    }, {
        key: 'beginMeshNormal',
        value: function beginMeshNormal(line) {
            this.nowReadMode = XfileLoadMode$1.Normal_V_init;
            this.normalVectors = [];
            this.facesNormal = [];
        }
    }, {
        key: 'readMeshNormalCount',
        value: function readMeshNormalCount(line) {
            this.nowReadMode = XfileLoadMode$1.Normal_V_Read;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
        }
    }, {
        key: 'readMeshNormalVertex',
        value: function readMeshNormalVertex(line) {
            var data = line.split(";");
            this.normalVectors.push([parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])]);
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = XfileLoadMode$1.Normal_I_init;
                return true;
            }
            return false;
        }
    }, {
        key: 'readMeshNormalIndexCount',
        value: function readMeshNormalIndexCount(line) {
            this.nowReadMode = XfileLoadMode$1.Normal_I_Read;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
        }
    }, {
        key: 'readMeshNormalIndex',
        value: function readMeshNormalIndex(line) {
            var data = line.substr(2, line.length - 4).split(",");
            var nowID = parseInt(data[0], 10);
            var v1 = new THREE.Vector3(this.normalVectors[nowID][0], this.normalVectors[nowID][1], this.normalVectors[nowID][2]);
            nowID = parseInt(data[1], 10);
            var v2 = new THREE.Vector3(this.normalVectors[nowID][0], this.normalVectors[nowID][1], this.normalVectors[nowID][2]);
            nowID = parseInt(data[2], 10);
            var v3 = new THREE.Vector3(this.normalVectors[nowID][0], this.normalVectors[nowID][1], this.normalVectors[nowID][2]);
            if (this.zflg) {
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v3, v2, v1];
            } else {
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].vertexNormals = [v1, v2, v3];
            }
            this.facesNormal.push(v1.normalize());
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = XfileLoadMode$1.Element;
                return true;
            }
            return false;
        }
    }, {
        key: 'readUvInit',
        value: function readUvInit(line) {
            this.nowReadMode = XfileLoadMode$1.Uv_Read;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
            this.tmpUvArray = [];
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faceVertexUvs[0] = [];
        }
    }, {
        key: 'readUv',
        value: function readUv(line) {
            var data = line.split(";");
            if (THREE.XLoader.IsUvYReverse) {
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
                this.nowReadMode = XfileLoadMode$1.Element;
                this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.uvsNeedUpdate = true;
                return true;
            }
            return false;
        }
    }, {
        key: 'readMatrixSetLength',
        value: function readMatrixSetLength(line) {
            this.nowReadMode = XfileLoadMode$1.Mat_Face_Set;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
        }
    }, {
        key: 'readMaterialBind',
        value: function readMaterialBind(line) {
            var data = line.split(",");
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].Geometry.faces[this.nowReaded].materialIndex = parseInt(data[0]);
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength) {
                this.nowReadMode = XfileLoadMode$1.Element;
                return true;
            }
            return false;
        }
    }, {
        key: 'readMaterialInit',
        value: function readMaterialInit(line) {
            this.nowReadMode = XfileLoadMode$1.Mat_Set;
            this.matReadLine = 0;
            this.nowMat = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
            var matName = line.substr(9, line.length - 10);
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
    }, {
        key: 'readandSetMaterial',
        value: function readandSetMaterial(line) {
            var data = line.split(";");
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
                this.nowReadMode = XfileLoadMode$1.Mat_Set_Texture;
            } else if (line.indexOf("BumpMapFilename") > -1) {
                this.nowReadMode = XfileLoadMode$1.Mat_Set_BumpTex;
                this.nowMat.bumpScale = 0.05;
            } else if (line.indexOf("NormalMapFilename") > -1) {
                this.nowReadMode = XfileLoadMode$1.Mat_Set_NormalTex;
                this.nowMat.normalScale = new THREE.Vector2(2, 2);
            } else if (line.indexOf("EmissiveMapFilename") > -1) {
                this.nowReadMode = XfileLoadMode$1.Mat_Set_EmissiveTex;
            } else if (line.indexOf("LightMapFilename") > -1) {
                this.nowReadMode = XfileLoadMode$1.Mat_Set_LightTex;
            }
        }
    }, {
        key: 'readandSetMaterialTexture',
        value: function readandSetMaterialTexture(line) {
            var data = line.substr(1, line.length - 3);
            if (data != undefined && data.length > 0) {
                switch (this.nowReadMode) {
                    case XfileLoadMode$1.Mat_Set_Texture:
                        this.nowMat.map = this.Texloader.load(this.baseDir + data);
                        break;
                    case XfileLoadMode$1.Mat_Set_BumpTex:
                        this.nowMat.bumpMap = this.Texloader.load(this.baseDir + data);
                        break;
                    case XfileLoadMode$1.Mat_Set_NormalTex:
                        this.nowMat.normalMap = this.Texloader.load(this.baseDir + data);
                        break;
                    case XfileLoadMode$1.Mat_Set_EmissiveTex:
                        this.nowMat.emissiveMap = this.Texloader.load(this.baseDir + data);
                        break;
                    case XfileLoadMode$1.Mat_Set_LightTex:
                        this.nowMat.lightMap = this.Texloader.load(this.baseDir + data);
                        break;
                    case XfileLoadMode$1.Mat_Set_EnvTex:
                        this.nowMat.envMap = this.Texloader.load(this.baseDir + data);
                        break;
                }
            }
            this.nowReadMode = XfileLoadMode$1.Mat_Set;
            this.endLineCount++;
            this.elementLv--;
        }
    }, {
        key: 'readBoneInit',
        value: function readBoneInit(line) {
            this.nowReadMode = XfileLoadMode$1.Weit_init;
            this.BoneInf = new XboneInf();
        }
    }, {
        key: 'readBoneName',
        value: function readBoneName(line) {
            this.nowReadMode = XfileLoadMode$1.Weit_IndexLength;
            this.BoneInf.boneName = line.substr(1, line.length - 3);
            this.BoneInf.BoneIndex = this.loadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.length;
            this.nowReaded = 0;
        }
    }, {
        key: 'readBoneVertexLength',
        value: function readBoneVertexLength(line) {
            this.nowReadMode = XfileLoadMode$1.Weit_Read_Index;
            this.tgtLength = parseInt(line.substr(0, line.length - 1), 10);
            this.nowReaded = 0;
        }
    }, {
        key: 'readandSetBoneVertex',
        value: function readandSetBoneVertex(line) {
            this.BoneInf.Indeces.push(parseInt(line.substr(0, line.length - 1), 10));
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {
                this.nowReadMode = XfileLoadMode$1.Weit_Read_Value;
                this.nowReaded = 0;
            }
        }
    }, {
        key: 'readandSetBoneWeightValue',
        value: function readandSetBoneWeightValue(line) {
            var nowVal = parseFloat(line.substr(0, line.length - 1));
            this.BoneInf.Weights.push(nowVal);
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength || line.indexOf(";") > -1) {
                this.nowReadMode = XfileLoadMode$1.Weit_Read_Matrx;
            }
        }
    }, {
        key: 'readandSetBoneOffsetMatrixValue',
        value: function readandSetBoneOffsetMatrixValue(line) {
            var data = line.split(",");
            this.BoneInf.initMatrix = new THREE.Matrix4();
            this.ParseMatrixData(this.BoneInf.initMatrix, data);
            this.BoneInf.OffsetMatrix = new THREE.Matrix4();
            this.BoneInf.OffsetMatrix.getInverse(this.BoneInf.initMatrix);
            this.loadingXdata.FrameInfo_Raw[this.nowFrameName].BoneInfs.push(this.BoneInf);
            this.nowReadMode = XfileLoadMode$1.Element;
        }
    }, {
        key: 'readandCreateAnimationSet',
        value: function readandCreateAnimationSet(line) {
            this.frameStartLv = this.elementLv;
            this.nowReadMode = XfileLoadMode$1.Anim_init;
            this.nowAnimationSetName = line.substr(13, line.length - 14).trim();
            this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName] = [];
        }
    }, {
        key: 'readAndCreateAnimation',
        value: function readAndCreateAnimation(line) {
            this.nowFrameName = line.substr(10, line.length - 11).trim();
            this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName] = new XAnimationInfo$1();
            this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].animeName = this.nowFrameName;
            this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].FrameStartLv = this.frameStartLv;
        }
    }, {
        key: 'readAnimationKeyFrame',
        value: function readAnimationKeyFrame(line) {
            this.keyInfo = null;
            var data = line.split(";");
            var nowKeyframe = parseInt(data[0], 10);
            var frameFound = false;
            var tmpM = new THREE.Matrix4();
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
            var data2 = data[2].split(",");
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
                this.keyInfo.time = /*1.0 / this.loadingXdata.AnimTicksPerSecond * */this.keyInfo.Frame;
                this.loadingXdata.AnimationSetInfo[this.nowAnimationSetName][this.nowFrameName].keyFrames.push(this.keyInfo);
            }
            this.nowReaded++;
            if (this.nowReaded >= this.tgtLength || line.indexOf(";;;") > -1) {
                this.nowReadMode = XfileLoadMode$1.Anim_init;
            }
        }
    }, {
        key: 'readFinalize',
        value: function readFinalize() {
            this.loadingXdata.FrameInfo = [];
            var keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
            for (var i = 0; i < keys.length; i++) {
                if (this.loadingXdata.FrameInfo_Raw[keys[i]].Mesh != null) {
                    this.loadingXdata.FrameInfo.push(this.loadingXdata.FrameInfo_Raw[keys[i]].Mesh);
                }
            }
            if (this.loadingXdata.FrameInfo != null & this.loadingXdata.FrameInfo.length > 0) {
                for (var _i2 = 0; _i2 < this.loadingXdata.FrameInfo.length; _i2++) {
                    if (this.loadingXdata.FrameInfo[_i2].parent == null) {
                        this.loadingXdata.FrameInfo[_i2].zflag = this.zflg;
                        if (this.zflg) {
                            this.loadingXdata.FrameInfo[_i2].scale.set(-1, 1, 1);
                        }
                    }
                }
            }
        }
    }, {
        key: 'ParseMatrixData',
        value: function ParseMatrixData(targetMatrix, data) {
            targetMatrix.set(parseFloat(data[0]), parseFloat(data[4]), parseFloat(data[8]), parseFloat(data[12]), parseFloat(data[1]), parseFloat(data[5]), parseFloat(data[9]), parseFloat(data[13]), parseFloat(data[2]), parseFloat(data[6]), parseFloat(data[10]), parseFloat(data[14]), parseFloat(data[3]), parseFloat(data[7]), parseFloat(data[11]), parseFloat(data[15]));
        }
    }, {
        key: 'MakeOutputGeometry',
        value: function MakeOutputGeometry(nowFrameName, _zflg) {
            if (this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry != null) {
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingBox();
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.computeBoundingSphere();
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.verticesNeedUpdate = true;
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.normalsNeedUpdate = true;
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.colorsNeedUpdate = true;
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.uvsNeedUpdate = true;
                this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.groupsNeedUpdate = true;
                var putBones = [];
                var BoneDics = [];
                var rootBone = new THREE.Bone();
                if (this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs != null && this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length) {
                    var keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
                    var BoneDics_Name = [];
                    for (var m = 0; m < keys.length; m++) {
                        if (this.loadingXdata.FrameInfo_Raw[keys[m]].FrameStartLv <= this.loadingXdata.FrameInfo_Raw[nowFrameName].FrameStartLv && nowFrameName != keys[m]) {
                            continue;
                        }
                        var b = new THREE.Bone();
                        b.name = keys[m];
                        b.applyMatrix(this.loadingXdata.FrameInfo_Raw[keys[m]].FrameTransformMatrix);
                        b.matrixWorld = b.matrix;
                        b.FrameTransformMatrix = this.loadingXdata.FrameInfo_Raw[keys[m]].FrameTransformMatrix;
                        BoneDics_Name[b.name] = putBones.length;
                        putBones.push(b);
                    }
                    for (var _m = 0; _m < putBones.length; _m++) {
                        for (var dx = 0; dx < this.loadingXdata.FrameInfo_Raw[putBones[_m].name].children.length; dx++) {
                            var nowBoneIndex = BoneDics_Name[this.loadingXdata.FrameInfo_Raw[putBones[_m].name].children[dx]];
                            if (putBones[nowBoneIndex] != null) {
                                putBones[_m].add(putBones[nowBoneIndex]);
                            }
                        }
                    }
                }
                var mesh = null;
                var bufferGeometry = new THREE.BufferGeometry();
                if (putBones.length > 0) {
                    if (this.loadingXdata.FrameInfo_Raw[putBones[0].name].children.length === 0 && nowFrameName != putBones[0].name) {
                        putBones[0].add(putBones[1]);
                        putBones[0].zflag = _zflg;
                    }
                    for (var _m2 = 0; _m2 < putBones.length; _m2++) {
                        if (putBones[_m2].parent === null) {
                            putBones[_m2].zflag = _zflg;
                        }
                        for (var bi = 0; bi < this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs.length; bi++) {
                            if (putBones[_m2].name === this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].boneName) {
                                for (var vi = 0; vi < this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces.length; vi++) {
                                    var nowVertexID = this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Indeces[vi];
                                    var nowVal = this.loadingXdata.FrameInfo_Raw[nowFrameName].BoneInfs[bi].Weights[vi];
                                    switch (this.loadingXdata.FrameInfo_Raw[nowFrameName].VertexSetedBoneCount[nowVertexID]) {
                                        case 0:
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].x = _m2;
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].x = nowVal;
                                            break;
                                        case 1:
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].y = _m2;
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].y = nowVal;
                                            break;
                                        case 2:
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].z = _m2;
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].z = nowVal;
                                            break;
                                        case 3:
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinIndices[nowVertexID].w = _m2;
                                            this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry.skinWeights[nowVertexID].w = nowVal;
                                            break;
                                    }
                                    this.loadingXdata.FrameInfo_Raw[nowFrameName].VertexSetedBoneCount[nowVertexID]++;
                                }
                            }
                        }
                    }
                    for (var sk = 0; sk < this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials.length; sk++) {
                        this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials[sk].skinning = true;
                    }
                    mesh = new THREE.SkinnedMesh(bufferGeometry.fromGeometry(this.loadingXdata.FrameInfo_Raw[nowFrameName].Geometry), new THREE.MultiMaterial(this.loadingXdata.FrameInfo_Raw[nowFrameName].Materials));
                    var skeleton = new THREE.Skeleton(putBones);
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
    }, {
        key: 'animationFinalize',
        value: function animationFinalize() {
            this.animeKeyNames = Object.keys(this.loadingXdata.AnimationSetInfo);
            if (this.animeKeyNames != null && this.animeKeyNames.length > 0) {
                this.nowReaded = 0;
                this.loadingXdata.XAnimationObj = [];
                this.animationFinalize_step();
            } else {
                this.finalproc();
            }
        }
    }, {
        key: 'animationFinalize_step',
        value: function animationFinalize_step() {
            var i = this.nowReaded;
            var keys = Object.keys(this.loadingXdata.FrameInfo_Raw);
            var tgtModel = null;
            for (var m = 0; m < this.loadingXdata.FrameInfo.length; m++) {
                var keys2 = Object.keys(this.loadingXdata.AnimationSetInfo[this.animeKeyNames[i]]);
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
    }, {
        key: 'finalproc',
        value: function finalproc() {
            var _this3 = this;

            setTimeout(function () {
                _this3.onLoad(_this3.loadingXdata);
            }, 1);
        }
    }]);
    return XLoader;
}();


THREE.XLoader.IsUvYReverse = true;
